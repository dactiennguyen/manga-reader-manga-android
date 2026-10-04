import { memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import type { ViewMode } from '../../store/useReaderSettings';
import { PageImage } from './PageImage';
import type { ViewerProps } from './viewerTypes';

type Props = ViewerProps & {
  mode: Exclude<ViewMode, 'vertical'>;
  /** Đọc phải → trái (chỉ có tác dụng khi lật ngang). */
  rtl: boolean;
};

/** Một màn lật: 1–2 trang, hoặc khối "Hết chương" (pages rỗng). */
type Slot = { key: string; pages: number[] };

function buildSlots(count: number, perSlot: number): Slot[] {
  const slots: Slot[] = [];
  for (let i = 0; i < count; i += perSlot) {
    const pages = perSlot === 2 && i + 1 < count ? [i, i + 1] : [i];
    slots.push({ key: `p${i}`, pages });
  }
  slots.push({ key: 'end', pages: [] });
  return slots;
}

const keyExtractor = (slot: Slot) => slot.key;

/**
 * Lật trang: `horizontal` (vuốt ngang từng trang), `single` (vuốt dọc từng
 * trang), `double` (hai trang một màn, vuốt ngang). RTL đảo thứ tự dữ liệu để
 * trang đầu nằm bên phải.
 */
export const PagedViewer = memo(function PagedViewerView({
  ref,
  pages,
  getInitialPage,
  mode,
  rtl,
  width,
  height,
  highRes,
  preloadPages,
  footer,
  onPageChange,
  onEndVisible,
  onTap,
  onLongPressPage,
  onVerify,
}: Props) {
  const listRef = useRef<FlatList<Slot>>(null);
  const horizontal = mode !== 'single';
  const reversed = horizontal && rtl;
  const perSlot = mode === 'double' ? 2 : 1;
  const size = horizontal ? width : height;

  const slots = useMemo(() => buildSlots(pages.length, perSlot), [pages.length, perSlot]);
  const data = useMemo(() => (reversed ? [...slots].reverse() : slots), [slots, reversed]);
  const lastSlot = slots.length - 1;
  const toDataIndex = useCallback((slot: number) => (reversed ? lastSlot - slot : slot), [reversed, lastSlot]);

  const [initialPage] = useState(getInitialPage);
  const [initialSlot] = useState(() => Math.min(Math.floor(initialPage / perSlot), lastSlot));
  const tracking = useRef({ slot: initialSlot, atEnd: false });

  useEffect(() => {
    onPageChange(initialPage);
  }, [initialPage, onPageChange]);

  const showSlot = useCallback(
    (slot: number) => {
      const t = tracking.current;
      if (slot === t.slot) {
        return;
      }
      t.slot = slot;
      const atEnd = slot === lastSlot;
      onPageChange(atEnd ? pages.length - 1 : slot * perSlot);
      if (atEnd !== t.atEnd) {
        t.atEnd = atEnd;
        onEndVisible(atEnd);
      }
    },
    [lastSlot, pages.length, perSlot, onPageChange, onEndVisible],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset } = event.nativeEvent;
      const index = Math.round((horizontal ? contentOffset.x : contentOffset.y) / size);
      const slot = reversed ? lastSlot - index : index;
      showSlot(Math.min(lastSlot, Math.max(0, slot)));
    },
    [horizontal, size, reversed, lastSlot, showSlot],
  );

  // Xoay màn hình: kích thước trang đổi nên offset cũ không còn đúng.
  const sizeRef = useRef(size);
  useEffect(() => {
    if (sizeRef.current === size) {
      return;
    }
    sizeRef.current = size;
    listRef.current?.scrollToIndex({ index: toDataIndex(tracking.current.slot), animated: false });
  }, [size, toDataIndex]);

  useImperativeHandle(
    ref,
    () => ({
      goToPage: page => {
        const slot = Math.min(lastSlot, Math.max(0, Math.floor(page / perSlot)));
        listRef.current?.scrollToIndex({ index: toDataIndex(slot), animated: false });
        showSlot(slot);
      },
      step: direction => {
        const slot = tracking.current.slot + direction;
        if (slot < 0 || slot > lastSlot) {
          return false;
        }
        listRef.current?.scrollToIndex({ index: toDataIndex(slot), animated: true });
        return true;
      },
    }),
    [lastSlot, perSlot, toDataIndex, showSlot],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<Slot> | null | undefined, index: number) => ({ length: size, offset: size * index, index }),
    [size],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Slot>) => {
      if (!item.pages.length) {
        return (
          <Pressable onPress={onTap} style={[styles.slot, { width, height }]}>
            {footer}
          </Pressable>
        );
      }
      const order = reversed ? [...item.pages].reverse() : item.pages;
      return (
        <View style={[styles.slot, styles.row, { width, height }]}>
          {order.map(index => (
            <PageImage
              key={index}
              page={pages[index]}
              index={index}
              width={width / perSlot}
              height={height}
              highRes={highRes}
              onPress={onTap}
              onLongPress={onLongPressPage}
              onVerify={onVerify}
            />
          ))}
        </View>
      );
    },
    [width, height, reversed, pages, perSlot, highRes, footer, onTap, onLongPressPage, onVerify],
  );

  return (
    <FlatList
      ref={listRef}
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      horizontal={horizontal}
      pagingEnabled
      getItemLayout={getItemLayout}
      initialScrollIndex={toDataIndex(initialSlot)}
      initialNumToRender={1}
      maxToRenderPerBatch={2}
      windowSize={Math.max(3, preloadPages * 2 + 1)}
      removeClippedSubviews
      onScroll={handleScroll}
      scrollEventThrottle={16}
      decelerationRate="fast"
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
    />
  );
});

const styles = StyleSheet.create({
  slot: { justifyContent: 'center', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
