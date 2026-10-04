import { getEngine } from '../../sources';
import type { ChapterContent, SourceConfig } from '../../sources/types';
import { loadOfflineChapter } from '../downloads/downloader';

/**
 * Nội dung chương trong phiên hiện tại (READER_CHAPTER_WINDOW_SIZE của app gốc):
 * giữ vài chương gần nhất để chuyển chương tức thì và tải sẵn chương kế.
 * Chỉ giữ danh sách trang/đoạn văn, không giữ ảnh.
 */

const MAX_ENTRIES = 6;
const cache = new Map<string, Promise<ChapterContent>>();

const cacheKey = (mangaKey: string, chapterUrl: string) => `${mangaKey}#${chapterUrl}`;

async function fetchChapter(
  src: SourceConfig,
  mangaKey: string,
  chapterUrl: string,
): Promise<ChapterContent> {
  const content =
    (await loadOfflineChapter(mangaKey, chapterUrl)) ??
    (await getEngine(src.engine).chapter(src, chapterUrl));
  if (content.kind === 'images' && content.pages.length === 0) {
    throw new Error('Chương này không có trang ảnh nào.');
  }
  if (content.kind === 'text' && content.paragraphs.length === 0) {
    throw new Error('Chương này không có nội dung.');
  }
  return content;
}

/** Bản đã tải offline được ưu tiên, không có mới tải từ nguồn. */
export function loadChapter(
  src: SourceConfig,
  mangaKey: string,
  chapterUrl: string,
): Promise<ChapterContent> {
  const id = cacheKey(mangaKey, chapterUrl);
  const hit = cache.get(id);
  if (hit) {
    cache.delete(id);
    cache.set(id, hit);
    return hit;
  }
  const task = fetchChapter(src, mangaKey, chapterUrl);
  cache.set(id, task);
  // Lỗi thì bỏ khỏi cache để lần sau tải lại.
  task.catch(() => {
    if (cache.get(id) === task) {
      cache.delete(id);
    }
  });
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) {
      break;
    }
    cache.delete(oldest);
  }
  return task;
}

export function prefetchChapter(src: SourceConfig, mangaKey: string, chapterUrl: string): void {
  loadChapter(src, mangaKey, chapterUrl).catch(() => {});
}

export function dropChapter(mangaKey: string, chapterUrl: string): void {
  cache.delete(cacheKey(mangaKey, chapterUrl));
}
