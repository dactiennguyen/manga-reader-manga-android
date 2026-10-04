import { useIsFocused, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  FlatList,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextStyle,
  type FlatListProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { useAppNavigation, type RootStackParamList } from '../../app/routes';
import { ErrorView } from '../../components/ErrorView';
import { LoadingView, toast } from '../../components/ui';
import { sameUrl } from '../../lib/url';
import { mangaKey } from '../../sources';
import type { Chapter } from '../../sources/types';
import { getProgress } from '../../store/progress';
import { useActiveTab } from '../../store/useBrowser';
import { useReaderSettings } from '../../store/useReaderSettings';
import { useSettings } from '../../store/useSettings';
import { useSource } from '../../store/useSources';
import { font, space, useTheme } from '../../theme';
import { ChapterPickerSheet } from '../reader/ChapterPickerSheet';
import { prefetchChapter } from '../reader/chapterCache';
import { BrightnessOverlay } from '../reader/chromeParts';
import { EndOfChapter, type EndTone } from '../reader/EndOfChapter';
import { ReaderMenuSheet } from '../reader/ReaderMenus';
import { backToManga } from '../reader/readerNavigation';
import { TapHelpDialog } from '../reader/TapHelpDialog';
import { resolveTap } from '../reader/tapZones';
import { useAutoScroll, type ScrollMetrics } from '../reader/useAutoScroll';
import { useChapterNavigation } from '../reader/useChapterNavigation';
import { useChapterSession, type SessionTarget } from '../reader/useChapterSession';
import { useKeepScreenOn } from '../reader/useKeepScreenOn';
import { knownManga, useChapterContent, useMangaDetail } from '../reader/useReaderData';
import { createValueStore } from '../reader/valueStore';
import { NovelChrome, type NovelChromeActions } from './NovelChrome';
import { NovelFontSheet } from './NovelFontSheet';
import { novelTextStyle, useNovelTheme } from './novelThemes';
import { NovelSettingsSheet } from './NovelSettingsSheet';
import { useTts } from './useTts';

type NovelNavigation = NativeStackNavigationProp<RootStackParamList, 'NovelReader'>;
type SheetName = 'chapters' | 'settings' | 'menu' | 'fonts' | 'help';

const NO_PARAGRAPHS: string[] = [];
const NO_CHAPTERS: Chapter[] = [];
/** Chạm trên/dưới: cuộn ~85% màn, giữ lại vài dòng để không mất mạch. */
const STEP_RATIO = 0.85;
const MAX_SCROLL_RETRIES = 6;
/** Còn chừng này đoạn là tải sẵn chương sau. */
const PREFETCH_NEXT_WITHIN = 15;
const VIEWABILITY = { itemVisiblePercentThreshold: 10 };
/** Thả tay có quán tính mà không nhận được sự kiện kết thúc thì vẫn chạy lại tự cuộn. */
const MOMENTUM_FALLBACK_MS = 1500;
/** Chiều cao thanh địa chỉ + hàng tiêu đề, để tên chương không nằm dưới thanh khi mở. */
const TOP_CHROME = 108;
const HELP_TIPS = [
  'Chạm vùng giữa để hiện hoặc ẩn thanh điều khiển.',
  'Chạm phần trên/dưới để cuộn lên/xuống gần một màn (bật/tắt bằng biểu tượng bàn tay).',
  'Thanh bên phải: danh sách chương, tự cuộn (↕) và đọc to.',
  'Panel dưới: kéo tới đoạn, độ sáng, cỡ chữ, phông, giãn dòng và màu nền.',
];

const paragraphKey = (_: string, index: number) => String(index);

type ViewableInfo = Parameters<NonNullable<FlatListProps<string>['onViewableItemsChanged']>>[0];

const NovelParagraph = memo(function NovelParagraphView({
  text,
  active,
  textStyle,
  style,
  highlight,
  onPress,
}: {
  text: string;
  active: boolean;
  textStyle: TextStyle;
  style: StyleProp<ViewStyle>;
  highlight: string;
  onPress: (event: GestureResponderEvent) => void;
}) {
  return (
    <Pressable onPress={onPress} style={[style, active && { backgroundColor: highlight }]}>
      <Text style={textStyle}>{text}</Text>
    </Pressable>
  );
});

/** Reader novel (NovelPage): đọc đoạn văn, đổi phông/cỡ/màu, đọc to bằng TTS. */
export function NovelReaderScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'NovelReader'>>();
  const navigation = useNavigation<NovelNavigation>();
  const appNavigation = useAppNavigation();
  const { sourceId, mangaUrl, chapterUrl, paragraph: paragraphParam } = route.params;
  const key = mangaKey(sourceId, mangaUrl);
  const src = useSource(sourceId);
  const { c, dark } = useTheme();
  const incognito = useActiveTab().incognito;
  const focused = useIsFocused();
  const insets = useSafeAreaInsets();
  const screen = useWindowDimensions();

  const novel = useSettings(state => state.novel);
  const hideStatusBar = useSettings(state => state.hideStatusBar);
  const reader = useReaderSettings(
    useShallow(state => ({
      nextChapterDelay: state.nextChapterDelay,
      immersive: state.immersive,
      keepScreenOn: state.keepScreenOn,
      tapToScroll: state.tapToScroll,
      autoScrollSpeed: state.autoScrollSpeed,
    })),
  );
  useKeepScreenOn(reader.keepScreenOn);
  const { id: themeId, palette } = useNovelTheme();
  const textStyle = useMemo(() => novelTextStyle(novel, palette), [novel, palette]);
  const paragraphStyle = useMemo(
    () => [styles.paragraph, { paddingVertical: Math.round(novel.fontSize * 0.4) }],
    [novel.fontSize],
  );
  const tone = useMemo<EndTone>(() => ({ text: palette.text, muted: palette.muted }), [palette]);

  const { detail, settled } = useMangaDetail(sourceId, mangaUrl, key, chapterUrl);
  const [chapterState, retry] = useChapterContent(sourceId, key, chapterUrl);
  const { current, prev, next } = useChapterNavigation(detail?.chapters, chapterUrl);

  const content =
    chapterState.status === 'ready' && chapterState.chapterUrl === chapterUrl ? chapterState.content : undefined;
  const ready = content?.kind === 'text';
  const paragraphs = content?.kind === 'text' ? content.paragraphs : NO_PARAGRAPHS;
  const known = useMemo(() => knownManga(key), [key]);
  const mangaTitle = detail?.title ?? known.title ?? '';
  const cover = detail?.cover ?? known.cover;
  const chapterName = current?.name ?? content?.title ?? 'Chương đang đọc';

  // Chương dạng ảnh → chuyển sang reader manga.
  useEffect(() => {
    if (content?.kind === 'images') {
      navigation.replace('Reader', { sourceId, mangaUrl, chapterUrl });
    }
  }, [content, navigation, sourceId, mangaUrl, chapterUrl]);

  /** Đoạn mở đầu: theo tham số, hoặc đoạn đọc dở nếu mở lại đúng chương đó. */
  const startParagraph = useMemo(() => {
    if (content?.kind !== 'text') {
      return 0;
    }
    const last = getProgress(key).last;
    const wanted = paragraphParam ?? (last && sameUrl(last.chapterUrl, chapterUrl) ? last.page : 0);
    return Math.min(Math.max(0, wanted), content.paragraphs.length - 1);
  }, [content, key, chapterUrl, paragraphParam]);

  const target = useMemo<SessionTarget | null>(
    () =>
      ready && settled && src
        ? {
            manga: { source: src, mangaUrl, title: mangaTitle || chapterName, cover, content: 'novel' },
            chapter: { url: chapterUrl, name: chapterName },
          }
        : null,
    [ready, settled, src, mangaUrl, mangaTitle, chapterName, cover, chapterUrl],
  );
  const session = useChapterSession(target, startParagraph);

  const [positionStore] = useState(() => createValueStore(0));
  const [chromeVisible, setChromeVisible] = useState(!reader.immersive);
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const [endVisible, setEndVisible] = useState(false);
  const [autoScrolling, setAutoScrolling] = useState(false);
  const autoMetrics = useRef<ScrollMetrics>({
    offset: 0,
    contentHeight: 0,
    viewport: 0,
    userScrolling: false,
    resync: false,
  });
  const momentumTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<FlatList<string>>(null);
  const scroll = useRef({
    offset: 0,
    viewport: 0,
    content: 0,
    footer: 0,
    firstVisible: 0,
    atEnd: false,
    /** Đã nhảy tới đoạn mở đầu — trước đó không ghi vị trí để khỏi đè tiến độ cũ. */
    positioned: true,
    failed: false,
    retries: 0,
    timer: null as ReturnType<typeof setTimeout> | null,
  });
  /** TTS đọc hết chương và đang chờ chương sau tải xong để đọc tiếp. */
  const ttsContinue = useRef(false);

  const live = useRef({ paragraphs, next, prev, src, key, screen, tapToScroll: reader.tapToScroll, autoScrolling });
  live.current = { paragraphs, next, prev, src, key, screen, tapToScroll: reader.tapToScroll, autoScrolling };

  // ─── Đọc to ──────────────────────────────────────────────────────────────

  const handleTtsChapterEnd = useCallback(() => {
    const upcoming = live.current.next;
    if (!upcoming) {
      toast('Đã đọc hết chương mới nhất.');
      return false;
    }
    ttsContinue.current = true;
    navigation.setParams({ chapterUrl: upcoming.url, paragraph: undefined });
    return true;
  }, [navigation]);

  const tts = useTts({
    rate: novel.ttsRate,
    pitch: novel.ttsPitch,
    language: src?.lang,
    onChapterEnd: handleTtsChapterEnd,
  });
  const { start: ttsStart, pause: ttsPause, resume: ttsResume, stop: ttsStop } = tts;

  useEffect(() => {
    if (!ttsContinue.current) {
      return;
    }
    if (ready) {
      ttsContinue.current = false;
      ttsStart(paragraphs, 0);
    } else if (chapterState.status === 'error') {
      ttsContinue.current = false;
      ttsStop();
    }
  }, [ready, paragraphs, chapterState.status, ttsStart, ttsStop]);

  useEffect(() => {
    if (!focused) {
      ttsContinue.current = false;
      ttsStop();
    }
  }, [focused, ttsStop]);

  // ─── Cuộn & vị trí ───────────────────────────────────────────────────────

  const scrollToParagraph = useCallback((index: number, animated: boolean, viewPosition = 0) => {
    const s = scroll.current;
    s.failed = false;
    listRef.current?.scrollToIndex({ index, animated, viewPosition });
    if (!s.failed) {
      s.positioned = true;
    }
  }, []);

  // Đoạn chưa render nên chưa biết vị trí: nhảy theo chiều cao trung bình rồi thử lại.
  const onScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      const s = scroll.current;
      s.failed = true;
      listRef.current?.scrollToOffset({ offset: Math.max(0, info.averageItemLength * info.index), animated: false });
      if (s.timer) {
        clearTimeout(s.timer);
        s.timer = null;
      }
      if (s.retries >= MAX_SCROLL_RETRIES) {
        s.positioned = true;
        return;
      }
      s.retries += 1;
      s.timer = setTimeout(() => {
        s.timer = null;
        scrollToParagraph(info.index, false);
      }, 80);
    },
    [scrollToParagraph],
  );

  useEffect(() => {
    const s = scroll.current;
    return () => {
      if (s.timer) {
        clearTimeout(s.timer);
      }
    };
  }, []);

  useEffect(() => {
    setEndVisible(false);
    setAutoScrolling(false);
    positionStore.set(0);
    const s = scroll.current;
    s.atEnd = false;
    s.firstVisible = 0;
    s.footer = 0;
  }, [chapterUrl, positionStore]);

  // Mở lại đúng đoạn đang đọc dở.
  useEffect(() => {
    if (!ready) {
      return;
    }
    const s = scroll.current;
    s.retries = 0;
    if (startParagraph <= 0) {
      s.positioned = true;
      return;
    }
    s.positioned = false;
    const frame = requestAnimationFrame(() => scrollToParagraph(startParagraph, false));
    return () => cancelAnimationFrame(frame);
  }, [ready, chapterUrl, startParagraph, scrollToParagraph]);

  // Đọc to: tô sáng và cuộn theo đoạn đang đọc.
  useEffect(() => {
    if (tts.index !== null && ready) {
      scroll.current.retries = 0;
      scrollToParagraph(tts.index, true, 0.2);
    }
  }, [tts.index, ready, scrollToParagraph]);

  const evaluateEnd = useCallback(() => {
    const s = scroll.current;
    if (s.content <= 0 || s.viewport <= 0) {
      return;
    }
    const atEnd = s.offset + s.viewport >= s.content - s.footer / 2;
    if (atEnd !== s.atEnd) {
      s.atEnd = atEnd;
      setEndVisible(atEnd);
      positionStore.set(atEnd ? Math.max(0, live.current.paragraphs.length - 1) : s.firstVisible);
      if (atEnd) {
        session.reportFinished();
      }
    }
  }, [positionStore, session]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const s = scroll.current;
      s.offset = contentOffset.y;
      s.content = contentSize.height;
      s.viewport = layoutMeasurement.height;
      const m = autoMetrics.current;
      m.offset = s.offset;
      m.contentHeight = s.content;
      m.viewport = s.viewport;
      evaluateEnd();
    },
    [evaluateEnd],
  );

  const onContentSize = useCallback(
    (_width: number, height: number) => {
      scroll.current.content = height;
      autoMetrics.current.contentHeight = height;
      evaluateEnd();
    },
    [evaluateEnd],
  );

  const onListLayout = useCallback(
    (event: LayoutChangeEvent) => {
      scroll.current.viewport = event.nativeEvent.layout.height;
      autoMetrics.current.viewport = event.nativeEvent.layout.height;
      evaluateEnd();
    },
    [evaluateEnd],
  );

  const onFooterLayout = useCallback((event: LayoutChangeEvent) => {
    scroll.current.footer = event.nativeEvent.layout.height;
  }, []);

  // Kéo tay thì tạm dừng tự cuộn, thả ra (hết quán tính) thì chạy tiếp từ vị trí mới.
  const clearMomentumTimer = useCallback(() => {
    if (momentumTimer.current) {
      clearTimeout(momentumTimer.current);
      momentumTimer.current = null;
    }
  }, []);

  const onBeginDrag = useCallback(() => {
    scroll.current.positioned = true;
    clearMomentumTimer();
    autoMetrics.current.userScrolling = true;
  }, [clearMomentumTimer]);

  const onEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (Math.abs(event.nativeEvent.velocity?.y ?? 0) < 0.05) {
        autoMetrics.current.userScrolling = false;
        return;
      }
      clearMomentumTimer();
      momentumTimer.current = setTimeout(() => {
        momentumTimer.current = null;
        autoMetrics.current.userScrolling = false;
      }, MOMENTUM_FALLBACK_MS);
    },
    [clearMomentumTimer],
  );

  const onMomentumEnd = useCallback(() => {
    clearMomentumTimer();
    autoMetrics.current.userScrolling = false;
  }, [clearMomentumTimer]);

  useEffect(() => clearMomentumTimer, [clearMomentumTimer]);

  const scrollListTo = useCallback((offset: number) => {
    listRef.current?.scrollToOffset({ offset, animated: false });
  }, []);
  const stopAutoScroll = useCallback(() => setAutoScrolling(false), []);

  useAutoScroll({
    active: autoScrolling && ready && focused && sheet === null,
    speed: reader.autoScrollSpeed,
    metrics: autoMetrics,
    scrollTo: scrollListTo,
    onEnd: stopAutoScroll,
  });

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: ViewableInfo) => {
      let first = -1;
      let last = -1;
      for (const token of viewableItems) {
        if (token.index == null) {
          continue;
        }
        first = first < 0 ? token.index : Math.min(first, token.index);
        last = Math.max(last, token.index);
      }
      if (first < 0) {
        return;
      }
      const s = scroll.current;
      s.firstVisible = first;
      const l = live.current;
      const total = l.paragraphs.length;
      positionStore.set(s.atEnd ? Math.max(0, total - 1) : first);
      if (!s.positioned) {
        return;
      }
      session.reportPosition(first, total);
      if (last >= total - 1) {
        session.reportFinished();
      }
      if (l.next && l.src && total - 1 - last < PREFETCH_NEXT_WITHIN) {
        prefetchChapter(l.src, l.key, l.next.url);
      }
    },
    [session, positionStore],
  );

  // ─── Điều hướng ──────────────────────────────────────────────────────────

  const openChapter = useCallback(
    (chapter: Chapter) => {
      setSheet(null);
      ttsContinue.current = false;
      ttsStop();
      navigation.setParams({ chapterUrl: chapter.url, paragraph: undefined });
    },
    [navigation, ttsStop],
  );

  const goNext = useCallback(() => {
    const chapter = live.current.next;
    if (chapter) {
      openChapter(chapter);
    }
  }, [openChapter]);

  const goPrev = useCallback(() => {
    const chapter = live.current.prev;
    if (chapter) {
      openChapter(chapter);
    }
  }, [openChapter]);

  const openManga = useCallback(() => {
    backToManga(appNavigation, { sourceId, url: mangaUrl, title: mangaTitle || undefined, cover });
  }, [appNavigation, sourceId, mangaUrl, mangaTitle, cover]);

  const handleTap = useCallback((event: GestureResponderEvent) => {
    const l = live.current;
    const action = resolveTap({
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
      width: l.screen.width,
      height: l.screen.height,
      tapToScroll: l.tapToScroll,
      zone: 'topBottom',
      rtl: false,
    });
    if (action === 'menu') {
      setChromeVisible(visible => !visible);
      return;
    }
    setChromeVisible(false);
    const s = scroll.current;
    const max = Math.max(0, s.content - s.viewport);
    const offset = Math.min(max, Math.max(0, s.offset + (action === 'next' ? 1 : -1) * s.viewport * STEP_RATIO));
    if (l.autoScrolling) {
      // Đang tự cuộn: nhảy thẳng để vòng tự cuộn chạy tiếp từ vị trí mới.
      autoMetrics.current.offset = offset;
      autoMetrics.current.resync = true;
      listRef.current?.scrollToOffset({ offset, animated: false });
    } else {
      listRef.current?.scrollToOffset({ offset, animated: true });
    }
  }, []);

  const closeSheet = useCallback(() => setSheet(null), []);

  const openSettings = useCallback(() => setSheet('settings'), []);

  const chromeActions = useMemo<NovelChromeActions>(
    () => ({
      onBack: () => navigation.goBack(),
      onPrev: goPrev,
      onNext: goNext,
      onSeek: paragraph => {
        scroll.current.retries = 0;
        autoMetrics.current.resync = true;
        positionStore.set(paragraph);
        scrollToParagraph(paragraph, false);
      },
      onOpenChapters: () => setSheet('chapters'),
      onOpenMenu: () => setSheet('menu'),
      onOpenHelp: () => setSheet('help'),
      onOpenFonts: () => setSheet('fonts'),
      onToggleTapToScroll: () => {
        const { tapToScroll, set } = useReaderSettings.getState();
        set({ tapToScroll: !tapToScroll });
        toast(tapToScroll ? 'Đã tắt chạm để cuộn' : 'Đã bật chạm để cuộn');
      },
      onToggleAutoScroll: () => {
        if (!live.current.autoScrolling) {
          ttsContinue.current = false;
          ttsStop();
          setChromeVisible(false);
        }
        setAutoScrolling(value => !value);
      },
      onReadAloud: () => {
        setAutoScrolling(false);
        setChromeVisible(false);
        ttsStart(live.current.paragraphs, scroll.current.firstVisible);
      },
      onPauseTts: ttsPause,
      onResumeTts: ttsResume,
      onStopTts: ttsStop,
    }),
    [navigation, goPrev, goNext, positionStore, scrollToParagraph, ttsStart, ttsPause, ttsResume, ttsStop],
  );

  // ─── Hiển thị ────────────────────────────────────────────────────────────

  const ttsIndex = tts.index;
  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<string>) => (
      <NovelParagraph
        text={item}
        active={index === ttsIndex}
        textStyle={textStyle}
        style={paragraphStyle}
        highlight={palette.highlight}
        onPress={handleTap}
      />
    ),
    [ttsIndex, textStyle, paragraphStyle, palette.highlight, handleTap],
  );

  const header = useMemo(
    () => (
      <Pressable onPress={handleTap} style={styles.heading}>
        {!!mangaTitle && (
          <Text numberOfLines={1} style={[font.caption, { color: palette.muted }]}>
            {mangaTitle}
          </Text>
        )}
        <Text style={[styles.chapterTitle, { color: palette.text, fontFamily: textStyle.fontFamily }]}>
          {chapterName}
        </Text>
      </Pressable>
    ),
    [handleTap, mangaTitle, chapterName, palette, textStyle.fontFamily],
  );

  const footer = useMemo(
    () => (
      <View onLayout={onFooterLayout}>
        <EndOfChapter
          key={chapterUrl}
          chapterName={chapterName}
          next={next}
          prev={prev}
          delay={tts.state === 'idle' ? reader.nextChapterDelay : 0}
          active={endVisible && focused && sheet === null}
          tone={tone}
          onNext={goNext}
          onPrev={goPrev}
          onOpenManga={openManga}
        />
      </View>
    ),
    [
      onFooterLayout,
      chapterUrl,
      chapterName,
      next,
      prev,
      tts.state,
      reader.nextChapterDelay,
      endVisible,
      focused,
      sheet,
      tone,
      goNext,
      goPrev,
      openManga,
    ],
  );

  let body: ReactNode;
  if (chapterState.status === 'error') {
    body = (
      <View style={[styles.fill, { backgroundColor: c.bg }]}>
        <ErrorView error={chapterState.error} onRetry={retry} url={chapterUrl} />
      </View>
    );
  } else if (!ready) {
    body = <LoadingView label="Đang tải chương…" />;
  } else {
    body = (
      <FlatList
        key={chapterUrl}
        ref={listRef}
        data={paragraphs}
        renderItem={renderItem}
        keyExtractor={paragraphKey}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        contentContainerStyle={{ paddingTop: insets.top + TOP_CHROME + space.lg, paddingBottom: insets.bottom + space.xl }}
        onScroll={handleScroll}
        scrollEventThrottle={32}
        onLayout={onListLayout}
        onContentSizeChange={onContentSize}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VIEWABILITY}
        onScrollToIndexFailed={onScrollToIndexFailed}
        onScrollBeginDrag={onBeginDrag}
        onScrollEndDrag={onEndDrag}
        onMomentumScrollEnd={onMomentumEnd}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={11}
        showsVerticalScrollIndicator={false}
      />
    );
  }

  const showChrome = chromeVisible || !ready;

  return (
    <View style={[styles.fill, { backgroundColor: palette.bg }]}>
      {focused && (
        <StatusBar
          // Khi hiện thanh, thanh trạng thái nằm trên thanh địa chỉ (vàng ở theme sáng).
          barStyle={showChrome ? (dark || incognito ? 'light-content' : 'dark-content') : palette.statusBar}
          hidden={hideStatusBar || (reader.immersive && !chromeVisible)}
          showHideTransition="fade"
          animated
        />
      )}
      {body}
      <BrightnessOverlay />

      <NovelChrome
        visible={showChrome}
        chapterUrl={chapterUrl}
        chapterName={chapterName}
        palette={palette}
        themeId={themeId}
        positionStore={positionStore}
        paragraphCount={paragraphs.length}
        ready={ready}
        hasPrev={!!prev}
        hasNext={!!next}
        tapToScroll={reader.tapToScroll}
        autoScrolling={autoScrolling}
        ttsState={tts.state}
        ttsIndex={tts.index}
        actions={chromeActions}
      />

      <ChapterPickerSheet
        visible={sheet === 'chapters'}
        onClose={closeSheet}
        chapters={detail?.chapters ?? NO_CHAPTERS}
        currentUrl={chapterUrl}
        mangaKey={key}
        onPick={openChapter}
      />
      <NovelSettingsSheet visible={sheet === 'settings'} onClose={closeSheet} />
      <NovelFontSheet visible={sheet === 'fonts'} onClose={closeSheet} />
      <TapHelpDialog
        visible={sheet === 'help'}
        onClose={closeSheet}
        tapToScroll={reader.tapToScroll}
        zone="topBottom"
        rtl={false}
        tips={HELP_TIPS}
      />
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
          settings={{ label: 'Cài đặt đọc', onPress: openSettings }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  heading: { paddingHorizontal: space.lg + 4, paddingBottom: space.lg, gap: space.xs },
  chapterTitle: { fontSize: 24, fontWeight: '700', lineHeight: 32 },
  paragraph: { paddingHorizontal: space.lg + 4 },
});
