import { useCallback, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAppNavigation } from '../../app/routes';
import { FilePen, Plus, RefreshCw } from '../../components/icons';
import { Sheet } from '../../components/Sheet';
import { Button, toast } from '../../components/ui';
import { useAiConfigured } from '../../lib/ai/client';
import { storyBrief } from '../../lib/ai/context';
import { describeWorldEntry } from '../../lib/ai/people';
import { useAiTask } from '../../lib/ai/useAiTask';
import { WORLD_TYPE_LABEL } from '../../model/constants';
import type { ID } from '../../model/types';
import { useStory } from '../../store/useStory';
import { font, radius, space, useTheme } from '../../theme';
import { AiBusy, AiFailure, AiMark, AiSetupNotice, SheetFooter } from '../outline/AiParts';

export const BODY_MAX = 4000;

export function appendBody(existing: string, text: string): string {
  const base = existing.trimEnd();
  return (base ? `${base}\n\n${text.trim()}` : text.trim()).slice(0, BODY_MAX);
}

export function DescribeSheet({
  entryId,
  title,
  onClose,
  onApplied,
}: {
  entryId: ID;
  title: string;
  onClose: () => void;
  onApplied: () => void;
}) {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const configured = useAiConfigured();
  const entry = useStory(s => s.world[entryId]);
  const { state, start, cancel } = useAiTask<string>();
  const started = useRef(false);

  const generate = useCallback(() => {
    const store = useStory.getState();
    const current = store.world[entryId];
    if (!current) {
      return;
    }
    const brief = storyBrief(store, current.projectId).text;
    start(signal => describeWorldEntry(brief, current.type, title, current.body.trim(), signal));
  }, [entryId, title, start]);

  useEffect(() => {
    if (configured && !started.current) {
      started.current = true;
      generate();
    }
  }, [configured, generate]);

  if (!entry) {
    return null;
  }

  const hasBody = !!entry.body.trim();

  const openProfile = () => {
    onClose();
    navigation.navigate('Tabs', { screen: 'Profile' });
  };

  const apply = (text: string, mode: 'replace' | 'append') => {
    const store = useStory.getState();
    const current = store.world[entryId];
    if (!current) {
      return;
    }
    const body = mode === 'append' ? appendBody(current.body, text) : text.trim().slice(0, BODY_MAX);
    store.updateWorldEntry(entryId, { body });
    onApplied();
    onClose();
    toast(mode === 'append' ? 'Description added to the content' : 'Content replaced');
  };

  const renderBody = () => {
    if (!configured) {
      return <AiSetupNotice onOpenProfile={openProfile} />;
    }
    if (state.status === 'loading') {
      return <AiBusy label={`Writing about ${title}…`} onCancel={cancel} />;
    }
    if (state.status === 'error') {
      return (
        <>
          <AiFailure message={state.message} onRetry={generate} />
          <SheetFooter>
            <Button title="Close" variant="ghost" onPress={onClose} />
          </SheetFooter>
        </>
      );
    }
    if (state.status === 'done') {
      const text = state.data;
      return (
        <>
          <ScrollView contentContainerStyle={styles.body}>
            <AiMark />
            <Text style={[font.caption, { color: c.muted }]}>
              {hasBody
                ? 'Nothing changes until you choose. Replace drops your current content; append keeps it and adds this below.'
                : 'Nothing changes until you choose to use this text.'}
            </Text>
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.ai }]}>
              <Text style={[font.body, styles.preview, { color: c.text }]}>{text}</Text>
            </View>
          </ScrollView>
          <SheetFooter>
            <Button
              title={hasBody ? 'Replace content' : 'Use as content'}
              icon={FilePen}
              variant="ai"
              onPress={() => apply(text, 'replace')}
            />
            {hasBody && <Button title="Append" icon={Plus} onPress={() => apply(text, 'append')} />}
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
        <View style={styles.body}>
          <Text style={[font.body, { color: c.textSecondary }]}>
            The AI writes a wiki entry for this {WORLD_TYPE_LABEL[entry.type].toLowerCase()} from its title and your
            story. You preview it before anything is saved.
          </Text>
        </View>
        <SheetFooter>
          <Button title="Write description" variant="ai" onPress={generate} />
        </SheetFooter>
      </>
    );
  };

  return (
    <Sheet visible onClose={onClose} title="Write with AI" subtitle={title} scroll={false} maxHeight="90%">
      {renderBody()}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.md },
  card: { borderWidth: 2, borderRadius: radius.lg, padding: space.md },
  preview: { lineHeight: 22 },
  actions: { flexDirection: 'row', gap: space.sm },
});
