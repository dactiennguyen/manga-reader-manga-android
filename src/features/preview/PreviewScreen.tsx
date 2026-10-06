import { useKeepAwake } from '@sayem314/react-native-keep-awake';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type FlatListProps,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppNavigation, useAppRoute } from '../../app/routes';
import { MenuSheet, SpeechBubble } from '../../components/comic';
import {
  ChevronDown,
  EllipsisVertical,
  Eye,
  EyeOff,
  Flag,
  Languages,
  PenLine,
  ScreenRotation,
  Sun,
  X,
} from '../../components/icons';
import { Button, IconButton, Slider } from '../../components/ui';
import { pageSize } from '../../engine/layout';
import type { PageDrawOptions } from '../../engine/page';
import { orientationSupported, setOrientationLock } from '../../lib/screen';
import { chapterLabel, chapterNumber } from '../../model/selectors';
import type { ID } from '../../model/types';
import { useChapters, useProject } from '../../store/hooks';
import { useStory } from '../../store/useStory';
import { font, radius, space, useTheme } from '../../theme';
import { EndCard, FlagListSheet, FlagSheet, PreviewPage } from './PreviewParts';
import { buildSpreads, firstPageOfSpread, spreadIndexOfPage, spreadLabel } from './spreads';
import { useZoom } from './useZoom';

type Item = { key: string; pageIds?: ID[] };

const END_HEIGHT = 420;
const BACKDROP = '#000000';

function Awake() {
  useKeepAwake();
  return null;
}

export function PreviewScreen() {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const params = useAppRoute<'Preview'>().params;
  const { projectId } = params;
  const project = useProject(projectId);
  const chapters = useChapters(projectId);
  const pages = useStory(s => s.pages);

  const [chapterId, setChapterId] = useState<ID | undefined>(
    () => params.chapterId ?? chapters.find(ch => ch.pageIds.length > 0)?.id ?? chapters[0]?.id,
  );
  const chapter = chapters.find(ch => ch.id === chapterId);
  const allPageIds = useMemo(() => (chapter?.pageIds ?? []).filter(id => !!pages[id]), [chapter, pages]);

  const [hideUnfinished, setHideUnfinished] = useState(false);
  const pageIds = useMemo(
    () => (hideUnfinished ? allPageIds.filter(id => pages[id].done) : allPageIds),
    [allPageIds, hideUnfinished, pages],
  );
  const total = pageIds.length;

  const manga = project?.format !== 'webtoon';
  const landscape = width > height;
  const spread = manga && landscape;
  const slots = spread ? 2 : 1;
  const groups = useMemo(() => buildSpreads(pageIds, spread), [pageIds, spread]);

  const [startPage, setStartPage] = useState(() => Math.max(0, params.pageId ? allPageIds.indexOf(params.pageId) : 0));
  const [pagePos, setPagePos] = useState(startPage);
  const [session, setSession] = useState(0);
  const [controls, setControls] = useState(false);
  const [awake, setAwake] = useState(false);
  const [sheet, setSheet] = useState<'chapters' | 'menu' | 'flags' | 'language' | null>(null);
  const [flagPageId, setFlagPageId] = useState<ID | null>(null);
  const [pageZoomed, setPageZoomed] = useState(false);
  const [pinching, setPinching] = useState(false);
  const pinchingRef = useRef(false);
  const [lang, setLang] = useState<string | undefined>(undefined);

  const layoutKey = `${width}:${slots}`;
  const [layout, setLayout] = useState(layoutKey);
  if (layout !== layoutKey) {
    setLayout(layoutKey);
    setStartPage(pagePos);
    setPageZoomed(false);
  }

  const itemOfPage = (at: number) => (at >= total ? groups.length : spreadIndexOfPage(groups, at));
  const index = itemOfPage(pagePos);
  const initialItem = itemOfPage(startPage);

  const listRef = useRef<FlatList<Item>>(null);
  const indexRef = useRef(index);
  indexRef.current = index;
  const groupsRef = useRef(groups);
  groupsRef.current = groups;

  const languages = useMemo(() => project?.languages ?? [], [project]);
  const activeLang = lang && languages.includes(lang) ? lang : undefined;
  const drawOptions = useMemo<PageDrawOptions>(
    () => (activeLang ? { placeholders: true, lang: activeLang } : { placeholders: true }),
    [activeLang],
  );

  const items = useMemo<Item[]>(
    () => [...groups.map(ids => ({ key: ids[0], pageIds: ids })), { key: 'end' }],
    [groups],
  );

  const metrics = useMemo(() => {
    const lengths = items.map(item => {
      if (manga) {
        return width;
      }
      const page = item.pageIds ? pages[item.pageIds[0]] : undefined;
      if (!page || !project) {
        return END_HEIGHT;
      }
      const size = pageSize(project, page);
      return Math.round((width * size.h) / size.w);
    });
    const offsets: number[] = [];
    let sum = 0;
    for (const length of lengths) {
      offsets.push(sum);
      sum += length;
    }
    return { lengths, offsets, total: sum };
  }, [items, manga, pages, project, width]);

  const mangaPage = useMemo(() => {
    if (!project) {
      return { w: width, h: height };
    }
    const size = pageSize(project);
    const w = Math.min(Math.floor(width / slots), Math.floor((height * size.w) / size.h));
    return { w, h: Math.round((w * size.h) / size.w) };
  }, [project, width, height, slots]);

  const scrollY = useSharedValue(0);
  const listZoom = useZoom({
    frameW: width,
    frameH: height,
    contentW: width,
    contentH: height,
    lockY: true,
    scrollY,
    scrollMax: Math.max(0, metrics.total - height),
  });
  const { pinch: listPinch, pan: listPan, reset: resetListZoom, toggleAt: toggleListZoom } = listZoom;
  const listGesture = useMemo(() => Gesture.Simultaneous(listPinch, listPan), [listPinch, listPan]);

  useEffect(() => {
    setPageZoomed(false);
    setPinching(false);
    pinchingRef.current = false;
  }, [index]);

  useEffect(() => {
    resetListZoom(false);
  }, [layoutKey, resetListZoom]);
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.value = event.nativeEvent.contentOffset.y;
    },
    [scrollY],
  );

  const rotated = useRef(false);
  useEffect(
    () => () => {
      if (rotated.current) {
        setOrientationLock('auto');
      }
    },
    [],
  );
  const rotate = () => {
    rotated.current = true;
    setOrientationLock(landscape ? 'portrait' : 'landscape');
  };

  const onPageZoom = useCallback((zoomed: boolean) => {
    setPageZoomed(zoomed);
    listRef.current?.scrollToIndex({ index: indexRef.current, animated: false });
  }, []);

  const pagerGesture = useMemo(() => Gesture.Native(), []);
  const onPagePinch = useCallback((active: boolean) => {
    if (active === pinchingRef.current) {
      return;
    }
    pinchingRef.current = active;
    setPinching(active);
    if (!active) {
      listRef.current?.scrollToIndex({ index: indexRef.current, animated: false });
    }
  }, []);

  const goTo = useCallback(
    (target: number, animated = true) => {
      const next = Math.max(0, Math.min(items.length - 1, target));
      listRef.current?.scrollToIndex({ index: next, animated });
    },
    [items.length],
  );

  const handleTap = useCallback(
    (x: number, zoomed: boolean) => {
      if (manga && !zoomed && x < width * 0.25) {
        goTo(indexRef.current + 1);
      } else if (manga && !zoomed && x > width * 0.75) {
        goTo(indexRef.current - 1);
      } else {
        setControls(value => !value);
      }
    },
    [manga, width, goTo],
  );

  const openFlag = useCallback((pageId: ID) => setFlagPageId(pageId), []);

  const onViewable = useRef<NonNullable<FlatListProps<Item>['onViewableItemsChanged']>>(({ viewableItems }) => {
    const first = viewableItems[0];
    if (first && first.index != null) {
      setPagePos(firstPageOfSpread(groupsRef.current, first.index));
    }
  }).current;
  const viewability = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const restart = (nextChapterId: ID | undefined, at: number, hide = hideUnfinished) => {
    setChapterId(nextChapterId);
    setHideUnfinished(hide);
    setStartPage(Math.max(0, at));
    setPagePos(Math.max(0, at));
    setPageZoomed(false);
    resetListZoom(false);
    setSession(value => value + 1);
  };

  const state = useStory.getState();
  const number = project && chapterId ? chapterNumber(project, chapterId) : 0;
  const chapterIndex = chapters.findIndex(ch => ch.id === chapterId);
  const nextChapter = chapters.slice(chapterIndex + 1).find(ch => ch.pageIds.length > 0);
  const currentIds = groups[Math.min(index, groups.length - 1)] ?? [];
  const currentPageId = currentIds[0];
  const currentFlagged = currentIds.some(id => !!pages[id]?.flag);
  const flagCount = allPageIds.filter(id => !!pages[id].flag).length;
  const shown = Math.min(index + 1, groups.length);
  const label = spreadLabel(groups, index, total);
  const close = () => navigation.goBack();

  const toggleUnfinished = () => {
    const hide = !hideUnfinished;
    const nextIds = hide ? allPageIds.filter(id => pages[id].done) : allPageIds;
    restart(chapterId, currentPageId ? nextIds.indexOf(currentPageId) : 0, hide);
  };

  const jumpTo = (pageId: ID) => {
    const at = pageIds.indexOf(pageId);
    if (at >= 0) {
      goTo(itemOfPage(at), false);
    } else {
      restart(chapterId, allPageIds.indexOf(pageId), false);
    }
  };

  const renderItem = ({ item, index: at }: { item: Item; index: number }) => {
    const length = metrics.lengths[at] ?? END_HEIGHT;
    if (!item.pageIds) {
      return (
        <EndCard
          width={width}
          height={manga ? height : length}
          chapterNumber={number}
          pageCount={total}
          hasNext={!!nextChapter}
          onNext={() => restart(nextChapter?.id, 0)}
          onExport={() => navigation.navigate('Export', { projectId, chapterId })}
          onClose={close}
        />
      );
    }
    return (
      <PreviewPage
        pageIds={item.pageIds}
        slots={slots}
        frameWidth={width}
        frameHeight={manga ? height : length}
        pageWidth={manga ? mangaPage.w : width}
        pageHeight={manga ? mangaPage.h : length}
        rtl={manga}
        options={drawOptions}
        zoomable={manga}
        active={at === index}
        onTap={handleTap}
        onFlag={openFlag}
        onZoomChange={manga ? onPageZoom : undefined}
        onPinchChange={manga ? onPagePinch : undefined}
        outerGesture={manga ? pagerGesture : undefined}
        onDoubleTap={manga ? undefined : toggleListZoom}
      />
    );
  };

  if (!project || !chapter || allPageIds.length === 0) {
    return (
      <View style={[styles.root, styles.centered]}>
        <StatusBar hidden />
        <SpeechBubble>
          <Text style={[font.body, { color: c.text }]}>
            {project && chapter ? 'This chapter has no pages to read yet.' : 'There is nothing to preview yet.'}
          </Text>
        </SpeechBubble>
        {project && chapter && (
          <Button
            title="Go to storyboard"
            onPress={() => navigation.replace('Storyboard', { chapterId: chapter.id })}
          />
        )}
        <Button title="Close" variant="secondary" onPress={close} />
      </View>
    );
  }

  const list = (
    <FlatList
      key={`${chapter.id}:${layoutKey}:${session}`}
      ref={listRef}
      data={items}
      keyExtractor={item => item.key}
      renderItem={renderItem}
      horizontal={manga}
      inverted={manga}
      pagingEnabled={manga}
      scrollEnabled={!manga || (!pageZoomed && !pinching)}
      initialScrollIndex={initialItem > 0 && initialItem < items.length ? initialItem : undefined}
      getItemLayout={(_, at) => ({ length: metrics.lengths[at] ?? 0, offset: metrics.offsets[at] ?? 0, index: at })}
      onViewableItemsChanged={onViewable}
      viewabilityConfig={viewability}
      onScrollToIndexFailed={() => undefined}
      onScroll={manga ? undefined : onScroll}
      scrollEventThrottle={16}
      initialNumToRender={manga ? 1 : 2}
      maxToRenderPerBatch={2}
      windowSize={3}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
    />
  );

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      {awake && <Awake />}
      {manga ? (
        <GestureDetector gesture={pagerGesture}>{list}</GestureDetector>
      ) : (
        <GestureDetector gesture={listGesture}>
          <Animated.View collapsable={false} style={[styles.flex, listZoom.style]}>
            {list}
          </Animated.View>
        </GestureDetector>
      )}

      {!controls && total > 0 && (
        <View
          pointerEvents="none"
          style={[styles.counter, { bottom: insets.bottom + space.sm, backgroundColor: c.toolbar }]}
        >
          <Text style={[font.caption, { color: c.onToolbar }]}>{label}</Text>
        </View>
      )}

      {controls && (
        <>
          <View style={[styles.topBar, { backgroundColor: c.toolbar, paddingTop: insets.top + space.xs }]}>
            <IconButton icon={X} color={c.onToolbar} onPress={close} accessibilityLabel="Close preview" />
            <Pressable style={styles.chapterButton} onPress={() => setSheet('chapters')}>
              <Text numberOfLines={1} style={[font.label, styles.chapterText, { color: c.onToolbar }]}>
                {chapterLabel(state, chapter.id)}
              </Text>
              <ChevronDown size={16} color={c.onToolbarMuted} />
            </Pressable>
            <IconButton
              icon={Flag}
              color={currentFlagged ? c.accent : c.onToolbar}
              disabled={!currentPageId}
              onPress={() => currentPageId && setFlagPageId(currentPageId)}
              accessibilityLabel="Flag this page"
            />
            <IconButton
              icon={EllipsisVertical}
              color={c.onToolbar}
              badge={flagCount || undefined}
              onPress={() => setSheet('menu')}
              accessibilityLabel="More options"
            />
          </View>
          <View style={[styles.bottomBar, { backgroundColor: c.toolbar, paddingBottom: insets.bottom + space.sm }]}>
            <View style={styles.sliderRow}>
              {groups.length > 1 && (
                <Slider
                  style={styles.slider}
                  min={1}
                  max={groups.length}
                  step={1}
                  value={manga ? groups.length + 1 - shown : shown}
                  onComplete={value => goTo(manga ? groups.length - Math.round(value) : Math.round(value) - 1, false)}
                />
              )}
              <Text style={[font.label, styles.sliderLabel, { color: c.onToolbar }]}>{label}</Text>
            </View>
            <Button
              title="Edit this page"
              icon={PenLine}
              variant="secondary"
              small
              disabled={!currentPageId}
              onPress={() => currentPageId && navigation.navigate('PanelLayout', { pageId: currentPageId })}
            />
          </View>
        </>
      )}

      <MenuSheet
        visible={sheet === 'chapters'}
        onClose={() => setSheet(null)}
        title="Chapters"
        items={chapters.map(ch => ({
          label: chapterLabel(state, ch.id),
          subtitle: ch.pageIds.length === 1 ? '1 page' : `${ch.pageIds.length} pages`,
          disabled: ch.pageIds.length === 0,
          onPress: () => restart(ch.id, 0),
        }))}
      />
      <MenuSheet
        visible={sheet === 'menu'}
        onClose={() => setSheet(null)}
        items={[
          {
            label: hideUnfinished ? 'Show unfinished pages' : 'Hide unfinished pages',
            icon: hideUnfinished ? Eye : EyeOff,
            onPress: toggleUnfinished,
          },
          {
            label: 'Flag list',
            subtitle: flagCount === 1 ? '1 flagged page' : `${flagCount} flagged pages`,
            icon: Flag,
            onPress: () => setSheet('flags'),
          },
          {
            label: 'Keep screen on',
            subtitle: awake ? 'On' : 'Off',
            icon: Sun,
            onPress: () => setAwake(value => !value),
          },
          manga &&
            orientationSupported && {
              label: landscape ? 'Rotate to portrait' : 'Rotate to landscape',
              subtitle: landscape ? 'One page at a time' : 'Two-page spread view',
              icon: ScreenRotation,
              onPress: rotate,
            },
          languages.length > 0 && {
            label: 'Language',
            subtitle: activeLang ?? 'Original',
            icon: Languages,
            onPress: () => setSheet('language'),
          },
        ]}
      />
      <MenuSheet
        visible={sheet === 'language'}
        onClose={() => setSheet(null)}
        title="Language"
        items={[
          { label: 'Original', subtitle: activeLang ? undefined : 'Selected', onPress: () => setLang(undefined) },
          ...languages.map(code => ({
            label: code,
            subtitle: activeLang === code ? 'Selected' : undefined,
            onPress: () => setLang(code),
          })),
        ]}
      />
      <FlagListSheet visible={sheet === 'flags'} onClose={() => setSheet(null)} pageIds={allPageIds} onJump={jumpTo} />
      <FlagSheet
        pageId={flagPageId}
        pageLabel={flagPageId ? `Page ${allPageIds.indexOf(flagPageId) + 1}` : ''}
        onClose={() => setFlagPageId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BACKDROP, overflow: 'hidden' },
  flex: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl },
  counter: {
    position: 'absolute',
    right: space.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    opacity: 0.6,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.xs,
    paddingBottom: space.xs,
  },
  chapterButton: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.sm },
  chapterText: { flexShrink: 1 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    gap: space.sm,
  },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  slider: { flex: 1 },
  sliderLabel: { minWidth: 56, textAlign: 'right' },
});
