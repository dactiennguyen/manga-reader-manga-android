import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, BackHandler, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { useAppNavigation } from '../../app/routes';
import { DropdownButton } from '../../components/Dropdown';
import { Sheet } from '../../components/Sheet';
import {
  BookOpen,
  CheckCheck,
  EllipsisVertical,
  FolderPlus,
  LayoutGrid,
  List,
  ListChecks,
  Puzzle,
  RefreshCw,
  ScrollText,
  Search,
  SearchX,
  Tag,
  Trash2,
  type LucideIcon,
} from '../../components/icons';
import {
  Button,
  EmptyState,
  Header,
  IconButton,
  ListItem,
  ProgressBar,
  SearchField,
  confirm,
  toast,
} from '../../components/ui';
import { getHost } from '../../lib/url';
import { getEngine } from '../../sources';
import { getCachedChapters } from '../../sources/cache';
import type { ContentType } from '../../sources/types';
import { markChaptersRead } from '../../store/progress';
import { sortBookmarks, useLibrary, type Bookmark, type GroupChanges, type LibrarySort } from '../../store/useLibrary';
import { useAllowNsfw, useSettings } from '../../store/useSettings';
import { useSources, withCatalog } from '../../store/useSources';
import { font, space, useTheme } from '../../theme';
import { BookmarkGrid, type BookmarkSourceInfo } from './BookmarkGrid';
import { EditGroupDialog, GroupSheet, NewGroupDialog } from './GroupSheet';
import { LibraryBar, LibrarySheet, libraryLabel, type BookmarkView, type GroupFilter } from './LibraryFilter';
import { runLibraryUpdateCheck } from './runUpdateCheck';
import { refreshUnread, useUpdateCheck } from './updates';

const SORT_OPTIONS: { value: LibrarySort; label: string }[] = [
  { value: 'updated', label: 'Mới cập nhật' },
  { value: 'added', label: 'Mới thêm' },
  { value: 'title', label: 'Tên (A–Z)' },
  { value: 'unread', label: 'Chưa đọc nhiều' },
];

const CONTENT_NAME: Record<ContentType, string> = {
  manga: 'truyện tranh',
  novel: 'tiểu thuyết',
};

export function MediaBookmarksTab({
  content,
  onViewChange,
}: {
  content: ContentType;
  onViewChange: (view: BookmarkView) => void;
}) {
  const navigation = useAppNavigation();
  const { c } = useTheme();
  const { bookmarks, groups, sort, setSort, removeBookmarks, setBookmarkGroups, updateBookmark } = useLibrary(
    useShallow(s => ({
      bookmarks: s.bookmarks,
      groups: s.groups,
      sort: s.sort,
      setSort: s.setSort,
      removeBookmarks: s.removeBookmarks,
      setBookmarkGroups: s.setBookmarkGroups,
      updateBookmark: s.updateBookmark,
    })),
  );
  const layout = useSettings(s => s.libraryLayout);
  const setSettings = useSettings(s => s.set);
  const allowNsfw = useAllowNsfw();
  const sources = useSources(s => s.sources);
  const update = useUpdateCheck(useShallow(s => ({ running: s.running, done: s.done, total: s.total })));

  const [group, setGroupFilter] = useState<GroupFilter>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [groupSheet, setGroupSheet] = useState(false);
  const [groupKeys, setGroupKeys] = useState<string[]>([]);
  const [newGroup, setNewGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);

  const all = useMemo(() => Object.values(bookmarks).filter(b => b.content === content), [bookmarks, content]);
  const allKeys = useMemo(() => all.map(b => b.key), [all]);
  const activeGroup = group !== null && group !== '' && !groups.includes(group) ? null : group;

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of all) {
      for (const name of b.groups.length ? b.groups : ['']) {
        counts[name] = (counts[name] ?? 0) + 1;
      }
    }
    return counts;
  }, [all]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const inGroup = (b: Bookmark) =>
      activeGroup === null || (activeGroup === '' ? !b.groups.length : b.groups.includes(activeGroup));
    const list = all.filter(b => inGroup(b) && (!q || b.title.toLowerCase().includes(q)));
    return sortBookmarks(list, sort);
  }, [all, activeGroup, query, sort]);

  const sourceInfo = useMemo(() => {
    const map: Record<string, BookmarkSourceInfo> = {};
    for (const src of withCatalog(sources)) {
      map[src.id] = {
        headers: getEngine(src.engine).imageHeaders(src),
        name: src.name,
        nsfw: src.nsfw,
        host: getHost(src.baseUrl),
      };
    }
    return map;
  }, [sources]);

  const selectedKeys = useMemo(() => [...selected].filter(key => bookmarks[key]), [selected, bookmarks]);
  const selecting = selectedKeys.length > 0;
  const allSelected = selectedKeys.length === items.length;
  const clearSelection = useCallback(() => setSelected(new Set()), []);
  const closeSearch = useCallback(() => {
    setSearching(false);
    setQuery('');
  }, []);

  useEffect(() => {
    if (!selecting && !searching) {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selecting) {
        clearSelection();
      } else {
        closeSearch();
      }
      return true;
    });
    return () => sub.remove();
  }, [selecting, searching, clearSelection, closeSearch]);

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
    runLibraryUpdateCheck(allKeys);
  }, [allKeys]);

  const closeMenuThen = (action: () => void) => () => {
    setMenuOpen(false);
    action();
  };

  const openGroupSheet = () => {
    setGroupKeys(selectedKeys);
    setGroupSheet(true);
  };

  const applyGroups = (changes: GroupChanges) => {
    setBookmarkGroups(groupKeys, changes);
    toast(`Đã đặt nhóm cho ${groupKeys.length} truyện`);
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

  const library = (
    <LibrarySheet
      visible={libraryOpen}
      onClose={() => setLibraryOpen(false)}
      view={content}
      onViewChange={onViewChange}
      groups={
        all.length
          ? {
              names: groups,
              counts: groupCounts,
              total: all.length,
              active: activeGroup,
              onSelect: setGroupFilter,
              onEdit: setEditingGroup,
              onNew: () => setNewGroup(true),
            }
          : undefined
      }
    />
  );

  if (!all.length) {
    return (
      <>
        <Header title="Bookmark" />
        <LibraryBar label={libraryLabel(content)} onPress={() => setLibraryOpen(true)} />
        <View style={styles.flex}>
          <EmptyState
            icon={content === 'novel' ? ScrollText : BookOpen}
            title="Chưa có bookmark"
            message={`Bạn chưa bookmark ${CONTENT_NAME[content]} nào. Mở một truyện rồi bấm biểu tượng bookmark để lưu vào đây.`}
            action={{
              label: 'Tìm truyện',
              icon: Search,
              onPress: () => navigation.navigate('MangaSearch'),
            }}
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
        {library}
      </>
    );
  }

  const sortLabel = SORT_OPTIONS.find(o => o.value === sort)?.label;
  const filterLabel =
    activeGroup === null ? libraryLabel(content) : `${libraryLabel(content)} · ${activeGroup || 'Không nhóm'}`;

  let header: ReactNode;
  if (selecting) {
    header = (
      <Header
        title={`Đã chọn ${selectedKeys.length}`}
        onBack={clearSelection}
        right={
          <IconButton
            icon={ListChecks}
            color={c.onAppBar}
            onPress={() => setSelected(allSelected ? new Set() : new Set(items.map(b => b.key)))}
            accessibilityLabel={allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
          />
        }
      />
    );
  } else if (searching) {
    header = (
      <Header onBack={closeSearch}>
        <SearchField
          value={query}
          onChangeText={setQuery}
          onClear={() => setQuery('')}
          placeholder={`Tìm ${CONTENT_NAME[content]} đã bookmark`}
          autoFocus
          style={[styles.headerSearch, { backgroundColor: c.appBarField }]}
          inputStyle={{ color: c.onAppBar }}
        />
      </Header>
    );
  } else {
    header = (
      <Header
        title="Bookmark"
        right={
          <>
            <RefreshButton running={update.running} onPress={refresh} />
            <IconButton
              icon={EllipsisVertical}
              color={c.onAppBar}
              onPress={() => setMenuOpen(true)}
              accessibilityLabel="Tuỳ chọn khác"
            />
          </>
        }
      />
    );
  }

  return (
    <>
      {header}

      <LibraryBar
        label={filterLabel}
        onPress={() => setLibraryOpen(true)}
        right={
          <>
            <Text style={[font.caption, { color: c.muted }]}>Sắp xếp</Text>
            <DropdownButton
              value={sort}
              options={SORT_OPTIONS}
              onChange={setSort}
              accessibilityLabel={`Sắp xếp: ${sortLabel}`}
            />
          </>
        }
      />

      {update.running && (
        <View style={styles.progress}>
          <Text style={[font.caption, { color: c.textSecondary }]}>
            Đang kiểm tra {Math.min(update.done + 1, update.total)}/{update.total}…
          </Text>
          <ProgressBar value={update.total ? update.done / update.total : 0} color={c.accent} />
        </View>
      )}

      <View style={styles.flex}>
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
                : 'Nhóm này chưa có truyện. Nhấn giữ một truyện rồi chọn “Đặt nhóm”.'
            }
          />
        )}
      </View>

      {selecting && (
        <View style={[styles.actionBar, { backgroundColor: c.surface, borderTopColor: c.border }]}>
          <ActionButton icon={Tag} label="Đặt nhóm" onPress={openGroupSheet} />
          <ActionButton icon={CheckCheck} label="Đã đọc hết" onPress={markAllRead} />
          <ActionButton icon={RefreshCw} label="Kiểm tra" onPress={checkSelected} disabled={update.running} />
          <ActionButton icon={Trash2} label="Xoá" onPress={removeSelected} danger />
        </View>
      )}

      <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)} title="Bookmark">
        <ListItem title="Tìm trong bookmark" icon={Search} onPress={closeMenuThen(() => setSearching(true))} />
        <ListItem
          title={layout === 'grid' ? 'Xem dạng danh sách' : 'Xem dạng lưới'}
          icon={layout === 'grid' ? List : LayoutGrid}
          onPress={closeMenuThen(() => setSettings({ libraryLayout: layout === 'grid' ? 'list' : 'grid' }))}
        />
        <ListItem
          title="Chọn tất cả"
          subtitle="Đặt nhóm, đánh dấu đã đọc, kiểm tra hoặc xoá nhiều truyện"
          icon={ListChecks}
          disabled={!items.length}
          onPress={closeMenuThen(() => setSelected(new Set(items.map(b => b.key))))}
        />
        <ListItem title="Nhóm mới" icon={FolderPlus} onPress={closeMenuThen(() => setNewGroup(true))} />
      </Sheet>

      {library}
      <GroupSheet visible={groupSheet} onClose={() => setGroupSheet(false)} keys={groupKeys} onApply={applyGroups} />
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
    </>
  );
}

function RefreshButton({ running, onPress }: { running: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!running) {
      spin.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [running, spin]);

  const spinStyle = {
    transform: [
      {
        rotate: spin.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        }),
      },
    ],
  };

  return (
    <Animated.View style={spinStyle} pointerEvents={running ? 'none' : 'auto'}>
      <IconButton
        icon={RefreshCw}
        color={c.onAppBar}
        onPress={onPress}
        accessibilityLabel={running ? 'Đang kiểm tra cập nhật' : 'Kiểm tra cập nhật'}
      />
    </Animated.View>
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
  headerSearch: { marginRight: space.sm, minHeight: 42 },
  progress: { paddingHorizontal: space.lg, paddingVertical: space.sm },
  emptyFill: { flex: 0, marginTop: space.xl * 2 },
  emptySecondary: { alignSelf: 'center' },
  actionBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: space.sm,
  },
  action: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: space.xs },
});
