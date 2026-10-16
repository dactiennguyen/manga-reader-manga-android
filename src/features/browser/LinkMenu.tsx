import Clipboard from '@react-native-clipboard/clipboard';
import { Share } from 'react-native';

import { Sheet } from '../../components/Sheet';
import {
  Copy,
  Download,
  ExternalLink,
  File,
  Image as ImageIcon,
  Layers,
  ScanEye,
  Share2,
  Type,
} from '../../components/icons';
import { Divider, ListItem, toast } from '../../components/ui';
import { errorMessage } from '../../lib/http';
import { displayUrl } from '../../lib/url';
import { useBrowser } from '../../store/useBrowser';
import { startFileDownload } from '../downloads/fileDownloader';

export type LinkTarget = { href: string; text: string; src: string };

export function LinkMenu({
  target,
  pageUrl,
  incognito,
  onPreview,
  onClose,
}: {
  target: LinkTarget | null;
  pageUrl: string;
  incognito: boolean;
  onPreview?: (url: string) => void;
  onClose: () => void;
}) {
  const href = target?.href ?? '';
  const src = target?.src ?? '';
  const isDataImage = /^data:/i.test(src);
  const isWeb = /^https?:/i.test(href);

  const run = (action: () => void) => () => {
    onClose();
    action();
  };

  const openTab = (url: string, background = false) => {
    useBrowser.getState().newTab(url, { incognito, background });
    if (background) {
      toast('Đã mở ở tab nền');
    }
  };

  const copy = (value: string, message: string) => {
    Clipboard.setString(value);
    toast(message);
  };

  const share = (value: string) => {
    Share.share({ message: value }).catch(() => {});
  };

  const download = async (url: string, image: boolean) => {
    try {
      await startFileDownload(url, { pageUrl, kind: image ? 'image' : undefined });
      toast(image ? 'Đang tải ảnh — xem trong Tải xuống › Tệp & media' : 'Đang tải — xem trong Tải xuống › Tệp & media');
    } catch (error) {
      toast(`Không tải được: ${errorMessage(error)}`);
    }
  };

  const title = href ? target?.text || displayUrl(href) : 'Ảnh';
  const subtitle = href ? displayUrl(href) : isDataImage ? undefined : displayUrl(src);

  return (
    <Sheet visible={!!target} onClose={onClose} title={title} subtitle={subtitle}>
      {!!href && (
        <>
          <ListItem icon={ExternalLink} title="Mở link trong tab mới" onPress={run(() => openTab(href))} />
          <ListItem icon={Layers} title="Mở link ở tab nền" onPress={run(() => openTab(href, true))} />
          {isWeb && onPreview && (
            <ListItem icon={ScanEye} title="Xem trước trang" onPress={run(() => onPreview(href))} />
          )}
          <ListItem icon={Copy} title="Sao chép địa chỉ link" onPress={run(() => copy(href, 'Đã sao chép link'))} />
          {!!target?.text && (
            <ListItem icon={Type} title="Sao chép chữ của link" onPress={run(() => copy(target.text, 'Đã sao chép chữ'))} />
          )}
          <ListItem icon={Share2} title="Chia sẻ link" onPress={run(() => share(href))} />
          {isWeb && (
            <ListItem icon={File} title="Tải tệp của link" onPress={run(() => download(href, false))} />
          )}
        </>
      )}
      {!!href && !!src && <Divider />}
      {!!src && (
        <>
          {!isDataImage && (
            <>
              <ListItem icon={ImageIcon} title="Mở ảnh trong tab mới" onPress={run(() => openTab(src))} />
              <ListItem icon={Copy} title="Sao chép link ảnh" onPress={run(() => copy(src, 'Đã sao chép link ảnh'))} />
              <ListItem icon={Share2} title="Chia sẻ ảnh (link)" onPress={run(() => share(src))} />
            </>
          )}
          <ListItem icon={Download} title="Tải ảnh" onPress={run(() => download(src, true))} />
        </>
      )}
    </Sheet>
  );
}
