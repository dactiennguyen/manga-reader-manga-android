import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ArrowDownUp, ChartPie, Info } from '../../components/icons';
import { Chip, ChipRow } from '../../components/ui';
import { font, radius, space, useTheme } from '../../theme';

/** Thanh trên danh sách chương: đếm, đảo thứ tự, lọc theo nhóm dịch. */
export function ChapterToolbar({
  count,
  unread,
  ascending,
  onToggleOrder,
  groups,
  activeGroup,
  onSelectGroup,
  onSummary,
}: {
  count: number;
  unread: number;
  ascending: boolean;
  onToggleOrder: () => void;
  groups: { name: string; count: number }[];
  activeGroup: string | null;
  onSelectGroup: (group: string | null) => void;
  /** Mở hộp thoại tóm tắt chương. */
  onSummary: () => void;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.wrap, { borderBottomColor: c.border }]}>
      <View style={styles.row}>
        <Pressable
          onPress={onSummary}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Tóm tắt chương"
          style={({ pressed }) => [styles.summary, pressed && styles.pressed]}
        >
          <Text style={[font.label, { color: c.text }]}>{count} chương</Text>
          <ChartPie size={16} color={c.muted} />
        </Pressable>
        {unread > 0 && (
          <View style={[styles.unread, { backgroundColor: c.accentSoft }]}>
            <Text style={[font.caption, styles.bold, { color: c.accent }]}>{unread} chưa đọc</Text>
          </View>
        )}
        <View style={styles.flex} />
        <Pressable
          onPress={onToggleOrder}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Đảo thứ tự chương"
          style={({ pressed }) => [styles.order, { backgroundColor: c.surfaceAlt }, pressed && styles.pressed]}
        >
          <ArrowDownUp size={14} color={c.textSecondary} />
          <Text style={[font.caption, styles.bold, { color: c.textSecondary }]}>
            {ascending ? 'Cũ → mới' : 'Mới → cũ'}
          </Text>
        </Pressable>
      </View>

      {groups.length > 1 && (
        <ChipRow style={styles.groups}>
          <Chip label="Tất cả" selected={!activeGroup} onPress={() => onSelectGroup(null)} />
          {groups.map(group => (
            <Chip
              key={group.name}
              label={group.name}
              count={group.count}
              selected={activeGroup === group.name}
              onPress={() => onSelectGroup(group.name)}
            />
          ))}
        </ChipRow>
      )}

      {!!activeGroup && (
        <View style={[styles.notice, { backgroundColor: c.surfaceAlt }]}>
          <Info size={16} color={c.muted} />
          <Text style={[font.caption, styles.flex, { color: c.textSecondary }]}>Còn chương từ nhóm dịch khác.</Text>
          <Pressable onPress={() => onSelectGroup(null)} hitSlop={8}>
            <Text style={[font.caption, styles.bold, { color: c.accent }]}>Hiện tất cả chương</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bold: { fontWeight: '700' },
  wrap: { paddingTop: space.md, paddingBottom: space.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg },
  unread: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill },
  order: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  pressed: { opacity: 0.6 },
  groups: { paddingBottom: 0 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.lg,
    marginTop: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
  },
});
