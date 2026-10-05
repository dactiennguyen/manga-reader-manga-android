import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { uid } from '../lib/id';
import { persistStorage } from '../lib/storage';

export type BrowserTab = {
  id: string;
  /** URL đang hiển thị (cập nhật theo điều hướng trong WebView). */
  url: string;
  title: string;
  incognito: boolean;
  desktop: boolean;
  /** Đang hiện trang chủ của app thay vì trang web. */
  showHome: boolean;
  /** Lệnh tải URL do app phát ra; seq tăng để tải lại cùng URL. */
  request: { url: string; seq: number };
  /** Tắt chặn quảng cáo riêng cho tab này. */
  adblockOff?: boolean;
  createdAt: number;
  lastActiveAt: number;
};

export type QuickAccessItem = { id: string; title: string; url: string };
export type WebBookmark = { id: string; title: string; url: string; addedAt: number };
export type SavedPage = {
  id: string;
  title: string;
  url: string;
  /** Đường dẫn file HTML trong thư mục app. */
  file: string;
  size: number;
  savedAt: number;
};

export const DEFAULT_QUICK_ACCESS: QuickAccessItem[] = [
  { id: 'qa-facebook', title: 'Facebook', url: 'https://m.facebook.com/' },
  { id: 'qa-youtube', title: 'YouTube', url: 'https://m.youtube.com/' },
  { id: 'qa-instagram', title: 'Instagram', url: 'https://www.instagram.com/' },
  { id: 'qa-reddit', title: 'Reddit', url: 'https://www.reddit.com/' },
  { id: 'qa-tiktok', title: 'TikTok', url: 'https://www.tiktok.com/' },
  { id: 'qa-pinterest', title: 'Pinterest', url: 'https://www.pinterest.com/' },
  { id: 'qa-wikipedia', title: 'Wikipedia', url: 'https://www.wikipedia.org/' },
  { id: 'qa-netflix', title: 'Netflix', url: 'https://www.netflix.com/' },
  { id: 'qa-x', title: 'X', url: 'https://x.com/' },
  { id: 'qa-gmail', title: 'Gmail', url: 'https://mail.google.com/' },
];

type OpenOptions = { incognito?: boolean; background?: boolean; desktop?: boolean };

type BrowserState = {
  tabs: BrowserTab[];
  activeTabId: string;
  quickAccess: QuickAccessItem[];
  webBookmarks: WebBookmark[];
  savedPages: SavedPage[];
  /** UA thật của WebView, dùng cho request của parser (cookie Cloudflare gắn UA). */
  userAgent?: string;
  /** "Remember decision for this site" khi trang muốn mở app khác. */
  appLinkDecisions: Record<string, 'allow' | 'block'>;

  newTab: (url?: string, options?: OpenOptions) => string;
  /** Mở URL trong tab hiện tại (hoặc tab mới nếu newTab). */
  openUrl: (url: string, options?: OpenOptions & { newTab?: boolean }) => void;
  closeTab: (id: string) => void;
  closeAllTabs: (incognito: boolean) => void;
  closeTabsOlderThan: (ms: number) => void;
  activateTab: (id: string) => void;
  updateTab: (id: string, patch: Partial<Omit<BrowserTab, 'id'>>) => void;
  showHome: (id: string, show: boolean) => void;

  addQuickAccess: (item: Omit<QuickAccessItem, 'id'>) => void;
  updateQuickAccess: (id: string, patch: Partial<Omit<QuickAccessItem, 'id'>>) => void;
  removeQuickAccess: (id: string) => void;
  resetQuickAccess: () => void;

  addWebBookmark: (item: { title: string; url: string }) => void;
  updateWebBookmark: (id: string, patch: { title?: string; url?: string }) => void;
  removeWebBookmarks: (ids: string[]) => void;

  /** Trả về id của trang vừa lưu. */
  addSavedPage: (page: Omit<SavedPage, 'id' | 'savedAt'>) => string;
  removeSavedPages: (ids: string[]) => void;

  setUserAgent: (ua: string) => void;
  setAppLinkDecision: (host: string, decision: 'allow' | 'block' | undefined) => void;
};

function makeTab(url = '', options: OpenOptions = {}): BrowserTab {
  const now = Date.now();
  return {
    id: uid(),
    url,
    title: '',
    incognito: !!options.incognito,
    desktop: !!options.desktop,
    showHome: !url,
    request: { url, seq: 0 },
    createdAt: now,
    lastActiveAt: now,
  };
}

const firstTab = makeTab();

export const useBrowser = create<BrowserState>()(
  persist(
    (set, get) => ({
      tabs: [firstTab],
      activeTabId: firstTab.id,
      quickAccess: DEFAULT_QUICK_ACCESS,
      webBookmarks: [],
      savedPages: [],
      appLinkDecisions: {},

      newTab: (url = '', options = {}) => {
        const tab = makeTab(url, options);
        set(state => ({
          tabs: [...state.tabs, tab],
          activeTabId: options.background ? state.activeTabId : tab.id,
        }));
        return tab.id;
      },

      openUrl: (url, options = {}) => {
        const state = get();
        const active = state.tabs.find(t => t.id === state.activeTabId);
        if (options.newTab || !active || (options.incognito ?? false) !== active.incognito) {
          state.newTab(url, options);
          return;
        }
        state.updateTab(active.id, {
          url,
          showHome: false,
          request: { url, seq: active.request.seq + 1 },
        });
      },

      closeTab: id =>
        set(state => {
          const index = state.tabs.findIndex(t => t.id === id);
          if (index < 0) {
            return state;
          }
          const closing = state.tabs[index];
          let tabs = state.tabs.filter(t => t.id !== id);
          let activeTabId = state.activeTabId;
          if (activeTabId === id) {
            // Ưu tiên tab cùng loại (thường/ẩn danh) bên cạnh.
            const sameKind = tabs.filter(t => t.incognito === closing.incognito);
            const neighbor =
              sameKind[Math.min(index, sameKind.length - 1)] ?? tabs[tabs.length - 1];
            activeTabId = neighbor?.id ?? '';
          }
          if (!tabs.length) {
            const tab = makeTab();
            tabs = [tab];
            activeTabId = tab.id;
          }
          return { tabs, activeTabId };
        }),

      closeAllTabs: incognito =>
        set(state => {
          let tabs = state.tabs.filter(t => t.incognito !== incognito);
          if (!tabs.length) {
            tabs = [makeTab()];
          }
          const activeTabId = tabs.some(t => t.id === state.activeTabId)
            ? state.activeTabId
            : tabs[tabs.length - 1].id;
          return { tabs, activeTabId };
        }),

      closeTabsOlderThan: ms =>
        set(state => {
          const cutoff = Date.now() - ms;
          const tabs = state.tabs.filter(t => t.id === state.activeTabId || t.lastActiveAt >= cutoff);
          return tabs.length === state.tabs.length ? state : { tabs };
        }),

      activateTab: id =>
        set(state => ({
          activeTabId: id,
          tabs: state.tabs.map(t => (t.id === id ? { ...t, lastActiveAt: Date.now() } : t)),
        })),

      updateTab: (id, patch) =>
        set(state => ({
          tabs: state.tabs.map(t => (t.id === id ? { ...t, ...patch } : t)),
        })),

      showHome: (id, show) =>
        set(state => ({
          tabs: state.tabs.map(t => (t.id === id ? { ...t, showHome: show } : t)),
        })),

      addQuickAccess: item =>
        set(state => ({ quickAccess: [...state.quickAccess, { ...item, id: uid() }] })),
      updateQuickAccess: (id, patch) =>
        set(state => ({
          quickAccess: state.quickAccess.map(q => (q.id === id ? { ...q, ...patch } : q)),
        })),
      removeQuickAccess: id =>
        set(state => ({ quickAccess: state.quickAccess.filter(q => q.id !== id) })),
      resetQuickAccess: () => set({ quickAccess: DEFAULT_QUICK_ACCESS }),

      addWebBookmark: item =>
        set(state => ({
          webBookmarks: [
            { ...item, id: uid(), addedAt: Date.now() },
            ...state.webBookmarks.filter(b => b.url !== item.url),
          ],
        })),
      updateWebBookmark: (id, patch) =>
        set(state => ({
          webBookmarks: state.webBookmarks.map(b => (b.id === id ? { ...b, ...patch } : b)),
        })),
      removeWebBookmarks: ids =>
        set(state => ({ webBookmarks: state.webBookmarks.filter(b => !ids.includes(b.id)) })),

      addSavedPage: page => {
        const id = uid();
        set(state => ({
          savedPages: [{ ...page, id, savedAt: Date.now() }, ...state.savedPages],
        }));
        return id;
      },
      removeSavedPages: ids =>
        set(state => ({ savedPages: state.savedPages.filter(p => !ids.includes(p.id)) })),

      setUserAgent: ua => set(state => (state.userAgent === ua ? state : { userAgent: ua })),
      setAppLinkDecision: (host, decision) =>
        set(state => {
          const next = { ...state.appLinkDecisions };
          if (decision) {
            next[host] = decision;
          } else {
            delete next[host];
          }
          return { appLinkDecisions: next };
        }),
    }),
    {
      name: 'browser',
      storage: persistStorage,
      version: 1,
      // Tab ẩn danh không được ghi xuống máy.
      partialize: state => {
        const tabs = state.tabs.filter(t => !t.incognito);
        const activeTabId = tabs.some(t => t.id === state.activeTabId)
          ? state.activeTabId
          : tabs[tabs.length - 1]?.id ?? '';
        return { ...state, tabs, activeTabId };
      },
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<BrowserState>;
        const tabs = saved.tabs?.length ? saved.tabs : current.tabs;
        const activeTabId = tabs.some(t => t.id === saved.activeTabId)
          ? (saved.activeTabId as string)
          : tabs[tabs.length - 1].id;
        return { ...current, ...saved, tabs, activeTabId };
      },
    },
  ),
);

export const useActiveTab = () =>
  useBrowser(state => state.tabs.find(t => t.id === state.activeTabId) ?? state.tabs[0]);
