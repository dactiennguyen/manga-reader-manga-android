import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { ArrowLeft, ChevronRight } from '../../components/icons';
import { IconButton } from '../../components/ui';
import type { Chapter } from '../../sources/types';
import { font, radius, space, useTheme } from '../../theme';
import { chapterMeta } from './chapters';

export type RangeEnd = 'from' | 'to';

const ROW_HEIGHT = 56;

export function RangeFields({
  chapters,
  from,
  to,
  onPick,
}: {
  chapters: Chapter[];
  from: number;
  to: number;
  onPick: (end: RangeEnd) => void;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.range, { backgroundColor: c.surfaceAlt }]}>
      <RangeRow label="Từ chương" chapter={chapters[from]} onPress={() => onPick('from')} />
      <View style={[styles.rangeDivider, { backgroundColor: c.border }]} />
      <RangeRow label="Đến chương" chapter={chapters[to]} onPress={() => onPick('to')} />
    </View>
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

export function ChapterPicker({
  end,
  chapters,
  value,
  onBack,
  onPick,
}: {
  end: RangeEnd;
  chapters: Chapter[];
  value: number;
  onBack: () => void;
  onPick: (index: number) => void;
}) {
  const { c } = useTheme();
  const { height } = useWindowDimensions();
  return (
    <>
      <View style={styles.pickHeader}>
        <IconButton icon={ArrowLeft} onPress={onBack} accessibilityLabel="Quay lại" />
        <Text style={[font.heading, styles.flex, { color: c.text }]}>
          {end === 'from' ? 'Từ chương' : 'Đến chương'}
        </Text>
      </View>
      <FlatList
        data={chapters}
        keyExtractor={item => item.url}
        style={{ height: height * 0.6 }}
        initialScrollIndex={Math.max(0, value - 3)}
        getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
        renderItem={({ item, index }) => {
          const active = index === value;
          return (
            <Pressable
              onPress={() => onPick(index)}
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
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  range: { marginHorizontal: space.lg, marginBottom: space.sm, borderRadius: radius.md, overflow: 'hidden' },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 50, paddingHorizontal: space.md },
  rangeLabel: { width: 76 },
  rangeDivider: { height: StyleSheet.hairlineWidth },
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
