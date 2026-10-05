import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Linking, Share, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { useAppNavigation } from '../../app/routes';
import { Dialog } from '../../components/Sheet';
import { confirm, toast } from '../../components/ui';
import { errorMessage } from '../../lib/http';
import { storage } from '../../lib/storage';
import { getHost, getOrigin, looksLikeUrl, sameUrl } from '../../lib/url';
import { detectEngine, type EngineId } from '../../sources';
import { useActiveTab, useBrowser } from '../../store/useBrowser';
import { useHistory } from '../../store/useHistory';
import { useSettings } from '../../store/useSettings';
import { findSourceForUrl, useSources } from '../../store/useSources';
import { useIsWide, useTheme } from '../../theme';
import { AdblockSheet } from './AdblockSheet';
import { runAddonOnPage } from './addon';
import { AddressBar, type AddonState, type AddressBarHandle } from './AddressBar';
import { BrowserMenu, type MenuAction } from './BrowserMenu';
import {
  BrowserWebView,
  type BlockStats,
  type BrowserWebViewHandle,
  type NavState,
  type PageMessage,
} from './BrowserWebView';
import { AppLinkDialog, BookmarkDialog, SavePageDialog } from './Dialogs';
import { FindBar, type FindResult } from './FindBar';
import { HomePage } from './HomePage';
import { useEvent } from './hooks';
import { LinkMenu, type LinkTarget } from './LinkMenu';
import { clearSiteCookies, launchExternal, savePage } from './pageActions';
import { MediaSheet, type MediaFound } from './MediaSheet';
import {
  JS_CLEAR_STORAGE,
  JS_FIND_CLEAR,
  JS_FIND_MEDIA,
  jsFind,
  jsFindStep,
  jsRequestHtml,
  type HtmlPurpose,
} from './scripts';
import { resolveInput } from './searchEngines';
import { Snackbar, type SnackbarData } from './Snackbar';
import { SuggestionsPanel } from './SuggestionsPanel';
import { TabStrip } from './TabStrip';
import { CoachMarks, useTourTargets, type TourStep } from './Tour';

const ADDON_STEP: TourStep = {
  key: 'addon',
  text: 'Mảnh ghép chuyển xanh khi trang đang xem được addon hỗ trợ: bấm để đọc trang bằng giao diện đọc truyện của app. Khi mảnh ghép xám, bấm để xem các site được hỗ trợ.',
};

const TOUR_STEPS: TourStep[] = [
  ADDON_STEP,
  {
    key: 'address',
    text: 'Nhập địa chỉ web hoặc từ khoá. Trong lúc gõ, bạn có thể đổi công cụ tìm kiếm hoặc chuyển sang tìm truyện.',
  },
  { key: 'tabs', text: 'Xem và quản lý các tab đang mở, kể cả tab ẩn danh. Nhấn giữ để mở tab mới.' },
  {
    key: 'menu',
    text: 'Menu: lùi, tiến, tải lại, trang chủ, bookmark trang này, cùng lịch sử, tải xuống, addon, cài đặt và các công cụ cho trang đang xem.',
  },
  { key: 'mediaSites', text: 'Các site truyện bạn đã thêm nằm ở đây. Bấm vào một site để mở danh sách truyện.' },
];

/** Đã hiện gợi ý cho nút "Chạy addon" (khi tour chính chưa giới thiệu được nút này). */
const ADDON_HINT_KEY = 'browser:addonHintShown';
/** Giới hạn HTML gửi về để nhận diện theme — đủ để thấy dấu hiệu của theme. */
const DETECT_LIMIT = 300000;
const RUN_TIMEOUT = 15000;

const ZERO_STATS: BlockStats = { ads: 0, trackers: 0 };
const EMPTY_NAV = { tabId: '', canGoBack: false, canGoForward: false, loading: false, progress: 1 };
const EMPTY_FIND: FindResult = { count: 0, index: -1 };

/** Mở app lần đầu trong phiên: áp dụng trang khởi động và link mở từ app khác. */
let bootHandled = false;

function cleanTitle(title: string, url: string): string {
  const value = (title ?? '').trim();
  return !value || value === url || /^(https?|about|data):/i.test(value) ? '' : value;
}

export function BrowserScreen() {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  // Tablet: thanh địa chỉ có ← → ⟳ và bookmark, dải tab ngang như app gốc.
  const wide = useIsWide();
  const isFocused = useIsFocused();
  const tab = useActiveTab();
  const tabCount = useBrowser(s => s.tabs.reduce((n, t) => (t.incognito === tab.incognito ? n + 1 : n), 0));
  const webBookmarks = useBrowser(s => s.webBookmarks);
  const settings = useSettings(
    useShallow(s => ({
      adblock: s.adblock,
      trackingProtection: s.trackingProtection,
      blockPopups: s.blockPopups,
      appLinks: s.appLinks,
      disableLongPressMenu: s.disableLongPressMenu,
      autoRunAddon: s.autoRunAddon,
      searchEngine: s.searchEngine,
      searchCategory: s.searchCategory,
      safeSearch: s.safeSearch,
      tourDone: s.tourDone,
      set: s.set,
    })),
  );

  const webRef = useRef<BrowserWebViewHandle>(null);
  const addressRef = useRef<AddressBarHandle>(null);
  const tour = useTourTargets();

  const hasPage = !!(tab.request.url || tab.url);
  const showingHome = tab.showHome || !hasPage;
  const pageUrl = showingHome ? '' : tab.url || tab.request.url;
  const pageHost = getHost(pageUrl);
  const adblockActive = settings.adblock && !tab.adblockOff;

  // Trạng thái của WebView đang mở; gắn tab id để bỏ qua dữ liệu của tab trước.
  const [nav, setNav] = useState(EMPTY_NAV);
  const navState = nav.tabId === tab.id ? nav : EMPTY_NAV;
  const [crashKey, setCrashKey] = useState(0);
  const [blockStats, setBlockStats] = useState<Record<string, BlockStats>>({});
  const pageStats = blockStats[tab.id] ?? ZERO_STATS;

  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState('');
  const [find, setFind] = useState<{ tabId: string; result: FindResult } | null>(null);
  const findOpen = !!find && find.tabId === tab.id && !showingHome;
  const [menuOpen, setMenuOpen] = useState(false);
  const [adblockSheet, setAdblockSheet] = useState(false);
  const [bookmarkDialog, setBookmarkDialog] = useState(false);
  const [mediaFound, setMediaFound] = useState<MediaFound | null>(null);
  /** Đang chờ trang trả danh sách media (bấm "Tải video trên trang"). */
  const mediaPending = useRef(false);
  const [saveDialog, setSaveDialog] = useState<{ saving: boolean } | null>(null);
  const [linkTarget, setLinkTarget] = useState<LinkTarget | null>(null);
  const [appLink, setAppLink] = useState<{ url: string; host: string } | null>(null);
  const [snack, setSnack] = useState<SnackbarData | null>(null);
  const [addonBusy, setAddonBusy] = useState(false);
  const [detected, setDetected] = useState<{ host: string; engine: EngineId } | null>(null);
  const [tourPrompt, setTourPrompt] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [tourSteps, setTourSteps] = useState<TourStep[] | null>(null);

  const pendingRun = useRef(false);
  const autoRan = useRef(new Set<string>());
  /** host → engine nhận diện được, hoặc số lần nhận diện thất bại. */
  const detectCache = useRef(new Map<string, EngineId | number>());
  const saveName = useRef<string | null>(null);
  const homeViaButton = useRef(false);
  const runTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Nguồn đã thêm ứng với trang đang xem (cập nhật khi danh sách nguồn đổi).
  const source = useSources(() => (pageUrl ? findSourceForUrl(pageUrl) : undefined));
  const addonState: AddonState = !pageUrl
    ? null
    : source
    ? 'source'
    : detected && detected.host === pageHost
    ? 'detected'
    : null;
  const bookmark = pageUrl ? webBookmarks.find(b => sameUrl(b.url, pageUrl)) : undefined;
  const overlayOpen =
    menuOpen ||
    adblockSheet ||
    bookmarkDialog ||
    !!saveDialog ||
    !!linkTarget ||
    !!mediaFound ||
    !!appLink ||
    tourPrompt ||
    !!tourSteps;

  useEffect(
    () => () => {
      clearTimeout(runTimer.current);
      clearTimeout(focusTimer.current);
    },
    [],
  );

  // Đổi tab: huỷ thao tác đang dở của tab cũ.
  useEffect(() => {
    pendingRun.current = false;
    homeViaButton.current = false;
    clearTimeout(runTimer.current);
    setAddonBusy(false);
  }, [tab.id]);

  // ─── Khởi động: trang chủ, link mở từ app khác ──────────────────────────
  useEffect(() => {
    if (!bootHandled) {
      bootHandled = true;
      const { startPage } = useSettings.getState();
      const state = useBrowser.getState();
      const active = state.tabs.find(t => t.id === state.activeTabId);
      if (startPage === 'home' && active && !active.showHome) {
        state.showHome(active.id, true);
      }
      Linking.getInitialURL()
        .then(url => {
          if (url && /^https?:/i.test(url)) {
            useBrowser.getState().openUrl(url, { newTab: true });
          }
        })
        .catch(() => {});
    }
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (/^https?:/i.test(url)) {
        useBrowser.getState().openUrl(url, { newTab: true });
        navigation.popTo('Browser');
      }
    });
    return () => subscription.remove();
  }, [navigation]);

  // Tab ẩn danh: chữ thanh trạng thái sáng trên nền tối.
  useFocusEffect(
    useCallback(() => {
      if (!tab.incognito) {
        return undefined;
      }
      const entry = StatusBar.pushStackEntry({ barStyle: 'light-content' });
      return () => StatusBar.popStackEntry(entry);
    }, [tab.incognito]),
  );

  // ─── Mở URL ─────────────────────────────────────────────────────────────
  const openInTab = useEvent((url: string) => {
    homeViaButton.current = false;
    useBrowser.getState().openUrl(url, { incognito: tab.incognito });
  });

  const submitText = useEvent((raw: string) => {
    const text = raw.trim();
    if (!text) {
      return;
    }
    addressRef.current?.blur();
    setEditing(false);
    if (settings.searchCategory === 'manga' && !looksLikeUrl(text)) {
      navigation.navigate('MangaSearch', { query: text });
      return;
    }
    if (!looksLikeUrl(text) && !tab.incognito) {
      useHistory.getState().addSearch(text, 'web');
    }
    openInTab(resolveInput(text, settings.searchEngine, settings.safeSearch));
  });

  const openFromSuggestion = useEvent((url: string) => {
    addressRef.current?.blur();
    setEditing(false);
    openInTab(url);
  });

  const focusAddress = useEvent(() => addressRef.current?.focus());

  const focusAddressSoon = () => {
    clearTimeout(focusTimer.current);
    // Đợi sheet đóng hẳn rồi mới focus, nếu không bàn phím không bật.
    focusTimer.current = setTimeout(() => addressRef.current?.focus(), 350);
  };

  // ─── Addon ──────────────────────────────────────────────────────────────
  const requestHtml = (purpose: HtmlPurpose, limit = 0) => webRef.current?.inject(jsRequestHtml(purpose, limit));

  const startRun = () => {
    if (!pageUrl) {
      return;
    }
    if (addonState === 'detected' && detected) {
      navigation.navigate('AddSite', { url: getOrigin(pageUrl), engine: detected.engine });
      return;
    }
    if (navState.loading && navState.progress < 1) {
      pendingRun.current = true;
      toast('Đang tải trang, addon sẽ tự chạy khi trang tải xong');
      return;
    }
    setAddonBusy(true);
    clearTimeout(runTimer.current);
    runTimer.current = setTimeout(() => {
      setAddonBusy(false);
      toast('Không đọc được nội dung trang, hãy thử tải lại trang');
    }, RUN_TIMEOUT);
    requestHtml('run');
  };

  // Mảnh ghép xám (trang không được hỗ trợ / trang chủ): mở danh sách site được hỗ trợ.
  const onAddonPress = () => {
    if (addonState) {
      startRun();
    } else {
      navigation.navigate('Addons');
    }
  };

  const handleHtml = (purpose: HtmlPurpose, url: string, html: string) => {
    const target = url || pageUrl;
    switch (purpose) {
      case 'detect': {
        const host = getHost(target);
        const found = html ? detectEngine(html) : null;
        if (found) {
          detectCache.current.set(host, found);
          setDetected({ host, engine: found });
        } else {
          const attempts = detectCache.current.get(host);
          detectCache.current.set(host, typeof attempts === 'number' ? attempts + 1 : 1);
        }
        return;
      }
      case 'save':
        finishSave(target, html);
        return;
      case 'autorun':
        if (html && isFocused) {
          runAddonOnPage(navigation, target, html, true);
        }
        return;
      case 'run':
        clearTimeout(runTimer.current);
        if (!html) {
          setAddonBusy(false);
          toast('Không đọc được nội dung trang, hãy thử tải lại trang');
          return;
        }
        runAddonOnPage(navigation, target, html).finally(() => setAddonBusy(false));
        return;
    }
  };

  // ─── Sự kiện từ WebView ─────────────────────────────────────────────────
  const onNavigation = useEvent((state: NavState) => {
    setNav(prev => ({
      tabId: tab.id,
      canGoBack: state.canGoBack,
      canGoForward: state.canGoForward,
      loading: state.loading,
      progress: prev.tabId === tab.id ? prev.progress : 0,
    }));
    const title = cleanTitle(state.title, state.url);
    const patch: { url?: string; title?: string } = {};
    if (state.url && state.url !== tab.url && !/^about:blank/i.test(state.url)) {
      patch.url = state.url;
    }
    if (title && title !== tab.title) {
      patch.title = title;
    }
    if (patch.url || patch.title) {
      useBrowser.getState().updateTab(tab.id, patch);
    }
    if (!state.loading && title && !tab.incognito) {
      useHistory.getState().updateWebTitle(state.url, title);
    }
  });

  const onProgress = useEvent((progress: number) =>
    setNav(prev => ({ ...(prev.tabId === tab.id ? prev : { ...EMPTY_NAV, tabId: tab.id }), progress })),
  );

  const onPageReady = useEvent((url: string, title: string) => {
    if (!/^https?:/i.test(url)) {
      return;
    }
    if (!tab.incognito) {
      useHistory.getState().addWeb({ url, title: cleanTitle(title, url) });
    }
    if (pendingRun.current) {
      pendingRun.current = false;
      startRun();
      return;
    }
    if (findSourceForUrl(url)) {
      if (settings.autoRunAddon && isFocused && !tab.showHome && !autoRan.current.has(url)) {
        autoRan.current.add(url);
        requestHtml('autorun');
      }
      return;
    }
    const host = getHost(url);
    const cached = detectCache.current.get(host);
    if (typeof cached === 'string') {
      setDetected({ host, engine: cached });
    } else if ((cached ?? 0) < 2) {
      requestHtml('detect', DETECT_LIMIT);
    }
  });

  const onPageMessage = useEvent((message: PageMessage) => {
    switch (message.type) {
      case 'html':
        handleHtml(message.purpose, message.url, message.html);
        return;
      case 'longpress':
        if (!settings.disableLongPressMenu && isFocused) {
          setLinkTarget({ href: message.href, text: message.text, src: message.src });
        }
        return;
      case 'find':
        setFind(prev =>
          prev && prev.tabId === tab.id ? { ...prev, result: { count: message.count, index: message.index } } : prev,
        );
        return;
      case 'media':
        if (!mediaPending.current) {
          return;
        }
        mediaPending.current = false;
        if (message.items.length) {
          setMediaFound({ pageUrl: message.url, items: message.items });
        } else {
          toast('Không tìm thấy video tải được trên trang này (video phát trực tuyến dạng luồng không tải được)');
        }
        return;
    }
  });

  const onBlockStats = useEvent((tabId: string, stats: BlockStats) =>
    setBlockStats(prev => ({ ...prev, [tabId]: stats })),
  );

  const openExternal = useEvent(async (url: string) => {
    const result = await launchExternal(url);
    if (typeof result === 'string') {
      openInTab(result);
    } else if (!result) {
      toast('Không tìm thấy ứng dụng để mở liên kết này');
    }
  });

  const onExternalLink = useEvent((url: string) => {
    const host = getHost(tab.url);
    const decisions = useBrowser.getState().appLinkDecisions;
    // Lựa chọn đã ghi nhớ cho trang này được ưu tiên hơn cài đặt chung.
    const decision = host in decisions ? decisions[host] : settings.appLinks;
    if (decision === 'allow') {
      openExternal(url);
    } else if (decision === 'ask' && !appLink && isFocused) {
      setAppLink({ url, host });
    }
  });

  const onPopup = useEvent((url: string) => {
    if (!settings.blockPopups) {
      useBrowser.getState().newTab(url, { incognito: tab.incognito });
      return;
    }
    setSnack({
      id: Date.now(),
      message: 'Đã chặn cửa sổ bật lên',
      action: { label: 'Mở', onPress: () => useBrowser.getState().newTab(url, { incognito: tab.incognito }) },
    });
  });

  const onCrash = useEvent(() => {
    toast('Trang đã bị dừng do thiếu bộ nhớ, đang tải lại…');
    setCrashKey(k => k + 1);
  });

  const hideSnack = useEvent(() => setSnack(null));

  // ─── Điều hướng ─────────────────────────────────────────────────────────
  const showHome = (show: boolean) => useBrowser.getState().showHome(tab.id, show);

  const goBack = () => {
    if (showingHome) {
      return;
    }
    if (navState.canGoBack) {
      webRef.current?.goBack();
    } else {
      homeViaButton.current = false;
      showHome(true);
    }
  };

  const goForward = () => {
    if (tab.showHome && hasPage) {
      showHome(false);
    } else if (navState.canGoForward) {
      webRef.current?.goForward();
    }
  };

  const goHome = () => {
    if (!tab.showHome) {
      homeViaButton.current = hasPage;
      showHome(true);
    }
  };

  const closeFind = useEvent(() => {
    webRef.current?.inject(JS_FIND_CLEAR);
    setFind(null);
  });

  const onFindQuery = useEvent((text: string) => {
    if (text) {
      webRef.current?.inject(jsFind(text));
    } else {
      webRef.current?.inject(JS_FIND_CLEAR);
      setFind(prev => (prev ? { ...prev, result: EMPTY_FIND } : prev));
    }
  });

  const handleBack = useEvent((): boolean => {
    if (editing) {
      addressRef.current?.blur();
      return true;
    }
    if (findOpen) {
      closeFind();
      return true;
    }
    if (!showingHome) {
      goBack();
      return true;
    }
    if (tab.showHome && hasPage && homeViaButton.current) {
      homeViaButton.current = false;
      showHome(false);
      return true;
    }
    if (useBrowser.getState().tabs.length > 1) {
      const id = tab.id;
      confirm('Bạn đã ở trang đầu của tab này, đóng tab hiện tại?', undefined, {
        confirmText: 'Đóng tab',
        destructive: true,
      }).then(ok => ok && useBrowser.getState().closeTab(id));
      return true;
    }
    return false;
  });

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', handleBack);
      return () => subscription.remove();
    }, [handleBack]),
  );

  // ─── Menu ───────────────────────────────────────────────────────────────
  // Menu là Modal nên sẽ nổi đè lên màn khác nếu có màn được đẩy lên (vd. addon tự chạy) → đóng khi rời màn.
  useFocusEffect(useCallback(() => () => setMenuOpen(false), []));

  const clearSiteData = async () => {
    const url = pageUrl;
    const ok = await confirm('Xoá cookie và dữ liệu trang?', `Bạn có thể bị đăng xuất khỏi ${getHost(url)}.`, {
      confirmText: 'Xoá',
      destructive: true,
    });
    if (!ok) {
      return;
    }
    try {
      await clearSiteCookies(url);
      webRef.current?.inject(JS_CLEAR_STORAGE);
      webRef.current?.reload();
      toast('Đã xoá cookie và dữ liệu trang');
    } catch (error) {
      toast(`Không xoá được: ${errorMessage(error)}`);
    }
  };

  const handleMenu = (action: MenuAction) => {
    setMenuOpen(false);
    const store = useBrowser.getState();
    switch (action) {
      case 'back':
        goBack();
        return;
      case 'forward':
        goForward();
        return;
      case 'home':
        goHome();
        return;
      case 'stop':
        webRef.current?.stop();
        return;
      case 'newTab':
        store.newTab();
        focusAddressSoon();
        return;
      case 'newIncognitoTab':
        store.newTab('', { incognito: true });
        focusAddressSoon();
        return;
      case 'bookmarks':
        navigation.navigate('Bookmarks');
        return;
      case 'history':
        navigation.navigate('History');
        return;
      case 'downloads':
        navigation.navigate('Downloads');
        return;
      case 'addons':
        navigation.navigate('Addons');
        return;
      case 'stats':
        navigation.navigate('ReadingStats');
        return;
      case 'settings':
        navigation.navigate('Settings');
        return;
      case 'qr':
        navigation.navigate('QRScanner');
        return;
      case 'runAddon':
        startRun();
        return;
      case 'bookmarkPage':
        setBookmarkDialog(true);
        return;
      case 'find':
        setFind({ tabId: tab.id, result: EMPTY_FIND });
        return;
      case 'desktop':
        // BrowserWebView tự tải lại khi UA đổi.
        store.updateTab(tab.id, { desktop: !tab.desktop });
        return;
      case 'share':
        Share.share({ message: pageUrl, title: tab.title }).catch(() => {});
        return;
      case 'openExternal':
        Linking.openURL(pageUrl).catch(() => toast('Không tìm thấy ứng dụng phù hợp'));
        return;
      case 'savePage':
        setSaveDialog({ saving: false });
        return;
      case 'viewSource':
        navigation.navigate('ViewSource', { url: pageUrl });
        return;
      case 'findMedia':
        mediaPending.current = true;
        webRef.current?.inject(JS_FIND_MEDIA);
        return;
      case 'adblock':
        setAdblockSheet(true);
        return;
      case 'clearSiteData':
        clearSiteData();
        return;
      case 'reload':
        webRef.current?.reload();
        return;
    }
  };

  const startSave = (name: string) => {
    saveName.current = name;
    setSaveDialog({ saving: true });
    requestHtml('save');
  };

  async function finishSave(url: string, html: string) {
    const name = saveName.current;
    if (name === null) {
      return;
    }
    saveName.current = null;
    setSaveDialog(null);
    if (!html) {
      toast('Không đọc được nội dung trang');
      return;
    }
    try {
      const id = await savePage(name, url, html);
      setSnack({
        id: Date.now(),
        message: 'Đã lưu trang để đọc offline',
        action: id ? { label: 'Xem', onPress: () => navigation.navigate('SavedPage', { id }) } : undefined,
      });
    } catch (error) {
      toast(`Không lưu được trang: ${errorMessage(error)}`);
    }
  }

  const resolveAppLink = (open: boolean, remember: boolean) => {
    const current = appLink;
    setAppLink(null);
    if (!current) {
      return;
    }
    if (remember && current.host) {
      useBrowser.getState().setAppLinkDecision(current.host, open ? 'allow' : 'block');
    }
    if (open) {
      openExternal(current.url);
    }
  };

  // ─── Hướng dẫn lần đầu ──────────────────────────────────────────────────
  useEffect(() => {
    if (settings.tourDone || promptDismissed || !isFocused || overlayOpen || editing) {
      return;
    }
    const timer = setTimeout(() => setTourPrompt(true), 1200);
    return () => clearTimeout(timer);
  }, [settings.tourDone, promptDismissed, isFocused, overlayOpen, editing]);

  // Tour chính chưa giới thiệu được nút "Chạy addon" (lúc đó chưa có) → gợi ý khi nút xuất hiện.
  useEffect(() => {
    if (!addonState || !settings.tourDone || !isFocused || editing || overlayOpen) {
      return;
    }
    if (storage.getBoolean(ADDON_HINT_KEY)) {
      return;
    }
    const timer = setTimeout(() => setTourSteps([ADDON_STEP]), 800);
    return () => clearTimeout(timer);
  }, [addonState, settings.tourDone, isFocused, editing, overlayOpen]);

  const startTour = () => {
    setTourPrompt(false);
    setPromptDismissed(true);
    addressRef.current?.blur();
    setTourSteps(TOUR_STEPS);
  };

  const finishTour = useEvent((shown: string[]) => {
    const main = tourSteps === TOUR_STEPS;
    setTourSteps(null);
    if (main) {
      settings.set({ tourDone: true });
    }
    if (shown.includes(ADDON_STEP.key) || !main) {
      storage.set(ADDON_HINT_KEY, true);
    }
  });

  const newTabFromBar = () => {
    useBrowser.getState().newTab('', { incognito: tab.incognito });
    focusAddressSoon();
  };

  // ─── Giao diện ──────────────────────────────────────────────────────────
  const showProgress = !showingHome && navState.loading && navState.progress < 1;

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <AddressBar
        ref={addressRef}
        url={pageUrl}
        incognito={tab.incognito}
        category={settings.searchCategory}
        editing={editing}
        query={query}
        onChangeQuery={setQuery}
        onFocus={() => {
          setQuery(pageUrl);
          setEditing(true);
        }}
        onBlur={() => setEditing(false)}
        onSubmit={() => submitText(query)}
        addon={addonState}
        addonBusy={addonBusy}
        onAddonPress={onAddonPress}
        shield={pageUrl ? { active: adblockActive, count: pageStats.ads + pageStats.trackers } : null}
        onShieldPress={() => setAdblockSheet(true)}
        onQrPress={() => navigation.navigate('QRScanner')}
        tabCount={tabCount}
        onTabsPress={() => navigation.navigate('Tabs')}
        onNewTab={newTabFromBar}
        onMenuPress={() => setMenuOpen(true)}
        registerTour={tour.register}
        wide={
          wide
            ? {
                canBack: !showingHome,
                canForward: (tab.showHome && hasPage) || (!showingHome && navState.canGoForward),
                loading: showProgress,
                onBack: goBack,
                onForward: goForward,
                onReload: () => (showProgress ? webRef.current?.stop() : webRef.current?.reload()),
                bookmarked: pageUrl && !showingHome ? !!bookmark : null,
                onBookmarkPress: () => setBookmarkDialog(true),
              }
            : undefined
        }
      />
      {wide && !editing && <TabStrip activeTab={tab} onNewTab={newTabFromBar} />}

      <View style={styles.content}>
        {hasPage && (
          <View style={StyleSheet.absoluteFill} pointerEvents={showingHome ? 'none' : 'auto'}>
            <BrowserWebView
              key={`${tab.id}:${crashKey}`}
              ref={webRef}
              tab={tab}
              adblock={adblockActive}
              trackingProtection={settings.trackingProtection}
              longPress={!settings.disableLongPressMenu}
              onNavigation={onNavigation}
              onProgress={onProgress}
              onPageReady={onPageReady}
              onMessage={onPageMessage}
              onBlockStats={onBlockStats}
              onExternalLink={onExternalLink}
              onPopup={onPopup}
              onCrash={onCrash}
            />
          </View>
        )}
        {showingHome && (
          <HomePage
            style={StyleSheet.absoluteFill}
            incognito={tab.incognito}
            onOpenUrl={openInTab}
            onFocusSearch={focusAddress}
            registerTour={tour.register}
          />
        )}
        {showProgress && (
          <View
            style={[styles.progress, { backgroundColor: c.accent, width: `${Math.max(5, navState.progress * 100)}%` }]}
          />
        )}
        {editing && (
          <SuggestionsPanelHost
            query={query}
            pageUrl={pageUrl}
            title={tab.title}
            onSubmitText={submitText}
            onOpenUrl={openFromSuggestion}
            onFill={setQuery}
          />
        )}
        <Snackbar data={snack} onHide={hideSnack} />
      </View>

      {!editing && findOpen && find && (
        <FindBar
          result={find.result}
          onQuery={onFindQuery}
          onStep={d => webRef.current?.inject(jsFindStep(d))}
          onClose={closeFind}
        />
      )}
      {/* Vùng thanh cử chỉ: cùng màu thanh tìm trong trang khi đang mở, còn lại theo nền trang. */}
      <View style={{ height: insets.bottom, backgroundColor: !editing && findOpen ? c.surface : c.bg }} />

      <BrowserMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        page={pageUrl ? { url: pageUrl, title: tab.title } : null}
        nav={{
          canBack: !showingHome,
          canForward: (tab.showHome && hasPage) || (!showingHome && navState.canGoForward),
          loading: showProgress,
          atHome: showingHome,
        }}
        bookmarked={!!bookmark}
        desktop={tab.desktop}
        blocked={pageStats.ads + pageStats.trackers}
        adblockActive={adblockActive}
        addon={addonState}
        onAction={handleMenu}
      />
      <AdblockSheet
        visible={adblockSheet}
        onClose={() => setAdblockSheet(false)}
        stats={pageStats}
        globalEnabled={settings.adblock}
        tabEnabled={!tab.adblockOff}
        onToggleTab={enabled => useBrowser.getState().updateTab(tab.id, { adblockOff: !enabled })}
        onOpenSettings={() => {
          setAdblockSheet(false);
          navigation.navigate('AdblockSettings');
        }}
      />
      <LinkMenu target={linkTarget} pageUrl={tab.url} incognito={tab.incognito} onClose={() => setLinkTarget(null)} />
      <MediaSheet found={mediaFound} onClose={() => setMediaFound(null)} />
      {bookmarkDialog && !!pageUrl && (
        <BookmarkDialog
          page={{ url: pageUrl, title: tab.title }}
          existing={bookmark}
          onClose={() => setBookmarkDialog(false)}
        />
      )}
      {saveDialog && (
        <SavePageDialog
          defaultName={tab.title || pageHost || 'Trang đã lưu'}
          saving={saveDialog.saving}
          onSave={startSave}
          onClose={() => {
            saveName.current = null;
            setSaveDialog(null);
          }}
        />
      )}
      {appLink && (
        <AppLinkDialog
          url={appLink.url}
          host={appLink.host}
          onOpen={remember => resolveAppLink(true, remember)}
          onBlock={remember => resolveAppLink(false, remember)}
        />
      )}
      <Dialog
        visible={tourPrompt && !tourSteps}
        onClose={() => {
          setTourPrompt(false);
          setPromptDismissed(true);
        }}
        title="Bạn có muốn xem hướng dẫn nhanh?"
        message="Vài bước ngắn giới thiệu cách chạy addon, đổi công cụ tìm kiếm và quản lý tab."
        actions={[
          {
            label: 'Để sau',
            onPress: () => {
              setTourPrompt(false);
              setPromptDismissed(true);
            },
          },
          { label: 'Bắt đầu', onPress: startTour, variant: 'primary' },
        ]}
      />
      {tourSteps && <CoachMarks steps={tourSteps} measure={tour.measure} onFinish={finishTour} />}
    </View>
  );
}

/** Lớp gợi ý khi gõ ở thanh địa chỉ — đọc thẳng cài đặt tìm kiếm để đổi engine/hạng mục tại chỗ. */
function SuggestionsPanelHost({
  query,
  pageUrl,
  title,
  onSubmitText,
  onOpenUrl,
  onFill,
}: {
  query: string;
  pageUrl: string;
  title: string;
  onSubmitText: (text: string) => void;
  onOpenUrl: (url: string) => void;
  onFill: (text: string) => void;
}) {
  const category = useSettings(s => s.searchCategory);
  const engine = useSettings(s => s.searchEngine);
  const set = useSettings(s => s.set);
  return (
    <SuggestionsPanel
      query={query}
      category={category}
      engine={engine}
      currentUrl={pageUrl}
      currentTitle={title}
      onSubmitText={onSubmitText}
      onOpenUrl={onOpenUrl}
      onFill={onFill}
      onChangeCategory={value => set({ searchCategory: value })}
      onChangeEngine={value => set({ searchEngine: value })}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, overflow: 'hidden' },
  progress: { position: 'absolute', top: 0, left: 0, height: 2.5 },
});
