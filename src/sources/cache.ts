import { readJSON, removeKeysWithPrefix, storage, writeJSON } from '../lib/storage';
import { getEngine, mangaKey } from './index';
import type { Chapter, MangaDetail, SourceConfig } from './types';

/**
 * Cache chi tiết truyện: bộ nhớ cho phiên hiện tại, MMKV cho bản lưu lại
 * (để mở lại nhanh, đọc offline, và đếm chương chưa đọc của bookmark).
 * Mỗi truyện một khoá riêng để không phải ghi lại cả khối dữ liệu lớn.
 */

const PREFIX = 'detail:';
const memory = new Map<string, MangaDetail>();
const inflight = new Map<string, Promise<MangaDetail>>();

export function getCachedDetail(key: string): MangaDetail | undefined {
  const hit = memory.get(key);
  if (hit) {
    return hit;
  }
  const stored = readJSON<MangaDetail>(PREFIX + key);
  if (stored) {
    memory.set(key, stored);
  }
  return stored;
}

export function saveDetail(key: string, detail: MangaDetail): void {
  memory.set(key, detail);
  writeJSON(PREFIX + key, detail);
}

export function getCachedChapters(key: string): Chapter[] {
  return getCachedDetail(key)?.chapters ?? [];
}

export function dropDetail(key: string): void {
  memory.delete(key);
  storage.remove(PREFIX + key);
}

export function clearDetailCache(): void {
  memory.clear();
  removeKeysWithPrefix(PREFIX);
}

/** Tải chi tiết truyện qua engine, gộp các lời gọi trùng nhau đang chạy. */
export async function fetchDetail(src: SourceConfig, url: string): Promise<MangaDetail> {
  const key = mangaKey(src.id, url);
  const running = inflight.get(key);
  if (running) {
    return running;
  }
  const task = getEngine(src.engine)
    .detail(src, url)
    .then(detail => {
      saveDetail(key, detail);
      return detail;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, task);
  return task;
}
