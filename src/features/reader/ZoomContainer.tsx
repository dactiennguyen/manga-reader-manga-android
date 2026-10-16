import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
  type Ref,
} from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type NativeTouchEvent,
} from 'react-native';

export const MAX_ZOOM = 4;
export const DOUBLE_TAP_ZOOM = 2.5;
const MIN_ACTIVE = 1.02;
const SNAP_BACK_BELOW = 1.1;
const PAN_SLOP = 4;

export type ZoomHandle = {
  toggleAt: (pageX: number, pageY: number) => void;
  reset: (animated?: boolean) => void;
  scale: () => number;
};

type Props = {
  ref?: Ref<ZoomHandle>;
  width: number;
  height: number;
  mode: 'paged' | 'vertical';
  listEdges?: () => { atTop: boolean; atBottom: boolean };
  onZoomChange?: (zoomed: boolean) => void;
  children: ReactNode;
};

type Transform = { s: number; x: number; y: number };
type Point = { x: number; y: number };

const IDENTITY: Transform = { s: 1, x: 0, y: 0 };

type Touches = GestureResponderEvent['nativeEvent']['touches'];

function distance(a: NativeTouchEvent, b: NativeTouchEvent): number {
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

export function ZoomContainer({ ref, width, height, mode, listEdges, onZoomChange, children }: Props) {
  const [values] = useState(() => ({
    scale: new Animated.Value(1),
    x: new Animated.Value(0),
    y: new Animated.Value(0),
  }));
  const current = useRef<Transform>(IDENTITY);
  const origin = useRef<Point>({ x: 0, y: 0 });
  const box = useRef<ComponentRef<typeof View>>(null);
  const live = useRef({ width, height, mode, listEdges, onZoomChange, zoomed: false });
  live.current = { ...live.current, width, height, mode, listEdges, onZoomChange };

  const measure = useCallback(() => {
    box.current?.measureInWindow((x, y) => {
      origin.current = { x, y };
    });
  }, []);

  const clamp = useCallback((t: Transform): Transform => {
    const { width: w, height: h } = live.current;
    const s = Math.min(MAX_ZOOM, Math.max(1, t.s));
    const maxX = ((s - 1) * w) / 2;
    const maxY = ((s - 1) * h) / 2;
    return { s, x: Math.min(maxX, Math.max(-maxX, t.x)), y: Math.min(maxY, Math.max(-maxY, t.y)) };
  }, []);

  const apply = useCallback(
    (next: Transform, animated: boolean) => {
      const t = clamp(next);
      current.current = t;
      if (animated) {
        const config = { duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true };
        Animated.parallel([
          Animated.timing(values.scale, { toValue: t.s, ...config }),
          Animated.timing(values.x, { toValue: t.x, ...config }),
          Animated.timing(values.y, { toValue: t.y, ...config }),
        ]).start();
      } else {
        values.scale.setValue(t.s);
        values.x.setValue(t.x);
        values.y.setValue(t.y);
      }
      const zoomed = t.s > MIN_ACTIVE;
      if (zoomed !== live.current.zoomed) {
        live.current.zoomed = zoomed;
        live.current.onZoomChange?.(zoomed);
      }
    },
    [clamp, values],
  );

  const zoomAround = useCallback((from: Point, to: Point, scale: number): Transform => {
    const t = current.current;
    const cx = live.current.width / 2;
    const cy = live.current.height / 2;
    return {
      s: scale,
      x: to.x - cx - (scale * (from.x - cx - t.x)) / t.s,
      y: to.y - cy - (scale * (from.y - cy - t.y)) / t.s,
    };
  }, []);

  const toLocal = useCallback(
    (pageX: number, pageY: number): Point => ({ x: pageX - origin.current.x, y: pageY - origin.current.y }),
    [],
  );

  useImperativeHandle(
    ref,
    () => ({
      toggleAt: (pageX, pageY) => {
        if (current.current.s > MIN_ACTIVE) {
          apply(IDENTITY, true);
          return;
        }
        const point = toLocal(pageX, pageY);
        apply(zoomAround(point, point, DOUBLE_TAP_ZOOM), true);
      },
      reset: (animated = false) => {
        const t = current.current;
        if (t.s !== 1 || t.x !== 0 || t.y !== 0) {
          apply(IDENTITY, animated);
        }
      },
      scale: () => current.current.s,
    }),
    [apply, toLocal, zoomAround],
  );

  const gesture = useRef({ last: { x: 0, y: 0 } as Point, distance: 0, pinching: false, panY: false });

  const [responder] = useState(() => {
    const centerOf = (touches: Touches): Point =>
      touches.length >= 2
        ? toLocal((touches[0].pageX + touches[1].pageX) / 2, (touches[0].pageY + touches[1].pageY) / 2)
        : toLocal(touches[0].pageX, touches[0].pageY);

    const rebase = (event: GestureResponderEvent) => {
      const touches = event.nativeEvent.touches;
      const g = gesture.current;
      if (!touches.length) {
        return;
      }
      g.pinching = touches.length >= 2;
      g.distance = g.pinching ? distance(touches[0], touches[1]) : 0;
      g.last = centerOf(touches);
    };

    const edgePanY = (dy: number) => {
      const edges = live.current.listEdges?.();
      if (!edges) {
        return false;
      }
      const { s, y } = current.current;
      const maxY = ((s - 1) * live.current.height) / 2;
      return (dy > 0 && edges.atTop && y < maxY - 0.5) || (dy < 0 && edges.atBottom && y > -maxY + 0.5);
    };

    const wantsPan = (dx: number, dy: number) => {
      if (!live.current.zoomed || Math.max(Math.abs(dx), Math.abs(dy)) < PAN_SLOP) {
        return false;
      }
      if (live.current.mode === 'paged') {
        return true;
      }
      if (Math.abs(dx) > Math.abs(dy)) {
        gesture.current.panY = false;
        return true;
      }
      gesture.current.panY = edgePanY(dy);
      return gesture.current.panY;
    };

    const settle = () => {
      gesture.current.panY = false;
      const t = current.current;
      apply(t.s < SNAP_BACK_BELOW ? IDENTITY : t, true);
    };

    return PanResponder.create({
      onStartShouldSetPanResponderCapture: event => event.nativeEvent.touches.length >= 2,
      onMoveShouldSetPanResponderCapture: (event, state) =>
        event.nativeEvent.touches.length >= 2 || wantsPan(state.dx, state.dy),
      onPanResponderGrant: event => {
        measure();
        rebase(event);
      },
      onPanResponderStart: rebase,
      onPanResponderEnd: rebase,
      onPanResponderMove: event => {
        const touches = event.nativeEvent.touches;
        const g = gesture.current;
        if (!touches.length) {
          return;
        }
        if ((touches.length >= 2) !== g.pinching) {
          rebase(event);
          return;
        }
        const point = centerOf(touches);
        let next: Transform;
        if (g.pinching) {
          const d = distance(touches[0], touches[1]);
          const scale = Math.min(MAX_ZOOM, Math.max(1, (current.current.s * d) / Math.max(1, g.distance)));
          next = zoomAround(g.last, point, scale);
          g.distance = d;
        } else {
          const t = current.current;
          const dy = live.current.mode === 'paged' || g.panY ? point.y - g.last.y : 0;
          next = { s: t.s, x: t.x + point.x - g.last.x, y: t.y + dy };
        }
        g.last = point;
        const shown = clamp(next);
        current.current = shown;
        values.scale.setValue(shown.s);
        values.x.setValue(shown.x);
        values.y.setValue(shown.y);
      },
      onPanResponderRelease: settle,
      onPanResponderTerminate: settle,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    });
  });

  useEffect(() => {
    measure();
    if (current.current.s > 1) {
      apply(current.current, false);
    }
  }, [width, height, apply, measure]);

  return (
    <View ref={box} style={styles.fill} onLayout={measure} {...responder.panHandlers}>
      <Animated.View
        style={[
          styles.fill,
          { transform: [{ translateX: values.x }, { translateY: values.y }, { scale: values.scale }] },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden' },
});
