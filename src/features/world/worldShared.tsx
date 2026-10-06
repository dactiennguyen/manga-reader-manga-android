import { Image, StyleSheet, View } from 'react-native';

import { BookMarked, CalendarClock, Flag, MapPin, StickyNote } from '../../components/icons';
import { WORLD_TYPE_LABEL, WORLD_TYPES } from '../../model/constants';
import type { Chapter, Character, ID, WorldEntry, WorldType } from '../../model/types';
import { fileUri } from '../../lib/files';
import { radius, useTheme } from '../../theme';

export const WORLD_TYPE_ICON = {
  place: MapPin,
  faction: Flag,
  term: BookMarked,
  event: CalendarClock,
  note: StickyNote,
} as const satisfies Record<WorldType, unknown>;

export const UNTITLED = 'Untitled';

export function firstLine(text: string): string {
  return (
    text
      .split('\n')
      .map(line => line.trim())
      .find(Boolean) ?? ''
  );
}

export function anchorLabel(anchor: WorldEntry['anchor'], chapters: Chapter[]): string {
  if (anchor === 'before') {
    return 'Before the story';
  }
  if (anchor === 'after') {
    return 'After the story';
  }
  const index = anchor ? chapters.findIndex(chapter => chapter.id === anchor) : -1;
  if (index < 0) {
    return 'No time anchor';
  }
  const title = chapters[index].title.trim();
  return title ? `Chapter ${index + 1} · ${title}` : `Chapter ${index + 1}`;
}

export function matchesQuery(entry: WorldEntry, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return entry.title.toLowerCase().includes(needle) || entry.body.toLowerCase().includes(needle);
}

export function wikiText(
  projectTitle: string,
  entries: WorldEntry[],
  chapters: Chapter[],
  characters: Record<ID, Character>,
): string {
  const lines: string[] = [`${projectTitle.trim() || 'Untitled story'} — World wiki`, ''];
  const nameOf = (id: ID | undefined) => (id ? characters[id]?.name.trim() : '') || '';
  for (const type of WORLD_TYPES) {
    const group = entries.filter(entry => entry.type === type);
    if (group.length === 0) {
      continue;
    }
    lines.push(`== ${WORLD_TYPE_LABEL[type].toUpperCase()} ==`, '');
    for (const entry of group) {
      lines.push(`# ${entry.title.trim() || UNTITLED}`);
      if (type === 'term' && entry.reading?.trim()) {
        lines.push(`Reading: ${entry.reading.trim()}`);
      }
      if (type === 'event') {
        lines.push(`Time anchor: ${anchorLabel(entry.anchor, chapters)}`);
      }
      if (type === 'faction' && nameOf(entry.leaderId)) {
        lines.push(`Leader: ${nameOf(entry.leaderId)}`);
      }
      const related = entry.characterIds.map(nameOf).filter(Boolean);
      if (related.length > 0) {
        lines.push(`Related characters: ${related.join(', ')}`);
      }
      if (entry.body.trim()) {
        lines.push(entry.body.trim());
      }
      lines.push('');
    }
  }
  return lines.join('\n').trim();
}

export function EntryThumb({ entry, size = 48 }: { entry: WorldEntry; size?: number }) {
  const { c } = useTheme();
  const Icon = WORLD_TYPE_ICON[entry.type];
  const image = entry.images[0];
  return (
    <View style={[styles.thumb, { width: size, height: size, borderColor: c.ink, backgroundColor: c.surfaceAlt }]}>
      {image ? (
        <Image source={{ uri: fileUri(image) }} style={styles.thumbImage} resizeMode="cover" />
      ) : (
        <Icon size={size * 0.45} color={c.textSecondary} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: {
    borderWidth: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImage: { width: '100%', height: '100%' },
});
