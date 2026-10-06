import { FlashList, type FlashListRef, type ListRenderItemInfo } from '@shopify/flash-list';
import { memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import type { Page } from '../../sources/types';
import { PageImage } from './PageImage';
import { useAutoScroll, type ScrollMetrics } from './useAutoScroll';
import type { ViewerProps } from './viewerTypes';

type Props = ViewerProps & {
  pageGap: boolean;
  autoScroll: boolean;
  autoScrollSpeed: number;
  onAutoScrollEnd: () => void;
};

const READING_LINE = 0.35;
const STEP_RATIO = 0.85;
const FOOTER_MIN_RATIO = 0.6;
const MOMENTUM_FALLBACK_MS = 1500;

function PageGap() {
  return <View style={styles.gap} />;
}

const keyExtractor = (page: Page, index: number) => `${index}:${page.uri}`;

function pageAt(list: FlashListRef<Page>, count: number, y: number): number {
  let lo = 0;
  let hi = count - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const layout = list.getLayout(mid);
    if (!layout) {
      return found;
    }
    if (layout.y <= y) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

export const VerticalViewer = memo(function VerticalViewerView({
  ref,
  pages,
  getInitialPage,
  width,
  height,
  pageGap,
  highRes,
  preloadPages,
  footer,
  autoScroll,
  autoScrollSpeed,
  onAutoScrollEnd,
  onPageChange,
  onEndVisible,
  onTap,
  onLongPressPage,
  onVerify,
}: Props) {
  const listRef = useRef<FlashListRef<Page>>(null);
  const [initialPage] = useState(getInitialPage);
  const metrics = useRef<ScrollMetrics>({
    offset: 0,
    contentHeight: 0,
    viewport: height,
    userScrolling: false,
    resync: false,
  });
  metrics.current.viewport = height;
  const tracking = useRef({ page: initialPage, atEnd: false, footerHeight: 0, settled: initialPage === 0 });
  const momentumTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoScrollRef = useRef(autoScroll);
  autoScrollRef.current = autoScroll;

  useEffect(() => {
    onPageChange(initialPage);
  }, [initialPage, onPageChange]);

  const evaluate = useCallback(() => {
    const list = listRef.current;
    const m = metrics.current;
    const t = tracking.current;
    if (!list || m.contentHeight <= 0 || !pages.length) {
      return;
    }
    const atEnd = m.offset + m.viewport >= m.contentHeight - t.footerHeight / 2;
    const found = atEnd ? pages.length - 1 : pageAt(list, pages.length, m.offset + m.viewport * READING_LINE);
    const page = found < 0 ? t.page : found;
    if (page !== t.page) {
      t.page = page;
      onPageChange(page);
    }
    if (atEnd !== t.atEnd) {
      t.atEnd = atEnd;
      onEndVisible(atEnd);
    }
  }, [pages.length, onPageChange, onEndVisible]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize } = event.nativeEvent;
      metrics.current.offset = contentOffset.y;
      metrics.current.contentHeight = contentSize.height;
      tracking.current.settled = true;
      evaluate();
    },
    [evaluate],
  );

  const handleContentSize = useCallback(
    (_width: number, contentHeight: number) => {
      metrics.current.contentHeight = contentHeight;
      if (tracking.current.settled) {
        evaluate();
      }
    },
    [evaluate],
  );

  const clearMomentumTimer = useCallback(() => {
    if (momentumTimer.current) {
      clearTimeout(momentumTimer.current);
      momentumTimer.current = null;
    }
  }, []);

  const onBeginDrag = useCallback(() => {
    clearMomentumTimer();
    metrics.current.userScrolling = true;
  }, [clearMomentumTimer]);

  const onEndDrag = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const velocity = event.nativeEvent.velocity?.y ?? 0;
    if (Math.abs(velocity) < 0.05) {
      metrics.current.userScrolling = false;
      return;
    }
    clearMomentumTimer();
    momentumTimer.current = setTimeout(() => {
      momentumTimer.current = null;
      metrics.current.userScrolling = false;
    }, MOMENTUM_FALLBACK_MS);
  }, [clearMomentumTimer]);

  const onMomentumEnd = useCallback(() => {
    clearMomentumTimer();
    metrics.current.userScrolling = false;
  }, [clearMomentumTimer]);

  useEffect(() => clearMomentumTimer, [clearMomentumTimer]);

  const scrollTo = useCallback((offset: number) => {
    listRef.current?.scrollToOffset({ offset, animated: false });
  }, []);

  useAutoScroll({ active: autoScroll, speed: autoScrollSpeed, metrics, scrollTo, onEnd: onAutoScrollEnd });

  useImperativeHandle(
    ref,
    () => ({
      goToPage: page => {
        const target = Math.min(Math.max(0, page), pages.length - 1);
        listRef.current?.scrollToIndex({ index: target, animated: false }).catch(() => {});
        metrics.current.resync = true;
        tracking.current.page = target;
        onPageChange(target);
      },
      step: direction => {
        const m = metrics.current;
        const max = Math.max(0, m.contentHeight - m.viewport);
        if ((direction > 0 && m.offset >= max - 1) || (direction < 0 && m.offset <= 1)) {
          return false;
        }
        const target = Math.min(max, Math.max(0, m.offset + direction * m.viewport * STEP_RATIO));
        if (autoScrollRef.current) {
          m.offset = target;
          m.resync = true;
          listRef.current?.scrollToOffset({ offset: target, animated: false });
        } else {
          listRef.current?.scrollToOffset({ offset: target, animated: true });
        }
        return true;
      },
    }),
    [pages.length, onPageChange],
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Page>) => (
      <PageImage
        page={item}
        index={index}
        width={width}
        highRes={highRes}
        onPress={onTap}
        onLongPress={onLongPressPage}
        onVerify={onVerify}
      />
    ),
    [width, highRes, onTap, onLongPressPage, onVerify],
  );

  const onFooterLayout = useCallback((event: LayoutChangeEvent) => {
    tracking.current.footerHeight = event.nativeEvent.layout.height;
  }, []);

  const footerNode = useMemo(
    () => (
      <Pressable
        onPress={onTap}
        onLayout={onFooterLayout}
        style={[styles.footer, { minHeight: height * FOOTER_MIN_RATIO }]}
      >
        {footer}
      </Pressable>
    ),
    [footer, height, onTap, onFooterLayout],
  );

  return (
    <FlashList
      ref={listRef}
      data={pages}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      initialScrollIndex={initialPage > 0 ? initialPage : undefined}
      ItemSeparatorComponent={pageGap ? PageGap : undefined}
      ListFooterComponent={footerNode}
      drawDistance={Math.max(250, height * Math.max(1, preloadPages))}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      onContentSizeChange={handleContentSize}
      onScrollBeginDrag={onBeginDrag}
      onScrollEndDrag={onEndDrag}
      onMomentumScrollEnd={onMomentumEnd}
      showsVerticalScrollIndicator={false}
    />
  );
});

const styles = StyleSheet.create({
  gap: { height: 10 },
  footer: { justifyContent: 'center' },
});
