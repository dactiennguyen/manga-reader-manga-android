import { Sheet } from '../../components/Sheet';
import { Film, Music } from '../../components/icons';
import { ListItem, toast } from '../../components/ui';
import { errorMessage } from '../../lib/http';
import { displayUrl } from '../../lib/url';
import { fileNameFromUrl, startFileDownload } from '../downloads/fileDownloader';
import type { MediaItem } from './scripts';

export type MediaFound = { pageUrl: string; items: MediaItem[] };

export function MediaSheet({ found, onClose }: { found: MediaFound | null; onClose: () => void }) {
  const download = async (item: MediaItem) => {
    onClose();
    try {
      await startFileDownload(item.url, { pageUrl: found?.pageUrl, kind: item.kind });
      toast('Đang tải — xem trong Tải xuống › Tệp & media');
    } catch (error) {
      toast(`Không tải được: ${errorMessage(error)}`);
    }
  };

  return (
    <Sheet
      visible={!!found}
      onClose={onClose}
      title="Tải video trên trang"
      subtitle={found ? `Tìm thấy ${found.items.length} tệp media` : undefined}
    >
      {found?.items.map(item => (
        <ListItem
          key={item.url}
          icon={item.kind === 'audio' ? Music : Film}
          title={fileNameFromUrl(item.url, item.kind)}
          subtitle={item.label ? `${item.label} · ${displayUrl(item.url)}` : displayUrl(item.url)}
          onPress={() => download(item)}
        />
      ))}
    </Sheet>
  );
}
