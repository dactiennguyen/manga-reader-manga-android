import { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, type GestureType } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { PageView } from '../../components/PageView';
import { Sheet } from '../../components/Sheet';
import { ComicCard } from '../../components/comic';
import { Flag } from '../../components/icons';
import { Button, Chip, TextField, confirm } from '../../components/ui';
import type { PageDrawOptions } from '../../engine/page';
import type { ID, PageFlag } from '../../model/types';
import { usePage } from '../../store/hooks';
import { useStory } from '../../store/useStory';
import { font, radius, space, useTheme } from '../../theme';
import { slotAtPoint } from './spreads';
import { useZoom } from './useZoom';

export const FLAG_REASONS = ['Art', 'Dialogue', 'Layout', 'Reading order'] as const;

const BADGE_SIZE = 32;
const BADGE_ZONE = space.sm + BADGE_SIZE + 12;

function PageSlot({ pageId, width, options }: { pageId: ID; width: number; options: PageDrawOptions }) {
  const { c } = useTheme();
  const page = usePage(pageId);
  return (
    <View style={{ width }}>
      <PageView pageId={pageId} width={width} options={options} />
      {page && !page.done && (
        <View style={[styles.unfinished, { backgroundColor: c.toolbar }]}>
          <Text style={[font.caption, { color: c.onToolbar }]}>Not done</Text>
        </View>
      )}
      {page?.flag && (
        <View
          accessible
          accessibilityLabel="Flagged page"
          style={[styles.flagBadge, { backgroundColor: c.accent, borderColor: c.onAccent }]}
        >
          <Flag size={16} color={c.onAccent} />
        </View>
      )}
    </View>
  );
}

export const PreviewPage = memo(function PreviewPageItem({
  pageIds,
  slots,
  frameWidth,
  frameHeight,
  pageWidth,
  pageHeight,
  rtl,
  options,
  zoomable,
  active,
  onTap,
  onFlag,
  onZoomChange,
  onPinchChange,
  outerGesture,
  onDoubleTap,
}: {
  pageIds: ID[];
  slots: number;
  frameWidth: number;
  frameHeight: number;
  pageWidth: number;
  pageHeight: number;
  rtl: boolean;
  options: PageDrawOptions;
  zoomable: boolean;
  active: boolean;
  onTap: (x: number, zoomed: boolean) => void;
  onFlag: (pageId: ID) => void;
  onZoomChange?: (zoomed: boolean) => void;
  onPinchChange?: (active: boolean) => void;
  outerGesture?: GestureType;
  onDoubleTap?: (x: number, y: number) => void;
}) {
  const contentW = slots * pageWidth;
  const { pinch, pan, style, zoomed, reset, toggleAt, toContent } = useZoom({
    frameW: frameWidth,
    frameH: frameHeight,
    contentW,
    contentH: pageHeight,
    onChange: onZoomChange,
    onPinch: onPinchChange,
    outer: outerGesture,
  });

  useEffect(() => {
    if (!active) {
      reset(false);
    }
  }, [active, reset]);

  const gesture = useMemo(() => {
    const slotAt = (x: number, y: number) => {
      const point = toContent(x, y);
      const slot = slotAtPoint(point.x, pageWidth, slots, pageIds.length, rtl);
      const left = rtl ? contentW - (slot + 1) * pageWidth : slot * pageWidth;
      const onBadge =
        point.x >= left + pageWidth - BADGE_ZONE &&
        point.x <= left + pageWidth &&
        point.y >= 0 &&
        point.y <= BADGE_ZONE;
      return { pageId: pageIds[slot], onBadge };
    };
    const tap = Gesture.Tap()
      .runOnJS(true)
      .maxDistance(16)
      .onEnd((e, ok) => {
        if (!ok) {
          return;
        }
        const hit = slotAt(e.x, e.y);
        if (!zoomed && hit.onBadge && useStory.getState().pages[hit.pageId]?.flag) {
          onFlag(hit.pageId);
        } else {
          onTap(e.absoluteX, zoomed);
        }
      });
    const doubleTap = Gesture.Tap()
      .runOnJS(true)
      .numberOfTaps(2)
      .maxDelay(220)
      .maxDistance(16)
      .onEnd((e, ok) => {
        if (!ok) {
          return;
        }
        if (onDoubleTap) {
          onDoubleTap(e.absoluteX, e.absoluteY);
        } else {
          toggleAt(e.x, e.y);
        }
      });
    const longPress = Gesture.LongPress()
      .runOnJS(true)
      .minDuration(450)
      .numberOfPointers(1)
      .maxDistance(12)
      .onStart(e => onFlag(slotAt(e.x, e.y).pageId));
    const touches = Gesture.Race(longPress, Gesture.Exclusive(doubleTap, tap));
    return zoomable ? Gesture.Simultaneous(pinch, pan, touches) : touches;
  }, [
    pinch,
    pan,
    zoomed,
    zoomable,
    toggleAt,
    toContent,
    pageIds,
    slots,
    pageWidth,
    contentW,
    rtl,
    onTap,
    onFlag,
    onDoubleTap,
  ]);

  return (
    <View style={[styles.frame, styles.clip, { width: frameWidth, height: frameHeight }]}>
      <GestureDetector gesture={gesture}>
        <Animated.View collapsable={false} style={[StyleSheet.absoluteFill, styles.frame]}>
          <Animated.View
            style={[styles.spread, rtl && styles.spreadRtl, { width: contentW, height: pageHeight }, zoomable && style]}
          >
            {pageIds.map(id => (
              <PageSlot key={id} pageId={id} width={pageWidth} options={options} />
            ))}
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

function FlagEditor({ pageId, flag, onClose }: { pageId: ID; flag: PageFlag | undefined; onClose: () => void }) {
  const [note, setNote] = useState(flag?.note ?? '');
  const [reasons, setReasons] = useState<string[]>(flag?.reasons ?? []);
  const toggle = (reason: string) =>
    setReasons(list => (list.includes(reason) ? list.filter(item => item !== reason) : [...list, reason]));
  const save = (next: PageFlag | undefined) => {
    useStory.getState().updatePage(pageId, { flag: next });
    onClose();
  };
  return (
    <View style={styles.editor}>
      <TextField
        value={note}
        onChangeText={setNote}
        placeholder="What needs fixing on this page?"
        multiline
        maxLength={300}
      />
      <View style={styles.chips}>
        {FLAG_REASONS.map(reason => (
          <Chip key={reason} label={reason} selected={reasons.includes(reason)} onPress={() => toggle(reason)} />
        ))}
      </View>
      <View style={styles.row}>
        {flag && <Button title="Remove flag" variant="secondary" style={styles.flex} onPress={() => save(undefined)} />}
        <Button
          title={flag ? 'Save' : 'Flag page'}
          icon={Flag}
          style={styles.flex}
          onPress={() => save({ note: note.trim(), reasons })}
        />
      </View>
    </View>
  );
}

export function FlagSheet({
  pageId,
  pageLabel,
  onClose,
}: {
  pageId: ID | null;
  pageLabel: string;
  onClose: () => void;
}) {
  const page = usePage(pageId ?? undefined);
  return (
    <Sheet
      visible={!!pageId}
      onClose={onClose}
      title={page?.flag ? 'Edit flag' : 'Flag this page'}
      subtitle={pageLabel}
    >
      {pageId && <FlagEditor key={pageId} pageId={pageId} flag={page?.flag} onClose={onClose} />}
    </Sheet>
  );
}

export function FlagListSheet({
  visible,
  onClose,
  pageIds,
  onJump,
}: {
  visible: boolean;
  onClose: () => void;
  pageIds: ID[];
  onJump: (pageId: ID) => void;
}) {
  const { c } = useTheme();
  const pages = useStory(s => s.pages);
  const flagged = pageIds.filter(id => !!pages[id]?.flag);
  const clearAll = async () => {
    if (await confirm('Remove all flags?', 'Every flag in this chapter will be cleared.', { destructive: true })) {
      const { updatePage } = useStory.getState();
      flagged.forEach(id => updatePage(id, { flag: undefined }));
      onClose();
    }
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Flags" subtitle={`${flagged.length} in this chapter`} scroll>
      <View style={styles.editor}>
        {flagged.length === 0 && (
          <Text style={[font.body, { color: c.textSecondary }]}>
            No flags yet. Long-press a page to mark something to fix.
          </Text>
        )}
        {flagged.map(id => {
          const flag = pages[id].flag as PageFlag;
          return (
            <ComicCard
              key={id}
              shadow={0}
              contentStyle={styles.flagItem}
              onPress={() => {
                onClose();
                onJump(id);
              }}
            >
              <Text style={[font.overline, { color: c.accent }]}>Page {pageIds.indexOf(id) + 1}</Text>
              {!!flag.note && <Text style={[font.body, { color: c.text }]}>{flag.note}</Text>}
              {flag.reasons.length > 0 && (
                <Text style={[font.caption, { color: c.textSecondary }]}>{flag.reasons.join(' · ')}</Text>
              )}
            </ComicCard>
          );
        })}
        {flagged.length > 0 && <Button title="Remove all" variant="danger" small onPress={clearAll} />}
      </View>
    </Sheet>
  );
}

export function EndCard({
  width,
  height,
  chapterNumber,
  pageCount,
  hasNext,
  onNext,
  onExport,
  onClose,
}: {
  width: number;
  height: number;
  chapterNumber: number;
  pageCount: number;
  hasNext: boolean;
  onNext: () => void;
  onExport: () => void;
  onClose: () => void;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.frame, { width, height }]}>
      <ComicCard style={styles.endCard} contentStyle={styles.endContent} halftone>
        <Text style={[font.display, styles.center, { color: c.text }]}>End of chapter {chapterNumber}</Text>
        <Text style={[font.caption, styles.center, { color: c.textSecondary }]}>
          {pageCount === 1 ? '1 page' : `${pageCount} pages`}
        </Text>
        {hasNext && <Button title="Read next chapter" onPress={onNext} />}
        <Button title="Export" variant={hasNext ? 'secondary' : 'primary'} onPress={onExport} />
        <Button title="Close" variant="ghost" onPress={onClose} />
      </ComicCard>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  frame: { alignItems: 'center', justifyContent: 'center' },
  clip: { overflow: 'hidden' },
  spread: { flexDirection: 'row', alignItems: 'center' },
  spreadRtl: { flexDirection: 'row-reverse' },
  unfinished: {
    position: 'absolute',
    top: space.sm,
    left: space.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    opacity: 0.7,
  },
  flagBadge: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editor: { gap: space.md, padding: space.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
  flagItem: { padding: space.md, gap: space.xs },
  endCard: { width: '80%', maxWidth: 360 },
  endContent: { padding: space.lg, gap: space.md },
});
