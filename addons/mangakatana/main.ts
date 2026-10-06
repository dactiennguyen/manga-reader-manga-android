import type { Cheerio, CheerioAPI } from 'cheerio/slim';
import type { AnyNode } from 'domhandler';

import {
  cleanText,
  getQueryParam,
  HttpError,
  imageSrc,
  parseChapterNumber,
  parseDate,
  parseHtml,
  pathSegments,
  refererHeaders,
  request,
  resolveUrl,
  runFromHtml,
  sleep,
  sourcesRuntime,
  textOf,
  uniqBy,
  withQuery,
} from '../../src/addons/sdk';
import type { RequestOptions } from '../../src/addons/sdk';
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


const ORDER: Partial<Record<ListSort, string>> = {
  latest: 'latest',
  new: 'new',
  az: 'az',
};

const NSFW_SLUGS = ['adult', 'erotica', 'loli', 'shota', 'sexual-violence'];
const NSFW_GENRES = /adult|erotica|hentai|smut|loli|shota|sexual.violence/i;

const RETRY_DELAYS = [1500, 3000, 4000];

async function load(url: string, options?: RequestOptions): Promise<{ url: string; text: string }> {
  for (let attempt = 0; ; attempt++) {
    const res = await request(url, options);
    if (res.text.trim()) {
      return res;
    }
    if (attempt >= RETRY_DELAYS.length) {
      throw new HttpError('MangaKatana không trả về dữ liệu. Thử lại sau ít phút.', res.status, url);
    }
    await sleep(RETRY_DELAYS[attempt]);
  }
}

function excludeParam(keep?: string): string | undefined {
  if (sourcesRuntime().allowNsfw) {
    return undefined;
  }
  return NSFW_SLUGS.filter(slug => slug !== keep).join('_');
}

function genreSlug(href: string | undefined): string {
  const segments = pathSegments(href ?? '');
  const index = segments.indexOf('genre');
  return index >= 0 ? segments[index + 1] ?? '' : '';
}

function parseItems($: CheerioAPI, $items: Cheerio<AnyNode>, base: string): MangaItem[] {
  return uniqBy(
    $items
      .toArray()
      .map(el => {
        const $el = $(el);
        const $a = $el.find('h3.title a, .title a').first();
        return {
          url: resolveUrl($a.attr('href'), base),
          title: cleanText($a.text()),
          cover: imageSrc($el.find('.wrap_img img, img').first(), base),
          subtitle: textOf($el.find('.chapters .chapter a, .chapter a')) || undefined,
        };
      })
      .filter(item => item.url && item.title),
    item => item.url,
  );
}

function parseListing(html: string, base: string): ListPage {
  const $ = parseHtml(html);
  const items = parseItems($, $('#book_list > .item, #book_list .item'), base);
  return { items, hasNext: $('.uk-pagination a.next').length > 0 };
}

async function fetchListing(url: string, page: number): Promise<ListPage> {
  try {
    const { text, url: finalUrl } = await load(url);
    return parseListing(text, finalUrl);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404 && page > 1) {
      return { items: [], hasNext: false };
    }
    throw error;
  }
}

function filterUrl(src: SourceConfig, sort: ListSort, page: number, include?: string): string {
  return withQuery(`${src.baseUrl}/manga/page/${Math.max(page, 1)}`, {
    filter: 1,
    include,
    chapters: 1,
    order: ORDER[sort] ?? 'latest',
    exclude: excludeParam(include),
  });
}

function pageOf(url: string): number {
  const segments = pathSegments(url);
  const index = segments.indexOf('page');
  return (index >= 0 && Number(segments[index + 1])) || 1;
}

function mangaUrlOf(src: SourceConfig, chapterUrl: string): string | undefined {
  const segments = pathSegments(chapterUrl);
  if (segments[0] === 'manga' && segments.length >= 3 && /\.\d+$/.test(segments[1])) {
    return `${src.baseUrl}/manga/${encodeURIComponent(segments[1])}`;
  }
  return undefined;
}

function detailItem($: CheerioAPI, url: string, base: string): MangaItem {
  return {
    url: $('meta[property="og:url"]').attr('content') || $('link[rel="canonical"]').attr('href') || url,
    title: textOf($('#single_book h1.heading')) || cleanText($('meta[property="og:title"]').attr('content')),
    cover: imageSrc($('#single_book .cover img'), base),
    subtitle: textOf($('#single_book .new_chap')) || undefined,
  };
}

function parseChapters($: CheerioAPI, base: string): Chapter[] {
  return uniqBy(
    $('div.chapters tr')
      .toArray()
      .map(el => {
        const $el = $(el);
        const $a = $el.find('.chapter a').first();
        const url = resolveUrl($a.attr('href'), base);
        const name = cleanText($a.text());
        const date = textOf($el.find('.update_time'));
        const fromUrl = url.match(/\/(?:v\d+)?c(\d+(?:\.\d+)?)$/)?.[1];
        return {
          url,
          name,
          date: date || undefined,
          time: parseDate(date),
          number: parseChapterNumber(name) ?? (fromUrl ? Number(fromUrl) : undefined),
        };
      })
      .filter(ch => ch.url && ch.name),
    ch => ch.url,
  );
}

function pageUrls(html: string, expected: number): string[] {
  const arrays = new Map<string, string[]>();
  const declaration = /var\s+(\w+)\s*=\s*\[([^\]]*)\]/g;
  for (let m = declaration.exec(html); m; m = declaration.exec(html)) {
    const urls: string[] = [];
    const literal = /(['"])(.*?)\1/g;
    for (let s = literal.exec(m[2]); s; s = literal.exec(m[2])) {
      const value = s[2].trim();
      if (/^(https?:)?\/\//.test(value)) {
        urls.push(value);
      }
    }
    if (urls.length) {
      arrays.set(m[1], urls);
    }
  }
  const used = html.match(/['"]data-src['"]\s*,\s*(\w+)\s*\[/)?.[1];
  const real = used ? arrays.get(used) : undefined;
  if (real) {
    return real;
  }
  const candidates = [...arrays.values()];
  return (
    candidates.find(list => expected > 0 && list.length === expected) ??
    candidates.sort((a, b) => b.length - a.length)[0] ??
    []
  );
}


async function loadHot(site: SourceConfig, page: number): Promise<ListPage> {
  if (page > 1) {
    return { items: [], hasNext: false };
  }
  const { text } = await load(`${site.baseUrl}/`);
  const $ = parseHtml(text);
  return { items: parseItems($, $('#hot_book .item'), site.baseUrl), hasNext: false };
}

async function loadSearch(site: SourceConfig, url: string): Promise<ListPage> {
  let res: { url: string; text: string };
  try {
    res = await load(url);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      return { items: [], hasNext: false };
    }
    throw error;
  }
  const $ = parseHtml(res.text);
  if ($('#single_book').length) {
    const item = detailItem($, res.url, site.baseUrl);
    return { items: item.title ? [item] : [], hasNext: false };
  }
  return parseListing(res.text, site.baseUrl);
}

async function loadList(site: SourceConfig, url: string, params?: ListParams): Promise<ListPage> {
  const page = params?.page ?? pageOf(url);
  if (getQueryParam(url, 'search') !== undefined) {
    return loadSearch(site, url);
  }
  if (!pathSegments(url).length) {
    return loadHot(site, page);
  }
  return fetchListing(url, page);
}

async function loadGenres(site: SourceConfig): Promise<Genre[]> {
  const { text } = await load(`${site.baseUrl}/genres`);
  const $ = parseHtml(text);
  const genres: Genre[] = $('a[href*="/genre/"]')
    .toArray()
    .map(el => ({
      id: genreSlug($(el).attr('href')),
      name: cleanText($(el).text()).replace(/\s*\(\d+\)$/, ''),
    }));
  return uniqBy(
    genres.filter(g => g.id && g.name),
    g => g.id,
  ).sort((a, b) => a.name.localeCompare(b.name));
}

async function loadDetail(site: SourceConfig, url: string): Promise<MangaDetail> {
  const { text } = await load(url);
  const $ = parseHtml(text);
  const base = site.baseUrl;
  const $book = $('#single_book');
  const title = textOf($book.find('h1.heading')) || cleanText($('meta[property="og:title"]').attr('content'));
  if (!$book.length || !title) {
    throw new Error('Không tìm thấy truyện trên MangaKatana.');
  }

  const genres = uniqBy(
    $book
      .find('.genres a')
      .toArray()
      .map(el => ({ id: genreSlug($(el).attr('href')), name: cleanText($(el).text()) }))
      .filter(g => g.id && g.name),
    g => g.id,
  );
  const alt = textOf($book.find('.alt_name'));
  const paragraphs = $book
    .find('.summary p')
    .toArray()
    .map(p => cleanText($(p).text()))
    .filter(Boolean);
  const similarWidget = $('.widget')
    .toArray()
    .find(el => /similar/i.test(textOf($(el).find('.widget-title'))));

  return {
    url,
    title,
    altTitles: alt ? alt.split(/\s*;\s*/).filter(Boolean) : undefined,
    cover: imageSrc($book.find('.cover img'), base) || $('meta[property="og:image"]').attr('content'),
    description: paragraphs.join('\n\n') || undefined,
    status: textOf($book.find('.value.status')) || undefined,
    authors: uniqBy(
      $book
        .find('.authors a')
        .toArray()
        .map(el => cleanText($(el).text()))
        .filter(Boolean),
      a => a,
    ),
    genres,
    chapters: parseChapters($, base),
    similar: similarWidget
      ? parseItems($, $(similarWidget).find('.item'), base).filter(item => item.url !== url)
      : undefined,
    nsfw: genres.some(g => NSFW_GENRES.test(g.name) || NSFW_SLUGS.includes(g.id)),
  };
}

async function loadChapter(site: SourceConfig, url: string): Promise<ChapterContent> {
  const { text } = await load(url, { referer: mangaUrlOf(site, url) });
  const $ = parseHtml(text);
  const expected = Number($('#imgs .wrap_img').first().attr('data-pages')) || $('#imgs .wrap_img').length;
  const pages = uniqBy(
    pageUrls(text, expected).map(u => resolveUrl(u, site.baseUrl)),
    u => u,
  );
  if (!pages.length) {
    throw new Error('Không tìm thấy ảnh trong chương này.');
  }
  const title =
    textOf($('.uk-breadcrumb li.uk-active')) || cleanText($('title').text()).split(/\s+-\s+/)[0] || undefined;
  const headers = imageHeaders(site);
  return { kind: 'images', title, pages: pages.map(uri => ({ uri, headers })) };
}

async function resolveMangaUrl(site: SourceConfig, chapterUrl: string, html?: string): Promise<string | undefined> {
  const derived = mangaUrlOf(site, chapterUrl);
  if (derived) {
    return derived;
  }
  const { text } = html ? { text: html } : await load(chapterUrl);
  const $ = parseHtml(text);
  const href =
    $('.uk-breadcrumb li:nth-child(2) a').first().attr('href') || text.match(/item_url\s*=\s*['"]([^'"]+)['"]/)?.[1];
  return href ? resolveUrl(href, site.baseUrl) : undefined;
}


export function getURL({ site, params }: GetURLInput): string {
  switch (params.method) {
    case 'list':
      return params.sort === 'popular' ? `${site.baseUrl}/` : filterUrl(site, params.sort, params.page);
    case 'search': {
      const text = params.query.trim();
      if (!text) {
        return filterUrl(site, 'latest', params.page);
      }
      return withQuery(`${site.baseUrl}/page/${Math.max(params.page, 1)}`, { search: text, search_by: 'm_name' });
    }
    case 'genre':
      return filterUrl(site, params.sort === 'popular' ? 'latest' : params.sort, params.page, params.genre.id);
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
      const $ = parseHtml(html ?? (await load(url ?? '')).text);
      return { widget: 'chapter', chapters: parseChapters($, site.baseUrl) };
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
    case 'manga':
      if (segments.length === 1 || segments[1] === 'page') {
        return 'list';
      }
      if (!/\.\d+$/.test(segments[1])) {
        return null;
      }
      if (segments.length === 2) {
        return 'detail';
      }
      return segments[2] === 'download' ? null : 'chapter';
    case 'latest':
    case 'new-manga':
    case 'genre':
    case 'genres':
    case 'author':
    case 'page':
      return 'list';
    default:
      return null;
  }
}

export function imageHeaders(site: SourceConfig): Record<string, string> {
  return refererHeaders(site);
}
