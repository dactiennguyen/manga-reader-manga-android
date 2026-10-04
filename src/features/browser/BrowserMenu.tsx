import type { LucideIcon } from 'lucide-react-native';
import {
  BookOpen,
  Bookmark,
  ChartColumn,
  CodeXml,
  Cookie,
  Download,
  ExternalLink,
  History,
  Monitor,
  Plus,
  Puzzle,
  RotateCw,
  Save,
  ScanQrCode,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Star,
  VenetianMask,
} from 'lucide-react-native';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Sheet } from '../../components/Sheet';
import { Divider, ListItem } from '../../components/ui';
import { displayUrl } from '../../lib/url';
import { font, radius, space, useTheme } from '../../theme';
import { Favicon } from '../../components/Favicon';

export type MenuAction =
  | 'newTab'
  | 'newIncognitoTab'
  | 'bookmarks'
  | 'history'
  | 'downloads'
  | 'addons'
  | 'stats'
  | 'settings'
  | 'qr'
  | 'runAddon'
  | 'bookmarkPage'
  | 'find'
  | 'desktop'
  | 'share'
  | 'openExternal'
  | 'savePage'
  | 'viewSource'
  | 'adblock'
  | 'clearSiteData'
  | 'reload';

const SHORTCUTS: { action: MenuAction; label: string; icon: LucideIcon }[] = [
  { action: 'newTab', label: 'Tab mới', icon: Plus },
  { action: 'newIncognitoTab', label: 'Tab ẩn danh mới', icon: VenetianMask },
  { action: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
  { action: 'history', label: 'Lịch sử', icon: History },
  { action: 'downloads', label: 'Tải xuống', icon: Download },
  { action: 'addons', label: 'Addon', icon: Puzzle },
  { action: 'stats', label: 'Thống kê đọc', icon: ChartColumn },
  { action: 'settings', label: 'Cài đặt', icon: Settings },
  { action: 'qr', label: 'Quét QR', icon: ScanQrCode },
];

/** Menu của trình duyệt: lối tắt + hành động cho trang đang xem. */
export function BrowserMenu({
  visible,
  onClose,
  page,
  bookmarked,
  desktop,
  blocked,
  adblockActive,
  addonSupported,
  onAction,
}: {
  visible: boolean;
  onClose: () => void;
  /** Trang web đang xem, null khi ở trang chủ. */
  page: { url: string; title: string } | null;
  bookmarked: boolean;
  desktop: boolean;
  blocked: number;
  adblockActive: boolean;
  addonSupported: boolean;
  onAction: (action: MenuAction) => void;
}) {
  const { c } = useTheme();

  return (
    <Sheet visible={visible} onClose={onClose}>
      {page && (
        <View style={styles.pageHeader}>
          <Favicon url={page.url} label={page.title} size={32} />
          <View style={styles.flex}>
            <Text numberOfLines={1} style={[font.label, { color: c.text }]}>
              {page.title || displayUrl(page.url)}
            </Text>
            <Text numberOfLines={1} style={[font.caption, { color: c.muted }]}>
              {displayUrl(page.url)}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.grid}>
        {SHORTCUTS.map(item => (
          <Pressable
            key={item.action}
            onPress={() => onAction(item.action)}
            style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}
          >
            <View style={[styles.shortcutIcon, { backgroundColor: c.surfaceAlt }]}>
              <item.icon size={21} color={c.text} />
            </View>
            <Text numberOfLines={2} style={[styles.shortcutLabel, { color: c.textSecondary }]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {page && (
        <>
          <Divider />
          <ListItem
            icon={BookOpen}
            iconColor={addonSupported ? c.accent : undefined}
            title="Chạy addon"
            subtitle={addonSupported ? 'Mở trang này bằng giao diện đọc truyện của app' : undefined}
            onPress={() => onAction('runAddon')}
          />
          <ListItem
            icon={Star}
            iconColor={bookmarked ? c.accent : undefined}
            title={bookmarked ? 'Sửa bookmark' : 'Thêm bookmark'}
            onPress={() => onAction('bookmarkPage')}
          />
          <ListItem icon={Search} title="Tìm trong trang" onPress={() => onAction('find')} />
          <ListItem
            icon={Monitor}
            title="Trang cho máy tính"
            onPress={() => onAction('desktop')}
            right={
              <Switch
                value={desktop}
                onValueChange={() => onAction('desktop')}
                trackColor={{ true: c.accent, false: c.border }}
                thumbColor={c.surface}
              />
            }
          />
          <ListItem icon={Share2} title="Chia sẻ link" onPress={() => onAction('share')} />
          <ListItem icon={ExternalLink} title="Mở bằng ứng dụng khác" onPress={() => onAction('openExternal')} />
          <ListItem icon={Save} title="Lưu trang" subtitle="Lưu để đọc offline" onPress={() => onAction('savePage')} />
          <ListItem icon={CodeXml} title="Xem mã nguồn" onPress={() => onAction('viewSource')} />
          <ListItem
            icon={ShieldCheck}
            iconColor={adblockActive ? c.accent : undefined}
            title="Chặn quảng cáo"
            subtitle={adblockActive ? `Đã chặn ${blocked} trên trang này` : 'Đang tắt cho trang này'}
            onPress={() => onAction('adblock')}
            chevron
          />
          <ListItem icon={Cookie} title="Cookie & dữ liệu trang" subtitle="Xoá cookie của site này" onPress={() => onAction('clearSiteData')} />
          <ListItem icon={RotateCw} title="Tải lại" onPress={() => onAction('reload')} />
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.6 },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space.sm, paddingBottom: space.sm },
  shortcut: { width: '33.33%', alignItems: 'center', gap: 6, paddingVertical: space.sm },
  shortcutIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: { fontSize: 12, textAlign: 'center', paddingHorizontal: space.xs },
});
