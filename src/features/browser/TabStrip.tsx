import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';

import { Favicon } from '../../components/Favicon';
import { Plus, X } from '../../components/icons';
import { IconButton } from '../../components/ui';
import { displayUrl } from '../../lib/url';
import { useBrowser, type BrowserTab } from '../../store/useBrowser';
import { space, useTheme } from '../../theme';
import { withAlpha } from './hooks';

const TAB_WIDTH = 200;

function tabLabel(tab: BrowserTab): string {
  if (tab.showHome || !tab.url) {
    return tab.incognito ? 'Tab ẩn danh' : 'Tab mới';
  }
  return tab.title || displayUrl(tab.url);
}

/**
 * Dải tab ngang dưới thanh địa chỉ trên màn rộng (tablet), như app gốc:
 * mỗi tab [× tiêu đề], tab đang mở liền màu với trang, nút + ở cuối.
 * Chỉ hiện tab cùng loại (thường/ẩn danh) với tab đang mở.
 */
export function TabStrip({ activeTab, onNewTab }: { activeTab: BrowserTab; onNewTab: () => void }) {
  const { c } = useTheme();
  const tabs = useBrowser(s => s.tabs);
  const list = tabs.filter(t => t.incognito === activeTab.incognito);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const activeIndex = list.findIndex(t => t.id === activeTab.id);

  const bg = activeTab.incognito ? c.incognito : c.appBar;
  const fg = activeTab.incognito ? c.onIncognito : c.onAppBar;

  // Tab mới/đổi tab: cuộn cho tab đang mở lọt vào khung nhìn.
  useEffect(() => {
    if (activeIndex >= 0) {
      scrollRef.current?.scrollTo({
        x: Math.max(0, (activeIndex - 1) * TAB_WIDTH),
        animated: true,
      });
    }
  }, [activeIndex]);

  return (
    <View style={[styles.strip, { backgroundColor: withAlpha(bg, 0.92), borderBottomColor: c.border }]}>
      <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} style={styles.flex}>
        {list.map(tab => {
          const active = tab.id === activeTab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => useBrowser.getState().activateTab(tab.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tabLabel(tab)}
              style={[styles.tab, { borderRightColor: withAlpha(fg, 0.15) }, active && { backgroundColor: c.bg }]}
            >
              <Pressable
                onPress={() => useBrowser.getState().closeTab(tab.id)}
                hitSlop={6}
                accessibilityLabel={`Đóng ${tabLabel(tab)}`}
                style={styles.close}
              >
                <X size={16} color={active ? c.text : fg} />
              </Pressable>
              {!tab.showHome && !!tab.url && <Favicon url={tab.url} label={tab.title} size={14} />}
              <Text numberOfLines={1} style={[styles.title, { color: active ? c.text : withAlpha(fg, 0.85) }]}>
                {tabLabel(tab)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <IconButton icon={Plus} size={20} color={fg} onPress={onNewTab} accessibilityLabel="Tab mới" />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    width: TAB_WIDTH,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    paddingHorizontal: space.sm,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  close: { padding: 2 },
  title: { flex: 1, fontSize: 12 },
});
