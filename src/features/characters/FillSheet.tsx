import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAppNavigation } from '../../app/routes';
import { Tag } from '../../components/comic';
import { RefreshCw, Sparkles } from '../../components/icons';
import { Sheet } from '../../components/Sheet';
import { Button, FieldLabel, Segmented, TextField, toast } from '../../components/ui';
import { useAiConfigured } from '../../lib/ai/client';
import { storyBrief } from '../../lib/ai/context';
import { suggestCharacter, type CharacterDraft } from '../../lib/ai/people';
import { useAiTask } from '../../lib/ai/useAiTask';
import { plural } from '../../lib/format';
import type { Character } from '../../model/types';
import { useStory } from '../../store/useStory';
import { font, radius, space, useTheme } from '../../theme';
import { AiBusy, AiFailure, AiMark, AiSetupNotice, SheetFooter } from '../outline/AiParts';
import { fillKeywords, fillPatch, fillRows, type FillMode } from './characterFill';

const MODES: readonly { value: FillMode; label: string }[] = [
  { value: 'empty', label: 'Fill empty fields only' },
  { value: 'all', label: 'Replace all fields' },
];

export function FillSheet({
  character,
  onClose,
  onApplied,
}: {
  character: Character;
  onClose: () => void;
  onApplied: (patch: Partial<CharacterDraft>) => void;
}) {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const configured = useAiConfigured();
  const { state, start, cancel, reset } = useAiTask<CharacterDraft>();
  const [keywords, setKeywords] = useState(() => fillKeywords(character));
  const [mode, setMode] = useState<FillMode>('empty');

  const generate = () => {
    const words = keywords.trim();
    if (!words) {
      return;
    }
    const brief = storyBrief(useStory.getState(), character.projectId).text;
    start(signal => suggestCharacter(brief, words, signal));
  };

  const openProfile = () => {
    onClose();
    navigation.navigate('Tabs', { screen: 'Profile' });
  };

  const apply = (draft: CharacterDraft) => {
    const store = useStory.getState();
    const current = store.characters[character.id];
    if (!current) {
      return;
    }
    const patch = fillPatch(current, draft, mode);
    const count = Object.keys(patch).length;
    if (!count) {
      toast('Every field already has a value');
      return;
    }
    store.updateCharacter(character.id, patch);
    onApplied(patch);
    onClose();
    toast(`${plural(count, 'field')} filled by AI`);
  };

  const renderBody = () => {
    if (!configured) {
      return <AiSetupNotice onOpenProfile={openProfile} />;
    }
    if (state.status === 'loading') {
      return <AiBusy label="Writing the character…" onCancel={cancel} />;
    }
    if (state.status === 'error') {
      return (
        <>
          <AiFailure message={state.message} onRetry={generate} />
          <SheetFooter>
            <Button title="Back" variant="ghost" onPress={reset} />
          </SheetFooter>
        </>
      );
    }
    if (state.status === 'done') {
      const draft = state.data;
      const current = useStory.getState().characters[character.id] ?? character;
      const rows = fillRows(current, draft, mode).filter(row => row.value);
      const applied = rows.filter(row => row.applied).length;
      return (
        <>
          <ScrollView contentContainerStyle={styles.body}>
            <AiMark />
            <Text style={[font.caption, { color: c.muted }]}>
              Nothing is saved until you fill the profile. You can edit every field afterwards.
            </Text>
            <Segmented options={MODES} value={mode} onChange={setMode} />
            {mode === 'empty' && (
              <Text style={[font.caption, { color: c.muted }]}>
                Fields you already filled in, including the name, are kept.
              </Text>
            )}
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.ai }]}>
              {rows.map((row, index) => (
                <View
                  key={row.key}
                  style={[styles.row, index > 0 && [styles.rowDivider, { borderTopColor: c.border }]]}
                >
                  <View style={styles.rowHead}>
                    <Text style={[font.overline, { color: row.applied ? c.ai : c.muted }]}>{row.label}</Text>
                    {!row.applied && <Tag label="Kept" />}
                  </View>
                  <Text style={[font.body, { color: row.applied ? c.text : c.muted }]}>{row.value}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
          <SheetFooter>
            <Button
              title={applied ? `Fill ${plural(applied, 'field')}` : 'Nothing to fill'}
              icon={Sparkles}
              variant="ai"
              disabled={!applied}
              onPress={() => apply(draft)}
            />
            <View style={styles.actions}>
              <Button title="Try again" icon={RefreshCw} variant="secondary" onPress={generate} style={styles.flex} />
              <Button title="Discard" variant="ghost" onPress={onClose} style={styles.flex} />
            </View>
          </SheetFooter>
        </>
      );
    }
    return (
      <>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={[font.body, { color: c.textSecondary }]}>
            Describe the character in a few keywords. The AI drafts the name, role, traits, goal, weakness, way of
            speaking, backstory and appearance for you to review.
          </Text>
          <View>
            <FieldLabel>Keywords</FieldLabel>
            <TextField
              value={keywords}
              onChangeText={setKeywords}
              placeholder="shy swordswoman, hides a scar, hates lying"
              multiline
              maxLength={300}
              autoFocus
              textAlignVertical="top"
              style={styles.keywords}
              inputStyle={styles.keywordsInput}
            />
          </View>
        </ScrollView>
        <SheetFooter>
          <Button
            title="Suggest character"
            icon={Sparkles}
            variant="ai"
            disabled={!keywords.trim()}
            onPress={generate}
          />
        </SheetFooter>
      </>
    );
  };

  return (
    <Sheet
      visible
      onClose={onClose}
      title="Fill with AI"
      subtitle={character.name.trim() || 'New character'}
      scroll={false}
      maxHeight="90%"
    >
      {renderBody()}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.md },
  keywords: { alignItems: 'flex-start', paddingVertical: space.sm, minHeight: 96 },
  keywordsInput: { minHeight: 72, textAlignVertical: 'top' },
  card: { borderWidth: 2, borderRadius: radius.lg, paddingHorizontal: space.md },
  row: { paddingVertical: space.sm, gap: 2 },
  rowDivider: { borderTopWidth: 1 },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  actions: { flexDirection: 'row', gap: space.sm },
});
