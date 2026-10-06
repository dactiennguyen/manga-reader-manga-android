import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppNavigation } from '../../app/routes';
import { Avatar, MenuSheet, SpeechBubble } from '../../components/comic';
import { Lock, Plus } from '../../components/icons';
import { Button, ListItem } from '../../components/ui';
import { formatRelative } from '../../lib/time';
import { ROLE_LABEL, WORLD_TYPE_LABEL, WORLD_TYPES } from '../../model/constants';
import { charactersOf, worldOf } from '../../model/selectors';
import type { ID, WorldType } from '../../model/types';
import { useStory, type StoryData } from '../../store/useStory';
import { font, radius, space, useTheme } from '../../theme';

type TabProps = { state: StoryData; projectId: ID };

const ENTRY_TYPES = WORLD_TYPES.filter(type => type !== 'note');

export function CharactersTab({ state, projectId }: TabProps) {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const characters = useMemo(() => charactersOf(state, projectId), [state, projectId]);

  const add = () => {
    const characterId = useStory.getState().addCharacter(projectId);
    navigation.navigate('Character', { characterId });
  };

  if (characters.length === 0) {
    return (
      <View style={styles.empty}>
        <SpeechBubble tail="bottom-left">No one here yet. Create your main character first!</SpeechBubble>
        <Button title="Create character" icon={Plus} onPress={add} />
      </View>
    );
  }
  return (
    <View style={styles.wrap}>
      <View style={styles.end}>
        <Button title="Character" icon={Plus} variant="ink" small onPress={add} />
      </View>
      <View style={styles.grid}>
        {characters.map(character => (
          <Pressable
            key={character.id}
            style={styles.cell}
            onPress={() => navigation.navigate('Character', { characterId: character.id })}
          >
            <View>
              <Avatar character={character} size={72} />
              {character.locked && (
                <View style={[styles.lock, { backgroundColor: c.ink }]}>
                  <Lock size={12} color={c.onInk} />
                </View>
              )}
            </View>
            <Text numberOfLines={1} style={[font.label, styles.center, { color: c.text }]}>
              {character.name || 'Untitled'}
            </Text>
            <Text numberOfLines={1} style={[font.caption, styles.center, { color: c.muted }]}>
              {ROLE_LABEL[character.role]}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function WorldTab({ state, projectId }: TabProps) {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const [picking, setPicking] = useState(false);
  const entries = useMemo(() => worldOf(state, projectId).filter(entry => entry.type !== 'note'), [state, projectId]);

  const add = (type: WorldType) => {
    const entryId = useStory.getState().addWorldEntry(projectId, type);
    navigation.navigate('WorldEntry', { entryId });
  };

  return (
    <View style={styles.wrap}>
      {entries.length === 0 ? (
        <View style={styles.empty}>
          <SpeechBubble tail="bottom-left">
            Where does the story take place? Keep track of places, factions and terms here.
          </SpeechBubble>
          <Button title="New entry" icon={Plus} onPress={() => setPicking(true)} />
        </View>
      ) : (
        <>
          <View style={styles.between}>
            <Button
              title="See all"
              variant="secondary"
              small
              onPress={() => navigation.navigate('World', { projectId })}
            />
            <Button title="New entry" icon={Plus} variant="ink" small onPress={() => setPicking(true)} />
          </View>
          {ENTRY_TYPES.map(type => {
            const group = entries.filter(entry => entry.type === type);
            if (group.length === 0) {
              return null;
            }
            return (
              <View key={type} style={styles.group}>
                <Text style={[font.overline, { color: c.muted }]}>
                  {WORLD_TYPE_LABEL[type]} ({group.length})
                </Text>
                {group.map(entry => (
                  <ListItem
                    key={entry.id}
                    title={entry.title || 'Untitled'}
                    subtitle={entry.body.trim().split('\n')[0] || undefined}
                    chevron
                    onPress={() => navigation.navigate('WorldEntry', { entryId: entry.id })}
                  />
                ))}
              </View>
            );
          })}
        </>
      )}
      <MenuSheet
        visible={picking}
        onClose={() => setPicking(false)}
        title="Add world entry"
        items={ENTRY_TYPES.map(type => ({ label: WORLD_TYPE_LABEL[type], onPress: () => add(type) }))}
      />
    </View>
  );
}

export function NotesTab({ state, projectId }: TabProps) {
  const navigation = useAppNavigation();
  const notes = useMemo(
    () =>
      worldOf(state, projectId)
        .filter(entry => entry.type === 'note')
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [state, projectId],
  );

  const add = () => {
    const entryId = useStory.getState().addWorldEntry(projectId, 'note');
    navigation.navigate('WorldEntry', { entryId });
  };

  if (notes.length === 0) {
    return (
      <View style={styles.empty}>
        <SpeechBubble tail="bottom-left">Had a sudden idea? Jot it down here before it slips away.</SpeechBubble>
        <Button title="Note" icon={Plus} onPress={add} />
      </View>
    );
  }
  return (
    <View style={styles.wrap}>
      <View style={styles.end}>
        <Button title="Note" icon={Plus} variant="ink" small onPress={add} />
      </View>
      {notes.map(note => (
        <ListItem
          key={note.id}
          title={note.title || note.body.trim().split('\n')[0] || 'Empty note'}
          subtitle={formatRelative(note.updatedAt)}
          chevron
          onPress={() => navigation.navigate('WorldEntry', { entryId: note.id })}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  empty: { alignItems: 'flex-start', gap: space.lg, paddingVertical: space.lg },
  end: { flexDirection: 'row', justifyContent: 'flex-end' },
  between: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '33.33%', alignItems: 'center', gap: 2, paddingVertical: space.sm, paddingHorizontal: space.xs },
  center: { textAlign: 'center' },
  lock: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  group: { gap: space.xs },
});
