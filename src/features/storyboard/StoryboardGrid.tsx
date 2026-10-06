import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  edgeVelocity,
  gridBoxes,
  nearestIndex,
  previewOffsets,
  type GridSpec,
  type ItemSize,
  type Offset,
} from '../../components/reorder';
import {
  DragGhost,
  EDGE_SIZE,
  EDGE_SPEED,
  liftGesture,
  SETTLE_MS,
  useDragState,
  type DragState,
} from '../../components/Sortable';
import { haptic } from '../../lib/haptics';
import type { ID } from '../../model/types';
import { space } from '../../theme';
import { PageThumb, THUMB_META_H } from './PageThumb';

type Row = { key: string; pageIds: ID[] };
type Lifted = { index: number; id: ID; left: number; top: number };

type GridDrag = {
  drag: DragState;
  active: SharedValue<number>;
  offsets: SharedValue<Offset[]>;
  animate: SharedValue<boolean>;
  lift: (index: number) => void;
  change: () => void;
  release: (moved: boolean) => void;
  cancel: () => void;
};

function GridItem({
  index,
  enabled,
  grid,
  children,
}: {
  index: number;
  enabled: boolean;
  grid: GridDrag;
  children: React.ReactNode;
}) {
  const { drag, active, offsets, animate, lift, change, release, cancel } = grid;
  const gesture = useMemo(
    () =>
      liftGesture({
        drag,
        enabled,
        onLift: () => {
          'worklet';
          lift(index);
        },
        onChange: change,
        onRelease: release,
        onCancel: cancel,
      }),
    [drag, enabled, index, lift, change, release, cancel],
  );
  const style = useAnimatedStyle(() => {
    const offset = offsets.value[index];
    const x = offset ? offset.x : 0;
    const y = offset ? offset.y : 0;
    return {
      opacity: active.value === index && drag.ghost.value ? 0 : 1,
      transform: [
        { translateX: animate.value ? withTiming(x, { duration: SETTLE_MS }) : x },
        { translateY: animate.value ? withTiming(y, { duration: SETTLE_MS }) : y },
      ],
    };
  });
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={style}>{children}</Animated.View>
    </GestureDetector>
  );
}

export function StoryboardGrid({
  pageIds,
  thumbs,
  columns,
  rtl,
  selection,
  onPressPage,
  onLongPressPage,
  onMove,
}: {
  pageIds: ID[];
  thumbs: ItemSize[];
  columns: 1 | 2;
  rtl: boolean;
  selection: ID[] | null;
  onPressPage: (pageId: ID) => void;
  onLongPressPage: (pageId: ID) => void;
  onMove: (from: number, to: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const [lifted, setLifted] = useState<Lifted | null>(null);
  const busy = useRef(false);
  const handlers = useRef({ onLongPressPage, onMove });
  useEffect(() => {
    handlers.current = { onLongPressPage, onMove };
  });
  const listRef = useAnimatedRef<Animated.FlatList<Row>>();
  const drag = useDragState();
  const active = useSharedValue(-1);
  const target = useSharedValue(-1);
  const offsets = useSharedValue<Offset[]>([]);
  const animate = useSharedValue(false);
  const dropping = useSharedValue(false);
  const scroll = useSharedValue(0);
  const scrollStart = useSharedValue(0);
  const viewH = useSharedValue(0);
  const contentH = useSharedValue(0);

  const dragEnabled = !selection && pageIds.length > 1 && width > 0;
  const firstSolo = columns === 2;
  const spec = useMemo<GridSpec>(
    () => ({ width, pad: space.lg, gap: space.md, columns, firstSolo, rtl }),
    [width, columns, firstSolo, rtl],
  );
  const sizes = useMemo(() => thumbs.map(size => ({ w: size.w, h: size.h + THUMB_META_H })), [thumbs]);
  const boxes = useMemo(() => gridBoxes(sizes, spec), [sizes, spec]);
  const layout = useDerivedValue(() => ({ sizes, spec, boxes }));

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let start = 0;
    while (start < pageIds.length) {
      const count = firstSolo && start === 0 ? 1 : columns;
      out.push({ key: pageIds[start], pageIds: pageIds.slice(start, start + count) });
      start += count;
    }
    return out;
  }, [pageIds, columns, firstSolo]);

  const frame = useRef<{ setActive: (active: boolean) => void } | null>(null);

  const onLiftJS = useCallback(
    (index: number, scrollY: number) => {
      const box = boxes[index];
      busy.current = true;
      frame.current?.setActive(true);
      if (box) {
        setLifted({ index, id: pageIds[index], left: box.x, top: box.y - scrollY });
      }
    },
    [boxes, pageIds],
  );

  const clear = useCallback(() => {
    animate.value = false;
    offsets.value = [];
    active.value = -1;
    target.value = -1;
    dropping.value = false;
    drag.lifted.value = 0;
    frame.current?.setActive(false);
    setLifted(null);
    setTimeout(() => {
      busy.current = false;
    }, 200);
  }, [active, animate, drag.lifted, dropping, offsets, target]);

  const openMenu = useCallback(
    (index: number) => {
      clear();
      const id = pageIds[index];
      if (id) {
        handlers.current.onLongPressPage(id);
      }
    },
    [clear, pageIds],
  );

  const finish = useCallback(
    (from: number, to: number) => {
      haptic();
      if (from !== to && from >= 0 && to >= 0) {
        handlers.current.onMove(from, to);
      }
      clear();
    },
    [clear],
  );

  const retarget = useCallback(() => {
    'worklet';
    const from = active.value;
    const state = layout.value;
    const box = state.boxes[from];
    if (from < 0 || !box || dropping.value || !drag.moved.value) {
      return;
    }
    const x = box.x + box.w / 2 + drag.tx.value;
    const y = box.y + box.h / 2 + drag.ty.value + scroll.value - scrollStart.value;
    const next = nearestIndex(state.boxes, x, y);
    if (next >= 0 && next !== target.value) {
      target.value = next;
      offsets.value = previewOffsets(state.sizes, state.spec, from, next);
    }
  }, [active, drag.moved, drag.tx, drag.ty, dropping, layout, offsets, scroll, scrollStart, target]);

  const lift = useCallback(
    (index: number) => {
      'worklet';
      active.value = index;
      target.value = index;
      offsets.value = [];
      animate.value = true;
      dropping.value = false;
      scrollStart.value = scroll.value;
      scheduleOnRN(onLiftJS, index, scroll.value);
    },
    [active, animate, dropping, offsets, onLiftJS, scroll, scrollStart, target],
  );

  const release = useCallback(
    (moved: boolean) => {
      'worklet';
      const from = active.value;
      if (from < 0) {
        return;
      }
      if (!moved) {
        scheduleOnRN(openMenu, from);
        return;
      }
      const to = target.value;
      const offset = offsets.value[from];
      dropping.value = true;
      drag.lifted.value = withTiming(0, { duration: SETTLE_MS });
      drag.tx.value = withTiming(offset ? offset.x : 0, { duration: SETTLE_MS });
      drag.ty.value = withTiming(
        (offset ? offset.y : 0) - (scroll.value - scrollStart.value),
        { duration: SETTLE_MS },
        () => {
          scheduleOnRN(finish, from, to);
        },
      );
    },
    [active, drag.lifted, drag.tx, drag.ty, dropping, finish, offsets, openMenu, scroll, scrollStart, target],
  );

  const cancel = useCallback(() => {
    'worklet';
    if (active.value >= 0 && !dropping.value) {
      scheduleOnRN(clear);
    }
  }, [active, clear, dropping]);

  frame.current = useFrameCallback(() => {
    const from = active.value;
    const box = layout.value.boxes[from];
    if (from < 0 || !box || dropping.value || !drag.moved.value) {
      return;
    }
    const position = box.y + box.h / 2 - scrollStart.value + drag.ty.value;
    const velocity = edgeVelocity(position, viewH.value, EDGE_SIZE, EDGE_SPEED);
    const max = Math.max(0, contentH.value - viewH.value);
    const next = Math.min(max, Math.max(0, scroll.value + velocity));
    if (velocity !== 0 && next !== scroll.value) {
      scrollTo(listRef, 0, next, false);
      retarget();
    }
  }, false);

  const onScroll = useAnimatedScrollHandler(event => {
    scroll.value = event.contentOffset.y;
  });

  const grid = useMemo<GridDrag>(
    () => ({ drag, active, offsets, animate, lift, change: retarget, release, cancel }),
    [drag, active, offsets, animate, lift, retarget, release, cancel],
  );

  const renderThumb = (pageId: ID, ghost?: boolean) => {
    const index = pageIds.indexOf(pageId);
    const size = thumbs[index];
    if (!size) {
      return null;
    }
    const thumb = (
      <PageThumb
        pageId={pageId}
        number={index + 1}
        width={size.w}
        height={size.h}
        selecting={!!selection}
        selected={selection?.includes(pageId)}
        onPress={() => {
          if (!busy.current) {
            onPressPage(pageId);
          }
        }}
        onLongPress={dragEnabled ? undefined : () => onLongPressPage(pageId)}
      />
    );
    return ghost ? (
      thumb
    ) : (
      <GridItem key={pageId} index={index} enabled={dragEnabled} grid={grid}>
        {thumb}
      </GridItem>
    );
  };

  return (
    <View
      style={styles.flex}
      onLayout={event => {
        setWidth(event.nativeEvent.layout.width);
        viewH.value = event.nativeEvent.layout.height;
      }}
    >
      <Animated.FlatList
        ref={listRef}
        data={rows}
        extraData={selection}
        keyExtractor={row => row.key}
        renderItem={({ item }) => (
          <View style={[styles.row, rtl && styles.rtlRow]}>{item.pageIds.map(id => renderThumb(id))}</View>
        )}
        onScroll={onScroll}
        scrollEventThrottle={16}
        scrollEnabled={!lifted}
        removeClippedSubviews={false}
        onContentSizeChange={(_w, h) => {
          contentH.value = h;
        }}
        contentContainerStyle={styles.content}
      />
      {lifted && (
        <DragGhost drag={drag} left={lifted.left} top={lifted.top} width={thumbs[lifted.index]?.w ?? 0}>
          {renderThumb(lifted.id, true)}
        </DragGhost>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, overflow: 'hidden' },
  content: { padding: space.lg, paddingBottom: 96, gap: space.md },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start' },
  rtlRow: { flexDirection: 'row-reverse' },
});
