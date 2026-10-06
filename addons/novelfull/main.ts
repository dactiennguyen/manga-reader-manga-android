import type { Cheerio, CheerioAPI } from 'cheerio/slim';
import type { AnyNode } from 'domhandler';

import {
  cleanText,
  getHost,
  getPath,
  getQueryParam,
  getText,
  imageSrc,
  mapLimit,
  paragraphsOf,
  parseChapterNumber,
  parseHtml,
  pathSegments,
  refererHeaders,
  request,
  resolveUrl,
  runFromHtml,
  textOf,
  trimTrailingSlash,
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


type ListKind = 'latest' | 'popular' | 'new' | 'hot' | 'completed';

type SearchForm = { action: string; method: 'GET' | 'POST'; param: string };

type SiteMap = {
  lists: Partial<Record<ListKind, string>>;
  genres: Genre[];
  search?: SearchForm;
};

const LIST_RULES: { kind: ListKind; path: RegExp; text: RegExp }[] = [
  {
    kind: 'new',
    path: /new-novels?\b|newest|latest-novels?\/?$|novelbin-new/,
    text: /^(new(ly)? (added|novels?)|newest)/,
  },
  {
    kind: 'latest',
    path: /latest-release|daily-update|sort\/latest|\/latest\/?$/,
    text: /latest (release|update)|daily update/,
  },
  { kind: 'popular', path: /most-popular|top-view|novelbin-popular|\/popular\/?$/, text: /most popular|top view/ },
  { kind: 'hot', path: /hot-novel|top-hot|novelbin-hot|\/hot\/?$/, text: /^hot\b/ },
  { kind: 'completed', path: /completed/, text: /^completed/ },
];

const SORT_FALLBACK: Record<ListSort, ListKind[]> = {
  latest: ['latest', 'new', 'hot'],
  popular: ['popular', 'hot', 'latest'],
  new: ['new', 'latest'],
  rating: ['hot', 'popular', 'latest'],
  az: ['latest'],
};

const LIST_SEGMENTS =
  /^(genres?|novelbin-genres?|sort|list|novel-list|search|author|authors|a|tag|tags|status|latest-release-novels?|most-popular(-novels?)?|hot-novels?|completed-novels?|new-novels?|latest-novels?|history|ranking)$/i;

const DETAIL_DIRS = new Set(['b', 'book', 'novel', 'novels', 'novel-book', 'n', 'series']);

const GENRE_PATH = /^\/(?:genres?|novelbin-genres?|category)\/[^/]+\/?$/i;

const NSFW_GENRES = /adult|mature|smut|hentai|ecchi|18\+|erotic/i;

const BOILERPLATE = [
  /please let us know\s*<\s*report chapter\s*>/i,
  /^tip: you can use left, right/i,
  /^(advertisement|sponsored content)$/i,
  /\b(?:visit|read|find|updated|latest chapters?|source)\b[^.]{0,60}\b[\w-]+\s*(?:\.|\(\s*dot\s*\)|\bdot\b)\s*(?:com|net|org|me|app|io|co)\b/i,
];

const SITE_NAMES = [
  'novelbin',
  'novelfull',
  'readnovelfull',
  'freewebnovel',
  'novellive',
  'lightnovelpub',
  'libread',
  'allnovelupdates',
  'allnovel',
  'novgo',
  'novelphoenix',
  'novelnext',
];

const COMMON_HOSTS = new Set([
  'novel',
  'novels',
  'books',
  'book',
  'reader',
  'read',
  'light',
  'webnovel',
  'story',
  'stories',
]);

const sites = new Map<string, Promise<SiteMap>>();
const pagers = new Map<string, (page: number) => string>();

function sameSite(url: string, base: string): boolean {
  return getHost(url) === getHost(base);
}

function listKindOf(path: string, text: string): ListKind | undefined {
  const p = path.toLowerCase();
  const t = text.toLowerCase();
  return LIST_RULES.find(rule => rule.path.test(p) || rule.text.test(t))?.kind;
}

function genreName(text: string): string {
  return cleanText(text)
    .replace(/\s+novels?$/i, '')
    .replace(/\s*\(\d+\)$/, '');
}

function genresIn($: CheerioAPI, base: string): Genre[] {
  return uniqBy(
    $('a[href]')
      .toArray()
      .map(el => {
        const href = resolveUrl($(el).attr('href'), `${base}/`);
        const path = getPath(href);
        return {
          id: sameSite(href, base) && GENRE_PATH.test(path) ? path : '',
          name: genreName($(el).text()) || genreName($(el).attr('title') ?? ''),
        };
      })
      .filter(g => g.id && g.name && g.name.toLowerCase() !== 'all' && g.name.length < 40),
    g => g.id.toLowerCase().replace(/\/+$/, ''),
  ).sort((a, b) => a.name.localeCompare(b.name));
}

function searchFormIn($: CheerioAPI, base: string): SearchForm | undefined {
  for (const el of $('form').toArray()) {
    const $form = $(el);
    const $input = $form
      .find('input[name="keyword"], input[name="searchkey"], input[name="q"], input[name="s"]')
      .first();
    const param = $input.attr('name');
    if (!param) {
      continue;
    }
    return {
      action: resolveUrl($form.attr('action') || '/search', `${base}/`),
      method: /post/i.test($form.attr('method') ?? '') ? 'POST' : 'GET',
      param,
    };
  }
  return undefined;
}

function siteMap(src: SourceConfig): Promise<SiteMap> {
  const cached = sites.get(src.baseUrl);
  if (cached) {
    return cached;
  }
  const info = getText(`${src.baseUrl}/`).then(html => {
    const $ = parseHtml(html);
    const lists: SiteMap['lists'] = {};
    $('a[href]').each((_, el) => {
      const href = resolveUrl($(el).attr('href'), `${src.baseUrl}/`);
      const path = getPath(href);
      if (
        !sameSite(href, src.baseUrl) ||
        (/\.html?$/i.test(path) && !/\/index(?:_\d+)?\.html?$/i.test(path)) ||
        GENRE_PATH.test(path) ||
        DETAIL_DIRS.has(pathSegments(href)[0]?.toLowerCase() ?? '')
      ) {
        return;
      }
      const kind = listKindOf(path, cleanText($(el).text()) || cleanText($(el).attr('title')));
      if (kind && !lists[kind]) {
        lists[kind] = href.split('#')[0];
      }
    });
    return { lists, genres: genresIn($, src.baseUrl), search: searchFormIn($, src.baseUrl) };
  });
  sites.set(src.baseUrl, info);
  info.catch(() => sites.delete(src.baseUrl));
  return info;
}

async function searchFormOf(src: SourceConfig): Promise<SearchForm> {
  return (
    (await siteMap(src)).search ?? {
      action: `${src.baseUrl}/search`,
      method: 'GET',
      param: 'keyword',
    }
  );
}

function pageNumberOf(href: string | undefined, text: string): number | undefined {
  const url = href ?? '';
  const raw =
    getQueryParam(url, 'page') ??
    getPath(url).match(/index_(\d+)\.html?$/i)?.[1] ??
    getPath(url).match(/\/(\d+)\/?$/)?.[1] ??
    cleanText(text).match(/^\d+$/)?.[0];
  const value = Number(raw);
  return raw && Number.isFinite(value) && value > 0 ? value : undefined;
}

function pagerLinks($: CheerioAPI): Cheerio<AnyNode> {
  return $('.pagination a[href], .pages a[href], .paginator a[href], nav[aria-label="Pagination"] a[href]').not(
    '#list-chapter a',
  );
}

function hasNextPage($: CheerioAPI, page: number): boolean {
  return pagerLinks($)
    .toArray()
    .some(el => (pageNumberOf($(el).attr('href'), $(el).text()) ?? 0) > page);
}

function learnPager($: CheerioAPI, firstUrl: string): ((page: number) => string) | undefined {
  const link = pagerLinks($)
    .toArray()
    .map(el => resolveUrl($(el).attr('href'), firstUrl))
    .find(href => pageNumberOf(href, '') === 2);
  if (!link) {
    return undefined;
  }
  if (getQueryParam(link, 'page') === '2') {
    return page => link.replace(/([?&]page=)2(?=&|#|$)/, `$1${page}`);
  }
  if (/index_2\.html?$/i.test(getPath(link))) {
    return page => link.replace(/index_2(\.html?)/i, `index_${page}$1`);
  }
  return page => link.replace(/\/2(\/?)(?=$|[?#])/, `/${page}$1`);
}

async function pageUrl(firstUrl: string, page: number): Promise<string> {
  if (page <= 1) {
    return firstUrl;
  }
  let pager = pagers.get(firstUrl);
  if (!pager) {
    pager = learnPager(parseHtml(await getText(firstUrl)), firstUrl) ?? (n => withQuery(firstUrl, { page: n }));
    pagers.set(firstUrl, pager);
  }
  return pager(page);
}

const ITEM_SELECTORS = [
  '.li-row .li',
  '.ul-list1 .li',
  '.list-novel .row',
  '.list-truyen .row',
  '.col-novel-main .row',
  '.col-truyen-main .row',
  '.list-novel .thumbnail',
];

function parseItems($: CheerioAPI, base: string): MangaItem[] {
  const items: MangaItem[] = [];
  $(ITEM_SELECTORS.join(', ')).each((_, el) => {
    const $el = $(el);
    if ($el.closest('.list-side, .list-genre, .list-history').length) {
      return;
    }
    const $a = $el.find('.tit a, .novel-title a, .truyen-title a');
    if ($a.length > 1) {
      return;
    }
    const $link = $a.length ? $a : $el.is('.thumbnail') ? $el.find('a[href]').first() : $a;
    const href = $link.attr('href');
    const title =
      cleanText($a.text()) ||
      cleanText($link.attr('title')) ||
      textOf($el.find('.title-home-novel')) ||
      cleanText($el.find('img').attr('alt'));
    if (!href || !title) {
      return;
    }
    items.push({
      url: resolveUrl(href, `${base}/`),
      title,
      cover: imageSrc($el.find('img'), `${base}/`),
      subtitle:
        textOf($el.find('a.chapter .s1, .text-info a, .chapter-title, .chr-text, .item-1 a')) ||
        textOf($el.find('.author')) ||
        undefined,
    });
  });
  return uniqBy(items, item => item.url);
}

async function fetchListing(src: SourceConfig, url: string, page: number): Promise<ListPage> {
  const $ = parseHtml(await getText(url));
  if (page === 1 && !pagers.has(url)) {
    const pager = learnPager($, url);
    if (pager) {
      pagers.set(url, pager);
    }
  }
  return { items: parseItems($, src.baseUrl), hasNext: hasNextPage($, page) };
}

type InfoRow = { label: string; $value: Cheerio<AnyNode> };

function infoRows($: CheerioAPI): InfoRow[] {
  const rows: InfoRow[] = [];
  $('.info > div, ul.info > li, .info-meta > li, .list-info > li').each((_, el) => {
    const $row = $(el).clone();
    const $label = $row.find('h3, strong').first();
    const label = cleanText($label.text()).toLowerCase();
    if (label) {
      $label.remove();
      rows.push({ label, $value: $row });
    }
  });
  $('.m-imgtxt .txt .item, .m-info .txt .item').each((_, el) => {
    const label = cleanText($(el).find('[title]').first().attr('title')).toLowerCase();
    if (label) {
      rows.push({ label, $value: $(el).find('.right').first() });
    }
  });
  return rows;
}

function rowLinks($: CheerioAPI, row: InfoRow | undefined): string[] {
  if (!row) {
    return [];
  }
  const $links = row.$value.find('a');
  const values = $links.length
    ? $links.toArray().map(el => cleanText($(el).text()))
    : cleanText(row.$value.text()).split(/\s*[,;]\s*/);
  return uniqBy(values.filter(Boolean), v => v);
}

function ratingOf($: CheerioAPI): number | undefined {
  const avg = parseFloat($('#novel-score').attr('data-avg') ?? '');
  if (Number.isFinite(avg) && avg > 0) {
    return Math.round(avg * 100) / 100;
  }
  const best = parseFloat(textOf($('[itemprop="bestRating"]'))) || 10;
  const schema = parseFloat(textOf($('[itemprop="ratingValue"]')) || ($('#rateVal').attr('value') ?? ''));
  if (Number.isFinite(schema) && schema > 0) {
    return Math.round((schema / best) * 500) / 100;
  }
  const vote = $('.score .vote, .vote-summary')
    .toArray()
    .map(el => cleanText($(el).text()).match(/([\d.]+)\s*\/\s*(\d+)/))
    .find(Boolean);
  if (vote) {
    const value = (parseFloat(vote[1]) / parseFloat(vote[2])) * 5;
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : undefined;
  }
  return undefined;
}

function descriptionOf($: CheerioAPI): string | undefined {
  const $desc = $('.desc-text, #novel-summary-inner, .m-desc .txt .inner, .des-novel').first();
  if (!$desc.length) {
    return cleanText($('meta[property="og:description"], meta[name="description"]').attr('content')) || undefined;
  }
  const $copy = $desc.clone();
  $copy.find('script, style').remove();
  $copy.find('br').replaceWith('\n');
  const $p = $copy.find('p');
  const blocks = $p.length ? $p.toArray().map(el => $(el).text()) : [$copy.text()];
  return (
    blocks
      .flatMap(block => block.split('\n'))
      .map(cleanText)
      .filter(Boolean)
      .join('\n\n') || undefined
  );
}

function novelIdOf($: CheerioAPI, url: string): string | undefined {
  const fromPage =
    $('#rating[data-novel-id]').attr('data-novel-id') ||
    $('[data-novel-id]').first().attr('data-novel-id') ||
    $('#indexselect').attr('novel-id');
  if (fromPage) {
    return fromPage;
  }
  const last = pathSegments(url).pop();
  return last?.replace(/\.html?$/i, '') || undefined;
}

function chapterOf(href: string | undefined, name: string, base: string): Chapter {
  return { url: resolveUrl(href, `${base}/`), name, number: parseChapterNumber(name) };
}

function chaptersFromLinks($: CheerioAPI, scope: string, base: string): Chapter[] {
  return $(scope)
    .toArray()
    .map(el => {
      const $a = $(el);
      const name =
        textOf($a.find('.nchr-text, .chapter-text, .chapter-title')) ||
        cleanText($a.text()) ||
        cleanText($a.attr('title'));
      return chapterOf($a.attr('href'), name, base);
    })
    .filter(ch => ch.url && ch.name);
}

const CONTENT_SELECTORS = [
  '#chr-content',
  '#chapter-content',
  '.chapter-c',
  '.chr-c',
  '#article',
  '.m-read .txt',
  '.des_novel',
  '.reading-content',
];

const INLINE_CHAPTERS =
  '#list-chapter .list-chapter li a, #chapter-archive .list-chapter li a, .m-newest2 .ul-list5 li a, #idData li a, .list-page-novel tr a';

async function chaptersFromApi(src: SourceConfig, url: string, html: string, $: CheerioAPI): Promise<Chapter[]> {
  const base = src.baseUrl;
  const id = novelIdOf($, url);
  if (!id) {
    return [];
  }
  const tries: { when: boolean; run: () => Promise<Chapter[]> }[] = [
    {
      when: /ajax-chapter-option/.test(html) || /^\d+$/.test(id),
      run: async () => {
        const res = await getText(withQuery(`${base}/ajax-chapter-option`, { novelId: id }), {
          ajax: true,
          referer: url,
        });
        const $s = parseHtml(res);
        return $s('option')
          .toArray()
          .map(el => chapterOf($s(el).attr('value'), cleanText($s(el).text()), base))
          .filter(ch => ch.url && ch.name);
      },
    },
    {
      when: /chapter-archive/.test(html) || (!/^\d+$/.test(id) && !/id="indexselect"/.test(html)),
      run: async () => {
        const res = await getText(withQuery(`${base}/ajax/chapter-archive`, { novelId: id }), {
          ajax: true,
          referer: url,
        });
        return chaptersFromLinks(parseHtml(res), 'ul.list-chapter li a', base);
      },
    },
    {
      when: /get-list-chapter|id="indexselect"/.test(html),
      run: async () => {
        const res = await getText(withQuery(`${base}/ajax/get-list-chapter`, { novel_id: id }), {
          ajax: true,
          referer: url,
        });
        const data = JSON.parse(res) as { chapters?: { chapter_id?: string | number; chapter_name?: string }[] };
        const detail = trimTrailingSlash(url);
        return (data.chapters ?? [])
          .filter(ch => ch.chapter_id !== undefined && ch.chapter_name)
          .map(ch => chapterOf(`${detail}/${ch.chapter_id}`, cleanText(ch.chapter_name), base));
      },
    },
  ];
  for (const attempt of tries.filter(t => t.when)) {
    try {
      const chapters = await attempt.run();
      if (chapters.length) {
        return chapters;
      }
    } catch {
    }
  }
  return [];
}

async function chaptersFromPages(src: SourceConfig, url: string, $: CheerioAPI): Promise<Chapter[]> {
  const first = chaptersFromLinks($, INLINE_CHAPTERS, src.baseUrl);
  const optionPages = $('#indexselect option')
    .toArray()
    .map(el => Number($(el).attr('value')))
    .filter(n => Number.isFinite(n));
  const linkPages = $('#list-chapter .pagination a[href], .m-newest2 .page a[href], .m-newest2 .pages a[href]')
    .toArray()
    .map(el =>
      Number(
        getQueryParam($(el).attr('href') ?? '', 'page') ?? getPath($(el).attr('href') ?? '').match(/\/(\d+)\/?$/)?.[1],
      ),
    )
    .filter(n => Number.isFinite(n));
  const last = Math.min(Math.max(1, ...optionPages, ...linkPages), 200);
  if (last <= 1) {
    return first;
  }
  const detail = trimTrailingSlash(url.split(/[?#]/)[0]);
  const byPath = optionPages.length > 0 || /\/\d+\/?$/.test($('.m-newest2 .page a[href]').last().attr('href') ?? '');
  const pages = Array.from({ length: last - 1 }, (_, i) => i + 2);
  const rest = await mapLimit(pages, 4, async page => {
    const pageLink = byPath ? `${detail}/${page}` : withQuery(detail, { page });
    try {
      return chaptersFromLinks(parseHtml(await getText(pageLink, { referer: url })), INLINE_CHAPTERS, src.baseUrl);
    } catch {
      return [];
    }
  });
  return [...first, ...rest.flat()];
}

async function chaptersOf(src: SourceConfig, url: string, html: string, $: CheerioAPI): Promise<Chapter[]> {
  let chapters = await chaptersFromApi(src, url, html, $);
  if (!chapters.length) {
    chapters = await chaptersFromPages(src, url, $);
  }
  return uniqBy(chapters, ch => ch.url).reverse();
}

function cleanParagraphs(paragraphs: string[], src: SourceConfig): string[] {
  const host = getHost(src.baseUrl)
    .split('.')[0]
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
  const names = host.length >= 5 && !COMMON_HOSTS.has(host) ? [...SITE_NAMES, host] : SITE_NAMES;
  return paragraphs.filter(text => {
    if (text.length > 250) {
      return true;
    }
    const squashed = text.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (names.some(name => squashed.includes(name))) {
      return false;
    }
    return !BOILERPLATE.some(re => re.test(text));
  });
}


async function loadList(site: SourceConfig, url: string, params?: ListParams): Promise<ListPage> {
  if (params?.method === 'search') {
    const form = await searchFormOf(site);
    if (form.method === 'POST') {
      if (params.page > 1) {
        return { items: [], hasNext: false };
      }
      const { text } = await request(url, { form: { [form.param]: params.query } });
      return { items: parseItems(parseHtml(text), site.baseUrl), hasNext: false };
    }
    const $ = parseHtml(await getText(url));
    return { items: parseItems($, site.baseUrl), hasNext: hasNextPage($, params.page) };
  }
  return fetchListing(site, url, params?.page ?? pageNumberOf(url, '') ?? 1);
}

async function loadDetail(site: SourceConfig, url: string): Promise<MangaDetail> {
  const html = await getText(url);
  const $ = parseHtml(html);
  const base = site.baseUrl;
  const rows = infoRows($);
  const find = (pattern: RegExp) => rows.find(row => pattern.test(row.label));

  const genreRow = find(/genre|thể loại|category/);
  const genres = uniqBy(
    (genreRow?.$value.find('a').toArray() ?? [])
      .map(el => {
        const href = resolveUrl($(el).attr('href'), `${base}/`);
        return { id: getPath(href), name: genreName($(el).text()) };
      })
      .filter(g => g.name),
    g => g.id || g.name,
  );
  const titleText =
    textOf($('.m-desc h1.tit, .m-info h1')) ||
    textOf($('.col-info-desc .desc h3.title, .books .title, h3.title')) ||
    textOf($('.detail-novel h1, h1')) ||
    cleanText($('meta[property="og:title"]').attr('content'));
  const altRow = find(/alternative|other name|tên khác/);
  const altTitles = altRow
    ? cleanText(altRow.$value.text())
        .split(/\s*[;,]\s*/)
        .filter(t => t && t !== titleText)
    : [];

  const chapters = await chaptersOf(site, url, html, $);

  return {
    url,
    title: titleText,
    altTitles: altTitles.length ? altTitles : undefined,
    cover:
      imageSrc($('.m-imgtxt .pic img, .book img, .info-holder img, .detail-novel img'), `${base}/`) ||
      $('meta[property="og:image"]').attr('content'),
    description: descriptionOf($),
    status: rowLinks($, find(/status|trạng thái/))[0],
    authors: rowLinks($, find(/author|tác giả/)),
    genres,
    rating: ratingOf($),
    views: rowLinks($, find(/view|lượt xem/))[0],
    chapters,
    nsfw: genres.some(g => NSFW_GENRES.test(g.name)),
  };
}

async function loadChapter(site: SourceConfig, url: string): Promise<ChapterContent> {
  const $ = parseHtml(await getText(url, { referer: `${site.baseUrl}/` }));
  const selector = CONTENT_SELECTORS.find(sel => $(sel).length);
  const $root = selector ? $(selector).first().clone() : undefined;
  if (!$root) {
    throw new Error('Không tìm thấy nội dung chương này.');
  }
  $root
    .find(
      '[id^="pf-"], [class^="ad-"], [class*=" ad-"], .ads, .ad, [hidden], [style*="display:none"], [style*="display: none"], .hidden, .chapter-nav, .nav-chapter',
    )
    .remove();
  const paragraphs = cleanParagraphs(paragraphsOf($, $root), site);
  if (!paragraphs.length) {
    throw new Error('Chương này không có nội dung chữ.');
  }
  const title =
    textOf($('.chr-title .chr-text, .chr-title')) ||
    textOf($('h1.chapter .chapter-text, .top h1, .title-chapter-novel, .chapter-title')) ||
    textOf($('.navbar-breadcrumb a, .breadcrumb li').last()) ||
    undefined;
  return { kind: 'text', title, paragraphs };
}

async function resolveMangaUrl(site: SourceConfig, chapterUrl: string, html?: string): Promise<string | undefined> {
  const segments = pathSegments(chapterUrl);
  const enc = (parts: string[]) => parts.map(encodeURIComponent).join('/');
  if (segments.length === 3 && DETAIL_DIRS.has(segments[0].toLowerCase())) {
    return `${site.baseUrl}/${enc(segments.slice(0, 2))}`;
  }
  if (segments.length === 2 && /\.html?$/i.test(segments[1]) && !LIST_SEGMENTS.test(segments[0])) {
    return `${site.baseUrl}/${enc([segments[0]])}.html`;
  }
  const $ = parseHtml(html ?? (await getText(chapterUrl)));
  const href =
    $('a.truyen-title, a.novel-title, .top .tit a, .m-read h2.tit a').first().attr('href') ||
    $('.fb-like').attr('data-href') ||
    $('.navbar-breadcrumb a, .breadcrumb li a').eq(1).attr('href');
  return href ? resolveUrl(href, `${site.baseUrl}/`) : undefined;
}


export async function getURL({ site, params }: GetURLInput): Promise<string> {
  switch (params.method) {
    case 'list': {
      const { lists } = await siteMap(site);
      const kind = SORT_FALLBACK[params.sort].find(k => lists[k]);
      const firstUrl = kind ? lists[kind]! : `${site.baseUrl}/latest-release-novel`;
      return pageUrl(firstUrl, params.page);
    }
    case 'search': {
      const form = await searchFormOf(site);
      if (form.method === 'POST') {
        return form.action;
      }
      return withQuery(form.action, { [form.param]: params.query, page: params.page > 1 ? params.page : undefined });
    }
    case 'genre':
      return pageUrl(resolveUrl(params.genre.id.replace(/ /g, '%20'), `${site.baseUrl}/`), params.page);
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
      return { widget: 'genre', genres: (await siteMap(site)).genres };
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
  if (['keyword', 'searchkey'].some(key => getQueryParam(url, key) !== undefined)) {
    return 'list';
  }
  const segments = pathSegments(url);
  if (!segments.length || LIST_SEGMENTS.test(segments[0])) {
    return 'list';
  }
  const dir = segments[0].toLowerCase();
  const last = segments[segments.length - 1];
  const isHtml = /\.html?$/i.test(last);
  if ((DETAIL_DIRS.has(dir) || (!isHtml && dir === site.options?.mangaDir)) && segments.length <= 3) {
    if (segments.length === 2) {
      return 'detail';
    }
    if (segments.length === 3) {
      return /^\d+$/.test(segments[2]) ? 'detail' : 'chapter';
    }
  }
  if (isHtml && segments.length <= 2) {
    if (segments.length === 2) {
      return 'chapter';
    }
    if (!html || /id="list-chapter"|class="m-info"|col-info-desc/.test(html)) {
      return 'detail';
    }
  }
  if (html) {
    if (/id="(?:chr-content|chapter-content)"|class="m-read/.test(html)) {
      return 'chapter';
    }
    if (/id="list-chapter"|class="m-info"|col-info-desc/.test(html)) {
      return 'detail';
    }
    if (/class="(?:li-row|list list-novel|list list-truyen)/.test(html)) {
      return 'list';
    }
  }
  return null;
}

export function detect(html: string): boolean {
  return /class="(?:[^"]*\s)?(?:col-novel-main|col-truyen-main|list-truyen|truyen-title|novel-title|li-row|ul-list1|m-newest2|m-imgtxt)(?=[\s"])|ajax-chapter-option|ajax\/chapter-archive|get-list-chapter|id="chr-content"/.test(
    html,
  );
}

export function imageHeaders(site: SourceConfig): Record<string, string> {
  return refererHeaders(site);
}
