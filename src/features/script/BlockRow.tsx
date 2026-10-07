import type { ComponentRef } from 'react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Avatar } from '../../components/comic';
import { BLOCK_LABEL, DIALOGUE_KIND_LABEL, LIMITS } from '../../model/constants';
import type { Block, Character, ID } from '../../model/types';
import { font, fontFamily, radius, space, useTheme } from '../../theme';

export type BlockApi = {
  text: (blockId: ID, text: string) => void;
  enter: (blockId: ID, before: string, after: string) => void;
  backspaceEmpty: (blockId: ID) => void;
  focus: (blockId: ID) => void;
  blur: (blockId: ID) => void;
  register: (blockId: ID, input: ComponentRef<typeof TextInput> | null) => void;
  layout: (blockId: ID, y: number) => void;
  pickCharacter: (blockId: ID) => void;
  cycleKind: (blockId: ID) => void;
  openPanel: (pageId: ID) => void;
  shorten: (blockId: ID) => void;
  flushRef: { current: (() => void) | null };
};

export type BlockMark = 'match' | 'current';

const DEBOUNCE_MS = 300;

const PLACEHOLDER: Record<Block['type'], string> = {
  setting: 'Where and when?',
  action: 'What happens?',
  dialogue: 'Dialogue…',
  narration: 'Narration…',
  sfx: 'BOOM!',
};

function BlockRowBase({
  block,
  character,
  panelLabel,
  panelPageId,
  placeholder,
  mark,
  api,
}: {
  block: Block;
  character: Character | undefined;
  panelLabel?: string;
  panelPageId?: ID;
  placeholder?: string;
  mark?: BlockMark;
  api: BlockApi;
}) {
  const { c } = useTheme();
  const [text, setText] = useState(block.text);
  const latest = useRef(block.text);
  const pushed = useRef(block.text);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const caret = useRef<number | null>(null);
  const submittedAt = useRef(0);
  const id = block.id;
  const type = block.type;

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (latest.current !== pushed.current) {
      pushed.current = latest.current;
      api.text(id, latest.current);
    }
  }, [api, id]);

  useEffect(() => {
    if (block.text !== pushed.current) {
      pushed.current = block.text;
      latest.current = block.text;
      setText(block.text);
    }
  }, [block.text]);

  useEffect(
    () => () => {
      flush();
      if (api.flushRef.current === flush) {
        api.flushRef.current = null;
      }
    },
    [api, flush],
  );

  const apply = (value: string) => {
    latest.current = value;
    setText(value);
  };

  const onChangeText = (value: string) => {
    const prev = latest.current;
    if (value.length === prev.length + 1) {
      const at = value.indexOf('\n');
      if (at >= 0 && value.slice(0, at) + value.slice(at + 1) === prev) {
        const before = prev.slice(0, at);
        const after = prev.slice(at);
        if (timer.current) {
          clearTimeout(timer.current);
          timer.current = null;
        }
        apply(before);
        pushed.current = before;
        api.enter(id, before, after);
        return;
      }
    }
    if (type === 'dialogue' && value.startsWith('@') && !prev.startsWith('@')) {
      apply(value.slice(1));
      api.pickCharacter(id);
      return;
    }
    apply(value);
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(flush, DEBOUNCE_MS);
  };

  const onSubmit = () => {
    const now = Date.now();
    if (now - submittedAt.current < 300) {
      return;
    }
    submittedAt.current = now;
    const value = latest.current;
    const at = Math.min(caret.current ?? value.length, value.length);
    const before = value.slice(0, at);
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    api.text(id, value);
    apply(before);
    pushed.current = before;
    api.enter(id, before, value.slice(at));
  };

  const long = type === 'dialogue' && text.length > LIMITS.longDialogue;

  const input = (
    <TextInput
      ref={node => api.register(id, node)}
      value={text}
      onChangeText={onChangeText}
      onKeyPress={event => {
        if (event.nativeEvent.key === 'Backspace' && latest.current === '') {
          api.backspaceEmpty(id);
        }
      }}
      onFocus={() => {
        api.flushRef.current = flush;
        api.focus(id);
      }}
      onBlur={() => {
        flush();
        api.blur(id);
      }}
      onSelectionChange={event => {
        caret.current = event.nativeEvent.selection.start;
      }}
      onSubmitEditing={onSubmit}
      submitBehavior="submit"
      multiline
      scrollEnabled={false}
      placeholder={placeholder ?? PLACEHOLDER[type]}
      placeholderTextColor={c.muted}
      accessibilityLabel={BLOCK_LABEL[type]}
      style={[
        styles.input,
        { color: c.text },
        type === 'setting' && styles.settingText,
        type === 'narration' && styles.narrationText,
        type === 'sfx' && styles.sfxText,
        long && { borderBottomColor: c.warning },
        long && styles.longInput,
      ]}
    />
  );

  let body = input;
  if (type === 'setting' || type === 'action') {
    body = (
      <View style={[styles.barred, { borderLeftColor: type === 'setting' ? c.ink : c.border }]}>
        {type === 'setting' && <Text style={[styles.typeLabel, { color: c.muted }]}>{BLOCK_LABEL.setting}</Text>}
        {input}
      </View>
    );
  } else if (type === 'dialogue') {
    body = (
      <View style={[styles.dialogue, { borderColor: c.ink, backgroundColor: c.surface }]}>
        <View style={styles.dialogueHead}>
          <Pressable style={styles.speaker} onPress={() => api.pickCharacter(id)} hitSlop={6}>
            <Avatar character={character} size={24} />
            <Text style={[styles.speakerName, { color: character ? c.text : c.accent }]} numberOfLines={1}>
              {character ? character.name || 'Unnamed' : 'Pick character'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.kind, { backgroundColor: c.surfaceAlt }]}
            onPress={() => api.cycleKind(id)}
            hitSlop={6}
            accessibilityLabel="Change dialogue style"
          >
            <Text style={[styles.kindText, { color: c.textSecondary }]}>
              {DIALOGUE_KIND_LABEL[block.kind ?? 'speak']}
            </Text>
          </Pressable>
        </View>
        {input}
        {long && (
          <View style={styles.warningRow}>
            <Text style={[styles.warning, styles.flex, { color: c.warning }]}>Too long to fit a bubble</Text>
            <Pressable onPress={() => api.shorten(id)} hitSlop={6} accessibilityRole="button">
              <Text style={[styles.warning, styles.warningAction, { color: c.ai }]}>Shorten with AI</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  } else if (type === 'narration') {
    body = <View style={[styles.narration, { borderColor: c.ink, backgroundColor: c.surfaceAlt }]}>{input}</View>;
  } else {
    body = <View style={styles.sfx}>{input}</View>;
  }

  return (
    <View
      style={[styles.row, mark === 'current' && { backgroundColor: c.accentSoft }]}
      onLayout={event => api.layout(id, event.nativeEvent.layout.y)}
    >
      {mark !== undefined && (
        <View
          pointerEvents="none"
          style={[styles.mark, { backgroundColor: mark === 'current' ? c.accent : c.border }]}
        />
      )}
      <View style={styles.flex}>{body}</View>
      {panelLabel !== undefined && panelPageId !== undefined && (
        <Pressable
          style={[styles.panelTag, { borderColor: c.border }]}
          onPress={() => api.openPanel(panelPageId)}
          hitSlop={6}
          accessibilityLabel={`Open panel ${panelLabel}`}
        >
          <Text style={[styles.panelTagText, { color: c.muted }]}>{panelLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

export const BlockRow = memo(BlockRowBase);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs },
  input: { ...font.body, lineHeight: 22, paddingVertical: space.xs, paddingHorizontal: 0, textAlignVertical: 'top' },
  longInput: { borderBottomWidth: 2 },
  mark: { position: 'absolute', left: -space.md, top: 0, bottom: 0, width: 4, borderRadius: 2 },
  barred: { borderLeftWidth: 3, paddingLeft: space.md },
  typeLabel: { ...font.overline, fontSize: 11 },
  settingText: { fontWeight: '700' },
  dialogue: {
    marginLeft: space.xl,
    borderWidth: 2,
    borderRadius: radius.xl,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  dialogueHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  speaker: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1 },
  speakerName: { ...font.label, textTransform: 'uppercase', flexShrink: 1 },
  kind: { borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2 },
  kindText: { ...font.caption },
  warning: { ...font.caption, marginTop: 2 },
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  warningAction: { fontWeight: '700' },
  narration: { borderWidth: 2, paddingHorizontal: space.md, paddingVertical: space.xs },
  narrationText: { fontStyle: 'italic' },
  sfx: { paddingLeft: space.md },
  sfxText: { fontFamily: fontFamily.display, fontSize: 24, lineHeight: 34, letterSpacing: 1 },
  panelTag: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.xs,
    paddingVertical: 2,
    marginTop: space.xs,
  },
  panelTagText: { ...font.caption, fontSize: 10 },
});
