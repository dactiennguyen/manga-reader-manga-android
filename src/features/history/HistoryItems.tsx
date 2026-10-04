import { X } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Cover } from '../../components/MangaCard';
import { IconButton } from '../../components/ui';
import { displayUrl } from '../../lib/url';
import { formatTime } from '../../lib/time';
import { useProgress } from '../../store/progress';
import type { ReadingEntry, WebEntry } from '../../store/useHistory';
import { font, space, useTheme } from '../../theme';
import { Favicon } from '../../components/Favicon';

function ReadingHistoryItemBase({
  entry,
  headers,
  blur,
  onOpen,
  onOpenDetail,
  onRemove,
}: {
  entry: ReadingEntry;
  headers?: Record<string, string>;
  blur?: boolean;
  onOpen: (entry: ReadingEntry) => void;
  onOpenDetail: (entry: ReadingEntry) => void;
  onRemove: (entry: ReadingEntry) => void;
}) {
  const { c } = useTheme();
  const progress = useProgress(entry.key);
  const last = progress.last?.chapterUrl === entry.chapterUrl ? progress.last : undefined;
  const position = last
    ? entry.content === 'novel'
      ? `Đoạn ${last.page + 1}${last.total ? `/${last.total}` : ''}`
      : `Trang ${last.page + 1}${last.total ? `/${last.total}` : ''}`
    : undefined;

  return (
    <Pressable
      onPress={() => onOpen(entry)}
      android_ripple={{ color: c.border }}
      accessibilityHint="Đọc tiếp chương này"
      style={styles.row}
    >
      <Pressable onPress={() => onOpenDetail(entry)} hitSlop={4} accessibilityLabel={`Mở ${entry.title}`}>
        <Cover uri={entry.cover} headers={headers} blur={blur} style={styles.cover} />
      </Pressable>
      <View style={styles.body}>
        <Text numberOfLines={2} style={[font.label, { color: c.text }]}>
          {entry.title}
        </Text>
        <Text numberOfLines={1} style={[font.caption, { color: c.textSecondary }]}>
          {entry.chapterName}
        </Text>
        <Text style={[font.caption, { color: c.muted }]}>
          {position ? `${position} · ` : ''}
          {formatTime(entry.at)}
        </Text>
      </View>
      <IconButton
        icon={X}
        size={18}
        color={c.muted}
        onPress={() => onRemove(entry)}
        accessibilityLabel={`Xoá ${entry.title} khỏi lịch sử`}
      />
    </Pressable>
  );
}

export const ReadingHistoryItem = memo(ReadingHistoryItemBase);

function WebHistoryItemBase({
  entry,
  onOpen,
  onRemove,
}: {
  entry: WebEntry;
  onOpen: (entry: WebEntry) => void;
  onRemove: (entry: WebEntry) => void;
}) {
  const { c } = useTheme();
  const short = displayUrl(entry.url);
  return (
    <Pressable onPress={() => onOpen(entry)} android_ripple={{ color: c.border }} style={styles.webRow}>
      <Favicon url={entry.url} size={34} tile />
      <View style={styles.body}>
        <Text numberOfLines={1} style={[font.body, { color: c.text }]}>
          {entry.title || short}
        </Text>
        <Text numberOfLines={1} style={[font.caption, { color: c.muted }]}>
          {formatTime(entry.at)} · {short}
        </Text>
      </View>
      <IconButton
        icon={X}
        size={18}
        color={c.muted}
        onPress={() => onRemove(entry)}
        accessibilityLabel="Xoá khỏi lịch sử"
      />
    </Pressable>
  );
}

export const WebHistoryItem = memo(WebHistoryItemBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.lg,
    paddingRight: space.xs,
    paddingVertical: space.sm,
  },
  webRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.lg,
    paddingRight: space.xs,
    minHeight: 60,
  },
  cover: { width: 52 },
  body: { flex: 1, gap: 2 },
});
