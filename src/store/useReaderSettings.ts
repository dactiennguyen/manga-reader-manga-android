import { create } from 'zustand';

/** Cách hiển thị trang truyện trong reader. */
export type ViewMode = 'vertical' | 'horizontal' | 'single' | 'double';

/** Hướng đọc khi ở chế độ ngang. Manga Nhật thường đọc phải sang trái. */
export type ReadingDirection = 'ltr' | 'rtl';

export type ReaderSettings = {
  viewMode: ViewMode;
  direction: ReadingDirection;
  autoScroll: boolean;
  /** Tốc độ tự cuộn, px/giây. Chỉ áp dụng cho viewMode 'vertical'. */
  autoScrollSpeed: number;
  tapToScroll: boolean;
  /** Cắt ảnh webtoon dài thành nhiều phần để cuộn mượt và tránh tràn texture. */
  splitLongImages: boolean;
  /** Số trang tải trước quanh trang đang xem. */
  preloadPages: number;
};

type ReaderSettingsActions = {
  setViewMode: (mode: ViewMode) => void;
  setDirection: (direction: ReadingDirection) => void;
  toggleAutoScroll: () => void;
  setAutoScrollSpeed: (speed: number) => void;
  toggleTapToScroll: () => void;
  toggleSplitLongImages: () => void;
  setPreloadPages: (count: number) => void;
  reset: () => void;
};

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  viewMode: 'vertical',
  direction: 'ltr',
  autoScroll: false,
  autoScrollSpeed: 60,
  tapToScroll: true,
  splitLongImages: true,
  preloadPages: 3,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const useReaderSettings = create<ReaderSettings & ReaderSettingsActions>()(
  set => ({
    ...DEFAULT_READER_SETTINGS,

    setViewMode: mode => set({ viewMode: mode }),
    setDirection: direction => set({ direction }),
    toggleAutoScroll: () => set(state => ({ autoScroll: !state.autoScroll })),
    setAutoScrollSpeed: speed =>
      set({ autoScrollSpeed: clamp(Math.round(speed), 10, 400) }),
    toggleTapToScroll: () =>
      set(state => ({ tapToScroll: !state.tapToScroll })),
    toggleSplitLongImages: () =>
      set(state => ({ splitLongImages: !state.splitLongImages })),
    setPreloadPages: count =>
      set({ preloadPages: clamp(Math.round(count), 0, 10) }),
    reset: () => set(DEFAULT_READER_SETTINGS),
  }),
);

/**
 * Selector hook: chỉ re-render khi đúng field đó đổi.
 * Dùng cái này thay vì lấy cả store để tránh render lại reader không cần thiết.
 */
export const useViewMode = () => useReaderSettings(state => state.viewMode);
export const useDirection = () => useReaderSettings(state => state.direction);

/** Hướng ngang chỉ có ý nghĩa khi đang ở chế độ horizontal/single/double. */
export const useIsDirectionRelevant = () =>
  useReaderSettings(state => state.viewMode !== 'vertical');
