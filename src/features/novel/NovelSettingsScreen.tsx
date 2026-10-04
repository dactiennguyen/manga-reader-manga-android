import Speech from '@mhpdev/react-native-speech';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { RotateCcw, Volume2 } from '../../components/icons';
import { Button, confirm, Header, Screen, toast } from '../../components/ui';
import { DEFAULT_NOVEL_SETTINGS, useSettings } from '../../store/useSettings';
import { font, radius, space } from '../../theme';
import {
  novelTextStyle,
  resolveNovelTheme,
  SAMPLE_PARAGRAPH,
  setNovelTheme,
  useNovelTheme,
} from './novelThemes';
import { NovelSettingsForm } from './NovelSettingsForm';
import { TTS_UNSUPPORTED } from './useTts';

/** Cài đặt mặc định của reader novel ("Default font", "Default font size", "Default color theme"). */
export function NovelSettingsScreen() {
  const novel = useSettings(state => state.novel);
  const setNovel = useSettings(state => state.setNovel);
  const { palette } = useNovelTheme();

  // Dừng giọng nghe thử khi rời màn.
  useEffect(
    () => () => {
      Speech.stop().catch(() => {});
    },
    [],
  );

  const listen = () => {
    Speech.configure({ rate: novel.ttsRate, pitch: novel.ttsPitch });
    Speech.stop()
      .catch(() => {})
      .then(() => Speech.speak(SAMPLE_PARAGRAPH))
      .catch(() => toast(TTS_UNSUPPORTED));
  };

  const reset = async () => {
    const ok = await confirm(
      'Đặt lại cài đặt đọc?',
      'Phông chữ, cỡ chữ, giãn dòng, màu nền và giọng đọc sẽ về mặc định.',
      { confirmText: 'Đặt lại', destructive: true },
    );
    if (ok) {
      setNovel(DEFAULT_NOVEL_SETTINGS);
      setNovelTheme(resolveNovelTheme(DEFAULT_NOVEL_SETTINGS.theme));
      toast('Đã đặt lại cài đặt đọc');
    }
  };

  return (
    <Screen>
      <Header title="Cài đặt đọc truyện chữ" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.preview, { backgroundColor: palette.bg, borderColor: palette.border }]}>
          <Text style={[font.overline, { color: palette.muted }]}>Xem trước</Text>
          <Text style={novelTextStyle(novel, palette)}>{SAMPLE_PARAGRAPH}</Text>
        </View>
        <NovelSettingsForm />
        <View style={styles.actions}>
          <Button title="Nghe thử giọng đọc" icon={Volume2} variant="secondary" onPress={listen} />
          <Button title="Đặt lại mặc định" icon={RotateCcw} variant="secondary" onPress={reset} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space.lg, paddingBottom: space.xl * 2, gap: space.lg },
  preview: {
    marginHorizontal: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: space.sm,
  },
  actions: { marginHorizontal: space.md, gap: space.sm },
});
