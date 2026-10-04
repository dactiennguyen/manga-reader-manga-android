import { toast } from '../../components/ui';
import { mangaKey } from '../../sources';
import { getCachedDetail } from '../../sources/cache';
import type { MangaItem, SourceConfig } from '../../sources/types';
import { useLibrary } from '../../store/useLibrary';
import { countUnread } from '../library/updates';

/**
 * Nhấn giữ truyện trong catalog: thêm/bỏ bookmark nhanh. Đã từng mở chi tiết
 * thì lấy luôn số chương từ cache để badge chưa đọc đúng ngay.
 */
export function toggleQuickBookmark(source: SourceConfig, item: MangaItem): void {
  const key = mangaKey(source.id, item.url);
  const library = useLibrary.getState();
  if (library.bookmarks[key]) {
    library.removeBookmarks([key]);
    toast(`Đã bỏ "${item.title}" khỏi bookmark`);
    return;
  }
  const detail = getCachedDetail(key);
  library.addBookmark({
    key,
    sourceId: source.id,
    url: item.url,
    title: item.title,
    cover: item.cover ?? detail?.cover,
    content: source.content,
    nsfw: source.nsfw || detail?.nsfw || undefined,
    chapterCount: detail?.chapters.length,
    latestChapter: detail?.chapters[0]?.name,
    unread: detail ? countUnread(key, detail.chapters) : undefined,
  });
  toast(`Đã thêm "${item.title}" vào bookmark`);
}
