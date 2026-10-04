import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { mangaKey } from '../../sources';
import type { ContentType, SourceConfig } from '../../sources/types';
import { getProgress, markChaptersRead, setLastRead } from '../../store/progress';
import { useHistory } from '../../store/useHistory';
import { useLibrary } from '../../store/useLibrary';
import { useStats } from '../../store/useStats';
import { refreshUnread } from '../library/updates';

/**
 * Ghi nhận việc đọc dùng chung cho reader manga và novel: lịch sử, vị trí
 * đọc dở, đánh dấu đã đọc, thống kê thời gian & chuỗi ngày.
 */

export type ReadingManga = {
  source: SourceConfig;
  mangaUrl: string;
  title: string;
  cover?: string;
  content: ContentType;
};

export type ReadingChapter = { url: string; name: string };

export function recordChapterOpened(manga: ReadingManga, chapter: ReadingChapter, page = 0): void {
  const key = mangaKey(manga.source.id, manga.mangaUrl);
  useHistory.getState().addReading({
    key,
    sourceId: manga.source.id,
    mangaUrl: manga.mangaUrl,
    title: manga.title,
    cover: manga.cover,
    content: manga.content,
    chapterUrl: chapter.url,
    chapterName: chapter.name,
  });
  setLastRead(key, { chapterUrl: chapter.url, chapterName: chapter.name, page });
  const bookmark = useLibrary.getState().bookmarks[key];
  if (bookmark?.newChapters) {
    useLibrary.getState().updateBookmark(key, { newChapters: 0 });
  }
}

/** Lưu vị trí đang đọc. Gọi thưa (khi đổi trang), không gọi mỗi frame cuộn. */
export function recordPosition(
  manga: ReadingManga,
  chapter: ReadingChapter,
  page: number,
  total?: number,
): void {
  setLastRead(mangaKey(manga.source.id, manga.mangaUrl), {
    chapterUrl: chapter.url,
    chapterName: chapter.name,
    page,
    total,
  });
}

/** Đọc tới cuối chương: đánh dấu đã đọc và cộng thống kê (một lần mỗi chương). */
export function recordChapterFinished(manga: ReadingManga, chapter: ReadingChapter): void {
  const key = mangaKey(manga.source.id, manga.mangaUrl);
  if (getProgress(key).read[chapter.url]) {
    return;
  }
  markChaptersRead(key, [chapter.url]);
  useStats.getState().addChapterRead();
  refreshUnread(key);
}

/**
 * Đếm thời gian đọc khi app ở foreground; ghi thành một phiên khi rời reader.
 */
export function useReadingTimer(): void {
  const accumulated = useRef(0);
  const startedAt = useRef<number | null>(Date.now());

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        startedAt.current ??= Date.now();
      } else if (startedAt.current !== null) {
        accumulated.current += (Date.now() - startedAt.current) / 1000;
        startedAt.current = null;
      }
    });
    return () => {
      subscription.remove();
      if (startedAt.current !== null) {
        accumulated.current += (Date.now() - startedAt.current) / 1000;
      }
      useStats.getState().addSession(accumulated.current);
    };
  }, []);
}
