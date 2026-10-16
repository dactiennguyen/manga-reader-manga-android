import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CircleAlert, CircleCheck, CirclePause, Clock3, Download } from '../../components/icons';
import type { Chapter } from '../../sources/types';
import { useChapterDownload } from '../../store/useDownloads';
import { font, space, useTheme } from '../../theme';
import { chapterDate } from './chapters';

type Props = {
  chapter: Chapter;
  index: number;
  mangaKey: string;
  read: boolean;
  current?: { percent?: number };
  onPress: (chapter: Chapter, index: number) => void;
  onLongPress: (chapter: Chapter, index: number) => void;
};

function ChapterRowBase({ chapter, index, mangaKey, read, current, onPress, onLongPress }: Props) {
  const { c } = useTheme();
  const date = chapterDate(chapter);
  return (
    <Pressable
      onPress={() => onPress(chapter, index)}
      onLongPress={() => onLongPress(chapter, index)}
      android_ripple={{ color: c.border }}
      style={[styles.row, { borderBottomColor: c.border }]}
    >
      <View style={[styles.body, read && !current && styles.read]}>
        {current && <View style={[styles.dot, { backgroundColor: c.accent }]} />}
        <Text
          numberOfLines={1}
          style={[font.body, styles.title, { color: current ? c.accent : c.text }, current && styles.bold]}
        >
          {chapter.name}
          {!!chapter.scanlator && (
            <Text style={[font.caption, styles.normal, { color: c.muted }]}>{`  ${chapter.scanlator}`}</Text>
          )}
        </Text>
        {current && (
          <Text
            accessibilityLabel={current.percent !== undefined ? `Đang đọc ${current.percent}%` : 'Đang đọc'}
            style={[font.caption, styles.bold, { color: c.accent }]}
          >
            {current.percent !== undefined ? `${current.percent}%` : 'Đang đọc'}
          </Text>
        )}
        {!!date && (
          <Text numberOfLines={1} style={[font.caption, styles.date, { color: c.muted }]}>
            {date}
          </Text>
        )}
      </View>
      <DownloadState mangaKey={mangaKey} chapterUrl={chapter.url} />
    </Pressable>
  );
}

export const ChapterRow = memo(ChapterRowBase);

function DownloadState({ mangaKey, chapterUrl }: { mangaKey: string; chapterUrl: string }) {
  const { c } = useTheme();
  const task = useChapterDownload(mangaKey, chapterUrl);
  if (!task) {
    return null;
  }
  switch (task.status) {
    case 'done':
      return <CircleCheck size={16} color={c.success} accessibilityLabel="Đã tải" />;
    case 'error':
      return <CircleAlert size={16} color={c.danger} accessibilityLabel="Tải lỗi" />;
    case 'paused':
      return <CirclePause size={16} color={c.muted} accessibilityLabel="Đã tạm dừng tải" />;
    case 'queued':
      return <Clock3 size={16} color={c.muted} accessibilityLabel="Đang chờ tải" />;
    default:
      return (
        <View style={styles.progress}>
          <Download size={14} color={c.accent} />
          <Text style={[styles.percent, { color: c.accent }]}>
            {task.total ? `${Math.floor((task.done / task.total) * 100)}%` : '…'}
          </Text>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 50,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  read: { opacity: 0.45 },
  title: { flex: 1 },
  bold: { fontWeight: '700' },
  normal: { fontWeight: '400' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  date: { flexShrink: 0, marginLeft: space.xs },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  percent: { fontSize: 11, fontWeight: '700', minWidth: 28 },
});
