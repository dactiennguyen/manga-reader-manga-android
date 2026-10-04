import { useEffect, useRef, type RefObject } from 'react';

export type ScrollMetrics = {
  offset: number;
  contentHeight: number;
  viewport: number;
  /** Người dùng đang kéo hoặc list đang trôi theo quán tính. */
  userScrolling: boolean;
  /** Vị trí vừa bị đổi từ bên ngoài (chạm để cuộn) — vòng lặp lấy lại offset. */
  resync: boolean;
};

/** Khoảng thời gian tối đa giữa hai frame, tránh nhảy cóc sau khi app bị treo/tạm nền. */
const MAX_FRAME_MS = 100;
/** Lệch quá ngưỡng này giữa offset thật và offset đang đẩy thì đồng bộ lại. */
const DRIFT_PX = 64;

/**
 * Tự cuộn ("Auto scroll") cho chế độ dọc: mỗi frame dịch offset theo tốc độ
 * px/giây. Tạm dừng khi người dùng kéo, chạy tiếp từ vị trí mới khi thả tay.
 */
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
        // List tự giữ vị trí khi ảnh phía trên đổi chiều cao → offset thật lệch xa.
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
