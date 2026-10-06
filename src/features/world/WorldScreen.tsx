import { useMemo, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { useAppNavigation, type ScreenProps } from '../../app/routes';
import { ComicCard, MenuSheet, SectionTitle, SpeechBubble } from '../../components/comic';
import { Check, Copy, EllipsisVertical, Plus, Search, Shapes, Share2, Trash2 } from '../../components/icons';
import {
  Button,
  Chip,
  confirm,
  Fab,
  Header,
  IconButton,
  Screen,
  SearchField,
  Segmented,
  toast,
} from '../../components/ui';
import { WORLD_TYPE_LABEL, WORLD_TYPES } from '../../model/constants';
import type { ID, WorldEntry, WorldType } from '../../model/types';
import { useChapters, useProject } from '../../store/hooks';
import { useStory } from '../../store/useStory';
import { font, space, useTheme } from '../../theme';
import { EntryThumb, firstLine, matchesQuery, UNTITLED, wikiText, WORLD_TYPE_ICON } from './worldShared';
import { WorldTimeline } from './WorldTimeline';

type ViewMode = 'list' | 'timeline';

const VIEW_OPTIONS: readonly { value: ViewMode; label: string }[] = [
  { value: 'list', label: 'List' },
  { value: 'timeline', label: 'Timeline' },
];

export function WorldScreen({ route }: ScreenProps<'World'>) {
  const { projectId } = route.params;
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const project = useProject(projectId);
  const chapters = useChapters(projectId);
  const world = useStory(s => s.world);
  const [filter, setFilter] = useState<WorldType | 'all'>(route.params.type ?? 'all');
  const [view, setView] = useState<ViewMode>(route.params.view ?? 'list');
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [typeMenu, setTypeMenu] = useState(false);
  const [moreMenu, setMoreMenu] = useState(false);
  const [rowMenuId, setRowMenuId] = useState<ID | null>(null);
  const [retypeId, setRetypeId] = useState<ID | null>(null);

  const entries = useMemo(
    () =>
      Object.values(world)
        .filter(entry => entry.projectId === projectId)
        .sort((a, b) => a.order - b.order),
    [world, projectId],
  );
  const counts = useMemo(() => {
    const result: Record<string, number> = { all: entries.length };
    for (const entry of entries) {
      result[entry.type] = (result[entry.type] ?? 0) + 1;
    }
    return result;
  }, [entries]);
  const found = useMemo(() => entries.filter(entry => matchesQuery(entry, query)), [entries, query]);
  const events = useMemo(() => found.filter(entry => entry.type === 'event'), [found]);
  const groups = useMemo(
    () =>
      WORLD_TYPES.filter(type => filter === 'all' || filter === type)
        .map(type => ({ type, items: found.filter(entry => entry.type === type) }))
        .filter(group => group.items.length > 0),
    [found, filter],
  );
  const rowEntry = rowMenuId ? world[rowMenuId] : undefined;
  const retypeEntry = retypeId ? world[retypeId] : undefined;

  const open = (entryId: ID) => navigation.navigate('WorldEntry', { entryId });

  const create = (type: WorldType) => {
    const entryId = useStory.getState().addWorldEntry(projectId, type);
    open(entryId);
  };

  const duplicate = (entry: WorldEntry) => {
    const title = entry.title.trim() ? `${entry.title.trim()} (copy)` : '';
    useStory.getState().addWorldEntry(projectId, entry.type, {
      title,
      body: entry.body,
      images: [...entry.images],
      characterIds: [...entry.characterIds],
      sendToAi: entry.sendToAi,
      anchor: entry.anchor,
      reading: entry.reading,
      leaderId: entry.leaderId,
    });
    toast('Entry duplicated');
  };

  const remove = async (entry: WorldEntry) => {
    const ok = await confirm(
      `Delete "${entry.title.trim() || UNTITLED}"?`,
      'This entry will be removed from the story world.',
      {
        confirmText: 'Delete',
        destructive: true,
      },
    );
    if (ok) {
      useStory.getState().removeWorldEntry(entry.id);
    }
  };

  const exportWiki = async () => {
    if (entries.length === 0) {
      toast('Nothing to export yet');
      return;
    }
    const { characters } = useStory.getState();
    try {
      await Share.share({
        title: `${project?.title ?? 'Story'} — World wiki`,
        message: wikiText(project?.title ?? '', entries, chapters, characters),
      });
    } catch {
      toast('Could not share');
    }
  };

  const closeSearch = () => {
    setSearching(false);
    setQuery('');
  };

  const renderRow = (entry: WorldEntry) => (
    <ComicCard
      key={entry.id}
      shadow={3}
      style={styles.row}
      contentStyle={styles.rowContent}
      onPress={() => open(entry.id)}
      onLongPress={() => setRowMenuId(entry.id)}
    >
      <EntryThumb entry={entry} />
      <View style={styles.rowText}>
        <Text style={[font.heading, { color: entry.title.trim() ? c.text : c.muted }]} numberOfLines={1}>
          {entry.title.trim() || UNTITLED}
        </Text>
        <Text style={[font.caption, { color: c.textSecondary }]} numberOfLines={1}>
          {firstLine(entry.body) || 'No description yet'}
        </Text>
      </View>
    </ComicCard>
  );

  const hasQuery = !!query.trim();
  const showingEmpty = view === 'list' ? groups.length === 0 : events.length === 0;

  return (
    <Screen>
      <Header
        title="World"
        subtitle={project?.title}
        right={
          <>
            <IconButton
              icon={Search}
              active={searching}
              onPress={() => (searching ? closeSearch() : setSearching(true))}
              accessibilityLabel="Search"
            />
            <IconButton icon={EllipsisVertical} onPress={() => setMoreMenu(true)} accessibilityLabel="More" />
          </>
        }
      />
      {searching && (
        <View style={styles.searchWrap}>
          <SearchField
            value={query}
            onChangeText={setQuery}
            onClear={() => setQuery('')}
            placeholder="Search titles and content"
            autoFocus
          />
        </View>
      )}
      <View style={styles.viewSwitch}>
        <Segmented options={VIEW_OPTIONS} value={view} onChange={setView} />
      </View>
      {view === 'list' && (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="All" selected={filter === 'all'} count={counts.all} onPress={() => setFilter('all')} />
            {WORLD_TYPES.map(type => (
              <Chip
                key={type}
                label={WORLD_TYPE_LABEL[type]}
                icon={WORLD_TYPE_ICON[type]}
                selected={filter === type}
                count={counts[type] ?? 0}
                onPress={() => setFilter(type)}
              />
            ))}
          </ScrollView>
        </View>
      )}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {showingEmpty ? (
          <View style={styles.empty}>
            <SpeechBubble>
              <Text style={[font.body, { color: c.text }]}>
                {hasQuery
                  ? `No entries match "${query.trim()}".`
                  : view === 'timeline'
                  ? 'No events yet. Add events and give them a time anchor to see how the story flows.'
                  : filter === 'all'
                  ? 'The story world is empty. Note down places, factions, terms and events so you remember them while writing.'
                  : `No ${WORLD_TYPE_LABEL[filter].toLowerCase()} entries yet.`}
              </Text>
            </SpeechBubble>
            {!hasQuery && (
              <Button
                title={
                  view === 'timeline'
                    ? 'Add event'
                    : filter === 'all'
                    ? 'New entry'
                    : `Add ${WORLD_TYPE_LABEL[filter].toLowerCase()}`
                }
                icon={Plus}
                onPress={() =>
                  view === 'timeline' ? create('event') : filter === 'all' ? setTypeMenu(true) : create(filter)
                }
                style={styles.emptyAction}
              />
            )}
          </View>
        ) : view === 'timeline' ? (
          <WorldTimeline events={events} chapters={chapters} onOpen={open} onLongPress={setRowMenuId} />
        ) : (
          groups.map(group => (
            <View key={group.type} style={styles.group}>
              <SectionTitle>{WORLD_TYPE_LABEL[group.type]}</SectionTitle>
              {group.items.map(renderRow)}
            </View>
          ))
        )}
      </ScrollView>
      <Fab icon={Plus} label="New entry" onPress={() => setTypeMenu(true)} style={styles.fab} />

      <MenuSheet
        visible={typeMenu}
        onClose={() => setTypeMenu(false)}
        title="What type of entry?"
        items={WORLD_TYPES.map(type => ({
          label: WORLD_TYPE_LABEL[type],
          icon: WORLD_TYPE_ICON[type],
          onPress: () => {
            setTypeMenu(false);
            create(type);
          },
        }))}
      />
      <MenuSheet
        visible={moreMenu}
        onClose={() => setMoreMenu(false)}
        items={[
          {
            label: 'Export wiki as text',
            icon: Share2,
            onPress: () => {
              setMoreMenu(false);
              exportWiki();
            },
          },
        ]}
      />
      <MenuSheet
        visible={!!rowEntry}
        onClose={() => setRowMenuId(null)}
        title={rowEntry ? rowEntry.title.trim() || UNTITLED : undefined}
        subtitle={rowEntry ? WORLD_TYPE_LABEL[rowEntry.type] : undefined}
        items={[
          {
            label: 'Change type',
            icon: Shapes,
            onPress: () => {
              setRetypeId(rowMenuId);
              setRowMenuId(null);
            },
          },
          {
            label: 'Duplicate',
            icon: Copy,
            onPress: () => {
              setRowMenuId(null);
              if (rowEntry) {
                duplicate(rowEntry);
              }
            },
          },
          {
            label: 'Delete',
            icon: Trash2,
            destructive: true,
            onPress: () => {
              setRowMenuId(null);
              if (rowEntry) {
                remove(rowEntry);
              }
            },
          },
        ]}
      />
      <MenuSheet
        visible={!!retypeEntry}
        onClose={() => setRetypeId(null)}
        title="Change type"
        items={WORLD_TYPES.map(type => ({
          label: WORLD_TYPE_LABEL[type],
          icon: retypeEntry?.type === type ? Check : WORLD_TYPE_ICON[type],
          onPress: () => {
            if (retypeId) {
              useStory.getState().updateWorldEntry(retypeId, { type });
            }
            setRetypeId(null);
          },
        }))}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: space.lg, paddingTop: space.sm },
  viewSwitch: { paddingHorizontal: space.lg, paddingTop: space.md },
  chips: { paddingHorizontal: space.lg, paddingTop: space.md, gap: space.sm },
  content: { padding: space.lg, paddingBottom: 96 },
  group: { marginBottom: space.md },
  row: { marginBottom: space.md },
  rowContent: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  rowText: { flex: 1, gap: 2 },
  empty: { paddingTop: space.xl, alignItems: 'flex-start' },
  emptyAction: { marginTop: space.xl },
  fab: { bottom: space.lg },
});
