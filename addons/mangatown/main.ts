import type { Cheerio, CheerioAPI } from 'cheerio/slim';
import type { AnyNode } from 'domhandler';

import {
  cleanText,
  getHost,
  getText,
  imageSrc,
  mapLimit,
  parseDate,
  parseHtml,
  pathSegments,
  refererHeaders,
  resolveUrl,
  runFromHtml,
  textOf,
  uniqBy,
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


const ORDER: Partial<Record<ListSort, string>> = {
  latest: 'last_chapter_time.za',
  popular: 'views.za',
  rating: 'rating.za',
  az: 'name.az',
};

const ALL = '0-0-0-0-0-0';

const LIST_ROOTS = new Set(['directory', 'latest', 'hot', 'search', 'completed', 'new']);

const CHAPTER_SEGMENT = /^c\d+(?:\.\d+)?$/i;

const NSFW_GENRES = /adult|mature|smut|hentai|ecchi|lolicon|shotacon/i;

const PAGE_CONCURRENCY = 4;

const mangaUrl = (src: SourceConfig, slug: string) => `${src.baseUrl}/manga/${encodeURIComponent(slug)}`;

function slugOf(url: string): string | undefined {
  const [root, slug] = pathSegments(url);
  return root === 'manga' && slug ? slug : undefined;
}

function chapterPath(url: string): { slug: string; parts: string[] } | undefined {
  const slug = slugOf(url);
  if (!slug) {
    return undefined;
  }
  const rest = pathSegments(url).slice(2);
  const index = rest.findIndex(s => CHAPTER_SEGMENT.test(s));
  return index >= 0 ? { slug, parts: rest.slice(0, index + 1) } : undefined;
}

function chapterBase(src: SourceConfig, url: string): string | undefined {
  const path = chapterPath(url);
  return path ? `${src.baseUrl}/manga/${encodeURIComponent(path.slug)}/${path.parts.join('/')}/` : undefined;
}

function genreFilter(href: string | undefined): string | undefined {
  const [root, filter] = pathSegments(href ?? '');
  if (root !== 'directory' || !filter) {
    return undefined;
  }
  const cells = filter.split('-');
  const set = cells.map((cell, i) => (cell !== '0' ? i : -1)).filter(i => i >= 0);
  return cells.length === 6 && set.length === 1 && set[0] <= 1 ? filter : undefined;
}

function directoryUrl(src: SourceConfig, filter: string, sort: ListSort, page: number): string {
  return `${src.baseUrl}/directory/${filter}/${page}.html?${ORDER[sort] ?? ORDER.latest}`;
}

function parseListing($: CheerioAPI, base: string): ListPage {
  const items: MangaItem[] = [];
  $('.post-list li').each((_, el) => {
    const $el = $(el);
    const $cover = $el.find('a.manga-cover').first();
    const slug = slugOf(resolveUrl($cover.attr('href') ?? $el.find('a[href*="/manga/"]').first().attr('href'), base));
    const title = cleanText($cover.attr('rel')) || textOf($el.find('.title'));
    if (!slug || !title) {
      return;
    }
    items.push({
      url: `${base}/manga/${encodeURIComponent(slug)}`,
      title,
      cover: imageSrc($el.find('img'), base),
      subtitle: textOf($el.find('.read-btn')) || undefined,
    });
  });
  const next = $('.page-nav a')
    .toArray()
    .find(a => /next/i.test($(a).text()));
  const href = next ? $(next).attr('href') ?? '' : '';
  return {
    items: uniqBy(items, item => item.url),
    hasNext: !!href && !href.startsWith('javascript'),
  };
}

function viewerImages($: CheerioAPI, base: string): string[] {
  return $('#viewer img')
    .toArray()
    .map(el => imageSrc($(el), base))
    .filter((uri): uri is string => !!uri && !uri.startsWith('data:') && !uri.includes('/images/manga_cover'));
}

async function pageImages(url: string, base: string): Promise<string[]> {
  try {
    return viewerImages(parseHtml(await getText(url)), base);
  } catch {
    return viewerImages(parseHtml(await getText(url)), base);
  }
}

function infoRows($: CheerioAPI): Map<string, Cheerio<AnyNode>> {
  const rows = new Map<string, Cheerio<AnyNode>>();
  $('.detail-info p, .detail-info-middle p').each((_, el) => {
    const label = cleanText($(el).find('span').first().text()).replace(/:$/, '').toLowerCase();
    if (label) {
      rows.set(label, $(el));
    }
  });
  return rows;
}

function findRow(rows: Map<string, Cheerio<AnyNode>>, pattern: RegExp): Cheerio<AnyNode> | undefined {
  for (const [label, $row] of rows) {
    if (pattern.test(label)) {
      return $row;
    }
  }
  return undefined;
}

const rowValue = ($row: Cheerio<AnyNode> | undefined) => ($row ? cleanText($row.text()).replace(/^[^:]*:\s*/, '') : '');

function normalizeStatus(value: string): string | undefined {
  if (/^ongoin/i.test(value)) {
    return 'Ongoing';
  }
  if (/^complet/i.test(value)) {
    return 'Completed';
  }
  return value || undefined;
}

function detailPageUrl(src: SourceConfig, url: string): string {
  const slug = slugOf(url);
  if (!slug) {
    throw new Error('Đường dẫn truyện MangaTown không hợp lệ.');
  }
  const isMobileDetail = getHost(url) === getHost(src.baseUrl) && match({ site: src, url }) === 'detail';
  return isMobileDetail ? url : mangaUrl(src, slug);
}

function parseChapters($: CheerioAPI, base: string): Chapter[] {
  const chapters: Chapter[] = $('.detail-ch-list li a')
    .toArray()
    .map(el => {
      const $a = $(el);
      const chapterUrl = resolveUrl($a.attr('href'), base);
      const path = chapterPath(chapterUrl);
      const segment = path?.parts[path.parts.length - 1];
      const number = segment ? parseFloat(segment.slice(1)) : NaN;
      let label = cleanText(
        $a
          .contents()
          .toArray()
          .filter(node => node.nodeType === 3)
          .map(node => $(node).text())
          .join(' '),
      );
      if (!/\d/.test(label) && Number.isFinite(number)) {
        label = `C.${number}`;
      }
      const name = [label, textOf($a.find('.vol'))].filter(Boolean).join(' - ');
      const date = textOf($a.find('.time'));
      const exact = date.replace(/^(today|yesterday)\s+(?=[a-z]{3}\s*\d)/i, '');
      return {
        url: chapterUrl,
        name,
        date: date || undefined,
        time: parseDate(exact),
        number: Number.isFinite(number) ? number : undefined,
      };
    })
    .filter(ch => ch.name && chapterPath(ch.url));
  return uniqBy(chapters, ch => ch.url);
}


async function loadList(site: SourceConfig, url: string): Promise<ListPage> {
  return parseListing(parseHtml(await getText(url)), site.baseUrl);
}

async function loadGenres(site: SourceConfig): Promise<Genre[]> {
  const $ = parseHtml(await getText(`${site.baseUrl}/directory/`));
  const genres: Genre[] = $('a[href*="/directory/"]')
    .toArray()
    .map(el => ({ id: genreFilter($(el).attr('href')) ?? '', name: cleanText($(el).text()) }))
    .filter(g => g.id && g.name);
  return uniqBy(genres, g => g.id).sort((a, b) => a.name.localeCompare(b.name));
}

async function loadDetail(site: SourceConfig, url: string): Promise<MangaDetail> {
  const pageUrl = detailPageUrl(site, url);
  const $ = parseHtml(await getText(pageUrl));
  const base = site.baseUrl;
  const $top = $('.manga-detail-top');
  const rows = infoRows($);

  const genres = uniqBy(
    [findRow(rows, /^genre/), findRow(rows, /^demographic/)]
      .flatMap($row => ($row ? $row.find('a').toArray() : []))
      .map(el => ({ id: genreFilter($(el).attr('href')) ?? '', name: cleanText($(el).text()) }))
      .filter(g => g.id && g.name),
    g => g.id,
  );
  const authors = [findRow(rows, /^author/), findRow(rows, /^artist/)].flatMap($row =>
    $row
      ? $row
          .find('a')
          .toArray()
          .map(a => cleanText($(a).text()))
      : [],
  );
  const alt = rowValue(findRow(rows, /^alternative/));
  const $summary = $('#show').first().clone();
  $summary.find('a').remove();
  const description = cleanText($summary.text()) || rowValue(findRow(rows, /^summary/));
  const rating = parseFloat(textOf($('.score-number')));
  const rank = rowValue(findRow(rows, /^rank/)).match(/\d+/)?.[0];

  const title = textOf($top.find('.title')) || cleanText($('title').text());
  if (!title) {
    throw new Error('Không đọc được thông tin truyện từ MangaTown.');
  }

  return {
    url: pageUrl,
    title,
    altTitles: alt
      ? alt
          .split(/;\s*/)
          .map(t => t.trim())
          .filter(Boolean)
      : undefined,
    cover: imageSrc($top.find('img.detail-cover, img').first(), base),
    description: description || undefined,
    status: normalizeStatus(rowValue(findRow(rows, /^status/))),
    authors: uniqBy(authors.filter(Boolean), a => a),
    genres,
    rating: Number.isFinite(rating) && rating > 0 ? rating : undefined,
    views: rank ? `Hạng #${rank}` : undefined,
    chapters: parseChapters($, base),
    nsfw: genres.some(g => NSFW_GENRES.test(g.name)),
  };
}

async function loadChapter(site: SourceConfig, url: string): Promise<ChapterContent> {
  const first = chapterBase(site, url);
  if (!first) {
    throw new Error('Đường dẫn chương MangaTown không hợp lệ.');
  }
  const $ = parseHtml(await getText(first));
  let pages = viewerImages($, site.baseUrl);

  const pageUrls = uniqBy(
    $('select option')
      .toArray()
      .map(el => resolveUrl($(el).attr('value'), first))
      .filter(u => u.startsWith(first) && /\/(\d+\.html)?$/.test(u))
      .map(u => (u.endsWith('/1.html') ? first : u)),
    u => u,
  );
  if (pageUrls.length > pages.length) {
    const rest = pageUrls.filter(u => u !== first);
    const more = await mapLimit(rest, PAGE_CONCURRENCY, u => pageImages(u, site.baseUrl));
    pages = [...pages, ...more.flat()];
  }
  if (!pages.length) {
    throw new Error('Không tìm thấy ảnh trong chương này.');
  }
  const headers = imageHeaders(site);
  const title = textOf($('.title a').first()).replace(/\s+Page\s+\d+$/i, '');
  return {
    kind: 'images',
    title: title || undefined,
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
  const $ = parseHtml(html);
  const href = $('.title a').last().attr('href');
  const fromTitle = href ? slugOf(resolveUrl(href, site.baseUrl)) : undefined;
  return fromTitle ? mangaUrl(site, fromTitle) : undefined;
}


export function getURL({ site, params }: GetURLInput): string {
  switch (params.method) {
    case 'list':
      return directoryUrl(site, ALL, params.sort, params.page);
    case 'search': {
      const q = encodeURIComponent(params.query.trim());
      return params.page > 1
        ? `${site.baseUrl}/search/${params.page}.htm?name=${q}`
        : `${site.baseUrl}/search?name=${q}`;
    }
    case 'genre':
      return directoryUrl(site, params.genre.id, params.sort, params.page);
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
  if (segments[0] !== 'manga') {
    return null;
  }
  if (chapterPath(url)) {
    return 'chapter';
  }
  return segments.length === 2 ? 'detail' : null;
}

export function imageHeaders(site: SourceConfig): Record<string, string> {
  return refererHeaders(site);
}
