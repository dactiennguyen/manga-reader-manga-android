import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  ChartColumn,
  CodeXml,
  Cookie,
  Download,
  ExternalLink,
  Film,
  History,
  House,
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
  ShieldOff,
  Star,
  VenetianMask,
  X,
} from '../../components/icons';
import type { ReactNode } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { LucideIcon } from '../../components/icons';
import { Divider } from '../../components/ui';
import { font, radius, space, useTheme } from '../../theme';
import type { AddonState } from './AddressBar';

export type MenuAction =
  | 'back'
  | 'forward'
  | 'reload'
  | 'stop'
  | 'home'
  | 'bookmarkPage'
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
  | 'find'
  | 'desktop'
  | 'share'
  | 'openExternal'
  | 'savePage'
  | 'findMedia'
  | 'viewSource'
  | 'adblock'
  | 'clearSiteData';

export type MenuNav = {
  canBack: boolean;
  canForward: boolean;
  loading: boolean;
  atHome: boolean;
};

const APP_ITEMS: { action: MenuAction; label: string; icon: LucideIcon }[] = [
  { action: 'bookmarks', label: 'Bookmark', icon: Bookmark },
  { action: 'history', label: 'Lịch sử', icon: History },
  { action: 'downloads', label: 'Tải xuống', icon: Download },
  { action: 'addons', label: 'Site được hỗ trợ', icon: Puzzle },
  { action: 'stats', label: 'Thống kê đọc', icon: ChartColumn },
  { action: 'qr', label: 'Quét mã QR', icon: ScanQrCode },
  { action: 'settings', label: 'Cài đặt', icon: Settings },
];

export function BrowserMenu({
  visible,
  onClose,
  page,
  nav,
  bookmarked,
  desktop,
  blocked,
  adblockActive,
  addon,
  onAction,
}: {
  visible: boolean;
  onClose: () => void;
  page: { url: string; title: string } | null;
  nav: MenuNav;
  bookmarked: boolean;
  desktop: boolean;
  blocked: number;
  adblockActive: boolean;
  addon: AddonState;
  onAction: (action: MenuAction) => void;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const top = insets.top + space.xs;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Đóng menu" />
      <View
        style={[
          styles.menu,
          { top, maxHeight: height - top - insets.bottom - space.lg, backgroundColor: c.elevated },
        ]}
      >
        <View style={styles.navRow}>
          <NavButton icon={ArrowLeft} label="Lùi" disabled={!nav.canBack} onPress={() => onAction('back')} />
          <NavButton icon={ArrowRight} label="Tiến" disabled={!nav.canForward} onPress={() => onAction('forward')} />
          <NavButton
            icon={nav.loading ? X : RotateCw}
            label={nav.loading ? 'Dừng tải' : 'Tải lại'}
            disabled={!page}
            onPress={() => onAction(nav.loading ? 'stop' : 'reload')}
          />
          <NavButton icon={House} label="Trang chủ" disabled={nav.atHome} onPress={() => onAction('home')} />
          <NavButton
            icon={Star}
            label={bookmarked ? 'Sửa bookmark' : 'Bookmark trang này'}
            disabled={!page}
            filled={bookmarked}
            onPress={() => onAction('bookmarkPage')}
          />
        </View>
        <Divider />

        <ScrollView style={styles.list} bounces={false}>
          <MenuItem icon={Plus} label="Tab mới" onPress={() => onAction('newTab')} />
          <MenuItem icon={VenetianMask} label="Tab ẩn danh mới" onPress={() => onAction('newIncognitoTab')} />
          <Divider />

          {page && (
            <>
              <MenuItem
                icon={Puzzle}
                iconColor={addon ? c.addon : undefined}
                label={addon === 'detected' ? 'Thêm site được hỗ trợ' : 'Chạy addon'}
                onPress={() => onAction('runAddon')}
              />
              <MenuItem icon={Search} label="Tìm trong trang" onPress={() => onAction('find')} />
              <MenuItem
                icon={Monitor}
                label="Trang cho máy tính"
                onPress={() => onAction('desktop')}
                right={
                  <Switch
                    value={desktop}
                    onValueChange={() => onAction('desktop')}
                    trackColor={{ true: c.accent, false: c.border }}
                    thumbColor={Platform.OS === 'android' ? c.surface : undefined}
                  />
                }
              />
              <MenuItem icon={Share2} label="Chia sẻ link" onPress={() => onAction('share')} />
              <MenuItem icon={ExternalLink} label="Mở bằng ứng dụng khác" onPress={() => onAction('openExternal')} />
              <MenuItem icon={Save} label="Lưu trang" onPress={() => onAction('savePage')} />
              <MenuItem icon={Film} label="Tải video trên trang" onPress={() => onAction('findMedia')} />
              <MenuItem icon={CodeXml} label="Xem mã nguồn" onPress={() => onAction('viewSource')} />
              <MenuItem
                icon={adblockActive ? ShieldCheck : ShieldOff}
                iconColor={adblockActive ? c.accent : undefined}
                label="Chặn quảng cáo"
                onPress={() => onAction('adblock')}
                right={
                  <Text style={[font.caption, { color: c.muted }]}>{adblockActive ? `${blocked} đã chặn` : 'Tắt'}</Text>
                }
              />
              <MenuItem icon={Cookie} label="Xoá cookie & dữ liệu trang" onPress={() => onAction('clearSiteData')} />
              <Divider />
            </>
          )}

          {APP_ITEMS.map(item => (
            <MenuItem key={item.action} icon={item.icon} label={item.label} onPress={() => onAction(item.action)} />
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

function NavButton({
  icon: Icon,
  label,
  disabled,
  filled,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
  filled?: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  const color = filled ? c.accent : c.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{ color: c.border, borderless: true, radius: 22 }}
      style={[styles.navButton, disabled && styles.disabled]}
    >
      <Icon size={22} color={color} fill={filled ? color : 'transparent'} />
    </Pressable>
  );
}

function MenuItem({
  icon: Icon,
  iconColor,
  label,
  right,
  onPress,
}: {
  icon: LucideIcon;
  iconColor?: string;
  label: string;
  right?: ReactNode;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: c.border }}
      style={({ pressed }) => [styles.item, pressed && Platform.OS !== 'android' && styles.pressed]}
    >
      <Icon size={20} color={iconColor ?? c.textSecondary} />
      <Text numberOfLines={1} style={[font.body, styles.flex, { color: c.text }]}>
        {label}
      </Text>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.6 },
  menu: {
    position: 'absolute',
    right: space.xs,
    width: 272,
    borderRadius: radius.sm,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: space.xs,
  },
  navButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  list: { flexGrow: 0, flexShrink: 1 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 48,
    paddingLeft: space.lg,
    paddingRight: space.md,
  },
});
