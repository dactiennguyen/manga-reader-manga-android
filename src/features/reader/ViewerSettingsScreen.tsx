import { Eraser, RotateCcw } from 'lucide-react-native';
import { ScrollView, StyleSheet } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Button, confirm, Header, ListItem, Screen, Section, toast } from '../../components/ui';
import {
  DEFAULT_READER_SETTINGS,
  useReaderSettings,
  type ReaderSettings,
} from '../../store/useReaderSettings';
import { space } from '../../theme';
import { ViewerSettingsForm } from './ViewerSettingsForm';

/** Mặc định của mọi tuỳ chọn trình xem, giữ nguyên cài đặt riêng từng truyện. */
function defaultsWithoutOverrides(): Partial<Omit<ReaderSettings, 'overrides'>> {
  const defaults: Partial<ReaderSettings> = { ...DEFAULT_READER_SETTINGS };
  delete defaults.overrides;
  return defaults;
}

/** Cài đặt viewer mặc định (/viewersetting), mở từ Cài đặt. */
export function ViewerSettingsScreen() {
  const prefs = useReaderSettings(
    useShallow(state => ({ viewMode: state.viewMode, direction: state.direction, pageGap: state.pageGap })),
  );
  const overrideKeys = useReaderSettings(useShallow(state => Object.keys(state.overrides)));
  const setViewerPrefs = useReaderSettings(state => state.setViewerPrefs);

  const reset = async () => {
    const ok = await confirm('Đặt lại cài đặt trình xem?', 'Mọi tuỳ chọn trên màn này sẽ về mặc định.', {
      confirmText: 'Đặt lại',
      destructive: true,
    });
    if (ok) {
      useReaderSettings.getState().set(defaultsWithoutOverrides());
      toast('Đã đặt lại cài đặt trình xem');
    }
  };

  const clearOverrides = async () => {
    const ok = await confirm(
      'Xoá cài đặt riêng?',
      `${overrideKeys.length} truyện đang dùng chế độ xem riêng sẽ quay về dùng cài đặt chung.`,
      { confirmText: 'Xoá', destructive: true },
    );
    if (ok) {
      const { clearOverride } = useReaderSettings.getState();
      overrideKeys.forEach(clearOverride);
      toast('Đã xoá cài đặt riêng của các truyện');
    }
  };

  return (
    <Screen>
      <Header title="Cài đặt trình xem" />
      <ScrollView contentContainerStyle={styles.content}>
        <ViewerSettingsForm prefs={prefs} onPrefsChange={setViewerPrefs} />
        {overrideKeys.length > 0 && (
          <Section
            title="Cài đặt riêng"
            footer="Tạo khi bỏ chọn “Áp dụng cho mọi truyện” trong cài đặt trình xem lúc đang đọc."
          >
            <ListItem
              icon={Eraser}
              title={`Xoá cài đặt riêng của ${overrideKeys.length} truyện`}
              onPress={clearOverrides}
            />
          </Section>
        )}
        <Button
          title="Đặt lại mặc định"
          icon={RotateCcw}
          variant="secondary"
          onPress={reset}
          style={styles.reset}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space.lg, paddingBottom: space.xl * 2, gap: space.lg },
  reset: { marginHorizontal: space.md },
});
