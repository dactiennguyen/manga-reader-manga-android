import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Plus } from '../../components/icons';
import { Chip, ChipRow, FieldLabel, IconButton, TextField, toast } from '../../components/ui';
import { LIMITS } from '../../model/constants';
import type { Character } from '../../model/types';
import { useStory } from '../../store/useStory';
import { font, space, useTheme } from '../../theme';
import { AutoField } from './fields';

const TRAIT_MAX_LENGTH = 24;

export function ProfileTab({ character }: { character: Character }) {
  const { c } = useTheme();
  const [trait, setTrait] = useState('');
  const update = useStory(s => s.updateCharacter);
  const full = character.traits.length >= LIMITS.characterTraits;

  const addTrait = () => {
    const value = trait.trim();
    if (!value) {
      return;
    }
    if (full) {
      toast(`Up to ${LIMITS.characterTraits} traits`);
      return;
    }
    if (character.traits.some(item => item.toLowerCase() === value.toLowerCase())) {
      toast('This trait is already added');
      setTrait('');
      return;
    }
    update(character.id, { traits: [...character.traits, value] });
    setTrait('');
  };

  const removeTrait = (value: string) => {
    update(character.id, { traits: character.traits.filter(item => item !== value) });
  };

  return (
    <View>
      <View style={styles.block}>
        <FieldLabel>{`Traits (${character.traits.length}/${LIMITS.characterTraits})`}</FieldLabel>
        {character.traits.length > 0 && (
          <ChipRow style={styles.traits}>
            {character.traits.map(item => (
              <Chip key={item} label={`${item}  \u00D7`} onPress={() => removeTrait(item)} />
            ))}
          </ChipRow>
        )}
        <View style={styles.traitInputRow}>
          <TextField
            value={trait}
            onChangeText={setTrait}
            onSubmitEditing={addTrait}
            placeholder={full ? 'Trait limit reached' : 'e.g. hot-headed, kind'}
            maxLength={TRAIT_MAX_LENGTH}
            editable={!full}
            returnKeyType="done"
            submitBehavior="submit"
            style={styles.traitInput}
          />
          <IconButton icon={Plus} onPress={addTrait} disabled={full || !trait.trim()} accessibilityLabel="Add trait" />
        </View>
        <Text style={[font.caption, styles.traitHint, { color: c.muted }]}>Tap a trait to remove it.</Text>
      </View>

      <AutoField
        label="Goal"
        value={character.goal}
        onCommit={goal => update(character.id, { goal })}
        placeholder="What does this character want?"
        maxLength={200}
      />
      <AutoField
        label="Weakness"
        value={character.weakness}
        onCommit={weakness => update(character.id, { weakness })}
        placeholder="What holds this character back?"
        maxLength={200}
      />
      <AutoField
        label="Way of speaking"
        value={character.voice}
        onCommit={voice => update(character.id, { voice })}
        placeholder="Catchphrases, tone, fast or slow talker…"
        multiline
        maxLength={400}
        minHeight={80}
      />
      <AutoField
        label="Backstory"
        value={character.bio}
        onCommit={bio => update(character.id, { bio })}
        placeholder="Origins, past, key turning points…"
        multiline
        maxLength={LIMITS.bio}
        showCount
        minHeight={140}
      />
      <AutoField
        label="Gender"
        value={character.gender}
        onCommit={gender => update(character.id, { gender })}
        placeholder="Male, female or describe"
        maxLength={30}
      />
      <AutoField
        label="Notes"
        value={character.notes}
        onCommit={notes => update(character.id, { notes })}
        placeholder="Your private notes about this character"
        multiline
        maxLength={1000}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: space.lg },
  traits: { marginBottom: space.sm },
  traitInputRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  traitInput: { flex: 1 },
  traitHint: { marginTop: space.xs },
});
