import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * Callback có định danh cố định nhưng luôn gọi bản mới nhất — dùng cho prop
 * của WebView để thư viện không phải gỡ/gắn lại listener mỗi lần render.
 */
export function useEvent<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args: A) => ref.current(...args), []);
}

/** Đổi màu hex "#RRGGBB" thành rgba với độ trong suốt cho trước. */
export function withAlpha(hex: string, alpha: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) {
    return hex;
  }
  const value = parseInt(match[1], 16);
  const r = Math.floor(value / 65536);
  const g = Math.floor(value / 256) % 256;
  const b = value % 256;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
