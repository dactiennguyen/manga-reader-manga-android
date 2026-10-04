import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { hashString } from '../lib/id';
import { persistStorage } from '../lib/storage';
import type { Chapter, ContentType } from '../sources/types';

export type DownloadStatus = 'queued' | 'downloading' | 'paused' | 'done' | 'error';

/** Một chương trong hàng đợi tải (DBDownload). */
export type DownloadTask = {
  id: string;
  mangaKey: string;
  sourceId: string;
  mangaUrl: string;
  mangaTitle: string;
  cover?: string;
  content: ContentType;
  chapterUrl: string;
  chapterName: string;
  chapterNumber?: number;
  status: DownloadStatus;
  done: number;
  total: number;
  /** Dung lượng đã ghi, byte. */
  bytes: number;
  error?: string;
  createdAt: number;
  finishedAt?: number;
};

export type DownloadManga = {
  mangaKey: string;
  sourceId: string;
  mangaUrl: string;
  mangaTitle: string;
  cover?: string;
  content: ContentType;
};

type DownloadsState = {
  tasks: Record<string, DownloadTask>;
  enqueue: (manga: DownloadManga, chapters: Chapter[]) => number;
  update: (id: string, patch: Partial<DownloadTask>) => void;
  pause: (ids: string[]) => void;
  resume: (ids: string[]) => void;
  remove: (ids: string[]) => void;
};

export function downloadId(mangaKey: string, chapterUrl: string): string {
  return hashString(`${mangaKey}#${chapterUrl}`) + hashString(chapterUrl);
}

export const useDownloads = create<DownloadsState>()(
  persist(
    set => ({
      tasks: {},
      enqueue: (manga, chapters) => {
        let added = 0;
        set(state => {
          const tasks = { ...state.tasks };
          const now = Date.now();
          chapters.forEach((chapter, index) => {
            const id = downloadId(manga.mangaKey, chapter.url);
            const existing = tasks[id];
            if (existing && existing.status !== 'error') {
              return;
            }
            added++;
            tasks[id] = {
              ...manga,
              id,
              chapterUrl: chapter.url,
              chapterName: chapter.name,
              chapterNumber: chapter.number,
              status: 'queued',
              done: 0,
              total: 0,
              bytes: 0,
              // Giữ thứ tự chọn để tải lần lượt.
              createdAt: now + index,
            };
          });
          return { tasks };
        });
        return added;
      },
      update: (id, patch) =>
        set(state =>
          state.tasks[id] ? { tasks: { ...state.tasks, [id]: { ...state.tasks[id], ...patch } } } : state,
        ),
      pause: ids =>
        set(state => {
          const tasks = { ...state.tasks };
          for (const id of ids) {
            const task = tasks[id];
            if (task && (task.status === 'queued' || task.status === 'downloading')) {
              tasks[id] = { ...task, status: 'paused' };
            }
          }
          return { tasks };
        }),
      resume: ids =>
        set(state => {
          const tasks = { ...state.tasks };
          for (const id of ids) {
            const task = tasks[id];
            if (task && (task.status === 'paused' || task.status === 'error')) {
              tasks[id] = { ...task, status: 'queued', error: undefined };
            }
          }
          return { tasks };
        }),
      remove: ids =>
        set(state => {
          const tasks = { ...state.tasks };
          for (const id of ids) {
            delete tasks[id];
          }
          return { tasks };
        }),
    }),
    {
      name: 'downloads',
      storage: persistStorage,
      version: 1,
      // App bị tắt giữa chừng: đưa chương đang tải về hàng đợi.
      merge: (persisted, current) => {
        const saved = (persisted as Partial<DownloadsState> | undefined)?.tasks ?? {};
        const tasks: Record<string, DownloadTask> = {};
        for (const [id, task] of Object.entries(saved)) {
          tasks[id] = task.status === 'downloading' ? { ...task, status: 'queued' } : task;
        }
        return { ...current, tasks };
      },
    },
  ),
);

export function useChapterDownload(mangaKey: string, chapterUrl: string): DownloadTask | undefined {
  return useDownloads(state => state.tasks[downloadId(mangaKey, chapterUrl)]);
}
