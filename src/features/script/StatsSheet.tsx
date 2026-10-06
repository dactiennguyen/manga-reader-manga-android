import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Sheet } from '../../components/Sheet';
import { ProgressBar } from '../../components/ui';
import { BLOCK_LABEL, BLOCK_TYPES } from '../../model/constants';
import type { Character, ID, Scene } from '../../model/types';
import { font, radius, space, useTheme } from '../../theme';
import { formatDuration, scriptStats } from './scriptTools';

function pagesValue(value: number): string {
  return `~${Number.isInteger(value) ? value : value.toFixed(1)}`;
}

export function StatsSheet({
  visible,
  onClose,
  title,
  scenes,
  characters,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  scenes: Scene[];
  characters: Record<ID, Character>;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Script statistics" subtitle={title}>
      <StatsBody scenes={scenes} characters={characters} />
    </Sheet>
  );
}

function StatsBody({ scenes, characters }: { scenes: Scene[]; characters: Record<ID, Character> }) {
  const { c } = useTheme();
  const stats = useMemo(() => scriptStats(scenes, characters), [scenes, characters]);
  const tiles: [string, string][] = [
    ['Words', String(stats.words)],
    ['Dialogue lines', String(stats.dialogueLines)],
    ['Scenes', String(stats.scenes)],
    ['Est. pages', pagesValue(stats.pages)],
    ['Reading time', formatDuration(stats.readingSeconds)],
    ['Written blocks', String(stats.blocks)],
  ];
  const topLines = stats.speakers[0]?.lines ?? 0;
  return (
    <View style={styles.body}>
      <View style={styles.tiles}>
        {tiles.map(([label, value]) => (
          <View key={label} style={[styles.tile, { borderColor: c.ink, backgroundColor: c.surface }]}>
            <Text style={[styles.value, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>
              {value}
            </Text>
            <Text style={[styles.label, { color: c.muted }]} numberOfLines={1}>
              {label}
            </Text>
          </View>
        ))}
      </View>
      <Text style={[styles.heading, { color: c.text }]}>Blocks by type</Text>
      {BLOCK_TYPES.map(type => (
        <View key={type} style={styles.line}>
          <Text style={[styles.lineName, { color: c.textSecondary }]}>{BLOCK_LABEL[type]}</Text>
          <Text style={[styles.lineValue, { color: c.text }]}>{stats.byType[type]}</Text>
        </View>
      ))}
      <Text style={[styles.heading, { color: c.text }]}>Lines per character</Text>
      {stats.speakers.length === 0 && <Text style={[styles.empty, { color: c.muted }]}>No dialogue written yet.</Text>}
      {stats.speakers.map((speaker, index) => (
        <View key={speaker.characterId ?? 'unassigned'} style={styles.speaker}>
          <View style={styles.line}>
            <Text style={[styles.lineName, { color: c.textSecondary }]} numberOfLines={1}>
              {speaker.name}
              {index === 0 && speaker.characterId && stats.speakers.length > 1 ? ' · talks most' : ''}
            </Text>
            <Text style={[styles.lineValue, { color: c.text }]}>
              {speaker.lines} {speaker.lines === 1 ? 'line' : 'lines'} · {speaker.words}{' '}
              {speaker.words === 1 ? 'word' : 'words'}
            </Text>
          </View>
          <ProgressBar value={topLines ? speaker.lines / topLines : 0} color={index === 0 ? c.accent : c.ink} />
        </View>
      ))}
      <Text style={[styles.note, { color: c.muted }]}>
        Empty blocks are not counted. Reading time assumes 200 words a minute plus 6 seconds of art per page.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.sm },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: {
    flexBasis: '30%',
    flexGrow: 1,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
  },
  value: { ...font.title },
  label: { ...font.caption },
  heading: { ...font.overline, marginTop: space.md },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  lineName: { ...font.body, flexShrink: 1 },
  lineValue: { ...font.label },
  speaker: { gap: space.xs },
  empty: { ...font.body },
  note: { ...font.caption, marginTop: space.md },
});
