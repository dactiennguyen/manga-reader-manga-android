import { useEffect, useState } from 'react';

import { Dialog } from '../../components/Sheet';
import { Globe } from '../../components/icons';
import { TextField, toast } from '../../components/ui';
import { ensureScheme, looksLikeUrl } from '../../lib/url';

export function StartPageDialog({
  visible,
  url,
  onClose,
  onSave,
}: {
  visible: boolean;
  url: string;
  onClose: () => void;
  onSave: (url: string) => void;
}) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (visible) {
      setValue(url);
    }
  }, [visible, url]);

  const save = () => {
    const target = value.trim();
    if (!looksLikeUrl(target)) {
      toast('Địa chỉ trang web không hợp lệ');
      return;
    }
    onSave(ensureScheme(target));
    onClose();
  };

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title="Trang tuỳ chọn"
      message="Trang này sẽ được mở mỗi khi khởi động app."
      actions={[
        { label: 'Huỷ', onPress: onClose },
        { label: 'Lưu', variant: 'primary', onPress: save, disabled: !value.trim() },
      ]}
    >
      <TextField
        icon={Globe}
        value={value}
        onChangeText={setValue}
        onClear={() => setValue('')}
        placeholder="https://…"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        keyboardType="url"
        returnKeyType="done"
        selectTextOnFocus
        onSubmitEditing={save}
      />
    </Dialog>
  );
}
