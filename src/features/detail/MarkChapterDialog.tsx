import { CheckCheck, Download, Eye, EyeOff, Globe, Undo2 } from 'lucide-react-native';

import { Sheet } from '../../components/Sheet';
import { Divider, ListItem, toast } from '../../components/ui';
import type { Chapter } from '../../sources/types';
import { markChaptersRead, useProgress } from '../../store/progress';
import { useChapterDownload, type DownloadTask } from '../../store/useDownloads';
import { refreshUnread } from '../library/updates';
import { chapterMeta } from './chapters';

export type ChapterTarget = { chapter: Chapter; index: number };

const DOWNLOAD_LABEL: Record<DownloadTask['status'], string> = {
  queued: 'Đang chờ tải',
  downloading: 'Đang tải',
  paused: 'Đã tạm dừng',
  done: 'Đã tải xong',
  error: 'Tải lỗi — bấm để tải lại',
};

/**
 * MarkChapterDialog: nhấn giữ một chương để đánh dấu đã đọc/chưa đọc (cả
 * loạt trước/sau), tải riêng chương đó hoặc mở trên web.
 */
export function MarkChapterDialog({
  visible,
  onClose,
  target,
  chapters,
  mangaKey,
  onDownload,
  onOpenWeb,
}: {
  visible: boolean;
  onClose: () => void;
  target?: ChapterTarget;
  /** Toàn bộ chương, mới nhất trước. */
  chapters: Chapter[];
  mangaKey: string;
  onDownload: (chapter: Chapter) => void;
  onOpenWeb: (chapter: Chapter) => void;
}) {
  const progress = useProgress(mangaKey);
  const task = useChapterDownload(mangaKey, target?.chapter.url ?? '');
  if (!target) {
    return null;
  }
  const { chapter, index } = target;
  const read = !!progress.read[chapter.url];
  // Danh sách mới nhất trước: chương cũ hơn nằm sau index, mới hơn nằm trước.
  const older = chapters.slice(index + 1);
  const newer = chapters.slice(0, index);

  const mark = (list: Chapter[], value: boolean, message: string) => {
    markChaptersRead(
      mangaKey,
      list.map(ch => ch.url),
      value,
    );
    refreshUnread(mangaKey);
    toast(message);
    onClose();
  };

  const canDownload = !task || task.status === 'error';

  return (
    <Sheet visible={visible} onClose={onClose} title={chapter.name} subtitle={chapterMeta(chapter) || undefined}>
      <ListItem
        icon={read ? EyeOff : Eye}
        title={read ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}
        onPress={() => mark([chapter], !read, read ? 'Đã đánh dấu chưa đọc' : 'Đã đánh dấu đã đọc')}
      />
      <ListItem
        icon={CheckCheck}
        title="Đánh dấu đã đọc mọi chương trước"
        subtitle={older.length ? `${older.length} chương cũ hơn chương này` : 'Không có chương nào cũ hơn'}
        disabled={!older.length}
        onPress={() => mark(older, true, `Đã đánh dấu ${older.length} chương là đã đọc`)}
      />
      <ListItem
        icon={Undo2}
        title="Đánh dấu chưa đọc mọi chương sau"
        subtitle={newer.length ? `${newer.length} chương mới hơn chương này` : 'Không có chương nào mới hơn'}
        disabled={!newer.length}
        onPress={() => mark(newer, false, `Đã đánh dấu ${newer.length} chương là chưa đọc`)}
      />
      <Divider />
      <ListItem
        icon={Download}
        title="Tải chương này"
        subtitle={task ? DOWNLOAD_LABEL[task.status] : 'Đọc offline khi không có mạng'}
        disabled={!canDownload}
        onPress={() => {
          onDownload(chapter);
          onClose();
        }}
      />
      <ListItem
        icon={Globe}
        title="Mở chương trên web"
        onPress={() => {
          onClose();
          onOpenWeb(chapter);
        }}
      />
    </Sheet>
  );
}
