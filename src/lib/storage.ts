import { createMMKV } from 'react-native-mmkv';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/** Kho key-value đồng bộ dùng chung cho toàn app (tương đương DBKeyValue). */
export const storage = createMMKV({ id: 'manga-reader' });

const mmkvStateStorage: StateStorage = {
  getItem: name => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: name => {
    storage.remove(name);
  },
};

/** Storage cho middleware persist của Zustand. */
export const persistStorage = createJSONStorage(() => mmkvStateStorage);

export function readJSON<T>(key: string): T | undefined {
  const raw = storage.getString(key);
  if (raw == null) {
    return undefined;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function writeJSON(key: string, value: unknown): void {
  if (value === undefined) {
    storage.remove(key);
  } else {
    storage.set(key, JSON.stringify(value));
  }
}

export function keysWithPrefix(prefix: string): string[] {
  return storage.getAllKeys().filter(key => key.startsWith(prefix));
}

export function removeKeysWithPrefix(prefix: string): void {
  for (const key of keysWithPrefix(prefix)) {
    storage.remove(key);
  }
}
