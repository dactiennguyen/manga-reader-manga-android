import { useCallback, useSyncExternalStore } from 'react';

import { readJSON, removeKeysWithPrefix, storage, writeJSON } from '../lib/storage';

/**
 * Tiến độ đọc từng truyện (DBBookmarkChapters). Mỗi truyện một khoá MMKV
 * riêng vì danh sách chương đã đọc có thể rất dài; ghi theo từng truyện thay
 * vì ghi lại cả kho mỗi lần lật trang.
 */

export type LastRead = {
  chapterUrl: string;
  chapterName: string;
  /** Trang (manga) hoặc đoạn văn (novel) đang đọc, đếm từ 0. */
  page: number;
  total?: number;
  at: number;
};

export type MangaProgress = {
  /** chapterUrl → thời điểm đánh dấu đã đọc. */
  read: Record<string, number>;
  last?: LastRead;
};

const PREFIX = 'progress:';
const EMPTY: MangaProgress = { read: {} };
const cache = new Map<string, MangaProgress>();
const listeners = new Map<string, Set<() => void>>();

export function getProgress(key: string): MangaProgress {
  let value = cache.get(key);
  if (!value) {
    value = readJSON<MangaProgress>(PREFIX + key) ?? EMPTY;
    cache.set(key, value);
  }
  return value;
}

function save(key: string, value: MangaProgress): void {
  cache.set(key, value);
  writeJSON(PREFIX + key, value);
  listeners.get(key)?.forEach(listener => listener());
}

export function markChaptersRead(key: string, chapterUrls: string[], read = true): void {
  const current = getProgress(key);
  const next = { ...current.read };
  const now = Date.now();
  for (const url of chapterUrls) {
    if (read) {
      next[url] ??= now;
    } else {
      delete next[url];
    }
  }
  save(key, { ...current, read: next });
}

export function setLastRead(key: string, last: Omit<LastRead, 'at'>): void {
  const current = getProgress(key);
  save(key, { ...current, last: { ...last, at: Date.now() } });
}

export function isChapterRead(key: string, chapterUrl: string): boolean {
  return !!getProgress(key).read[chapterUrl];
}

export function clearProgress(key: string): void {
  cache.delete(key);
  storage.remove(PREFIX + key);
  listeners.get(key)?.forEach(listener => listener());
}

export function clearAllProgress(): void {
  cache.clear();
  removeKeysWithPrefix(PREFIX);
  listeners.forEach(set => set.forEach(listener => listener()));
}

/** Xuất toàn bộ tiến độ (cho backup). */
export function exportProgress(): Record<string, MangaProgress> {
  const out: Record<string, MangaProgress> = {};
  for (const fullKey of storage.getAllKeys()) {
    if (fullKey.startsWith(PREFIX)) {
      const value = readJSON<MangaProgress>(fullKey);
      if (value) {
        out[fullKey.slice(PREFIX.length)] = value;
      }
    }
  }
  return out;
}

export function importProgress(data: Record<string, MangaProgress>): void {
  for (const [key, value] of Object.entries(data)) {
    save(key, value);
  }
}

export function useProgress(key: string | undefined): MangaProgress {
  const subscribe = useCallback(
    (listener: () => void) => {
      if (!key) {
        return () => {};
      }
      let set = listeners.get(key);
      if (!set) {
        set = new Set();
        listeners.set(key, set);
      }
      set.add(listener);
      return () => {
        set.delete(listener);
      };
    },
    [key],
  );
  return useSyncExternalStore(subscribe, () => (key ? getProgress(key) : EMPTY));
}
