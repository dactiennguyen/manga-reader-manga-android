import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Sheet } from '../../components/Sheet';
import { Checkbox } from '../../components/ui';
import { resolveViewerPrefs, useReaderSettings, type ViewerPrefs } from '../../store/useReaderSettings';
import { font, space, useTheme } from '../../theme';
import { setApplyToAll, updateViewerPrefs } from './viewerPrefs';
import { ViewerSettingsForm } from './ViewerSettingsForm';

type Props = {
  visible: boolean;
  onClose: () => void;
  mangaKey: string;
};

export function ViewerSettingsSheet({ visible, onClose, mangaKey }: Props) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Cài đặt trình xem">
      <ReaderViewerSettings mangaKey={mangaKey} />
    </Sheet>
  );
}

function ReaderViewerSettings({ mangaKey }: { mangaKey: string }) {
  const { c } = useTheme();
  const resolved = useReaderSettings(useShallow(state => resolveViewerPrefs(state, mangaKey)));
  const applyAll = !resolved.overridden;

  const onPrefsChange = useCallback(
    (patch: Partial<ViewerPrefs>) => updateViewerPrefs(mangaKey, patch),
    [mangaKey],
  );

  return (
    <View style={styles.root}>
      <View style={styles.applyAll}>
        <Checkbox
          checked={applyAll}
          onChange={checked => setApplyToAll(mangaKey, checked)}
          label="Áp dụng cho mọi truyện"
        />
        <Text style={[font.caption, { color: c.muted }]}>
          {applyAll
            ? 'Chế độ xem, hướng đọc và khoảng cách trang dùng chung cho mọi truyện.'
            : 'Truyện này dùng chế độ xem, hướng đọc và khoảng cách trang riêng.'}
        </Text>
      </View>
      <ViewerSettingsForm prefs={resolved} onPrefsChange={onPrefsChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md },
  applyAll: { paddingHorizontal: space.lg + 2, gap: 2 },
});
