import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { OrientationLock } from '../lib/screen';
import { persistStorage } from '../lib/storage';

export type ViewMode = 'vertical' | 'horizontal' | 'single' | 'double';

export type ReadingDirection = 'ltr' | 'rtl';

export type TapZone = 'edges' | 'topBottom' | 'leftRight' | 'off';

export type ViewerPrefs = {
  viewMode: ViewMode;
  direction: ReadingDirection;
  pageGap: boolean;
};

export type ReaderSettings = ViewerPrefs & {
  autoScroll: boolean;
  autoScrollSpeed: number;
  tapToScroll: boolean;
  tapZone: TapZone;
  highResImages: boolean;
  preloadPages: number;
  nextChapterDelay: number;
  immersive: boolean;
  keepScreenOn: boolean;
  orientationLock: OrientationLock;
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
  orientationLock: 'auto',
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

export const useViewMode = () => useReaderSettings(state => state.viewMode);
export const useDirection = () => useReaderSettings(state => state.direction);

export const useIsDirectionRelevant = () =>
  useReaderSettings(state => state.viewMode !== 'vertical');
