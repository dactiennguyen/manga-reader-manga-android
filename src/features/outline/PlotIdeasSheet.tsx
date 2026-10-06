import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppNavigation } from '../../app/routes';
import { Banner } from '../../components/comic';
import { ChevronLeft, Info, Plus, RefreshCw, Sparkles, Trash2 } from '../../components/icons';
import { Sheet } from '../../components/Sheet';
import { Button, confirm, snackbar, toast } from '../../components/ui';
import { useAiConfigured } from '../../lib/ai/client';
import { suggestPlots, type PlotDirection } from '../../lib/ai/story';
import { useAiTask } from '../../lib/ai/useAiTask';
import { plural } from '../../lib/format';
import type { ID } from '../../model/types';
import { useProject } from '../../store/hooks';
import { useStory } from '../../store/useStory';
import { font, radius, space, useTheme } from '../../theme';
import { AiBusy, AiFailure, AiMark, AiSetupNotice, SheetFooter } from './AiParts';
import { existingWork, planActsOf, planPlotApply, storyIsBlank, type PlotApplyMode } from './plotPlan';

export function PlotIdeasSheet({ projectId, onClose }: { projectId: ID; onClose: () => void }) {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const configured = useAiConfigured();
  const project = useProject(projectId);
  const chapters = useStory(s => s.chapters);
  const { state, start, cancel, reset } = useAiTask<PlotDirection[]>();
  const [picked, setPicked] = useState<PlotDirection | null>(null);

  if (!project) {
    return null;
  }

  const acts = project.acts;
  const planActs = planActsOf(project, chapters);
  const blank = storyIsBlank(planActs);
  const work = existingWork(planActs);
  const logline = project.logline.trim();

  const generate = () => {
    setPicked(null);
    start(signal =>
      suggestPlots(
        { title: project.title, genres: project.genres, logline },
        acts.map(act => act.title),
        signal,
      ),
    );
  };

  const openProfile = () => {
    onClose();
    navigation.navigate('Tabs', { screen: 'Profile' });
  };

  const apply = (direction: PlotDirection, mode: PlotApplyMode) => {
    const store = useStory.getState();
    const current = store.projects[projectId];
    if (!current) {
      return;
    }
    const plan = planPlotApply(planActsOf(current, store.chapters), direction.acts, mode);
    if (!plan.create.length) {
      toast('This direction has no chapters to add');
      return;
    }
    plan.remove.forEach(id => store.removeChapter(id));
    const created = plan.create.map(item =>
      store.addChapter(projectId, {
        actId: item.actId,
        index: item.index,
        title: item.title || undefined,
        summary: item.summary,
      }),
    );
    onClose();
    const message = `${plural(created.length, 'chapter')} added from "${direction.title}"`;
    if (plan.remove.length) {
      snackbar({ message });
      return;
    }
    snackbar({
      message,
      actionLabel: 'Undo',
      onAction: () => created.forEach(id => useStory.getState().removeChapter(id)),
    });
  };

  const use = (direction: PlotDirection) => {
    if (blank) {
      apply(direction, 'append');
      return;
    }
    setPicked(direction);
  };

  const extras = [
    work.scenes ? plural(work.scenes, 'script scene') : '',
    work.pages ? plural(work.pages, 'drawn page') : '',
  ]
    .filter(Boolean)
    .join(' and ');
  const lostText = `${plural(work.chapters, 'chapter')} with ${extras || 'everything written in them'}`;

  const replace = async (direction: PlotDirection) => {
    const ok = await confirm(
      `Replace ${plural(work.chapters, 'existing chapter')}?`,
      `This deletes ${lostText}. This cannot be undone.`,
      { confirmText: 'Delete and replace', destructive: true },
    );
    if (ok) {
      apply(direction, 'replace');
    }
  };

  const renderDirection = (direction: PlotDirection, index: number) => (
    <View key={index} style={[styles.card, { backgroundColor: c.surface, borderColor: c.ai }]}>
      <AiMark label={direction.tone || `Direction ${index + 1}`} />
      <Text style={[font.heading, { color: c.text }]}>{direction.title}</Text>
      {!!direction.summary && <Text style={[font.body, { color: c.textSecondary }]}>{direction.summary}</Text>}
      {direction.acts.map((list, actIndex) =>
        list.length ? (
          <View key={actIndex} style={styles.act}>
            <Text style={[font.overline, { color: c.muted }]}>{acts[actIndex]?.title ?? `Act ${actIndex + 1}`}</Text>
            {list.map((chapter, chapterIndex) => (
              <View key={chapterIndex} style={[styles.chapter, { borderLeftColor: c.ai }]}>
                {!!chapter.title && <Text style={[font.label, { color: c.text }]}>{chapter.title}</Text>}
                {!!chapter.summary && (
                  <Text style={[font.caption, styles.chapterSummary, { color: c.textSecondary }]}>
                    {chapter.summary}
                  </Text>
                )}
              </View>
            ))}
          </View>
        ) : null,
      )}
      <Button title="Use this direction" icon={Sparkles} variant="ai" onPress={() => use(direction)} />
    </View>
  );

  const renderBody = () => {
    if (!configured) {
      return <AiSetupNotice onOpenProfile={openProfile} />;
    }
    if (picked) {
      return (
        <>
          <ScrollView contentContainerStyle={styles.body}>
            <AiMark label={picked.tone || 'AI suggestion'} />
            <Text style={[font.heading, { color: c.text }]}>{picked.title}</Text>
            <Text style={[font.body, { color: c.textSecondary }]}>
              Your story already has {plural(work.chapters, 'chapter')}. What should happen to{' '}
              {work.chapters === 1 ? 'it' : 'them'}?
            </Text>
            <View style={[styles.option, { borderColor: c.border }]}>
              <Text style={[font.caption, { color: c.textSecondary }]}>
                Keeps everything you have. The new chapters go after the existing ones in each act.
              </Text>
              <Button title="Add after existing chapters" icon={Plus} onPress={() => apply(picked, 'append')} />
            </View>
            <View style={[styles.option, { borderColor: c.danger }]}>
              <Text style={[font.caption, { color: c.danger }]}>Deletes {lostText}. This cannot be undone.</Text>
              <Button
                title="Replace existing chapters"
                icon={Trash2}
                variant="danger"
                onPress={() => replace(picked)}
              />
            </View>
          </ScrollView>
          <SheetFooter>
            <Button title="Back to directions" icon={ChevronLeft} variant="ghost" onPress={() => setPicked(null)} />
          </SheetFooter>
        </>
      );
    }
    if (state.status === 'loading') {
      return <AiBusy label="Thinking up plot directions…" onCancel={cancel} />;
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
      return (
        <>
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={[font.caption, { color: c.muted }]}>
              Nothing changes in your story until you choose a direction.
            </Text>
            {state.data.map(renderDirection)}
          </ScrollView>
          <SheetFooter>
            <Button title="Try again" icon={RefreshCw} variant="secondary" onPress={generate} />
          </SheetFooter>
        </>
      );
    }
    return (
      <>
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={[font.body, { color: c.textSecondary }]}>
            The AI proposes up to three directions for your plot, with chapters for each act, based on:
          </Text>
          <View style={[styles.context, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
            <Text style={[font.overline, { color: c.muted }]}>Title</Text>
            <Text style={[font.body, { color: c.text }]}>{project.title || 'Untitled'}</Text>
            <Text style={[font.overline, styles.contextLabel, { color: c.muted }]}>Genres</Text>
            <Text style={[font.body, { color: c.text }]}>
              {project.genres.length ? project.genres.join(', ') : 'None chosen'}
            </Text>
            <Text style={[font.overline, styles.contextLabel, { color: c.muted }]}>Logline</Text>
            <Text style={[font.body, { color: logline ? c.text : c.muted }]}>{logline || 'Not written yet'}</Text>
          </View>
          {!logline && (
            <Banner
              icon={Info}
              text="Without a logline the suggestions will be generic. You can write one sentence about your story at the top of the outline first, or continue anyway."
            />
          )}
        </ScrollView>
        <SheetFooter>
          <Button
            title={logline ? 'Suggest plot directions' : 'Continue anyway'}
            icon={Sparkles}
            variant="ai"
            onPress={generate}
          />
        </SheetFooter>
      </>
    );
  };

  return (
    <Sheet visible onClose={onClose} title="AI plot ideas" subtitle={project.title} scroll={false} maxHeight="90%">
      {renderBody()}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.md },
  card: { borderWidth: 2, borderRadius: radius.lg, padding: space.md, gap: space.sm },
  act: { gap: space.xs, marginTop: space.xs },
  chapter: { borderLeftWidth: 2, paddingLeft: space.sm, paddingVertical: 2 },
  chapterSummary: { lineHeight: 17 },
  context: { borderWidth: 1, borderRadius: radius.md, padding: space.md, gap: 2 },
  contextLabel: { marginTop: space.sm },
  option: { borderWidth: 1, borderRadius: radius.md, padding: space.md, gap: space.sm },
});
