import type { Cheerio, CheerioAPI } from 'cheerio/slim';
import type { AnyNode } from 'domhandler';

import {
  cleanText,
  getHost,
  getText,
  imageSrc,
  isChallengeError,
  mapLimit,
  parseDate,
  parseHtml,
  pathSegments,
  refererHeaders,
  resolveUrl,
  runFromHtml,
  textOf,
  uniqBy,
  withQuery,
} from '../../src/addons/sdk';
import type {
  FetchInput,
  GetInput,
  GetURLInput,
  ListParams,
  MatchInput,
  RunInput,
  Widget,
} from '../../src/addons/types';
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
 * Manga Fox (fanfox.net). Bản mobile m.fanfox.net là nguồn chính: trang truyện
 * không chặn truyện 18+ và có chế độ cuộn "roll_manga" trả về mọi trang của
 * chương trong một lần tải. Riêng danh sách lấy từ thư mục của bản desktop
 * (fanfox.net/directory) vì chỉ ở đó mới có đủ 5 thứ tự và lọc thể loại kèm
 * thứ tự; lỗi thì quay về danh sách của bản mobile.
 */

/** Tham số thứ tự của /directory/ trên desktop — rỗng là theo độ phổ biến. */
const DIRECTORY_SORT: Record<ListSort, string> = {
  latest: 'latest',
  popular: '',
  new: 'news',
  rating: 'rating',
  az: 'az',
};

/** Danh sách của bản mobile (chỉ có 3 thứ tự, trang thể loại luôn theo hạng). */
const MOBILE_LIST: Partial<Record<ListSort, string>> = {
  latest: 'search/status/updated',
  new: 'search/status/new',
  popular: 'search/cate/all',
};

/** Đoạn path đầu của các trang danh sách (mobile lẫn desktop). */
const LIST_ROOTS = new Set(['search', 'directory', 'latest', 'releases', 'new', 'hot', 'ranking', 'completed']);

const CHAPTER_SEGMENT = /^c\d+(?:\.\d+)?$/i;

const NSFW_GENRES = /adult|mature|smut|hentai|ecchi|lolicon|shotacon/i;

/** Gốc bản desktop: "https://m.fanfox.net" → "https://fanfox.net". */
const desktopOrigin = (src: SourceConfig) => src.baseUrl.replace(/:\/\/m\./i, '://');

const mangaUrl = (src: SourceConfig, slug: string) => `${src.baseUrl}/manga/${encodeURIComponent(slug)}`;

/** Slug truyện trong "/manga/<slug>/…" hoặc "/roll_manga/<slug>/…". */
function slugOf(url: string): string | undefined {
  const [root, slug] = pathSegments(url);
  return (root === 'manga' || root === 'roll_manga') && slug ? slug : undefined;
}

/**
 * Phần path của chương: "/manga/abc/v01/c003/2.html" → slug "abc", parts
 * ["v01", "c003"]. Bỏ số trang ở cuối để luôn đọc từ trang đầu.
 */
function chapterPath(url: string): { slug: string; parts: string[] } | undefined {
  const slug = slugOf(url);
  if (!slug) {
    return undefined;
  }
  const rest = pathSegments(url).slice(2);
  const index = rest.findIndex(s => CHAPTER_SEGMENT.test(s));
  return index >= 0 ? { slug, parts: rest.slice(0, index + 1) } : undefined;
}

/** Giá trị lọc thể loại: "/search/cate/martial-arts" hoặc "/directory/martial-arts/" → "martial-arts". */
function genreSlug(href: string | undefined): string {
  const segments = pathSegments(href ?? '');
  const index = segments.indexOf('cate');
  return (index >= 0 ? segments[index + 1] : segments[0] === 'directory' ? segments[1] : '') ?? '';
}

/** Thư mục desktop: 70 truyện mỗi trang, có chương mới nhất. */
function parseDirectory($: CheerioAPI, src: SourceConfig, base: string): ListPage {
  const items: MangaItem[] = [];
  $('.manga-list-1-list > li').each((_, el) => {
    const $el = $(el);
    const $a = $el.find('.manga-list-1-item-title a').first();
    const slug = slugOf(resolveUrl($a.attr('href') ?? $el.find('a').first().attr('href'), base));
    // Chữ của link bị cắt "...", title thì đủ.
    const title = cleanText($a.attr('title')) || cleanText($a.text());
    if (!slug || !title) {
      return;
    }
    items.push({
      url: mangaUrl(src, slug),
      title,
      cover: imageSrc($el.find('img.manga-list-1-cover, img').first(), base),
      subtitle: textOf($el.find('.manga-list-1-item-subtitle')) || undefined,
    });
  });
  const next = $('.pager-list a')
    .toArray()
    .find(a => cleanText($(a).text()) === '>');
  const href = next ? $(next).attr('href') ?? '' : '';
  return {
    items: uniqBy(items, item => item.url),
    hasNext: !!href && !href.startsWith('javascript'),
  };
}

/** Danh sách của bản mobile (tìm kiếm, trạng thái, thể loại): 20 truyện mỗi trang. */
function parseMobileList($: CheerioAPI, src: SourceConfig): ListPage {
  const items: MangaItem[] = [];
  $('.post-list li').each((_, el) => {
    const $el = $(el);
    const slug = slugOf(resolveUrl($el.find('a[href*="/manga/"]').first().attr('href'), src.baseUrl));
    const $img = $el.find('img').first();
    const title = cleanText($img.attr('title')) || textOf($el.find('.title'));
    if (!slug || !title) {
      return;
    }
    const lines = $el
      .find('.cover-info p')
      .toArray()
      .map(p => cleanText($(p).text()));
    items.push({
      url: mangaUrl(src, slug),
      title,
      cover: imageSrc($img, src.baseUrl),
      // Dòng thứ hai là thể loại ("Shounen, Action").
      subtitle: lines[1] || undefined,
    });
  });
  return {
    items: uniqBy(items, item => item.url),
    hasNext: $('#Pagenav a.next, .more-list a.next').length > 0,
  };
}

/** Bộ lọc của một trang thư mục desktop — cần cho đường lùi về danh sách mobile. */
type DirectoryFilter = { genre?: string; sort: ListSort; page: number };

/** Đoán bộ lọc từ URL "/directory/<thể loại>/<trang>.html?<thứ tự>" khi không có params (trang mở từ trình duyệt). */
function directoryFilter(url: string): DirectoryFilter {
  const rest = pathSegments(url).slice(1);
  const pageMatch = rest[rest.length - 1]?.match(/^(\d+)\.html$/);
  const genre = pageMatch ? rest[rest.length - 2] : rest[rest.length - 1];
  const keys = (url.split('#')[0].split('?')[1] ?? '').split('&').map(part => part.split('=')[0]);
  const sort = (Object.keys(DIRECTORY_SORT) as ListSort[]).find(
    s => DIRECTORY_SORT[s] && keys.includes(DIRECTORY_SORT[s]),
  );
  return { genre, sort: sort ?? 'popular', page: pageMatch ? Number(pageMatch[1]) : 1 };
}

async function loadDirectory(
  src: SourceConfig,
  url: string,
  { genre, sort, page }: DirectoryFilter,
): Promise<ListPage> {
  try {
    const result = parseDirectory(parseHtml(await getText(url)), src, url);
    if (result.items.length || page > 1) {
      return result;
    }
  } catch (error) {
    if (isChallengeError(error)) {
      throw error;
    }
  }
  // Bản desktop lỗi hoặc đổi giao diện: dùng danh sách mobile (thể loại thì theo hạng).
  const mobilePath = genre ? `search/cate/${genre}` : MOBILE_LIST[sort] ?? MOBILE_LIST.popular;
  return parseMobileList(parseHtml(await getText(withQuery(`${src.baseUrl}/${mobilePath}/`, { page }))), src);
}

/** Ảnh trong khung đọc, bỏ ảnh "đang tải" của site. */
function viewerImages($: CheerioAPI, base: string): string[] {
  return $('#viewer img')
    .toArray()
    .map(el => imageSrc($(el), base))
    .filter((uri): uri is string => !!uri && !uri.startsWith('data:') && !uri.includes('/mobile/images/'));
}

/**
 * Chế độ đọc từng trang (/manga/…/N.html, mỗi trang một ảnh) — chỉ dùng khi
 * trang cuộn không có ảnh. Danh sách trang lấy từ ô chọn trang.
 */
async function pagedImages(src: SourceConfig, firstUrl: string): Promise<string[]> {
  const $ = parseHtml(await getText(firstUrl));
  const dir = firstUrl.replace(/[^/]*$/, '');
  const pageUrls = uniqBy(
    $('select option')
      .toArray()
      .map(el => resolveUrl($(el).attr('value'), firstUrl))
      .filter(u => u.startsWith(dir) && /\/\d+\.html$/.test(u)),
    u => u,
  );
  const first = viewerImages($, src.baseUrl);
  const rest = pageUrls.filter(u => !u.endsWith('/1.html'));
  // Thử lại một lần mỗi trang — tải dồn nhiều trang dễ gặp lỗi lẻ tẻ.
  const load = async (u: string) => viewerImages(parseHtml(await getText(u)), src.baseUrl);
  const more = await mapLimit(rest, 4, u => load(u).catch(() => load(u)));
  return [...first, ...more.flat()];
}

/**
 * Trang truyện của bản mobile cho một URL truyện bất kỳ. Trang desktop khác
 * giao diện và chặn truyện 18+ — luôn đọc bản mobile. Giữ nguyên URL nếu đã
 * đúng trang truyện mobile (dùng lại HTML của WebView).
 */
function detailPageUrl(src: SourceConfig, url: string): string {
  const slug = slugOf(url);
  if (!slug) {
    throw new Error('Đường dẫn truyện Manga Fox không hợp lệ.');
  }
  const isMobileDetail = getHost(url) === getHost(src.baseUrl) && match({ site: src, url }) === 'detail';
  return isMobileDetail ? url : mangaUrl(src, slug);
}

function parseChapters($: CheerioAPI, base: string): Chapter[] {
  const chapters: Chapter[] = $('.chlist a')
    .toArray()
    .map(el => {
      const $a = $(el);
      const chapterUrl = resolveUrl($a.attr('href'), base);
      const path = chapterPath(chapterUrl);
      const segment = path?.parts[path.parts.length - 1];
      const number = segment ? parseFloat(segment.slice(1)) : undefined;
      const volume = path?.parts.find(p => /^v/i.test(p) && !CHAPTER_SEGMENT.test(p));
      // Chữ trực tiếp của thẻ a ("Ch 60"), bỏ nhãn "new" và ngày trong span.
      const label = cleanText(
        $a
          .contents()
          .toArray()
          .filter(node => node.nodeType === 3)
          .map(node => $(node).text())
          .join(' '),
      );
      const name = [volume ? `Vol.${volume.slice(1)}` : '', label || (number !== undefined ? `Ch ${number}` : '')]
        .filter(Boolean)
        .join(' ');
      const date = textOf($a.find('span').not('.newch').last());
      return {
        url: chapterUrl,
        name,
        date: date || undefined,
        time: parseDate(date),
        number: Number.isFinite(number) ? number : undefined,
      };
    })
    .filter(ch => ch.name && chapterPath(ch.url));
  return uniqBy(chapters, ch => ch.url);
}

// ─── Đọc dữ liệu ────────────────────────────────────────────────────────────

/**
 * Trang danh sách: thư mục desktop (danh sách, thể loại) có đường lùi về bản
 * mobile; còn lại là danh sách mobile (tìm kiếm, trạng thái, thể loại).
 */
async function loadList(site: SourceConfig, url: string, params?: ListParams): Promise<ListPage> {
  if (pathSegments(url)[0] === 'directory') {
    const filter =
      params && params.method !== 'search'
        ? { genre: params.method === 'genre' ? params.genre.id : undefined, sort: params.sort, page: params.page }
        : directoryFilter(url);
    return loadDirectory(site, url, filter);
  }
  const $ = parseHtml(await getText(url));
  // Trang danh sách khác của bản desktop (mở từ trình duyệt) có cùng khung với thư mục.
  return !params && $('.manga-list-1-list > li').length ? parseDirectory($, site, url) : parseMobileList($, site);
}

async function loadGenres(site: SourceConfig): Promise<Genre[]> {
  const $ = parseHtml(await getText(`${site.baseUrl}/search`));
  const genres: Genre[] = $('a[href*="/search/cate/"]')
    .toArray()
    .map(el => ({ id: genreSlug($(el).attr('href')), name: cleanText($(el).text()) }))
    .filter(g => g.id && g.id !== 'all' && g.name);
  return uniqBy(genres, g => g.id).sort((a, b) => a.name.localeCompare(b.name));
}

async function loadDetail(site: SourceConfig, url: string): Promise<MangaDetail> {
  const pageUrl = detailPageUrl(site, url);
  const $ = parseHtml(await getText(pageUrl));
  const base = site.baseUrl;
  const $top = $('.manga-detail-top');

  const rows = new Map<string, Cheerio<AnyNode>>();
  $('.detail-info p').each((_, el) => {
    const label = cleanText($(el).text()).split(':')[0].toLowerCase();
    rows.set(label, $(el));
  });
  const rowText = (pattern: RegExp) => {
    for (const [label, $row] of rows) {
      if (pattern.test(label)) {
        return cleanText($row.text()).replace(/^[^:]*:\s*/, '');
      }
    }
    return '';
  };

  const genres = uniqBy(
    $('.manga-genres a')
      .toArray()
      .map(el => ({ id: genreSlug($(el).attr('href')), name: cleanText($(el).text()) }))
      .filter(g => g.id && g.name),
    g => g.id,
  );
  const authors = [...rows]
    .filter(([label]) => /author|artist/.test(label))
    .flatMap(([, $row]) =>
      $row
        .find('a')
        .toArray()
        .map(a => cleanText($(a).text())),
    );
  const rank = rowText(/^rank/).match(/\d+/)?.[0];

  const title =
    cleanText($top.find('.title').first().text()) ||
    cleanText($('meta[property="og:title"]').attr('content')) ||
    cleanText($('title').text());
  if (!title) {
    throw new Error('Không đọc được thông tin truyện từ Manga Fox.');
  }

  return {
    url: pageUrl,
    title,
    cover: imageSrc($top.find('img').first(), base),
    description: textOf($('.manga-summary')) || undefined,
    status: rowText(/^status/) || undefined,
    authors: uniqBy(authors.filter(Boolean), a => a),
    genres,
    views: rank ? `Hạng #${rank}` : undefined,
    chapters: parseChapters($, base),
    nsfw: genres.some(g => NSFW_GENRES.test(g.name)),
  };
}

async function loadChapter(site: SourceConfig, url: string): Promise<ChapterContent> {
  const path = chapterPath(url);
  if (!path) {
    throw new Error('Đường dẫn chương Manga Fox không hợp lệ.');
  }
  const rel = `${encodeURIComponent(path.slug)}/${path.parts.join('/')}/1.html`;
  const html = await getText(`${site.baseUrl}/roll_manga/${rel}`);
  const $ = parseHtml(html);
  let pages = viewerImages($, site.baseUrl);
  if (!pages.length) {
    if (/licensed and not available|has been licensed/i.test(html)) {
      throw new Error('Truyện này đã được cấp phép bản quyền, Manga Fox không cho đọc chương này nữa.');
    }
    pages = await pagedImages(site, `${site.baseUrl}/manga/${rel}`);
  }
  if (!pages.length) {
    throw new Error('Không tìm thấy ảnh trong chương này.');
  }
  const headers = imageHeaders(site);
  return {
    kind: 'images',
    title: textOf($('.mangaread-title')) || undefined,
    pages: uniqBy(pages, u => u).map(uri => ({ uri, headers })),
  };
}

async function resolveMangaUrl(site: SourceConfig, chapterUrl: string, html?: string): Promise<string | undefined> {
  const slug = slugOf(chapterUrl);
  if (slug) {
    return mangaUrl(site, slug);
  }
  if (!html) {
    return undefined;
  }
  // Nút quay lại ở đầu trang chương trỏ về trang truyện.
  const $ = parseHtml(html);
  const href = $('header a[href*="/manga/"]').first().attr('href');
  const fromHeader = href ? slugOf(resolveUrl(href, site.baseUrl)) : undefined;
  return fromHeader ? mangaUrl(site, fromHeader) : undefined;
}

// ─── Các hàm của addon ──────────────────────────────────────────────────────

export function getURL({ site, params }: GetURLInput): string {
  switch (params.method) {
    case 'list':
    case 'genre': {
      const genre = params.method === 'genre' ? params.genre.id : undefined;
      const path = `${desktopOrigin(site)}/directory/${genre ? `${genre}/` : ''}${
        params.page > 1 ? `${params.page}.html` : ''
      }`;
      return DIRECTORY_SORT[params.sort] ? `${path}?${DIRECTORY_SORT[params.sort]}` : path;
    }
    case 'search':
      return withQuery(`${site.baseUrl}/search`, { k: params.query.trim(), page: params.page });
  }
}

export async function fetch({ site, url, method, params }: FetchInput): Promise<Widget> {
  switch (method) {
    case 'list': {
      const page = await loadList(site, url, params);
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
      // HTML có sẵn chỉ dùng được khi chính là trang truyện của bản mobile.
      const pageUrl = detailPageUrl(site, url ?? '');
      const $ = parseHtml(html && pageUrl === url ? html : await getText(pageUrl));
      return { widget: 'chapter', chapters: parseChapters($, site.baseUrl) };
    }
    case 'manga':
      return { widget: 'manga', url: url ? await resolveMangaUrl(site, url, html) : undefined };
  }
}

export function match({ url }: MatchInput): UrlKind | null {
  const segments = pathSegments(url);
  if (!segments.length || LIST_ROOTS.has(segments[0])) {
    return 'list';
  }
  if (segments[0] !== 'manga' && segments[0] !== 'roll_manga') {
    return null;
  }
  if (chapterPath(url)) {
    return 'chapter';
  }
  return segments[0] === 'manga' && segments.length === 2 ? 'detail' : null;
}

export function imageHeaders(site: SourceConfig): Record<string, string> {
  // CDN ảnh (mfcdn.net, mangafox.me) trả 403 nếu thiếu Referer của site.
  return refererHeaders(site);
}
