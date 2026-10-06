import { useEffect, useMemo, useRef } from 'react';

export type RequestToken = {
  next: () => number;
  current: () => number;
  isCurrent: (token: number) => boolean;
  invalidate: () => void;
};

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
