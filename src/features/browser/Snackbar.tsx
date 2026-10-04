import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';

import { font, radius, space, useTheme } from '../../theme';

export type SnackbarData = {
  /** Đổi id để hiện lại snackbar dù cùng nội dung. */
  id: number;
  message: string;
  action?: { label: string; onPress: () => void };
};

const DURATION = 5000;

/** Thông báo ngắn có nút hành động, nằm trên thanh công cụ (vd. "Đã chặn cửa sổ bật lên"). */
export function Snackbar({ data, onHide }: { data: SnackbarData | null; onHide: () => void }) {
  const { c } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!data) {
      return;
    }
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(onHide, DURATION);
    return () => clearTimeout(timer);
  }, [data, opacity, onHide]);

  if (!data) {
    return null;
  }
  const translateY = opacity.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  return (
    <Animated.View style={[styles.wrap, { backgroundColor: c.text, opacity, transform: [{ translateY }] }]}>
      <Text style={[font.body, styles.message, { color: c.bg }]} numberOfLines={2}>
        {data.message}
      </Text>
      {data.action && (
        <Pressable
          hitSlop={8}
          onPress={() => {
            data.action?.onPress();
            onHide();
          }}
        >
          <Text style={[font.label, { color: c.accent }]}>{data.action.label}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    bottom: space.md,
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  message: { flex: 1 },
});
