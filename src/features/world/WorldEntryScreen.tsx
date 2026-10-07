import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAppNavigation, type ScreenProps } from '../../app/routes';
import { CharacterPicker } from '../../components/CharacterPicker';
import { Avatar, MenuSheet, SectionTitle } from '../../components/comic';
import {
  BookOpen,
  Check,
  ChevronRight,
  EllipsisVertical,
  ImagePlus,
  Plus,
  Shapes,
  Sparkles,
  Star,
  Trash2,
  UserPlus,
} from '../../components/icons';
import {
  Button,
  confirm,
  EmptyState,
  FieldLabel,
  Header,
  IconButton,
  ListItem,
  Screen,
  toast,
} from '../../components/ui';
import { LIMITS, WORLD_TYPE_LABEL, WORLD_TYPES } from '../../model/constants';
import type { ID, WorldEntry } from '../../model/types';
import { fileUri, pickImage } from '../../lib/files';
import { useChapters } from '../../store/hooks';
import { useStory } from '../../store/useStory';
import { font, radius, space, useTheme } from '../../theme';
import { AutoField, ImageViewer, useDraft } from '../characters/fields';
import { BODY_MAX, DescribeSheet } from './DescribeSheet';
import { anchorLabel, UNTITLED, WORLD_TYPE_ICON } from './worldShared';

const TITLE_MAX = 80;
const IMAGE_SIZE = 168;

export function WorldEntryScreen({ route }: ScreenProps<'WorldEntry'>) {
  const entry = useStory(s => s.world[route.params.entryId]);
  if (!entry) {
    return (
      <Screen>
        <Header title="World" />
        <EmptyState title="Entry not found" message="This entry has been deleted." />
      </Screen>
    );
  }
  return <EntryBody key={entry.id} entry={entry} />;
}

function EntryBody({ entry }: { entry: WorldEntry }) {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const update = useStory(s => s.updateWorldEntry);
  const chapters = useChapters(entry.projectId);
  const characters = useStory(s => s.characters);
  const scenes = useStory(s => s.scenes);
  const [isNew] = useState(() => !entry.title.trim());
  const [menu, setMenu] = useState(false);
  const [typeMenu, setTypeMenu] = useState(false);
  const [anchorMenu, setAnchorMenu] = useState(false);
  const [imageMenu, setImageMenu] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [picker, setPicker] = useState<'related' | 'leader' | null>(null);
  const [chipMenuId, setChipMenuId] = useState<ID | null>(null);
  const [describeOpen, setDescribeOpen] = useState(false);
  const [bodyVersion, setBodyVersion] = useState(0);
  const title = useDraft(entry.title, value => update(entry.id, { title: value.trim() }));
  const titleText = title.text.trim();

  const openDescribe = () => {
    title.onBlur();
    setDescribeOpen(true);
  };

  const related = useMemo(
    () => entry.characterIds.map(id => characters[id]).filter(Boolean),
    [entry.characterIds, characters],
  );
  const leader = entry.leaderId ? characters[entry.leaderId] : undefined;
  const chipCharacter = chipMenuId ? characters[chipMenuId] : undefined;

  const mentions = useMemo(() => {
    const needle = entry.title.trim().toLowerCase();
    if (needle.length < 2) {
      return [];
    }
    const result: { chapterId: ID; label: string; blockId: ID; count: number }[] = [];
    chapters.forEach((chapter, index) => {
      let count = 0;
      let blockId: ID | undefined;
      for (const sceneId of chapter.sceneIds) {
        for (const block of scenes[sceneId]?.blocks ?? []) {
          if (block.text.toLowerCase().includes(needle)) {
            count += 1;
            blockId = blockId ?? block.id;
          }
        }
      }
      if (blockId) {
        const name = chapter.title.trim();
        result.push({
          chapterId: chapter.id,
          label: name ? `Chapter ${index + 1} · ${name}` : `Chapter ${index + 1}`,
          blockId,
          count,
        });
      }
    });
    return result;
  }, [entry.title, chapters, scenes]);

  const currentImages = () => useStory.getState().world[entry.id]?.images ?? [];

  const addImage = async () => {
    if (entry.images.length >= LIMITS.worldImages) {
      toast(`Up to ${LIMITS.worldImages} images`);
      return;
    }
    try {
      const path = await pickImage();
      if (path) {
        update(entry.id, { images: [...currentImages(), path].slice(0, LIMITS.worldImages) });
      }
    } catch {
      toast('Could not load the image');
    }
  };

  const removeImage = async (path: string) => {
    const ok = await confirm('Delete this image?', undefined, { confirmText: 'Delete', destructive: true });
    if (ok) {
      update(entry.id, { images: currentImages().filter(item => item !== path) });
    }
  };

  const remove = async () => {
    const ok = await confirm(
      `Delete "${entry.title.trim() || UNTITLED}"?`,
      'This entry will be removed from the story world.',
      {
        confirmText: 'Delete',
        destructive: true,
      },
    );
    if (ok) {
      navigation.goBack();
      useStory.getState().removeWorldEntry(entry.id);
    }
  };

  const anchorOptions: { key: string; value: WorldEntry['anchor'] }[] = [
    { key: 'before', value: 'before' },
    ...chapters.map(chapter => ({ key: chapter.id, value: chapter.id })),
    { key: 'after', value: 'after' },
    { key: 'none', value: undefined },
  ];
  const anchorKnown =
    entry.anchor === 'before' || entry.anchor === 'after' || chapters.some(chapter => chapter.id === entry.anchor);
  const activeAnchor = anchorKnown ? entry.anchor : undefined;

  return (
    <Screen>
      <Header
        title={WORLD_TYPE_LABEL[entry.type]}
        right={<IconButton icon={EllipsisVertical} onPress={() => setMenu(true)} accessibilityLabel="More" />}
      />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        {entry.images.length === 0 ? (
          <Pressable
            onPress={addImage}
            style={[styles.emptyStrip, { borderColor: c.border, backgroundColor: c.surfaceAlt }]}
          >
            <ImagePlus size={18} color={c.textSecondary} />
            <Text style={[font.label, { color: c.textSecondary }]}>Add image</Text>
          </Pressable>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.images}>
            {entry.images.map((path, index) => (
              <Pressable
                key={path}
                onPress={() => setViewing(path)}
                onLongPress={() => setImageMenu(path)}
                style={[styles.imageFrame, { borderColor: c.ink, backgroundColor: c.surfaceAlt }]}
              >
                <Image source={{ uri: fileUri(path) }} style={styles.image} resizeMode="cover" />
                {index === 0 && entry.images.length > 1 && (
                  <View style={[styles.mainBadge, { backgroundColor: c.ink }]}>
                    <Text style={[font.caption, { color: c.onInk }]}>Main image</Text>
                  </View>
                )}
              </Pressable>
            ))}
            {entry.images.length < LIMITS.worldImages && (
              <Pressable
                onPress={addImage}
                accessibilityLabel="Add image"
                style={[styles.imageFrame, styles.addTile, { borderColor: c.border, backgroundColor: c.surfaceAlt }]}
              >
                <Plus size={28} color={c.muted} />
                <Text style={[font.caption, { color: c.muted }]}>
                  {entry.images.length}/{LIMITS.worldImages}
                </Text>
              </Pressable>
            )}
          </ScrollView>
        )}

        <View style={styles.body}>
          <TextInput
            value={title.text}
            onChangeText={title.onChangeText}
            onBlur={title.onBlur}
            placeholder="Title"
            placeholderTextColor={c.muted}
            selectionColor={c.accent}
            maxLength={TITLE_MAX}
            autoFocus={isNew}
            style={[font.title, styles.titleInput, { color: c.text, borderBottomColor: c.border }]}
          />

          {entry.type === 'term' && (
            <AutoField
              label="Reading"
              value={entry.reading ?? ''}
              onCommit={reading => update(entry.id, { reading: reading.trim() || undefined })}
              placeholder="Pronunciation or phonetic spelling"
              maxLength={80}
            />
          )}
          {entry.type === 'event' && (
            <View style={styles.block}>
              <FieldLabel>Time anchor</FieldLabel>
              <ListItem
                title={anchorLabel(activeAnchor, chapters)}
                icon={WORLD_TYPE_ICON.event}
                chevron
                onPress={() => setAnchorMenu(true)}
              />
            </View>
          )}
          {entry.type === 'faction' && (
            <View style={styles.block}>
              <FieldLabel>Leader</FieldLabel>
              <ListItem
                title={leader ? leader.name.trim() || 'Unnamed' : 'Choose a leader'}
                left={leader ? <Avatar character={leader} size={32} /> : undefined}
                icon={leader ? undefined : UserPlus}
                chevron
                onPress={() => setPicker('leader')}
              />
            </View>
          )}

          <AutoField
            key={bodyVersion}
            label="Content"
            value={entry.body}
            onCommit={body => update(entry.id, { body })}
            placeholder="Description, details to remember, rules…"
            multiline
            maxLength={BODY_MAX}
            minHeight={160}
          />
          <View style={styles.aiRow}>
            <Text style={[font.caption, styles.aiHint, { color: c.muted }]}>
              {titleText ? 'Let the AI draft this entry from its title.' : 'Add a title to write this entry with AI.'}
            </Text>
            <Button
              title="Write with AI"
              icon={Sparkles}
              variant="ai"
              small
              disabled={!titleText}
              onPress={openDescribe}
            />
          </View>

          <SectionTitle>Related characters</SectionTitle>
          <View style={styles.chips}>
            {related.map(character => (
              <Pressable
                key={character.id}
                onPress={() => navigation.navigate('Character', { characterId: character.id })}
                onLongPress={() => setChipMenuId(character.id)}
                style={[styles.charChip, { borderColor: c.ink, backgroundColor: c.surface }]}
              >
                <Avatar character={character} size={26} />
                <Text style={[font.label, styles.charName, { color: c.text }]} numberOfLines={1}>
                  {character.name.trim() || 'Unnamed'}
                </Text>
              </Pressable>
            ))}
            <Button title="Add" icon={Plus} variant="secondary" small onPress={() => setPicker('related')} />
          </View>
          {related.length > 0 && (
            <Text style={[font.caption, styles.note, { color: c.muted }]}>
              Long-press a character to remove them from this entry.
            </Text>
          )}

          <SectionTitle style={styles.sectionGap}>Appears in</SectionTitle>
          {mentions.length === 0 ? (
            <Text style={[font.caption, { color: c.muted }]}>
              {entry.title.trim().length < 2
                ? 'Give this entry a title of at least 2 characters to find the chapters that mention it.'
                : 'No chapter script mentions this title yet.'}
            </Text>
          ) : (
            mentions.map(item => (
              <ListItem
                key={item.chapterId}
                title={item.label}
                subtitle={item.count === 1 ? '1 mention' : `${item.count} mentions`}
                icon={BookOpen}
                right={<ChevronRight size={18} color={c.muted} />}
                onPress={() => navigation.navigate('Script', { chapterId: item.chapterId, blockId: item.blockId })}
              />
            ))
          )}
        </View>
      </ScrollView>

      <MenuSheet
        visible={menu}
        onClose={() => setMenu(false)}
        title={entry.title.trim() || UNTITLED}
        items={[
          {
            label: 'Change type',
            icon: Shapes,
            subtitle: WORLD_TYPE_LABEL[entry.type],
            onPress: () => {
              setMenu(false);
              setTypeMenu(true);
            },
          },
          {
            label: 'Delete',
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
        visible={typeMenu}
        onClose={() => setTypeMenu(false)}
        title="Change type"
        items={WORLD_TYPES.map(type => ({
          label: WORLD_TYPE_LABEL[type],
          icon: entry.type === type ? Check : WORLD_TYPE_ICON[type],
          onPress: () => {
            setTypeMenu(false);
            update(entry.id, { type });
          },
        }))}
      />
      <MenuSheet
        visible={anchorMenu}
        onClose={() => setAnchorMenu(false)}
        title="Time anchor"
        items={anchorOptions.map(option => ({
          label: anchorLabel(option.value, chapters),
          icon: activeAnchor === option.value ? Check : undefined,
          onPress: () => {
            setAnchorMenu(false);
            update(entry.id, { anchor: option.value });
          },
        }))}
      />
      <MenuSheet
        visible={!!imageMenu}
        onClose={() => setImageMenu(null)}
        title="Image"
        items={[
          {
            label: 'Set as main image',
            icon: Star,
            disabled: entry.images[0] === imageMenu,
            onPress: () => {
              const path = imageMenu;
              setImageMenu(null);
              if (path) {
                update(entry.id, { images: [path, ...currentImages().filter(item => item !== path)] });
              }
            },
          },
          {
            label: 'Delete',
            icon: Trash2,
            destructive: true,
            onPress: () => {
              const path = imageMenu;
              setImageMenu(null);
              if (path) {
                removeImage(path);
              }
            },
          },
        ]}
      />
      <MenuSheet
        visible={!!chipCharacter}
        onClose={() => setChipMenuId(null)}
        title={chipCharacter ? chipCharacter.name.trim() || 'Unnamed' : undefined}
        items={[
          {
            label: 'Remove from this entry',
            icon: Trash2,
            destructive: true,
            onPress: () => {
              update(entry.id, { characterIds: entry.characterIds.filter(id => id !== chipMenuId) });
              setChipMenuId(null);
            },
          },
        ]}
      />
      <CharacterPicker
        visible={picker === 'related'}
        onClose={() => setPicker(null)}
        projectId={entry.projectId}
        excludeIds={entry.characterIds}
        title="Related characters"
        onPick={characterId => {
          setPicker(null);
          if (characterId && !entry.characterIds.includes(characterId)) {
            update(entry.id, { characterIds: [...entry.characterIds, characterId] });
          }
        }}
      />
      <CharacterPicker
        visible={picker === 'leader'}
        onClose={() => setPicker(null)}
        projectId={entry.projectId}
        selectedIds={entry.leaderId ? [entry.leaderId] : []}
        title="Choose a leader"
        allowClear
        onPick={characterId => {
          setPicker(null);
          update(entry.id, { leaderId: characterId });
        }}
      />
      <ImageViewer path={viewing} title={entry.title.trim() || undefined} onClose={() => setViewing(null)} />
      {describeOpen && (
        <DescribeSheet
          entryId={entry.id}
          title={titleText}
          onClose={() => setDescribeOpen(false)}
          onApplied={() => setBodyVersion(version => version + 1)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space.xl * 2 },
  emptyStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    height: 52,
    marginHorizontal: space.lg,
    marginTop: space.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: radius.md,
  },
  images: { paddingHorizontal: space.lg, paddingTop: space.md, gap: space.md },
  imageFrame: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderWidth: 2,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  addTile: { borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: space.xs },
  mainBadge: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderTopRightRadius: radius.sm,
  },
  body: { padding: space.lg },
  titleInput: { paddingVertical: space.sm, paddingHorizontal: 0, borderBottomWidth: 1, marginBottom: space.lg },
  block: { marginBottom: space.lg },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: -space.sm,
    marginBottom: space.lg,
  },
  aiHint: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm },
  charChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 2,
    borderRadius: radius.pill,
    paddingLeft: space.xs,
    paddingRight: space.md,
    paddingVertical: space.xs,
    maxWidth: 220,
  },
  charName: { flexShrink: 1 },
  note: { marginTop: space.sm },
  sectionGap: { marginTop: space.xl },
});
