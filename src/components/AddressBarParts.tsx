import { useState, type ComponentRef, type Ref } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppNavigation } from '../app/routes';
import { displayUrl } from '../lib/url';
import { useActiveTab, useBrowser } from '../store/useBrowser';
import { radius, space, useTheme } from '../theme';
import { Sheet } from './Sheet';
import {
  Bookmark,
  Download,
  EllipsisVertical,
  Globe,
  History,
  Plus,
  Puzzle,
  ScanQrCode,
  Settings,
} from './icons';
import { IconButton, ListItem } from './ui';


export function PuzzleButton({
  active,
  busy,
  onPress,
  ref,
  accessibilityLabel,
}: {
  active: boolean;
  busy?: boolean;
  onPress?: () => void;
  ref?: Ref<ComponentRef<typeof View>>;
  accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  return (
    <View ref={ref} collapsable={false}>
      <Pressable
        onPress={onPress}
        disabled={busy || !onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? 'Addon'}
        style={({ pressed }) => [styles.puzzle, { backgroundColor: c.appBarField, opacity: pressed ? 0.7 : 1 }]}
      >
        {busy ? (
          <ActivityIndicator size="small" color={c.addon} />
        ) : (
          <Puzzle
            size={22}
            color={active ? c.addon : c.muted}
            fill={active ? c.addon : 'transparent'}
            strokeWidth={active ? 1.5 : 2}
          />
        )}
      </Pressable>
    </View>
  );
}

export function TabCountButton({
  count,
  incognito,
  onPress,
  onLongPress,
  ref,
}: {
  count: number;
  incognito?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  ref?: Ref<ComponentRef<typeof View>>;
}) {
  const { c } = useTheme();
  const fg = incognito ? c.onIncognito : c.onAppBar;
  return (
    <View ref={ref} collapsable={false}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`${count} tab${incognito ? ' ẩn danh' : ''}`}
        android_ripple={{ color: c.border, borderless: true, radius: 22 }}
        style={styles.tabButton}
      >
        <View style={[styles.tabBox, { borderColor: fg }]}>
          <Text style={[styles.tabCount, { color: fg }]}>{count > 99 ? ':D' : count}</Text>
        </View>
      </Pressable>
    </View>
  );
}

export function AddonBar({ url, onMenu }: { url: string; onMenu?: () => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const tab = useActiveTab();
  const tabCount = useBrowser(s => s.tabs.reduce((n, t) => (t.incognito === tab.incognito ? n + 1 : n), 0));
  const [menu, setMenu] = useState(false);

  const openWeb = () => {
    useBrowser.getState().openUrl(url);
    navigation.popTo('Browser');
  };
  const go = (action: () => void) => {
    setMenu(false);
    action();
  };

  return (
    <View style={{ paddingTop: insets.top, backgroundColor: tab.incognito ? c.incognito : c.appBar }}>
      <View style={styles.bar}>
        <PuzzleButton active onPress={openWeb} accessibilityLabel="Xem trang web gốc" />
        <Pressable
          onPress={openWeb}
          accessibilityRole="button"
          accessibilityLabel={`Mở ${url} trên trình duyệt`}
          style={[styles.field, { backgroundColor: c.appBarField }]}
        >
          <Text numberOfLines={1} style={[styles.url, { color: tab.incognito ? c.onIncognito : c.onAppBar }]}>
            {url}
          </Text>
          <IconButton
            icon={ScanQrCode}
            size={20}
            color={tab.incognito ? c.onIncognito : c.onAppBar}
            onPress={() => navigation.navigate('QRScanner')}
            accessibilityLabel="Quét mã QR"
            style={styles.qr}
          />
        </Pressable>
        <TabCountButton count={tabCount} incognito={tab.incognito} onPress={() => navigation.navigate('Tabs')} />
        <IconButton
          icon={EllipsisVertical}
          color={tab.incognito ? c.onIncognito : c.onAppBar}
          onPress={onMenu ?? (() => setMenu(true))}
          accessibilityLabel="Menu"
        />
      </View>
      {!onMenu && (
        <Sheet visible={menu} onClose={() => setMenu(false)} title={displayUrl(url)}>
          <ListItem icon={Globe} title="Xem trang web gốc" onPress={() => go(openWeb)} />
          <ListItem
            icon={Plus}
            title="Tab mới"
            onPress={() =>
              go(() => {
                useBrowser.getState().newTab();
                navigation.popTo('Browser');
              })
            }
          />
          <ListItem icon={Bookmark} title="Bookmark" onPress={() => go(() => navigation.navigate('Bookmarks'))} />
          <ListItem icon={History} title="Lịch sử" onPress={() => go(() => navigation.navigate('History'))} />
          <ListItem icon={Download} title="Tải xuống" onPress={() => go(() => navigation.navigate('Downloads'))} />
          <ListItem icon={Puzzle} title="Site được hỗ trợ" onPress={() => go(() => navigation.navigate('Addons'))} />
          <ListItem icon={Settings} title="Cài đặt" onPress={() => go(() => navigation.navigate('Settings'))} />
        </Sheet>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    height: 60,
  },
  puzzle: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: radius.md,
    paddingLeft: space.md,
  },
  url: { flex: 1, fontSize: 15 },
  qr: { width: 40, height: 40 },
  tabButton: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  tabBox: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 3,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabCount: { fontSize: 12, fontWeight: '700' },
});
