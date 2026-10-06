import type { Cheerio, CheerioAPI } from 'cheerio/slim';
import type { AnyNode } from 'domhandler';

import {
  cleanText,
  decodeBase64,
  getQueryParam,
  getText,
  harvestMangaLinks,
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


const ORDER: Record<ListSort, string> = {
  latest: 'update',
  popular: 'popular',
  new: 'latest',
  rating: 'rating',
  az: 'title',
};

const dirOf = (src: SourceConfig) => src.options?.mangaDir || 'manga';

const pagePath = (page: number) => (page > 1 ? `page/${page}/` : '');

const NSFW_GENRES = /adult|mature|smut|hentai|ecchi|18\+|erotic/i;

const PLACEHOLDER = /^(-+|n\/?a|none|unknown|updating|đang cập nhật)$/i;

function parseListing($: CheerioAPI, base: string, scope?: string, harvestDir?: string): ListPage {
  const root = scope ? $(scope) : $.root();
  let items: MangaItem[] = [];
  root.find('.listupd .bs .bsx, .listupd .utao .uta, .listupd .bsx, .listo .bs .bsx').each((_, el) => {
    const $el = $(el);
    const $a = $el.find('a').first();
    const href = $a.attr('href');
    if (!href) {
      return;
    }
    const title = textOf($el.find('.tt, h4, h3')) || cleanText($a.attr('title')) || textOf($el.find('a[title]'));
    if (!title) {
      return;
    }
    items.push({
      url: resolveUrl(href, base),
      title,
      cover: imageSrc($el.find('img'), base),
      subtitle: textOf($el.find('.epxs, .luf ul li a, .adds .epxs')) || undefined,
    });
  });
  if (!items.length && harvestDir) {
    items = harvestMangaLinks($, base, harvestDir);
  }
  const hasNext =
    $('.hpage a.r, .pagination a.next, a.next.page-numbers, .hpage .r').length > 0 ||
    (!$('.hpage, .pagination').length && items.length >= 20);
  return { items: uniqBy(items, i => i.url), hasNext };
}

function readerImages(html: string): string[] {
  const scripts = [html];
  for (const found of html.matchAll(/src="data:text\/javascript;base64,([^"]+)"/g)) {
    scripts.push(decodeBase64(found[1]));
  }
  for (const script of scripts) {
    const call = script.match(/ts_reader\.run\((\{[\s\S]*?\})\);/);
    if (!call) {
      continue;
    }
    try {
      const data = JSON.parse(call[1]) as { sources?: { images?: string[] }[] };
      const source = data.sources?.find(s => s.images?.length);
      if (source?.images) {
        return source.images;
      }
    } catch {
    }
  }
  return [];
}

function statusOf($: CheerioAPI): string | undefined {
  const fromImptdt = $('.imptdt, .tsinfo .imptdt')
    .toArray()
    .find(el => /status|estado|statut|durum|trạng thái/i.test($(el).text()));
  if (fromImptdt) {
    return textOf($(fromImptdt).find('i, a')) || undefined;
  }
  const row = $('.infotable tr, .seriestucontent table tr')
    .toArray()
    .find(el => /status|estado/i.test($(el).find('td').first().text()));
  return row ? textOf($(row).find('td').last()) || undefined : undefined;
}

function authorsOf($: CheerioAPI): string[] {
  const values: string[] = [];
  $('.imptdt, .fmed, .infotable tr').each((_, el) => {
    const text = cleanText($(el).text());
    if (/author|artist|autor|tác giả|yazar/i.test(text)) {
      const value = textOf($(el).find('i, span, td:last-child, a'));
      if (value && !PLACEHOLDER.test(value)) {
        values.push(...value.split(/,\s*/));
      }
    }
  });
  return uniqBy(values.filter(Boolean), v => v);
}

function parseChapters($: CheerioAPI, base: string): Chapter[] {
  const chapters = $('#chapterlist li, .eplister li, .cl li')
    .toArray()
    .map(el => {
      const $el = $(el);
      const $a = $el.find('a').first();
      const name = textOf($el.find('.chapternum, .lchx, .epl-title')) || cleanText($a.text());
      const date = textOf($el.find('.chapterdate, .epl-date, .dt')) || undefined;
      return {
        url: resolveUrl($a.attr('href'), base),
        name,
        date,
        time: parseDate(date),
        number: parseChapterNumber(name) ?? (Number($el.attr('data-num')) || undefined),
      };
    })
    .filter(ch => ch.url && ch.name);
  return uniqBy(chapters, ch => ch.url);
}


async function loadList(site: SourceConfig, url: string, params?: ListParams): Promise<ListPage> {
  const $ = parseHtml(await getText(url));
  const isSearch = params?.method === 'search' || getQueryParam(url, 's') !== undefined;
  return parseListing($, site.baseUrl, undefined, isSearch ? undefined : dirOf(site));
}

async function loadGenres(site: SourceConfig): Promise<Genre[]> {
  const $ = parseHtml(await getText(`${site.baseUrl}/${dirOf(site)}/`));
  const genres: Genre[] = $('ul.genrez li, .dropdown-menu.c4 li')
    .toArray()
    .map(el => ({
      id: $(el).find('input').attr('value') ?? '',
      name: cleanText($(el).find('label').text()),
    }))
    .filter(g => g.id && g.name);
  return uniqBy(genres, g => g.id);
}

async function loadDetail(site: SourceConfig, url: string): Promise<MangaDetail> {
  const $ = parseHtml(await getText(url));
  const base = site.baseUrl;
  const genres = uniqBy(
    $('.mgen a, .seriestugenre a, .wd-full .mgen a')
      .toArray()
      .map(el => {
        const segments = pathSegments($(el).attr('href') ?? '');
        return { id: segments[segments.length - 1] ?? '', name: cleanText($(el).text()) };
      })
      .filter(g => g.name),
    g => g.id || g.name,
  );
  const $desc = $('.entry-content[itemprop="description"], .synp .entry-content, .desc, .entry-content').first();
  $desc.find('script, style, .addtoany_share_save_container').remove();
  const paragraphs = $desc
    .find('p')
    .toArray()
    .map(p => cleanText($(p).text()))
    .filter(Boolean);
  const alt = textOf($('.alternative, .seriestualt, .wd-full:contains("Alternative") span'));
  const rating = parseFloat(textOf($('.num[itemprop="ratingValue"], .rating .num, .rating-prc .num')));

  return {
    url,
    title: textOf($('h1.entry-title, .seriestuheader h1')) || cleanText($('meta[property="og:title"]').attr('content')),
    altTitles: alt ? alt.split(/[;,/]\s*/).filter(Boolean) : undefined,
    cover:
      imageSrc($('.thumb img, .infomanga img, .seriestucontl .thumb img, .bigcontent img'), base) ||
      $('meta[property="og:image"]').attr('content'),
    description: (paragraphs.length ? paragraphs.join('\n\n') : cleanText($desc.text())) || undefined,
    status: statusOf($),
    authors: authorsOf($),
    genres,
    rating: Number.isFinite(rating) ? Math.round(rating * 10) / 20 : undefined,
    chapters: parseChapters($, base),
    similar: parseListing($, base, '.bixbox')
      .items.filter(item => item.url !== url)
      .slice(0, 12),
    nsfw: genres.some(g => NSFW_GENRES.test(g.name)),
  };
}

async function loadChapter(site: SourceConfig, url: string): Promise<ChapterContent> {
  const html = await getText(url, { referer: `${site.baseUrl}/` });
  const $ = parseHtml(html);
  let pages = readerImages(html);
  if (!pages.length) {
    const $reader = $('#readerarea');
    const noscript = $reader.find('noscript').text();
    const $scope: Cheerio<AnyNode> = noscript ? parseHtml(noscript).root() : $reader;
    pages = $scope
      .find('img')
      .toArray()
      .map(el => imageSrc($(el), site.baseUrl) ?? '')
      .filter(uri => uri && !uri.startsWith('data:'));
  }
  if (!pages.length) {
    throw new Error('Không tìm thấy ảnh trong chương này.');
  }
  const headers = imageHeaders(site);
  return {
    kind: 'images',
    title: textOf($('h1.entry-title')) || undefined,
    pages: uniqBy(
      pages.map(u => resolveUrl(u.trim(), site.baseUrl)),
      u => u,
    ).map(uri => ({ uri, headers })),
  };
}

async function resolveMangaUrl(site: SourceConfig, chapterUrl: string, html?: string): Promise<string | undefined> {
  const $ = parseHtml(html ?? (await getText(chapterUrl)));
  const href =
    $('.allc a, .headpost .allc a').first().attr('href') ||
    $('.breadcrumb li:nth-child(2) a, ol[itemtype*="BreadcrumbList"] li:nth-child(2) a').first().attr('href');
  return href ? resolveUrl(href, site.baseUrl) : undefined;
}


export function getURL({ site, params }: GetURLInput): string {
  switch (params.method) {
    case 'list':
      return withQuery(`${site.baseUrl}/${dirOf(site)}/`, { page: params.page, order: ORDER[params.sort] });
    case 'search':
      return withQuery(`${site.baseUrl}/${pagePath(params.page)}`, { s: params.query });
    case 'genre':
      return /^\d+$/.test(params.genre.id)
        ? withQuery(`${site.baseUrl}/${dirOf(site)}/`, {
            page: params.page,
            'genre[]': params.genre.id,
            order: ORDER[params.sort],
          })
        : `${site.baseUrl}/genres/${encodeURIComponent(params.genre.id)}/${pagePath(params.page)}`;
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
      const $ = parseHtml(html ?? (await getText(url ?? '')));
      return { widget: 'chapter', chapters: parseChapters($, site.baseUrl) };
    }
    case 'manga':
      return { widget: 'manga', url: url ? await resolveMangaUrl(site, url, html) : undefined };
  }
}

export function match({ site, url, html }: MatchInput): UrlKind | null {
  if (getQueryParam(url, 's') !== undefined) {
    return 'list';
  }
  const segments = pathSegments(url);
  if (!segments.length || segments[0] === 'genres' || segments[0] === 'page') {
    return 'list';
  }
  if (segments[0] === dirOf(site)) {
    return segments.length === 1 ? 'list' : 'detail';
  }
  if (html) {
    if (html.includes('id="readerarea"') || html.includes('ts_reader.run')) {
      return 'chapter';
    }
    if (html.includes('id="chapterlist"') || html.includes('class="eplister"')) {
      return 'detail';
    }
    if (html.includes('class="listupd"')) {
      return 'list';
    }
  }
  return /(chapter|chap|ch|episode|ep|capitulo|bolum|chuong)[-_]?\d/i.test(segments[segments.length - 1])
    ? 'chapter'
    : null;
}

export function detect(html: string): boolean {
  return /ts_reader\.run|\/themes\/mangareader|themesia|class="bsx"|class="listupd"/i.test(html);
}

export function imageHeaders(site: SourceConfig): Record<string, string> {
  return refererHeaders(site);
}
