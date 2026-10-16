import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppNavigation } from '../app/routes';
import { skipAddonPrompt } from '../features/browser/addonPromptSkip';
import { useBrowser } from '../store/useBrowser';
import { font, space, useTheme } from '../theme';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Download,
  ExternalLink,
  Film,
  Globe,
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
  Star,
  VenetianMask,
  X,
  type LucideIcon,
} from './icons';
import { Divider } from './ui';

export type DrawerAction =
  | 'back'
  | 'forward'
  | 'reload'
  | 'stop'
  | 'bookmarkPage'
  | 'share'
  | 'openWeb'
  | 'home'
  | 'newTab'
  | 'newIncognitoTab'
  | 'qr'
  | 'savePage'
  | 'find'
  | 'findMedia'
  | 'openExternal'
  | 'history'
  | 'bookmarks'
  | 'downloads'
  | 'addons'
  | 'desktop'
  | 'settings';

export type DrawerNav = {
  canBack: boolean;
  canForward: boolean;
  canReload: boolean;
  loading?: boolean;
  canBookmark: boolean;
  bookmarked?: boolean;
  canShare: boolean;
};

export function useAppDrawerActions(url?: string): (action: DrawerAction) => void {
  const navigation = useAppNavigation();
  return action => {
    const store = useBrowser.getState();
    switch (action) {
      case 'back':
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
        return;
      case 'share':
        if (url) {
          Share.share({ message: url }).catch(() => {});
        }
        return;
      case 'openWeb':
        if (url) {
          skipAddonPrompt(url);
          store.openUrl(url);
          navigation.popTo('Browser');
        }
        return;
      case 'newTab':
        store.newTab();
        navigation.popTo('Browser');
        return;
      case 'newIncognitoTab':
        store.newTab('', { incognito: true });
        navigation.popTo('Browser');
        return;
      case 'qr':
        navigation.navigate('QRScanner');
        return;
      case 'history':
        navigation.navigate('History');
        return;
      case 'bookmarks':
        navigation.navigate('Bookmarks');
        return;
      case 'downloads':
        navigation.navigate('Downloads');
        return;
      case 'addons':
        navigation.navigate('AddonManager');
        return;
      case 'settings':
        navigation.navigate('Settings');
        return;
    }
  };
}

export function AppDrawer({
  visible,
  onClose,
  nav,
  page,
  showOriginal,
  onAction,
}: {
  visible: boolean;
  onClose: () => void;
  nav: DrawerNav;
  page?: { desktop: boolean } | null;
  showOriginal?: boolean;
  onAction: (action: DrawerAction) => void;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const width = Math.min(340, Math.max(Math.round(screenWidth * 0.66), 264), screenWidth - 56);
  const [mounted, setMounted] = useState(visible);
  const offset = useRef(new Animated.Value(-width)).current;
  const latest = useRef({ width, onClose });
  latest.current = { width, onClose };

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(offset, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(offset, {
        toValue: -latest.current.width,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => finished && setMounted(false));
    }
  }, [visible, offset]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) => g.dx < -10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => offset.setValue(Math.min(0, g.dx)),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -latest.current.width / 3 || g.vx < -0.5) {
          latest.current.onClose();
        } else {
          Animated.spring(offset, { toValue: 0, bounciness: 0, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () =>
        Animated.spring(offset, { toValue: 0, bounciness: 0, useNativeDriver: true }).start(),
    }),
  ).current;

  const scrim = offset.interpolate({ inputRange: [-width, 0], outputRange: [0, 1], extrapolate: 'clamp' });
  const run = (action: DrawerAction) => () => {
    onClose();
    onAction(action);
  };

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.backdrop, opacity: scrim }]}>
        <Pressable style={styles.flex} onPress={onClose} accessibilityLabel="Đóng menu" />
      </Animated.View>
      <Animated.View
        {...pan.panHandlers}
        accessibilityViewIsModal
        style={[
          styles.drawer,
          {
            width,
            paddingTop: insets.top + space.xs,
            paddingBottom: insets.bottom,
            backgroundColor: c.surface,
            transform: [{ translateX: offset }],
          },
        ]}
      >
        <View style={styles.navRow}>
          <NavButton icon={ArrowLeft} label="Lùi" disabled={!nav.canBack} onPress={run('back')} />
          <NavButton icon={ArrowRight} label="Tiến" disabled={!nav.canForward} onPress={run('forward')} />
          <NavButton
            icon={Star}
            label={nav.bookmarked ? 'Sửa bookmark' : 'Bookmark trang này'}
            disabled={!nav.canBookmark}
            filled={nav.bookmarked}
            onPress={run('bookmarkPage')}
          />
          <NavButton icon={Share2} label="Chia sẻ link" disabled={!nav.canShare} onPress={run('share')} />
          <NavButton
            icon={nav.loading ? X : RotateCw}
            label={nav.loading ? 'Dừng tải' : 'Tải lại'}
            disabled={!nav.canReload}
            onPress={run(nav.loading ? 'stop' : 'reload')}
          />
        </View>
        <Divider />

        <ScrollView style={styles.flex} contentContainerStyle={styles.list} bounces={false}>
          {showOriginal && <DrawerItem icon={Globe} label="Xem trang web gốc" onPress={run('openWeb')} />}
          {page && <DrawerItem icon={House} label="Trang chủ" onPress={run('home')} />}
          <DrawerItem icon={Plus} label="Tab mới" onPress={run('newTab')} />
          <DrawerItem icon={VenetianMask} label="Tab ẩn danh mới" onPress={run('newIncognitoTab')} />
          <DrawerItem icon={ScanQrCode} label="Quét mã QR" onPress={run('qr')} />
          {page && (
            <>
              <DrawerItem icon={Save} label="Lưu trang" onPress={run('savePage')} />
              <DrawerItem icon={Search} label="Tìm trong trang" onPress={run('find')} />
              <DrawerItem icon={Film} label="Tải video trên trang" onPress={run('findMedia')} />
              <DrawerItem icon={ExternalLink} label="Mở bằng ứng dụng khác" onPress={run('openExternal')} />
            </>
          )}
          <DrawerItem icon={History} label="Lịch sử" onPress={run('history')} />
          <DrawerItem icon={Bookmark} label="Bookmark" onPress={run('bookmarks')} />
          <DrawerItem icon={Download} label="Tải xuống" onPress={run('downloads')} />
          <DrawerItem icon={Puzzle} label="Add-ons" onPress={run('addons')} />
          {page && (
            <DrawerItem
              icon={Monitor}
              label="Trang cho máy tính"
              onPress={run('desktop')}
              right={
                <Switch
                  value={page.desktop}
                  onValueChange={run('desktop')}
                  trackColor={{ true: c.accent, false: c.border }}
                  thumbColor={Platform.OS === 'android' ? c.surface : undefined}
                />
              }
            />
          )}
          <DrawerItem icon={Settings} label="Cài đặt" onPress={run('settings')} />
        </ScrollView>
      </Animated.View>
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
      accessibilityState={{ disabled: !!disabled }}
      android_ripple={{ color: c.border, borderless: true, radius: 22 }}
      style={[styles.navButton, disabled && styles.disabled]}
    >
      <Icon size={24} color={color} fill={filled ? color : 'transparent'} />
    </Pressable>
  );
}

function DrawerItem({
  icon: Icon,
  label,
  right,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  right?: ReactNode;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      android_ripple={{ color: c.border }}
      style={({ pressed }) => [styles.item, pressed && Platform.OS !== 'android' && styles.pressed]}
    >
      <Icon size={22} color={c.textSecondary} />
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
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 2, height: 0 },
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: space.xs,
  },
  navButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  list: { paddingVertical: space.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xl,
    minHeight: 48,
    paddingLeft: space.lg + space.xs,
    paddingRight: space.md,
  },
});
