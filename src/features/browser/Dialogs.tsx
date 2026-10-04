import { useState } from 'react';
import { Text, View } from 'react-native';

import { Dialog } from '../../components/Sheet';
import { Checkbox, FieldLabel, TextField, toast } from '../../components/ui';
import { ensureScheme } from '../../lib/url';
import { useBrowser, type WebBookmark } from '../../store/useBrowser';
import { font, useTheme } from '../../theme';

/** Thêm/sửa bookmark trang web (AddWebBookmarkDialog). */
export function BookmarkDialog({
  page,
  existing,
  onClose,
}: {
  page: { url: string; title: string };
  existing?: WebBookmark;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(existing?.title ?? page.title);
  const [url, setUrl] = useState(existing?.url ?? page.url);

  const save = () => {
    const fixed = ensureScheme(url);
    const name = title.trim() || fixed;
    const store = useBrowser.getState();
    if (existing) {
      store.updateWebBookmark(existing.id, { title: name, url: fixed });
      toast('Đã cập nhật bookmark');
    } else {
      store.addWebBookmark({ title: name, url: fixed });
      toast('Đã thêm vào bookmark');
    }
    onClose();
  };

  const remove = () => {
    if (existing) {
      useBrowser.getState().removeWebBookmarks([existing.id]);
      toast('Đã xoá bookmark');
    }
    onClose();
  };

  return (
    <Dialog
      visible
      onClose={onClose}
      title={existing ? 'Sửa bookmark' : 'Thêm bookmark'}
      actions={[
        ...(existing ? [{ label: 'Xoá', onPress: remove, variant: 'danger' as const }] : []),
        { label: 'Huỷ', onPress: onClose },
        { label: 'Lưu', onPress: save, variant: 'primary', disabled: !url.trim() },
      ]}
    >
      <View>
        <FieldLabel>Tiêu đề</FieldLabel>
        <TextField value={title} onChangeText={setTitle} placeholder="Tiêu đề trang" />
        <FieldLabel>URL</FieldLabel>
        <TextField
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
      </View>
    </Dialog>
  );
}

/** "Lưu trang": nhập tên rồi lưu HTML để xem offline. */
export function SavePageDialog({
  defaultName,
  saving,
  onSave,
  onClose,
}: {
  defaultName: string;
  saving: boolean;
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(defaultName);
  return (
    <Dialog
      visible
      onClose={onClose}
      title="Lưu trang"
      message="Trang được lưu vào mục Tải xuống để đọc lại khi không có mạng."
      actions={[
        { label: 'Huỷ', onPress: onClose },
        {
          label: 'Lưu',
          onPress: () => onSave(name.trim() || defaultName),
          variant: 'primary',
          loading: saving,
        },
      ]}
    >
      <View>
        <FieldLabel>Tên file</FieldLabel>
        <TextField value={name} onChangeText={setName} autoFocus selectTextOnFocus onSubmitEditing={() => onSave(name.trim() || defaultName)} />
      </View>
    </Dialog>
  );
}

/** Trang web muốn mở app khác (intent:, market:, tel:…). */
export function AppLinkDialog({
  url,
  host,
  onOpen,
  onBlock,
}: {
  url: string;
  host: string;
  onOpen: (remember: boolean) => void;
  onBlock: (remember: boolean) => void;
}) {
  const { c } = useTheme();
  const [remember, setRemember] = useState(false);
  const scheme = url.split(':')[0].toLowerCase();
  return (
    <Dialog
      visible
      onClose={() => onBlock(false)}
      title="Bạn có muốn mở nội dung này bằng ứng dụng khác?"
      actions={[
        { label: 'Chặn', onPress: () => onBlock(remember) },
        { label: 'Mở', onPress: () => onOpen(remember), variant: 'primary' },
      ]}
    >
      <Text numberOfLines={3} style={[font.caption, { color: c.muted }]}>
        {`${host || 'Trang này'} muốn mở liên kết “${scheme}:”`}
      </Text>
      {!!host && <Checkbox checked={remember} onChange={setRemember} label="Ghi nhớ lựa chọn cho trang này" />}
    </Dialog>
  );
}
