import { useEffect, useMemo, useRef } from 'react';

export type RequestToken = {
  /** Bắt đầu lượt request mới; mọi lượt trước đó thành cũ. */
  next: () => number;
  /** Lượt hiện tại (để request phụ như tải trang sau đi cùng lượt chính). */
  current: () => number;
  /** Kết quả còn dùng được: đúng lượt và màn chưa unmount. */
  isCurrent: (token: number) => boolean;
  invalidate: () => void;
};

/**
 * Đếm "thế hệ" request để bỏ kết quả của request đã cũ (đổi từ khoá, đổi bộ
 * lọc) hoặc về muộn sau khi màn đã đóng.
 */
export function useRequestToken(): RequestToken {
  const ref = useRef({ value: 0, alive: true });

  useEffect(() => {
    const state = ref.current;
    state.alive = true;
    return () => {
      state.alive = false;
      state.value++;
    };
  }, []);

  return useMemo<RequestToken>(
    () => ({
      next: () => ++ref.current.value,
      current: () => ref.current.value,
      isCurrent: token => ref.current.alive && ref.current.value === token,
      invalidate: () => {
        ref.current.value++;
      },
    }),
    [],
  );
}
