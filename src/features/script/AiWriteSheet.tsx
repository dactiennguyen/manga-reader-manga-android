import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AiErrorBox, AiLoading, AiNote } from '../../components/ai';
import { Avatar } from '../../components/comic';
import {
  ArrowRight,
  Check,
  PenLine,
  RefreshCw,
  Repeat,
  Scissors,
  Settings,
  Sparkles,
  Speech,
  Zap,
} from '../../components/icons';
import { Sheet } from '../../components/Sheet';
import { Button, Chip, ListItem, TextField } from '../../components/ui';
import { useAiConfigured } from '../../lib/ai/client';
import { scriptText, storyBrief } from '../../lib/ai/context';
import { useAiTask } from '../../lib/ai/useAiTask';
import { changeVoice, continueScript, rewriteBlocks, shortenLine, suggestSfx } from '../../lib/ai/writing';
import type { BlockDraft } from '../../lib/ai/writing';
import { plural } from '../../lib/format';
import { BLOCK_LABEL, DIALOGUE_KIND_LABEL, LIMITS } from '../../model/constants';
import type { Block, Character, ID, Scene } from '../../model/types';
import { useCharacters } from '../../store/hooks';
import { useStory } from '../../store/useStory';
import { font, fontFamily, radius, space, useTheme } from '../../theme';
import { actionAvailability, findBlock, MAX_SCENE_REWRITE, nextBlockId, pairRewrite, rewriteTargets } from './aiDrafts';
import type { AiAction, RewriteScope, TextChange } from './aiDrafts';

type Result =
  | { kind: 'continue'; drafts: BlockDraft[] }
  | { kind: 'rewrite'; targets: Block[]; drafts: BlockDraft[] }
  | { kind: 'line'; text: string }
  | { kind: 'sfx'; words: string[] };

const TITLE: Record<AiAction, string> = {
  continue: 'Continue writing',
  rewrite: 'Rewrite',
  voice: 'Change voice',
  shorten: 'Shorten',
  sfx: 'SFX ideas',
};

const QUICK_INSTRUCTIONS = ['more dramatic', 'funnier', 'shorter', 'clearer'];

function snippet(text: string): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  return clean.length > 60 ? `${clean.slice(0, 60)}…` : clean;
}

export function AiToolbarButton({ onPress }: { onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="AI writing help"
      hitSlop={4}
      style={({ pressed }) => [
        styles.aiButton,
        { backgroundColor: c.aiSoft, borderColor: c.ai, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Sparkles size={16} color={c.ai} />
      <Text style={[styles.aiButtonText, { color: c.ai }]}>AI</Text>
    </Pressable>
  );
}

function DraftBlockView({ draft, character }: { draft: BlockDraft; character: Character | undefined }) {
  const { c } = useTheme();
  if (draft.type === 'dialogue') {
    return (
      <View style={[styles.dialogue, { borderColor: c.ink, backgroundColor: c.surface }]}>
        <View style={styles.dialogueHead}>
          <View style={styles.speaker}>
            <Avatar character={character} size={24} />
            <Text style={[styles.speakerName, { color: character ? c.text : c.warning }]} numberOfLines={1}>
              {character ? character.name || 'Unnamed' : draft.characterName || 'No character'}
            </Text>
          </View>
          <Text style={[font.caption, { color: c.textSecondary }]}>{DIALOGUE_KIND_LABEL[draft.kind ?? 'speak']}</Text>
        </View>
        <Text style={[styles.text, { color: c.text }]}>{draft.text}</Text>
        {!character && (
          <Text style={[font.caption, { color: c.warning }]}>
            {draft.characterName
              ? `"${draft.characterName}" is not in your cast. The line is inserted without a character.`
              : 'The line is inserted without a character.'}
          </Text>
        )}
      </View>
    );
  }
  if (draft.type === 'narration') {
    return (
      <View style={[styles.narration, { borderColor: c.ink, backgroundColor: c.surfaceAlt }]}>
        <Text style={[styles.text, styles.narrationText, { color: c.text }]}>{draft.text}</Text>
      </View>
    );
  }
  if (draft.type === 'sfx') {
    return (
      <View style={styles.sfx}>
        <Text style={[styles.typeLabel, { color: c.muted }]}>{BLOCK_LABEL.sfx}</Text>
        <Text style={[styles.sfxText, { color: c.text }]}>{draft.text}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.barred, { borderLeftColor: draft.type === 'setting' ? c.ink : c.border }]}>
      <Text style={[styles.typeLabel, { color: c.muted }]}>{BLOCK_LABEL[draft.type]}</Text>
      <Text style={[styles.text, draft.type === 'setting' && styles.settingText, { color: c.text }]}>{draft.text}</Text>
    </View>
  );
}

function BeforeAfter({ label, before, after }: { label?: string; before: string; after: string }) {
  const { c } = useTheme();
  return (
    <View style={[styles.diff, { borderColor: c.border, backgroundColor: c.surface }]}>
      {!!label && <Text style={[styles.typeLabel, { color: c.muted }]}>{label}</Text>}
      <View style={styles.diffRow}>
        <View style={styles.flex}>
          <Text style={[styles.diffLabel, { color: c.muted }]}>Before</Text>
          <Text style={[styles.text, { color: c.textSecondary }]}>{before}</Text>
        </View>
        <ArrowRight size={16} color={c.ai} />
        <View style={styles.flex}>
          <Text style={[styles.diffLabel, { color: c.ai }]}>After</Text>
          <Text style={[styles.text, { color: c.text }]}>{after}</Text>
        </View>
      </View>
    </View>
  );
}

function Footer({ children }: { children: ReactNode }) {
  return <View style={styles.footer}>{children}</View>;
}

export function AiWriteSheet({
  chapterId,
  projectId,
  blockId,
  initialAction,
  onClose,
  onInsert,
  onReplace,
  onOpenProfile,
}: {
  chapterId: ID;
  projectId: ID;
  blockId: ID | null;
  initialAction?: AiAction;
  onClose: () => void;
  onInsert: (afterBlockId: ID | null, drafts: BlockDraft[]) => void;
  onReplace: (changes: TextChange[]) => void;
  onOpenProfile: () => void;
}) {
  const { c } = useTheme();
  const configured = useAiConfigured();
  const sceneIds = useStory(s => s.chapters[chapterId]?.sceneIds);
  const allScenes = useStory(s => s.scenes);
  const scenes = useMemo(
    () => (sceneIds ?? []).map(id => allScenes[id]).filter((scene): scene is Scene => Boolean(scene)),
    [sceneIds, allScenes],
  );
  const characters = useCharacters(projectId);
  const charactersById = useMemo(
    () => Object.fromEntries(characters.map(character => [character.id, character])) as Record<ID, Character>,
    [characters],
  );
  const location = useMemo(() => findBlock(scenes, blockId), [scenes, blockId]);
  const speaker = location?.block.characterId ? charactersById[location.block.characterId] : undefined;
  const available = actionAvailability(location, !!speaker);
  const sceneTooBig = !!location && location.scene.blocks.length > MAX_SCENE_REWRITE;
  const blockHasText = !!location?.block.text.trim();
  const [action, setAction] = useState<AiAction | null>(
    initialAction && available[initialAction] ? initialAction : null,
  );
  const [scope, setScope] = useState<RewriteScope>(blockHasText || sceneTooBig ? 'block' : 'scene');
  const [instruction, setInstruction] = useState('');
  const { state, start, cancel, reset } = useAiTask<Result>();
  const autoStarted = useRef(false);

  const run = useCallback(
    (which: AiAction, options: { scope: RewriteScope; instruction: string }) => {
      const store = useStory.getState();
      const brief = storyBrief(store, projectId, { chapterId }).text;
      if (which === 'continue') {
        const until = location ? nextBlockId(scenes, location.block.id) : undefined;
        const script = scriptText(store, chapterId, { untilBlockId: until });
        start(async signal => ({ kind: 'continue', drafts: await continueScript(brief, script, characters, signal) }));
        return;
      }
      if (!location) {
        return;
      }
      if (which === 'rewrite') {
        const targets = rewriteTargets(location, options.scope);
        start(async signal => ({
          kind: 'rewrite',
          targets,
          drafts: await rewriteBlocks(brief, targets, charactersById, options.instruction.trim(), signal),
        }));
      } else if (which === 'voice' && speaker) {
        start(async signal => ({ kind: 'line', text: await changeVoice(brief, location.block.text, speaker, signal) }));
      } else if (which === 'shorten') {
        start(async signal => ({ kind: 'line', text: await shortenLine(location.block.text, signal) }));
      } else if (which === 'sfx') {
        start(async signal => ({ kind: 'sfx', words: await suggestSfx(location.block.text, signal) }));
      }
    },
    [chapterId, projectId, location, scenes, characters, charactersById, speaker, start],
  );

  useEffect(() => {
    if (action && action !== 'rewrite' && configured && !autoStarted.current) {
      autoStarted.current = true;
      run(action, { scope, instruction });
    }
  }, [action, configured, run, scope, instruction]);

  const choose = (which: AiAction) => {
    autoStarted.current = true;
    reset();
    setAction(which);
    if (which !== 'rewrite') {
      run(which, { scope, instruction });
    }
  };

  const back = () => {
    cancel();
    reset();
    setAction(null);
  };

  const retry = () => {
    if (action) {
      run(action, { scope, instruction });
    }
  };

  const loadingLabel = (): string => {
    if (action === 'continue') {
      return 'Writing the next blocks…';
    }
    if (action === 'rewrite') {
      return scope === 'scene' ? 'Rewriting the scene…' : 'Rewriting the block…';
    }
    if (action === 'voice') {
      return `Rewriting in ${speaker?.name || 'the character'}'s voice…`;
    }
    if (action === 'shorten') {
      return 'Shortening the line…';
    }
    return 'Thinking of sounds…';
  };

  const renderMenu = () => (
    <>
      <View style={styles.intro}>
        <Text style={[font.caption, { color: c.muted }]}>
          {location
            ? `Working on the focused ${BLOCK_LABEL[
                location.block.type
              ].toLowerCase()} block. Nothing is changed until you accept a preview.`
            : 'No block is focused, so new text goes to the end of the script. Nothing is changed until you accept a preview.'}
        </Text>
      </View>
      <ListItem
        title={TITLE.continue}
        subtitle={location ? 'Write the next 3 to 5 blocks after this one' : 'Write the next 3 to 5 blocks at the end'}
        icon={PenLine}
        iconColor={c.ai}
        onPress={() => choose('continue')}
      />
      <ListItem
        title={TITLE.rewrite}
        subtitle={
          available.rewrite
            ? 'This block or the whole scene, with an optional instruction'
            : 'Focus a written block first'
        }
        icon={Repeat}
        iconColor={c.ai}
        disabled={!available.rewrite}
        onPress={() => choose('rewrite')}
      />
      <ListItem
        title={TITLE.voice}
        subtitle={
          available.voice
            ? `Make the line sound like ${speaker?.name || 'the character'}`
            : 'Dialogue with a character only'
        }
        icon={Speech}
        iconColor={c.ai}
        disabled={!available.voice}
        onPress={() => choose('voice')}
      />
      <ListItem
        title={TITLE.shorten}
        subtitle={
          available.shorten
            ? location && location.block.text.trim().length > LIMITS.longDialogue
              ? `${location.block.text.trim().length} characters, too long for one bubble`
              : 'Make the line fit one speech bubble'
            : 'Dialogue only'
        }
        icon={Scissors}
        iconColor={c.ai}
        disabled={!available.shorten}
        onPress={() => choose('shorten')}
      />
      <ListItem
        title={TITLE.sfx}
        subtitle={available.sfx ? 'Three sound effects for this action' : 'Action blocks only'}
        icon={Zap}
        iconColor={c.ai}
        disabled={!available.sfx}
        onPress={() => choose('sfx')}
      />
    </>
  );

  const renderRewriteForm = () => (
    <>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={[font.label, { color: c.text }]}>What to rewrite</Text>
        <View style={styles.row}>
          {blockHasText && <Chip label="This block" selected={scope === 'block'} onPress={() => setScope('block')} />}
          {!sceneTooBig && <Chip label="Whole scene" selected={scope === 'scene'} onPress={() => setScope('scene')} />}
        </View>
        {sceneTooBig && (
          <Text style={[font.caption, { color: c.muted }]}>
            This scene has more than {MAX_SCENE_REWRITE} blocks, so only the focused block is rewritten.
          </Text>
        )}
        <Text style={[font.label, { color: c.text }]}>Instruction (optional)</Text>
        <TextField
          value={instruction}
          onChangeText={setInstruction}
          onClear={() => setInstruction('')}
          placeholder="e.g. more tension, fewer words"
          returnKeyType="go"
          onSubmitEditing={() => run('rewrite', { scope, instruction })}
          maxLength={120}
        />
        <View style={styles.row}>
          {QUICK_INSTRUCTIONS.map(label => (
            <Chip
              key={label}
              label={label}
              selected={instruction === label}
              onPress={() => setInstruction(instruction === label ? '' : label)}
            />
          ))}
        </View>
      </ScrollView>
      <Footer>
        <Button
          title={scope === 'scene' ? 'Rewrite scene' : 'Rewrite block'}
          icon={Sparkles}
          variant="ai"
          onPress={() => run('rewrite', { scope, instruction })}
        />
      </Footer>
    </>
  );

  const renderResult = (result: Result) => {
    if (result.kind === 'continue') {
      return (
        <>
          <ScrollView contentContainerStyle={styles.body}>
            <AiNote text={location ? 'Inserted after the focused block' : 'Inserted at the end of the script'} />
            {result.drafts.map((draft, index) => (
              <DraftBlockView
                key={index}
                draft={draft}
                character={draft.characterId ? charactersById[draft.characterId] : undefined}
              />
            ))}
          </ScrollView>
          <Footer>
            <Button
              title={`Insert ${plural(result.drafts.length, 'block')}`}
              icon={Check}
              onPress={() => onInsert(location?.block.id ?? null, result.drafts)}
            />
            <View style={styles.row}>
              <Button title="Try again" icon={RefreshCw} variant="secondary" onPress={retry} style={styles.flex} />
              <Button title="Discard" variant="ghost" onPress={back} style={styles.flex} />
            </View>
          </Footer>
        </>
      );
    }
    if (result.kind === 'rewrite') {
      const pairs = pairRewrite(result.targets, result.drafts);
      const byId = new Map(result.targets.map(target => [target.id, target]));
      const mismatch = result.drafts.length !== result.targets.length;
      return (
        <>
          <ScrollView contentContainerStyle={styles.body}>
            <AiNote
              text={instruction.trim() ? `Rewritten to be ${instruction.trim()}` : 'Rewritten for rhythm and clarity'}
            />
            {mismatch && (
              <Text style={[font.caption, { color: c.warning }]}>
                The AI answered with {plural(result.drafts.length, 'block')} for{' '}
                {plural(result.targets.length, 'block')}. Blocks without a match keep their text.
              </Text>
            )}
            {pairs.map(pair => {
              const target = byId.get(pair.id);
              const name = target?.characterId ? charactersById[target.characterId]?.name : undefined;
              return (
                <BeforeAfter
                  key={pair.id}
                  label={target ? `${BLOCK_LABEL[target.type]}${name ? ` · ${name}` : ''}` : undefined}
                  before={target?.text ?? ''}
                  after={pair.text}
                />
              );
            })}
            {!pairs.length && <Text style={[font.body, { color: c.muted }]}>The AI returned nothing usable.</Text>}
          </ScrollView>
          <Footer>
            <Button
              title={pairs.length > 1 ? `Replace ${plural(pairs.length, 'block')}` : 'Replace'}
              icon={Check}
              disabled={!pairs.length}
              onPress={() => onReplace(pairs)}
            />
            <View style={styles.row}>
              <Button title="Try again" icon={RefreshCw} variant="secondary" onPress={retry} style={styles.flex} />
              <Button title="Discard" variant="ghost" onPress={back} style={styles.flex} />
            </View>
          </Footer>
        </>
      );
    }
    if (result.kind === 'line') {
      const length = result.text.length;
      const fits = length <= LIMITS.longDialogue;
      return (
        <>
          <ScrollView contentContainerStyle={styles.body}>
            <AiNote
              text={
                action === 'voice'
                  ? `In ${speaker?.name || 'the character'}'s voice`
                  : fits
                  ? `${length} characters, fits a bubble`
                  : `${length} characters, still over ${LIMITS.longDialogue}`
              }
            />
            <BeforeAfter
              label={speaker ? `${BLOCK_LABEL.dialogue} · ${speaker.name}` : BLOCK_LABEL.dialogue}
              before={location?.block.text ?? ''}
              after={result.text}
            />
          </ScrollView>
          <Footer>
            <Button
              title="Replace"
              icon={Check}
              disabled={!location}
              onPress={() => location && onReplace([{ id: location.block.id, text: result.text }])}
            />
            <View style={styles.row}>
              <Button title="Try again" icon={RefreshCw} variant="secondary" onPress={retry} style={styles.flex} />
              <Button title="Discard" variant="ghost" onPress={back} style={styles.flex} />
            </View>
          </Footer>
        </>
      );
    }
    return (
      <>
        <ScrollView contentContainerStyle={styles.body}>
          <AiNote text="Tap a sound to add it after the action" />
          <Text style={[font.body, { color: c.textSecondary }]}>{location?.block.text}</Text>
          <View style={styles.row}>
            {result.words.map(word => (
              <Pressable
                key={word}
                onPress={() => location && onInsert(location.block.id, [{ type: 'sfx', text: word }])}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.sfxChip,
                  { borderColor: c.ink, backgroundColor: c.surface, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text style={[styles.sfxText, { color: c.text }]}>{word}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <Footer>
          <View style={styles.row}>
            <Button title="Try again" icon={RefreshCw} variant="secondary" onPress={retry} style={styles.flex} />
            <Button title="Discard" variant="ghost" onPress={back} style={styles.flex} />
          </View>
        </Footer>
      </>
    );
  };

  const renderBody = () => {
    if (!configured) {
      return (
        <View style={styles.body}>
          <Text style={[font.body, { color: c.textSecondary }]}>
            Writing help needs an AI server. Set its address in Profile first.
          </Text>
          <Button title="Open Profile" icon={Settings} variant="ai" onPress={onOpenProfile} />
        </View>
      );
    }
    if (action === null) {
      return renderMenu();
    }
    if (state.status === 'loading') {
      return (
        <View style={styles.body}>
          <AiLoading label={loadingLabel()} onCancel={action === 'rewrite' ? cancel : back} />
        </View>
      );
    }
    if (state.status === 'error') {
      return (
        <View style={styles.body}>
          <AiErrorBox message={state.message} onRetry={retry} onDismiss={back} />
        </View>
      );
    }
    if (state.status === 'done') {
      return renderResult(state.data);
    }
    if (action === 'rewrite') {
      return renderRewriteForm();
    }
    return (
      <Footer>
        <Button title="Try again" icon={RefreshCw} variant="ai" onPress={retry} />
        <Button title="Back" variant="ghost" onPress={back} />
      </Footer>
    );
  };

  const subtitle = location
    ? `${BLOCK_LABEL[location.block.type]}${speaker ? ` · ${speaker.name}` : ''}${
        location.block.text.trim() ? ` · ${snippet(location.block.text)}` : ''
      }`
    : 'End of the script';

  return (
    <Sheet
      visible
      onClose={onClose}
      title={action ? TITLE[action] : 'AI writing help'}
      subtitle={subtitle}
      right={action !== null && configured ? <Button title="Back" variant="ghost" small onPress={back} /> : undefined}
      scroll={false}
      maxHeight="90%"
    >
      {renderBody()}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1.5,
  },
  aiButtonText: { fontSize: 13, fontWeight: '700' },
  intro: { paddingHorizontal: space.lg, paddingBottom: space.sm },
  body: { paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.md },
  footer: { paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  text: { ...font.body, lineHeight: 22 },
  typeLabel: { ...font.overline, fontSize: 11 },
  barred: { borderLeftWidth: 3, paddingLeft: space.md, gap: 2 },
  settingText: { fontWeight: '700' },
  dialogue: {
    marginLeft: space.xl,
    borderWidth: 2,
    borderRadius: radius.xl,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    gap: space.xs,
  },
  dialogueHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  speaker: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1 },
  speakerName: { ...font.label, textTransform: 'uppercase', flexShrink: 1 },
  narration: { borderWidth: 2, paddingHorizontal: space.md, paddingVertical: space.xs },
  narrationText: { fontStyle: 'italic' },
  sfx: { paddingLeft: space.md },
  sfxText: { fontFamily: fontFamily.display, fontSize: 24, lineHeight: 34, letterSpacing: 1 },
  sfxChip: { borderWidth: 2, borderRadius: radius.md, paddingHorizontal: space.lg, paddingVertical: space.xs },
  diff: { borderWidth: 1.5, borderRadius: radius.md, padding: space.md, gap: space.xs },
  diffRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  diffLabel: { ...font.overline, fontSize: 11, marginBottom: 2 },
});
