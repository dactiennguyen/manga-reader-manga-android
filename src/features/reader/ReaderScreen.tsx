import { useFocusEffect, useIsFocused, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { useAppNavigation, type RootStackParamList } from '../../app/routes';
import { ErrorView, useVerify } from '../../components/ErrorView';
import { LoadingView, SwitchRow, toast } from '../../components/ui';
import { sameUrl } from '../../lib/url';
import { mangaKey } from '../../sources';
import type { Chapter, Page } from '../../sources/types';
import { getProgress } from '../../store/progress';
import { resolveViewerPrefs, useReaderSettings, type ViewMode } from '../../store/useReaderSettings';
import { useChapterDownload, useDownloads } from '../../store/useDownloads';
import { useIsBookmarked } from '../../store/useLibrary';
import { useSettings } from '../../store/useSettings';
import { useSource } from '../../store/useSources';
import { useTheme } from '../../theme';
import { BookmarkDialog } from '../detail/BookmarkDialog';
import { BookmarkPrompt, useBookmarkTarget } from './BookmarkPrompt';
import { ChapterPickerSheet } from './ChapterPickerSheet';
import { BrightnessOverlay } from './chromeParts';
import { prefetchChapter } from './chapterCache';
import { DARK_TONE, EndOfChapter } from './EndOfChapter';
import { preloadPages, retryFailedPages } from './pageImageCache';
import { PagedViewer } from './PagedViewer';
import { PageOverview } from './PageOverview';
import { ReaderChrome, type ReaderChromeActions } from './ReaderChrome';
import { PageMenuSheet, ReaderMenuSheet } from './ReaderMenus';
import { backToManga } from './readerNavigation';
import { ReaderStatusInfo } from './ReaderStatusInfo';
import { TapHelpDialog } from './TapHelpDialog';
import { resolveTap } from './tapZones';
import { useChapterNavigation } from './useChapterNavigation';
import { useChapterSession, type SessionTarget } from './useChapterSession';
import { useKeepScreenOn } from './useKeepScreenOn';
import { useOrientationLock } from './useOrientationLock';
import { knownManga, useChapterContent, useMangaDetail } from './useReaderData';
import { createValueStore } from './valueStore';
import { VerticalViewer } from './VerticalViewer';
import { updateViewerPrefs, VIEW_MODE_NAMES } from './viewerPrefs';
import { ViewerSettingsSheet } from './ViewerSettingsSheet';
import type { ViewerHandle } from './viewerTypes';
import { ViewModeMenu } from './ViewModeMenu';

type ReaderNavigation = NativeStackNavigationProp<RootStackParamList, 'Reader'>;
type SheetName = 'chapters' | 'overview' | 'settings' | 'menu' | 'modes' | 'help' | 'bookmark';
type PendingTap = { at: number; x: number; y: number; timer: ReturnType<typeof setTimeout> };

const NO_PAGES: Page[] = [];
const NO_CHAPTERS: Chapter[] = [];
const PREFETCH_NEXT_WITHIN = 3;
const DOUBLE_TAP_MS = 260;
const DOUBLE_TAP_SLOP = 48;

export function ReaderScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Reader'>>();
  const navigation = useNavigation<ReaderNavigation>();
  const appNavigation = useAppNavigation();
  const { sourceId, mangaUrl, chapterUrl, page: pageParam } = route.params;
  const key = mangaKey(sourceId, mangaUrl);
  const src = useSource(sourceId);
  const { c } = useTheme();
  const focused = useIsFocused();
  const insets = useSafeAreaInsets();
  const screen = useWindowDimensions();

  const { detail, settled } = useMangaDetail(sourceId, mangaUrl, key, chapterUrl);
  const [chapterState, retry] = useChapterContent(sourceId, key, chapterUrl);
  const { current, prev, next } = useChapterNavigation(detail?.chapters, chapterUrl);

  const prefs = useReaderSettings(useShallow(state => resolveViewerPrefs(state, key)));
  const settings = useReaderSettings(
    useShallow(state => ({
      highResImages: state.highResImages,
      preloadPages: state.preloadPages,
      nextChapterDelay: state.nextChapterDelay,
      immersive: state.immersive,
      keepScreenOn: state.keepScreenOn,
      autoScroll: state.autoScroll,
      autoScrollSpeed: state.autoScrollSpeed,
      tapToScroll: state.tapToScroll,
      tapZone: state.tapZone,
      doubleTapZoom: state.doubleTapZoom,
      statusInfo: state.statusInfo,
    })),
  );
  const longPressDisabled = useSettings(state => state.disableLongPressMenu);
  const hideStatusBar = useSettings(state => state.hideStatusBar);
  useKeepScreenOn(settings.keepScreenOn);

  const content =
    chapterState.status === 'ready' && chapterState.chapterUrl === chapterUrl ? chapterState.content : undefined;
  const ready = content?.kind === 'images';
  const pages = content?.kind === 'images' ? content.pages : NO_PAGES;
  const known = useMemo(() => knownManga(key), [key]);
  const mangaTitle = detail?.title ?? known.title ?? '';
  const cover = detail?.cover ?? known.cover;
  const bookmarkTarget = useBookmarkTarget(key, src, mangaUrl, detail, mangaTitle, cover);
  const chapterName = current?.name ?? content?.title ?? 'Chương đang đọc';
  const vertical = prefs.viewMode === 'vertical';
  const rtlAxis = prefs.direction === 'rtl' && (prefs.viewMode === 'horizontal' || prefs.viewMode === 'double');

  useEffect(() => {
    if (content?.kind === 'text') {
      navigation.replace('NovelReader', { sourceId, mangaUrl, chapterUrl });
    }
  }, [content, navigation, sourceId, mangaUrl, chapterUrl]);

  const startPage = useMemo(() => {
    if (content?.kind !== 'images') {
      return 0;
    }
    const last = getProgress(key).last;
    const wanted = pageParam ?? (last && sameUrl(last.chapterUrl, chapterUrl) ? last.page : 0);
    return Math.min(Math.max(0, wanted), content.pages.length - 1);
  }, [content, key, chapterUrl, pageParam]);

  const target = useMemo<SessionTarget | null>(
    () =>
      ready && settled && src
        ? {
            manga: { source: src, mangaUrl, title: mangaTitle || chapterName, cover, content: 'manga' },
            chapter: { url: chapterUrl, name: chapterName },
          }
        : null,
    [ready, settled, src, mangaUrl, mangaTitle, chapterName, cover, chapterUrl],
  );
  const session = useChapterSession(target, startPage);

  const [pageStore] = useState(() => createValueStore(0));
  const [chromeVisible, setChromeVisible] = useState(!settings.immersive);
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const [pageMenu, setPageMenu] = useState<number | null>(null);
  const [endVisible, setEndVisible] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  const viewerRef = useRef<ViewerHandle>(null);
  const pageOwner = useRef('');
  const pendingTap = useRef<PendingTap | null>(null);

  const live = useRef({
    chapterUrl,
    startPage,
    pages,
    next,
    prev,
    src,
    key,
    mangaTitle,
    cover,
    vertical,
    rtlAxis,
    playing,
    screen,
    preloadPages: settings.preloadPages,
    tapToScroll: settings.tapToScroll,
    tapZone: settings.tapZone,
    doubleTapZoom: settings.doubleTapZoom,
  });
  live.current = {
    chapterUrl,
    startPage,
    pages,
    next,
    prev,
    src,
    key,
    mangaTitle,
    cover,
    vertical,
    rtlAxis,
    playing,
    screen,
    preloadPages: settings.preloadPages,
    tapToScroll: settings.tapToScroll,
    tapZone: settings.tapZone,
    doubleTapZoom: settings.doubleTapZoom,
  };

  useEffect(() => {
    setEndVisible(false);
    setPageMenu(null);
  }, [chapterUrl]);

  useEffect(() => {
    setPlaying(ready && vertical && settings.autoScroll);
  }, [ready, vertical, settings.autoScroll, chapterUrl]);

  const getInitialPage = useCallback(
    () => (pageOwner.current === live.current.chapterUrl ? pageStore.get() : live.current.startPage),
    [pageStore],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      const l = live.current;
      pageOwner.current = l.chapterUrl;
      pageStore.set(page);
      const total = l.pages.length;
      session.reportPosition(page, total);
      if (page >= total - 1) {
        session.reportFinished();
      }
      preloadPages(l.pages, page + 1, l.preloadPages, l.vertical);
      if (l.next && l.src && total - 1 - page < PREFETCH_NEXT_WITHIN) {
        prefetchChapter(l.src, l.key, l.next.url);
      }
    },
    [pageStore, session],
  );

  const handleEndVisible = useCallback(
    (visible: boolean) => {
      setEndVisible(visible);
      if (visible) {
        session.reportFinished();
      }
    },
    [session],
  );

  const openChapter = useCallback(
    (chapter: Chapter) => {
      setSheet(null);
      navigation.setParams({ chapterUrl: chapter.url, page: undefined });
    },
    [navigation],
  );

  const goNext = useCallback(() => {
    const chapter = live.current.next;
    if (chapter) {
      openChapter(chapter);
    }
  }, [openChapter]);


  const openManga = useCallback(() => {
    backToManga(appNavigation, {
      sourceId,
      url: mangaUrl,
      title: live.current.mangaTitle || undefined,
      cover: live.current.cover,
    });
  }, [appNavigation, sourceId, mangaUrl]);

  const tapAction = useCallback((x: number, y: number) => {
    const l = live.current;
    return resolveTap({
      x,
      y,
      width: l.screen.width,
      height: l.screen.height,
      tapToScroll: l.tapToScroll,
      zone: l.tapZone,
      rtl: l.rtlAxis,
    });
  }, []);

  const runTap = useCallback(
    (x: number, y: number) => {
      const l = live.current;
      const action = tapAction(x, y);
      if (action === 'menu') {
        setChromeVisible(visible => !visible);
        return;
      }
      setChromeVisible(false);
      const moved = viewerRef.current?.step(action === 'next' ? 1 : -1);
      if (moved === false && action === 'next' && l.next) {
        openChapter(l.next);
      }
    },
    [openChapter, tapAction],
  );

  const handleTap = useCallback(
    (event: GestureResponderEvent) => {
      const { pageX: x, pageY: y } = event.nativeEvent;
      const pending = pendingTap.current;
      if (pending) {
        clearTimeout(pending.timer);
        pendingTap.current = null;
        if (Date.now() - pending.at < DOUBLE_TAP_MS && Math.hypot(x - pending.x, y - pending.y) < DOUBLE_TAP_SLOP) {
          viewerRef.current?.toggleZoom(x, y);
          return;
        }
        runTap(pending.x, pending.y);
      }
      if (!live.current.doubleTapZoom || tapAction(x, y) !== 'menu') {
        runTap(x, y);
        return;
      }
      const timer = setTimeout(() => {
        pendingTap.current = null;
        runTap(x, y);
      }, DOUBLE_TAP_MS);
      pendingTap.current = { at: Date.now(), x, y, timer };
    },
    [runTap, tapAction],
  );

  useEffect(
    () => () => {
      if (pendingTap.current) {
        clearTimeout(pendingTap.current.timer);
      }
    },
    [],
  );

  const verify = useVerify();
  const verifying = useRef(false);
  const verifyChapter = useCallback(() => {
    verifying.current = true;
    verify(live.current.chapterUrl);
  }, [verify]);
  useFocusEffect(
    useCallback(() => {
      if (verifying.current) {
        verifying.current = false;
        retryFailedPages();
      }
    }, []),
  );

  const openSettings = useCallback(() => setSheet('settings'), []);
  const openHelp = useCallback(() => setSheet('help'), []);
  const pickOverviewPage = useCallback((page: number) => {
    setSheet(null);
    viewerRef.current?.goToPage(page);
  }, []);
  const openPageMenu = useCallback((index: number) => setPageMenu(index), []);
  const closePageMenu = useCallback(() => setPageMenu(null), []);
  const closeSheet = useCallback(() => setSheet(null), []);
  const stopAutoScroll = useCallback(() => setPlaying(false), []);

  const pickViewMode = useCallback(
    (mode: ViewMode) => {
      setSheet(null);
      if (mode !== resolveViewerPrefs(useReaderSettings.getState(), key).viewMode) {
        updateViewerPrefs(key, { viewMode: mode });
        toast(`Chế độ xem: ${VIEW_MODE_NAMES[mode]}`);
      }
    },
    [key],
  );

  const orientation = useOrientationLock();
  const toggleOrientation = orientation.toggle;

  const bookmarked = useIsBookmarked(key);
  const downloadTask = useChapterDownload(key, current?.url ?? chapterUrl);
  const live2 = useRef({ bookmarkTarget, downloadTask, current, chapterName, mangaTitle, cover });
  live2.current = { bookmarkTarget, downloadTask, current, chapterName, mangaTitle, cover };

  const chromeActions = useMemo<ReaderChromeActions>(
    () => ({
      onBack: () => navigation.goBack(),
      onSeek: page => viewerRef.current?.goToPage(page),
      onOpenChapters: () => setSheet('chapters'),
      onOpenOverview: () => setSheet('overview'),
      onOpenMenu: () => setSheet('menu'),
      onOpenModes: () => setSheet('modes'),
      onBookmark: () => {
        if (live2.current.bookmarkTarget) {
          setSheet('bookmark');
        } else {
          toast('Đang tải thông tin truyện, thử lại sau giây lát');
        }
      },
      onDownload: () => {
        const l = live2.current;
        const status = l.downloadTask?.status;
        if (l.downloadTask && status === 'paused') {
          useDownloads.getState().resume([l.downloadTask.id]);
          toast('Đã tiếp tục tải chương');
          return;
        }
        if (status && status !== 'error') {
          toast(status === 'done' ? 'Chương này đã tải, đọc được khi không có mạng' : 'Chương này đang trong hàng tải');
          return;
        }
        if (!src) {
          return;
        }
        const added = useDownloads.getState().enqueue(
          {
            mangaKey: key,
            sourceId,
            mangaUrl,
            mangaTitle: l.mangaTitle || l.chapterName,
            cover: l.cover,
            content: src.content,
          },
          [l.current ?? { url: chapterUrl, name: l.chapterName }],
        );
        toast(added ? 'Đã thêm chương vào hàng tải' : 'Chương này đã có trong danh sách tải');
      },
      onToggleTapToScroll: () => {
        const { tapToScroll, set } = useReaderSettings.getState();
        set({ tapToScroll: !tapToScroll });
        toast(tapToScroll ? 'Đã tắt chạm để cuộn' : 'Đã bật chạm để cuộn');
      },
      onToggleViewMode: () => {
        const viewMode = resolveViewerPrefs(useReaderSettings.getState(), key).viewMode === 'vertical' ? 'horizontal' : 'vertical';
        updateViewerPrefs(key, { viewMode });
        toast(`Chế độ xem: ${VIEW_MODE_NAMES[viewMode]}`);
      },
      onToggleDirection: () => {
        const rtl = resolveViewerPrefs(useReaderSettings.getState(), key).direction !== 'rtl';
        updateViewerPrefs(key, { direction: rtl ? 'rtl' : 'ltr' });
        toast(rtl ? 'Đọc từ phải sang trái' : 'Đọc từ trái sang phải');
      },
      onToggleGap: () => {
        const pageGap = !resolveViewerPrefs(useReaderSettings.getState(), key).pageGap;
        updateViewerPrefs(key, { pageGap });
        toast(pageGap ? 'Đã bật khoảng cách giữa trang' : 'Đã tắt khoảng cách giữa trang');
      },
      onToggleAutoScroll: () => {
        if (!live.current.playing) {
          setChromeVisible(false);
        }
        setPlaying(value => !value);
      },
      onToggleOrientation: toggleOrientation,
    }),
    [navigation, key, src, sourceId, mangaUrl, chapterUrl, toggleOrientation],
  );

  const onAreaLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setArea(previous =>
      previous && previous.width === width && previous.height === height ? previous : { width, height },
    );
  }, []);

  const footer = useMemo(
    () => (
      <EndOfChapter
        key={chapterUrl}
        chapterName={chapterName}
        next={next}
        delay={settings.nextChapterDelay}
        active={endVisible && focused && sheet === null}
        tone={DARK_TONE}
        onNext={goNext}
        onOpenManga={openManga}
      />
    ),
    [chapterUrl, chapterName, next, settings.nextChapterDelay, endVisible, focused, sheet, goNext, openManga],
  );

  const viewerKey = `${chapterUrl}|${prefs.viewMode}|${rtlAxis ? 'rtl' : 'ltr'}`;
  const longPress = longPressDisabled ? undefined : openPageMenu;
  const onVerify = pages[0]?.uri.startsWith('file://') ? undefined : verifyChapter;

  let body: ReactNode;
  if (chapterState.status === 'error') {
    body = (
      <View style={[styles.fill, { backgroundColor: c.bg }]}>
        <ErrorView error={chapterState.error} onRetry={retry} url={chapterUrl} />
      </View>
    );
  } else if (!ready || !area) {
    body = <LoadingView label="Đang tải chương…" />;
  } else if (prefs.viewMode === 'vertical') {
    body = (
      <VerticalViewer
        key={viewerKey}
        ref={viewerRef}
        pages={pages}
        getInitialPage={getInitialPage}
        width={area.width}
        height={area.height}
        pageGap={prefs.pageGap}
        highRes={settings.highResImages}
        preloadPages={settings.preloadPages}
        footer={footer}
        autoScroll={playing && focused && sheet === null && pageMenu === null}
        autoScrollSpeed={settings.autoScrollSpeed}
        onAutoScrollEnd={stopAutoScroll}
        onPageChange={handlePageChange}
        onEndVisible={handleEndVisible}
        onTap={handleTap}
        onLongPressPage={longPress}
        onVerify={onVerify}
      />
    );
  } else {
    body = (
      <PagedViewer
        key={viewerKey}
        ref={viewerRef}
        mode={prefs.viewMode}
        rtl={prefs.direction === 'rtl'}
        pages={pages}
        getInitialPage={getInitialPage}
        width={area.width}
        height={area.height}
        highRes={settings.highResImages}
        preloadPages={settings.preloadPages}
        footer={footer}
        onPageChange={handlePageChange}
        onEndVisible={handleEndVisible}
        onTap={handleTap}
        onLongPressPage={longPress}
        onVerify={onVerify}
      />
    );
  }

  const showChrome = chromeVisible || !ready;
  const helpTips = useMemo(
    () => [
      'Chạm vùng giữa để hiện hoặc ẩn thanh điều khiển.',
      'Chạm vùng Lùi/Tiến để cuộn hoặc lật trang; chạm Tiến ở cuối chương để sang chương sau.',
      'Vuốt để cuộn hoặc lật trang tự do.',
      ...(longPressDisabled ? [] : ['Nhấn giữ ảnh để sao chép, chia sẻ hoặc tải lại ảnh.']),
      'Chạm đúp vào giữa màn hình để phóng to hoặc thu nhỏ, dùng hai ngón để phóng to tuỳ ý.',
      'Thanh trên: bookmark, chạm để cuộn, tự cuộn và cài đặt. Thanh bên phải: tổng quan trang, đổi cuộn dọc/lật trang (nhấn giữ để chọn chế độ khác), khoá xoay.',
      'Thanh dưới: chọn chương, tải chương, khoảng cách trang (dọc) hoặc hướng đọc (lật ngang), độ sáng.',
    ],
    [longPressDisabled],
  );

  return (
    <View style={styles.root}>
      {focused && (
        <StatusBar
          barStyle="light-content"
          hidden={hideStatusBar || (settings.immersive && !chromeVisible)}
          showHideTransition="fade"
          animated
        />
      )}
      <View style={[styles.fill, !settings.immersive && { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.fill} onLayout={onAreaLayout}>
          {body}
        </View>
      </View>
      <BrightnessOverlay />
      <ReaderStatusInfo
        visible={settings.statusInfo && ready && !showChrome}
        chapterName={chapterName}
        pageStore={pageStore}
        total={pages.length}
        bottom={settings.immersive ? 0 : insets.bottom}
      />

      <ReaderChrome
        visible={showChrome}
        chapterName={chapterName}
        pageStore={pageStore}
        total={ready ? pages.length : 0}
        viewMode={prefs.viewMode}
        rtl={prefs.direction === 'rtl'}
        pageGap={prefs.pageGap}
        autoPlaying={playing}
        tapToScroll={settings.tapToScroll}
        bookmarked={bookmarked}
        downloadStatus={downloadTask?.status}
        orientationLock={orientation.supported ? orientation.lock : undefined}
        actions={chromeActions}
      />
      <ViewModeMenu visible={sheet === 'modes'} value={prefs.viewMode} onPick={pickViewMode} onClose={closeSheet} />
      <TapHelpDialog
        visible={sheet === 'help'}
        onClose={closeSheet}
        tapToScroll={settings.tapToScroll}
        zone={settings.tapZone}
        rtl={rtlAxis}
        tips={helpTips}
        onOpenSettings={openSettings}
      />

      <PageOverview
        visible={sheet === 'overview'}
        onClose={closeSheet}
        chapterName={chapterName}
        pages={pages}
        current={pageStore.get()}
        onPick={pickOverviewPage}
      />
      <ChapterPickerSheet
        visible={sheet === 'chapters'}
        onClose={closeSheet}
        chapters={detail?.chapters ?? NO_CHAPTERS}
        currentUrl={chapterUrl}
        mangaKey={key}
        onPick={openChapter}
      />
      <ViewerSettingsSheet visible={sheet === 'settings'} onClose={closeSheet} mangaKey={key} />
      {src && (
        <ReaderMenuSheet
          visible={sheet === 'menu'}
          onClose={closeSheet}
          manga={{
            mangaKey: key,
            sourceId,
            mangaUrl,
            mangaTitle: mangaTitle || chapterName,
            cover,
            content: src.content,
          }}
          chapter={current ?? { url: chapterUrl, name: chapterName }}
          onOpenManga={openManga}
          settings={{ label: 'Cài đặt trình xem', onPress: openSettings }}
          onHelp={openHelp}
          toggles={<ReaderToggles />}
        />
      )}
      <PageMenuSheet page={pageMenu !== null ? pages[pageMenu] : undefined} index={pageMenu} onClose={closePageMenu} />
      {sheet === 'bookmark' && bookmarkTarget && (
        <BookmarkDialog visible onClose={closeSheet} target={bookmarkTarget} />
      )}
      <BookmarkPrompt target={bookmarkTarget} />
    </View>
  );
}

function ReaderToggles() {
  const highRes = useReaderSettings(state => state.highResImages);
  const immersive = useReaderSettings(state => state.immersive);
  const setReader = useReaderSettings(state => state.set);
  const longPressDisabled = useSettings(state => state.disableLongPressMenu);
  const setApp = useSettings(state => state.set);
  return (
    <>
      <SwitchRow
        title="Tắt menu nhấn giữ"
        value={longPressDisabled}
        onValueChange={disableLongPressMenu => setApp({ disableLongPressMenu })}
      />
      <SwitchRow
        title="Ảnh độ phân giải cao"
        subtitle="Nét hơn nhưng tốn bộ nhớ hơn"
        value={highRes}
        onValueChange={highResImages => setReader({ highResImages })}
      />
      <SwitchRow title="Toàn màn hình" value={immersive} onValueChange={value => setReader({ immersive: value })} />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  fill: { flex: 1 },
});
