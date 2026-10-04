import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Bookmark,
  BookmarkPlus,
  BookOpen,
  Download,
  Globe,
  History,
  LayoutGrid,
  Settings,
  Settings2,
  Share2,
} from '../../components/icons';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppNavigation } from '../../app/routes';
import { Sheet } from '../../components/Sheet';
import type { LucideIcon } from '../../components/icons';
import { Divider, ListItem } from '../../components/ui';
import { displayUrl } from '../../lib/url';
import { useTheme } from '../../theme';

/** Nút icon tô đặc được (bookmark đã lưu) — IconButton dùng chung không có fill. */
export function ToolButton({
  icon: Icon,
  onPress,
  filled,
  color,
  disabled,
  accessibilityLabel,
  style,
}: {
  icon: LucideIcon;
  onPress: () => void;
  filled?: boolean;
  color?: string;
  disabled?: boolean;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const tint = color ?? c.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={{ color: c.border, borderless: true, radius: 24 }}
      style={[styles.tool, disabled && styles.disabled, style]}
    >
      <Icon size={24} color={tint} fill={filled ? tint : 'none'} />
    </Pressable>
  );
}

/** Thanh đáy trang chi tiết: bookmark, tải xuống, đọc, đảo thứ tự chương. */
export function DetailBottomBar({
  bookmarked,
  ascending,
  locked,
  hasChapters,
  canRead,
  onBookmark,
  onDownload,
  onRead,
  onToggleOrder,
}: {
  bookmarked: boolean;
  ascending: boolean;
  locked: boolean;
  hasChapters: boolean;
  canRead: boolean;
  onBookmark: () => void;
  onDownload: () => void;
  onRead: () => void;
  onToggleOrder: () => void;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.bar, { backgroundColor: c.surface, borderTopColor: c.border, paddingBottom: insets.bottom }]}
    >
      <ToolButton
        icon={bookmarked ? Bookmark : BookmarkPlus}
        filled={bookmarked}
        color={bookmarked ? c.accent : undefined}
        disabled={locked}
        onPress={onBookmark}
        accessibilityLabel={bookmarked ? 'Đã lưu bookmark' : 'Thêm vào bookmark'}
        style={styles.barItem}
      />
      <ToolButton
        icon={Download}
        disabled={locked || !hasChapters}
        onPress={onDownload}
        accessibilityLabel="Tải chương"
        style={styles.barItem}
      />
      <ToolButton
        icon={BookOpen}
        disabled={locked || !canRead}
        onPress={onRead}
        accessibilityLabel="Đọc"
        style={styles.barItem}
      />
      <ToolButton
        icon={ascending ? ArrowUpNarrowWide : ArrowDownWideNarrow}
        disabled={locked || !hasChapters}
        onPress={onToggleOrder}
        accessibilityLabel={ascending ? 'Xếp chương mới trước' : 'Xếp chương cũ trước'}
        style={styles.barItem}
      />
    </View>
  );
}

/** Menu ⋮ của thanh địa chỉ ở trang chi tiết: thêm hành động riêng của truyện. */
export function DetailMenu({
  visible,
  onClose,
  url,
  sourceName,
  onOpenWeb,
  onShare,
  onCatalog,
  onSourceSettings,
}: {
  visible: boolean;
  onClose: () => void;
  url: string;
  sourceName: string;
  onOpenWeb: () => void;
  onShare: () => void;
  onCatalog: () => void;
  onSourceSettings: () => void;
}) {
  const navigation = useAppNavigation();
  const go = (action: () => void) => {
    onClose();
    action();
  };
  return (
    <Sheet visible={visible} onClose={onClose} title={displayUrl(url)}>
      <ListItem icon={Globe} title="Xem trang web gốc" onPress={() => go(onOpenWeb)} />
      <ListItem icon={Share2} title="Chia sẻ" onPress={() => go(onShare)} />
      <ListItem icon={LayoutGrid} title={`Catalog ${sourceName}`} onPress={() => go(onCatalog)} />
      <ListItem icon={Settings2} title="Cài đặt nguồn" onPress={() => go(onSourceSettings)} />
      <Divider />
      <ListItem icon={Bookmark} title="Bookmark" onPress={() => go(() => navigation.navigate('Bookmarks'))} />
      <ListItem icon={History} title="Lịch sử" onPress={() => go(() => navigation.navigate('History'))} />
      <ListItem icon={Download} title="Tải xuống" onPress={() => go(() => navigation.navigate('Downloads'))} />
      <ListItem icon={Settings} title="Cài đặt" onPress={() => go(() => navigation.navigate('Settings'))} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  tool: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.35 },
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  barItem: { flex: 1, height: 56 },
});
