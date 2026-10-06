import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { Maximize2, Minimize2, X } from '../../components/icons';
import { fileUri } from '../../lib/files';
import { font, radius, space, useTheme } from '../../theme';

const REF_SIZES = [128, 208];

export function ReferenceWindow({
  path,
  initialX,
  initialY,
  onClose,
}: {
  path: string;
  initialX: number;
  initialY: number;
  onClose: () => void;
}) {
  const { c } = useTheme();
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const [big, setBig] = useState(false);
  const size = REF_SIZES[big ? 1 : 0];
  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .runOnJS(true)
      .onChange(e => setPos(p => ({ x: Math.max(0, p.x + e.changeX), y: Math.max(0, p.y + e.changeY) })));
    const doubleTap = Gesture.Tap().runOnJS(true).numberOfTaps(2).onEnd(onClose);
    return Gesture.Simultaneous(pan, doubleTap);
  }, [onClose]);
  return (
    <GestureDetector gesture={gesture}>
      <View
        style={[
          styles.ref,
          { left: pos.x, top: pos.y, width: size, backgroundColor: c.toolbar, borderColor: c.toolbar },
        ]}
      >
        <Image
          source={{ uri: fileUri(path) }}
          style={{ width: size - 4, height: size - 4 }}
          resizeMode="contain"
          accessibilityLabel="Reference image"
        />
        <View style={styles.refBar}>
          <Pressable
            onPress={() => setBig(v => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={big ? 'Shrink reference image' : 'Enlarge reference image'}
            style={styles.refButton}
          >
            {big ? <Minimize2 size={16} color={c.onToolbar} /> : <Maximize2 size={16} color={c.onToolbar} />}
          </Pressable>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Hide reference image"
            style={styles.refButton}
          >
            <X size={16} color={c.onToolbar} />
          </Pressable>
        </View>
      </View>
    </GestureDetector>
  );
}

const TIPS = [
  ['One finger', 'Draw. Press and hold to pick a color.'],
  ['Two fingers', 'Drag to pan, pinch to zoom, twist to rotate the view.'],
  ['Two-finger tap', 'Undo. Double-tap with two fingers to fit the screen.'],
  ['Three-finger tap', 'Redo.'],
];

export function TipsOverlay({ onClose }: { onClose: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      style={[StyleSheet.absoluteFill, styles.tips, { backgroundColor: c.backdrop }]}
      onPress={onClose}
      accessibilityRole="button"
      accessibilityLabel="Dismiss tips"
    >
      <View style={[styles.tipsCard, { backgroundColor: c.toolbar }]}>
        <Text style={[styles.tipsTitle, { color: c.onToolbar }]}>Canvas gestures</Text>
        {TIPS.map(([head, body]) => (
          <View key={head} style={styles.tipRow}>
            <Text style={[styles.tipHead, { color: c.onToolbar }]}>{head}</Text>
            <Text style={[styles.tipBody, { color: c.onToolbarMuted }]}>{body}</Text>
          </View>
        ))}
        <Text style={[styles.tipFoot, { color: c.onToolbarMuted }]}>Tap to start drawing</Text>
      </View>
    </Pressable>
  );
}

export function DescriptionBanner({ text }: { text: string }) {
  const { c } = useTheme();
  return (
    <View pointerEvents="none" style={[styles.banner, { backgroundColor: c.toolbar }]}>
      <Text numberOfLines={3} style={[styles.bannerText, { color: c.onToolbar }]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ref: { position: 'absolute', borderWidth: 2, borderRadius: radius.sm, overflow: 'hidden' },
  refBar: { flexDirection: 'row', justifyContent: 'space-between' },
  refButton: { width: 32, height: 28, alignItems: 'center', justifyContent: 'center' },
  tips: { alignItems: 'center', justifyContent: 'center', padding: space.xl },
  tipsCard: { borderRadius: radius.lg, padding: space.lg, gap: space.md, maxWidth: 360 },
  tipsTitle: { ...font.appBarTitle },
  tipRow: { gap: 2 },
  tipHead: { ...font.label },
  tipBody: { ...font.body },
  tipFoot: { ...font.caption, textAlign: 'center', paddingTop: space.sm },
  banner: {
    position: 'absolute',
    top: space.sm,
    left: 72,
    right: 72,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    opacity: 0.86,
  },
  bannerText: { ...font.body, textAlign: 'center' },
});
