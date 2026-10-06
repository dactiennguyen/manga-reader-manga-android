import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useAppNavigation } from '../../app/routes';
import { Cover, MenuSheet, PromptDialog, SpeechBubble, type MenuItem } from '../../components/comic';
import {
  ArrowDownUp,
  BookCheck,
  EllipsisVertical,
  FolderInput,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Search,
  Share,
  Trash,
} from '../../components/icons';
import {
  Button,
  Chip,
  ChipRow,
  Fab,
  Header,
  IconButton,
  LoadingView,
  ProgressBar,
  Screen,
  SearchField,
  toast,
} from '../../components/ui';
import { pickToCache } from '../../lib/files';
import { importProjectArchive } from '../../lib/projectArchive';
import { formatRelative } from '../../lib/time';
import { LIMITS, PROJECT_STATUS_LABEL } from '../../model/constants';
import { activeProjects, chapterIdsOf, projectProgress, projectStatus } from '../../model/selectors';
import type { ID, Project, ProjectStatus } from '../../model/types';
import { useSettings } from '../../store/useSettings';
import { useStory } from '../../store/useStory';
import { font, radius, space, useIsWide, useTheme } from '../../theme';
import { useStoryData } from '../project/useStoryData';
import { changeProjectCover, exportProjectFile, trashProjectWithConfirm } from '../project/projectActions';

type Filter = 'all' | ProjectStatus;
type Sort = 'updated' | 'title' | 'created';

type Row = { project: Project; status: ProjectStatus; chapters: number; done: number; total: number; ratio: number };

const FILTERS: Filter[] = ['all', 'draft', 'active', 'done'];
const SORT_LABEL: Record<Sort, string> = { updated: 'Last edited', title: 'Title', created: 'Date created' };
const PADDING = space.lg;
const GAP = space.md;

export function LibraryScreen() {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const wide = useIsWide();
  const { width } = useWindowDimensions();
  const layout = useSettings(s => s.libraryLayout);
  const sort = useSettings(s => s.librarySort);
  const state = useStoryData();
  const projectsMap = state.projects;
  const listRef = useRef<FlatList<Row>>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [highlightId, setHighlightId] = useState<ID | null>(null);
  const [menuId, setMenuId] = useState<ID | null>(null);
  const [renameId, setRenameId] = useState<ID | null>(null);
  const [headerMenu, setHeaderMenu] = useState(false);
  const [sortMenu, setSortMenu] = useState(false);

  const rows = useMemo<Row[]>(() => {
    return activeProjects(state).map(project => ({
      project,
      status: projectStatus(state, project.id),
      chapters: chapterIdsOf(project).length,
      ...projectProgress(state, project.id),
    }));
  }, [state]);

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { all: rows.length, draft: 0, active: 0, done: 0 };
    rows.forEach(row => {
      result[row.status] += 1;
    });
    return result;
  }, [rows]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('vi');
    const list = rows.filter(
      row =>
        (filter === 'all' || row.status === filter) &&
        (!needle || row.project.title.toLocaleLowerCase('vi').includes(needle)),
    );
    if (sort === 'title') {
      return [...list].sort((a, b) => a.project.title.localeCompare(b.project.title, 'vi'));
    }
    if (sort === 'created') {
      return [...list].sort((a, b) => b.project.createdAt - a.project.createdAt);
    }
    return list;
  }, [rows, filter, query, sort]);

  const columns = layout === 'grid' ? (wide ? 3 : 2) : 1;
  const cardWidth = Math.floor((width - PADDING * 2 - GAP * (columns - 1)) / columns);
  const menuProject = menuId ? projectsMap[menuId] : undefined;
  const renameProject = renameId ? projectsMap[renameId] : undefined;

  const refresh = () => {
    setRefreshing(true);
    useStory.getState().purgeTrash();
    setTimeout(() => setRefreshing(false), 400);
  };

  const closeSearch = () => {
    setSearching(false);
    setQuery('');
  };

  const clearFilters = () => {
    setFilter('all');
    closeSearch();
  };

  const importProject = async () => {
    let picked: { path: string; name: string } | null = null;
    try {
      picked = await pickToCache('*/*');
    } catch {
      toast('Could not open this file');
      return;
    }
    if (!picked) {
      return;
    }
    setImporting(true);
    try {
      const projectId = await importProjectArchive(picked.path);
      setFilter('all');
      closeSearch();
      setHighlightId(projectId);
      setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
      setTimeout(() => setHighlightId(null), 2500);
      toast('Project imported');
    } catch {
      toast('This file is unreadable or is not a Mangaka project');
    } finally {
      setImporting(false);
    }
  };

  const itemMenu: MenuItem[] = menuProject
    ? [
        { label: 'Rename', icon: Pencil, onPress: () => setRenameId(menuProject.id) },
        { label: 'Change cover', icon: ImageIcon, onPress: () => changeProjectCover(menuProject.id) },
        {
          label: 'Export project',
          subtitle: 'A .mangaka file for backup or moving devices',
          icon: Share,
          onPress: () => exportProjectFile(menuProject.id),
        },
        {
          label: menuProject.done ? 'Mark as not done' : 'Mark as done',
          icon: BookCheck,
          onPress: () => useStory.getState().updateProject(menuProject.id, { done: !menuProject.done }),
        },
        { label: 'Delete', icon: Trash, destructive: true, onPress: () => trashProjectWithConfirm(menuProject) },
      ]
    : [];

  const renderItem = ({ item }: { item: Row }) => {
    const { project } = item;
    const open = () => navigation.navigate('Project', { projectId: project.id });
    const hold = () => setMenuId(project.id);
    const highlighted = highlightId === project.id;
    const seal = project.done && (
      <View style={[styles.seal, { backgroundColor: c.accent, borderColor: c.onAccent }]}>
        <Text style={[styles.sealText, { color: c.onAccent }]}>完</Text>
      </View>
    );
    if (layout === 'list') {
      return (
        <Pressable
          onPress={open}
          onLongPress={hold}
          style={[styles.listRow, { borderColor: highlighted ? c.accent : c.border, backgroundColor: c.surface }]}
        >
          <Cover project={project} width={56}>
            {seal}
          </Cover>
          <View style={styles.listInfo}>
            <Text numberOfLines={1} style={[font.heading, { color: c.text }]}>
              {project.title || 'Untitled'}
            </Text>
            {!!project.logline && (
              <Text numberOfLines={1} style={[font.body, { color: c.textSecondary }]}>
                {project.logline}
              </Text>
            )}
            <Text style={[font.caption, { color: c.muted }]}>
              {item.chapters} ch. · {item.total} pages · {formatRelative(project.updatedAt)}
            </Text>
            <ProgressBar value={item.ratio} />
          </View>
        </Pressable>
      );
    }
    return (
      <Pressable onPress={open} onLongPress={hold} style={[styles.gridItem, { width: cardWidth }]}>
        <Cover project={project} width={cardWidth} style={highlighted && { borderColor: c.accent }}>
          {seal}
          <View style={styles.coverProgress}>
            <ProgressBar value={item.ratio} />
          </View>
        </Cover>
        <Text numberOfLines={2} style={[font.label, { color: c.text }]}>
          {project.title || 'Untitled'}
        </Text>
        <Text style={[font.caption, { color: c.muted }]}>{item.chapters} ch.</Text>
      </Pressable>
    );
  };

  const emptyView =
    rows.length === 0 ? (
      <View style={styles.empty}>
        <View style={styles.shelf}>
          {[0, 1, 2].map(index => (
            <View key={index} style={[styles.shelfBoard, { borderColor: c.ink, backgroundColor: c.surfaceAlt }]} />
          ))}
        </View>
        <SpeechBubble tail="bottom-left">Your shelf is empty. Create your first story!</SpeechBubble>
        <Button title="New story" icon={Plus} onPress={() => navigation.navigate('NewProject')} />
      </View>
    ) : (
      <View style={styles.empty}>
        <SpeechBubble tail="none">No stories match</SpeechBubble>
        <Button title="Clear filters" variant="secondary" onPress={clearFilters} />
      </View>
    );

  return (
    <Screen edges={['top']}>
      <Header
        title="Library"
        hideBack
        right={
          <>
            {!searching && (
              <IconButton
                icon={Search}
                color={c.onAppBar}
                onPress={() => setSearching(true)}
                accessibilityLabel="Search"
              />
            )}
            <IconButton
              icon={EllipsisVertical}
              color={c.onAppBar}
              onPress={() => setHeaderMenu(true)}
              accessibilityLabel="More"
            />
          </>
        }
      >
        {searching ? (
          <SearchField
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Search by title"
            onClear={closeSearch}
            returnKeyType="search"
          />
        ) : undefined}
      </Header>
      <FlatList
        ref={listRef}
        key={`${layout}-${columns}`}
        data={visible}
        keyExtractor={row => row.project.id}
        renderItem={renderItem}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? styles.columnWrap : undefined}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[c.accent]} />}
        ListHeaderComponent={
          rows.length > 0 ? (
            <View style={styles.listHeader}>
              <ChipRow>
                {FILTERS.map(key => (
                  <Chip
                    key={key}
                    label={key === 'all' ? 'All' : PROJECT_STATUS_LABEL[key]}
                    count={counts[key]}
                    selected={filter === key}
                    onPress={() => setFilter(key)}
                  />
                ))}
              </ChipRow>
              <View style={styles.countRow}>
                <Text style={[font.label, { color: c.textSecondary }]}>{visible.length} stories</Text>
                <Pressable style={styles.sortButton} hitSlop={8} onPress={() => setSortMenu(true)}>
                  <ArrowDownUp size={16} color={c.text} />
                  <Text style={[font.label, { color: c.text }]}>{SORT_LABEL[sort]}</Text>
                </Pressable>
              </View>
              {importing && <LoadingView label="Importing project…" />}
            </View>
          ) : importing ? (
            <LoadingView label="Importing project…" />
          ) : undefined
        }
        ListEmptyComponent={emptyView}
      />
      {rows.length > 0 && <Fab icon={Plus} label="New story" onPress={() => navigation.navigate('NewProject')} />}

      <MenuSheet
        visible={headerMenu}
        onClose={() => setHeaderMenu(false)}
        items={[
          { label: 'Import project (.mangaka)', icon: FolderInput, onPress: importProject },
          { label: 'Trash', icon: Trash, onPress: () => navigation.navigate('Trash') },
          {
            label: layout === 'grid' ? 'List view' : 'Grid view',
            icon: layout === 'grid' ? List : LayoutGrid,
            onPress: () => useSettings.getState().set({ libraryLayout: layout === 'grid' ? 'list' : 'grid' }),
          },
        ]}
      />
      <MenuSheet
        visible={sortMenu}
        onClose={() => setSortMenu(false)}
        title="Sort by"
        items={(Object.keys(SORT_LABEL) as Sort[]).map(key => ({
          label: SORT_LABEL[key],
          subtitle: key === sort ? 'Selected' : undefined,
          onPress: () => useSettings.getState().set({ librarySort: key }),
        }))}
      />
      <MenuSheet
        visible={!!menuProject}
        onClose={() => setMenuId(null)}
        title={menuProject?.title || 'Untitled'}
        items={itemMenu}
      />
      <PromptDialog
        visible={!!renameProject}
        onClose={() => setRenameId(null)}
        title="Rename story"
        initialValue={renameProject?.title ?? ''}
        placeholder="Story title"
        maxLength={LIMITS.projectTitle}
        onSubmit={value => {
          if (renameProject && value.trim()) {
            useStory.getState().updateProject(renameProject.id, { title: value.trim() });
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: PADDING, gap: GAP, paddingBottom: 96, flexGrow: 1 },
  columnWrap: { gap: GAP },
  listHeader: { gap: space.md },
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sortButton: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  gridItem: { gap: space.xs },
  coverProgress: { position: 'absolute', left: space.sm, right: space.sm, bottom: space.sm },
  listRow: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.sm,
    borderWidth: 2,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  listInfo: { flex: 1, gap: space.xs },
  seal: {
    position: 'absolute',
    top: space.xs,
    right: space.xs,
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealText: { fontSize: 14, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, paddingVertical: space.xl * 2 },
  shelf: { gap: space.md, alignItems: 'center' },
  shelfBoard: { width: 160, height: 12, borderWidth: 2, borderRadius: radius.sm },
});
