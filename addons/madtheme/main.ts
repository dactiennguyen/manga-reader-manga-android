import type { Cheerio, CheerioAPI } from 'cheerio/slim';
import type { AnyNode } from 'domhandler';

import {
  cleanText,
  getQueryParam,
  getText,
  imageSrc,
  parseChapterNumber,
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
 * Theme "MadTheme" của họ MangaBuddy (mangabuddy, kaliscan, mgjinx, toonily.me,
 * mangaforest…). Hai đời URL:
 *
 * - MangaBuddy: truyện /<slug>, chương /<slug>/chapter-12. Danh sách chương
 *   đầy đủ có sẵn trong trang; ảnh nằm trong biến `var chapImages = '…'`
 *   (2 ảnh đầu có trong HTML, phần còn lại do JS nạp dần).
 * - KaliScan/MgJinx: truyện /manga/<id>-<slug>. Trang chỉ có vài chục chương,
 *   phần còn lại lấy qua /service/backend/chaplist/?manga_id=<id>; ảnh lấy qua
 *   /service/backend/chapterServer/?server_id=1&chapter_id=<id>.
 *
 * Mọi đời đều có trang /search nhận q, sort, status, page và bộ lọc thể loại
 * (genre[] hoặc include[]) nên danh sách, tìm kiếm và thể loại đều đi qua đó.
 */

const SORT: Record<ListSort, string> = {
  latest: 'updated_at',
  popular: 'views',
  new: 'created_at',
  rating: 'rating',
  az: 'name',
};

const NSFW_GENRES = /adult|mature|smut|hentai|ecchi|18\+|erotic|pornographic/i;

/** Đoạn path đầu không phải trang truyện. */
const RESERVED = new Set([
  'search',
  'genres',
  'latest',
  'popular',
  'newest',
  'home',
  'official',
  'home-page',
  'az-list',
  'manga-list',
  'top',
  'status',
  'authors',
  'users',
  'api',
  'service',
  'static',
  'app',
  'contact',
  'dmca',
  'privacy-policy',
  'terms-of-service',
]);

/** Trang danh sách (không cần HTML để nhận ra). */
const LIST_DIRS = new Set([
  'search',
  'genres',
  'latest',
  'popular',
  'newest',
  'home',
  'official',
  'home-page',
  'az-list',
  'manga-list',
  'top',
  'status',
  'authors',
]);

/** Tên tham số lọc thể loại của từng site (genre[] hoặc include[]), học từ trang /search. */
const genreKeys = new Map<string, string>();

function searchUrl(src: SourceConfig, params: Record<string, string | number | undefined>): string {
  return withQuery(`${src.baseUrl}/search`, params);
}

/** Số trang của link phân trang: ?page=3 hoặc chữ "3". */
function pageOf(href: string | undefined, text: string): number | undefined {
  const fromQuery = Number(getQueryParam(href ?? '', 'page'));
  if (Number.isFinite(fromQuery) && fromQuery > 0) {
    return fromQuery;
  }
  const fromText = Number(cleanText(text));
  return Number.isFinite(fromText) && fromText > 0 ? fromText : undefined;
}

function hasNextPage($: CheerioAPI, page: number): boolean {
  const $pager = $('.paginator, .pagination').first();
  if (!$pager.length) {
    return false;
  }
  const $active = $pager.find('a.active, .active a, li.active').first();
  const current = ($active.length && pageOf($active.attr('href'), $active.text())) || page;
  return $pager
    .find('a[href]')
    .toArray()
    .some(el => (pageOf($(el).attr('href'), $(el).text()) ?? 0) > current);
}

function parseListing($: CheerioAPI, base: string, page: number): ListPage {
  let $items = $('.book-detailed-item');
  if (!$items.length) {
    $items = $('.book-item');
  }
  const items: MangaItem[] = [];
  $items.each((_, el) => {
    const $el = $(el);
    const $title = $el.find('h3 a, .title a').first();
    const $a = $title.length ? $title : $el.find('a[href]').first();
    const href = $a.attr('href');
    if (!href) {
      return;
    }
    const title = cleanText($title.text()) || cleanText($a.attr('title')) || cleanText($el.find('img').attr('alt'));
    if (!title) {
      return;
    }
    items.push({
      url: resolveUrl(href, base),
      title,
      cover: imageSrc($el.find('img'), base),
      subtitle: textOf($el.find('.latest-chapter, .chapters a, .chap-item a')) || undefined,
    });
  });
  return { items: uniqBy(items, item => item.url), hasNext: hasNextPage($, page) };
}

/** Id thể loại từ link /genres/<slug>/. */
function genreSlug(href: string | undefined): string {
  const segments = pathSegments(href ?? '');
  const idx = segments.indexOf('genres');
  return idx >= 0 ? segments[idx + 1] ?? '' : '';
}

/** Tên trong ô thông tin: bỏ dấu phẩy ngăn cách site để dính vào chữ. */
function itemName(text: string): string {
  return cleanText(text).replace(/^[,\s]+|[,\s]+$/g, '');
}

type MetaRow = { label: string; $row: Cheerio<AnyNode> };

function metaRows($: CheerioAPI): MetaRow[] {
  return $('.detail .meta p, .book-info .meta p')
    .toArray()
    .map(el => ({ label: cleanText($(el).find('strong').first().text()).toLowerCase(), $row: $(el) }));
}

function rowValues($: CheerioAPI, row: MetaRow | undefined): string[] {
  if (!row) {
    return [];
  }
  const $links = row.$row.find('a');
  const values = $links.length
    ? $links.toArray().map(el => itemName($(el).text()))
    : [itemName(row.$row.clone().children('strong').remove().end().text())];
  return values.filter(Boolean);
}

function ratingOf($: CheerioAPI): number | undefined {
  for (const el of $('script[type="application/ld+json"]').toArray()) {
    const found = ($(el).html() ?? '').match(/"ratingValue"\s*:\s*"?([\d.]+)/);
    const value = found ? parseFloat(found[1]) : NaN;
    if (Number.isFinite(value) && value > 0) {
      return Math.round(value * 100) / 100;
    }
  }
  return undefined;
}

function descriptionOf($: CheerioAPI): string | undefined {
  const $summary = $('.summary').first();
  // KaliScan để <p class="content"> rỗng rồi đặt nội dung ở các <p> ngay sau;
  // đoạn "You are reading … at <site>" đứng trước là câu quảng cáo của site.
  const paragraphs = $summary
    .find('.content, .content ~ p')
    .toArray()
    .flatMap(el => {
      const $el = $(el).clone();
      $el.find('br').replaceWith('\n');
      return $el.text().split('\n').map(cleanText);
    })
    .filter(Boolean);
  if (paragraphs.length) {
    return paragraphs.join('\n\n');
  }
  return cleanText($('meta[property="og:description"]').attr('content')) || undefined;
}

function titleOf($: CheerioAPI): string {
  return (
    textOf($('.detail .name h1, .book-info h1')) ||
    textOf($('h1')) ||
    cleanText($('meta[property="og:title"]').attr('content'))
  );
}

function parseChapters($: CheerioAPI, base: string): Chapter[] {
  return uniqBy(
    $('#chapter-list > li, ul.chapter-list > li')
      .toArray()
      .filter(el => !$(el).parents('#series-history').length)
      .map(el => {
        const $el = $(el);
        const $a = $el.find('a').first();
        const name = textOf($el.find('.chapter-title')) || cleanText($a.attr('title')) || cleanText($a.text());
        const date = textOf($el.find('.chapter-update, time')) || undefined;
        // Có site để href "//" thừa: /slug//chapter-1.
        const href = ($a.attr('href') ?? '').replace(/([^:/])\/{2,}/g, '$1/');
        return {
          url: resolveUrl(href, base),
          name,
          date,
          time: parseDate(date),
          number: parseChapterNumber(name),
        };
      })
      // Mẫu chưa điền của site ("Chapter {{number}}").
      .filter(ch => ch.url && ch.name && !ch.name.includes('{{')),
    ch => ch.url,
  );
}

function scriptVar(html: string, name: string): string | undefined {
  const found = html.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|(\\d+))`));
  return found ? found[1] ?? found[2] ?? found[3] : undefined;
}

/** Chương còn thiếu (trang chỉ hiện một phần, nút "SHOW MORE" gọi API). */
async function moreChapters(src: SourceConfig, url: string, html: string, title: string): Promise<Chapter[]> {
  const bookId = scriptVar(html, 'bookId');
  const bookSlug = scriptVar(html, 'bookSlug');
  const candidates: string[] = [];
  if (bookId) {
    candidates.push(
      withQuery(`${src.baseUrl}/service/backend/chaplist/`, { manga_id: bookId, manga_name: title }),
      withQuery(`${src.baseUrl}/api/manga/${bookId}/chapters`, { source: 'detail' }),
    );
  }
  if (bookSlug && bookSlug !== bookId) {
    candidates.push(
      withQuery(`${src.baseUrl}/api/manga/${encodeURIComponent(bookSlug)}/chapters`, { source: 'detail' }),
    );
  }
  for (const endpoint of candidates) {
    try {
      const chapters = parseChapters(parseHtml(await getText(endpoint, { ajax: true, referer: url })), src.baseUrl);
      if (chapters.length) {
        return chapters;
      }
    } catch {
      // Thử endpoint khác.
    }
  }
  return [];
}

function mergeChapters(inline: Chapter[], api: Chapter[]): Chapter[] {
  if (!api.length) {
    return inline;
  }
  // Chương mới hơn API (nếu có) đứng đầu trang, phần sau trùng với API.
  const inApi = new Set(api.map(ch => ch.url));
  const cut = inline.findIndex(ch => inApi.has(ch.url));
  return uniqBy([...inline.slice(0, cut < 0 ? inline.length : cut), ...api], ch => ch.url);
}

/** Toàn bộ chương của trang truyện: trong trang, cộng phần còn thiếu lấy qua API. */
async function fetchChapters(
  src: SourceConfig,
  url: string,
  html: string,
  $: CheerioAPI,
  title: string,
): Promise<Chapter[]> {
  const chapters = parseChapters($, src.baseUrl);
  if ($('#show-more-chapters [onclick*="getChapters"]').length || (!chapters.length && /\bbookId\s*=/.test(html))) {
    return mergeChapters(chapters, await moreChapters(src, url, html, title));
  }
  return chapters;
}

function isAbsolute(url: string): boolean {
  return /^(https?:)?\/\//i.test(url);
}

/** Ảnh trong biến JS; mainServer là host ảnh khi đường dẫn là tương đối. */
function scriptImages(html: string, base: string): string[] {
  const list = scriptVar(html, 'chapImages');
  if (!list) {
    return [];
  }
  const server = scriptVar(html, 'mainServer') ?? '';
  return list
    .split(',')
    .map(path => path.trim())
    .filter(Boolean)
    .map(path => {
      const full = isAbsolute(path) || !server ? path : `${server}${path}`;
      return resolveUrl(full, base);
    });
}

function htmlImages($: CheerioAPI, base: string): string[] {
  return $('#chapter-images img, .chapter-image[data-src], .chapter-image img')
    .toArray()
    .map(el => imageSrc($(el), base) ?? '')
    .filter(uri => uri && !uri.startsWith('data:') && !/\/static\/common\/x\.gif/.test(uri));
}

function pagesOf(html: string, base: string): string[] {
  const fromHtml = uniqBy(htmlImages(parseHtml(html), base), u => u);
  const fromScript = uniqBy(scriptImages(html, base), u => u);
  // Site chỉ đặt vài ảnh đầu trong HTML, phần còn lại nằm trong chapImages.
  return fromScript.length >= fromHtml.length ? fromScript : fromHtml;
}

// ─── Đọc dữ liệu ────────────────────────────────────────────────────────────

/** Trang /search (danh sách, tìm kiếm, thể loại). */
async function loadList(site: SourceConfig, url: string, params?: ListParams): Promise<ListPage> {
  const page = params?.page ?? (Number(getQueryParam(url, 'page')) || 1);
  return parseListing(parseHtml(await getText(url)), site.baseUrl, page);
}

async function loadGenres(site: SourceConfig): Promise<Genre[]> {
  const $ = parseHtml(await getText(`${site.baseUrl}/search`));
  let genres: Genre[] = $('.checkbox-group.genres .checkbox-wrapper, .genres .checkbox-wrapper')
    .toArray()
    .map(el => {
      const $input = $(el).find('input').first();
      const key = $input.attr('name');
      if (key) {
        genreKeys.set(site.baseUrl, key);
      }
      return { id: $input.attr('value') ?? '', name: textOf($(el).find('.radio__label, label')) };
    });
  if (!genres.length) {
    // Không có bộ lọc: lấy từ menu GENRES (/genres/<slug>).
    genres = $('a[href*="/genres/"]')
      .toArray()
      .map(el => ({ id: genreSlug($(el).attr('href')), name: itemName($(el).text()) }));
  }
  return uniqBy(
    genres.filter(g => g.id && g.name && g.id.toLowerCase() !== 'all'),
    g => g.id,
  ).sort((a, b) => a.name.localeCompare(b.name));
}

async function loadDetail(site: SourceConfig, url: string): Promise<MangaDetail> {
  const html = await getText(url);
  const $ = parseHtml(html);
  const base = site.baseUrl;
  const title = titleOf($);

  const rows = metaRows($);
  const find = (pattern: RegExp) => rows.find(row => pattern.test(row.label));
  const genreRow = find(/genre|thể loại/);
  const genres = uniqBy(
    (genreRow?.$row.find('a').toArray() ?? [])
      .map(el => ({ id: genreSlug($(el).attr('href')), name: itemName($(el).text()) }))
      .filter(g => g.name),
    g => g.id || g.name,
  );

  const altText = textOf($('.detail .name h2, .book-info h2'));
  // MangaBuddy ngăn tên khác bằng " ; ", KaliScan bằng dấu phẩy.
  const altTitles = altText
    ? uniqBy(
        altText
          .split(altText.includes(';') ? ';' : ',')
          .map(cleanText)
          .filter(t => t && t !== title),
        t => t,
      )
    : [];

  return {
    url,
    title,
    altTitles: altTitles.length ? altTitles : undefined,
    cover: imageSrc($('#cover img, .img-cover img'), base) || $('meta[property="og:image"]').attr('content'),
    description: descriptionOf($),
    status: rowValues($, find(/status|trạng thái/))[0],
    authors: uniqBy(rowValues($, find(/author|tác giả/)), a => a),
    genres,
    rating: ratingOf($),
    views: rowValues($, find(/view|lượt xem/))[0],
    chapters: await fetchChapters(site, url, html, $, title),
    nsfw: genres.some(g => NSFW_GENRES.test(g.name)),
  };
}

async function loadChapter(site: SourceConfig, url: string): Promise<ChapterContent> {
  const base = site.baseUrl;
  const html = await getText(url, { referer: `${base}/` });
  const $ = parseHtml(html);
  let pages = pagesOf(html, base);

  if (!pages.length) {
    // KaliScan: trang chương rỗng, ảnh lấy theo id chương từ server ảnh.
    const chapterId = scriptVar(html, 'chapterId');
    if (chapterId) {
      const server = await getText(
        withQuery(`${base}/service/backend/chapterServer/`, { server_id: 1, chapter_id: chapterId }),
        { ajax: true, referer: url },
      );
      pages = pagesOf(server, base);
    }
  }
  if (!pages.length) {
    throw new Error('Không tìm thấy ảnh trong chương này.');
  }
  const headers = imageHeaders(site);
  return {
    kind: 'images',
    title:
      textOf($('.chapter-info h1')) ||
      textOf($('#breadcrumbs-container .breadcrumbs-item').last()) ||
      textOf($('h1')) ||
      undefined,
    pages: pages.map(uri => ({ uri, headers })),
  };
}

async function resolveMangaUrl(site: SourceConfig, chapterUrl: string, html?: string): Promise<string | undefined> {
  // Bỏ đoạn cuối: /<slug>/chapter-1 → /<slug>, /manga/<id>-<slug>/chapter-1 → /manga/<id>-<slug>.
  const segments = pathSegments(chapterUrl);
  const first = segments[0]?.toLowerCase() ?? '';
  if (segments.length >= (first === 'manga' ? 3 : 2) && !RESERVED.has(first)) {
    return `${site.baseUrl}/${segments.slice(0, -1).map(encodeURIComponent).join('/')}`;
  }
  const $ = parseHtml(html ?? (await getText(chapterUrl)));
  const href = $('#breadcrumbs-container .breadcrumbs-item a').eq(1).attr('href');
  return href ? resolveUrl(href, site.baseUrl) : undefined;
}

// ─── Các hàm của addon ──────────────────────────────────────────────────────

export function getURL({ site, params }: GetURLInput): string {
  switch (params.method) {
    case 'list':
      return searchUrl(site, { q: '', status: 'all', sort: SORT[params.sort], page: params.page });
    case 'search':
      return searchUrl(site, { q: params.query, page: params.page });
    case 'genre': {
      const key = genreKeys.get(site.baseUrl);
      // Chưa biết site dùng genre[] (MangaBuddy) hay include[] (KaliScan): gửi cả hai,
      // site bỏ qua tham số lạ.
      const id = params.genre.id;
      const filter = key ? { [key]: id } : { 'genre[]': id, 'include[]': id };
      return searchUrl(site, { ...filter, status: 'all', sort: SORT[params.sort], q: '', page: params.page });
    }
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
      const mangaUrl = url ?? '';
      const page = html ?? (await getText(mangaUrl));
      const $ = parseHtml(page);
      return { widget: 'chapter', chapters: await fetchChapters(site, mangaUrl, page, $, titleOf($)) };
    }
    case 'manga':
      return { widget: 'manga', url: url ? await resolveMangaUrl(site, url, html) : undefined };
  }
}

export function match({ url, html }: MatchInput): UrlKind | null {
  if (getQueryParam(url, 'q') !== undefined) {
    return 'list';
  }
  const segments = pathSegments(url);
  if (!segments.length) {
    return 'list';
  }
  const first = segments[0].toLowerCase();
  if (LIST_DIRS.has(first)) {
    return 'list';
  }
  if (first === 'manga') {
    // KaliScan: /manga/<id>-<slug>[/chapter-…]; /manga trơn là trang danh sách.
    return segments.length === 1 ? 'list' : segments.length === 2 ? 'detail' : 'chapter';
  }
  if (!RESERVED.has(first) && segments.length <= 2) {
    // MangaBuddy: /<slug> và /<slug>/<chương>.
    if (html) {
      if (/\bchapterId\s*=\s*\d+|id="chapter-images"/.test(html)) {
        return 'chapter';
      }
      if (/id="chapter-list"|class="book-info"/.test(html)) {
        return 'detail';
      }
    }
    return segments.length === 1 ? 'detail' : 'chapter';
  }
  return null;
}

export function detect(html: string): boolean {
  return /\bvar\s+(?:bookSlug|chapImages|mainServer)\s*=|class="[^"]*\b(?:book-detailed-item|genres__wrapper)\b|id=["']header-autocomplete-list["']|\/app\/manga\/themes\/|\/static\/common\/x\.gif/.test(
    html,
  );
}

export function imageHeaders(site: SourceConfig): Record<string, string> {
  // CDN ảnh (mbcdn, 1stmangago…) chặn khi thiếu Referer của site.
  return refererHeaders(site);
}
