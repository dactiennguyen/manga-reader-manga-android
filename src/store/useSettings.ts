import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '../lib/storage';

export type ThemeMode = 'system' | 'light' | 'dark';

export type SearchEngineId = 'google' | 'bing' | 'duckduckgo' | 'yahoo' | 'yandex';

export type SearchCategory = 'web' | 'manga';

export type HomeWidgetId =
  | 'quickAccess'
  | 'mediaSites'
  | 'continueReading'
  | 'mangaBookmarks'
  | 'novelBookmarks'
  | 'webBookmarks';

export type HomeWidget = { id: HomeWidgetId; enabled: boolean; limit: number };

export type NovelFont =
  | 'system'
  | 'serif'
  | 'Bellota-Regular'
  | 'Charm-Regular'
  | 'Lato-Regular'
  | 'Merriweather-Regular'
  | 'PatrickHand-Regular'
  | 'Quicksand-Regular';

export type NovelTheme = 'light' | 'sepia' | 'dark' | 'black';

export type NovelSettings = {
  font: NovelFont;
  fontSize: number;
  lineHeight: number;
  theme: NovelTheme;
  ttsRate: number;
  ttsPitch: number;
};

export type AppSettings = {
  themeMode: ThemeMode;
  searchEngine: SearchEngineId;
  searchCategory: SearchCategory;
  safeSearch: boolean;
  homeWidgets: HomeWidget[];
  startPage: 'home' | 'lastTab';
  autoCloseTabs: 'never' | 'day' | 'week' | 'month';
  adblock: boolean;
  trackingProtection: boolean;
  blockPopups: boolean;
  appLinks: 'ask' | 'allow' | 'block';
  disableLongPressMenu: boolean;
  openNativeLinksInNewTab: boolean;
  autoRunAddon: boolean;
  showNsfw: boolean;
  ageConfirmed: boolean;
  libraryLayout: 'grid' | 'list';
  catalogLayout: 'grid' | 'list';
  checkUpdatesOnLaunch: boolean;
  promptBookmark: boolean;
  notifyUpdates: boolean;
  addonRepoUrl: string;
  autoUpdateAddons: boolean;
  hideStatusBar: boolean;
  preventCapture: boolean;
  tourDone: boolean;
  novel: NovelSettings;
};

export const DEFAULT_HOME_WIDGETS: HomeWidget[] = [
  { id: 'quickAccess', enabled: true, limit: 10 },
  { id: 'continueReading', enabled: true, limit: 6 },
  { id: 'mediaSites', enabled: true, limit: 8 },
  { id: 'mangaBookmarks', enabled: true, limit: 9 },
  { id: 'novelBookmarks', enabled: true, limit: 6 },
  { id: 'webBookmarks', enabled: true, limit: 8 },
];

export const DEFAULT_NOVEL_SETTINGS: NovelSettings = {
  font: 'system',
  fontSize: 18,
  lineHeight: 1.6,
  theme: 'light',
  ttsRate: 1,
  ttsPitch: 1,
};

export const DEFAULT_SETTINGS: AppSettings = {
  themeMode: 'system',
  searchEngine: 'google',
  searchCategory: 'web',
  safeSearch: true,
  homeWidgets: DEFAULT_HOME_WIDGETS,
  startPage: 'home',
  autoCloseTabs: 'never',
  adblock: true,
  trackingProtection: true,
  blockPopups: true,
  appLinks: 'ask',
  disableLongPressMenu: false,
  openNativeLinksInNewTab: true,
  autoRunAddon: false,
  showNsfw: false,
  ageConfirmed: false,
  libraryLayout: 'grid',
  catalogLayout: 'grid',
  checkUpdatesOnLaunch: true,
  promptBookmark: true,
  notifyUpdates: false,
  addonRepoUrl: '',
  autoUpdateAddons: true,
  hideStatusBar: false,
  preventCapture: false,
  tourDone: false,
  novel: DEFAULT_NOVEL_SETTINGS,
};

type SettingsActions = {
  set: (patch: Partial<AppSettings>) => void;
  setNovel: (patch: Partial<NovelSettings>) => void;
  updateHomeWidget: (id: HomeWidgetId, patch: Partial<Omit<HomeWidget, 'id'>>) => void;
  moveHomeWidget: (id: HomeWidgetId, delta: -1 | 1) => void;
  resetHomeWidgets: () => void;
  reset: () => void;
};

export const useSettings = create<AppSettings & SettingsActions>()(
  persist(
    set => ({
      ...DEFAULT_SETTINGS,
      set: patch => set(patch),
      setNovel: patch => set(state => ({ novel: { ...state.novel, ...patch } })),
      updateHomeWidget: (id, patch) =>
        set(state => ({
          homeWidgets: state.homeWidgets.map(w => (w.id === id ? { ...w, ...patch } : w)),
        })),
      moveHomeWidget: (id, delta) =>
        set(state => {
          const list = [...state.homeWidgets];
          const from = list.findIndex(w => w.id === id);
          const to = from + delta;
          if (from < 0 || to < 0 || to >= list.length) {
            return state;
          }
          [list[from], list[to]] = [list[to], list[from]];
          return { homeWidgets: list };
        }),
      resetHomeWidgets: () => set({ homeWidgets: DEFAULT_HOME_WIDGETS }),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'settings',
      storage: persistStorage,
      version: 1,
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<AppSettings>;
        const widgets = saved.homeWidgets ?? current.homeWidgets;
        const missing = DEFAULT_HOME_WIDGETS.filter(d => !widgets.some(w => w.id === d.id));
        return {
          ...current,
          ...saved,
          homeWidgets: [...widgets, ...missing],
          novel: { ...DEFAULT_NOVEL_SETTINGS, ...saved.novel },
        };
      },
    },
  ),
);

export const useAllowNsfw = () => useSettings(s => s.showNsfw && s.ageConfirmed);
