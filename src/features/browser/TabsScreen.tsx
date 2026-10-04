import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useAppNavigation } from '../../app/routes';
import { Sheet } from '../../components/Sheet';
import { BookOpen, EllipsisVertical, House, Layers, Plus, VenetianMask, X } from '../../components/icons';
import { EmptyState, Header, IconButton, ListItem, Screen, Segmented, confirm } from '../../components/ui';
import { formatRelative } from '../../lib/time';
import { displayUrl } from '../../lib/url';
import { useBrowser, type BrowserTab } from '../../store/useBrowser';
import { font, radius, space, useTheme } from '../../theme';
import { Favicon } from '../../components/Favicon';

type Mode = 'normal' | 'incognito';

/** Danh sách tab (thường + ẩn danh). */
export function TabsScreen() {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const { width } = useWindowDimensions();
  const tabs = useBrowser(s => s.tabs);
  const activeTabId = useBrowser(s => s.activeTabId);
  const [mode, setMode] = useState<Mode>(() => {
    const state = useBrowser.getState();
    return state.tabs.find(t => t.id === state.activeTabId)?.incognito ? 'incognito' : 'normal';
  });
  const [menuOpen, setMenuOpen] = useState(false);

  const incognito = mode === 'incognito';
  const list = tabs.filter(t => t.incognito === incognito);
  const normalCount = tabs.filter(t => !t.incognito).length;
  const columns = width >= 600 ? 3 : 2;
  const cardWidth = Math.floor((width - space.md * (columns + 1)) / columns);

  const openTab = (id: string) => {
    useBrowser.getState().activateTab(id);
    navigation.goBack();
  };

  const openNew = (asIncognito: boolean) => {
    setMenuOpen(false);
    useBrowser.getState().newTab('', { incognito: asIncognito });
    navigation.goBack();
  };

  const newTab = () => openNew(incognito);

  const closeAll = async (closeIncognito: boolean) => {
    setMenuOpen(false);
    const ok = await confirm(
      closeIncognito ? 'Đóng tất cả tab ẩn danh?' : 'Đóng tất cả tab?',
      undefined,
      { confirmText: 'Đóng', destructive: true },
    );
    if (ok) {
      useBrowser.getState().closeAllTabs(closeIncognito);
    }
  };

  return (
    <Screen>
      <Header
        title="Tab"
        right={
          <>
            <IconButton
              icon={Plus}
              color={c.onAppBar}
              onPress={newTab}
              accessibilityLabel={incognito ? 'Tab ẩn danh mới' : 'Tab mới'}
            />
            <IconButton
              icon={EllipsisVertical}
              color={c.onAppBar}
              onPress={() => setMenuOpen(true)}
              accessibilityLabel="Tuỳ chọn"
            />
          </>
        }
      />
      <View style={styles.segment}>
        <Segmented
          options={[
            { value: 'normal', label: `Tab (${normalCount})` },
            { value: 'incognito', label: `Ẩn danh (${tabs.length - normalCount})` },
          ]}
          value={mode}
          onChange={setMode}
        />
      </View>

      {list.length ? (
        <FlatList
          key={columns}
          data={list}
          numColumns={columns}
          keyExtractor={t => t.id}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.column}
          renderItem={({ item }) => (
            <TabCard
              tab={item}
              active={item.id === activeTabId}
              width={cardWidth}
              onPress={() => openTab(item.id)}
              onClose={() => useBrowser.getState().closeTab(item.id)}
            />
          )}
        />
      ) : (
        <EmptyState
          icon={incognito ? VenetianMask : Layers}
          title={incognito ? 'Các tab ẩn danh sẽ hiện ở đây' : 'Các tab đang mở sẽ hiện ở đây'}
          message={
            incognito
              ? 'Tab ẩn danh không lưu lịch sử duyệt web và từ khoá tìm kiếm, và sẽ đóng khi bạn thoát app.'
              : undefined
          }
          action={{ label: incognito ? 'Mở tab ẩn danh mới' : 'Mở tab mới', icon: Plus, onPress: newTab }}
        />
      )}

      <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)}>
        <ListItem icon={Plus} title="Tab mới" onPress={() => openNew(false)} />
        <ListItem icon={VenetianMask} title="Tab ẩn danh mới" onPress={() => openNew(true)} />
        <ListItem icon={X} title="Đóng tất cả tab" destructive onPress={() => closeAll(false)} />
        <ListItem
          icon={X}
          title="Đóng tất cả tab ẩn danh"
          destructive
          disabled={normalCount === tabs.length}
          onPress={() => closeAll(true)}
        />
      </Sheet>
    </Screen>
  );
}

/** Thẻ một tab trong lưới. */
function TabCard({
  tab,
  active,
  width,
  onPress,
  onClose,
}: {
  tab: BrowserTab;
  active: boolean;
  width: number;
  onPress: () => void;
  onClose: () => void;
}) {
  const { c } = useTheme();
  const home = tab.showHome || !tab.url;
  const title = home ? 'Trang chủ' : tab.title || displayUrl(tab.url);
  const headerFg = active ? c.onPrimaryContainer : c.text;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          width,
          backgroundColor: c.surface,
          borderColor: active ? c.accent : c.border,
          opacity: pressed ? 0.85 : 1,
        },
        active && styles.cardActive,
      ]}
    >
      <View style={[styles.cardHeader, active && { backgroundColor: c.primaryContainer }]}>
        {home ? <House size={16} color={headerFg} /> : <Favicon url={tab.url} label={title} size={16} />}
        <Text numberOfLines={1} style={[font.caption, styles.cardTitle, { color: headerFg }]}>
          {title}
        </Text>
        <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Đóng tab" style={styles.close}>
          <X size={16} color={active ? c.onPrimaryContainer : c.muted} />
        </Pressable>
      </View>
      <View style={[styles.preview, { backgroundColor: tab.incognito ? c.incognito : c.surfaceAlt }]}>
        {home ? (
          <BookOpen size={30} color={tab.incognito ? c.onIncognito : c.muted} />
        ) : (
          <Favicon url={tab.url} label={title} size={40} />
        )}
        <Text
          numberOfLines={2}
          style={[styles.previewText, { color: tab.incognito ? c.onIncognito : c.muted }]}
        >
          {home ? 'Manga Reader' : displayUrl(tab.url)}
        </Text>
        <Text style={[styles.time, { color: tab.incognito ? c.onIncognito : c.muted }]}>
          {formatRelative(tab.lastActiveAt)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  segment: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm },
  list: { paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: space.xl, gap: space.md },
  column: { gap: space.md },
  card: { borderRadius: radius.lg + 2, borderWidth: 1, overflow: 'hidden' },
  cardActive: { borderWidth: 2 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  cardTitle: { flex: 1, fontWeight: '600' },
  close: { padding: 2 },
  preview: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
  },
  previewText: { fontSize: 12, textAlign: 'center' },
  time: { fontSize: 10, opacity: 0.8 },
});
