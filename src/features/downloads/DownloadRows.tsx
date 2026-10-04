import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Cover } from '../../components/MangaCard';
import { CircleCheck, Pause, Play, RotateCcw, Trash2 } from '../../components/icons';
import { IconButton, ProgressBar } from '../../components/ui';
import { formatBytes } from '../../lib/format';
import type { ContentType } from '../../sources/types';
import type { DownloadStatus, DownloadTask } from '../../store/useDownloads';
import { font, radius, space, useTheme, type Palette } from '../../theme';

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
export function groupTasks(tasks: DownloadTask[]): DownloadGroup[] {
  const map = new Map<string, DownloadTask[]>();
  for (const task of tasks) {
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

/** Dòng phụ dưới tên truyện ("Downloaded 1 chapters" của app gốc). */
export function groupSummary(group: DownloadGroup): string {
  const total = group.tasks.length;
  switch (group.status) {
    case 'done':
      return `Đã tải ${total} chương · ${formatBytes(group.bytes)}`;
    case 'downloading':
    case 'queued':
      return `Đang tải ${group.doneCount}/${total} chương…`;
    case 'paused':
      return `Tạm dừng · ${group.doneCount}/${total} chương`;
    default:
      return `Lỗi ${group.errorCount} chương · đã tải ${group.doneCount}/${total}`;
  }
}

// ─── Vòng tiến độ ───────────────────────────────────────────────────────────

const RING = 36;
const RING_STROKE = 3;

function ProgressRing({ value, color, track }: { value: number; color: string; track: string }) {
  const r = (RING - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const center = RING / 2;
  return (
    <Svg width={RING} height={RING} style={styles.ring}>
      <Circle cx={center} cy={center} r={r} stroke={track} strokeWidth={RING_STROKE} fill="none" />
      <Circle
        cx={center}
        cy={center}
        r={r}
        stroke={color}
        strokeWidth={RING_STROKE}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={circumference * (1 - Math.min(1, Math.max(0, value)))}
        transform={`rotate(-90 ${center} ${center})`}
      />
    </Svg>
  );
}

// ─── Dòng truyện ────────────────────────────────────────────────────────────

function DownloadMangaRowBase({
  group,
  headers,
  blur,
  onOpen,
  onLongPress,
  onPause,
  onResume,
}: {
  group: DownloadGroup;
  headers?: Record<string, string>;
  blur?: boolean;
  onOpen: (group: DownloadGroup) => void;
  onLongPress: (group: DownloadGroup) => void;
  onPause: (group: DownloadGroup) => void;
  onResume: (group: DownloadGroup) => void;
}) {
  const { c } = useTheme();
  const active = group.status === 'downloading' || group.status === 'queued';

  let trailing;
  if (group.status === 'done') {
    trailing = (
      <View style={styles.trailing}>
        <CircleCheck size={24} color={c.textSecondary} />
      </View>
    );
  } else if (active) {
    trailing = (
      <Pressable
        onPress={() => onPause(group)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Tạm dừng, đã tải ${Math.round(group.progress * 100)}%`}
        style={styles.trailing}
      >
        <ProgressRing value={group.progress} color={c.accent} track={c.surfaceAlt} />
        <Pause size={14} color={c.text} fill={c.text} />
      </Pressable>
    );
  } else {
    const error = group.status === 'error';
    trailing = (
      <IconButton
        icon={error ? RotateCcw : Play}
        color={error ? c.danger : c.text}
        onPress={() => onResume(group)}
        accessibilityLabel={error ? 'Thử lại chương lỗi' : 'Tiếp tục tải'}
      />
    );
  }

  return (
    <Pressable
      onPress={() => onOpen(group)}
      onLongPress={() => onLongPress(group)}
      android_ripple={{ color: c.border }}
      accessibilityHint="Xem các chương đã tải"
      style={styles.row}
    >
      <Cover uri={group.cover} headers={headers} blur={blur} style={styles.cover} />
      <View style={styles.flex}>
        <Text numberOfLines={2} style={[styles.title, { color: c.text }]}>
          {group.title}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.summary, { color: group.status === 'error' ? c.danger : c.textSecondary }]}
        >
          {groupSummary(group)}
        </Text>
      </View>
      {trailing}
    </Pressable>
  );
}

export const DownloadMangaRow = memo(DownloadMangaRowBase);

// ─── Dòng chương (trong sheet của truyện) ───────────────────────────────────

function ChapterRowBase({
  task,
  onOpen,
  onPause,
  onResume,
  onRemove,
}: {
  task: DownloadTask;
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
    downloading: pages ? `Đang tải ${pages} trang` : 'Đang lấy danh sách trang…',
    paused: pages ? `Tạm dừng · ${pages}` : 'Tạm dừng',
    done: `Đã tải · ${formatBytes(task.bytes)}`,
    error: 'Lỗi',
  }[task.status];
  const showBar = task.status !== 'done' && task.status !== 'error' && task.total > 0;

  return (
    <Pressable onPress={() => onOpen(task)} android_ripple={{ color: c.border }} style={styles.chapter}>
      <View style={styles.flex}>
        <Text numberOfLines={1} style={[font.body, { color: c.text }]}>
          {task.chapterName}
        </Text>
        <Text numberOfLines={2} style={[font.caption, { color: task.status === 'done' ? c.muted : color }]}>
          {status}
          {task.status === 'error' && task.error ? `: ${task.error}` : ''}
        </Text>
        {showBar && <ProgressBar value={task.done / task.total} color={color} />}
      </View>
      {task.status === 'done' && <CircleCheck size={18} color={c.muted} style={styles.chapterCheck} />}
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
    </Pressable>
  );
}

export const ChapterRow = memo(ChapterRowBase);

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 3 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.lg,
    paddingRight: space.sm,
    paddingVertical: space.sm,
  },
  cover: { width: 56, height: 76, borderRadius: radius.sm },
  title: { fontSize: 15, fontWeight: '700' },
  summary: { fontSize: 14 },
  trailing: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', top: (44 - RING) / 2, left: (44 - RING) / 2 },
  chapter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingLeft: space.lg,
    paddingRight: space.xs,
    paddingVertical: space.sm,
    minHeight: 56,
  },
  chapterCheck: { marginHorizontal: space.xs },
});
