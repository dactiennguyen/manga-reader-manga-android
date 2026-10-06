import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Dialog } from '../../components/Sheet';
import { FieldLabel, TextField, toast } from '../../components/ui';
import { ensureScheme, getHost, looksLikeUrl } from '../../lib/url';
import { useBrowser, type QuickAccessItem } from '../../store/useBrowser';

export function ShortcutDialog({
  visible,
  item,
  onClose,
}: {
  visible: boolean;
  item?: QuickAccessItem;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (visible) {
      setTitle(item?.title ?? '');
      setUrl(item?.url ?? '');
    }
  }, [visible, item]);

  const save = () => {
    const target = url.trim();
    if (!looksLikeUrl(target)) {
      toast('Địa chỉ trang web không hợp lệ');
      return;
    }
    const fixed = ensureScheme(target);
    const value = { title: title.trim() || getHost(fixed) || fixed, url: fixed };
    const store = useBrowser.getState();
    if (item) {
      store.updateQuickAccess(item.id, value);
    } else {
      store.addQuickAccess(value);
    }
    onClose();
  };

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={item ? 'Sửa lối tắt' : 'Thêm lối tắt'}
      actions={[
        { label: 'Huỷ', onPress: onClose },
        { label: 'Lưu', variant: 'primary', onPress: save, disabled: !url.trim() },
      ]}
    >
      <View>
        <FieldLabel>Tên</FieldLabel>
        <TextField value={title} onChangeText={setTitle} placeholder="Ví dụ: MangaDex" autoFocus={!item} />
        <FieldLabel>Địa chỉ</FieldLabel>
        <TextField
          value={url}
          onChangeText={setUrl}
          placeholder="https://…"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          onSubmitEditing={save}
        />
      </View>
    </Dialog>
  );
}
