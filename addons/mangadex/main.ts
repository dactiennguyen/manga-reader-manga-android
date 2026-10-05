import { getJson, getQueryParam, pathSegments, runFromHtml, sourcesRuntime, withQuery } from '../../src/addons/sdk';
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
 * MangaDex qua API công khai (api.mangadex.org) — không cần parse HTML.
 * Theo quy định của MangaDex: tự đặt User-Agent riêng, ghi rõ nhóm dịch.
 *
 * getURL trả về trang tìm kiếm trên web MangaDex (mở được trong trình duyệt);
 * dữ liệu vẫn lấy qua API theo cùng tham số.
 */

const API = 'https://api.mangadex.org';
const SITE = 'https://mangadex.org';
const PAGE_SIZE = 24;
const HEADERS = { 'User-Agent': 'MangaReader/0.1 (React Native)', Referer: `${SITE}/` };

type Localized = Record<string, string>;
type Relationship = { id: string; type: string; attributes?: Record<string, any> };
type MangaData = {
  id: string;
  attributes: {
    title: Localized;
    altTitles: Localized[];
    description: Localized;
    status?: string;
    contentRating?: string;
    tags: { id: string; attributes: { name: Localized; group: string } }[];
    lastChapter?: string;
  };
  relationships: Relationship[];
};
type ChapterData = {
  id: string;
  attributes: {
    title?: string | null;
    volume?: string | null;
    chapter?: string | null;
    publishAt: string;
    externalUrl?: string | null;
    pages: number;
  };
  relationships: Relationship[];
};

const ORDER: Record<ListSort, [string, 'asc' | 'desc']> = {
  latest: ['latestUploadedChapter', 'desc'],
  popular: ['followedCount', 'desc'],
  new: ['createdAt', 'desc'],
  rating: ['rating', 'desc'],
  az: ['title', 'asc'],
};

/** Thứ tự "liên quan nhất" của trang tìm kiếm. */
const RELEVANCE = 'relevance.desc';

/** Trang /titles/<tên> có sẵn của web MangaDex. */
const TITLE_PAGES: Record<string, ListSort> = { latest: 'latest', recent: 'new' };

const STATUS: Record<string, string> = {
  ongoing: 'Đang tiến hành',
  completed: 'Hoàn thành',
  hiatus: 'Tạm ngưng',
  cancelled: 'Đã huỷ',
};

function langOf(src: SourceConfig): string {
  return src.options?.chapterLang || src.lang || 'en';
}

function ratings(): string[] {
  return sourcesRuntime().allowNsfw ? ['safe', 'suggestive', 'erotica', 'pornographic'] : ['safe', 'suggestive'];
}

function pick(text: Localized | undefined, lang: string): string {
  if (!text) {
    return '';
  }
  return text[lang] ?? text.en ?? text['ja-ro'] ?? Object.values(text)[0] ?? '';
}

function titleOf(manga: MangaData, lang: string): string {
  const main = pick(manga.attributes.title, lang);
  const localized = manga.attributes.altTitles.find(t => t[lang])?.[lang];
  return localized || main;
}

function coverOf(manga: MangaData, size: '256' | '512' = '256'): string | undefined {
  const fileName = manga.relationships.find(r => r.type === 'cover_art')?.attributes?.fileName;
  return fileName ? `https://uploads.mangadex.org/covers/${manga.id}/${fileName}.${size}.jpg` : undefined;
}

function idFrom(url: string, kind: 'title' | 'chapter'): string {
  const found = url.match(new RegExp(`/${kind}/([0-9a-f-]{36})`, 'i'));
  if (!found) {
    throw new Error('Đường dẫn MangaDex không hợp lệ.');
  }
  return found[1];
}

/** Giá trị `order` trên web MangaDex: "followedCount.desc". */
function orderParam(sort: ListSort): string {
  return ORDER[sort].join('.');
}

/** Tham số sắp xếp của API: order[followedCount]=desc. */
function orderQuery(sort: ListSort): Record<string, string> {
  const [field, dir] = ORDER[sort];
  return { [`order[${field}]`]: dir };
}

/** Đọc lại tham số từ URL web (khi `run` trên trang danh sách đang mở, không có params). */
function paramsFromUrl(url: string): ListParams {
  const page = Math.max(1, Number(getQueryParam(url, 'page')) || 1);
  const order = getQueryParam(url, 'order');
  const query = getQueryParam(url, 'q');
  if (query !== undefined || order === RELEVANCE) {
    return { method: 'search', query: query ?? '', page };
  }
  const segments = pathSegments(url);
  const sort =
    (Object.keys(ORDER) as ListSort[]).find(key => orderParam(key) === order) ??
    (segments[0] === 'titles' ? TITLE_PAGES[segments[1] ?? ''] : undefined) ??
    'latest';
  // /titles?tag=<id> hoặc trang thể loại /tag/<id>/<slug>.
  const tag = getQueryParam(url, 'tag') || (segments[0] === 'tag' ? segments[1] : undefined);
  if (tag) {
    return { method: 'genre', genre: { id: tag, name: segments[2] ?? tag }, sort, page };
  }
  return { method: 'list', sort, page };
}

async function listManga(
  src: SourceConfig,
  page: number,
  params: Record<string, string | string[]>,
): Promise<ListPage> {
  const lang = langOf(src);
  const url = withQuery(`${API}/manga`, {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    'includes[]': 'cover_art',
    'contentRating[]': ratings(),
    'availableTranslatedLanguage[]': lang,
    hasAvailableChapters: 'true',
    ...params,
  });
  const res = await getJson<{ data: MangaData[]; total: number }>(url, { headers: HEADERS });
  const items: MangaItem[] = res.data.map(manga => ({
    url: `${SITE}/title/${manga.id}`,
    title: titleOf(manga, lang),
    cover: coverOf(manga),
    subtitle: manga.attributes.lastChapter ? `Chương ${manga.attributes.lastChapter}` : undefined,
  }));
  return { items, hasNext: page * PAGE_SIZE < res.total };
}

function chapterName(ch: ChapterData): string {
  const { volume, chapter, title } = ch.attributes;
  const parts: string[] = [];
  if (volume) {
    parts.push(`Vol. ${volume}`);
  }
  parts.push(chapter ? `Ch. ${chapter}` : 'Oneshot');
  return title ? `${parts.join(' ')} - ${title}` : parts.join(' ');
}

async function fetchFeed(id: string, lang: string): Promise<Chapter[]> {
  const chapters: Chapter[] = [];
  // Giới hạn 5 lượt × 500 chương để không treo với truyện rất dài.
  for (let offset = 0, round = 0; round < 5; round++, offset += 500) {
    const url = withQuery(`${API}/manga/${id}/feed`, {
      limit: 500,
      offset,
      'translatedLanguage[]': lang,
      'order[volume]': 'desc',
      'order[chapter]': 'desc',
      'includes[]': 'scanlation_group',
      'contentRating[]': ['safe', 'suggestive', 'erotica', 'pornographic'],
      includeExternalUrl: 0,
    });
    const res = await getJson<{ data: ChapterData[]; total: number }>(url, { headers: HEADERS });
    for (const ch of res.data) {
      if (ch.attributes.externalUrl || ch.attributes.pages === 0) {
        continue;
      }
      const time = Date.parse(ch.attributes.publishAt);
      chapters.push({
        url: `${SITE}/chapter/${ch.id}`,
        name: chapterName(ch),
        time: Number.isFinite(time) ? time : undefined,
        date: Number.isFinite(time) ? new Date(time).toLocaleDateString('vi-VN') : undefined,
        number: ch.attributes.chapter ? parseFloat(ch.attributes.chapter) : undefined,
        scanlator:
          ch.relationships
            .filter(r => r.type === 'scanlation_group')
            .map(r => r.attributes?.name as string)
            .filter(Boolean)
            .join(', ') || undefined,
      });
    }
    if (offset + 500 >= res.total) {
      break;
    }
  }
  return chapters;
}

/** Bỏ cú pháp markdown/BBCode phổ biến trong mô tả của MangaDex. */
function plainDescription(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1')
    .replace(/\*\*|__|~~/g, '')
    .replace(/^---+$/gm, '')
    .trim();
}

// ─── Đọc dữ liệu ────────────────────────────────────────────────────────────

/** Danh sách / tìm kiếm / thể loại: gọi API theo params (không có thì đọc từ URL web). */
function loadList(site: SourceConfig, url: string, params?: ListParams): Promise<ListPage> {
  const p = params ?? paramsFromUrl(url);
  switch (p.method) {
    case 'list':
      return listManga(site, p.page, orderQuery(p.sort));
    case 'search':
      return listManga(site, p.page, { title: p.query, 'order[relevance]': 'desc' });
    case 'genre':
      return listManga(site, p.page, { 'includedTags[]': p.genre.id, ...orderQuery(p.sort) });
  }
}

async function loadGenres(): Promise<Genre[]> {
  const res = await getJson<{ data: MangaData['attributes']['tags'] }>(`${API}/manga/tag`, {
    headers: HEADERS,
  });
  return res.data
    .filter(tag => tag.attributes.group === 'genre' || tag.attributes.group === 'theme')
    .map<Genre>(tag => ({ id: tag.id, name: pick(tag.attributes.name, 'en') }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function loadDetail(site: SourceConfig, url: string): Promise<MangaDetail> {
  const id = idFrom(url, 'title');
  const lang = langOf(site);
  const [res, chapters, stats] = await Promise.all([
    getJson<{ data: MangaData }>(withQuery(`${API}/manga/${id}`, { 'includes[]': ['cover_art', 'author', 'artist'] }), {
      headers: HEADERS,
    }),
    fetchFeed(id, lang),
    getJson<{ statistics: Record<string, { rating?: { bayesian?: number }; follows?: number }> }>(
      `${API}/statistics/manga/${id}`,
      { headers: HEADERS },
    ).catch(() => undefined),
  ]);
  const manga = res.data;
  const stat = stats?.statistics[id];
  return {
    url: `${SITE}/title/${id}`,
    title: titleOf(manga, lang),
    altTitles: manga.attributes.altTitles
      .map(t => Object.values(t)[0])
      .filter(Boolean)
      .slice(0, 8),
    cover: coverOf(manga, '512'),
    description: plainDescription(pick(manga.attributes.description, lang)) || undefined,
    status: manga.attributes.status ? STATUS[manga.attributes.status] ?? manga.attributes.status : undefined,
    authors: [
      ...new Set(
        manga.relationships
          .filter(r => r.type === 'author' || r.type === 'artist')
          .map(r => r.attributes?.name as string)
          .filter(Boolean),
      ),
    ],
    genres: manga.attributes.tags.map(tag => ({ id: tag.id, name: pick(tag.attributes.name, 'en') })),
    rating: stat?.rating?.bayesian ? Math.round(stat.rating.bayesian * 10) / 20 : undefined,
    views: stat?.follows ? `${stat.follows.toLocaleString('vi-VN')} theo dõi` : undefined,
    chapters,
    nsfw: manga.attributes.contentRating === 'erotica' || manga.attributes.contentRating === 'pornographic',
  };
}

async function loadChapter(url: string): Promise<ChapterContent> {
  const id = idFrom(url, 'chapter');
  const res = await getJson<{ baseUrl: string; chapter: { hash: string; data: string[] } }>(
    `${API}/at-home/server/${id}`,
    { headers: HEADERS },
  );
  return {
    kind: 'images',
    pages: res.chapter.data.map(file => ({
      uri: `${res.baseUrl}/data/${res.chapter.hash}/${file}`,
    })),
  };
}

async function resolveMangaUrl(chapterUrl: string): Promise<string | undefined> {
  const id = idFrom(chapterUrl, 'chapter');
  const res = await getJson<{ data: { relationships: Relationship[] } }>(`${API}/chapter/${id}`, {
    headers: HEADERS,
  });
  const manga = res.data.relationships.find(r => r.type === 'manga');
  return manga ? `${SITE}/title/${manga.id}` : undefined;
}

// ─── Các hàm của addon ──────────────────────────────────────────────────────

export function getURL({ params }: GetURLInput): string {
  const page = params.page > 1 ? params.page : undefined;
  switch (params.method) {
    case 'list':
      return withQuery(`${SITE}/titles`, { order: orderParam(params.sort), page });
    case 'search':
      return withQuery(`${SITE}/titles`, { q: params.query, order: RELEVANCE, page });
    case 'genre':
      return withQuery(`${SITE}/titles`, { tag: params.genre.id, order: orderParam(params.sort), page });
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
      return { widget: 'catalogchapter', chapter: await loadChapter(url) };
  }
}

export function run(input: RunInput): Promise<Widget> {
  return runFromHtml({ fetch, match }, input);
}

export async function get({ site, method, url }: GetInput): Promise<Widget> {
  switch (method) {
    case 'genre':
      return { widget: 'genre', genres: await loadGenres() };
    case 'chapter':
      return { widget: 'chapter', chapters: await fetchFeed(idFrom(url ?? '', 'title'), langOf(site)) };
    case 'manga':
      return { widget: 'manga', url: url ? await resolveMangaUrl(url) : undefined };
  }
}

export function match({ url }: MatchInput): UrlKind | null {
  if (/\/chapter\/[0-9a-f-]{36}/i.test(url)) {
    return 'chapter';
  }
  if (/\/title\/[0-9a-f-]{36}/i.test(url)) {
    return 'detail';
  }
  return 'list';
}

/** Ảnh lấy từ máy chủ MangaDex@Home, không cần Referer. */
export function imageHeaders(): Record<string, string> {
  return {};
}
