import {
  ALargeSmall,
  ArrowLeft,
  EllipsisVertical,
  Headphones,
  ListOrdered,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Square,
  type LucideIcon,
} from 'lucide-react-native';
import { memo, useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '../../components/ui';
import { font, radius, space } from '../../theme';
import { useStoreValue, type ValueStore } from '../reader/valueStore';
import type { NovelPalette } from './novelThemes';
import type { TtsState } from './useTts';

export type NovelChromeActions = {
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenChapters: () => void;
  onOpenSettings: () => void;
  onOpenMenu: () => void;
  onReadAloud: () => void;
  onPauseTts: () => void;
  onResumeTts: () => void;
  onStopTts: () => void;
};

type Props = {
  visible: boolean;
  title: string;
  subtitle: string;
  palette: NovelPalette;
  /** % đã đọc của chương (0–100). */
  progressStore: ValueStore<number>;
  /** Chương đã sẵn sàng — chưa thì ẩn thanh dưới. */
  ready: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  ttsState: TtsState;
  ttsIndex: number | null;
  paragraphCount: number;
  actions: NovelChromeActions;
};

function ProgressLabel({ store, palette }: { store: ValueStore<number>; palette: NovelPalette }) {
  const percent = useStoreValue(store);
  return (
    <View style={styles.progress}>
      <View style={[styles.track, { backgroundColor: palette.border }]}>
        <View style={[styles.fill, { width: `${percent}%`, backgroundColor: palette.accent }]} />
      </View>
      <Text style={[font.caption, styles.bold, { color: palette.muted }]}>{percent}%</Text>
    </View>
  );
}

function PillButton({
  icon: Icon,
  label,
  onPress,
  palette,
  primary,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  palette: NovelPalette;
  primary?: boolean;
}) {
  const fg = primary ? palette.bg : palette.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.pill,
        { borderColor: primary ? palette.accent : palette.border },
        primary && { backgroundColor: palette.accent },
        pressed && styles.pressed,
      ]}
    >
      <Icon size={16} color={fg} />
      <Text style={[font.label, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

/** Thanh trên/dưới của reader novel và thanh điều khiển đọc to. */
export const NovelChrome = memo(function NovelChromeView({
  visible,
  title,
  subtitle,
  palette,
  progressStore,
  ready,
  hasPrev,
  hasNext,
  ttsState,
  ttsIndex,
  paragraphCount,
  actions,
}: Props) {
  const insets = useSafeAreaInsets();
  const [progress] = useState(() => new Animated.Value(visible ? 1 : 0));
  const [bottomHeight, setBottomHeight] = useState(0);

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
  const barColors = { backgroundColor: palette.bar, borderColor: palette.border };
  const showBottom = ready;
  const ttsBottom = (visible && showBottom ? bottomHeight : insets.bottom) + space.md;

  return (
    <>
      <Animated.View
        pointerEvents={pointerEvents}
        style={[styles.top, barColors, { paddingTop: insets.top }, topStyle]}
      >
        <View style={styles.bar}>
          <IconButton icon={ArrowLeft} color={palette.text} onPress={actions.onBack} accessibilityLabel="Quay lại" />
          <View style={styles.titles}>
            <Text numberOfLines={1} style={[font.label, { color: palette.text }]}>
              {subtitle}
            </Text>
            {!!title && (
              <Text numberOfLines={1} style={[font.caption, { color: palette.muted }]}>
                {title}
              </Text>
            )}
          </View>
          <IconButton
            icon={ListOrdered}
            color={palette.text}
            onPress={actions.onOpenChapters}
            accessibilityLabel="Chọn chương"
          />
          <IconButton
            icon={ALargeSmall}
            color={palette.text}
            onPress={actions.onOpenSettings}
            accessibilityLabel="Cài đặt đọc"
          />
          <IconButton
            icon={EllipsisVertical}
            color={palette.text}
            onPress={actions.onOpenMenu}
            accessibilityLabel="Thêm"
          />
        </View>
      </Animated.View>

      {showBottom && (
        <Animated.View
          pointerEvents={pointerEvents}
          onLayout={(event: LayoutChangeEvent) => setBottomHeight(event.nativeEvent.layout.height)}
          style={[styles.bottom, barColors, { paddingBottom: insets.bottom }, bottomStyle]}
        >
          <View style={styles.bar}>
            <IconButton
              icon={SkipBack}
              color={palette.text}
              disabled={!hasPrev}
              onPress={actions.onPrev}
              accessibilityLabel="Chương trước"
            />
            <ProgressLabel store={progressStore} palette={palette} />
            {ttsState === 'idle' && (
              <PillButton icon={Headphones} label="Đọc to" onPress={actions.onReadAloud} palette={palette} />
            )}
            <IconButton
              icon={SkipForward}
              color={palette.text}
              disabled={!hasNext}
              onPress={actions.onNext}
              accessibilityLabel="Chương sau"
            />
          </View>
        </Animated.View>
      )}

      {ttsState !== 'idle' && (
        <View style={[styles.tts, barColors, { bottom: ttsBottom }]}>
          <View style={styles.ttsText}>
            <Text style={[font.label, { color: palette.text }]}>
              {ttsState === 'playing' ? 'Đang đọc to' : 'Đã tạm dừng'}
            </Text>
            {ttsIndex !== null && (
              <Text style={[font.caption, { color: palette.muted }]}>
                Đoạn {ttsIndex + 1}/{paragraphCount}
              </Text>
            )}
          </View>
          {ttsState === 'playing' ? (
            <PillButton icon={Pause} label="Tạm dừng" onPress={actions.onPauseTts} palette={palette} primary />
          ) : (
            <PillButton icon={Play} label="Tiếp tục" onPress={actions.onResumeTts} palette={palette} primary />
          )}
          <PillButton icon={Square} label="Dừng" onPress={actions.onStopTts} palette={palette} />
        </View>
      )}
    </>
  );
});

const styles = StyleSheet.create({
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bar: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: space.xs, gap: space.xs },
  titles: { flex: 1, paddingHorizontal: space.xs },
  progress: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.xs },
  track: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4 },
  bold: { fontWeight: '700' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  pressed: { opacity: 0.7 },
  tts: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    paddingLeft: space.lg,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  ttsText: { flex: 1 },
});
