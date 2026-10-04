import { unlink } from '@dr.pogodin/react-native-fs';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { Download, FileText, Pause, Play, Trash2 } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppNavigation, type RootStackParamList } from '../../app/routes';
import { Dialog } from '../../components/Sheet';
import { Checkbox, EmptyState, Header, IconButton, Screen, TabBar, confirm, toast } from '../../components/ui';
import { displayUrl } from '../../lib/url';
import { formatDate } from '../../lib/time';
import { getEngine } from '../../sources';
import { useBrowser, type SavedPage } from '../../store/useBrowser';
import { useDownloads, type DownloadTask } from '../../store/useDownloads';
import { useAllowNsfw } from '../../store/useSettings';
import { getSource, useSources } from '../../store/useSources';
import { font, radius, space, useTheme } from '../../theme';
import { Favicon } from '../../components/Favicon';
import { ChapterRow, GroupRow, groupTasks, isActive, isResumable, type DownloadGroup } from './DownloadRows';
import { removeDownloads } from './downloader';
import { formatBytes } from '../../lib/format';

type Tab = 'chapters' | 'pages';

type Row =
  | { type: 'group'; group: DownloadGroup; expanded: boolean }
  | { type: 'chapter'; task: DownloadTask; last: boolean };

export function DownloadsScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Downloads'>>();
  const [tab, setTab] = useState<Tab>(route.params?.tab ?? 'chapters');
  const tasks = useDownloads(s => s.tasks);
  const pause = useDownloads(s => s.pause);
  const resume = useDownloads(s => s.resume);
  const pageCount = useBrowser(s => s.savedPages.length);

  const taskList = useMemo(() => Object.values(tasks), [tasks]);
  const activeCount = taskList.filter(isActive).length;
  const resumable = taskList.filter(isResumable);

  const tabs = useMemo(
    () => [
      { key: 'chapters' as const, label: 'Chương truyện', badge: activeCount },
      { key: 'pages' as const, label: 'Trang đã lưu', badge: 0 },
    ],
    [activeCount],
  );

  return (
    <Screen>
      <Header
        title="Tải xuống"
        subtitle={
          tab === 'chapters'
            ? taskList.length
              ? `${taskList.length} chương · ${formatBytes(taskList.reduce((sum, t) => sum + t.bytes, 0))}`
              : undefined
            : pageCount
              ? `${pageCount} trang`
              : undefined
        }
        right={
          tab === 'chapters' && taskList.length > 0 ? (
            <>
              <IconButton
                icon={Pause}
                disabled={!activeCount}
                onPress={() => pause(taskList.filter(isActive).map(t => t.id))}
                accessibilityLabel="Tạm dừng tất cả"
              />
              <IconButton
                icon={Play}
                disabled={!resumable.length}
                onPress={() => resume(resumable.map(t => t.id))}
                accessibilityLabel="Tiếp tục tất cả"
              />
            </>
          ) : undefined
        }
      />
      <TabBar tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'chapters' ? <ChapterDownloads tasks={tasks} /> : <SavedPages />}
    </Screen>
  );
}

// ─── Chương đã tải ──────────────────────────────────────────────────────────

function ChapterDownloads({ tasks }: { tasks: Record<string, DownloadTask> }) {
  const navigation = useAppNavigation();
  const pause = useDownloads(s => s.pause);
  const resume = useDownloads(s => s.resume);
  const sources = useSources(s => s.sources);
  const allowNsfw = useAllowNsfw();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [removing, setRemoving] = useState<{ tasks: DownloadTask[]; title: string } | null>(null);
  const [deleteFiles, setDeleteFiles] = useState(true);

  const groups = useMemo(() => groupTasks(tasks), [tasks]);

  const sourceInfo = useMemo(() => {
    const map: Record<string, { headers: Record<string, string>; nsfw: boolean }> = {};
    for (const src of sources) {
      map[src.id] = { headers: getEngine(src.engine).imageHeaders(src), nsfw: src.nsfw };
    }
    return map;
  }, [sources]);

  // Chỉ có một truyện thì mở sẵn danh sách chương.
  const isExpanded = useCallback(
    (key: string) => expanded[key] ?? groups.length === 1,
    [expanded, groups.length],
  );

  const rows = useMemo(() => {
    const out: Row[] = [];
    for (const group of groups) {
      const open = isExpanded(group.mangaKey);
      out.push({ type: 'group', group, expanded: open });
      if (open) {
        group.tasks.forEach((task, i) =>
          out.push({ type: 'chapter', task, last: i === group.tasks.length - 1 }),
        );
      }
    }
    return out;
  }, [groups, isExpanded]);

  const toggle = useCallback(
    (group: DownloadGroup) =>
      setExpanded(current => ({ ...current, [group.mangaKey]: !isExpanded(group.mangaKey) })),
    [isExpanded],
  );
  const pauseGroup = useCallback(
    (group: DownloadGroup) => pause(group.tasks.filter(isActive).map(t => t.id)),
    [pause],
  );
  const resumeGroup = useCallback(
    (group: DownloadGroup) => resume(group.tasks.filter(isResumable).map(t => t.id)),
    [resume],
  );
  const askRemoveGroup = useCallback((group: DownloadGroup) => {
    setDeleteFiles(true);
    setRemoving({ tasks: group.tasks, title: group.title });
  }, []);
  const askRemoveTask = useCallback((task: DownloadTask) => {
    setDeleteFiles(true);
    setRemoving({ tasks: [task], title: task.chapterName });
  }, []);
  const pauseTask = useCallback((task: DownloadTask) => pause([task.id]), [pause]);
  const resumeTask = useCallback((task: DownloadTask) => resume([task.id]), [resume]);

  const openManga = useCallback(
    (group: DownloadGroup) =>
      navigation.navigate('MangaDetail', {
        sourceId: group.sourceId,
        url: group.mangaUrl,
        title: group.title,
        cover: group.cover,
      }),
    [navigation],
  );

  const openChapter = useCallback(
    (task: DownloadTask) => {
      if (task.status !== 'done') {
        toast('Chương chưa tải xong. Bạn vẫn có thể đọc online từ trang truyện.');
        return;
      }
      if (!getSource(task.sourceId)) {
        toast('Nguồn của truyện này đã bị xoá. Thêm lại site trong Addon để đọc.');
        return;
      }
      const params = { sourceId: task.sourceId, mangaUrl: task.mangaUrl, chapterUrl: task.chapterUrl };
      if (task.content === 'novel') {
        navigation.navigate('NovelReader', params);
      } else {
        navigation.navigate('Reader', params);
      }
    },
    [navigation],
  );

  const confirmRemove = async () => {
    if (!removing) {
      return;
    }
    const target = removing;
    setRemoving(null);
    await removeDownloads(target.tasks, deleteFiles);
    toast(target.tasks.length > 1 ? `Đã xoá ${target.tasks.length} chương` : 'Đã xoá chương');
  };

  if (!groups.length) {
    return (
      <EmptyState
        icon={Download}
        title="Chưa có chương nào"
        message="Bạn có thể tải chương truyện để đọc offline tại đây. Hiện chưa có chương nào được tải."
      />
    );
  }

  return (
    <>
      <FlashList
        data={rows}
        keyExtractor={row => (row.type === 'group' ? `g:${row.group.mangaKey}` : `c:${row.task.id}`)}
        getItemType={row => row.type}
        renderItem={({ item: row }) =>
          row.type === 'group' ? (
            <GroupRow
              group={row.group}
              expanded={row.expanded}
              headers={sourceInfo[row.group.sourceId]?.headers}
              blur={!!sourceInfo[row.group.sourceId]?.nsfw && !allowNsfw}
              onToggle={toggle}
              onPauseAll={pauseGroup}
              onResumeAll={resumeGroup}
              onRemove={askRemoveGroup}
              onOpenManga={openManga}
            />
          ) : (
            <ChapterRow
              task={row.task}
              last={row.last}
              onOpen={openChapter}
              onPause={pauseTask}
              onResume={resumeTask}
              onRemove={askRemoveTask}
            />
          )
        }
        contentContainerStyle={styles.list}
      />
      <Dialog
        visible={removing !== null}
        onClose={() => setRemoving(null)}
        title={removing && removing.tasks.length > 1 ? `Xoá ${removing.tasks.length} chương?` : 'Xoá chương?'}
        message={
          removing && removing.tasks.length > 1
            ? `Các chương của “${removing.title}” sẽ bị gỡ khỏi danh sách tải.`
            : 'Chương sẽ bị gỡ khỏi danh sách tải.'
        }
        actions={[
          { label: 'Huỷ', onPress: () => setRemoving(null) },
          { label: 'Xoá', variant: 'danger', onPress: confirmRemove },
        ]}
      >
        <Checkbox checked={deleteFiles} onChange={setDeleteFiles} label="Xoá luôn file đã tải" />
      </Dialog>
    </>
  );
}

// ─── Trang web đã lưu ───────────────────────────────────────────────────────

function SavedPages() {
  const navigation = useAppNavigation();
  const { c } = useTheme();
  const pages = useBrowser(s => s.savedPages);
  const removeSavedPages = useBrowser(s => s.removeSavedPages);

  const remove = async (page: SavedPage) => {
    const ok = await confirm('Xoá trang đã lưu', `Xoá “${page.title || displayUrl(page.url)}” khỏi máy?`, {
      confirmText: 'Xoá',
      destructive: true,
    });
    if (ok) {
      await unlink(page.file.replace(/^file:\/\//, '')).catch(() => {});
      removeSavedPages([page.id]);
      toast('Đã xoá trang đã lưu');
    }
  };

  if (!pages.length) {
    return (
      <EmptyState
        icon={FileText}
        title="Chưa có trang nào"
        message="Bạn có thể lưu trang web để xem offline (menu trình duyệt → Lưu trang). Hiện chưa có trang nào được lưu."
      />
    );
  }

  return (
    <FlatList
      data={pages}
      keyExtractor={page => page.id}
      contentContainerStyle={styles.list}
      renderItem={({ item: page }) => (
        <Pressable
          onPress={() => navigation.navigate('SavedPage', { id: page.id })}
          android_ripple={{ color: c.border }}
          style={[styles.page, { backgroundColor: c.surface }]}
        >
          <Favicon url={page.url} size={38} tile />
          <View style={styles.flex}>
            <Text numberOfLines={2} style={[font.label, { color: c.text }]}>
              {page.title || displayUrl(page.url)}
            </Text>
            <Text numberOfLines={1} style={[font.caption, { color: c.muted }]}>
              {displayUrl(page.url)}
            </Text>
            <Text style={[font.caption, { color: c.muted }]}>
              {formatDate(page.savedAt)} · {formatBytes(page.size)}
            </Text>
          </View>
          <IconButton
            icon={Trash2}
            size={18}
            color={c.muted}
            onPress={() => remove(page)}
            accessibilityLabel="Xoá trang đã lưu"
          />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  list: { paddingBottom: space.xl },
  page: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginHorizontal: space.md,
    marginTop: space.sm,
    paddingLeft: space.md,
    paddingRight: space.xs,
    paddingVertical: space.md,
    borderRadius: radius.lg,
  },
});
