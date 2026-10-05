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

/**
 * Hệ thống addon theo kiểu app gốc: mỗi addon là một thư mục `addons/<uid>/`
 * gồm `info.json` (mô tả + danh sách site) và `main.ts` (code). Lúc build,
 * `main.ts` được biên dịch thành một đoạn JS độc lập; app nạp đoạn JS đó lúc
 * chạy — bản có sẵn trong app, hoặc bản mới tải về từ kho addon — nên sửa
 * parser không cần phát hành lại app.
 *
 * Addon chỉ được dùng hàm của SDK (src/addons/sdk.ts), tương tự common.js và
 * bridge nativeFetch mà app gốc cấp cho addon.
 */

/** Một site trong `siteInfo` của addon (danh mục "Site được hỗ trợ"). */
export type AddonSiteInfo = {
  /** Tên site. */
  title: string;
  lang: string;
  /** Gốc site nếu khác "https://<id>". */
  url?: string;
  content?: ContentType;
  nsfw?: boolean;
  mangaDir?: string;
  /** Ngôn ngữ chương muốn lấy (MangaDex). */
  chapterLang?: string;
  /** Chưa kiểm được từ máy test: cần xác minh Cloudflare / có thể bị nhà mạng chặn. */
  note?: 'cloudflare' | 'blocked';
  /** Nguồn có sẵn và được ghim từ đầu (addon chỉ dành cho một site). */
  builtin?: boolean;
};

export type AddonInfo = {
  uid: string;
  label: string;
  desc: string;
  /** Tăng mỗi lần sửa addon; app chỉ nhận bản tải về có version lớn hơn bản đang có. */
  version: number;
  /** Phiên bản SDK tối thiểu addon cần (SDK_VERSION của app phải ≥ giá trị này). */
  sdk: number;
  type: 'catalog';
  content: ContentType[];
  /** Người dùng thêm được domain khác dùng cùng theme. */
  allowCustomSites: boolean;
  /** Thứ tự sắp xếp danh sách addon hỗ trợ. */
  sorts: { id: ListSort; label: string }[];
  /** Selector link tới trang truyện trong danh sách — dùng để đoán thư mục truyện khi thêm site. */
  itemLinkSelector?: string;
  /** Khoá là id site (host không "www."). */
  siteInfo?: Record<string, AddonSiteInfo>;
};

/** Tham số của getURL — tương ứng `params` (sort, page, search, genre) của addon gốc. */
export type ListParams =
  | { method: 'list'; sort: ListSort; page: number }
  | { method: 'search'; query: string; page: number }
  | { method: 'genre'; genre: Genre; sort: ListSort; page: number };

/** Kết quả addon trả về, giữ tên widget của app gốc. */
export type Widget =
  | { widget: 'cataloglist'; list: MangaItem[]; hasNext: boolean }
  | { widget: 'catalogdetail'; detail: MangaDetail }
  | { widget: 'catalogchapter'; chapter: ChapterContent }
  | { widget: 'genre'; genres: Genre[] }
  | { widget: 'chapter'; chapters: Chapter[] }
  | { widget: 'manga'; url?: string };

export type WidgetOf<K extends Widget['widget']> = Extract<Widget, { widget: K }>;

export type FetchMethod = 'list' | 'detail' | 'chapter';

/** Những gì `main.ts` của một addon export. */
export type AddonModule = {
  /** Dựng URL danh sách / tìm kiếm / thể loại — URL thật của site, mở được trong trình duyệt. */
  getURL(input: { site: SourceConfig; params: ListParams }): string | Promise<string>;
  /** Tải URL rồi đọc ra widget (list → cataloglist, detail → catalogdetail, chapter → catalogchapter). */
  fetch(input: { site: SourceConfig; url: string; method: FetchMethod; params?: ListParams }): Promise<Widget>;
  /** Đọc HTML đã có trong tay (trang đang mở ở trình duyệt); không truyền method thì tự đoán theo URL. */
  run(input: { site: SourceConfig; url: string; method?: FetchMethod; html: string }): Promise<Widget>;
  /** Dữ liệu phụ: danh sách thể loại, toàn bộ chương, URL trang truyện của một chương. */
  get(input: { site: SourceConfig; method: 'genre' | 'chapter' | 'manga'; url?: string; html?: string }): Promise<Widget>;
  /** Trang thuộc loại nào (URL patterns của addon gốc). `html` có thì đoán chính xác hơn. */
  match(input: { site: SourceConfig; url: string; html?: string }): UrlKind | null;
  /** Nhận diện theme từ HTML trang chủ khi người dùng thêm site. */
  detect?(html: string): boolean;
  /** Header cần gửi khi tải ảnh (Referer chống hotlink). */
  imageHeaders?(site: SourceConfig): Record<string, string>;
};

export type GetURLInput = Parameters<AddonModule['getURL']>[0];
export type FetchInput = Parameters<AddonModule['fetch']>[0];
export type RunInput = Parameters<AddonModule['run']>[0];
export type GetInput = Parameters<AddonModule['get']>[0];
export type MatchInput = Parameters<AddonModule['match']>[0];

/** Gói addon: dạng lưu trong app và dạng phát hành trên kho addon. */
export type AddonPackage = { info: AddonInfo; code: string };
