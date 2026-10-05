/**
 * Mô hình dữ liệu của hệ thống nguồn — thay cho addon của app gốc.
 *
 * App gốc chạy addon JS trong WebView rồi nhận JSON {widget, data}; ở đây mỗi
 * "engine" là một parser viết lại bằng TypeScript chạy thẳng trong Hermes, và
 * trả về đúng 4 loại dữ liệu tương ứng 4 widget: cataloghome (ListPage),
 * cataloglist (ListPage), catalogdetail (MangaDetail), catalogchapter
 * (ChapterContent).
 */

export type ContentType = 'manga' | 'novel';

/** uid của addon (madara, themesia, mangadex…). Addon tải về có thể thêm uid mới. */
export type EngineId = string;

/** Một site người dùng đã thêm (tương đương DBAddOn + siteInfo). */
export type SourceConfig = {
  /** Host không có "www.", cũng là khoá duy nhất. */
  id: string;
  engine: EngineId;
  name: string;
  /** Gốc site, không có "/" cuối: "https://example.com". */
  baseUrl: string;
  content: ContentType;
  /** Mã ngôn ngữ của site (en, vi, es…). */
  lang: string;
  nsfw: boolean;
  enabled: boolean;
  builtin?: boolean;
  addedAt: number;
  options?: SourceOptions;
};

export type SourceOptions = {
  /** Thư mục danh sách truyện của theme ("manga", "series", "comics"…). */
  mangaDir?: string;
  /** Ngôn ngữ chương muốn lấy (MangaDex). */
  chapterLang?: string;
};

export type MangaItem = {
  url: string;
  title: string;
  cover?: string;
  /** Dòng phụ: chương mới nhất, điểm… */
  subtitle?: string;
};

export type ListPage = {
  items: MangaItem[];
  hasNext: boolean;
};

export type ListSort = 'latest' | 'popular' | 'new' | 'rating' | 'az';

export type Genre = {
  /** Giá trị engine dùng để lọc (slug, id). */
  id: string;
  name: string;
};

export type Chapter = {
  url: string;
  name: string;
  /** Chuỗi ngày hiển thị như site trả về. */
  date?: string;
  /** Mốc thời gian nếu parse được. */
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
  /** Thang 5. */
  rating?: number;
  views?: string;
  /** Mới nhất trước. */
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
  /** Phiên bản addon đang chạy. */
  version?: number;
  contents: ContentType[];
  /** Thứ tự sắp xếp danh sách mà engine hỗ trợ. */
  sorts: { id: ListSort; label: string }[];
  /** Có thể thêm domain tuỳ ý dùng cùng theme. */
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
  /** URL thật trên site của một trang danh sách (getURL của addon) — để mở trong trình duyệt. */
  listUrl?(
    src: SourceConfig,
    params:
      | { method: 'list'; sort: ListSort; page: number }
      | { method: 'search'; query: string; page: number }
      | { method: 'genre'; genre: Genre; sort: ListSort; page: number },
  ): string | Promise<string>;
  detail(src: SourceConfig, url: string): Promise<MangaDetail>;
  chapter(src: SourceConfig, url: string): Promise<ChapterContent>;

  /**
   * Trang đang mở thuộc loại nào. `html` là HTML lấy từ WebView nếu có —
   * cần cho theme mà URL truyện và URL chương trùng mẫu (themesia).
   */
  classifyUrl(src: SourceConfig, url: string, html?: string): UrlKind | null;
  /** URL trang truyện chứa chương này (cần khi mở reader thẳng từ trang chương). */
  resolveMangaUrl(src: SourceConfig, chapterUrl: string, html?: string): Promise<string | undefined>;
  /** Nhận diện theme từ HTML khi người dùng thêm site mới. */
  detect?(html: string): boolean;
  /**
   * Selector của link tới trang truyện trong danh sách — dùng để đoán thư mục
   * truyện của site ("manga", "series", "seri"…) khi thêm site.
   */
  itemLinkSelector?: string;
  /** Header cần gửi khi tải ảnh (Referer chống hotlink). */
  imageHeaders(src: SourceConfig): Record<string, string>;
}
