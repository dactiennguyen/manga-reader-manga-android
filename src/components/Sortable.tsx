import { useEffect, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptic } from '../lib/haptics';

export const LIFT_DELAY = 280;
export const DRAG_SLOP = 10;
export const EDGE_SIZE = 72;
export const EDGE_SPEED = 14;
export const SETTLE_MS = 160;

export type DragState = {
  tx: SharedValue<number>;
  ty: SharedValue<number>;
  lifted: SharedValue<number>;
  moved: SharedValue<boolean>;
  grabX: SharedValue<number>;
  grabY: SharedValue<number>;
  ghost: SharedValue<boolean>;
};

export function useDragState(): DragState {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const lifted = useSharedValue(0);
  const moved = useSharedValue(false);
  const grabX = useSharedValue(0);
  const grabY = useSharedValue(0);
  const ghost = useSharedValue(false);
  return { tx, ty, lifted, moved, grabX, grabY, ghost };
}

function liftHaptic() {
  haptic();
}

export function liftGesture({
  drag,
  enabled,
  onLift,
  onChange,
  onRelease,
  onCancel,
}: {
  drag: DragState;
  enabled: boolean;
  onLift: () => void;
  onChange: () => void;
  onRelease: (moved: boolean) => void;
  onCancel: () => void;
}) {
  return Gesture.Pan()
    .enabled(enabled)
    .maxPointers(1)
    .activateAfterLongPress(LIFT_DELAY)
    .shouldCancelWhenOutside(false)
    .onStart(event => {
      drag.grabX.value = event.x;
      drag.grabY.value = event.y;
      drag.tx.value = 0;
      drag.ty.value = 0;
      drag.moved.value = false;
      drag.lifted.value = withTiming(1, { duration: 120 });
      onLift();
      scheduleOnRN(liftHaptic);
    })
    .onUpdate(event => {
      drag.tx.value = event.translationX;
      drag.ty.value = event.translationY;
      if (!drag.moved.value && Math.hypot(event.translationX, event.translationY) > DRAG_SLOP) {
        drag.moved.value = true;
      }
      onChange();
    })
    .onEnd((_event, success) => {
      if (success) {
        onRelease(drag.moved.value);
      }
    })
    .onFinalize((_event, success) => {
      if (!success) {
        onCancel();
      }
    });
}

export function DragGhost({
  drag,
  left,
  top,
  width,
  children,
}: {
  drag: DragState;
  left: number;
  top: number;
  width: number;
  children: ReactNode;
}) {
  const { ghost } = drag;
  useEffect(() => {
    ghost.value = true;
    return () => {
      ghost.value = false;
    };
  }, [ghost]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - 0.08 * drag.lifted.value,
    transform: [
      { translateX: drag.tx.value },
      { translateY: drag.ty.value },
      { scale: 1 + 0.04 * drag.lifted.value },
      { rotate: `${-1.5 * drag.lifted.value}deg` },
    ],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.ghost, { left, top, width }, style]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ghost: { position: 'absolute', elevation: 12, zIndex: 20 },
});
