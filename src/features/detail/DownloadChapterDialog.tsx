import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Sheet } from '../../components/Sheet';
import { ArrowLeft, ChevronRight, Download } from '../../components/icons';
import { Button, IconButton, Radio, toast } from '../../components/ui';
import type { Chapter } from '../../sources/types';
import { useProgress } from '../../store/progress';
import { downloadId, useDownloads, type DownloadManga } from '../../store/useDownloads';
import { font, radius, space, useTheme } from '../../theme';
import { chapterMeta } from './chapters';

type Mode = 'all' | 'unread' | 'missing' | 'range';

const ROW_HEIGHT = 56;

/**
 * "Download Chapters": chọn nhanh tất cả / chưa đọc / chưa tải, hoặc một
 * khoảng chương. Chương đã tải hoặc đang trong hàng đợi được bỏ qua.
 */
export function DownloadChapterDialog({
  visible,
  onClose,
  manga,
  chapters,
}: {
  visible: boolean;
  onClose: () => void;
  manga: DownloadManga;
  /** Mới nhất trước, như MangaDetail.chapters. */
  chapters: Chapter[];
}) {
  const { c } = useTheme();
  const { height } = useWindowDimensions();
  const tasks = useDownloads(s => s.tasks);
  const progress = useProgress(manga.mangaKey);
  // Tải theo thứ tự đọc: cũ trước.
  const ordered = useMemo(() => [...chapters].reverse(), [chapters]);
  const [mode, setMode] = useState<Mode>('all');
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(Math.max(0, ordered.length - 1));
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);

  const { counts, selected, pending } = useMemo(() => {
    const queuedOrDone = (ch: Chapter) => {
      const status = tasks[downloadId(manga.mangaKey, ch.url)]?.status;
      return !!status && status !== 'error';
    };
    const unread = ordered.filter(ch => !progress.read[ch.url]);
    const missing = ordered.filter(ch => !queuedOrDone(ch));
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    const range = ordered.slice(lo, hi + 1);
    const list = { all: ordered, unread, missing, range }[mode];
    return {
      counts: { all: ordered.length, unread: unread.length, missing: missing.length, range: range.length },
      selected: list,
      pending: list.filter(ch => !queuedOrDone(ch)),
    };
  }, [ordered, tasks, progress.read, manga.mangaKey, mode, from, to]);

  const skipped = selected.length - pending.length;

  const confirmDownload = () => {
    const added = useDownloads.getState().enqueue(manga, pending);
    toast(added ? `Đã thêm ${added} chương vào hàng đợi tải` : 'Các chương này đã có trong hàng đợi tải');
    onClose();
  };

  if (picking) {
    const value = picking === 'from' ? from : to;
    const choose = (index: number) => {
      if (picking === 'from') {
        setFrom(index);
      } else {
        setTo(index);
      }
      setPicking(null);
    };
    return (
      <Sheet visible={visible} onClose={onClose} scroll={false}>
        <View style={styles.pickHeader}>
          <IconButton icon={ArrowLeft} onPress={() => setPicking(null)} accessibilityLabel="Quay lại" />
          <Text style={[font.heading, styles.flex, { color: c.text }]}>
            {picking === 'from' ? 'Từ chương' : 'Đến chương'}
          </Text>
        </View>
        <FlatList
          data={ordered}
          keyExtractor={item => item.url}
          style={{ height: height * 0.6 }}
          initialScrollIndex={Math.max(0, value - 3)}
          getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
          renderItem={({ item, index }) => {
            const active = index === value;
            return (
              <Pressable
                onPress={() => choose(index)}
                android_ripple={{ color: c.border }}
                style={[styles.pickRow, active && { backgroundColor: c.accentSoft }]}
              >
                <Text style={[font.caption, styles.pickIndex, { color: c.muted }]}>{index + 1}</Text>
                <View style={styles.flex}>
                  <Text numberOfLines={1} style={[font.body, { color: active ? c.accent : c.text }]}>
                    {item.name}
                  </Text>
                  {!!chapterMeta(item) && (
                    <Text numberOfLines={1} style={[font.caption, { color: c.muted }]}>
                      {chapterMeta(item)}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      </Sheet>
    );
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Tải chương" subtitle={manga.mangaTitle} scroll={false}>
      <ScrollView bounces={false} style={{ maxHeight: height * 0.55 }}>
        <Radio
          selected={mode === 'all'}
          label="Tất cả chương"
          description={`${counts.all} chương`}
          onPress={() => setMode('all')}
        />
        <Radio
          selected={mode === 'unread'}
          label="Chương chưa đọc"
          description={`${counts.unread} chương`}
          onPress={() => setMode('unread')}
        />
        <Radio
          selected={mode === 'missing'}
          label="Chương chưa tải"
          description={`${counts.missing} chương`}
          onPress={() => setMode('missing')}
        />
        <Radio
          selected={mode === 'range'}
          label="Chọn khoảng"
          description="Chọn khoảng chương cần tải"
          onPress={() => setMode('range')}
        />
        {mode === 'range' && ordered.length > 0 && (
          <View style={[styles.range, { backgroundColor: c.surfaceAlt }]}>
            <RangeRow label="Từ chương" chapter={ordered[from]} onPress={() => setPicking('from')} />
            <View style={[styles.rangeDivider, { backgroundColor: c.border }]} />
            <RangeRow label="Đến chương" chapter={ordered[to]} onPress={() => setPicking('to')} />
          </View>
        )}
      </ScrollView>

      <View style={[styles.summary, { borderTopColor: c.border }]}>
        <Text style={[font.label, { color: c.text }]}>Sẽ tải {pending.length} chương</Text>
        {skipped > 0 && (
          <Text style={[font.caption, { color: c.muted }]}>
            Bỏ qua {skipped} chương đã tải hoặc đang trong hàng đợi
          </Text>
        )}
      </View>
      <View style={styles.actions}>
        <Button title="Huỷ" variant="secondary" onPress={onClose} style={styles.flex} />
        <Button
          title={pending.length ? `Tải ${pending.length} chương` : 'Tải'}
          icon={Download}
          disabled={!pending.length}
          onPress={confirmDownload}
          style={styles.flex}
        />
      </View>
    </Sheet>
  );
}

function RangeRow({ label, chapter, onPress }: { label: string; chapter?: Chapter; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} android_ripple={{ color: c.border }} style={styles.rangeRow}>
      <Text style={[font.caption, styles.rangeLabel, { color: c.muted }]}>{label}</Text>
      <Text numberOfLines={1} style={[font.body, styles.flex, { color: c.text }]}>
        {chapter?.name ?? '—'}
      </Text>
      <ChevronRight size={18} color={c.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  range: { marginHorizontal: space.lg, marginBottom: space.sm, borderRadius: radius.md, overflow: 'hidden' },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 50, paddingHorizontal: space.md },
  rangeLabel: { width: 76 },
  rangeDivider: { height: StyleSheet.hairlineWidth },
  summary: {
    gap: 2,
    marginTop: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actions: { flexDirection: 'row', gap: space.sm, padding: space.lg },
  pickHeader: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.xs },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    height: ROW_HEIGHT,
    paddingHorizontal: space.lg,
  },
  pickIndex: { width: 36, textAlign: 'right' },
});
