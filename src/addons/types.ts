import type {
  Chapter,
  ChapterContent,
  ContentType,
  Genre,
  ListSort,
  MangaDetail,
  MangaItem,
  SourceConfig,
  UrlKind,
} from '../sources/types';


export type AddonSiteInfo = {
  title: string;
  lang: string;
  url?: string;
  content?: ContentType;
  nsfw?: boolean;
  mangaDir?: string;
  chapterLang?: string;
  note?: 'cloudflare' | 'blocked';
  builtin?: boolean;
};

export type AddonInfo = {
  uid: string;
  label: string;
  desc: string;
  version: number;
  sdk: number;
  type: 'catalog';
  content: ContentType[];
  allowCustomSites: boolean;
  sorts: { id: ListSort; label: string }[];
  itemLinkSelector?: string;
  siteInfo?: Record<string, AddonSiteInfo>;
};

export type ListParams =
  | { method: 'list'; sort: ListSort; page: number }
  | { method: 'search'; query: string; page: number }
  | { method: 'genre'; genre: Genre; sort: ListSort; page: number };

export type Widget =
  | { widget: 'cataloglist'; list: MangaItem[]; hasNext: boolean }
  | { widget: 'catalogdetail'; detail: MangaDetail }
  | { widget: 'catalogchapter'; chapter: ChapterContent }
  | { widget: 'genre'; genres: Genre[] }
  | { widget: 'chapter'; chapters: Chapter[] }
  | { widget: 'manga'; url?: string };

export type WidgetOf<K extends Widget['widget']> = Extract<Widget, { widget: K }>;

export type FetchMethod = 'list' | 'detail' | 'chapter';

export type AddonModule = {
  getURL(input: { site: SourceConfig; params: ListParams }): string | Promise<string>;
  fetch(input: { site: SourceConfig; url: string; method: FetchMethod; params?: ListParams }): Promise<Widget>;
  run(input: { site: SourceConfig; url: string; method?: FetchMethod; html: string }): Promise<Widget>;
  get(input: { site: SourceConfig; method: 'genre' | 'chapter' | 'manga'; url?: string; html?: string }): Promise<Widget>;
  match(input: { site: SourceConfig; url: string; html?: string }): UrlKind | null;
  detect?(html: string): boolean;
  imageHeaders?(site: SourceConfig): Record<string, string>;
};

export type GetURLInput = Parameters<AddonModule['getURL']>[0];
export type FetchInput = Parameters<AddonModule['fetch']>[0];
export type RunInput = Parameters<AddonModule['run']>[0];
export type GetInput = Parameters<AddonModule['get']>[0];
export type MatchInput = Parameters<AddonModule['match']>[0];

export type AddonPackage = { info: AddonInfo; code: string };
