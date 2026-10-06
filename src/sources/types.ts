export type ContentType = 'manga' | 'novel';

export type EngineId = string;

export type SourceConfig = {
  id: string;
  engine: EngineId;
  name: string;
  baseUrl: string;
  content: ContentType;
  lang: string;
  nsfw: boolean;
  enabled: boolean;
  builtin?: boolean;
  addedAt: number;
  options?: SourceOptions;
};

export type SourceOptions = {
  mangaDir?: string;
  chapterLang?: string;
};

export type MangaItem = {
  url: string;
  title: string;
  cover?: string;
  subtitle?: string;
};

export type ListPage = {
  items: MangaItem[];
  hasNext: boolean;
};

export type ListSort = 'latest' | 'popular' | 'new' | 'rating' | 'az';

export type Genre = {
  id: string;
  name: string;
};

export type Chapter = {
  url: string;
  name: string;
  date?: string;
  time?: number;
  number?: number;
  scanlator?: string;
};

export type MangaDetail = {
  url: string;
  title: string;
  altTitles?: string[];
  cover?: string;
  description?: string;
  status?: string;
  authors?: string[];
  genres?: Genre[];
  rating?: number;
  views?: string;
  chapters: Chapter[];
  similar?: MangaItem[];
  nsfw?: boolean;
};

export type Page = {
  uri: string;
  headers?: Record<string, string>;
};

export type ChapterContent =
  | { kind: 'images'; title?: string; pages: Page[] }
  | { kind: 'text'; title?: string; paragraphs: string[] };

export type UrlKind = 'list' | 'detail' | 'chapter';

export interface Engine {
  id: EngineId;
  label: string;
  description: string;
  version?: number;
  contents: ContentType[];
  sorts: { id: ListSort; label: string }[];
  allowCustomSites: boolean;

  list(src: SourceConfig, sort: ListSort, page: number): Promise<ListPage>;
  search(src: SourceConfig, query: string, page: number): Promise<ListPage>;
  genres(src: SourceConfig): Promise<Genre[]>;
  byGenre(
    src: SourceConfig,
    genre: Genre,
    sort: ListSort,
    page: number,
  ): Promise<ListPage>;
  listUrl?(
    src: SourceConfig,
    params:
      | { method: 'list'; sort: ListSort; page: number }
      | { method: 'search'; query: string; page: number }
      | { method: 'genre'; genre: Genre; sort: ListSort; page: number },
  ): string | Promise<string>;
  detail(src: SourceConfig, url: string): Promise<MangaDetail>;
  chapter(src: SourceConfig, url: string): Promise<ChapterContent>;

  classifyUrl(src: SourceConfig, url: string, html?: string): UrlKind | null;
  resolveMangaUrl(src: SourceConfig, chapterUrl: string, html?: string): Promise<string | undefined>;
  detect?(html: string): boolean;
  itemLinkSelector?: string;
  imageHeaders(src: SourceConfig): Record<string, string>;
}
