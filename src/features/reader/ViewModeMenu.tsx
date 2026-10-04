import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Check,
  Columns2,
  GalleryHorizontal,
  GalleryVertical,
  RectangleVertical,
  type LucideIcon,
} from '../../components/icons';
import type { ViewMode } from '../../store/useReaderSettings';
import { radius, space } from '../../theme';
import { CHROME_ACCENT, CHROME_FG, SIDE_TOOLBAR_WIDTH } from './chromeParts';
import { VIEW_MODE_NAMES, VIEW_MODE_OPTIONS } from './viewerPrefs';

export const MODE_ICONS: Record<ViewMode, LucideIcon> = {
  vertical: GalleryVertical,
  horizontal: GalleryHorizontal,
  single: RectangleVertical,
  double: Columns2,
};

/** Menu chọn chế độ xem bật ra bên trái thanh công cụ dọc (cùng căn giữa màn). */
export function ViewModeMenu({
  visible,
  value,
  onPick,
  onClose,
}: {
  visible: boolean;
  value: ViewMode;
  onPick: (mode: ViewMode) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Đóng menu" />
      <View pointerEvents="box-none" style={styles.anchor}>
        <View style={styles.menu}>
          {VIEW_MODE_OPTIONS.map(({ value: mode }) => {
            const Icon = MODE_ICONS[mode];
            const selected = mode === value;
            const color = selected ? CHROME_ACCENT : CHROME_FG;
            return (
              <Pressable
                key={mode}
                onPress={() => onPick(mode)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                style={styles.item}
              >
                <Icon size={20} color={color} />
                <Text numberOfLines={1} style={[styles.label, { color }]}>
                  {VIEW_MODE_NAMES[mode]}
                </Text>
                <View style={styles.check}>{selected && <Check size={18} color={CHROME_ACCENT} />}</View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: SIDE_TOOLBAR_WIDTH + space.sm,
  },
  menu: {
    width: 280,
    paddingVertical: space.xs,
    borderRadius: radius.md,
    backgroundColor: 'rgba(28,28,28,0.97)',
    overflow: 'hidden',
    elevation: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 48,
    paddingHorizontal: space.lg,
  },
  label: { flex: 1, fontSize: 15 },
  check: { width: 18 },
});
