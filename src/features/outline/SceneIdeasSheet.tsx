import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppNavigation } from '../../app/routes';
import { Banner } from '../../components/comic';
import { ArrowRight, CircleCheck, Info, MapPin, Plus, RefreshCw, Sparkles } from '../../components/icons';
import { Sheet } from '../../components/Sheet';
import { Button } from '../../components/ui';
import { useAiConfigured } from '../../lib/ai/client';
import { suggestScenes, type SceneIdea } from '../../lib/ai/story';
import { useAiTask } from '../../lib/ai/useAiTask';
import { plural } from '../../lib/format';
import { uid } from '../../lib/id';
import { chapterName } from '../../model/selectors';
import type { Block, ID } from '../../model/types';
import { useChapter } from '../../store/hooks';
import { useStory } from '../../store/useStory';
import { font, radius, space, useTheme } from '../../theme';
import { AiBusy, AiFailure, AiMark, AiSetupNotice, SheetFooter } from './AiParts';

function sceneBlocks(idea: SceneIdea): Block[] {
  const setting = idea.setting.trim();
  return setting ? [{ id: uid(), type: 'setting', text: setting }] : [];
}

export function SceneIdeasSheet({
  chapterId,
  number,
  onClose,
}: {
  chapterId: ID;
  number: number;
  onClose: () => void;
}) {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const configured = useAiConfigured();
  const chapter = useChapter(chapterId);
  const { state, start, cancel } = useAiTask<SceneIdea[]>();
  const [added, setAdded] = useState(0);
  const started = useRef(false);

  const generate = useCallback(() => {
    const store = useStory.getState();
    const current = store.chapters[chapterId];
    const project = current ? store.projects[current.projectId] : undefined;
    if (!current || !project) {
      return;
    }
    start(signal =>
      suggestScenes(
        { title: project.title, genres: project.genres, logline: project.logline },
        { title: chapterName(current.title, number), summary: current.summary, goal: current.goal },
        signal,
      ),
    );
  }, [chapterId, number, start]);

  const hasSummary = !!chapter?.summary.trim();
  const autoStart = configured && hasSummary;
  useEffect(() => {
    if (autoStart && !started.current) {
      started.current = true;
      generate();
    }
  }, [autoStart, generate]);

  if (!chapter) {
    return null;
  }

  const existing = chapter.sceneIds.length;
  const name = chapterName(chapter.title, number);

  const openProfile = () => {
    onClose();
    navigation.navigate('Tabs', { screen: 'Profile' });
  };

  const openScript = () => {
    onClose();
    navigation.navigate('Script', { chapterId });
  };

  const accept = (ideas: SceneIdea[]) => {
    const store = useStory.getState();
    if (!store.chapters[chapterId]) {
      return;
    }
    ideas.forEach(idea => store.addScene(chapterId, { description: idea.description, blocks: sceneBlocks(idea) }));
    setAdded(ideas.length);
  };

  const renderBody = () => {
    if (added > 0) {
      return (
        <>
          <View style={styles.done}>
            <CircleCheck size={32} color={c.success} />
            <Text style={[font.heading, styles.centerText, { color: c.text }]}>
              {plural(added, 'scene')} added to the script
            </Text>
            <Text style={[font.body, styles.centerText, { color: c.textSecondary }]}>
              Open the script to write the action and dialogue for each scene.
            </Text>
          </View>
          <SheetFooter>
            <Button title="Open script" icon={ArrowRight} onPress={openScript} />
            <Button title="Done" variant="ghost" onPress={onClose} />
          </SheetFooter>
        </>
      );
    }
    if (!configured) {
      return <AiSetupNotice onOpenProfile={openProfile} />;
    }
    if (state.status === 'loading') {
      return <AiBusy label="Breaking the chapter into scenes…" onCancel={cancel} />;
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
      const ideas = state.data;
      return (
        <>
          <ScrollView contentContainerStyle={styles.body}>
            <AiMark />
            <Text style={[font.caption, { color: c.muted }]}>
              {existing > 0
                ? `This chapter's script already has ${plural(existing, 'scene')}. These will be added after ${
                    existing === 1 ? 'it' : 'them'
                  }.`
                : 'Nothing is added to the script until you accept.'}
            </Text>
            {ideas.map((idea, index) => (
              <View key={index} style={[styles.card, { backgroundColor: c.surface, borderColor: c.ai }]}>
                <Text style={[font.overline, { color: c.ai }]}>Scene {existing + index + 1}</Text>
                {!!idea.setting && (
                  <View style={styles.setting}>
                    <MapPin size={14} color={c.muted} />
                    <Text style={[font.label, styles.flex, { color: c.text }]}>{idea.setting}</Text>
                  </View>
                )}
                <Text style={[font.body, { color: c.textSecondary }]}>{idea.description}</Text>
              </View>
            ))}
          </ScrollView>
          <SheetFooter>
            <Button title="Add to script" icon={Plus} onPress={() => accept(ideas)} />
            <View style={styles.row}>
              <Button title="Try again" icon={RefreshCw} variant="secondary" onPress={generate} style={styles.flex} />
              <Button title="Discard" variant="ghost" onPress={onClose} style={styles.flex} />
            </View>
          </SheetFooter>
        </>
      );
    }
    return (
      <>
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={[font.body, { color: c.textSecondary }]}>
            The AI proposes three to six scenes for this chapter, each with a setting and a short description. You
            preview them before anything is added to the script.
          </Text>
          <View style={[styles.context, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
            <Text style={[font.overline, { color: c.muted }]}>Summary</Text>
            <Text style={[font.body, { color: hasSummary ? c.text : c.muted }]}>
              {hasSummary ? chapter.summary.trim() : 'Not written yet'}
            </Text>
          </View>
          {!hasSummary && (
            <Banner
              icon={Info}
              text="This chapter has no summary, so the scenes will be generic. Add a summary first for better results, or continue anyway."
            />
          )}
        </ScrollView>
        <SheetFooter>
          <Button
            title={hasSummary ? 'Suggest scenes' : 'Continue anyway'}
            icon={Sparkles}
            variant="ai"
            onPress={generate}
          />
        </SheetFooter>
      </>
    );
  };

  return (
    <Sheet visible onClose={onClose} title="Break into scenes" subtitle={name} scroll={false} maxHeight="90%">
      {renderBody()}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.md },
  card: { borderWidth: 2, borderRadius: radius.lg, padding: space.md, gap: space.xs },
  setting: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  context: { borderWidth: 1, borderRadius: radius.md, padding: space.md, gap: 2 },
  row: { flexDirection: 'row', gap: space.sm },
  done: { alignItems: 'center', gap: space.md, paddingHorizontal: space.xl, paddingVertical: space.xl },
  centerText: { textAlign: 'center' },
});
