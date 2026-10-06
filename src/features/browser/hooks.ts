import { useCallback, useLayoutEffect, useRef } from 'react';

export function useEvent<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args: A) => ref.current(...args), []);
}

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
