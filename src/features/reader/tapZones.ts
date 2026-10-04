import type { TapZone } from '../../store/useReaderSettings';

export type TapAction = 'prev' | 'next' | 'menu';

/**
 * Chạm để cuộn/lật ("Enable Tap to Scroll"). Màn hình chia 3×3:
 * - leftRight: cột trái lùi, cột phải tiến;
 * - topBottom: hàng trên lùi, hàng dưới tiến;
 * - edges: trái + trên lùi, phải + dưới tiến.
 * Ô giữa (hoặc khi tắt) bật/tắt thanh điều khiển. Đọc phải → trái thì đảo
 * trái/phải.
 */
export function resolveTap(input: {
  x: number;
  y: number;
  width: number;
  height: number;
  tapToScroll: boolean;
  zone: TapZone;
  rtl: boolean;
}): TapAction {
  const { x, y, width, height, tapToScroll, zone, rtl } = input;
  if (!tapToScroll || zone === 'off') {
    return 'menu';
  }
  const left = x < width / 3;
  const right = x > (width * 2) / 3;
  const top = y < height / 3;
  const bottom = y > (height * 2) / 3;
  const side = (isLeft: boolean): TapAction => (isLeft !== rtl ? 'prev' : 'next');

  if (zone !== 'topBottom') {
    if (left) {
      return side(true);
    }
    if (right) {
      return side(false);
    }
  }
  if (zone !== 'leftRight') {
    if (top) {
      return 'prev';
    }
    if (bottom) {
      return 'next';
    }
  }
  return 'menu';
}
