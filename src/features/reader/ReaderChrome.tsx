import {
  ArrowLeft,
  ArrowLeftRight,
  Columns2,
  EllipsisVertical,
  GalleryHorizontal,
  GalleryVertical,
  ListOrdered,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RectangleVertical,
  SeparatorHorizontal,
  Settings2,
  SkipBack,
  SkipForward,
  type LucideIcon,
} from 'lucide-react-native';
import { memo, useEffect, useMemo, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton, Slider } from '../../components/ui';
import type { ViewMode } from '../../store/useReaderSettings';
import { space, useTheme } from '../../theme';
import { useStoreValue, type ValueStore } from './valueStore';

export type ReaderChromeActions = {
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (page: number) => void;
  onOpenChapters: () => void;
  onOpenSettings: () => void;
  onOpenMenu: () => void;
  onCycleMode: () => void;
  onToggleDirection: () => void;
  onToggleGap: () => void;
  onToggleAutoScroll: () => void;
  onToggleImmersive: () => void;
};

type Props = {
  visible: boolean;
  title: string;
  subtitle: string;
  pageStore: ValueStore<number>;
  /** Số trang; 0 = chương chưa sẵn sàng, ẩn thanh dưới. */
  total: number;
  viewMode: ViewMode;
  rtl: boolean;
  pageGap: boolean;
  autoPlaying: boolean;
  immersive: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  actions: ReaderChromeActions;
};

const WHITE = '#FFFFFF';
const BAR_BG = 'rgba(0,0,0,0.82)';

const MODE_ICONS: Record<ViewMode, LucideIcon> = {
  vertical: GalleryVertical,
  horizontal: GalleryHorizontal,
  single: RectangleVertical,
  double: Columns2,
};

/** Thanh slider trang — tự theo dõi trang hiện tại để reader không phải render lại. */
function PageSlider({
  store,
  total,
  onSeek,
}: {
  store: ValueStore<number>;
  total: number;
  onSeek: (page: number) => void;
}) {
  const page = useStoreValue(store);
  const [preview, setPreview] = useState<number | null>(null);
  const value = Math.min(total, page + 1);

  useEffect(() => {
    setPreview(null);
  }, [page]);

  return (
    <View style={styles.sliderWrap}>
      <Slider
        value={value}
        min={1}
        max={total}
        step={1}
        disabled={total <= 1}
        onChange={setPreview}
        onComplete={target => {
          setPreview(null);
          onSeek(target - 1);
        }}
        style={styles.slider}
      />
      <Text style={styles.pageLabel}>
        {preview ?? value} / {total}
      </Text>
    </View>
  );
}

/** Thanh trên/dưới của reader manga, ẩn/hiện bằng hiệu ứng mờ + trượt. */
export const ReaderChrome = memo(function ReaderChromeView({
  visible,
  title,
  subtitle,
  pageStore,
  total,
  viewMode,
  rtl,
  pageGap,
  autoPlaying,
  immersive,
  hasPrev,
  hasNext,
  actions,
}: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [progress] = useState(() => new Animated.Value(visible ? 1 : 0));

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [visible, progress]);

  const topStyle = useMemo(
    () => ({
      opacity: progress,
      transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
    }),
    [progress],
  );
  const bottomStyle = useMemo(
    () => ({
      opacity: progress,
      transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
    }),
    [progress],
  );

  const pointerEvents = visible ? 'box-none' : 'none';
  const horizontalAxis = viewMode === 'horizontal' || viewMode === 'double';
  const activeColor = (on: boolean) => (on ? c.accent : WHITE);

  return (
    <>
      <Animated.View pointerEvents={pointerEvents} style={[styles.top, { paddingTop: insets.top }, topStyle]}>
        <View style={styles.bar}>
          <IconButton icon={ArrowLeft} color={WHITE} onPress={actions.onBack} accessibilityLabel="Quay lại" />
          <View style={styles.titles}>
            <Text numberOfLines={1} style={styles.title}>
              {title || subtitle}
            </Text>
            {!!title && (
              <Text numberOfLines={1} style={styles.subtitle}>
                {subtitle}
              </Text>
            )}
          </View>
          <IconButton
            icon={ListOrdered}
            color={WHITE}
            onPress={actions.onOpenChapters}
            accessibilityLabel="Chọn chương"
          />
          <IconButton
            icon={Settings2}
            color={WHITE}
            onPress={actions.onOpenSettings}
            accessibilityLabel="Cài đặt trình xem"
          />
          <IconButton icon={EllipsisVertical} color={WHITE} onPress={actions.onOpenMenu} accessibilityLabel="Thêm" />
        </View>
      </Animated.View>

      {total > 0 && (
        <Animated.View
          pointerEvents={pointerEvents}
          style={[styles.bottom, { paddingBottom: insets.bottom + space.xs }, bottomStyle]}
        >
          <View style={styles.bar}>
            <IconButton
              icon={SkipBack}
              color={WHITE}
              disabled={!hasPrev}
              onPress={actions.onPrev}
              accessibilityLabel="Chương trước"
            />
            <PageSlider store={pageStore} total={total} onSeek={actions.onSeek} />
            <IconButton
              icon={SkipForward}
              color={WHITE}
              disabled={!hasNext}
              onPress={actions.onNext}
              accessibilityLabel="Chương sau"
            />
          </View>
          <View style={styles.tools}>
            <IconButton
              icon={MODE_ICONS[viewMode]}
              color={WHITE}
              onPress={actions.onCycleMode}
              accessibilityLabel="Đổi chế độ xem"
            />
            {horizontalAxis && (
              <IconButton
                icon={ArrowLeftRight}
                color={activeColor(rtl)}
                active={rtl}
                onPress={actions.onToggleDirection}
                accessibilityLabel="Đổi hướng vuốt"
              />
            )}
            {viewMode === 'vertical' && (
              <>
                <IconButton
                  icon={SeparatorHorizontal}
                  color={activeColor(pageGap)}
                  active={pageGap}
                  onPress={actions.onToggleGap}
                  accessibilityLabel="Khoảng cách giữa trang"
                />
                <IconButton
                  icon={autoPlaying ? Pause : Play}
                  color={activeColor(autoPlaying)}
                  active={autoPlaying}
                  onPress={actions.onToggleAutoScroll}
                  accessibilityLabel={autoPlaying ? 'Dừng tự cuộn' : 'Tự cuộn'}
                />
              </>
            )}
            <IconButton
              icon={immersive ? Minimize2 : Maximize2}
              color={activeColor(immersive)}
              active={immersive}
              onPress={actions.onToggleImmersive}
              accessibilityLabel="Chế độ toàn màn hình"
            />
          </View>
        </Animated.View>
      )}
    </>
  );
});

const styles = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: BAR_BG },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: BAR_BG },
  bar: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: space.xs },
  titles: { flex: 1, paddingHorizontal: space.xs },
  title: { color: WHITE, fontSize: 16, fontWeight: '700' },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  sliderWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  slider: { flex: 1 },
  pageLabel: { color: WHITE, fontSize: 13, fontWeight: '600', minWidth: 56, textAlign: 'right' },
  tools: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', paddingBottom: space.xs },
});
