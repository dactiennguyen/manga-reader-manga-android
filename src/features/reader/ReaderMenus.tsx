import Clipboard from '@react-native-clipboard/clipboard';
import { BookOpen, Copy, Download, ExternalLink, Globe, RotateCw, Share2 } from 'lucide-react-native';
import { Share } from 'react-native';

import { openInBrowser, useAppNavigation } from '../../app/routes';
import { Sheet } from '../../components/Sheet';
import { Divider, ListItem, toast } from '../../components/ui';
import { displayUrl } from '../../lib/url';
import type { Chapter, Page } from '../../sources/types';
import {
  useChapterDownload,
  useDownloads,
  type DownloadManga,
  type DownloadStatus,
} from '../../store/useDownloads';
import { requestPageReload } from './pageImageCache';

type MenuProps = {
  visible: boolean;
  onClose: () => void;
  manga: DownloadManga;
  chapter: Chapter;
  onOpenManga: () => void;
};

const DOWNLOAD_STATUS: Record<DownloadStatus, string> = {
  queued: 'Đang chờ tải',
  downloading: 'Đang tải…',
  paused: 'Đã tạm dừng — mở mục Tải xuống để tiếp tục',
  done: 'Đã tải, đọc được khi không có mạng',
  error: 'Lần tải trước bị lỗi — bấm để thử lại',
};

/** Menu "⋮" của reader (dùng chung manga và novel). */
export function ReaderMenuSheet({ visible, onClose, manga, chapter, onOpenManga }: MenuProps) {
  const navigation = useAppNavigation();
  const task = useChapterDownload(manga.mangaKey, chapter.url);
  const status = task ? DOWNLOAD_STATUS[task.status] : undefined;
  const canDownload = !task || task.status === 'error';

  const run = (action: () => void) => () => {
    onClose();
    action();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={chapter.name} subtitle={displayUrl(chapter.url)}>
      <ListItem
        icon={Globe}
        title="Mở trang gốc trên web"
        onPress={run(() => openInBrowser(navigation, chapter.url))}
      />
      <ListItem
        icon={Download}
        title="Tải chương này"
        subtitle={status}
        disabled={!canDownload}
        onPress={run(() => {
          const added = useDownloads.getState().enqueue(manga, [chapter]);
          toast(added ? 'Đã thêm chương vào hàng tải' : 'Chương này đã có trong danh sách tải');
        })}
      />
      <ListItem
        icon={Share2}
        title="Chia sẻ link chương"
        onPress={run(() => {
          Share.share({ message: chapter.url }).catch(() => {});
        })}
      />
      <Divider inset={52} />
      <ListItem icon={BookOpen} title="Trang truyện" subtitle={manga.mangaTitle} onPress={run(onOpenManga)} />
    </Sheet>
  );
}

type PageMenuProps = {
  page?: Page;
  index: number | null;
  onClose: () => void;
};

/** Menu nhấn giữ ảnh trang. */
export function PageMenuSheet({ page, index, onClose }: PageMenuProps) {
  const navigation = useAppNavigation();
  const local = !!page?.uri.startsWith('file://');

  const run = (action: (target: Page) => void) => () => {
    onClose();
    if (page) {
      action(page);
    }
  };

  return (
    <Sheet
      visible={!!page}
      onClose={onClose}
      title={index !== null ? `Trang ${index + 1}` : undefined}
      subtitle={page && !local ? displayUrl(page.uri) : undefined}
    >
      <ListItem
        icon={Copy}
        title="Sao chép link ảnh"
        disabled={local}
        onPress={run(target => {
          Clipboard.setString(target.uri);
          toast('Đã sao chép link ảnh');
        })}
      />
      <ListItem
        icon={Share2}
        title="Chia sẻ link ảnh"
        disabled={local}
        onPress={run(target => {
          Share.share({ message: target.uri }).catch(() => {});
        })}
      />
      <ListItem
        icon={ExternalLink}
        title="Mở ảnh trong trình duyệt"
        disabled={local}
        onPress={run(target => openInBrowser(navigation, target.uri))}
      />
      <ListItem icon={RotateCw} title="Tải lại ảnh" onPress={run(target => requestPageReload(target.uri))} />
    </Sheet>
  );
}
