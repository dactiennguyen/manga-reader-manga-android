import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppNavigation } from '../../app/routes';
import { CharacterPicker } from '../../components/CharacterPicker';
import { ArrowRight, Plus, Trash2 } from '../../components/icons';
import { Sheet } from '../../components/Sheet';
import { Button, Chip, ChipRow, confirm, FieldLabel, TextField, toast } from '../../components/ui';
import { LIMITS } from '../../model/constants';
import type { ID } from '../../model/types';
import { useChapter } from '../../store/hooks';
import { useStory } from '../../store/useStory';
import { font, space, useTheme } from '../../theme';

export function ChapterEditSheet({
  chapterId,
  number,
  onClose,
}: {
  chapterId: ID | undefined;
  number: number;
  onClose: () => void;
}) {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const chapter = useChapter(chapterId);
  const characters = useStory(s => s.characters);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [goal, setGoal] = useState('');
  const [picking, setPicking] = useState(false);

  const loadedId = chapter?.id;
  useEffect(() => {
    const current = loadedId ? useStory.getState().chapters[loadedId] : undefined;
    if (current) {
      setTitle(current.title);
      setSummary(current.summary);
      setGoal(current.goal);
    }
  }, [loadedId]);

  if (!chapter) {
    return null;
  }

  const update = useStory.getState().updateChapter;
  const cast = chapter.characterIds.filter(id => characters[id]);

  const toggleCharacter = (id: ID | undefined) => {
    if (!id) {
      return;
    }
    const next = cast.includes(id) ? cast.filter(item => item !== id) : [...cast, id];
    update(chapter.id, { characterIds: next });
  };

  const remove = async () => {
    const pages = chapter.pageIds.length;
    const ok = await confirm(
      `Delete chapter ${number}?`,
      `Its script${
        pages ? ` and ${pages} ${pages === 1 ? 'page' : 'pages'}` : ''
      } will be deleted too. This cannot be undone.`,
      { confirmText: 'Delete chapter', destructive: true },
    );
    if (ok) {
      onClose();
      useStory.getState().removeChapter(chapter.id);
      toast('Chapter deleted');
    }
  };

  const openScript = () => {
    onClose();
    navigation.navigate('Script', { chapterId: chapter.id });
  };

  return (
    <Sheet visible onClose={onClose} title={`Chapter ${number}`}>
      <View style={styles.body}>
        <FieldLabel>Chapter title</FieldLabel>
        <TextField
          value={title}
          maxLength={LIMITS.chapterTitle}
          placeholder="Chapter title"
          onChangeText={value => {
            setTitle(value);
            update(chapter.id, { title: value });
          }}
        />
        <View style={styles.labelRow}>
          <FieldLabel>Summary</FieldLabel>
          <Text style={[styles.counter, { color: c.muted }]}>
            {summary.length}/{LIMITS.chapterSummary}
          </Text>
        </View>
        <TextField
          value={summary}
          multiline
          maxLength={LIMITS.chapterSummary}
          placeholder="What happens in this chapter?"
          inputStyle={styles.multiline}
          onChangeText={value => {
            setSummary(value);
            update(chapter.id, { summary: value });
          }}
        />
        <FieldLabel>Chapter goal</FieldLabel>
        <TextField
          value={goal}
          maxLength={120}
          placeholder="What should the reader learn or feel?"
          onChangeText={value => {
            setGoal(value);
            update(chapter.id, { goal: value });
          }}
        />
        <FieldLabel>Characters</FieldLabel>
        <ChipRow>
          {cast.map(id => (
            <Chip key={id} label={characters[id].name || 'Unnamed'} selected onPress={() => toggleCharacter(id)} />
          ))}
          <Chip label="Add" icon={Plus} onPress={() => setPicking(true)} />
        </ChipRow>
        {cast.length > 0 && (
          <Text style={[styles.hint, { color: c.muted }]}>Tap a name to remove it from the chapter.</Text>
        )}
        <Button title="Write script" icon={ArrowRight} onPress={openScript} style={styles.primary} />
        <Button title="Delete chapter" icon={Trash2} variant="danger" onPress={remove} />
      </View>
      <CharacterPicker
        visible={picking}
        onClose={() => setPicking(false)}
        projectId={chapter.projectId}
        selectedIds={cast}
        title="Characters"
        onPick={id => {
          setPicking(false);
          toggleCharacter(id);
        }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.lg, paddingBottom: space.xl, gap: space.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counter: { ...font.caption },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  hint: { ...font.caption },
  primary: { marginTop: space.md },
});
