import { useKeepAwake } from '@sayem314/react-native-keep-awake';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type FlatListProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppNavigation, useAppRoute } from '../../app/routes';
import { MenuSheet, SpeechBubble } from '../../components/comic';
import { ChevronDown, EllipsisVertical, Eye, EyeOff, Flag, PenLine, Sun, X } from '../../components/icons';
import { Button, IconButton, Slider } from '../../components/ui';
import { pageSize } from '../../engine/layout';
import { chapterLabel, chapterNumber } from '../../model/selectors';
import type { ID } from '../../model/types';
import { useChapters, useProject } from '../../store/hooks';
import { useStory } from '../../store/useStory';
import { font, radius, space, useTheme } from '../../theme';
import { EndCard, FlagListSheet, FlagSheet, PreviewPage } from './PreviewParts';

type Item = { key: string; pageId?: ID };

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

  const [startIndex, setStartIndex] = useState(() =>
    Math.max(0, params.pageId ? allPageIds.indexOf(params.pageId) : 0),
  );
  const [index, setIndex] = useState(startIndex);
  const [session, setSession] = useState(0);
  const [controls, setControls] = useState(false);
  const [awake, setAwake] = useState(false);
  const [sheet, setSheet] = useState<'chapters' | 'menu' | 'flags' | null>(null);
  const [flagPageId, setFlagPageId] = useState<ID | null>(null);

  const listRef = useRef<FlatList<Item>>(null);
  const indexRef = useRef(index);
  indexRef.current = index;
  const manga = project?.format !== 'webtoon';

  const items = useMemo<Item[]>(() => [...pageIds.map(id => ({ key: id, pageId: id })), { key: 'end' }], [pageIds]);

  const metrics = useMemo(() => {
    const lengths = items.map(item => {
      if (manga) {
        return width;
      }
      const page = item.pageId ? pages[item.pageId] : undefined;
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
    return { lengths, offsets };
  }, [items, manga, pages, project, width]);

  const mangaPageWidth = useMemo(() => {
    if (!project) {
      return width;
    }
    const size = pageSize(project);
    return Math.min(width, Math.floor((height * size.w) / size.h));
  }, [project, width, height]);

  const goTo = useCallback(
    (target: number, animated = true) => {
      const next = Math.max(0, Math.min(items.length - 1, target));
      listRef.current?.scrollToIndex({ index: next, animated });
    },
    [items.length],
  );

  const handleTap = useCallback(
    (x: number) => {
      if (manga && x < width * 0.25) {
        goTo(indexRef.current + 1);
      } else if (manga && x > width * 0.75) {
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
      setIndex(first.index);
    }
  }).current;
  const viewability = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const restart = (nextChapterId: ID | undefined, at: number, hide = hideUnfinished) => {
    setChapterId(nextChapterId);
    setHideUnfinished(hide);
    setStartIndex(Math.max(0, at));
    setIndex(Math.max(0, at));
    setSession(value => value + 1);
  };

  const state = useStory.getState();
  const number = project && chapterId ? chapterNumber(project, chapterId) : 0;
  const chapterIndex = chapters.findIndex(ch => ch.id === chapterId);
  const nextChapter = chapters.slice(chapterIndex + 1).find(ch => ch.pageIds.length > 0);
  const currentPageId = total > 0 ? pageIds[Math.min(index, total - 1)] : undefined;
  const flagCount = allPageIds.filter(id => !!pages[id].flag).length;
  const shown = Math.min(index + 1, total);
  const close = () => navigation.goBack();

  const toggleUnfinished = () => {
    const hide = !hideUnfinished;
    const nextIds = hide ? allPageIds.filter(id => pages[id].done) : allPageIds;
    restart(chapterId, currentPageId ? nextIds.indexOf(currentPageId) : 0, hide);
  };

  const jumpTo = (pageId: ID) => {
    const at = pageIds.indexOf(pageId);
    if (at >= 0) {
      goTo(at, false);
    } else {
      restart(chapterId, allPageIds.indexOf(pageId), false);
    }
  };

  const renderItem = ({ item, index: at }: { item: Item; index: number }) => {
    const length = metrics.lengths[at] ?? END_HEIGHT;
    if (!item.pageId) {
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
        pageId={item.pageId}
        frameWidth={width}
        frameHeight={manga ? height : length}
        pageWidth={manga ? mangaPageWidth : width}
        onTap={handleTap}
        onFlag={openFlag}
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

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      {awake && <Awake />}
      <FlatList
        key={`${chapter.id}:${width}:${session}`}
        ref={listRef}
        data={items}
        keyExtractor={item => item.key}
        renderItem={renderItem}
        horizontal={manga}
        inverted={manga}
        pagingEnabled={manga}
        initialScrollIndex={startIndex > 0 && startIndex < items.length ? startIndex : undefined}
        getItemLayout={(_, at) => ({ length: metrics.lengths[at] ?? 0, offset: metrics.offsets[at] ?? 0, index: at })}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={viewability}
        onScrollToIndexFailed={() => undefined}
        initialNumToRender={manga ? 1 : 2}
        maxToRenderPerBatch={2}
        windowSize={3}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />

      {!controls && total > 0 && (
        <View
          pointerEvents="none"
          style={[styles.counter, { bottom: insets.bottom + space.sm, backgroundColor: c.toolbar }]}
        >
          <Text style={[font.caption, { color: c.onToolbar }]}>
            {shown}/{total}
          </Text>
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
              color={currentPageId && pages[currentPageId]?.flag ? c.accent : c.onToolbar}
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
              {total > 1 && (
                <Slider
                  style={styles.slider}
                  min={1}
                  max={total}
                  step={1}
                  value={manga ? total + 1 - shown : shown}
                  onComplete={value => goTo(manga ? total - Math.round(value) : Math.round(value) - 1, false)}
                />
              )}
              <Text style={[font.label, styles.sliderLabel, { color: c.onToolbar }]}>
                {shown}/{total}
              </Text>
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
  root: { flex: 1, backgroundColor: BACKDROP },
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
  sliderLabel: { minWidth: 44, textAlign: 'right' },
});
