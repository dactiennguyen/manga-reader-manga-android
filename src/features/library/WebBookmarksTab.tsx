import Clipboard from '@react-native-clipboard/clipboard';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { openInBrowser, useAppNavigation } from '../../app/routes';
import { Dialog, Sheet } from '../../components/Sheet';
import { Bookmark, Copy, EllipsisVertical, Pencil, SearchX, SquarePlus, Trash2 } from '../../components/icons';
import {
  EmptyState,
  FieldLabel,
  IconButton,
  ListItem,
  SearchField,
  TextField,
  confirm,
  toast,
} from '../../components/ui';
import { formatDate } from '../../lib/time';
import { displayUrl, ensureScheme, looksLikeUrl } from '../../lib/url';
import { useBrowser, type WebBookmark } from '../../store/useBrowser';
import { font, space, useTheme } from '../../theme';
import { Favicon } from '../../components/Favicon';

function WebBookmarkRowBase({
  item,
  onOpen,
  onMenu,
}: {
  item: WebBookmark;
  onOpen: (item: WebBookmark) => void;
  onMenu: (item: WebBookmark) => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => onOpen(item)}
      onLongPress={() => onMenu(item)}
      android_ripple={{ color: c.border }}
      style={styles.row}
    >
      <Favicon url={item.url} size={36} tile />
      <View style={styles.body}>
        <Text numberOfLines={1} style={[font.body, { color: c.text }]}>
          {item.title || displayUrl(item.url)}
        </Text>
        <Text numberOfLines={1} style={[font.caption, { color: c.muted }]}>
          {displayUrl(item.url)}
        </Text>
      </View>
      <IconButton
        icon={EllipsisVertical}
        size={18}
        color={c.muted}
        onPress={() => onMenu(item)}
        accessibilityLabel="Tuỳ chọn"
      />
    </Pressable>
  );
}

const WebBookmarkRow = memo(WebBookmarkRowBase);

/** Trang web đã đánh dấu ("Bookmarked Page"). */
export function WebBookmarksTab() {
  const navigation = useAppNavigation();
  const { webBookmarks, updateWebBookmark, removeWebBookmarks } = useBrowser(
    useShallow(s => ({
      webBookmarks: s.webBookmarks,
      updateWebBookmark: s.updateWebBookmark,
      removeWebBookmarks: s.removeWebBookmarks,
    })),
  );
  const [query, setQuery] = useState('');
  const [menu, setMenu] = useState<WebBookmark | null>(null);
  const [editing, setEditing] = useState<WebBookmark | null>(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? webBookmarks.filter(b => b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q))
      : webBookmarks;
  }, [webBookmarks, query]);

  const open = useCallback((item: WebBookmark) => openInBrowser(navigation, item.url), [navigation]);
  const showMenu = useCallback((item: WebBookmark) => setMenu(item), []);

  const startEdit = (item: WebBookmark) => {
    setMenu(null);
    setTitle(item.title);
    setUrl(item.url);
    setEditing(item);
  };

  const saveEdit = () => {
    if (!editing) {
      return;
    }
    if (!looksLikeUrl(url.trim())) {
      toast('Địa chỉ trang web không hợp lệ');
      return;
    }
    updateWebBookmark(editing.id, { title: title.trim(), url: ensureScheme(url.trim()) });
    setEditing(null);
  };

  const remove = async (item: WebBookmark) => {
    setMenu(null);
    const ok = await confirm('Xoá đánh dấu', `Xoá “${item.title || displayUrl(item.url)}” khỏi trang đã đánh dấu?`, {
      confirmText: 'Xoá',
      destructive: true,
    });
    if (ok) {
      removeWebBookmarks([item.id]);
    }
  };

  if (!webBookmarks.length) {
    return (
      <EmptyState
        icon={Bookmark}
        title="Chưa có trang đánh dấu"
        message="Bạn chưa đánh dấu trang web nào. Mở một trang trong trình duyệt rồi chọn “Đánh dấu trang” trong menu để lưu vào đây."
      />
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.search}>
        <SearchField
          value={query}
          onChangeText={setQuery}
          onClear={() => setQuery('')}
          placeholder="Lọc theo tiêu đề, địa chỉ…"
        />
      </View>
      {items.length ? (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <WebBookmarkRow item={item} onOpen={open} onMenu={showMenu} />}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
        />
      ) : (
        <EmptyState icon={SearchX} title="Không tìm thấy kết quả" message="Thử từ khoá khác." />
      )}

      <Sheet
        visible={menu !== null}
        onClose={() => setMenu(null)}
        title={menu?.title || (menu ? displayUrl(menu.url) : undefined)}
        subtitle={menu ? `Đánh dấu ngày ${formatDate(menu.addedAt)}` : undefined}
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
            <ListItem title="Sửa" icon={Pencil} onPress={() => startEdit(menu)} />
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

      <Dialog
        visible={editing !== null}
        onClose={() => setEditing(null)}
        title="Sửa trang đánh dấu"
        actions={[
          { label: 'Huỷ', onPress: () => setEditing(null) },
          { label: 'Lưu', variant: 'primary', onPress: saveEdit, disabled: !url.trim() },
        ]}
      >
        <View>
          <FieldLabel>Tiêu đề</FieldLabel>
          <TextField value={title} onChangeText={setTitle} placeholder="Tiêu đề trang" />
          <FieldLabel>Địa chỉ</FieldLabel>
          <TextField
            value={url}
            onChangeText={setUrl}
            placeholder="https://…"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            onSubmitEditing={saveEdit}
          />
        </View>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  search: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xs },
  list: { paddingBottom: space.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.lg,
    paddingRight: space.xs,
    minHeight: 62,
  },
  body: { flex: 1, gap: 2 },
});
