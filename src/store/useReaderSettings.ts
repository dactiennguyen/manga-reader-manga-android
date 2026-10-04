import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '../lib/storage';

/** Cách hiển thị trang truyện trong reader. */
export type ViewMode = 'vertical' | 'horizontal' | 'single' | 'double';

/** Hướng đọc khi ở chế độ ngang. Manga Nhật thường đọc phải sang trái. */
export type ReadingDirection = 'ltr' | 'rtl';

/** Vùng chạm để cuộn/lật trang ("Tap here to set the touch area…"). */
export type TapZone = 'edges' | 'topBottom' | 'leftRight' | 'off';

export type ViewerPrefs = {
  viewMode: ViewMode;
  direction: ReadingDirection;
  /** Khoảng cách giữa các trang ở chế độ dọc ("Vertical viewer separator"). */
  pageGap: boolean;
};

export type ReaderSettings = ViewerPrefs & {
  autoScroll: boolean;
  /** Tốc độ tự cuộn, px/giây. Chỉ áp dụng cho viewMode 'vertical'. */
  autoScrollSpeed: number;
  tapToScroll: boolean;
  tapZone: TapZone;
  /** Ảnh độ phân giải gốc; tắt thì Android thu nhỏ ảnh quá lớn để tránh tràn texture. */
  highResImages: boolean;
  /** Số trang tải trước quanh trang đang xem. */
  preloadPages: number;
  /** Giây chờ rồi tự sang chương sau khi đọc hết; 0 = không tự chuyển. */
  nextChapterDelay: number;
  /** Ẩn thanh trạng thái/thanh công cụ khi đọc. */
  immersive: boolean;
  keepScreenOn: boolean;
  /** Ghi đè chế độ xem theo từng truyện (khi bỏ chọn "Áp dụng cho mọi truyện"). */
  overrides: Record<string, Partial<ViewerPrefs>>;
};

type ReaderSettingsActions = {
  set: (patch: Partial<Omit<ReaderSettings, 'overrides'>>) => void;
  setViewMode: (mode: ViewMode) => void;
  setDirection: (direction: ReadingDirection) => void;
  toggleAutoScroll: () => void;
  setAutoScrollSpeed: (speed: number) => void;
  toggleTapToScroll: () => void;
  setPreloadPages: (count: number) => void;
  setNextChapterDelay: (seconds: number) => void;
  /** Lưu prefs cho riêng một truyện, hoặc mặc định chung nếu mangaKey rỗng. */
  setViewerPrefs: (prefs: Partial<ViewerPrefs>, mangaKey?: string) => void;
  clearOverride: (mangaKey: string) => void;
  reset: () => void;
};

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  viewMode: 'vertical',
  direction: 'ltr',
  pageGap: false,
  autoScroll: false,
  autoScrollSpeed: 60,
  tapToScroll: true,
  tapZone: 'edges',
  highResImages: false,
  preloadPages: 3,
  nextChapterDelay: 3,
  immersive: false,
  keepScreenOn: true,
  overrides: {},
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const useReaderSettings = create<ReaderSettings & ReaderSettingsActions>()(
  persist(
    set => ({
      ...DEFAULT_READER_SETTINGS,

      set: patch => set(patch),
      setViewMode: mode => set({ viewMode: mode }),
      setDirection: direction => set({ direction }),
      toggleAutoScroll: () => set(state => ({ autoScroll: !state.autoScroll })),
      setAutoScrollSpeed: speed =>
        set({ autoScrollSpeed: clamp(Math.round(speed), 10, 400) }),
      toggleTapToScroll: () =>
        set(state => ({ tapToScroll: !state.tapToScroll })),
      setPreloadPages: count =>
        set({ preloadPages: clamp(Math.round(count), 0, 10) }),
      setNextChapterDelay: seconds =>
        set({ nextChapterDelay: clamp(Math.round(seconds), 0, 10) }),
      setViewerPrefs: (prefs, mangaKey) =>
        set(state => {
          if (!mangaKey) {
            return prefs;
          }
          return {
            overrides: {
              ...state.overrides,
              [mangaKey]: { ...state.overrides[mangaKey], ...prefs },
            },
          };
        }),
      clearOverride: mangaKey =>
        set(state => {
          const overrides = { ...state.overrides };
          delete overrides[mangaKey];
          return { overrides };
        }),
      reset: () => set(DEFAULT_READER_SETTINGS),
    }),
    { name: 'reader-settings', storage: persistStorage, version: 1 },
  ),
);

/**
 * Prefs thực tế cho một truyện: override riêng (nếu có) đè lên mặc định.
 * Trả về object mới mỗi lần đổi — dùng với useShallow hoặc lấy từng field.
 */
export function resolveViewerPrefs(
  state: ReaderSettings,
  mangaKey?: string,
): ViewerPrefs & { overridden: boolean } {
  const override = mangaKey ? state.overrides[mangaKey] : undefined;
  return {
    viewMode: override?.viewMode ?? state.viewMode,
    direction: override?.direction ?? state.direction,
    pageGap: override?.pageGap ?? state.pageGap,
    overridden: !!override,
  };
}

/**
 * Selector hook: chỉ re-render khi đúng field đó đổi.
 * Dùng cái này thay vì lấy cả store để tránh render lại reader không cần thiết.
 */
export const useViewMode = () => useReaderSettings(state => state.viewMode);
export const useDirection = () => useReaderSettings(state => state.direction);

/** Hướng ngang chỉ có ý nghĩa khi đang ở chế độ horizontal/single/double. */
export const useIsDirectionRelevant = () =>
  useReaderSettings(state => state.viewMode !== 'vertical');
