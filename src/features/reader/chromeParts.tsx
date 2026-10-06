import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Sun, SunDim, type LucideIcon } from '../../components/icons';
import { darkPalette, radius, space } from '../../theme';
import { BRIGHTNESS_RANGE, useReaderBrightness } from './readerBrightness';
import { useStoreValue, type ValueStore } from './valueStore';


export const CHROME_ACCENT = darkPalette.accent;
export const CHROME_FG = '#FFFFFF';
export const CHROME_SCRIM = 'rgba(0,0,0,0.55)';
export const CHROME_BAR = '#101010';
const CHROME_TRACK = 'rgba(255,255,255,0.28)';
const RIPPLE = { color: 'rgba(255,255,255,0.18)', borderless: true, radius: 22 } as const;

export function useChromeAnimation(visible: boolean) {
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

  return useMemo(() => {
    const slide = (distance: number) => ({
      opacity: progress,
      transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
    });
    return {
      top: slide(-24),
      bottom: slide(24),
      side: {
        opacity: progress,
        transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
      },
      pointerEvents: (visible ? 'box-none' : 'none') as 'box-none' | 'none',
    };
  }, [progress, visible]);
}

export function ChromeButton({
  icon: Icon,
  onPress,
  color = CHROME_FG,
  size = 22,
  disabled,
  accessibilityLabel,
  style,
}: {
  icon: LucideIcon;
  onPress?: () => void;
  color?: string;
  size?: number;
  disabled?: boolean;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      android_ripple={RIPPLE}
      style={[styles.button, disabled && styles.disabled, style]}
    >
      <Icon size={size} color={color} strokeWidth={2} />
    </Pressable>
  );
}

export function SideToolbar({
  children,
  background = CHROME_SCRIM,
  borderColor,
}: {
  children: ReactNode;
  background?: string;
  borderColor?: string;
}) {
  return (
    <View pointerEvents="box-none" style={styles.sideWrap}>
      <View
        style={[
          styles.side,
          { backgroundColor: background },
          borderColor ? { borderColor, borderWidth: StyleSheet.hairlineWidth } : null,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export const SIDE_TOOLBAR_WIDTH = 52;

export function ChromeSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
  onComplete,
  disabled,
  color = CHROME_ACCENT,
  trackColor = CHROME_TRACK,
  style,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange?: (value: number) => void;
  onComplete?: (value: number) => void;
  disabled?: boolean;
  color?: string;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [width, setWidth] = useState(1);
  const [dragValue, setDragValue] = useState<number | null>(null);
  const ref = useRef({ width, min, max, step, onChange, onComplete, startX: 0 });
  ref.current = { ...ref.current, width, min, max, step, onChange, onComplete };

  const [responder] = useState(() => {
    const valueAt = (x: number) => {
      const r = ref.current;
      const ratio = Math.min(1, Math.max(0, x / r.width));
      const raw = r.min + ratio * (r.max - r.min);
      return Math.min(r.max, Math.max(r.min, Math.round(raw / r.step) * r.step));
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: event => {
        ref.current.startX = event.nativeEvent.locationX;
        const next = valueAt(ref.current.startX);
        setDragValue(next);
        ref.current.onChange?.(next);
      },
      onPanResponderMove: (_, gesture) => {
        const next = valueAt(ref.current.startX + gesture.dx);
        setDragValue(next);
        ref.current.onChange?.(next);
      },
      onPanResponderRelease: (_, gesture) => {
        const next = valueAt(ref.current.startX + gesture.dx);
        setDragValue(null);
        ref.current.onComplete?.(next);
      },
      onPanResponderTerminate: () => setDragValue(null),
    });
  });

  const shown = dragValue ?? value;
  const ratio = max > min ? Math.min(1, Math.max(0, (shown - min) / (max - min))) : 0;
  return (
    <View
      style={[styles.slider, disabled && styles.disabled, style]}
      onLayout={event => setWidth(Math.max(1, event.nativeEvent.layout.width))}
      pointerEvents={disabled ? 'none' : 'auto'}
      {...responder.panHandlers}
    >
      <View pointerEvents="none" style={[styles.track, { backgroundColor: trackColor }]}>
        <View style={[styles.trackFill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
      </View>
      <View pointerEvents="none" style={[styles.thumb, { left: ratio * width - 9, backgroundColor: color }]} />
    </View>
  );
}

export function ProgressSlider({
  store,
  total,
  onSeek,
  color = CHROME_ACCENT,
  textColor = CHROME_FG,
  trackColor,
}: {
  store: ValueStore<number>;
  total: number;
  onSeek: (index: number) => void;
  color?: string;
  textColor?: string;
  trackColor?: string;
}) {
  const index = useStoreValue(store);
  const [preview, setPreview] = useState<number | null>(null);
  const value = Math.max(1, Math.min(total, index + 1));

  useEffect(() => {
    setPreview(null);
  }, [index]);

  return (
    <View style={styles.progress}>
      <Text style={[styles.progressLabel, { color: textColor }]}>
        {preview ?? value}/{total}
      </Text>
      <ChromeSlider
        value={value}
        min={1}
        max={Math.max(1, total)}
        disabled={total <= 1}
        color={color}
        trackColor={trackColor}
        onChange={setPreview}
        onComplete={target => {
          setPreview(null);
          onSeek(target - 1);
        }}
        style={styles.flex}
      />
    </View>
  );
}

export function BrightnessSlider({
  color = CHROME_ACCENT,
  iconColor = CHROME_FG,
  trackColor,
}: {
  color?: string;
  iconColor?: string;
  trackColor?: string;
}) {
  const value = useReaderBrightness(state => state.value);
  const set = useReaderBrightness(state => state.set);
  return (
    <View style={styles.row} accessibilityLabel={`Độ sáng ${value}%`}>
      <SunDim size={18} color={iconColor} />
      <ChromeSlider
        value={value}
        min={BRIGHTNESS_RANGE.min}
        max={BRIGHTNESS_RANGE.max}
        color={color}
        trackColor={trackColor}
        onChange={set}
        style={styles.flex}
      />
      <Sun size={22} color={iconColor} />
    </View>
  );
}

export function BrightnessOverlay() {
  const value = useReaderBrightness(state => state.value);
  if (value >= BRIGHTNESS_RANGE.max) {
    return null;
  }
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.dim, { opacity: (BRIGHTNESS_RANGE.max - value) / 100 }]}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  disabled: { opacity: 0.35 },
  sideWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    justifyContent: 'center',
  },
  side: {
    width: SIDE_TOOLBAR_WIDTH,
    alignItems: 'center',
    paddingVertical: space.xs,
    gap: space.xs,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  slider: { height: 36, justifyContent: 'center' },
  track: { height: 3, borderRadius: 2, overflow: 'hidden' },
  trackFill: { height: 3 },
  thumb: { position: 'absolute', width: 18, height: 18, borderRadius: 9 },
  progress: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  progressLabel: { fontSize: 13, fontWeight: '600', minWidth: 44, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  dim: { backgroundColor: '#000' },
});
