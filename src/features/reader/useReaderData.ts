import { useCallback, useEffect, useState } from 'react';

import { sameUrl } from '../../lib/url';
import { fetchDetail, getCachedDetail } from '../../sources/cache';
import type { Chapter, ChapterContent, MangaDetail } from '../../sources/types';
import { useHistory } from '../../store/useHistory';
import { useLibrary } from '../../store/useLibrary';
import { getSource } from '../../store/useSources';
import { dropChapter, loadChapter } from './chapterCache';


export function findChapterIndex(chapters: readonly Chapter[], url: string): number {
  const exact = chapters.findIndex(chapter => chapter.url === url);
  return exact >= 0 ? exact : chapters.findIndex(chapter => sameUrl(chapter.url, url));
}

function hasChapter(detail: MangaDetail | undefined, chapterUrl: string): boolean {
  return !!detail && findChapterIndex(detail.chapters, chapterUrl) >= 0;
}

export function useMangaDetail(
  sourceId: string,
  mangaUrl: string,
  key: string,
  chapterUrl: string,
): { detail?: MangaDetail; settled: boolean } {
  const [detail, setDetail] = useState(() => getCachedDetail(key));
  const [settled, setSettled] = useState(() => hasChapter(getCachedDetail(key), chapterUrl));

  useEffect(() => {
    const cached = getCachedDetail(key);
    setDetail(cached);
    const src = getSource(sourceId);
    if (hasChapter(cached, chapterUrl) || !src) {
      setSettled(true);
      return;
    }
    let alive = true;
    setSettled(false);
    fetchDetail(src, mangaUrl)
      .then(
        fresh => {
          if (alive) {
            setDetail(fresh);
          }
        },
        () => {},
      )
      .finally(() => {
        if (alive) {
          setSettled(true);
        }
      });
    return () => {
      alive = false;
    };
  }, [sourceId, mangaUrl, key, chapterUrl]);

  return { detail, settled };
}

export type ChapterState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; chapterUrl: string; content: ChapterContent };

export function useChapterContent(
  sourceId: string,
  key: string,
  chapterUrl: string,
): [ChapterState, () => void] {
  const [state, setState] = useState<ChapterState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const src = getSource(sourceId);
    if (!src) {
      setState({ status: 'error', error: new Error('Nguồn của truyện này đã bị xoá hoặc chưa được thêm.') });
      return;
    }
    let alive = true;
    setState({ status: 'loading' });
    loadChapter(src, key, chapterUrl).then(
      content => {
        if (alive) {
          setState({ status: 'ready', chapterUrl, content });
        }
      },
      error => {
        if (alive) {
          setState({ status: 'error', error });
        }
      },
    );
    return () => {
      alive = false;
    };
  }, [sourceId, key, chapterUrl, attempt]);

  const retry = useCallback(() => {
    dropChapter(key, chapterUrl);
    setAttempt(value => value + 1);
  }, [key, chapterUrl]);

  return [state, retry];
}

export function knownManga(key: string): { title?: string; cover?: string } {
  const bookmark = useLibrary.getState().bookmarks[key];
  if (bookmark) {
    return { title: bookmark.title, cover: bookmark.cover };
  }
  const entry = useHistory.getState().reading.find(item => item.key === key);
  return { title: entry?.title, cover: entry?.cover };
}
