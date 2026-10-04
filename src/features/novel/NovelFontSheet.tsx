import { Pressable, StyleSheet, Text } from 'react-native';

import { Sheet } from '../../components/Sheet';
import { Check } from '../../components/icons';
import { useSettings } from '../../store/useSettings';
import { space, useTheme } from '../../theme';
import { NOVEL_FONTS, novelFontFamily } from './novelThemes';

/** Danh sách phông mở từ nút "Hệ thống ›" của panel đáy; mỗi dòng viết bằng chính phông đó. */
export function NovelFontSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const current = useSettings(state => state.novel.font);
  const setNovel = useSettings(state => state.setNovel);

  return (
    <Sheet visible={visible} onClose={onClose} title="Phông chữ">
      {NOVEL_FONTS.map(option => {
        const selected = option.value === current;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              setNovel({ font: option.value });
              onClose();
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            android_ripple={{ color: c.border }}
            style={[styles.row, selected && { backgroundColor: c.accentSoft }]}
          >
            <Text
              style={[
                styles.label,
                { fontFamily: novelFontFamily(option.value), color: selected ? c.accent : c.text },
              ]}
            >
              {option.label}
            </Text>
            {selected && <Check size={20} color={c.accent} />}
          </Pressable>
        );
      })}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: space.xl,
    gap: space.md,
  },
  label: { flex: 1, fontSize: 18 },
});
