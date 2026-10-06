import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ArrowDown, ArrowUp } from '../../components/icons';
import { IconButton } from '../../components/ui';
import type { Chapter, ID, WorldEntry } from '../../model/types';
import { useStory } from '../../store/useStory';
import { font, radius, space, useTheme } from '../../theme';
import { anchorLabel, firstLine, UNTITLED } from './worldShared';

type Group = { key: string; label: string; items: WorldEntry[] };

function buildGroups(events: WorldEntry[], chapters: Chapter[]): Group[] {
  const chapterIds = new Set(chapters.map(chapter => chapter.id));
  const keyOf = (entry: WorldEntry) =>
    entry.anchor === 'before' || entry.anchor === 'after' || (entry.anchor && chapterIds.has(entry.anchor))
      ? entry.anchor
      : 'none';
  const keys: string[] = ['before', ...chapters.map(chapter => chapter.id), 'after', 'none'];
  return keys
    .map(key => ({
      key,
      label: anchorLabel(key === 'none' ? undefined : key, chapters),
      items: events.filter(entry => keyOf(entry) === key).sort((a, b) => a.order - b.order),
    }))
    .filter(group => group.items.length > 0);
}

function move(items: WorldEntry[], index: number, delta: -1 | 1) {
  const target = index + delta;
  if (target < 0 || target >= items.length) {
    return;
  }
  const orders = items.map(item => item.order);
  for (let i = 1; i < orders.length; i += 1) {
    if (orders[i] <= orders[i - 1]) {
      orders[i] = orders[i - 1] + 0.001;
    }
  }
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  const { updateWorldEntry } = useStory.getState();
  next.forEach((item, i) => {
    if (item.order !== orders[i]) {
      updateWorldEntry(item.id, { order: orders[i] });
    }
  });
}

export function WorldTimeline({
  events,
  chapters,
  onOpen,
  onLongPress,
}: {
  events: WorldEntry[];
  chapters: Chapter[];
  onOpen: (entryId: ID) => void;
  onLongPress: (entryId: ID) => void;
}) {
  const { c } = useTheme();
  const groups = useMemo(() => buildGroups(events, chapters), [events, chapters]);

  return (
    <View>
      {groups.map(group => (
        <View key={group.key} style={styles.group}>
          <Text style={[font.overline, styles.groupLabel, { color: group.key === 'none' ? c.muted : c.text }]}>
            {group.label}
          </Text>
          {group.items.map((entry, index) => (
            <View key={entry.id} style={styles.row}>
              <View style={styles.rail}>
                <View style={[styles.line, { backgroundColor: c.ink }]} />
                <View style={[styles.dot, { backgroundColor: c.accent, borderColor: c.ink }]} />
              </View>
              <Pressable
                onPress={() => onOpen(entry.id)}
                onLongPress={() => onLongPress(entry.id)}
                style={[styles.card, { backgroundColor: c.surface, borderColor: c.ink }]}
              >
                <View style={styles.cardText}>
                  <Text style={[font.label, { color: entry.title.trim() ? c.text : c.muted }]} numberOfLines={1}>
                    {entry.title.trim() || UNTITLED}
                  </Text>
                  {!!firstLine(entry.body) && (
                    <Text style={[font.caption, { color: c.textSecondary }]} numberOfLines={1}>
                      {firstLine(entry.body)}
                    </Text>
                  )}
                </View>
                <IconButton
                  icon={ArrowUp}
                  size={18}
                  disabled={index === 0}
                  onPress={() => move(group.items, index, -1)}
                  accessibilityLabel="Move up"
                />
                <IconButton
                  icon={ArrowDown}
                  size={18}
                  disabled={index === group.items.length - 1}
                  onPress={() => move(group.items, index, 1)}
                  accessibilityLabel="Move down"
                />
              </Pressable>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: space.md },
  groupLabel: { marginBottom: space.sm },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  rail: { width: 28, alignItems: 'center' },
  line: { position: 'absolute', top: 0, bottom: 0, width: 2 },
  dot: { width: 14, height: 14, borderRadius: radius.pill, borderWidth: 2, marginTop: space.lg },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: radius.md,
    paddingLeft: space.md,
    paddingVertical: space.xs,
    marginBottom: space.sm,
  },
  cardText: { flex: 1, gap: 2, paddingVertical: space.xs },
});
