import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Sheet } from '../../components/Sheet';
import {
  ArrowDownUp,
  ArrowLeftRight,
  BookOpen,
  Deselect,
  EllipsisVertical,
  Eye,
  EyeOff,
  ListOrdered,
  SelectAll,
  UnfoldVertical,
} from '../../components/icons';
import { Button, Checkbox, Divider, EmptyState, Header, IconButton, ListItem, Screen, toast } from '../../components/ui';
import type { Chapter } from '../../sources/types';
import { markChaptersRead, useProgress } from '../../store/progress';
import { font, radius, space, useTheme } from '../../theme';
import { refreshUnread } from '../library/updates';
import { ChapterPicker, RangeFields, type RangeEnd } from './ChapterRange';
import { chapterDate } from './chapters';

type Row = { chapter: Chapter; position: number };

const ROW_HEIGHT = 52;
const NO_SELECTION: ReadonlySet<string> = new Set();

export function ChapterSelectDialog({
  visible,
  onClose,
  mangaKey,
  chapters,
  group,
  ascending: initialAscending,
}: {
  visible: boolean;
  onClose: () => void;
  mangaKey: string;
  chapters: Chapter[];
  group?: string | null;
  ascending: boolean;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const progress = useProgress(mangaKey);
  const listRef = useRef<FlatList<Row>>(null);
  const ordered = useMemo(() => [...chapters].reverse(), [chapters]);
  const [ascending, setAscending] = useState(initialAscending);
  const [numbered, setNumbered] = useState(false);
  const [selected, setSelected] = useState(NO_SELECTION);
  const [menuOpen, setMenuOpen] = useState(false);
  const [range, setRange] = useState({ visible: false, seq: 0, from: 0, to: 0 });

  const rows = useMemo(() => {
    const list = ordered.map((chapter, index): Row => ({ chapter, position: index + 1 }));
    return ascending ? list : list.reverse();
  }, [ordered, ascending]);

  const readCount = useMemo(
    () => chapters.reduce((n, ch) => (progress.read[ch.url] ? n + 1 : n), 0),
    [chapters, progress.read],
  );
  const allSelected = useMemo(
    () => ordered.length > 0 && ordered.every(ch => selected.has(ch.url)),
    [ordered, selected],
  );
  const selecting = selected.size > 0;

  const toggle = useCallback((url: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  }, []);

  const clear = () => setSelected(NO_SELECTION);

  const mark = (read: boolean) => {
    const urls = ordered.filter(ch => selected.has(ch.url)).map(ch => ch.url);
    markChaptersRead(mangaKey, urls, read);
    refreshUnread(mangaKey);
    toast(`Đã đánh dấu ${urls.length} chương là ${read ? 'đã đọc' : 'chưa đọc'}`);
    clear();
  };

  const invert = () => setSelected(prev => new Set(ordered.filter(ch => !prev.has(ch.url)).map(ch => ch.url)));

  const openRange = () => {
    let from = -1;
    let to = ordered.length - 1;
    ordered.forEach((ch, index) => {
      if (selected.has(ch.url)) {
        from = from < 0 ? index : from;
        to = index;
      }
    });
    setRange(r => ({ visible: true, seq: r.seq + 1, from: Math.max(0, from), to }));
  };

  const selectRange = (lo: number, hi: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      for (const ch of ordered.slice(lo, hi + 1)) {
        next.add(ch.url);
      }
      return next;
    });
  };

  const toggleOrder = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    setAscending(v => !v);
  };

  const fromMenu = (action: () => void) => () => {
    setMenuOpen(false);
    action();
  };

  const back = () => {
    if (menuOpen) {
      setMenuOpen(false);
    } else if (selecting) {
      clear();
    } else {
      onClose();
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: Row }) => (
      <SelectRow
        chapter={item.chapter}
        position={item.position}
        numbered={numbered}
        read={!!progress.read[item.chapter.url]}
        selected={selected.has(item.chapter.url)}
        onToggle={toggle}
      />
    ),
    [numbered, progress.read, selected, toggle],
  );

  const subtitle = [`${chapters.length} chương`, `${readCount} đã đọc`, group].filter(Boolean).join(' · ');

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={back} statusBarTranslucent>
      <Screen>
        <Header
          title={selecting ? `Đã chọn ${selected.size}` : 'Tiến độ đọc'}
          subtitle={subtitle}
          onBack={selecting ? clear : onClose}
          right={
            <>
              <IconButton
                icon={ArrowDownUp}
                color={c.onAppBar}
                onPress={toggleOrder}
                accessibilityLabel={ascending ? 'Xếp chương mới trước' : 'Xếp chương cũ trước'}
              />
              <IconButton
                icon={ListOrdered}
                color={c.onAppBar}
                active={numbered}
                onPress={() => setNumbered(v => !v)}
                accessibilityLabel={numbered ? 'Ẩn số thứ tự chương' : 'Hiện số thứ tự chương'}
              />
              <IconButton
                icon={EllipsisVertical}
                color={c.onAppBar}
                onPress={() => setMenuOpen(true)}
                accessibilityLabel="Tuỳ chọn khác"
              />
            </>
          }
        />

        <FlatList
          ref={listRef}
          data={rows}
          renderItem={renderItem}
          keyExtractor={item => item.chapter.url}
          getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
          initialNumToRender={20}
          style={styles.flex}
          ListEmptyComponent={<EmptyState icon={BookOpen} title="Chưa có chương nào" />}
        />

        {selecting && (
          <View style={[styles.actions, { backgroundColor: c.surface, borderTopColor: c.border }]}>
            <Button title="Chưa đọc" icon={EyeOff} variant="secondary" onPress={() => mark(false)} style={styles.flex} />
            <Button title="Đã đọc" icon={Eye} onPress={() => mark(true)} style={styles.flex} />
          </View>
        )}

        {menuOpen && (
          <View style={StyleSheet.absoluteFill}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} accessibilityLabel="Đóng menu" />
            <View style={[styles.menu, { top: insets.top + space.xs, backgroundColor: c.elevated }]}>
              <ListItem icon={Eye} title="Đánh dấu đã đọc" disabled={!selecting} onPress={fromMenu(() => mark(true))} />
              <ListItem
                icon={EyeOff}
                title="Đánh dấu chưa đọc"
                disabled={!selecting}
                onPress={fromMenu(() => mark(false))}
              />
              <Divider />
              <ListItem
                icon={allSelected ? Deselect : SelectAll}
                title={allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                disabled={!ordered.length}
                onPress={fromMenu(() => setSelected(allSelected ? NO_SELECTION : new Set(ordered.map(ch => ch.url))))}
              />
              <ListItem icon={ArrowLeftRight} title="Đảo lựa chọn" disabled={!ordered.length} onPress={fromMenu(invert)} />
              <ListItem icon={UnfoldVertical} title="Chọn khoảng" disabled={!ordered.length} onPress={fromMenu(openRange)} />
            </View>
          </View>
        )}
      </Screen>

      {range.seq > 0 && (
        <RangeSheet
          key={range.seq}
          visible={range.visible}
          onClose={() => setRange(r => ({ ...r, visible: false }))}
          chapters={ordered}
          initialFrom={range.from}
          initialTo={range.to}
          onConfirm={selectRange}
        />
      )}
    </Modal>
  );
}

const SelectRow = memo(function SelectRowItem({
  chapter,
  position,
  numbered,
  read,
  selected,
  onToggle,
}: {
  chapter: Chapter;
  position: number;
  numbered: boolean;
  read: boolean;
  selected: boolean;
  onToggle: (url: string) => void;
}) {
  const { c } = useTheme();
  const date = chapterDate(chapter);
  const toggle = () => onToggle(chapter.url);
  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      android_ripple={{ color: c.border }}
      style={[styles.row, selected && { backgroundColor: c.accentSoft }]}
    >
      <Checkbox checked={selected} onChange={toggle} />
      <Text numberOfLines={1} style={[font.body, styles.flex, { color: c.text }, read && styles.read]}>
        {numbered ? `${position}. ${chapter.name}` : chapter.name}
      </Text>
      {read && <Eye size={16} color={c.muted} accessibilityLabel="Đã đọc" />}
      {!!date && (
        <Text numberOfLines={1} style={[font.caption, styles.date, { color: c.muted }, read && styles.read]}>
          {date}
        </Text>
      )}
    </Pressable>
  );
});

function RangeSheet({
  visible,
  onClose,
  chapters,
  initialFrom,
  initialTo,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  chapters: Chapter[];
  initialFrom: number;
  initialTo: number;
  onConfirm: (lo: number, hi: number) => void;
}) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [picking, setPicking] = useState<RangeEnd | null>(null);
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);

  if (picking) {
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
        <ChapterPicker
          end={picking}
          chapters={chapters}
          value={picking === 'from' ? from : to}
          onBack={() => setPicking(null)}
          onPick={choose}
        />
      </Sheet>
    );
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Chọn khoảng"
      subtitle="Thêm các chương trong khoảng vào lựa chọn"
      scroll={false}
    >
      <RangeFields chapters={chapters} from={from} to={to} onPick={setPicking} />
      <View style={styles.sheetActions}>
        <Button title="Huỷ" variant="secondary" onPress={onClose} style={styles.flex} />
        <Button
          title={`Chọn ${hi - lo + 1} chương`}
          onPress={() => {
            onConfirm(lo, hi);
            onClose();
          }}
          style={styles.flex}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    height: ROW_HEIGHT,
    paddingHorizontal: space.lg,
  },
  read: { opacity: 0.45 },
  date: { maxWidth: 120 },
  actions: {
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  menu: {
    position: 'absolute',
    right: space.xs,
    width: 240,
    paddingVertical: space.xs,
    borderRadius: radius.sm,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  sheetActions: { flexDirection: 'row', gap: space.sm, padding: space.lg },
});
