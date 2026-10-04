import { unlink } from '@dr.pogodin/react-native-fs';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppNavigation, type RootStackParamList } from '../../app/routes';
import { DropdownButton } from '../../components/Dropdown';
import { Favicon } from '../../components/Favicon';
import { Dialog, Sheet } from '../../components/Sheet';
import { BookOpen, Download, FileText, Pause, Play, Trash2 } from '../../components/icons';
import { Button, Checkbox, EmptyState, Header, IconButton, Screen, confirm, toast } from '../../components/ui';
import { formatBytes } from '../../lib/format';
import { formatDate } from '../../lib/time';
import { displayUrl } from '../../lib/url';
import { getEngine } from '../../sources';
import type { ContentType } from '../../sources/types';
import { useBrowser, type SavedPage } from '../../store/useBrowser';
import { useDownloads, type DownloadTask } from '../../store/useDownloads';
import { useAllowNsfw } from '../../store/useSettings';
import { getSource, useSources } from '../../store/useSources';
import { font, space, useTheme } from '../../theme';
import {
  ChapterRow,
  DownloadMangaRow,
  groupSummary,
  groupTasks,
  isActive,
  isResumable,
  type DownloadGroup,
} from './DownloadRows';
import { removeDownloads } from './downloader';

type DownloadView = ContentType | 'web';

const VIEW_OPTIONS = [
  { value: 'manga', label: 'Truyện tranh' },
  { value: 'novel', label: 'Tiểu thuyết' },
  { value: 'web', label: 'Trang web' },
] as const;

const CONTENT_NAME: Record<ContentType, string> = { manga: 'truyện tranh', novel: 'tiểu thuyết' };

type TabParam = NonNullable<RootStackParamList['Downloads']>['tab'];

/** Tham số `tab` cũ → lựa chọn của nút thả xuống. */
function viewFromParam(tab: TabParam): DownloadView {
  if (tab === 'pages') {
    return 'web';
  }
  // 'chapters': Truyện tranh, trừ khi chỉ có tiểu thuyết được tải.
  const tasks = Object.values(useDownloads.getState().tasks);
  return !tasks.some(t => t.content === 'manga') && tasks.some(t => t.content === 'novel') ? 'novel' : 'manga';
}

export function DownloadsScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Downloads'>>();
  const { c } = useTheme();
  const tabParam = route.params?.tab;
  const [view, setView] = useState<DownloadView>(() => viewFromParam(tabParam));
  const tasks = useDownloads(s => s.tasks);
  const pause = useDownloads(s => s.pause);
  const resume = useDownloads(s => s.resume);

  useEffect(() => {
    if (tabParam) {
      setView(viewFromParam(tabParam));
    }
  }, [tabParam]);

  const scoped = useMemo(
    () => (view === 'web' ? [] : Object.values(tasks).filter(t => t.content === view)),
    [tasks, view],
  );
  const active = scoped.filter(isActive);
  const resumable = scoped.filter(isResumable);

  return (
    <Screen>
      <Header
        title="Tải xuống"
        right={
          <>
            <View style={styles.dropdown}>
              <DropdownButton value={view} options={VIEW_OPTIONS} onChange={setView} />
            </View>
            {active.length > 0 && (
              <IconButton
                icon={Pause}
                color={c.onAppBar}
                onPress={() => pause(active.map(t => t.id))}
                accessibilityLabel="Tạm dừng tất cả"
              />
            )}
            {resumable.length > 0 && (
              <IconButton
                icon={Play}
                color={c.onAppBar}
                onPress={() => resume(resumable.map(t => t.id))}
                accessibilityLabel="Tiếp tục tất cả"
              />
            )}
          </>
        }
      />
      {view === 'web' ? <SavedPages /> : <ChapterDownloads key={view} content={view} tasks={scoped} />}
    </Screen>
  );
}

// ─── Truyện đã tải ──────────────────────────────────────────────────────────

function ChapterDownloads({ content, tasks }: { content: ContentType; tasks: DownloadTask[] }) {
  const navigation = useAppNavigation();
  const pause = useDownloads(s => s.pause);
  const resume = useDownloads(s => s.resume);
  const sources = useSources(s => s.sources);
  const allowNsfw = useAllowNsfw();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [removing, setRemoving] = useState<{ tasks: DownloadTask[]; title: string } | null>(null);
  const [deleteFiles, setDeleteFiles] = useState(true);

  const groups = useMemo(() => groupTasks(tasks), [tasks]);
  // Xoá hết chương của truyện đang mở thì sheet tự đóng.
  const openGroup = openKey ? groups.find(g => g.mangaKey === openKey) : undefined;

  const sourceInfo = useMemo(() => {
    const map: Record<string, { headers: Record<string, string>; nsfw: boolean }> = {};
    for (const src of sources) {
      map[src.id] = { headers: getEngine(src.engine).imageHeaders(src), nsfw: src.nsfw };
    }
    return map;
  }, [sources]);

  const openSheet = useCallback((group: DownloadGroup) => setOpenKey(group.mangaKey), []);
  const pauseGroup = useCallback(
    (group: DownloadGroup) => pause(group.tasks.filter(isActive).map(t => t.id)),
    [pause],
  );
  const resumeGroup = useCallback(
    (group: DownloadGroup) => resume(group.tasks.filter(isResumable).map(t => t.id)),
    [resume],
  );
  const askRemoveGroup = useCallback((group: DownloadGroup) => {
    setOpenKey(null);
    setDeleteFiles(true);
    setRemoving({ tasks: group.tasks, title: group.title });
  }, []);
  const askRemoveTask = useCallback((task: DownloadTask) => {
    setDeleteFiles(true);
    setRemoving({ tasks: [task], title: task.chapterName });
  }, []);
  const pauseTask = useCallback((task: DownloadTask) => pause([task.id]), [pause]);
  const resumeTask = useCallback((task: DownloadTask) => resume([task.id]), [resume]);

  const openManga = (group: DownloadGroup) => {
    setOpenKey(null);
    navigation.navigate('MangaDetail', {
      sourceId: group.sourceId,
      url: group.mangaUrl,
      title: group.title,
      cover: group.cover,
    });
  };

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
      setOpenKey(null);
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
        message={`Bạn có thể tải chương ${CONTENT_NAME[content]} để đọc offline tại đây. Hiện chưa có chương nào được tải.`}
      />
    );
  }

  const canPause = openGroup?.tasks.some(isActive);
  const canResume = openGroup?.tasks.some(isResumable);

  return (
    <>
      <FlashList
        data={groups}
        keyExtractor={group => group.mangaKey}
        renderItem={({ item: group }) => (
          <DownloadMangaRow
            group={group}
            headers={sourceInfo[group.sourceId]?.headers}
            blur={!!sourceInfo[group.sourceId]?.nsfw && !allowNsfw}
            onOpen={openSheet}
            onLongPress={askRemoveGroup}
            onPause={pauseGroup}
            onResume={resumeGroup}
          />
        )}
        contentContainerStyle={styles.list}
      />

      <Sheet
        visible={!!openGroup}
        onClose={() => setOpenKey(null)}
        title={openGroup?.title}
        subtitle={openGroup ? groupSummary(openGroup) : undefined}
        scroll={false}
      >
        {openGroup && (
          <>
            <View style={styles.sheetActions}>
              <Button
                title="Mở truyện"
                icon={BookOpen}
                variant="secondary"
                small
                onPress={() => openManga(openGroup)}
              />
              {canPause && (
                <Button
                  title="Tạm dừng tất cả"
                  icon={Pause}
                  variant="ghost"
                  small
                  onPress={() => pauseGroup(openGroup)}
                />
              )}
              {canResume && (
                <Button
                  title="Tiếp tục tất cả"
                  icon={Play}
                  variant="ghost"
                  small
                  onPress={() => resumeGroup(openGroup)}
                />
              )}
              <Button
                title="Xoá tất cả"
                icon={Trash2}
                variant="danger"
                small
                onPress={() => askRemoveGroup(openGroup)}
              />
            </View>
            <FlatList
              data={openGroup.tasks}
              keyExtractor={task => task.id}
              renderItem={({ item: task }) => (
                <ChapterRow
                  task={task}
                  onOpen={openChapter}
                  onPause={pauseTask}
                  onResume={resumeTask}
                  onRemove={askRemoveTask}
                />
              )}
            />
          </>
        )}
      </Sheet>

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
          onLongPress={() => remove(page)}
          android_ripple={{ color: c.border }}
          style={styles.page}
        >
          <Favicon url={page.url} size={40} tile />
          <View style={styles.pageBody}>
            <Text numberOfLines={2} style={[styles.pageTitle, { color: c.text }]}>
              {page.title || displayUrl(page.url)}
            </Text>
            <Text numberOfLines={1} style={[font.caption, { color: c.textSecondary }]}>
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
  dropdown: { marginRight: space.sm },
  list: { paddingVertical: space.xs, paddingBottom: space.xl },
  sheetActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
  page: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.lg,
    paddingRight: space.xs,
    paddingVertical: space.sm,
  },
  pageBody: { flex: 1, gap: 2 },
  pageTitle: { fontSize: 15, fontWeight: '700' },
});
