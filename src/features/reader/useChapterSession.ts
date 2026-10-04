import { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  recordChapterFinished,
  recordChapterOpened,
  recordPosition,
  useReadingTimer,
  type ReadingChapter,
  type ReadingManga,
} from './session';

export type SessionTarget = { manga: ReadingManga; chapter: ReadingChapter };

export type ChapterSession = {
  /** Trang (manga) hoặc đoạn văn (novel) đang xem. Ghi xuống bộ nhớ tối đa mỗi giây một lần. */
  reportPosition: (page: number, total: number) => void;
  /** Đã tới trang cuối / khối hết chương. */
  reportFinished: () => void;
};

const POSITION_THROTTLE_MS = 1000;

/**
 * Nối reader với session.ts. `target` = null khi chương chưa sẵn sàng (đang tải
 * nội dung hoặc chi tiết truyện); vị trí báo về trong lúc đó được giữ lại và
 * dùng khi ghi nhận mở chương.
 */
export function useChapterSession(target: SessionTarget | null, startPage: number): ChapterSession {
  useReadingTimer();

  const targetRef = useRef(target);
  targetRef.current = target;
  const startRef = useRef(startPage);
  startRef.current = startPage;

  const live = useRef({
    opened: null as SessionTarget | null,
    page: null as number | null,
    total: undefined as number | undefined,
    dirty: false,
    finished: false,
    finishPending: false,
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const state = live.current;
    if (state.opened && state.dirty && state.page !== null) {
      state.dirty = false;
      recordPosition(state.opened.manga, state.opened.chapter, state.page, state.total);
    }
  }, []);

  const openKey = target
    ? `${target.manga.source.id}|${target.manga.mangaUrl}|${target.chapter.url}`
    : '';

  useEffect(() => {
    const current = targetRef.current;
    if (!openKey || !current) {
      return;
    }
    const state = live.current;
    state.opened = current;
    recordChapterOpened(current.manga, current.chapter, state.page ?? startRef.current);
    if (state.finishPending) {
      state.finishPending = false;
      state.finished = true;
      recordChapterFinished(current.manga, current.chapter);
    }
    return () => {
      flush();
      live.current = {
        opened: null,
        page: null,
        total: undefined,
        dirty: false,
        finished: false,
        finishPending: false,
      };
    };
  }, [openKey, flush]);

  const reportPosition = useCallback(
    (page: number, total: number) => {
      const state = live.current;
      state.page = page;
      state.total = total;
      if (!state.opened) {
        return;
      }
      state.dirty = true;
      timer.current ??= setTimeout(flush, POSITION_THROTTLE_MS);
    },
    [flush],
  );

  const reportFinished = useCallback(() => {
    const state = live.current;
    if (state.finished) {
      return;
    }
    if (!state.opened) {
      state.finishPending = true;
      return;
    }
    state.finished = true;
    recordChapterFinished(state.opened.manga, state.opened.chapter);
  }, []);

  return useMemo(() => ({ reportPosition, reportFinished }), [reportPosition, reportFinished]);
}
