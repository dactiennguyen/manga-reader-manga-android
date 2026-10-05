import type { Cheerio, CheerioAPI } from 'cheerio/slim';
import type { AnyNode } from 'domhandler';

import {
  cleanText,
  getHost,
  getJson,
  getOrigin,
  getPath,
  getQueryParam,
  getText,
  head,
  imageSrc,
  parseChapterNumber,
  parseDate,
  parseHtml,
  pathSegments,
  refererHeaders,
  request,
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
 * Họ theme "MangaBox": Mangakakalot / Manganelo / Manganato / MangaBat và các
 * bản sao. Markup gần như giống nhau (itemupdate, list-truyen-item-wrap,
 * manga-info-top, container-chapter-reader) nhưng mỗi đời site đặt URL khác:
 *
 * - "mangalist" — Mangakakalot.gg/Natomanga/Nelomanga đời 2025 và site vệ
 *   tinh (mangakakalove.com): /manga-list/hot-manga?page=2,
 *   /genre/<slug>?filter=7&page=2, truyện /manga/<slug>, chương lấy qua
 *   /api/manga/<slug>/chapters, ảnh nằm trong biến cdns + chapterImages.
 * - "short" — bản PHP cũ (manganelo.cc): /latest?p=2, /newest, /genre/<slug>?p=2,
 *   truyện /series/<slug>, chương /chapter/<id>/<slug>-<số>, không có trang
 *   "xem nhiều" (lấy khối POPULAR MANGA ở trang chủ).
 * - "genreall" — Manganato/MangaBat cũ: /genre-all/2?type=topview, /genre-<id>/2.
 * - "mangalistq" — Mangakakalot cũ: /manga_list?type=topview&category=all&state=all&page=2.
 *
 * Chỉ từ baseUrl thì không biết site thuộc đời nào, nên đọc link menu ở trang
 * chủ một lần rồi nhớ lại (kèm danh sách thể loại ở khối GENRES).
 */

type Layout = 'mangalist' | 'short' | 'genreall' | 'mangalistq';

type SiteInfo = { layout: Layout; genres: Genre[] };

/** Đường dẫn /manga-list/<…> của đời "mangalist". */
const MANGA_LIST: Record<ListSort, string> = {
  latest: 'latest-manga',
  popular: 'hot-manga',
  new: 'new-manga',
  rating: 'hot-manga',
  az: 'latest-manga',
};

/** ?filter= ở trang thể loại đời "mangalist": 1 truyện mới, 4 mới cập nhật (mặc định), 7 xem nhiều. */
const FILTER: Record<ListSort, number | undefined> = {
  latest: undefined,
  popular: 7,
  new: 1,
  rating: 7,
  az: undefined,
};

/** ?type= của Manganato/Mangakakalot đời cũ. */
const TYPE: Record<ListSort, string> = {
  latest: 'latest',
  popular: 'topview',
  new: 'newest',
  rating: 'topview',
  az: 'latest',
};

/** Đời "short" chỉ có trang mới cập nhật và truyện mới. */
const SHORT: Partial<Record<ListSort, string>> = {
  latest: 'latest',
  new: 'newest',
  az: 'latest',
};

const ITEM = '.list-truyen-item-wrap, .list-comic-item-wrap, .story_item, .content-genres-item, .search-story-item';

/** Thư mục trang truyện hay gặp: /manga/<slug>, /series/<slug>. */
const MANGA_DIRS = new Set(['manga', 'series', 'comic', 'comics']);

/** Trang truyện Manganato/Mangakakalot cũ: /manga-aa123456, /read-ab123. */
const DETAIL_ID = /^(?:manga|read)-[a-z0-9]+$/i;

const LIST_PATHS =
  /^(?:manga-list|manga_list|genre|genre-\w+|search|latest|newest|completed|hot|popular|advanced_search|official)$/i;

const NSFW_GENRES = /adult|mature|smut|hentai|ecchi|18\+|erotic|pornographic/i;

/** Giá trị trống site hay điền vào ô tác giả. */
const PLACEHOLDER = /^(-+|n\/?a|none|unknown|updating|đang cập nhật)$/i;

/** Đoạn quảng cáo site vệ tinh chèn trước phần tóm tắt thật. */
const BOILERPLATE = /^you are reading\b.*\b(bookmark|enjoy)\b/i;

const dirOf = (src: SourceConfig) => src.options?.mangaDir || 'manga';

const sites = new Map<string, Promise<SiteInfo>>();

function layoutOf(html: string): Layout {
  if (/\/manga-list\/(?:latest|hot|new|completed)-manga/.test(html)) {
    return 'mangalist';
  }
  if (/\/genre-all\b/.test(html)) {
    return 'genreall';
  }
  if (/\/manga_list\?type=/.test(html)) {
    return 'mangalistq';
  }
  if (/href="(?:https?:\/\/[^"/]+)?\/(?:latest|newest)\/?"/.test(html)) {
    return 'short';
  }
  // Không nhận ra: đời mới nhất là kiểu phổ biến của bản sao hiện nay.
  return 'mangalist';
}

function siteInfo(src: SourceConfig): Promise<SiteInfo> {
  const cached = sites.get(src.baseUrl);
  if (cached) {
    return cached;
  }
  const info = getText(`${src.baseUrl}/`).then(html => ({
    layout: layoutOf(html),
    genres: genresIn(parseHtml(html)),
  }));
  sites.set(src.baseUrl, info);
  // Lỗi mạng/Cloudflare: không nhớ để lần sau tải lại.
  info.catch(() => sites.delete(src.baseUrl));
  return info;
}

/** Id thể loại từ link: /genre/action → "action", /genre-2 → "2", manga_list?category=2 → "2". */
function genreIdOf(href: string): string | undefined {
  const path = getPath(href);
  let id =
    path.match(/^\/genre\/([^/]+)\/?$/)?.[1] ??
    path.match(/^\/genre-([a-z0-9]+)(?:\/\d*)?\/?$/i)?.[1] ??
    (path === '/manga_list' ? getQueryParam(href, 'category') : undefined);
  if (!id || id.toLowerCase() === 'all') {
    return undefined;
  }
  try {
    id = decodeURIComponent(id);
  } catch {
    // Giữ nguyên.
  }
  return id;
}

function genreName(text: string): string {
  return cleanText(text.replace(/_/g, ' ')).replace(/\s*\(\d+\)$/, '');
}

function genresIn($: CheerioAPI): Genre[] {
  const genres = $('a[href]')
    .toArray()
    .map(el => ({
      id: genreIdOf($(el).attr('href') ?? '') ?? '',
      name: genreName($(el).text()),
    }))
    .filter(g => g.id && g.name);
  return uniqBy(genres, g => g.id).sort((a, b) => a.name.localeCompare(b.name));
}

function pageQuery(layout: Layout, page: number): Record<string, number | undefined> {
  const value = page > 1 ? page : undefined;
  return layout === 'short' ? { p: value } : { page: value };
}

function genreUrl(base: string, layout: Layout, id: string, sort: ListSort, page: number): string {
  const slug = encodeURIComponent(id);
  switch (layout) {
    case 'short':
      // Trang thể loại không nhận tham số sắp xếp (redirect sang http://).
      return withQuery(`${base}/genre/${slug}`, pageQuery(layout, page));
    case 'genreall':
      return withQuery(`${base}/genre-${slug}/${page}`, {
        type: sort === 'latest' ? undefined : TYPE[sort],
      });
    case 'mangalistq':
      return withQuery(`${base}/manga_list`, {
        type: TYPE[sort] ?? TYPE.latest,
        category: id,
        state: 'all',
        page,
      });
    default:
      return withQuery(`${base}/genre/${slug}`, { filter: FILTER[sort], ...pageQuery(layout, page) });
  }
}

/** undefined: site không có trang danh sách cho kiểu sắp xếp này. */
function listUrl(base: string, layout: Layout, sort: ListSort, page: number): string | undefined {
  switch (layout) {
    case 'short': {
      const path = SHORT[sort];
      return path ? withQuery(`${base}/${path}`, pageQuery(layout, page)) : undefined;
    }
    case 'genreall':
    case 'mangalistq':
      return genreUrl(base, layout, 'all', sort, page);
    default:
      return withQuery(`${base}/manga-list/${MANGA_LIST[sort] ?? MANGA_LIST.latest}`, pageQuery(layout, page));
  }
}

/** "one piece!" → "one_piece" như ô tìm kiếm của site. */
function searchSlug(query: string): string {
  return query
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '');
}

/** manganelo.cc để trống tên ở trang /latest — dựng lại từ slug. */
function titleFromSlug(url: string): string {
  const slug = pathSegments(url).pop() ?? '';
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function hasNextPage($: CheerioAPI, page: number): boolean {
  return $('.group_page a[href], .group-page a[href], .panel_page_number a[href], .panel-page-number a[href]')
    .toArray()
    .some(el => {
      const text = cleanText($(el).text());
      if (/^(next|›|»|>)/i.test(text)) {
        return true;
      }
      // "3", "Last(674)", "LAST(674)".
      const last = Number(text.match(/(\d+)\)?$/)?.[1]);
      return last > page;
    });
}

/** Số trang đọc từ URL (?page=, ?p=, /genre-all/2) — khi chạy trên trang đang mở, không có params. */
function pageOf(url: string): number {
  const value = Number(getQueryParam(url, 'page') ?? getQueryParam(url, 'p') ?? getPath(url).match(/\/(\d+)\/?$/)?.[1]);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function parseListing($: CheerioAPI, base: string, page: number): ListPage {
  const items: MangaItem[] = [];
  $(ITEM).each((_, el) => {
    const $el = $(el);
    const $title = $el.find('h3 a, .story_name a, a.genres-item-name, a.item-title').first();
    const href = $title.attr('href') || $el.find('a[href]').first().attr('href');
    if (!href) {
      return;
    }
    const url = resolveUrl(href, base);
    items.push({
      url,
      title:
        cleanText($title.text()) ||
        cleanText($title.attr('title')) ||
        cleanText($el.find('a[title]').first().attr('title')) ||
        titleFromSlug(url),
      cover: imageSrc($el.find('img'), base),
      subtitle:
        textOf($el.find('a.list-story-item-wrap-chapter, .story_chapter a, a.genres-item-chap, a.item-chapter')) ||
        undefined,
    });
  });
  return { items: uniqBy(items, item => item.url), hasNext: hasNextPage($, page) };
}

/** Khối POPULAR MANGA (carousel) và "Most Popular" ở trang chủ (`base`). */
async function homePopular(base: string): Promise<ListPage> {
  const $ = parseHtml(await getText(base));
  const items: MangaItem[] = [];
  $('.owl-carousel .item, #owl-slider .item').each((_, el) => {
    const $el = $(el);
    const $a = $el.find('h3 a[href]').first();
    if (!$a.length) {
      return;
    }
    const url = resolveUrl($a.attr('href'), base);
    items.push({
      url,
      title: cleanText($a.text()) || cleanText($a.attr('title')) || titleFromSlug(url),
      cover: imageSrc($el.find('img'), base),
      subtitle: cleanText($el.find('.slide-caption > a').last().text()) || undefined,
    });
  });
  $('.xem-nhieu-item a[href]').each((_, el) => {
    const $a = $(el);
    const url = resolveUrl($a.attr('href'), base);
    const [name, ...rest] = cleanText($a.text()).split(' - ');
    items.push({
      url,
      title: cleanText($a.attr('title')) || name || titleFromSlug(url),
      subtitle: rest.join(' - ') || undefined,
    });
  });
  return { items: uniqBy(items, item => item.url), hasNext: false };
}

type InfoRow = { label: string; value: string; $el: Cheerio<AnyNode> };

/** Các dòng "Nhãn : giá trị" của trang truyện (cả bảng variations-tableInfo của Manganato). */
function infoRows($: CheerioAPI): InfoRow[] {
  const rows: InfoRow[] = [];
  $('.manga-info-text li').each((_, el) => {
    const $el = $(el);
    if (/display:\s*none/i.test($el.attr('style') ?? '')) {
      return;
    }
    const $clone = $el.clone();
    $clone.find('script, style, h1, .story-alternative').remove();
    const text = cleanText($clone.text());
    const colon = text.indexOf(':');
    if (colon > 0) {
      rows.push({ label: text.slice(0, colon).toLowerCase(), value: text.slice(colon + 1).trim(), $el });
    }
  });
  $('.variations-tableInfo tr').each((_, el) => {
    const $cells = $(el).find('td');
    const $value = $cells.last();
    rows.push({
      label: cleanText($cells.first().text()).replace(/\s*:$/, '').toLowerCase(),
      value: cleanText($value.text()),
      $el: $value,
    });
  });
  $('.story-info-right-extent p').each((_, el) => {
    const $value = $(el).find('.stre-value');
    rows.push({
      label: textOf($(el).find('.stre-label')).replace(/\s*:$/, '').toLowerCase(),
      value: cleanText($value.text()),
      $el: $value,
    });
  });
  return rows;
}

function findRow(rows: InfoRow[], pattern: RegExp): InfoRow | undefined {
  return rows.find(row => pattern.test(row.label));
}

function splitNames(value: string): string[] {
  return (value.includes(';') ? value.split(';') : value.split(',')).map(cleanText).filter(Boolean);
}

function altTitlesOf($: CheerioAPI, rows: InfoRow[]): string[] | undefined {
  const raw = textOf($('.story-alternative')) || findRow(rows, /alternative|other name/)?.value || '';
  const names = splitNames(raw.replace(/^alternative\s*:?\s*/i, ''));
  return names.length ? names : undefined;
}

function authorsOf($: CheerioAPI, rows: InfoRow[]): string[] {
  const row = findRow(rows, /author/);
  if (!row) {
    return [];
  }
  const links = row.$el
    .find('a')
    .toArray()
    .map(a => cleanText($(a).text()));
  const names = links.length ? links : row.value.split(/\s*[,;]\s*/);
  return uniqBy(
    names.map(cleanText).filter(name => name && !PLACEHOLDER.test(name)),
    name => name,
  );
}

function genresOf($: CheerioAPI, rows: InfoRow[], base: string): Genre[] {
  const row = findRow(rows, /genre/);
  if (!row) {
    return [];
  }
  const genres = row.$el
    .find('a[href]')
    .toArray()
    .map(a => {
      const href = resolveUrl($(a).attr('href'), base);
      return {
        id: genreIdOf(href) ?? pathSegments(href).pop() ?? '',
        name: genreName($(a).text()),
      };
    })
    .filter(g => g.name);
  return uniqBy(genres, g => g.id || g.name);
}

function descriptionOf($: CheerioAPI): string | undefined {
  const $desc = $('#contentBox, #noidungm, #panel-story-info-description, #story_discription').first();
  if (!$desc.length) {
    return undefined;
  }
  // Bỏ tiêu đề "X summary:" / "Description :" và giữ xuống dòng của <br>.
  $desc.find('h2, h3, script, style').remove();
  $desc.find('br').replaceWith('\n');
  const paragraphs = $desc
    .text()
    .split(/\n\s*\n/)
    .map(cleanText)
    .filter(p => p && !BOILERPLATE.test(p));
  return paragraphs.join('\n\n') || undefined;
}

function ratingOf($: CheerioAPI): number | undefined {
  // "mangakakalove.com rate : 4.40 / 5 - 36 votes"
  const rate = textOf($('#rate_row_cmd')).match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  const value = rate
    ? (parseFloat(rate[1]) / parseFloat(rate[2])) * 5
    : parseFloat($('.rating[data-default]').attr('data-default') ?? '');
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : undefined;
}

/** Site vệ tinh trỏ link chương về "site chính" (window.mainSiteUrl, thường đã chết) — đổi về site đang đọc. */
function onSite(url: string, src: SourceConfig): string {
  return src.baseUrl + url.slice(getOrigin(url).length);
}

function inlineChapters($: CheerioAPI, base: string, fix: (url: string) => string): Chapter[] {
  const chapters = $('.chapter-list .row, ul.row-content-chapter li')
    .toArray()
    .map(el => {
      const $el = $(el);
      const $a = $el.find('a[href]').first();
      const name = cleanText($a.text()) || cleanText($a.attr('title'));
      // Ngày đầy đủ nằm trong title, chữ hiển thị chỉ là "March 2025".
      const $time = $el.find('span.chapter-time, span[title]').last();
      const exact = cleanText($time.attr('title'));
      const shown = cleanText($time.text()) || textOf($el.find('span').not(':has(a)').last());
      return {
        url: $a.length ? fix(resolveUrl($a.attr('href'), base)) : '',
        name,
        date: exact || shown || undefined,
        time: parseDate(exact) ?? parseDate(shown),
        number: parseChapterNumber(name),
      };
    })
    .filter(ch => ch.url && ch.name);
  return uniqBy(chapters, ch => ch.url);
}

type ChapterApi = {
  data?: {
    chapters?: {
      chapter_name?: string;
      chapter_slug?: string;
      chapter_num?: number | string;
      updated_at?: string;
    }[];
    pagination?: { has_more?: boolean };
  };
};

/** "2025-12-22T19:57:22.000000Z" — Hermes chỉ nhận tối đa 3 chữ số phần nghìn giây. */
function isoTime(value: string): number | undefined {
  const time = Date.parse(value.replace(/(\.\d{3})\d+/, '$1'));
  return Number.isFinite(time) ? time : parseDate(value);
}

const API_BATCH = 1000;

/** Đời "mangalist": danh sách chương tải bằng JS từ /api/manga/<slug>/chapters?limit=&offset=. */
async function apiChapters(src: SourceConfig, $: CheerioAPI, pageUrl: string): Promise<Chapter[]> {
  const $box = $('#chapter-list-container[data-api-url], #chapter-page-data[data-api-url]').first();
  const slug = $box.attr('data-comic-slug');
  const api = $box.attr('data-api-url');
  if (!slug || !api) {
    return [];
  }
  const endpoint = resolveUrl(api.replace('__SLUG__', encodeURIComponent(slug)), pageUrl);
  const template = $box.attr('data-chapter-url-template') || `${src.baseUrl}/manga/__MANGA__/__CHAPTER__`;
  const chapters: Chapter[] = [];
  // Giới hạn số vòng phòng API trả has_more sai.
  for (let round = 0, offset = 0; round < 50; round++) {
    const res = await getJson<ChapterApi>(withQuery(endpoint, { limit: API_BATCH, offset }), {
      referer: pageUrl,
    });
    const batch = res.data?.chapters ?? [];
    for (const ch of batch) {
      if (!ch.chapter_slug) {
        continue;
      }
      const name = cleanText(ch.chapter_name) || ch.chapter_slug;
      const number = Number(ch.chapter_num);
      chapters.push({
        url: onSite(template.replace('__MANGA__', slug).replace('__CHAPTER__', ch.chapter_slug), src),
        name,
        date: ch.updated_at?.slice(0, 10),
        time: ch.updated_at ? isoTime(ch.updated_at) : undefined,
        number: ch.chapter_num !== undefined && Number.isFinite(number) ? number : parseChapterNumber(name),
      });
    }
    offset += batch.length;
    if (!batch.length || !res.data?.pagination?.has_more) {
      break;
    }
  }
  return uniqBy(chapters, ch => ch.url);
}

/** Toàn bộ chương của trang truyện: ngay trong trang (đời cũ) hoặc qua API (đời "mangalist"). */
async function chaptersOf(src: SourceConfig, url: string, html: string, $: CheerioAPI): Promise<Chapter[]> {
  const mainSite = html.match(/mainSiteUrl\s*=\s*['"]([^'"]+)['"]/)?.[1];
  const mainHost = mainSite ? getHost(mainSite) : undefined;
  const fix = (link: string) =>
    mainHost && getHost(link) === mainHost && mainHost !== getHost(src.baseUrl) ? onSite(link, src) : link;

  const chapters = inlineChapters($, url, fix);
  return chapters.length ? chapters : apiChapters(src, $, url);
}

/** Mảng JSON trong script: `var chapterImages = [...];`. */
function scriptArray(html: string, name: string): string[] {
  const found = html.match(new RegExp(`\\b${name}\\s*=\\s*(\\[[\\s\\S]*?\\])\\s*;`));
  if (!found) {
    return [];
  }
  try {
    const value: unknown = JSON.parse(found[1]);
    return Array.isArray(value)
      ? value.filter((v): v is string => typeof v === 'string' && !!v.trim()).map(v => v.trim())
      : [];
  } catch {
    return [];
  }
}

function joinUrl(server: string, path: string): string {
  return `${server.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

/** Thử tải (HEAD) một ảnh — không tải cả ảnh về. */
async function serves(url: string, headers: Record<string, string>): Promise<boolean> {
  const res = await head(url, { headers, timeoutMs: 8000 });
  // Server hỏng thường trả 429 JSON / 503 HTML thay vì ảnh.
  return !!res?.ok && !/json|html/i.test(res.contentType);
}

/** Đời "mangalist": ảnh = server (cdns) + đường dẫn (chapterImages). */
async function scriptPages(html: string, $: CheerioAPI, headers: Record<string, string>): Promise<string[]> {
  const paths = scriptArray(html, 'chapterImages');
  if (!paths.length) {
    return [];
  }
  if (paths.every(p => /^https?:\/\//i.test(p))) {
    return paths;
  }
  const servers = uniqBy([...scriptArray(html, 'cdns'), ...scriptArray(html, 'backupImage')], s => s);
  // Đưa server site đang chọn (nút IMAGES SERVER .isactive) lên đầu.
  const active = Number($('.pn-op-sv-img-btn.isactive').attr('data-cdn')) - 1;
  if (active > 0 && servers[active]) {
    servers.unshift(...servers.splice(active, 1));
  }
  if (!servers.length) {
    return [];
  }
  // Nhiều server thì lấy server đầu tiên thực sự trả ảnh (vd. imgs-2 hay trả 429).
  let server = servers[0];
  if (servers.length > 1) {
    for (const candidate of servers) {
      if (await serves(joinUrl(candidate, paths[0]), headers)) {
        server = candidate;
        break;
      }
    }
  }
  return paths.map(p => joinUrl(server, p));
}

function breadcrumbManga($: CheerioAPI, base: string): string | undefined {
  // [Trang chủ, Truyện, Chương]
  const crumbs = $('.breadcrumb a[href], .panel-breadcrumb a[href]').toArray();
  return crumbs.length >= 2 ? resolveUrl($(crumbs[1]).attr('href'), base) : undefined;
}

// ─── Đọc dữ liệu ────────────────────────────────────────────────────────────

/**
 * Kiểu sắp xếp khi URL là trang danh sách chung (từ khoá rỗng = mới cập nhật,
 * xem getURL); undefined với tìm kiếm và thể loại.
 */
function listSortOf(params: ListParams | undefined): ListSort | undefined {
  if (params?.method === 'list') {
    return params.sort;
  }
  return params?.method === 'search' && !searchSlug(params.query) ? 'latest' : undefined;
}

/** Trang danh sách / thể loại / tìm kiếm. */
async function loadList(site: SourceConfig, url: string, params?: ListParams): Promise<ListPage> {
  const page = params?.page ?? pageOf(url);
  const sort = listSortOf(params);
  if (getPath(url) === '/' && (sort || !params)) {
    // getURL trả trang chủ khi site không có trang danh sách cho kiểu sắp xếp
    // này (đời "short" với xem nhiều): lấy khối POPULAR MANGA, chỉ một trang.
    return page > 1 ? { items: [], hasNext: false } : homePopular(url);
  }
  const res = await request(url);
  if (sort && getPath(res.url) === '/') {
    // Site không có trang này và chuyển về trang chủ (manganelo.cc với /newest).
    if (sort === 'latest') {
      return { items: [], hasNext: false };
    }
    const latest: ListParams = { method: 'list', sort: 'latest', page };
    return loadList(site, await getURL({ site, params: latest }), latest);
  }
  return parseListing(parseHtml(res.text), url, page);
}

async function loadGenres(site: SourceConfig): Promise<Genre[]> {
  const { layout, genres } = await siteInfo(site);
  if (genres.length) {
    return genres;
  }
  // Trang chủ không có khối GENRES: lấy ở bộ lọc của trang danh sách.
  const url = listUrl(site.baseUrl, layout, 'latest', 1);
  return url ? genresIn(parseHtml(await getText(url))) : [];
}

async function loadDetail(site: SourceConfig, url: string): Promise<MangaDetail> {
  const html = await getText(url);
  const $ = parseHtml(html);
  const rows = infoRows($);
  const genres = genresOf($, rows, url);
  const chapters = await chaptersOf(site, url, html, $);
  const ogTitle = cleanText($('meta[property="og:title"]').attr('content')).split(/\s+[-|]\s+/)[0];

  return {
    url,
    title: textOf($('.manga-info-text h1, .story-info-right h1, .manga-info-top h1, .panel-story-info h1')) || ogTitle,
    altTitles: altTitlesOf($, rows),
    cover:
      imageSrc($('.manga-info-pic img, .info-image img, .story-info-left img'), url) ||
      $('meta[property="og:image"]').attr('content'),
    description: descriptionOf($),
    status: findRow(rows, /status/)?.value || undefined,
    authors: authorsOf($, rows),
    genres,
    rating: ratingOf($),
    views: findRow(rows, /^view/)?.value || undefined,
    chapters,
    nsfw: genres.some(g => NSFW_GENRES.test(g.name)),
  };
}

async function loadChapter(site: SourceConfig, url: string): Promise<ChapterContent> {
  const html = await getText(url, { referer: `${site.baseUrl}/` });
  const $ = parseHtml(html);
  const headers = imageHeaders(site);
  let pages = await scriptPages(html, $, headers);
  if (!pages.length) {
    pages = $('.container-chapter-reader img, #vungdoc img, .vung-doc img')
      .toArray()
      .map(el => imageSrc($(el), url) ?? '')
      .filter(uri => uri && !uri.startsWith('data:'));
  }
  if (!pages.length) {
    throw new Error('Không tìm thấy ảnh trong chương này.');
  }
  return {
    kind: 'images',
    title: textOf($('.current-chapter, .info-top-chapter h2, .panel-chapter-info-top h1')) || undefined,
    pages: uniqBy(pages, uri => uri).map(uri => ({ uri, headers })),
  };
}

async function resolveMangaUrl(site: SourceConfig, chapterUrl: string, html?: string): Promise<string | undefined> {
  const segments = pathSegments(chapterUrl);
  const [first = '', second = '', third = ''] = segments;
  // /manga/<slug>/chapter-<n>
  if (segments.length === 3 && first !== 'chapter' && (MANGA_DIRS.has(first) || first === dirOf(site))) {
    return `${site.baseUrl}/${first}/${encodeURIComponent(second)}`;
  }
  // Manganato cũ: /manga-<id>/chapter-<n>, trang truyện cùng host với chương.
  if (segments.length === 2 && DETAIL_ID.test(first)) {
    return `${getOrigin(chapterUrl) || site.baseUrl}/${first}`;
  }
  // Mangakakalot cũ: /chapter/<id>/chapter_<n> → /manga/<id>
  if (first === 'chapter' && segments.length === 3 && /^chapter_/i.test(third)) {
    return `${site.baseUrl}/manga/${encodeURIComponent(second)}`;
  }
  if (html) {
    const crumb = breadcrumbManga(parseHtml(html), chapterUrl);
    if (crumb) {
      return crumb;
    }
  }
  // manganelo.cc: /chapter/<id>/<slug>-<số chương> → /<thư mục>/<slug>; chỉ
  // đoán khi đã biết thư mục truyện của site (siteProbe điền sẵn).
  const slug = third.match(/^(.+)-\d+(?:\.\d+)?$/)?.[1];
  if (first === 'chapter' && segments.length === 3 && slug && site.options?.mangaDir) {
    return `${site.baseUrl}/${site.options.mangaDir}/${encodeURIComponent(slug)}`;
  }
  return html ? undefined : breadcrumbManga(parseHtml(await getText(chapterUrl)), chapterUrl);
}

// ─── Các hàm của addon ──────────────────────────────────────────────────────

/** Cần biết đời site (đọc trang chủ một lần) mới dựng được URL. */
export async function getURL({ site, params }: GetURLInput): Promise<string> {
  const { layout } = await siteInfo(site);
  switch (params.method) {
    case 'list':
      // Không có trang danh sách cho kiểu sắp xếp này: trang chủ (khối POPULAR MANGA).
      return listUrl(site.baseUrl, layout, params.sort, params.page) ?? `${site.baseUrl}/`;
    case 'search': {
      const slug = searchSlug(params.query);
      if (!slug) {
        // Từ khoá rỗng: danh sách mới cập nhật.
        return getURL({ site, params: { method: 'list', sort: 'latest', page: params.page } });
      }
      return withQuery(`${site.baseUrl}/search/story/${encodeURIComponent(slug)}`, pageQuery(layout, params.page));
    }
    case 'genre':
      return genreUrl(site.baseUrl, layout, params.genre.id, params.sort, params.page);
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
      return { widget: 'chapter', chapters: await chaptersOf(site, mangaUrl, page, parseHtml(page)) };
    }
    case 'manga':
      return { widget: 'manga', url: url ? await resolveMangaUrl(site, url, html) : undefined };
  }
}

export function match({ site, url, html }: MatchInput): UrlKind | null {
  const segments = pathSegments(url);
  const first = segments[0] ?? '';
  if (!segments.length || LIST_PATHS.test(first)) {
    return 'list';
  }
  if (first === 'chapter') {
    return 'chapter';
  }
  if (MANGA_DIRS.has(first.toLowerCase()) || first === dirOf(site)) {
    if (segments.length === 1) {
      return 'list';
    }
    return segments.length === 2 ? 'detail' : 'chapter';
  }
  if (DETAIL_ID.test(first)) {
    return segments.length === 1 ? 'detail' : 'chapter';
  }
  if (html) {
    if (html.includes('container-chapter-reader') || /\bchapterImages\s*=/.test(html)) {
      return 'chapter';
    }
    if (html.includes('manga-info-top') || html.includes('panel-story-info')) {
      return 'detail';
    }
    if (/list-truyen-item-wrap|list-comic-item-wrap|story_item|content-genres-item/.test(html)) {
      return 'list';
    }
  }
  return null;
}

export function detect(html: string): boolean {
  return /class="(?:[^"]*\s)?(?:itemupdate|list-truyen-item-wrap|list-comic-item-wrap|content-homepage-item|panel-content-homepage|story_item|xem-nhieu-item)[\s"]|_base_url_search|id="contentstory"/.test(
    html,
  );
}

export function imageHeaders(site: SourceConfig): Record<string, string> {
  // CDN (2xstorage…) chặn khi thiếu Referer hoặc Referer khác domain site.
  return refererHeaders(site);
}
