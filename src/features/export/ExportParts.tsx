import type { ReactNode } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { ComicCard } from '../../components/comic';
import { Check, type LucideIcon } from '../../components/icons';
import { useThumb } from '../../engine/page';
import { formatBytes } from '../../lib/format';
import { formatRelative } from '../../lib/time';
import type { ID } from '../../model/types';
import { font, radius, space, useTheme } from '../../theme';
import type { ExportFormat, ExportResult } from './runExport';

export const FORMAT_LABEL: Record<ExportFormat, string> = { png: 'PNG', pdf: 'PDF', cbz: 'CBZ', long: 'Long image' };

export function FormatCard({
  icon: Icon,
  title,
  description,
  selected,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <ComicCard
      onPress={onPress}
      style={styles.formatCard}
      color={selected ? c.ink : c.surface}
      shadow={selected ? 0 : undefined}
      contentStyle={styles.formatContent}
    >
      <View style={styles.formatHead}>
        <Icon size={18} color={selected ? c.onInk : c.text} />
        <Text style={[font.overline, styles.flex, { color: selected ? c.onInk : c.text }]}>{title}</Text>
        {selected && <Check size={16} color={c.onInk} />}
      </View>
      <Text style={[font.caption, { color: selected ? c.onInk : c.textSecondary }]}>{description}</Text>
    </ComicCard>
  );
}

export function OptionRow({ label, children }: { label: string; children: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={styles.optionRow}>
      <Text style={[font.label, styles.optionLabel, { color: c.text }]}>{label}</Text>
      <View style={styles.optionControl}>{children}</View>
    </View>
  );
}

function Thumb({ pageId, index }: { pageId: ID; index: number }) {
  const { c } = useTheme();
  const uri = useThumb(pageId);
  return (
    <View style={styles.thumbWrap}>
      <View style={[styles.thumb, { borderColor: c.ink, backgroundColor: c.surfaceAlt }]}>
        {uri && <Image source={{ uri }} style={styles.thumbImage} resizeMode="cover" />}
      </View>
      <Text style={[font.caption, { color: c.muted }]}>{index + 1}</Text>
    </View>
  );
}

export function ThumbStrip({ pageIds }: { pageIds: ID[] }) {
  return (
    <FlatList
      horizontal
      data={pageIds}
      keyExtractor={id => id}
      renderItem={({ item, index }) => <Thumb pageId={item} index={index} />}
      showsHorizontalScrollIndicator={false}
      initialNumToRender={6}
      windowSize={5}
      contentContainerStyle={styles.strip}
    />
  );
}

export function HistoryList({
  items,
  missing,
  onPress,
}: {
  items: ExportResult[];
  missing: Record<string, boolean>;
  onPress: (item: ExportResult) => void;
}) {
  const { c } = useTheme();
  return (
    <View style={styles.history}>
      {items.map(item => {
        const gone = !!missing[item.path];
        return (
          <Pressable
            key={item.path + item.createdAt}
            disabled={gone}
            onPress={() => onPress(item)}
            style={[styles.historyRow, { borderColor: c.border }, gone && styles.gone]}
          >
            <View style={styles.flex}>
              <Text numberOfLines={1} style={[font.label, { color: c.text }]}>
                {item.fileName}
              </Text>
              <Text style={[font.caption, { color: c.textSecondary }]}>
                {gone
                  ? 'File deleted'
                  : `${FORMAT_LABEL[item.format]} · ${formatBytes(item.size)} · ${formatRelative(item.createdAt)}`}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  formatCard: { flexBasis: '47%', flexGrow: 1 },
  formatContent: { padding: space.md, gap: space.xs },
  formatHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
  optionLabel: { width: 96 },
  optionControl: { flex: 1 },
  strip: { gap: space.sm, paddingVertical: space.xs },
  thumbWrap: { alignItems: 'center', gap: 2 },
  thumb: { width: 64, height: 90, borderWidth: 1.5, borderRadius: radius.sm, overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
  history: { gap: space.sm },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  gone: { opacity: 0.45 },
});
