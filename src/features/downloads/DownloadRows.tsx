import { BookOpen, ChevronDown, ChevronUp, Pause, Play, RotateCcw, Trash2 } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Cover } from '../../components/MangaCard';
import { Button, IconButton, ProgressBar } from '../../components/ui';
import type { ContentType } from '../../sources/types';
import type { DownloadStatus, DownloadTask } from '../../store/useDownloads';
import { font, radius, space, useTheme, type Palette } from '../../theme';
import { formatBytes } from '../../lib/format';

export type DownloadGroup = {
  mangaKey: string;
  sourceId: string;
  mangaUrl: string;
  title: string;
  cover?: string;
  content: ContentType;
  tasks: DownloadTask[];
  doneCount: number;
  errorCount: number;
  bytes: number;
  /** 0–1, tính cả chương đang tải dở. */
  progress: number;
  status: DownloadStatus;
  latest: number;
};

/** Gom task theo truyện, nhóm mới thêm gần nhất lên đầu. */
export function groupTasks(tasks: Record<string, DownloadTask>): DownloadGroup[] {
  const map = new Map<string, DownloadTask[]>();
  for (const task of Object.values(tasks)) {
    const list = map.get(task.mangaKey);
    if (list) {
      list.push(task);
    } else {
      map.set(task.mangaKey, [task]);
    }
  }
  const groups: DownloadGroup[] = [];
  for (const [mangaKey, list] of map) {
    list.sort(
      (a, b) =>
        (a.chapterNumber ?? Number.MAX_SAFE_INTEGER) - (b.chapterNumber ?? Number.MAX_SAFE_INTEGER) ||
        a.createdAt - b.createdAt,
    );
    const has = (status: DownloadStatus) => list.some(t => t.status === status);
    const status: DownloadStatus = has('downloading')
      ? 'downloading'
      : has('queued')
        ? 'queued'
        : has('error')
          ? 'error'
          : has('paused')
            ? 'paused'
            : 'done';
    const first = list[0];
    groups.push({
      mangaKey,
      sourceId: first.sourceId,
      mangaUrl: first.mangaUrl,
      title: first.mangaTitle,
      cover: list.find(t => t.cover)?.cover,
      content: first.content,
      tasks: list,
      doneCount: list.filter(t => t.status === 'done').length,
      errorCount: list.filter(t => t.status === 'error').length,
      bytes: list.reduce((sum, t) => sum + t.bytes, 0),
      progress:
        list.reduce(
          (sum, t) => sum + (t.status === 'done' ? 1 : t.total > 0 ? t.done / t.total : 0),
          0,
        ) / list.length,
      status,
      latest: Math.max(...list.map(t => t.createdAt)),
    });
  }
  return groups.sort((a, b) => b.latest - a.latest);
}

export function isActive(task: DownloadTask): boolean {
  return task.status === 'queued' || task.status === 'downloading';
}

export function isResumable(task: DownloadTask): boolean {
  return task.status === 'paused' || task.status === 'error';
}

function statusColor(status: DownloadStatus, c: Palette): string {
  switch (status) {
    case 'done':
      return c.success;
    case 'downloading':
      return c.accent;
    case 'error':
      return c.danger;
    case 'paused':
      return c.warning;
    default:
      return c.muted;
  }
}

// ─── Thẻ nhóm ───────────────────────────────────────────────────────────────

function GroupRowBase({
  group,
  expanded,
  headers,
  blur,
  onToggle,
  onPauseAll,
  onResumeAll,
  onRemove,
  onOpenManga,
}: {
  group: DownloadGroup;
  expanded: boolean;
  headers?: Record<string, string>;
  blur?: boolean;
  onToggle: (group: DownloadGroup) => void;
  onPauseAll: (group: DownloadGroup) => void;
  onResumeAll: (group: DownloadGroup) => void;
  onRemove: (group: DownloadGroup) => void;
  onOpenManga: (group: DownloadGroup) => void;
}) {
  const { c } = useTheme();
  const total = group.tasks.length;
  const canPause = group.tasks.some(isActive);
  const canResume = group.tasks.some(isResumable);
  const color = statusColor(group.status, c);
  const statusText = {
    downloading: 'Đang tải',
    queued: 'Đang chờ',
    error: `${group.errorCount} chương lỗi`,
    paused: 'Tạm dừng',
    done: 'Hoàn tất',
  }[group.status];

  return (
    <View style={[styles.group, { backgroundColor: c.surface }, expanded && styles.groupExpanded]}>
      <Pressable onPress={() => onToggle(group)} style={styles.groupHead}>
        <Cover uri={group.cover} headers={headers} blur={blur} style={styles.groupCover} />
        <View style={styles.flex}>
          <Text numberOfLines={2} style={[font.label, { color: c.text }]}>
            {group.title}
          </Text>
          <Text style={[font.caption, { color: c.muted }]}>
            {group.doneCount}/{total} chương đã tải · {formatBytes(group.bytes)}
          </Text>
          <View style={styles.statusLine}>
            <View style={[styles.statusDot, { backgroundColor: color }]} />
            <Text style={[font.caption, styles.bold, { color: c.textSecondary }]}>{statusText}</Text>
          </View>
          {group.status !== 'done' && <ProgressBar value={group.progress} color={color} />}
        </View>
        {expanded ? <ChevronUp size={20} color={c.muted} /> : <ChevronDown size={20} color={c.muted} />}
      </Pressable>
      <View style={styles.groupActions}>
        {canPause && (
          <Button title="Tạm dừng tất cả" icon={Pause} variant="secondary" small onPress={() => onPauseAll(group)} />
        )}
        {canResume && (
          <Button title="Tiếp tục tất cả" icon={Play} variant="secondary" small onPress={() => onResumeAll(group)} />
        )}
        <Button title="Xoá nhóm" icon={Trash2} variant="danger" small onPress={() => onRemove(group)} />
        <View style={styles.flex} />
        <IconButton
          icon={BookOpen}
          size={20}
          color={c.muted}
          onPress={() => onOpenManga(group)}
          accessibilityLabel="Mở trang truyện"
        />
      </View>
    </View>
  );
}

export const GroupRow = memo(GroupRowBase);

// ─── Dòng chương ────────────────────────────────────────────────────────────

function ChapterRowBase({
  task,
  last,
  onOpen,
  onPause,
  onResume,
  onRemove,
}: {
  task: DownloadTask;
  last: boolean;
  onOpen: (task: DownloadTask) => void;
  onPause: (task: DownloadTask) => void;
  onResume: (task: DownloadTask) => void;
  onRemove: (task: DownloadTask) => void;
}) {
  const { c } = useTheme();
  const color = statusColor(task.status, c);
  const pages = task.total > 0 ? `${task.done}/${task.total}` : '';
  const status = {
    queued: 'Đang chờ',
    downloading: pages ? `Đang tải ${pages}` : 'Đang lấy danh sách trang…',
    paused: pages ? `Tạm dừng · ${pages}` : 'Tạm dừng',
    done: `Hoàn tất · ${formatBytes(task.bytes)}`,
    error: 'Lỗi',
  }[task.status];
  const showBar = task.status !== 'done' && task.status !== 'error' && task.total > 0;

  return (
    <Pressable
      onPress={() => onOpen(task)}
      android_ripple={{ color: c.border }}
      style={[styles.chapter, { backgroundColor: c.surface }, last && styles.chapterLast]}
    >
      <View style={[styles.chapterDivider, { backgroundColor: c.border }]} />
      <View style={styles.chapterBody}>
        <View style={styles.flex}>
          <Text numberOfLines={1} style={[font.body, { color: c.text }]}>
            {task.chapterName}
          </Text>
          <Text numberOfLines={2} style={[font.caption, { color: task.status === 'error' ? c.danger : color }]}>
            {status}
            {task.status === 'error' && task.error ? `: ${task.error}` : ''}
          </Text>
          {showBar && <ProgressBar value={task.done / task.total} color={color} />}
        </View>
        {isActive(task) && (
          <IconButton icon={Pause} size={18} onPress={() => onPause(task)} accessibilityLabel="Tạm dừng" />
        )}
        {task.status === 'paused' && (
          <IconButton icon={Play} size={18} onPress={() => onResume(task)} accessibilityLabel="Tiếp tục" />
        )}
        {task.status === 'error' && (
          <IconButton icon={RotateCcw} size={18} onPress={() => onResume(task)} accessibilityLabel="Thử lại" />
        )}
        <IconButton
          icon={Trash2}
          size={18}
          color={c.muted}
          onPress={() => onRemove(task)}
          accessibilityLabel="Xoá chương"
        />
      </View>
    </Pressable>
  );
}

export const ChapterRow = memo(ChapterRowBase);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: '600' },
  group: {
    marginHorizontal: space.md,
    marginTop: space.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  groupExpanded: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  groupCover: { width: 56 },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  groupActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingBottom: space.sm,
  },
  chapter: { marginHorizontal: space.md },
  chapterLast: { borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg, paddingBottom: space.xs },
  chapterDivider: { height: StyleSheet.hairlineWidth, marginLeft: space.lg },
  chapterBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingLeft: space.lg,
    paddingRight: space.xs,
    paddingVertical: space.sm,
    minHeight: 56,
  },
});
