import { useMemo } from 'react';

import type { Chapter } from '../../sources/types';
import { findChapterIndex } from './useReaderData';

/**
 * Chương liền kề theo hướng `step` (−1 = mới hơn/chương sau, +1 = cũ hơn/chương trước).
 * Truyện có nhiều nhóm dịch (viewerScanlator): bỏ qua bản dịch khác của cùng số
 * chương, và trong các bản của chương kế thì ưu tiên nhóm đang đọc.
 */
function neighbor(chapters: readonly Chapter[], index: number, step: 1 | -1): Chapter | undefined {
  const current = chapters[index];
  const inRange = (i: number) => i >= 0 && i < chapters.length;
  let i = index + step;
  if (current.number !== undefined) {
    while (inRange(i) && chapters[i].number === current.number) {
      i += step;
    }
  }
  if (!inRange(i)) {
    return undefined;
  }
  const adjacent = chapters[i];
  const group = current.scanlator;
  if (!group || adjacent.scanlator === group) {
    return adjacent;
  }
  if (adjacent.number !== undefined) {
    for (let j = i; inRange(j) && chapters[j].number === adjacent.number; j += step) {
      if (chapters[j].scanlator === group) {
        return chapters[j];
      }
    }
    return adjacent;
  }
  for (let j = i; inRange(j); j += step) {
    if (chapters[j].scanlator === group) {
      return chapters[j];
    }
  }
  return adjacent;
}

export type ChapterNavigation = {
  index: number;
  current?: Chapter;
  /** Chương cũ hơn. */
  prev?: Chapter;
  /** Chương mới hơn (đọc tiếp). */
  next?: Chapter;
};

/** Danh sách chương mới nhất trước → chương sau nằm ở index nhỏ hơn. */
export function useChapterNavigation(
  chapters: readonly Chapter[] | undefined,
  chapterUrl: string,
): ChapterNavigation {
  return useMemo(() => {
    const list = chapters ?? [];
    const index = findChapterIndex(list, chapterUrl);
    if (index < 0) {
      return { index };
    }
    return {
      index,
      current: list[index],
      prev: neighbor(list, index, 1),
      next: neighbor(list, index, -1),
    };
  }, [chapters, chapterUrl]);
}
