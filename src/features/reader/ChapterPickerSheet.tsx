import { memo, useCallback, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View, type ListRenderItemInfo } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Sheet } from '../../components/Sheet';
import { Download, ListOrdered } from '../../components/icons';
import { EmptyState } from '../../components/ui';
import type { Chapter } from '../../sources/types';
import { useProgress } from '../../store/progress';
import { useDownloads, type DownloadTask } from '../../store/useDownloads';
import { font, space, useTheme } from '../../theme';
import { findChapterIndex } from './useReaderData';

const ROW_HEIGHT = 60;

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Mới nhất trước. */
  chapters: readonly Chapter[];
  currentUrl: string;
  mangaKey: string;
  onPick: (chapter: Chapter) => void;
};

/** "Pick chapter" (SelectChapterDialog) — dùng chung cho reader manga và novel. */
export function ChapterPickerSheet({ visible, onClose, chapters, currentUrl, mangaKey, onPick }: Props) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Chọn chương"
      subtitle={chapters.length ? `${chapters.length} chương` : undefined}
      scroll={false}
    >
      {chapters.length ? (
        <ChapterList chapters={chapters} currentUrl={currentUrl} mangaKey={mangaKey} onPick={onPick} />
      ) : (
        <EmptyState
          icon={ListOrdered}
          title="Chưa có danh sách chương"
          message="Không tải được danh sách chương của truyện này. Thử mở lại trang truyện."
          style={styles.empty}
        />
      )}
    </Sheet>
  );
}

function downloadedUrls(tasks: Record<string, DownloadTask>, mangaKey: string): string[] {
  return Object.values(tasks)
    .filter(task => task.mangaKey === mangaKey && task.status === 'done')
    .map(task => task.chapterUrl);
}

/** Tách riêng để chỉ đăng ký tiến độ/tải xuống khi sheet đang mở. */
function ChapterList({
  chapters,
  currentUrl,
  mangaKey,
  onPick,
}: Omit<Props, 'visible' | 'onClose'>) {
  const { height } = useWindowDimensions();
  const { read } = useProgress(mangaKey);
  const downloaded = useDownloads(useShallow(state => downloadedUrls(state.tasks, mangaKey)));
  const downloadedSet = useMemo(() => new Set(downloaded), [downloaded]);
  const currentIndex = useMemo(() => findChapterIndex(chapters, currentUrl), [chapters, currentUrl]);

  const listHeight = Math.min(chapters.length * ROW_HEIGHT, height * 0.65);
  const visibleRows = Math.max(1, Math.floor(listHeight / ROW_HEIGHT));
  // Đưa chương đang đọc vào giữa danh sách.
  const initialIndex =
    currentIndex > 0
      ? Math.max(0, Math.min(currentIndex - Math.floor(visibleRows / 2), chapters.length - visibleRows))
      : 0;

  const getItemLayout = useCallback(
    (_: ArrayLike<Chapter> | null | undefined, index: number) => ({
      length: ROW_HEIGHT,
      offset: ROW_HEIGHT * index,
      index,
    }),
    [],
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Chapter>) => (
      <ChapterRow
        chapter={item}
        current={index === currentIndex}
        read={!!read[item.url]}
        downloaded={downloadedSet.has(item.url)}
        onPick={onPick}
      />
    ),
    [currentIndex, read, downloadedSet, onPick],
  );

  return (
    <FlatList
      style={{ height: listHeight }}
      data={chapters}
      renderItem={renderItem}
      keyExtractor={(item, index) => `${index}:${item.url}`}
      getItemLayout={getItemLayout}
      initialScrollIndex={initialIndex}
      initialNumToRender={visibleRows + 4}
    />
  );
}

const ChapterRow = memo(function ChapterRowView({
  chapter,
  current,
  read,
  downloaded,
  onPick,
}: {
  chapter: Chapter;
  current: boolean;
  read: boolean;
  downloaded: boolean;
  onPick: (chapter: Chapter) => void;
}) {
  const { c } = useTheme();
  const meta = [chapter.date, chapter.scanlator].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={() => onPick(chapter)}
      android_ripple={{ color: c.border }}
      style={[styles.row, current && { backgroundColor: c.accentSoft }]}
    >
      <View style={[styles.rowText, read && !current && styles.dim]}>
        <Text numberOfLines={1} style={[font.body, current && styles.bold, { color: current ? c.accent : c.text }]}>
          {chapter.name}
        </Text>
        {!!meta && (
          <Text numberOfLines={1} style={[font.caption, { color: c.muted }]}>
            {meta}
          </Text>
        )}
      </View>
      {current && <Text style={[font.caption, styles.bold, { color: c.accent }]}>Đang đọc</Text>}
      {downloaded && <Download size={18} color={c.success} />}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  empty: { flex: 0, paddingVertical: space.xl * 2 },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
  },
  rowText: { flex: 1, gap: 2 },
  dim: { opacity: 0.45 },
  bold: { fontWeight: '700' },
});
