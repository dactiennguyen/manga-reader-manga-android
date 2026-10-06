import { create } from 'zustand';

import { errorMessage } from '../../lib/http';
import { fetchDetail, getCachedChapters } from '../../sources/cache';
import type { MangaDetail } from '../../sources/types';
import { getProgress } from '../../store/progress';
import { useLibrary } from '../../store/useLibrary';
import { getSource } from '../../store/useSources';


export type UpdateCheckResult = {
  updated: number;
  failed: number;
  newChapters: number;
  titles: string[];
};

type UpdateCheckState = {
  running: boolean;
  done: number;
  total: number;
  lastRunAt?: number;
  lastResult?: { updated: number; failed: number; newChapters: number };
};

export const useUpdateCheck = create<UpdateCheckState>(() => ({
  running: false,
  done: 0,
  total: 0,
}));

export function countUnread(key: string, chapters: { url: string }[]): number {
  const { read } = getProgress(key);
  return chapters.reduce((n, ch) => (read[ch.url] ? n : n + 1), 0);
}

export function syncBookmarkWithDetail(
  key: string,
  detail: MangaDetail,
  options: { seen?: boolean; newChapters?: number } = {},
): void {
  const { bookmarks, updateBookmark } = useLibrary.getState();
  const bookmark = bookmarks[key];
  if (!bookmark) {
    return;
  }
  const added = options.newChapters ?? 0;
  updateBookmark(key, {
    title: detail.title || bookmark.title,
    cover: detail.cover ?? bookmark.cover,
    chapterCount: detail.chapters.length,
    latestChapter: detail.chapters[0]?.name,
    unread: countUnread(key, detail.chapters),
    newChapters: options.seen ? 0 : (bookmark.newChapters ?? 0) + added,
    updatedAt: added > 0 ? Date.now() : bookmark.updatedAt,
    checkedAt: Date.now(),
  });
}

export function refreshUnread(key: string): void {
  const { bookmarks, updateBookmark } = useLibrary.getState();
  if (bookmarks[key]) {
    updateBookmark(key, { unread: countUnread(key, getCachedChapters(key)) });
  }
}

const CONCURRENCY = 3;

export async function checkLibraryUpdates(keys?: string[]): Promise<UpdateCheckResult | undefined> {
  if (useUpdateCheck.getState().running) {
    return undefined;
  }
  const bookmarks = Object.values(useLibrary.getState().bookmarks).filter(
    b => !keys || keys.includes(b.key),
  );
  useUpdateCheck.setState({ running: true, done: 0, total: bookmarks.length });
  let updated = 0;
  let failed = 0;
  let newChapters = 0;
  const titles: string[] = [];
  const queue = [...bookmarks];

  const worker = async () => {
    for (let bookmark = queue.shift(); bookmark; bookmark = queue.shift()) {
      const source = getSource(bookmark.sourceId);
      try {
        if (!source) {
          throw new Error('Nguồn đã bị xoá.');
        }
        const before = new Set(getCachedChapters(bookmark.key).map(ch => ch.url));
        const detail = await fetchDetail(source, bookmark.url);
        const added = before.size
          ? detail.chapters.filter(ch => !before.has(ch.url)).length
          : 0;
        if (added) {
          updated++;
          newChapters += added;
          titles.push(detail.title || bookmark.title);
        }
        syncBookmarkWithDetail(bookmark.key, detail, { newChapters: added });
      } catch (error) {
        failed++;
        if (__DEV__) {
          console.warn(`Kiểm tra ${bookmark.title} lỗi:`, errorMessage(error));
        }
      }
      useUpdateCheck.setState(state => ({ done: state.done + 1 }));
    }
  };

  try {
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  } finally {
    useUpdateCheck.setState({
      running: false,
      lastRunAt: Date.now(),
      lastResult: { updated, failed, newChapters },
    });
  }
  return { updated, failed, newChapters, titles };
}
