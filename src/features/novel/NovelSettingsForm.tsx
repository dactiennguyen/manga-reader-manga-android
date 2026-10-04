import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Check } from '../../components/icons';
import { Divider, ListItem, Section, Slider, Stepper } from '../../components/ui';
import { useSettings } from '../../store/useSettings';
import { font, radius, space, useTheme } from '../../theme';
import {
  FONT_SIZE_RANGE,
  LINE_HEIGHT_RANGE,
  NOVEL_FONTS,
  NOVEL_THEME_ORDER,
  NOVEL_THEMES,
  novelFontFamily,
  round1,
  setNovelTheme,
  useNovelTheme,
  VOICE_RANGE,
} from './novelThemes';

function VoiceSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const { c } = useTheme();
  const [preview, setPreview] = useState<number | null>(null);
  return (
    <View style={styles.block}>
      <View style={styles.labelRow}>
        <Text style={[font.body, styles.flex, { color: c.text }]}>{label}</Text>
        <Text style={[font.label, { color: c.accent }]}>{(preview ?? value).toFixed(1)}×</Text>
      </View>
      <Slider
        value={value}
        min={VOICE_RANGE.min}
        max={VOICE_RANGE.max}
        step={VOICE_RANGE.step}
        onChange={next => setPreview(round1(next))}
        onComplete={next => {
          setPreview(null);
          onChange(round1(next));
        }}
      />
    </View>
  );
}

/**
 * Cài đặt đọc novel: phông (xem trước bằng chính phông đó), cỡ chữ, giãn
 * dòng, màu nền, giọng đọc. Dùng cho sheet "Aa" và màn cài đặt mặc định.
 */
export function NovelSettingsForm() {
  const { c } = useTheme();
  const novel = useSettings(state => state.novel);
  const setNovel = useSettings(state => state.setNovel);
  const theme = useNovelTheme();

  return (
    <View style={styles.root}>
      <Section title="Phông chữ">
        <View style={styles.fonts}>
          {NOVEL_FONTS.map(option => {
            const selected = option.value === novel.font;
            const family = novelFontFamily(option.value);
            return (
              <Pressable
                key={option.value}
                onPress={() => setNovel({ font: option.value })}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[
                  styles.fontOption,
                  { borderColor: selected ? c.accent : c.border },
                  selected && { backgroundColor: c.accentSoft },
                ]}
              >
                <Text style={[styles.fontSample, { fontFamily: family, color: c.text }]}>Aa</Text>
                <Text
                  numberOfLines={1}
                  style={[font.caption, { fontFamily: family, color: selected ? c.accent : c.textSecondary }]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="Cỡ chữ và giãn dòng">
        <ListItem
          title="Cỡ chữ"
          right={
            <Stepper
              value={novel.fontSize}
              min={FONT_SIZE_RANGE.min}
              max={FONT_SIZE_RANGE.max}
              onChange={fontSize => setNovel({ fontSize })}
            />
          }
        />
        <Divider />
        <ListItem
          title="Giãn dòng"
          right={
            <Stepper
              value={novel.lineHeight}
              min={LINE_HEIGHT_RANGE.min}
              max={LINE_HEIGHT_RANGE.max}
              step={LINE_HEIGHT_RANGE.step}
              format={value => value.toFixed(1)}
              onChange={value => setNovel({ lineHeight: round1(value) })}
            />
          }
        />
      </Section>

      <Section title="Màu nền">
        <View style={styles.themes}>
          {NOVEL_THEME_ORDER.map(id => {
            const palette = NOVEL_THEMES[id];
            const selected = id === theme.id;
            return (
              <Pressable
                key={id}
                onPress={() => setNovelTheme(id)}
                accessibilityRole="radio"
                accessibilityLabel={palette.label}
                accessibilityState={{ selected }}
                style={styles.themeOption}
              >
                <View
                  style={[
                    styles.swatch,
                    { backgroundColor: palette.bg, borderColor: selected ? c.accent : palette.border },
                    selected && styles.swatchSelected,
                  ]}
                >
                  {selected ? (
                    <Check size={18} color={palette.text} strokeWidth={3} />
                  ) : (
                    <Text style={[styles.swatchText, { color: palette.text }]}>Aa</Text>
                  )}
                </View>
                <Text numberOfLines={1} style={[font.caption, { color: selected ? c.accent : c.muted }]}>
                  {palette.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="Đọc to">
        <VoiceSlider label="Tốc độ đọc" value={novel.ttsRate} onChange={ttsRate => setNovel({ ttsRate })} />
        <Divider />
        <VoiceSlider label="Cao độ giọng" value={novel.ttsPitch} onChange={ttsPitch => setNovel({ ttsPitch })} />
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.lg, paddingBottom: space.lg },
  flex: { flex: 1 },
  block: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.xs },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  fonts: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, padding: space.md },
  fontOption: {
    width: '23%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: space.sm,
    paddingHorizontal: space.xs,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  fontSample: { fontSize: 22 },
  themes: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', rowGap: space.md, padding: space.md },
  themeOption: { width: 76, alignItems: 'center', gap: space.xs },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: { borderWidth: 3 },
  swatchText: { fontSize: 16, fontWeight: '600' },
});
