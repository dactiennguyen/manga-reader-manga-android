import {
  BookOpen,
  CheckCheck,
  FolderInput,
  ListChecks,
  Plus,
  Puzzle,
  RefreshCw,
  Search,
  SearchX,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { useAppNavigation } from '../../app/routes';
import {
  Button,
  Chip,
  ChipRow,
  EmptyState,
  IconButton,
  SearchField,
  Segmented,
  confirm,
  toast,
  ProgressBar,
} from '../../components/ui';
import { getEngine } from '../../sources';
import { getCachedChapters } from '../../sources/cache';
import type { ContentType } from '../../sources/types';
import { markChaptersRead } from '../../store/progress';
import { sortBookmarks, useLibrary, type Bookmark } from '../../store/useLibrary';
import { useAllowNsfw, useSettings } from '../../store/useSettings';
import { useSources } from '../../store/useSources';
import { font, space, useTheme } from '../../theme';
import { BookmarkGrid } from './BookmarkGrid';
import { EditGroupDialog, GroupSheet, NewGroupDialog } from './GroupSheet';
import { runLibraryUpdateCheck } from './runUpdateCheck';
import { refreshUnread, useUpdateCheck } from './updates';

type ContentFilter = 'all' | ContentType;

const CONTENT_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'manga', label: 'Truyện tranh' },
  { value: 'novel', label: 'Tiểu thuyết' },
] as const;

/** null = tất cả nhóm, '' = không nhóm. */
type GroupFilter = string | null;

export function MediaBookmarksTab() {
  const navigation = useAppNavigation();
  const { c } = useTheme();
  const { bookmarks, groups, sort, removeBookmarks, setGroup, updateBookmark } = useLibrary(
    useShallow(s => ({
      bookmarks: s.bookmarks,
      groups: s.groups,
      sort: s.sort,
      removeBookmarks: s.removeBookmarks,
      setGroup: s.setGroup,
      updateBookmark: s.updateBookmark,
    })),
  );
  const layout = useSettings(s => s.libraryLayout);
  const allowNsfw = useAllowNsfw();
  const sources = useSources(s => s.sources);
  const update = useUpdateCheck(useShallow(s => ({ running: s.running, done: s.done, total: s.total })));

  const [content, setContent] = useState<ContentFilter>('all');
  const [group, setGroupFilter] = useState<GroupFilter>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [groupSheet, setGroupSheet] = useState(false);
  const [newGroup, setNewGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);

  const all = useMemo(() => Object.values(bookmarks), [bookmarks]);
  const byContent = useMemo(
    () => (content === 'all' ? all : all.filter(b => b.content === content)),
    [all, content],
  );
  const activeGroup = group !== null && group !== '' && !groups.includes(group) ? null : group;

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of byContent) {
      counts[b.group] = (counts[b.group] ?? 0) + 1;
    }
    return counts;
  }, [byContent]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = byContent.filter(
      b => (activeGroup === null || b.group === activeGroup) && (!q || b.title.toLowerCase().includes(q)),
    );
    return sortBookmarks(list, sort);
  }, [byContent, activeGroup, query, sort]);

  const sourceInfo = useMemo(() => {
    const map: Record<string, { headers: Record<string, string>; name: string; nsfw: boolean }> = {};
    for (const src of sources) {
      map[src.id] = { headers: getEngine(src.engine).imageHeaders(src), name: src.name, nsfw: src.nsfw };
    }
    return map;
  }, [sources]);

  // Bỏ các mục đã bị xoá khỏi lựa chọn.
  const selectedKeys = useMemo(() => [...selected].filter(key => bookmarks[key]), [selected, bookmarks]);
  const selecting = selectedKeys.length > 0;
  const clearSelection = useCallback(() => setSelected(new Set()), []);

  useEffect(() => {
    if (!selecting) {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      clearSelection();
      return true;
    });
    return () => sub.remove();
  }, [selecting, clearSelection]);

  const toggle = useCallback((key: string) => {
    setSelected(current => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const onPress = useCallback(
    (bookmark: Bookmark) => {
      if (selecting) {
        toggle(bookmark.key);
        return;
      }
      navigation.navigate('MangaDetail', {
        sourceId: bookmark.sourceId,
        url: bookmark.url,
        title: bookmark.title,
        cover: bookmark.cover,
      });
    },
    [selecting, toggle, navigation],
  );

  const onLongPress = useCallback((bookmark: Bookmark) => toggle(bookmark.key), [toggle]);

  const refresh = useCallback(() => {
    runLibraryUpdateCheck();
  }, []);

  // ─── Hành động trên mục đã chọn ───
  const commonGroup = useMemo(() => {
    const set = new Set(selectedKeys.map(key => bookmarks[key].group));
    return set.size === 1 ? [...set][0] : undefined;
  }, [selectedKeys, bookmarks]);

  const moveToGroup = (target: string) => {
    setGroup(selectedKeys, target);
    toast(target ? `Đã chuyển ${selectedKeys.length} truyện vào “${target}”` : 'Đã bỏ nhóm các truyện đã chọn');
    clearSelection();
  };

  const markAllRead = async () => {
    const ok = await confirm(
      'Đánh dấu đã đọc hết',
      `Đánh dấu toàn bộ chương của ${selectedKeys.length} truyện là đã đọc?`,
      { confirmText: 'Đánh dấu' },
    );
    if (!ok) {
      return;
    }
    let done = 0;
    let missing = 0;
    for (const key of selectedKeys) {
      const chapters = getCachedChapters(key);
      if (!chapters.length) {
        missing++;
        continue;
      }
      markChaptersRead(
        key,
        chapters.map(ch => ch.url),
        true,
      );
      refreshUnread(key);
      updateBookmark(key, { newChapters: 0 });
      done++;
    }
    toast(
      missing
        ? `Đã đánh dấu ${done} truyện. ${missing} truyện chưa có danh sách chương — hãy mở truyện hoặc kiểm tra cập nhật trước.`
        : `Đã đánh dấu đã đọc ${done} truyện`,
    );
    clearSelection();
  };

  const checkSelected = () => {
    const keys = selectedKeys;
    clearSelection();
    runLibraryUpdateCheck(keys);
  };

  const removeSelected = async () => {
    const ok = await confirm('Xoá bookmark', 'Các bookmark đã chọn sẽ bị xoá.', {
      confirmText: 'Xoá',
      destructive: true,
    });
    if (ok) {
      removeBookmarks(selectedKeys);
      toast(`Đã xoá ${selectedKeys.length} bookmark`);
      clearSelection();
    }
  };

  // ─── Trống ───
  if (!all.length) {
    return (
      <View style={styles.flex}>
        <EmptyState
          icon={BookOpen}
          title="Chưa có bookmark"
          message="Bạn chưa bookmark truyện nào. Bấm nút bên dưới để bắt đầu thêm truyện."
          action={{ label: 'Tìm truyện', icon: Search, onPress: () => navigation.navigate('MangaSearch') }}
          style={styles.emptyFill}
        />
        <Button
          title="Xem nguồn"
          icon={Puzzle}
          variant="ghost"
          onPress={() => navigation.navigate('Addons')}
          style={styles.emptySecondary}
        />
      </View>
    );
  }

  const noGroupCount = groupCounts[''] ?? 0;

  return (
    <View style={styles.flex}>
      {selecting ? (
        <View style={[styles.selectionBar, { backgroundColor: c.accentSoft }]}>
          <IconButton icon={X} onPress={clearSelection} accessibilityLabel="Bỏ chọn" />
          <Text style={[font.label, styles.flex, { color: c.text }]}>Đã chọn {selectedKeys.length}</Text>
          <Button
            title={selectedKeys.length === items.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            icon={ListChecks}
            variant="ghost"
            small
            onPress={() =>
              setSelected(selectedKeys.length === items.length ? new Set() : new Set(items.map(b => b.key)))
            }
          />
        </View>
      ) : (
        <View style={styles.toolbar}>
          <SearchField
            value={query}
            onChangeText={setQuery}
            onClear={() => setQuery('')}
            placeholder="Lọc theo tên truyện"
          />
          <Segmented options={CONTENT_OPTIONS} value={content} onChange={setContent} />
        </View>
      )}

      <ChipRow>
        <Chip label="Tất cả" count={byContent.length} selected={activeGroup === null} onPress={() => setGroupFilter(null)} />
        {groups.map(name => (
          <Chip
            key={name}
            label={name}
            count={groupCounts[name] ?? 0}
            selected={activeGroup === name}
            onPress={() => setGroupFilter(name)}
            onLongPress={() => setEditingGroup(name)}
          />
        ))}
        {groups.length > 0 && (
          <Chip
            label="Không nhóm"
            count={noGroupCount}
            selected={activeGroup === ''}
            onPress={() => setGroupFilter('')}
          />
        )}
        <Chip label="Nhóm mới" icon={Plus} onPress={() => setNewGroup(true)} />
      </ChipRow>

      {update.running && (
        <View style={styles.progress}>
          <Text style={[font.caption, { color: c.textSecondary }]}>
            Đang kiểm tra {Math.min(update.done + 1, update.total)}/{update.total}…
          </Text>
          <ProgressBar value={update.total ? update.done / update.total : 0} color={c.accent} />
        </View>
      )}

      {items.length ? (
        <BookmarkGrid
          items={items}
          layout={layout}
          selected={selected}
          sourceInfo={sourceInfo}
          allowNsfw={allowNsfw}
          refreshing={update.running}
          onRefresh={refresh}
          onPress={onPress}
          onLongPress={onLongPress}
        />
      ) : (
        <EmptyState
          icon={SearchX}
          title="Không có truyện phù hợp"
          message={
            query.trim()
              ? 'Không có bookmark nào khớp với từ khoá.'
              : content === 'novel'
                ? 'Bạn chưa bookmark tiểu thuyết nào trong mục này.'
                : content === 'manga'
                  ? 'Bạn chưa bookmark truyện tranh nào trong mục này.'
                  : 'Nhóm này chưa có truyện. Nhấn giữ một truyện rồi chọn “Chuyển nhóm”.'
          }
        />
      )}

      {selecting && (
        <View style={[styles.actionBar, { backgroundColor: c.surface, borderTopColor: c.border }]}>
          <ActionButton icon={FolderInput} label="Chuyển nhóm" onPress={() => setGroupSheet(true)} />
          <ActionButton icon={CheckCheck} label="Đã đọc hết" onPress={markAllRead} />
          <ActionButton
            icon={RefreshCw}
            label="Kiểm tra"
            onPress={checkSelected}
            disabled={update.running}
          />
          <ActionButton icon={Trash2} label="Xoá" onPress={removeSelected} danger />
        </View>
      )}

      <GroupSheet
        visible={groupSheet}
        onClose={() => setGroupSheet(false)}
        current={commonGroup}
        onSelect={moveToGroup}
      />
      <NewGroupDialog visible={newGroup} onClose={() => setNewGroup(false)} />
      <EditGroupDialog
        group={editingGroup}
        onClose={() => setEditingGroup(null)}
        onRemoved={name => {
          if (activeGroup === name) {
            setGroupFilter(null);
          }
        }}
      />
    </View>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onPress,
  danger,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  const { c } = useTheme();
  const color = danger ? c.danger : c.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      android_ripple={{ color: c.border, borderless: true }}
      style={[styles.action, disabled && styles.disabled]}
    >
      <Icon size={22} color={color} />
      <Text style={[font.caption, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  disabled: { opacity: 0.4 },
  toolbar: { paddingHorizontal: space.lg, paddingTop: space.md, gap: space.sm },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.xs,
    paddingRight: space.md,
    minHeight: 56,
  },
  progress: { paddingHorizontal: space.lg, paddingBottom: space.sm },
  emptyFill: { flex: 0, marginTop: space.xl * 2 },
  emptySecondary: { alignSelf: 'center' },
  actionBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: space.sm,
  },
  action: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: space.xs },
});
