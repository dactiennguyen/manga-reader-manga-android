import { createMMKV } from 'react-native-mmkv';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

export const storage = createMMKV({ id: 'mangaka' });

const mmkvStateStorage: StateStorage = {
  getItem: name => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: name => {
    storage.remove(name);
  },
};

export const persistStorage = createJSONStorage(() => mmkvStateStorage);

const pending = new Map<string, string>();
let timer: ReturnType<typeof setTimeout> | null = null;

export function flushPendingWrites(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  for (const [name, value] of pending) {
    storage.set(name, value);
  }
  pending.clear();
}

const debouncedStateStorage: StateStorage = {
  getItem: name => pending.get(name) ?? storage.getString(name) ?? null,
  setItem: (name, value) => {
    pending.set(name, value);
    if (!timer) {
      timer = setTimeout(flushPendingWrites, 400);
    }
  },
  removeItem: name => {
    pending.delete(name);
    storage.remove(name);
  },
};

export const debouncedPersistStorage = createJSONStorage(() => debouncedStateStorage);

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
