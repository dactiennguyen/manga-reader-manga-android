import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Sheet } from '../../components/Sheet';
import {
  Bookmark,
  BookOpen,
  Check,
  ChevronDown,
  FolderPlus,
  Globe,
  Layers,
  ScrollText,
  SquareDashed,
  Tag,
  Zap,
  type LucideIcon,
} from '../../components/icons';
import { ListItem } from '../../components/ui';
import { font, radius, space, useTheme } from '../../theme';

export type BookmarkView = 'manga' | 'novel' | 'web' | 'sites' | 'quick';

export type GroupFilter = string | null;

const LIBRARY_OPTIONS: { value: BookmarkView; label: string; icon: LucideIcon }[] = [
  { value: 'web', label: 'Trang web', icon: Bookmark },
  { value: 'sites', label: 'Site truyện', icon: Globe },
  { value: 'manga', label: 'Truyện tranh', icon: BookOpen },
  { value: 'novel', label: 'Tiểu thuyết', icon: ScrollText },
  { value: 'quick', label: 'Truy cập nhanh', icon: Zap },
];

export function libraryLabel(view: BookmarkView): string {
  return LIBRARY_OPTIONS.find(o => o.value === view)?.label ?? '';
}

export function LibraryBar({ label, onPress, right }: { label: string; onPress: () => void; right?: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={[styles.bar, { backgroundColor: c.bg, borderBottomColor: c.border }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Danh mục: ${label}`}
        style={({ pressed }) => [styles.filter, { backgroundColor: c.appBarField, opacity: pressed ? 0.75 : 1 }]}
      >
        <Text numberOfLines={1} style={[styles.filterLabel, { color: c.text }]}>
          {label}
        </Text>
        <ChevronDown size={18} color={c.text} />
      </Pressable>
      {right && <View style={styles.right}>{right}</View>}
    </View>
  );
}

export type LibraryGroups = {
  names: string[];
  counts: Record<string, number>;
  total: number;
  active: GroupFilter;
  onSelect: (group: GroupFilter) => void;
  onEdit: (group: string) => void;
  onNew: () => void;
};

export function LibrarySheet({
  visible,
  onClose,
  view,
  onViewChange,
  groups,
}: {
  visible: boolean;
  onClose: () => void;
  view: BookmarkView;
  onViewChange: (view: BookmarkView) => void;
  groups?: LibraryGroups;
}) {
  const { c } = useTheme();
  const then = (action: () => void) => () => {
    onClose();
    action();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Chọn danh mục"
      subtitle={groups ? 'Nhấn giữ một nhóm để đổi tên hoặc xoá' : undefined}
    >
      <Text style={[font.overline, styles.section, { color: c.muted }]}>Thư viện</Text>
      {LIBRARY_OPTIONS.map(option => (
        <Option
          key={option.value}
          label={option.label}
          icon={option.icon}
          selected={option.value === view}
          onPress={then(() => option.value !== view && onViewChange(option.value))}
        />
      ))}
      {groups && (
        <>
          <Text style={[font.overline, styles.section, { color: c.muted }]}>Nhóm</Text>
          <Option
            label="Tất cả"
            icon={Layers}
            count={groups.total}
            selected={groups.active === null}
            onPress={then(() => groups.onSelect(null))}
          />
          <Option
            label="Không nhóm"
            icon={SquareDashed}
            count={groups.counts[''] ?? 0}
            selected={groups.active === ''}
            onPress={then(() => groups.onSelect(''))}
          />
          {groups.names.map(name => (
            <Option
              key={name}
              label={name}
              icon={Tag}
              count={groups.counts[name] ?? 0}
              selected={groups.active === name}
              onPress={then(() => groups.onSelect(name))}
              onLongPress={then(() => groups.onEdit(name))}
            />
          ))}
          <ListItem title="Nhóm mới" icon={FolderPlus} iconColor={c.accent} onPress={then(groups.onNew)} />
        </>
      )}
    </Sheet>
  );
}

function Option({
  label,
  icon,
  count,
  selected,
  onPress,
  onLongPress,
}: {
  label: string;
  icon: LucideIcon;
  count?: number;
  selected: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const { c } = useTheme();
  return (
    <ListItem
      title={label}
      icon={icon}
      iconColor={selected ? c.accent : undefined}
      selected={selected}
      onPress={onPress}
      onLongPress={onLongPress}
      right={
        <>
          {count !== undefined && <Text style={[font.caption, { color: c.muted }]}>{count}</Text>}
          {selected && <Check size={18} color={c.accent} />}
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 52,
    paddingHorizontal: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 36,
    flexShrink: 1,
    paddingLeft: space.md,
    paddingRight: space.sm,
    borderRadius: radius.sm + 2,
  },
  filterLabel: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginLeft: 'auto' },
  section: { paddingHorizontal: space.lg + 2, paddingTop: space.md, paddingBottom: space.xs },
});
