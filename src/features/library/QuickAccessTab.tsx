import Clipboard from '@react-native-clipboard/clipboard';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { openInBrowser, useAppNavigation } from '../../app/routes';
import { Favicon } from '../../components/Favicon';
import { Sheet } from '../../components/Sheet';
import { Copy, Pencil, Plus, RotateCcw, SquarePlus, Trash2, Zap } from '../../components/icons';
import { Button, EmptyState, ListItem, confirm, toast } from '../../components/ui';
import { displayUrl } from '../../lib/url';
import { useBrowser, type QuickAccessItem } from '../../store/useBrowser';
import { radius, space, useTheme } from '../../theme';
import { ShortcutDialog } from '../settings/ShortcutDialog';

export function QuickAccessTab() {
  const navigation = useAppNavigation();
  const { c } = useTheme();
  const items = useBrowser(s => s.quickAccess);
  const [menu, setMenu] = useState<QuickAccessItem | null>(null);
  const [editing, setEditing] = useState<QuickAccessItem | 'new' | null>(null);

  const open = (item: QuickAccessItem) => openInBrowser(navigation, item.url);

  const remove = async (item: QuickAccessItem) => {
    setMenu(null);
    const ok = await confirm('Xoá lối tắt', `Xoá “${item.title}” khỏi Truy cập nhanh?`, {
      confirmText: 'Xoá',
      destructive: true,
    });
    if (ok) {
      useBrowser.getState().removeQuickAccess(item.id);
    }
  };

  const reset = async () => {
    const ok = await confirm('Khôi phục lối tắt mặc định', 'Các lối tắt bạn đã thêm hoặc sửa sẽ bị thay thế.', {
      confirmText: 'Khôi phục',
      destructive: true,
    });
    if (ok) {
      useBrowser.getState().resetQuickAccess();
      toast('Đã khôi phục lối tắt mặc định');
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        {!items.length && (
          <EmptyState
            icon={Zap}
            title="Chưa có lối tắt"
            message="Thêm trang hay mở để vào nhanh từ đây và từ trang chủ trình duyệt."
            style={styles.empty}
          />
        )}
        <View style={styles.grid}>
          {items.map(item => (
            <Pressable
              key={item.id}
              onPress={() => open(item)}
              onLongPress={() => setMenu(item)}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              accessibilityHint="Nhấn giữ để sửa hoặc xoá"
              style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
            >
              <View style={[styles.tileIcon, { backgroundColor: c.surfaceAlt }]}>
                <Favicon url={item.url} label={item.title} size={30} />
              </View>
              <Text numberOfLines={1} style={[styles.tileLabel, { color: c.text }]}>
                {item.title}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setEditing('new')}
            accessibilityRole="button"
            accessibilityLabel="Thêm lối tắt"
            style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
          >
            <View style={[styles.tileIcon, styles.addTile, { borderColor: c.border }]}>
              <Plus size={26} color={c.accent} />
            </View>
            <Text numberOfLines={1} style={[styles.tileLabel, { color: c.muted }]}>
              Thêm
            </Text>
          </Pressable>
        </View>
        <Button title="Khôi phục mặc định" icon={RotateCcw} variant="ghost" small onPress={reset} style={styles.reset} />
      </ScrollView>

      <Sheet
        visible={menu !== null}
        onClose={() => setMenu(null)}
        title={menu?.title}
        subtitle={menu ? displayUrl(menu.url) : undefined}
      >
        {menu && (
          <>
            <ListItem
              title="Mở trong tab mới"
              icon={SquarePlus}
              onPress={() => {
                setMenu(null);
                open(menu);
              }}
            />
            <ListItem
              title="Sửa"
              icon={Pencil}
              onPress={() => {
                setMenu(null);
                setEditing(menu);
              }}
            />
            <ListItem
              title="Sao chép địa chỉ"
              icon={Copy}
              onPress={() => {
                Clipboard.setString(menu.url);
                setMenu(null);
                toast('Đã sao chép địa chỉ');
              }}
            />
            <ListItem title="Xoá" icon={Trash2} destructive onPress={() => remove(menu)} />
          </>
        )}
      </Sheet>

      <ShortcutDialog
        visible={editing !== null}
        item={editing === 'new' || editing === null ? undefined : editing}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.sm, paddingVertical: space.md, paddingBottom: space.xl },
  empty: { flex: 0, paddingBottom: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: { width: '25%', alignItems: 'center', gap: 6, paddingVertical: space.md },
  pressed: { opacity: 0.7 },
  tileIcon: {
    width: 58,
    height: 58,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: { borderWidth: 1.5, borderStyle: 'dashed' },
  tileLabel: { fontSize: 12.5, maxWidth: 84, textAlign: 'center' },
  reset: { alignSelf: 'center', marginTop: space.lg },
});
