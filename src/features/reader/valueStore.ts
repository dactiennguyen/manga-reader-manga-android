import { useSyncExternalStore } from 'react';

/**
 * Giá trị đổi liên tục (trang đang xem, % tiến độ…) mà chỉ vài component con
 * cần hiển thị. Để ngoài state của màn để đổi trang không render lại cả reader.
 */
export type ValueStore<T> = {
  get: () => T;
  set: (value: T) => void;
  subscribe: (listener: () => void) => () => void;
};

export function createValueStore<T>(initial: T): ValueStore<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: next => {
      if (Object.is(next, value)) {
        return;
      }
      value = next;
      listeners.forEach(listener => listener());
    },
    subscribe: listener => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function useStoreValue<T>(store: ValueStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get);
}
