import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { Button } from '../../components/ui';
import { font, radius, space, useTheme } from '../../theme';

/**
 * Hướng dẫn lần đầu kiểu coach-mark (features_tour của app gốc): phủ tối
 * toàn màn, chừa khung sáng quanh phần tử cần giới thiệu kèm thẻ chú thích.
 */

export type TourStep = { key: string; text: string };

type Rect = { x: number; y: number; width: number; height: number };

/** Instance của View (RN 0.87: View là function component, ref trỏ tới element native). */
export type ViewRef = ComponentRef<typeof View>;

export type TourRegister = (key: string) => (node: ViewRef | null) => void;

/** Sổ đăng ký phần tử được giới thiệu: gắn `ref={register('key')}` lên View. */
export function useTourTargets(): { register: TourRegister; measure: (key: string) => Promise<Rect | null> } {
  const nodes = useRef(new Map<string, ViewRef>());
  const callbacks = useRef(new Map<string, (node: ViewRef | null) => void>());

  const register = useCallback<TourRegister>(key => {
    let callback = callbacks.current.get(key);
    if (!callback) {
      callback = node => {
        if (node) {
          nodes.current.set(key, node);
        } else {
          nodes.current.delete(key);
        }
      };
      callbacks.current.set(key, callback);
    }
    return callback;
  }, []);

  const measure = useCallback(
    (key: string) =>
      new Promise<Rect | null>(resolve => {
        const node = nodes.current.get(key);
        if (!node) {
          resolve(null);
          return;
        }
        node.measureInWindow((x, y, width, height) =>
          resolve(width > 0 && height > 0 ? { x, y, width, height } : null),
        );
      }),
    [],
  );

  return { register, measure };
}

const PAD = 6;
const GAP = 14;

export function CoachMarks({
  steps,
  measure,
  onFinish,
}: {
  steps: TourStep[];
  measure: (key: string) => Promise<Rect | null>;
  /** Gọi khi xong hoặc bỏ qua, kèm các bước đã thực sự hiển thị. */
  onFinish: (shown: string[]) => void;
}) {
  const { c } = useTheme();
  const rootRef = useRef<ViewRef>(null);
  const [frame, setFrame] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [current, setCurrent] = useState<{ index: number; rect: Rect } | null>(null);
  const [cardHeight, setCardHeight] = useState(0);
  const shown = useRef<string[]>([]);
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );

  const finish = useCallback(() => onFinish(shown.current), [onFinish]);

  /** Tìm bước kế tiếp đo được (nằm trong màn hình); không còn bước nào thì kết thúc. */
  const goTo = useCallback(
    async (start: number, area: { x: number; y: number; width: number; height: number }) => {
      for (let i = start; i < steps.length; i++) {
        const rect = await measure(steps[i].key);
        if (!alive.current) {
          return;
        }
        if (!rect) {
          continue;
        }
        // Đổi sang toạ độ của lớp phủ — measureInWindow trên Android có thể lệch theo thanh trạng thái.
        const local = { x: rect.x - area.x, y: rect.y - area.y, width: rect.width, height: rect.height };
        const visible =
          local.y >= 0 && local.y + local.height <= area.height && local.x >= 0 && local.x + local.width <= area.width;
        if (visible) {
          shown.current.push(steps[i].key);
          setCardHeight(0);
          setCurrent({ index: i, rect: local });
          return;
        }
      }
      finish();
    },
    [steps, measure, finish],
  );

  const onRootLayout = () => {
    if (frame) {
      return;
    }
    rootRef.current?.measureInWindow((x, y, width, height) => {
      const area = { x, y, width, height };
      setFrame(area);
      goTo(0, area);
    });
  };

  const next = () => {
    if (current && frame) {
      goTo(current.index + 1, frame);
    }
  };

  const onCardLayout = (event: LayoutChangeEvent) => setCardHeight(event.nativeEvent.layout.height);

  const rect = current?.rect;
  const hole = rect
    ? { x: rect.x - PAD, y: rect.y - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
    : null;
  const below = hole && frame ? hole.y + hole.height / 2 < frame.height / 2 : true;
  const cardTop =
    hole && frame
      ? below
        ? hole.y + hole.height + GAP
        : Math.max(GAP, hole.y - GAP - cardHeight)
      : 0;
  const isLast = current ? !steps.slice(current.index + 1).length : true;

  return (
    <Modal visible transparent statusBarTranslucent animationType="fade" onRequestClose={finish}>
      <View ref={rootRef} style={styles.root} onLayout={onRootLayout}>
        {hole && frame ? (
          <>
            <View style={[styles.shadeTop, { backgroundColor: c.backdrop, height: Math.max(0, hole.y) }]} />
            <View style={[styles.shadeBottom, { backgroundColor: c.backdrop, top: hole.y + hole.height }]} />
            <View
              style={[
                styles.shadeLeft,
                { backgroundColor: c.backdrop, top: hole.y, width: Math.max(0, hole.x), height: hole.height },
              ]}
            />
            <View
              style={[
                styles.shadeRight,
                { backgroundColor: c.backdrop, top: hole.y, left: hole.x + hole.width, height: hole.height },
              ]}
            />
            <Pressable
              onPress={next}
              style={[
                styles.ring,
                {
                  borderColor: c.accent,
                  top: hole.y,
                  left: hole.x,
                  width: hole.width,
                  height: hole.height,
                  borderRadius: Math.min(hole.height / 2, radius.xl),
                },
              ]}
            />
            <View
              onLayout={onCardLayout}
              style={[
                styles.card,
                { backgroundColor: c.elevated, top: cardTop },
                // Thẻ nằm trên vùng sáng: ẩn tới khi đo được chiều cao để đặt đúng chỗ.
                !below && !cardHeight && styles.hidden,
              ]}
            >
              <Text style={[font.body, { color: c.text }]}>{current ? steps[current.index].text : ''}</Text>
              <View style={styles.cardFooter}>
                <Text style={[font.caption, styles.flex, { color: c.muted }]}>
                  {current ? `${current.index + 1}/${steps.length}` : ''}
                </Text>
                {!isLast && <Button title="Bỏ qua" variant="ghost" small onPress={finish} />}
                <Button title={isLast ? 'Xong' : 'Tiếp'} small onPress={next} />
              </View>
            </View>
          </>
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: c.backdrop }]} />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  shadeTop: { position: 'absolute', top: 0, left: 0, right: 0 },
  shadeBottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  shadeLeft: { position: 'absolute', left: 0 },
  shadeRight: { position: 'absolute', right: 0 },
  ring: { position: 'absolute', borderWidth: 2 },
  card: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  hidden: { opacity: 0 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
