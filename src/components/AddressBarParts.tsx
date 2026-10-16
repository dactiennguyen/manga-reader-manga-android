import { useState, type ComponentRef, type Ref } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppNavigation } from '../app/routes';
import { useActiveTab, useBrowser } from '../store/useBrowser';
import { radius, space, useTheme } from '../theme';
import { AppDrawer, useAppDrawerActions } from './AppDrawer';
import { EllipsisVertical, Menu, Puzzle } from './icons';
import { IconButton } from './ui';

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
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? 'Addon'}
        android_ripple={{ color: c.border, borderless: true, radius: 20 }}
        style={({ pressed }) => [styles.puzzle, { opacity: pressed ? 0.7 : 1 }]}
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

export function TabCountBox({ count, color }: { count: number; color: string }) {
  return (
    <View style={[styles.tabBox, { borderColor: color }]}>
      <Text style={[styles.tabCount, { color }]}>{count > 99 ? ':D' : count}</Text>
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
        <TabCountBox count={count} color={incognito ? c.onIncognito : c.onAppBar} />
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
  const [drawer, setDrawer] = useState(false);
  const onDrawerAction = useAppDrawerActions(url);
  const fg = tab.incognito ? c.onIncognito : c.onAppBar;

  const openWeb = () => onDrawerAction('openWeb');

  return (
    <View style={{ paddingTop: insets.top, backgroundColor: tab.incognito ? c.incognito : c.appBar }}>
      <View style={styles.bar}>
        <IconButton icon={Menu} color={fg} onPress={() => setDrawer(true)} accessibilityLabel="Menu" />
        <View style={[styles.field, { backgroundColor: c.appBarField }]}>
          <PuzzleButton active onPress={openWeb} accessibilityLabel="Xem trang web gốc" />
          <Pressable
            onPress={openWeb}
            accessibilityRole="button"
            accessibilityLabel={`Mở ${url} trên trình duyệt`}
            style={styles.urlButton}
          >
            <Text numberOfLines={1} style={[styles.url, { color: fg }]}>
              {url}
            </Text>
          </Pressable>
        </View>
        <TabCountButton count={tabCount} incognito={tab.incognito} onPress={() => navigation.navigate('Tabs')} />
        {onMenu && <IconButton icon={EllipsisVertical} color={fg} onPress={onMenu} accessibilityLabel="Tuỳ chọn" />}
      </View>
      <AppDrawer
        visible={drawer}
        onClose={() => setDrawer(false)}
        nav={{
          canBack: navigation.canGoBack(),
          canForward: false,
          canReload: false,
          canBookmark: false,
          canShare: !!url,
        }}
        showOriginal={!!url}
        onAction={onDrawerAction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.xs,
    height: 60,
  },
  puzzle: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: radius.pill,
    paddingLeft: space.xs,
    paddingRight: space.md,
  },
  urlButton: { flex: 1, height: 44, justifyContent: 'center', paddingLeft: space.xs },
  url: { fontSize: 15 },
  tabButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
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
