import Clipboard from '@react-native-clipboard/clipboard';
import { Share } from 'react-native';

import { Sheet } from '../../components/Sheet';
import {
  CheckCheck,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  ScanEye,
  Share2,
  Undo2,
} from '../../components/icons';
import { Divider, ListItem, toast } from '../../components/ui';
import { displayUrl } from '../../lib/url';
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

export function MarkChapterDialog({
  visible,
  onClose,
  target,
  chapters,
  mangaKey,
  onDownload,
  onOpenWeb,
  onOpenTab,
  onPreview,
}: {
  visible: boolean;
  onClose: () => void;
  target?: ChapterTarget;
  chapters: Chapter[];
  mangaKey: string;
  onDownload: (chapter: Chapter) => void;
  onOpenWeb: (chapter: Chapter) => void;
  onOpenTab: (chapter: Chapter) => void;
  onPreview: (chapter: Chapter) => void;
}) {
  const progress = useProgress(mangaKey);
  const task = useChapterDownload(mangaKey, target?.chapter.url ?? '');
  if (!target) {
    return null;
  }
  const { chapter, index } = target;
  const read = !!progress.read[chapter.url];
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

  const run = (action: () => void) => () => {
    onClose();
    action();
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
        onPress={run(() => onDownload(chapter))}
      />
      <Divider />
      <ListItem icon={Globe} title="Mở chương trên web" onPress={run(() => onOpenWeb(chapter))} />
      <ListItem icon={ExternalLink} title="Mở trong tab mới" onPress={run(() => onOpenTab(chapter))} />
      <ListItem icon={ScanEye} title="Xem trước trang" onPress={run(() => onPreview(chapter))} />
      <Divider />
      <ListItem
        icon={Copy}
        title="Sao chép link"
        subtitle={displayUrl(chapter.url)}
        onPress={run(() => {
          Clipboard.setString(chapter.url);
          toast('Đã sao chép link');
        })}
      />
      <ListItem
        icon={Share2}
        title="Chia sẻ link"
        onPress={run(() => {
          Share.share({ message: chapter.url }).catch(() => {});
        })}
      />
    </Sheet>
  );
}
