import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { mangaKey } from '../../sources';
import type { ContentType, SourceConfig } from '../../sources/types';
import { getProgress, markChaptersRead, setLastRead } from '../../store/progress';
import { useHistory } from '../../store/useHistory';
import { useLibrary } from '../../store/useLibrary';
import { useStats } from '../../store/useStats';
import { refreshUnread } from '../library/updates';
import { noteChapterFinished } from './BookmarkPrompt';


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

export function recordChapterFinished(manga: ReadingManga, chapter: ReadingChapter): void {
  const key = mangaKey(manga.source.id, manga.mangaUrl);
  if (getProgress(key).read[chapter.url]) {
    return;
  }
  markChaptersRead(key, [chapter.url]);
  useStats.getState().addChapterRead();
  refreshUnread(key);
  noteChapterFinished(key);
}

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
