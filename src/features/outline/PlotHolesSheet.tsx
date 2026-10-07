import { useCallback, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAppNavigation } from '../../app/routes';
import { Tag } from '../../components/comic';
import { BookOpen, RefreshCw } from '../../components/icons';
import { Sheet } from '../../components/Sheet';
import { Button } from '../../components/ui';
import { useAiConfigured } from '../../lib/ai/client';
import { storyBrief } from '../../lib/ai/context';
import { findPlotHoles, type PlotHole } from '../../lib/ai/people';
import { useAiTask } from '../../lib/ai/useAiTask';
import { plural } from '../../lib/format';
import { chapterIdsOf, chapterName } from '../../model/selectors';
import type { ID } from '../../model/types';
import { useProject } from '../../store/hooks';
import { useStory } from '../../store/useStory';
import { font, radius, space, useTheme } from '../../theme';
import { AiBusy, AiFailure, AiMark, AiSetupNotice, SheetFooter } from './AiParts';

export function matchChapter(title: string, chapters: { id: ID; title: string }[]): ID | undefined {
  const needle = title.trim().toLowerCase();
  if (!needle) {
    return undefined;
  }
  const byTitle = chapters.find(chapter => chapter.title.trim().toLowerCase() === needle);
  if (byTitle) {
    return byTitle.id;
  }
  return chapters.find((chapter, index) => chapterName(chapter.title, index + 1).toLowerCase() === needle)?.id;
}

export function PlotHolesSheet({ projectId, onClose }: { projectId: ID; onClose: () => void }) {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const configured = useAiConfigured();
  const project = useProject(projectId);
  const chapters = useStory(s => s.chapters);
  const { state, start, cancel } = useAiTask<PlotHole[]>();
  const started = useRef(false);

  const generate = useCallback(() => {
    const brief = storyBrief(useStory.getState(), projectId).text;
    if (!brief) {
      return;
    }
    start(signal => findPlotHoles(brief, signal));
  }, [projectId, start]);

  useEffect(() => {
    if (configured && !started.current) {
      started.current = true;
      generate();
    }
  }, [configured, generate]);

  if (!project) {
    return null;
  }

  const ordered = chapterIdsOf(project)
    .map(id => chapters[id])
    .filter(chapter => chapter !== undefined)
    .map(chapter => ({ id: chapter.id, title: chapter.title }));

  const openProfile = () => {
    onClose();
    navigation.navigate('Tabs', { screen: 'Profile' });
  };

  const openChapter = (chapterId: ID) => {
    onClose();
    navigation.navigate('Script', { chapterId });
  };

  const renderHole = (hole: PlotHole, index: number) => {
    const chapterId = matchChapter(hole.chapter, ordered);
    return (
      <View key={index} style={[styles.card, { backgroundColor: c.surface, borderColor: c.ai }]}>
        <View style={styles.cardHead}>
          <Text style={[font.overline, { color: c.ai }]}>Issue {index + 1}</Text>
          {!!hole.chapter && <Tag label={hole.chapter} icon={BookOpen} />}
        </View>
        <Text style={[font.label, { color: c.text }]}>{hole.issue}</Text>
        {!!hole.suggestion && (
          <View style={[styles.suggestion, { borderLeftColor: c.ai }]}>
            <Text style={[font.overline, { color: c.muted }]}>Suggestion</Text>
            <Text style={[font.body, { color: c.textSecondary }]}>{hole.suggestion}</Text>
          </View>
        )}
        {chapterId !== undefined && (
          <Button
            title="Open chapter"
            icon={BookOpen}
            variant="secondary"
            small
            onPress={() => openChapter(chapterId)}
            style={styles.open}
          />
        )}
      </View>
    );
  };

  const renderBody = () => {
    if (!configured) {
      return <AiSetupNotice onOpenProfile={openProfile} />;
    }
    if (state.status === 'loading') {
      return <AiBusy label="Reading the outline and characters…" onCancel={cancel} />;
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
      return (
        <>
          <ScrollView contentContainerStyle={styles.body}>
            <AiMark label={plural(state.data.length, 'issue')} />
            <Text style={[font.caption, { color: c.muted }]}>
              These are an editor's notes to think about. Nothing in your story is changed.
            </Text>
            {state.data.map(renderHole)}
          </ScrollView>
          <SheetFooter>
            <View style={styles.actions}>
              <Button title="Try again" icon={RefreshCw} variant="secondary" onPress={generate} style={styles.flex} />
              <Button title="Close" variant="ghost" onPress={onClose} style={styles.flex} />
            </View>
          </SheetFooter>
        </>
      );
    }
    return (
      <>
        <View style={styles.body}>
          <Text style={[font.body, { color: c.textSecondary }]}>
            The AI reads your outline and characters and lists contradictions, dropped threads and characters without a
            clear motive.
          </Text>
        </View>
        <SheetFooter>
          <Button title="Find plot holes" variant="ai" onPress={generate} />
        </SheetFooter>
      </>
    );
  };

  return (
    <Sheet visible onClose={onClose} title="Find plot holes" subtitle={project.title} scroll={false} maxHeight="90%">
      {renderBody()}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.md },
  card: { borderWidth: 2, borderRadius: radius.lg, padding: space.md, gap: space.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  suggestion: { borderLeftWidth: 2, paddingLeft: space.sm, gap: 2 },
  open: { alignSelf: 'flex-start' },
  actions: { flexDirection: 'row', gap: space.sm },
});
