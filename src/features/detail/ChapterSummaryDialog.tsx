import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Dialog } from '../../components/Sheet';
import { ProgressBar } from '../../components/ui';
import { formatRelative } from '../../lib/time';
import type { Chapter } from '../../sources/types';
import { useProgress } from '../../store/progress';
import { useDownloads } from '../../store/useDownloads';
import { font, space, useTheme } from '../../theme';
import { scanlatorGroups } from './chapters';

export function ChapterSummaryDialog({
  visible,
  onClose,
  mangaKey,
  chapters,
}: {
  visible: boolean;
  onClose: () => void;
  mangaKey: string;
  chapters: Chapter[];
}) {
  const { c } = useTheme();
  const progress = useProgress(mangaKey);
  const tasks = useDownloads(s => s.tasks);

  const summary = useMemo(() => {
    const urls = new Set(chapters.map(ch => ch.url));
    const read = chapters.filter(ch => progress.read[ch.url]).length;
    let downloaded = 0;
    let downloading = 0;
    for (const task of Object.values(tasks)) {
      if (task.mangaKey !== mangaKey || !urls.has(task.chapterUrl)) {
        continue;
      }
      if (task.status === 'done') {
        downloaded++;
      } else if (task.status !== 'error') {
        downloading++;
      }
    }
    return { total: chapters.length, read, downloaded, downloading, groups: scanlatorGroups(chapters).length };
  }, [chapters, progress.read, tasks, mangaKey]);

  const latest = chapters[0];
  const last = progress.last;
  const ratio = summary.total ? summary.read / summary.total : 0;

  const rows: [string, string][] = [
    ['Tổng số chương', String(summary.total)],
    ['Đã đọc', `${summary.read} (${Math.round(ratio * 100)}%)`],
    ['Chưa đọc', String(summary.total - summary.read)],
    ['Đã tải', summary.downloading ? `${summary.downloaded} · đang tải ${summary.downloading}` : String(summary.downloaded)],
  ];
  if (summary.groups > 1) {
    rows.push(['Nhóm dịch', String(summary.groups)]);
  }
  if (latest) {
    rows.push(['Mới nhất', latest.time ? `${latest.name} · ${formatRelative(latest.time)}` : latest.name]);
  }
  if (last) {
    const position = last.total ? ` · ${last.page + 1}/${last.total}` : '';
    rows.push(['Đang đọc', `${last.chapterName}${position}`]);
  }

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title="Tóm tắt chương"
      actions={[{ label: 'Đóng', variant: 'primary', onPress: onClose }]}
    >
      <ProgressBar value={ratio} />
      <View style={styles.rows}>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={[font.body, { color: c.textSecondary }]}>{label}</Text>
            <Text numberOfLines={2} style={[font.body, styles.value, { color: c.text }]}>
              {value}
            </Text>
          </View>
        ))}
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  rows: { gap: space.sm, marginTop: space.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.lg },
  value: { flexShrink: 1, textAlign: 'right', fontWeight: '600' },
});
