import { Globe, RotateCw } from 'lucide-react-native';
import { memo, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type {
  ShouldStartLoadRequest,
  WebViewErrorEvent,
  WebViewNavigationEvent,
  WebViewOpenWindowEvent,
  WebViewProgressEvent,
} from 'react-native-webview/lib/WebViewTypes';

import { Button } from '../../components/ui';
import {
  WebView,
  type WebViewMessageEvent,
  type WebViewNavigation,
  type WebViewRef,
} from '../../components/WebView';
import { classifyUrl, matchBlockedHost } from '../../lib/adblock';
import { sameUrl } from '../../lib/url';
import { useAdblock, type BlockKind } from '../../store/useAdblock';
import { useBrowser, type BrowserTab } from '../../store/useBrowser';
import { font, space, useTheme } from '../../theme';
import { useEvent } from './hooks';
import { buildBridgeScript, jsBlockHosts, jsNavigate, parseBridgeMessage, type BridgeMessage } from './scripts';

export const DESKTOP_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';

/** Cho mọi scheme đi qua onShouldStartLoadWithRequest — mặc định thư viện tự mở app ngoài. */
const ORIGIN_ALL = ['*'];

/** Scheme WebView tự xử lý được; còn lại (intent:, tel:…) là link mở app khác. */
const IN_PAGE_SCHEME = /^(https?|about|data|blob|javascript):/i;

export type BlockStats = { ads: number; trackers: number };

export type NavState = {
  url: string;
  title: string;
  canGoBack: boolean;
  canGoForward: boolean;
  loading: boolean;
};

export type PageMessage = Extract<BridgeMessage, { type: 'html' | 'longpress' | 'find' }>;

export type BrowserWebViewHandle = {
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  stop: () => void;
  inject: (script: string) => void;
};

type Props = {
  tab: BrowserTab;
  /** Chặn quảng cáo đang bật cho tab này. */
  adblock: boolean;
  trackingProtection: boolean;
  longPress: boolean;
  onNavigation: (state: NavState) => void;
  onProgress: (progress: number) => void;
  /** Trang tải xong (spa: đổi URL bằng history API, không tải lại trang). */
  onPageReady: (url: string, title: string, spa: boolean) => void;
  onMessage: (message: PageMessage) => void;
  onBlockStats: (tabId: string, stats: BlockStats) => void;
  /** Link dành cho app khác (intent:, market:, tel:…). */
  onExternalLink: (url: string) => void;
  /** Trang mở cửa sổ mới (target=_blank, window.open). */
  onPopup: (url: string) => void;
  /** Tiến trình render của WebView bị hệ thống dừng — cần tạo lại WebView. */
  onCrash: () => void;
  ref?: Ref<BrowserWebViewHandle>;
};

/** WebView của một tab + bridge script, chặn quảng cáo và xử lý lệnh tải URL. */
export const BrowserWebView = memo(function TabWebView({
  tab,
  adblock,
  trackingProtection,
  longPress,
  onNavigation,
  onProgress,
  onPageReady,
  onMessage,
  onBlockStats,
  onExternalLink,
  onPopup,
  onCrash,
  ref,
}: Props) {
  const { c } = useTheme();
  const webRef = useRef<WebViewRef>(null);
  // URL lúc mount: tab khôi phục sau khi mở lại app thì tải trang cuối cùng đã xem.
  const [source, setSource] = useState(() => ({ uri: tab.url || tab.request.url }));
  const sourceRef = useRef(source.uri);
  const lastRequest = useRef(tab.request);
  const currentUrl = useRef(tab.url);
  const pageUrl = useRef('');
  const seenHosts = useRef(new Set<string>());
  const stats = useRef<BlockStats>({ ads: 0, trackers: 0 });

  useImperativeHandle(
    ref,
    () => ({
      goBack: () => webRef.current?.goBack(),
      goForward: () => webRef.current?.goForward(),
      reload: () => webRef.current?.reload(),
      stop: () => webRef.current?.stopLoading(),
      inject: script => webRef.current?.injectJavaScript(script),
    }),
    [],
  );

  // Lệnh tải URL từ app (thanh địa chỉ, link ngoài…): tab.request đổi seq/url.
  useEffect(() => {
    const prev = lastRequest.current;
    const next = tab.request;
    if (prev.url === next.url && prev.seq === next.seq) {
      return;
    }
    lastRequest.current = next;
    if (!next.url) {
      return;
    }
    if (next.url !== sourceRef.current) {
      sourceRef.current = next.url;
      setSource({ uri: next.url });
    } else if (sameUrl(currentUrl.current, next.url)) {
      webRef.current?.reload();
    } else {
      webRef.current?.injectJavaScript(jsNavigate(next.url));
    }
  }, [tab.request]);

  // Đổi UA (trang cho máy tính) hoặc bật/tắt chặn quảng cáo → tải lại để áp dụng.
  const applied = useRef({ desktop: tab.desktop, adblock });
  useEffect(() => {
    if (applied.current.desktop !== tab.desktop || applied.current.adblock !== adblock) {
      applied.current = { desktop: tab.desktop, adblock };
      webRef.current?.reload();
    }
  }, [tab.desktop, adblock]);

  const script = useMemo(
    () =>
      buildBridgeScript({
        adblock,
        longPress,
        findColor: c.warning,
        findCurrentColor: c.accent,
      }),
    [adblock, longPress, c.warning, c.accent],
  );

  const readyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(readyTimer.current), []);
  const scheduleReady = (url: string, title: string, spa: boolean) => {
    clearTimeout(readyTimer.current);
    // Trang SPA cần thêm thời gian để vẽ nội dung mới sau khi đổi URL.
    readyTimer.current = setTimeout(() => onPageReady(url, title, spa), spa ? 1200 : 300);
  };

  const countBlocked = useEvent((kind: BlockKind, count: number) => {
    stats.current = {
      ads: stats.current.ads + (kind === 'ad' ? count : 0),
      trackers: stats.current.trackers + (kind === 'tracker' ? count : 0),
    };
    useAdblock.getState().record(kind, count);
    onBlockStats(tab.id, stats.current);
  });

  const handleLoadStart = useEvent((event: WebViewNavigationEvent) => {
    const { url, loading, title } = event.nativeEvent;
    if (!sameUrl(url, pageUrl.current)) {
      pageUrl.current = url;
      seenHosts.current = new Set();
      stats.current = { ads: 0, trackers: 0 };
      onBlockStats(tab.id, stats.current);
    }
    // Android báo đổi URL kiểu pushState qua loadingStart với loading=false.
    if (!loading) {
      scheduleReady(url, title, true);
    }
  });

  const handleLoadEnd = useEvent((event: WebViewNavigationEvent | WebViewErrorEvent) => {
    const { url, title } = event.nativeEvent;
    scheduleReady(url, title, false);
  });

  const handleNavigation = useEvent((state: WebViewNavigation) => {
    currentUrl.current = state.url;
    onNavigation({
      url: state.url,
      title: state.title,
      canGoBack: state.canGoBack,
      canGoForward: state.canGoForward,
      loading: state.loading,
    });
  });

  const handleProgress = useEvent((event: WebViewProgressEvent) => onProgress(event.nativeEvent.progress));

  const handleShouldStart = useEvent((request: ShouldStartLoadRequest): boolean => {
    const { url } = request;
    if (/^https?:/i.test(url)) {
      if (adblock) {
        const kind = classifyUrl(url, trackingProtection);
        if (kind) {
          countBlocked(kind, 1);
          return false;
        }
      }
      return true;
    }
    if (IN_PAGE_SCHEME.test(url)) {
      return true;
    }
    // Iframe tự mở app khác thường là quảng cáo — chặn im lặng.
    if (request.isTopFrame !== false) {
      onExternalLink(url);
    }
    return false;
  });

  const handleOpenWindow = useEvent((event: WebViewOpenWindowEvent) => {
    const url = event.nativeEvent.targetUrl;
    if (!url) {
      return;
    }
    if (adblock && /^https?:/i.test(url)) {
      const kind = classifyUrl(url, trackingProtection);
      if (kind) {
        countBlocked(kind, 1);
        return;
      }
    }
    if (!IN_PAGE_SCHEME.test(url)) {
      onExternalLink(url);
      return;
    }
    onPopup(url);
  });

  const handleMessage = useEvent((event: WebViewMessageEvent) => {
    const message = parseBridgeMessage(event.nativeEvent.data);
    if (!message) {
      return;
    }
    switch (message.type) {
      case 'ua':
        // UA thật của WebView dùng cho request của parser (cookie Cloudflare gắn với UA).
        if (!tab.desktop) {
          useBrowser.getState().setUserAgent(message.ua);
        }
        return;
      case 'resources': {
        if (!adblock) {
          return;
        }
        const blocked: string[] = [];
        let ads = 0;
        let trackers = 0;
        for (const host of message.hosts) {
          if (seenHosts.current.has(host)) {
            continue;
          }
          seenHosts.current.add(host);
          const match = matchBlockedHost(host, trackingProtection);
          if (match) {
            blocked.push(match.domain);
            if (match.kind === 'ad') {
              ads++;
            } else {
              trackers++;
            }
          }
        }
        if (blocked.length) {
          webRef.current?.injectJavaScript(jsBlockHosts(blocked));
          if (ads) {
            countBlocked('ad', ads);
          }
          if (trackers) {
            countBlocked('tracker', trackers);
          }
        }
        return;
      }
      case 'pull':
        webRef.current?.reload();
        return;
      default:
        onMessage(message);
    }
  });

  const renderError = (_domain: string | undefined, _code: number, description: string) => (
    <View style={[styles.error, { backgroundColor: c.bg }]}>
      <View style={[styles.errorIcon, { backgroundColor: c.surfaceAlt }]}>
        <Globe size={30} color={c.muted} />
      </View>
      <Text style={[font.heading, styles.center, { color: c.text }]}>Không mở được trang</Text>
      <Text style={[font.body, styles.center, { color: c.muted }]}>
        {description || 'Kiểm tra kết nối mạng hoặc địa chỉ trang rồi thử lại.'}
      </Text>
      <Button title="Thử lại" icon={RotateCw} onPress={() => webRef.current?.reload()} />
    </View>
  );

  return (
    <WebView
      ref={webRef}
      source={source}
      style={{ backgroundColor: c.bg }}
      originWhitelist={ORIGIN_ALL}
      userAgent={tab.desktop ? DESKTOP_USER_AGENT : undefined}
      // Không dùng prop incognito: trên Android nó xoá cookie của cả app.
      cacheEnabled={!tab.incognito}
      saveFormDataDisabled={tab.incognito}
      injectedJavaScriptBeforeContentLoaded={script}
      injectedJavaScript={script}
      onMessage={handleMessage}
      onShouldStartLoadWithRequest={handleShouldStart}
      setSupportMultipleWindows
      onOpenWindow={handleOpenWindow}
      onNavigationStateChange={handleNavigation}
      onLoadStart={handleLoadStart}
      onLoadEnd={handleLoadEnd}
      onLoadProgress={handleProgress}
      renderError={renderError}
      onRenderProcessGone={onCrash}
      pullToRefreshEnabled
      allowsFullscreenVideo
      allowsBackForwardNavigationGestures
      mixedContentMode="compatibility"
      setDisplayZoomControls={false}
    />
  );
});

const styles = StyleSheet.create({
  error: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    padding: space.xl,
  },
  errorIcon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
});
