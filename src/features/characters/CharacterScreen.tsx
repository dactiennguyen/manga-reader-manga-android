import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAppNavigation, type ScreenProps } from '../../app/routes';
import { Avatar, MenuSheet, PromptDialog, SpeechBubble } from '../../components/comic';
import { Sheet } from '../../components/Sheet';
import { BookOpen, Check, ChevronDown, Copy, EllipsisVertical, Lock, Trash2 } from '../../components/icons';
import { confirm, EmptyState, Header, IconButton, ListItem, Screen, TabBar, toast } from '../../components/ui';
import { LIMITS, ROLE_LABEL } from '../../model/constants';
import { chapterLabel, characterUsage } from '../../model/selectors';
import type { Character, CharacterRole } from '../../model/types';
import { useStory } from '../../store/useStory';
import { font, radius, space, useTheme } from '../../theme';
import { DesignTab } from './DesignTab';
import { useDraft } from './fields';
import { ProfileTab } from './ProfileTab';
import { RelationsTab } from './RelationsTab';

type TabKey = 'profile' | 'design' | 'relations';

const TABS: readonly { key: TabKey; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'design', label: 'Design' },
  { key: 'relations', label: 'Relations' },
];

const ROLES = Object.keys(ROLE_LABEL) as CharacterRole[];

export function CharacterScreen({ route }: ScreenProps<'Character'>) {
  const character = useStory(s => s.characters[route.params.characterId]);
  if (!character) {
    return (
      <Screen>
        <Header title="Character" />
        <EmptyState title="Character not found" message="This character has been deleted." />
      </Screen>
    );
  }
  return <CharacterBody key={character.id} character={character} />;
}

function CharacterBody({ character }: { character: Character }) {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const update = useStory(s => s.updateCharacter);
  const [tab, setTab] = useState<TabKey>('profile');
  const [isNew] = useState(() => !character.name.trim());
  const [menu, setMenu] = useState(false);
  const [roleMenu, setRoleMenu] = useState(false);
  const [ageDialog, setAgeDialog] = useState(false);
  const [usageSheet, setUsageSheet] = useState(false);
  const name = useDraft(character.name, value => update(character.id, { name: value.trim() }));

  const usage = useMemo(
    () => (usageSheet ? characterUsage(useStory.getState(), character.id) : null),
    [usageSheet, character.id],
  );

  const duplicate = () => {
    name.onBlur();
    const newId = useStory.getState().duplicateCharacter(character.id);
    if (newId) {
      toast('Character duplicated');
      navigation.push('Character', { characterId: newId });
    }
  };

  const remove = async () => {
    const state = useStory.getState();
    const { dialogues, bubbles } = characterUsage(state, character.id);
    const ok = await confirm(
      `Delete ${character.name.trim() || 'this character'}?`,
      `${dialogues} dialogue lines and ${bubbles} speech bubbles use this character. They are kept but will no longer be linked to it.`,
      { confirmText: 'Delete', destructive: true },
    );
    if (ok) {
      navigation.goBack();
      useStory.getState().removeCharacter(character.id);
    }
  };

  return (
    <Screen>
      <Header
        title="Character"
        right={<IconButton icon={EllipsisVertical} onPress={() => setMenu(true)} accessibilityLabel="More" />}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={[1]}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <View>
            <Avatar character={character} size={88} square />
            {character.locked && (
              <View style={[styles.lockBadge, { backgroundColor: c.ink, borderColor: c.bg }]}>
                <Lock size={12} color={c.onInk} />
              </View>
            )}
          </View>
          <View style={styles.headText}>
            <TextInput
              value={name.text}
              onChangeText={name.onChangeText}
              onBlur={name.onBlur}
              placeholder="Character name"
              placeholderTextColor={c.muted}
              selectionColor={c.accent}
              maxLength={LIMITS.characterName}
              autoFocus={isNew}
              returnKeyType="done"
              style={[font.title, styles.nameInput, { color: c.text, borderBottomColor: c.border }]}
            />
            <View style={styles.metaRow}>
              <Pressable onPress={() => setRoleMenu(true)} hitSlop={6} style={styles.metaButton}>
                <Text style={[font.label, { color: c.textSecondary }]}>{ROLE_LABEL[character.role]}</Text>
                <ChevronDown size={14} color={c.muted} />
              </Pressable>
              <Text style={[font.label, { color: c.muted }]}>·</Text>
              <Pressable onPress={() => setAgeDialog(true)} hitSlop={6} style={styles.metaButton}>
                <Text style={[font.label, { color: character.age ? c.textSecondary : c.muted }]} numberOfLines={1}>
                  {character.age ? `Age: ${character.age}` : 'Add age'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
        <View style={{ backgroundColor: c.bg }}>
          <TabBar tabs={TABS} value={tab} onChange={setTab} stretch />
        </View>
        <View style={styles.body}>
          {isNew && !name.text.trim() && (
            <SpeechBubble tail="none" style={styles.hintBubble}>
              <Text style={[font.body, { color: c.text }]}>
                What is this character called? Type a name above to begin.
              </Text>
            </SpeechBubble>
          )}
          {tab === 'profile' && <ProfileTab character={character} />}
          {tab === 'design' && <DesignTab character={character} />}
          {tab === 'relations' && <RelationsTab character={character} />}
        </View>
      </ScrollView>

      <MenuSheet
        visible={menu}
        onClose={() => setMenu(false)}
        title={character.name.trim() || 'Character'}
        items={[
          {
            label: 'Duplicate',
            icon: Copy,
            onPress: () => {
              setMenu(false);
              duplicate();
            },
          },
          {
            label: 'Where they appear',
            icon: BookOpen,
            onPress: () => {
              setMenu(false);
              setUsageSheet(true);
            },
          },
          {
            label: 'Delete character',
            icon: Trash2,
            destructive: true,
            onPress: () => {
              setMenu(false);
              remove();
            },
          },
        ]}
      />
      <MenuSheet
        visible={roleMenu}
        onClose={() => setRoleMenu(false)}
        title="Role"
        items={ROLES.map(role => ({
          label: ROLE_LABEL[role],
          icon: role === character.role ? Check : undefined,
          onPress: () => {
            setRoleMenu(false);
            update(character.id, { role });
          },
        }))}
      />
      <PromptDialog
        visible={ageDialog}
        onClose={() => setAgeDialog(false)}
        title="Age"
        message="A number or words, e.g. 17, around 30."
        initialValue={character.age}
        placeholder="Around 30"
        maxLength={20}
        allowEmpty
        onSubmit={age => {
          setAgeDialog(false);
          update(character.id, { age: age.trim() });
        }}
      />
      <Sheet
        visible={usageSheet}
        onClose={() => setUsageSheet(false)}
        title="Where they appear"
        subtitle={usage ? `${usage.dialogues} dialogue lines · ${usage.bubbles} speech bubbles` : undefined}
      >
        {usage && usage.chapterIds.length === 0 && (
          <Text style={[font.body, styles.usageEmpty, { color: c.textSecondary }]}>
            This character does not appear in any chapter yet.
          </Text>
        )}
        {usage?.chapterIds.map(chapterId => (
          <ListItem
            key={chapterId}
            title={chapterLabel(useStory.getState(), chapterId)}
            icon={BookOpen}
            chevron
            onPress={() => {
              setUsageSheet(false);
              navigation.navigate('Script', { chapterId });
            }}
          />
        ))}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space.xl * 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.lg },
  headText: { flex: 1 },
  lockBadge: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameInput: { paddingVertical: space.xs, paddingHorizontal: 0, borderBottomWidth: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  metaButton: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 1 },
  body: { padding: space.lg },
  hintBubble: { marginBottom: space.lg },
  usageEmpty: { padding: space.lg },
});
