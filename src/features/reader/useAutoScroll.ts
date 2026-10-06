import { useEffect, useRef, type RefObject } from 'react';

export type ScrollMetrics = {
  offset: number;
  contentHeight: number;
  viewport: number;
  userScrolling: boolean;
  resync: boolean;
};

const MAX_FRAME_MS = 100;
const DRIFT_PX = 64;

export function useAutoScroll({
  active,
  speed,
  metrics,
  scrollTo,
  onEnd,
}: {
  active: boolean;
  speed: number;
  metrics: RefObject<ScrollMetrics>;
  scrollTo: (offset: number) => void;
  onEnd: () => void;
}): void {
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  useEffect(() => {
    if (!active) {
      return;
    }
    let frame = 0;
    let last: number | null = null;
    let position = metrics.current.offset;

    const tick = (time: number) => {
      const m = metrics.current;
      const max = Math.max(0, m.contentHeight - m.viewport);
      if (m.userScrolling || m.resync || last === null) {
        m.resync = false;
        position = m.offset;
      } else if (max > 0) {
        if (Math.abs(m.offset - position) > DRIFT_PX) {
          position = m.offset;
        }
        const elapsed = Math.min(MAX_FRAME_MS, time - last);
        position = Math.min(max, position + (speedRef.current * elapsed) / 1000);
        scrollTo(position);
        if (position >= max) {
          onEndRef.current();
          return;
        }
      }
      last = time;
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, metrics, scrollTo]);
}
