import { CircleAlert, CircleCheck, CirclePause, Clock3, Download } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Chapter } from '../../sources/types';
import { useChapterDownload } from '../../store/useDownloads';
import { font, space, useTheme } from '../../theme';
import { chapterMeta } from './chapters';

type Props = {
  chapter: Chapter;
  /** Vị trí trong danh sách gốc (mới nhất trước). */
  index: number;
  mangaKey: string;
  read: boolean;
  /** Chương đang đọc dở: phần trăm đã đọc nếu biết tổng số trang. */
  current?: { percent?: number };
  onPress: (chapter: Chapter, index: number) => void;
  onLongPress: (chapter: Chapter, index: number) => void;
};

function ChapterRowBase({ chapter, index, mangaKey, read, current, onPress, onLongPress }: Props) {
  const { c } = useTheme();
  const meta = chapterMeta(chapter);
  return (
    <Pressable
      onPress={() => onPress(chapter, index)}
      onLongPress={() => onLongPress(chapter, index)}
      android_ripple={{ color: c.border }}
      style={styles.row}
    >
      <View style={[styles.body, read && !current && styles.read]}>
        <View style={styles.titleRow}>
          {current && <View style={[styles.dot, { backgroundColor: c.accent }]} />}
          <Text
            numberOfLines={2}
            style={[font.body, styles.title, { color: current ? c.accent : c.text }, current && styles.bold]}
          >
            {chapter.name}
          </Text>
        </View>
        {(!!meta || current) && (
          <Text numberOfLines={1} style={[font.caption, { color: c.muted }]}>
            {current && (
              <Text style={[styles.bold, { color: c.accent }]}>
                {current.percent !== undefined ? `Đang đọc ${current.percent}%` : 'Đang đọc'}
                {meta ? ' · ' : ''}
              </Text>
            )}
            {meta}
          </Text>
        )}
      </View>
      <DownloadState mangaKey={mangaKey} chapterUrl={chapter.url} />
    </Pressable>
  );
}

export const ChapterRow = memo(ChapterRowBase);

/** Icon trạng thái tải của chương; chưa tải thì không hiện gì. */
function DownloadState({ mangaKey, chapterUrl }: { mangaKey: string; chapterUrl: string }) {
  const { c } = useTheme();
  const task = useChapterDownload(mangaKey, chapterUrl);
  if (!task) {
    return null;
  }
  switch (task.status) {
    case 'done':
      return <CircleCheck size={18} color={c.success} accessibilityLabel="Đã tải" />;
    case 'error':
      return <CircleAlert size={18} color={c.danger} accessibilityLabel="Tải lỗi" />;
    case 'paused':
      return <CirclePause size={18} color={c.muted} accessibilityLabel="Đã tạm dừng tải" />;
    case 'queued':
      return <Clock3 size={18} color={c.muted} accessibilityLabel="Đang chờ tải" />;
    default:
      return (
        <View style={styles.progress}>
          <Download size={16} color={c.accent} />
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
    gap: space.md,
    minHeight: 58,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
  },
  body: { flex: 1, gap: 3 },
  read: { opacity: 0.45 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { flex: 1 },
  bold: { fontWeight: '700' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  percent: { fontSize: 11, fontWeight: '700', minWidth: 30 },
});
