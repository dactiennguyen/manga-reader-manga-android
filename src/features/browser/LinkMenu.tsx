import Clipboard from '@react-native-clipboard/clipboard';
import { Copy, Download, ExternalLink, Image as ImageIcon, Layers, Share2, Type } from 'lucide-react-native';
import { Share } from 'react-native';

import { Sheet } from '../../components/Sheet';
import { Divider, ListItem, toast } from '../../components/ui';
import { errorMessage } from '../../lib/http';
import { displayUrl } from '../../lib/url';
import { useBrowser } from '../../store/useBrowser';
import { downloadImage } from './pageActions';

export type LinkTarget = { href: string; text: string; src: string };

/** Menu nhấn giữ link/ảnh trong trang. */
export function LinkMenu({
  target,
  pageUrl,
  incognito,
  onClose,
}: {
  target: LinkTarget | null;
  pageUrl: string;
  incognito: boolean;
  onClose: () => void;
}) {
  const href = target?.href ?? '';
  const src = target?.src ?? '';
  const isDataImage = /^data:/i.test(src);

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

  const saveImage = async () => {
    toast('Đang tải ảnh…');
    try {
      await downloadImage(src, pageUrl);
      toast('Đã lưu vào thư mục Download');
    } catch (error) {
      toast(`Không tải được ảnh: ${errorMessage(error)}`);
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
          <ListItem icon={Copy} title="Sao chép địa chỉ link" onPress={run(() => copy(href, 'Đã sao chép link'))} />
          {!!target?.text && (
            <ListItem icon={Type} title="Sao chép chữ của link" onPress={run(() => copy(target.text, 'Đã sao chép chữ'))} />
          )}
          <ListItem icon={Share2} title="Chia sẻ link" onPress={run(() => share(href))} />
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
          <ListItem icon={Download} title="Tải ảnh" onPress={run(saveImage)} />
        </>
      )}
    </Sheet>
  );
}
