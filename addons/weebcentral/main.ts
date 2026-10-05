import type { Cheerio, CheerioAPI } from 'cheerio/slim';
import type { AnyNode } from 'domhandler';

import {
  cleanText,
  getText,
  imageSrc,
  parseChapterNumber,
  parseDate,
  parseHtml,
  pathSegments,
  refererHeaders,
  resolveUrl,
  runFromHtml,
  sourcesRuntime,
  textOf,
  uniqBy,
  withQuery,
} from '../../src/addons/sdk';
import type { FetchInput, GetInput, GetURLInput, MatchInput, RunInput, Widget } from '../../src/addons/types';
import type {
  Chapter,
  ChapterContent,
  Genre,
  ListPage,
  ListSort,
  MangaDetail,
  MangaItem,
  SourceConfig,
  UrlKind,
} from '../../src/sources/types';

/**
 * Weeb Central — site viết bằng htmx: trang đầy đủ chỉ là khung, dữ liệu nằm
 * ở các endpoint trả về mảnh HTML:
 *   /search/data?…                       danh sách / tìm kiếm / lọc thể loại
 *   /series/<id>/full-chapter-list       toàn bộ chương (trang truyện chỉ có ~9)
 *   /chapters/<id>/images?…              ảnh của chương
 * ID truyện và chương là ULID 26 ký tự.
 */

const PAGE_SIZE = 32;

type SortParams = { sort: string; order: string };

const LATEST: SortParams = { sort: 'Latest Updates', order: 'Descending' };

/** Site không có điểm đánh giá nên không có mục 'rating'. */
const SORT_PARAMS: Partial<Record<ListSort, SortParams>> = {
  latest: LATEST,
  popular: { sort: 'Popularity', order: 'Descending' },
  new: { sort: 'Recently Added', order: 'Descending' },
  az: { sort: 'Alphabet', order: 'Ascending' },
};

const ULID = /^[0-9A-Z]{26}$/i;

function idAfter(url: string, dir: 'series' | 'chapters'): string | undefined {
  const segments = pathSegments(url);
  const index = segments.indexOf(dir);
  const id = index >= 0 ? segments[index + 1] : undefined;
  return id && ULID.test(id) ? id : undefined;
}

function seriesIdOf(url: string): string {
  const id = idAfter(url, 'series');
  if (!id) {
    throw new Error('Đường dẫn truyện Weeb Central không hợp lệ.');
  }
  return id;
}

function chapterIdOf(url: string): string {
  const id = idAfter(url, 'chapters');
  if (!id) {
    throw new Error('Đường dẫn chương Weeb Central không hợp lệ.');
  }
  return id;
}

/** Tắt nội dung 18+ ngay ở phía site khi người dùng chưa cho phép. */
function adultParam(): string {
  return sourcesRuntime().allowNsfw ? 'Any' : 'False';
}

function searchDataUrl(src: SourceConfig, page: number, params: Record<string, string | string[]>): string {
  return withQuery(`${src.baseUrl}/search/data`, {
    limit: PAGE_SIZE,
    offset: (Math.max(page, 1) - 1) * PAGE_SIZE,
    official: 'Any',
    adult: adultParam(),
    display_mode: 'Full Display',
    ...params,
  });
}

/**
 * Trang /search mở từ trình duyệt chỉ là khung, kết quả nạp từ /search/data
 * với cùng bộ lọc trên URL — đọc thẳng endpoint đó.
 */
function searchPageDataUrl(src: SourceConfig, url: string): string {
  const params: Record<string, string[]> = {};
  for (const pair of (url.split('#')[0].split('?')[1] ?? '').split('&').filter(Boolean)) {
    const [key, value = ''] = pair.split('=');
    const name = decodeURIComponent(key);
    params[name] = [...(params[name] ?? []), decodeURIComponent(value.replace(/\+/g, ' '))];
  }
  return searchDataUrl(src, 1, params);
}

/** Giá trị của dòng "<strong>Nhãn:</strong> …" trong khối thông tin. */
function labelled($: CheerioAPI, $scope: Cheerio<AnyNode>, label: RegExp): Cheerio<AnyNode> | undefined {
  const strong = $scope
    .find('strong')
    .toArray()
    .find(el => label.test(cleanText($(el).text())));
  return strong ? $(strong).parent() : undefined;
}

function valueOf($: CheerioAPI, $row: Cheerio<AnyNode> | undefined): string {
  if (!$row) {
    return '';
  }
  const $clone = $row.clone();
  $clone.find('strong').remove();
  return cleanText($clone.text()).replace(/,$/, '');
}

function parseListing(html: string, base: string): ListPage {
  const $ = parseHtml(html);
  const items: MangaItem[] = [];
  $('article')
    .filter((_, el) => $(el).parents('article').length === 0)
    .each((_, el) => {
      const $el = $(el);
      const $link = $el.find('a[href*="/series/"]').first();
      const href = $link.attr('href');
      if (!href) {
        return;
      }
      const title =
        textOf($el.find('a.link[href*="/series/"], a.line-clamp-1[href*="/series/"]')) ||
        cleanText($el.find('img').first().attr('alt')).replace(/\s+cover$/i, '') ||
        textOf($el.find('.truncate'));
      if (!title) {
        return;
      }
      const subtitle = [valueOf($, labelled($, $el, /^type/i)), valueOf($, labelled($, $el, /^status/i))]
        .filter(Boolean)
        .join(' · ');
      items.push({
        url: resolveUrl(href, base),
        title,
        cover: imageSrc($el.find('img'), base),
        subtitle: subtitle || undefined,
      });
    });
  // Nút "View More Results" mang sẵn URL của trang kế (offset tiếp theo).
  const hasNext = $('[hx-get*="/search/data"]').length > 0;
  return { items: uniqBy(items, item => item.url), hasNext };
}

function parseChapters($: CheerioAPI, base: string): Chapter[] {
  return uniqBy(
    $('a[href*="/chapters/"]')
      .toArray()
      .map(el => {
        const $a = $(el);
        const $time = $a.find('time');
        const iso = $time.attr('datetime') || cleanText($time.text());
        const $name = $a.find('span.grow > span').first();
        const name = cleanText($name.text()) || cleanText($a.clone().children('time').remove().end().text());
        const parsed = iso ? Date.parse(iso) : NaN;
        const time = Number.isFinite(parsed) ? parsed : parseDate(iso);
        return {
          url: resolveUrl($a.attr('href'), base),
          name,
          date: time !== undefined ? new Date(time).toLocaleDateString('vi-VN') : undefined,
          time,
          number: parseChapterNumber(name),
        };
      })
      .filter(ch => ch.name && idAfter(ch.url, 'chapters')),
    ch => ch.url,
  );
}

/** Trang truyện chỉ hiện vài chương đầu/cuối; danh sách đủ nằm ở endpoint riêng. Lỗi thì trả undefined. */
function fullChapterList(src: SourceConfig, id: string, mangaUrl: string): Promise<string | undefined> {
  return getText(`${src.baseUrl}/series/${id}/full-chapter-list`, { referer: mangaUrl }).catch(() => undefined);
}

/** Vài chương có sẵn trong #chapter-list của trang truyện — dùng khi full-chapter-list lỗi. */
function pageChapters($: CheerioAPI, base: string): Chapter[] {
  return parseChapters(parseHtml($('#chapter-list').html() ?? ''), base);
}

function parseSimilar($: CheerioAPI, base: string, selfId: string): MangaItem[] {
  const recommended = $('.glide__slide')
    .toArray()
    .map(el => {
      const $el = $(el);
      const $a = $el.find('a[href*="/series/"]').first();
      return {
        url: resolveUrl($a.attr('href'), base),
        title: textOf($el.find('.truncate')) || cleanText($el.find('img').attr('alt')).replace(/\s+cover$/i, ''),
        cover: imageSrc($el.find('img'), base),
      };
    });
  // "Related Series(s)": bản ngoại truyện, phần trước/sau — không có ảnh bìa.
  const $related = labelled($, $('main'), /^related series/i);
  const related = ($related?.find('a[href*="/series/"]').toArray() ?? []).map(el => {
    const $a = $(el);
    const kind = cleanText($a.next('span').text()).replace(/^\((.*)\)$/, '$1');
    return {
      url: resolveUrl($a.attr('href'), base),
      title: cleanText($a.text()),
      subtitle: kind || undefined,
    };
  });
  return uniqBy(
    [...related, ...recommended].filter(item => item.url && item.title && idAfter(item.url, 'series') !== selfId),
    item => idAfter(item.url, 'series') ?? item.url,
  );
}

// ─── Đọc dữ liệu ────────────────────────────────────────────────────────────

/** Mảnh HTML của /search/data (danh sách, tìm kiếm, thể loại) hoặc trang danh sách mở từ trình duyệt. */
async function loadList(site: SourceConfig, url: string): Promise<ListPage> {
  const segments = pathSegments(url);
  const dataUrl = segments.length === 1 && segments[0] === 'search' ? searchPageDataUrl(site, url) : url;
  return parseListing(await getText(dataUrl, { referer: `${site.baseUrl}/search` }), site.baseUrl);
}

async function loadGenres(site: SourceConfig): Promise<Genre[]> {
  const $ = parseHtml(await getText(`${site.baseUrl}/search`));
  const genres: Genre[] = $('input[id^="tag-"][id$="-value"]')
    .toArray()
    .map(el => {
      const value = cleanText($(el).attr('value'));
      return { id: value, name: value };
    });
  return uniqBy(
    genres.filter(g => g.id),
    g => g.id,
  ).sort((a, b) => a.name.localeCompare(b.name));
}

async function loadDetail(site: SourceConfig, url: string): Promise<MangaDetail> {
  const id = seriesIdOf(url);
  const base = site.baseUrl;
  const [html, fullList] = await Promise.all([getText(url), fullChapterList(site, id, url)]);
  const $ = parseHtml(html);
  const $info = $('main');
  const title =
    textOf($info.find('h1')) ||
    cleanText($('meta[property="og:title"]').attr('content')).replace(/\s*\|\s*Weeb Central$/i, '');
  if (!title) {
    throw new Error('Không tìm thấy truyện trên Weeb Central.');
  }

  const genres = uniqBy(
    (
      labelled($, $info, /^tags?\(s\)|^tags?:|^genres?/i)
        ?.find('a')
        .toArray() ?? []
    )
      .map(el => ({ id: cleanText($(el).text()), name: cleanText($(el).text()) }))
      .filter(g => g.id),
    g => g.id,
  );
  const authors = uniqBy(
    (
      labelled($, $info, /^author/i)
        ?.find('a')
        .toArray() ?? []
    )
      .map(el => cleanText($(el).text()))
      .filter(Boolean),
    a => a,
  );
  const alt = valueOf($, labelled($, $info, /associated|alternat|other name/i));
  const $description = labelled($, $info, /^description/i)
    ?.find('p')
    .first();
  const subscribers = Number(html.match(/subscriptions:\s*(\d+)/)?.[1]);

  let chapters = fullList ? parseChapters(parseHtml(fullList), base) : [];
  if (!chapters.length) {
    chapters = pageChapters($, base);
  }

  return {
    url,
    title,
    altTitles: alt ? alt.split(/\s*[;,]\s*/).filter(Boolean) : undefined,
    cover: imageSrc($info.find('picture img').first(), base) || $('meta[property="og:image"]').attr('content'),
    description: $description?.text().trim() || undefined,
    status: valueOf($, labelled($, $info, /^status/i)) || undefined,
    authors,
    genres,
    views:
      Number.isFinite(subscribers) && subscribers > 0 ? `${subscribers.toLocaleString('vi-VN')} theo dõi` : undefined,
    chapters,
    similar: parseSimilar($, base, id),
    nsfw: /^yes/i.test(valueOf($, labelled($, $info, /^adult content/i))),
  };
}

async function loadChapter(site: SourceConfig, url: string): Promise<ChapterContent> {
  const id = chapterIdOf(url);
  const base = site.baseUrl;
  const imagesUrl = withQuery(`${base}/chapters/${id}/images`, {
    is_prev: 'False',
    current_page: 1,
    reading_style: 'long_strip',
  });
  const [fragment, page] = await Promise.all([
    getText(imagesUrl, { referer: url }),
    // Chỉ để lấy tên chương; lỗi cũng không sao.
    getText(url).catch(() => undefined),
  ]);
  const $ = parseHtml(fragment);
  const pages = uniqBy(
    $('img')
      .toArray()
      .map(el => imageSrc($(el), base))
      .filter((uri): uri is string => !!uri && /^https?:/.test(uri) && !uri.includes('/static/')),
    uri => uri,
  );
  if (!pages.length) {
    throw new Error('Không tìm thấy ảnh trong chương này.');
  }
  // "<chương> | <truyện> | Weeb Central". Chương đã bị thay thế vẫn còn ảnh
  // nhưng trang HTML chuyển sang /404 — khi đó bỏ qua tiêu đề.
  const parts = page ? cleanText(parseHtml(page)('title').text()).split(/\s+\|\s+/) : [];
  const title = parts.length >= 3 ? parts[0] : undefined;
  const headers = imageHeaders(site);
  return { kind: 'images', title, pages: pages.map(uri => ({ uri, headers })) };
}

async function resolveMangaUrl(site: SourceConfig, chapterUrl: string, html?: string): Promise<string | undefined> {
  const $ = parseHtml(html ?? (await getText(chapterUrl)));
  // Nút tên truyện ở thanh điều hướng đầu trang chương.
  const href = $('#nav-top a[href*="/series/"], main a[href*="/series/"]').first().attr('href');
  if (href) {
    return resolveUrl(href, site.baseUrl);
  }
  // Phòng khi đổi markup: id truyện vẫn nằm trong endpoint chọn chương.
  const id = $('[hx-get*="/chapter-select"]')
    .attr('hx-get')
    ?.match(/\/series\/([0-9A-Z]{26})\//i)?.[1];
  return id ? `${site.baseUrl}/series/${id}` : undefined;
}

// ─── Các hàm của addon ──────────────────────────────────────────────────────

export function getURL({ site, params }: GetURLInput): string {
  switch (params.method) {
    case 'list':
      return searchDataUrl(site, params.page, SORT_PARAMS[params.sort] ?? LATEST);
    case 'search': {
      const text = params.query.trim();
      if (!text) {
        return searchDataUrl(site, params.page, LATEST);
      }
      return searchDataUrl(site, params.page, { text, sort: 'Best Match', order: 'Descending' });
    }
    case 'genre':
      return searchDataUrl(site, params.page, {
        ...(SORT_PARAMS[params.sort] ?? LATEST),
        included_tag: params.genre.id,
      });
  }
}

export async function fetch({ site, url, method }: FetchInput): Promise<Widget> {
  switch (method) {
    case 'list': {
      const page = await loadList(site, url);
      return { widget: 'cataloglist', list: page.items, hasNext: page.hasNext };
    }
    case 'detail':
      return { widget: 'catalogdetail', detail: await loadDetail(site, url) };
    case 'chapter':
      return { widget: 'catalogchapter', chapter: await loadChapter(site, url) };
  }
}

export function run(input: RunInput): Promise<Widget> {
  return runFromHtml({ fetch, match }, input);
}

export async function get({ site, method, url, html }: GetInput): Promise<Widget> {
  switch (method) {
    case 'genre':
      return { widget: 'genre', genres: await loadGenres(site) };
    case 'chapter': {
      const mangaUrl = url ?? '';
      const fullList = await fullChapterList(site, seriesIdOf(mangaUrl), mangaUrl);
      const chapters = fullList ? parseChapters(parseHtml(fullList), site.baseUrl) : [];
      if (chapters.length) {
        return { widget: 'chapter', chapters };
      }
      // Endpoint lỗi: dùng vài chương có sẵn trên trang truyện.
      const $ = parseHtml(html ?? (await getText(mangaUrl)));
      return { widget: 'chapter', chapters: pageChapters($, site.baseUrl) };
    }
    case 'manga':
      return { widget: 'manga', url: url ? await resolveMangaUrl(site, url, html) : undefined };
  }
}

export function match({ url }: MatchInput): UrlKind | null {
  const segments = pathSegments(url);
  if (!segments.length) {
    return 'list';
  }
  switch (segments[0]) {
    case 'series':
      return idAfter(url, 'series') ? 'detail' : null;
    case 'chapters':
      return idAfter(url, 'chapters') ? 'chapter' : null;
    case 'search':
    case 'hot-updates':
    case 'hot-series':
    case 'latest-updates':
    case 'recently-added':
      return 'list';
    default:
      return null;
  }
}

export function imageHeaders(site: SourceConfig): Record<string, string> {
  return refererHeaders(site);
}
