import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppNavigation } from '../../app/routes';
import { CharacterPicker } from '../../components/CharacterPicker';
import { Avatar, ComicCard, MenuSheet, PromptDialog, SpeechBubble } from '../../components/comic';
import { Pencil, Plus, StickyNote, Trash2 } from '../../components/icons';
import { Button, confirm } from '../../components/ui';
import { relationsOf } from '../../model/selectors';
import type { Character, ID } from '../../model/types';
import { useStory } from '../../store/useStory';
import { font, space, useTheme } from '../../theme';

const LABEL_MAX = 30;
const NOTE_MAX = 120;

export function RelationsTab({ character }: { character: Character }) {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const relations = useStory(s => s.relations);
  const characters = useStory(s => s.characters);
  const [picking, setPicking] = useState(false);
  const [pendingOther, setPendingOther] = useState<ID | null>(null);
  const [menuId, setMenuId] = useState<ID | null>(null);
  const [editing, setEditing] = useState<{ id: ID; field: 'label' | 'note' } | null>(null);

  const items = useMemo(
    () => relationsOf(useStory.getState(), character.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [relations, characters, character.id],
  );
  const excludeIds = useMemo(() => [character.id, ...items.map(item => item.other.id)], [character.id, items]);
  const menuItem = items.find(item => item.relation.id === menuId);
  const editingItem = items.find(item => item.relation.id === editing?.id);
  const pendingName = pendingOther ? characters[pendingOther]?.name.trim() || 'this character' : '';
  const selfName = character.name.trim() || 'This character';

  const remove = async (relationId: ID, otherName: string) => {
    const ok = await confirm(
      'Delete relation?',
      `The relation with ${otherName || 'this character'} is removed for both.`,
      {
        confirmText: 'Delete',
        destructive: true,
      },
    );
    if (ok) {
      useStory.getState().removeRelation(relationId);
    }
  };

  return (
    <View>
      {items.length === 0 ? (
        <View style={styles.empty}>
          <SpeechBubble>
            <Text style={[font.body, { color: c.text }]}>
              {selfName} has no relations yet. Add friends, enemies, family… to remember who is tied to whom.
            </Text>
          </SpeechBubble>
        </View>
      ) : (
        items.map(({ relation, other }) => (
          <ComicCard
            key={relation.id}
            shadow={3}
            style={styles.card}
            contentStyle={styles.cardContent}
            onPress={() => navigation.push('Character', { characterId: other.id })}
            onLongPress={() => setMenuId(relation.id)}
          >
            <Avatar character={other} size={48} />
            <View style={styles.cardText}>
              <Text style={[font.heading, { color: c.text }]} numberOfLines={1}>
                {other.name.trim() || 'Unnamed'}
              </Text>
              <Text style={[font.label, { color: c.accent }]} numberOfLines={1}>
                {relation.label || 'No label'}
              </Text>
              {!!relation.note && (
                <Text style={[font.caption, { color: c.textSecondary }]} numberOfLines={1}>
                  {relation.note}
                </Text>
              )}
            </View>
          </ComicCard>
        ))
      )}
      <Button title="Relation" icon={Plus} variant="secondary" onPress={() => setPicking(true)} style={styles.add} />
      {items.length > 0 && (
        <Text style={[font.caption, styles.hint, { color: c.muted }]}>
          Relations go both ways. Long-press a row to edit its label or note, or to delete it.
        </Text>
      )}

      <CharacterPicker
        visible={picking}
        onClose={() => setPicking(false)}
        projectId={character.projectId}
        excludeIds={excludeIds}
        title="Related to whom?"
        onPick={otherId => {
          setPicking(false);
          if (otherId && otherId !== character.id) {
            setPendingOther(otherId);
          }
        }}
      />
      <PromptDialog
        visible={!!pendingOther}
        onClose={() => setPendingOther(null)}
        title="Relation label"
        message={`What are ${selfName} and ${pendingName} to each other?`}
        placeholder="Best friend, enemy, sibling…"
        confirmText="Add"
        maxLength={LABEL_MAX}
        onSubmit={label => {
          if (pendingOther) {
            useStory.getState().addRelation(character.projectId, character.id, pendingOther, label.trim());
          }
          setPendingOther(null);
        }}
      />
      <PromptDialog
        key={editing ? `${editing.id}-${editing.field}` : 'none'}
        visible={!!editing && !!editingItem}
        onClose={() => setEditing(null)}
        title={editing?.field === 'note' ? 'Relation note' : 'Relation label'}
        initialValue={editing?.field === 'note' ? editingItem?.relation.note : editingItem?.relation.label}
        placeholder={editing?.field === 'note' ? 'A one-line note' : 'Best friend, enemy, sibling…'}
        maxLength={editing?.field === 'note' ? NOTE_MAX : LABEL_MAX}
        allowEmpty={editing?.field === 'note'}
        onSubmit={value => {
          if (editing) {
            useStory.getState().updateRelation(editing.id, { [editing.field]: value.trim() });
          }
          setEditing(null);
        }}
      />
      <MenuSheet
        visible={!!menuItem}
        onClose={() => setMenuId(null)}
        title={menuItem ? menuItem.other.name.trim() || 'Unnamed' : undefined}
        subtitle={menuItem?.relation.label}
        items={[
          {
            label: 'Edit label',
            icon: Pencil,
            onPress: () => {
              setEditing(menuId ? { id: menuId, field: 'label' } : null);
              setMenuId(null);
            },
          },
          {
            label: 'Edit note',
            icon: StickyNote,
            onPress: () => {
              setEditing(menuId ? { id: menuId, field: 'note' } : null);
              setMenuId(null);
            },
          },
          {
            label: 'Delete relation',
            icon: Trash2,
            destructive: true,
            onPress: () => {
              const target = menuItem;
              setMenuId(null);
              if (target) {
                remove(target.relation.id, target.other.name.trim());
              }
            },
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { paddingVertical: space.lg },
  card: { marginBottom: space.md },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  cardText: { flex: 1, gap: 2 },
  add: { marginTop: space.sm },
  hint: { marginTop: space.md, textAlign: 'center' },
});
