import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Puzzle } from '../../components/icons';
import { Button, Checkbox } from '../../components/ui';
import { font, radius, space, useTheme } from '../../theme';

const CARD_MAX_WIDTH = 420;
const ARROW = 12;

export function AddonPrompt({
  title,
  anchorX,
  onCancel,
  onRun,
}: {
  title: string;
  anchorX: number | null;
  onCancel: () => void;
  onRun: (autoNext: boolean) => void;
}) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const [autoNext, setAutoNext] = useState(false);
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [appear]);

  const cardWidth = Math.min(width - space.sm * 2, CARD_MAX_WIDTH);
  const arrowLeft =
    anchorX === null ? null : Math.min(cardWidth - ARROW * 2, Math.max(ARROW, anchorX - space.sm - ARROW / 2));
  const translateY = appear.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] });

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Đóng" />
      <Animated.View
        accessibilityRole="alert"
        style={[styles.wrap, { width: cardWidth, opacity: appear, transform: [{ translateY }] }]}
      >
        {arrowLeft !== null && (
          <View style={[styles.arrow, { left: arrowLeft, backgroundColor: c.elevated }]} />
        )}
        <View style={[styles.card, { backgroundColor: c.elevated }]}>
          <View style={styles.titleRow}>
            <Puzzle size={20} color={c.addon} fill={c.addon} />
            <Text numberOfLines={1} style={[font.heading, styles.flex, { color: c.text }]}>
              {title}
            </Text>
          </View>
          <Text style={[font.body, { color: c.textSecondary }]}>Trang này được addon hỗ trợ, chạy addon?</Text>
          <Checkbox checked={autoNext} onChange={setAutoNext} label="Tự chạy addon lần sau" />
          <View style={styles.actions}>
            <Button title="Huỷ" variant="ghost" small onPress={onCancel} />
            <Button title="Chạy addon" small onPress={() => onRun(autoNext)} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { position: 'absolute', top: ARROW / 2 + 2, left: space.sm },
  arrow: {
    position: 'absolute',
    top: -ARROW / 2,
    width: ARROW,
    height: ARROW,
    transform: [{ rotate: '45deg' }],
    elevation: 8,
  },
  card: {
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm },
});
