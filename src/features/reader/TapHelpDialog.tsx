import { StyleSheet, Text, View } from 'react-native';

import { Dialog, type DialogAction } from '../../components/Sheet';
import type { TapZone } from '../../store/useReaderSettings';
import { font, radius, space, useTheme } from '../../theme';
import { resolveTap, type TapAction } from './tapZones';

type Props = {
  visible: boolean;
  onClose: () => void;
  tapToScroll: boolean;
  zone: TapZone;
  rtl: boolean;
  tips: readonly string[];
  onOpenSettings?: () => void;
};

const LABELS: Record<TapAction, string> = { prev: 'Lùi', next: 'Tiến', menu: 'Menu' };
const GRID = [0, 1, 2] as const;

export function TapHelpDialog({ visible, onClose, tapToScroll, zone, rtl, tips, onOpenSettings }: Props) {
  const { c } = useTheme();
  const fills: Record<TapAction, string> = {
    prev: `${c.badgeNew}38`,
    next: `${c.badgeUnread}38`,
    menu: c.surfaceAlt,
  };

  const actions: DialogAction[] = [{ label: 'Đã hiểu', onPress: onClose, variant: 'secondary' }];
  if (onOpenSettings) {
    actions.unshift({
      label: 'Đổi vùng chạm',
      variant: 'ghost',
      onPress: () => {
        onClose();
        onOpenSettings();
      },
    });
  }

  return (
    <Dialog visible={visible} onClose={onClose} title="Vùng chạm và cử chỉ" actions={actions}>
      <View style={styles.body}>
        <View style={[styles.phone, { borderColor: c.border }]}>
          {GRID.map(row => (
            <View key={row} style={styles.gridRow}>
              {GRID.map(col => {
                const action = resolveTap({
                  x: col + 0.5,
                  y: row + 0.5,
                  width: 3,
                  height: 3,
                  tapToScroll,
                  zone,
                  rtl,
                });
                return (
                  <View key={col} style={[styles.cell, { backgroundColor: fills[action] }]}>
                    <Text numberOfLines={1} style={[styles.cellLabel, { color: c.text }]}>
                      {LABELS[action]}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
        <View style={styles.tips}>
          {!tapToScroll && (
            <Text style={[font.caption, styles.bold, { color: c.warning }]}>
              Đang tắt chạm để cuộn — bấm biểu tượng bàn tay để bật.
            </Text>
          )}
          {tips.map(tip => (
            <View key={tip} style={styles.tip}>
              <View style={[styles.bullet, { backgroundColor: c.accent }]} />
              <Text style={[font.caption, styles.flex, { color: c.textSecondary }]}>{tip}</Text>
            </View>
          ))}
        </View>
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  body: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  phone: {
    width: 118,
    height: 196,
    padding: 3,
    gap: 3,
    borderWidth: 2,
    borderRadius: radius.lg,
  },
  gridRow: { flex: 1, flexDirection: 'row', gap: 3 },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  cellLabel: { fontSize: 11, fontWeight: '700' },
  tips: { flex: 1, gap: space.sm },
  tip: { flexDirection: 'row', gap: space.sm },
  bullet: { width: 5, height: 5, borderRadius: 3, marginTop: 6 },
});
