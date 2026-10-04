import { formatDate } from '../../lib/time';
import type { Chapter } from '../../sources/types';
import type { MangaProgress } from '../../store/progress';

/** Chương nút "Đọc" sẽ mở. `chapters` xếp mới nhất trước. */
export type ReadTarget = {
  chapter: Chapter;
  label: string;
  /** Trang/đoạn đang đọc dở. */
  page?: number;
};

export function readTarget(chapters: Chapter[], progress: MangaProgress): ReadTarget | undefined {
  if (!chapters.length) {
    return undefined;
  }
  const { last, read } = progress;
  if (last) {
    const index = chapters.findIndex(ch => ch.url === last.chapterUrl);
    if (index >= 0) {
      if (!read[last.chapterUrl]) {
        return { chapter: chapters[index], page: last.page, label: `Đọc tiếp: ${chapters[index].name}` };
      }
      // Đọc xong chương cuối cùng mở thì gợi ý chương kế (mới hơn một bậc).
      if (index > 0) {
        return { chapter: chapters[index - 1], label: `Đọc tiếp: ${chapters[index - 1].name}` };
      }
      return { chapter: chapters[0], label: `Đọc lại: ${chapters[0].name}` };
    }
  }
  // Chưa mở chương nào nhưng đã đánh dấu đã đọc: tiếp từ chương cũ nhất chưa đọc.
  if (chapters.some(ch => read[ch.url])) {
    for (let i = chapters.length - 1; i >= 0; i--) {
      if (!read[chapters[i].url]) {
        return { chapter: chapters[i], label: `Đọc tiếp: ${chapters[i].name}` };
      }
    }
    return { chapter: chapters[0], label: `Đọc lại: ${chapters[0].name}` };
  }
  return { chapter: chapters[chapters.length - 1], label: 'Đọc từ đầu' };
}

/** Các nhóm dịch, nhóm nhiều chương nhất trước. */
export function scanlatorGroups(chapters: Chapter[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const ch of chapters) {
    if (ch.scanlator) {
      counts.set(ch.scanlator, (counts.get(ch.scanlator) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function chapterDate(chapter: Chapter): string | undefined {
  return chapter.date || (chapter.time ? formatDate(chapter.time) : undefined);
}

/** Dòng phụ của chương: ngày · nhóm dịch. */
export function chapterMeta(chapter: Chapter): string {
  return [chapterDate(chapter), chapter.scanlator].filter(Boolean).join(' · ');
}
