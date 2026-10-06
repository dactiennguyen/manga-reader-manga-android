import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { AppNavigation, ProjectTab, ScreenProps } from '../../app/routes';
import { ComicCard, Cover, MenuSheet, ProgressLine, Tag } from '../../components/comic';
import {
  BookCheck,
  EllipsisVertical,
  Image as ImageIcon,
  Palette,
  Pencil,
  Play,
  Share,
  Trash,
  Upload,
  X,
} from '../../components/icons';
import { Sheet } from '../../components/Sheet';
import {
  Button,
  Chip,
  ChipRow,
  EmptyState,
  FieldLabel,
  Header,
  IconButton,
  Screen,
  TabBar,
  TextField,
  toast,
} from '../../components/ui';
import { ART_STYLE_LABEL, ART_STYLES, GENRES, LIMITS } from '../../model/constants';
import { chapterIdsOf, chapterProgress, chapterStatus, projectProgress } from '../../model/selectors';
import type { Project } from '../../model/types';
import { useStory, type StoryData } from '../../store/useStory';
import { font, space, useTheme } from '../../theme';
import { ChaptersTab } from './ChaptersTab';
import { changeProjectCover, exportProjectFile, trashProjectWithConfirm } from './projectActions';
import { CharactersTab, NotesTab, WorldTab } from './ProjectTabs';
import { useStoryData } from './useStoryData';

type NextStep = { text: string; actions: { label: string; onPress: () => void }[] };

const TABS: { key: ProjectTab; label: string }[] = [
  { key: 'chapters', label: 'Chapters' },
  { key: 'characters', label: 'Characters' },
  { key: 'world', label: 'World' },
  { key: 'notes', label: 'Notes' },
];

function nextStepOf(state: StoryData, project: Project, navigation: AppNavigation): NextStep {
  const projectId = project.id;
  const chapterIds = chapterIdsOf(project);
  if (chapterIds.length === 0) {
    return {
      text: 'No chapters yet. Outline the story to plan your chapters first.',
      actions: [{ label: 'Open outline', onPress: () => navigation.navigate('Outline', { projectId }) }],
    };
  }
  for (const [index, chapterId] of chapterIds.entries()) {
    const flagged = (state.chapters[chapterId]?.pageIds ?? []).filter(pageId => {
      const page = state.pages[pageId];
      return !!page && (!!page.flag || Object.values(page.panels).some(panel => panel.redo));
    }).length;
    if (flagged > 0) {
      return {
        text: `Chapter ${index + 1} has ${flagged} flagged pages to fix.`,
        actions: [{ label: 'Review and fix', onPress: () => navigation.navigate('Storyboard', { chapterId }) }],
      };
    }
  }
  const statuses = chapterIds.map(chapterId => chapterStatus(state, chapterId));
  const firstOpen = statuses.findIndex(status => status !== 'done');
  if (firstOpen < 0) {
    return {
      text: 'Every page is done. Preview it once, then export!',
      actions: [
        { label: 'Preview', onPress: () => navigation.navigate('Preview', { projectId }) },
        { label: 'Export', onPress: () => navigation.navigate('Export', { projectId }) },
      ],
    };
  }
  const chapterId = chapterIds[firstOpen];
  const number = firstOpen + 1;
  const status = statuses[firstOpen];
  if (status === 'drawing') {
    const { done, total } = chapterProgress(state, chapterId);
    return {
      text: `Chapter ${number} has ${total - done} pages left.`,
      actions: [{ label: 'Keep drawing', onPress: () => navigation.navigate('Storyboard', { chapterId }) }],
    };
  }
  if (status === 'writing') {
    return {
      text: `Chapter ${number} has a script. Split it into pages to start drawing.`,
      actions: [
        { label: `Paginate chapter ${number}`, onPress: () => navigation.navigate('Storyboard', { chapterId }) },
        { label: 'Keep writing', onPress: () => navigation.navigate('Script', { chapterId }) },
      ],
    };
  }
  if (statuses.every(item => item === 'unwritten')) {
    return {
      text: `Start with an outline, or go straight to the chapter ${number} script.`,
      actions: [
        { label: 'Outline', onPress: () => navigation.navigate('Outline', { projectId }) },
        { label: 'Write script', onPress: () => navigation.navigate('Script', { chapterId }) },
      ],
    };
  }
  return {
    text: `Chapter ${number} has no script yet.`,
    actions: [{ label: `Write chapter ${number}`, onPress: () => navigation.navigate('Script', { chapterId }) }],
  };
}

function EditInfoSheet({ project, visible, onClose }: { project: Project; visible: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const [title, setTitle] = useState(project.title);
  const [genres, setGenres] = useState(project.genres);
  const [logline, setLogline] = useState(project.logline);

  useEffect(() => {
    if (visible) {
      setTitle(project.title);
      setGenres(project.genres);
      setLogline(project.logline);
    }
  }, [visible, project.title, project.genres, project.logline]);

  const toggle = (genre: string) => {
    if (genres.includes(genre)) {
      setGenres(genres.filter(item => item !== genre));
    } else if (genres.length >= LIMITS.genresPerProject) {
      toast(`Pick up to ${LIMITS.genresPerProject} genres`);
    } else {
      setGenres([...genres, genre]);
    }
  };

  const save = () => {
    useStory.getState().updateProject(project.id, { title: title.trim(), genres, logline: logline.trim() });
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Edit details" scroll maxHeight="90%">
      <View style={styles.sheetBody}>
        <FieldLabel>Story title</FieldLabel>
        <TextField value={title} onChangeText={setTitle} maxLength={LIMITS.projectTitle} placeholder="Story title" />
        <FieldLabel>{`Genres (${genres.length}/${LIMITS.genresPerProject})`}</FieldLabel>
        <ChipRow>
          {GENRES.map(genre => (
            <Chip key={genre} label={genre} selected={genres.includes(genre)} onPress={() => toggle(genre)} />
          ))}
        </ChipRow>
        <FieldLabel>One-line summary</FieldLabel>
        <TextField
          value={logline}
          onChangeText={setLogline}
          maxLength={LIMITS.logline}
          multiline
          inputStyle={styles.loglineInput}
          placeholder="Who is it about and what do they want?"
        />
        <Text style={[font.caption, styles.counter, { color: c.muted }]}>
          {logline.length}/{LIMITS.logline}
        </Text>
        <Button title="Save" onPress={save} disabled={!title.trim()} />
      </View>
    </Sheet>
  );
}

export function ProjectScreen({ navigation, route }: ScreenProps<'Project'>) {
  const { c } = useTheme();
  const { projectId } = route.params;
  const state = useStoryData();
  const project = state.projects[projectId];
  const [tab, setTab] = useState<ProjectTab>(route.params.tab ?? 'chapters');
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [styleMenu, setStyleMenu] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [stepHidden, setStepHidden] = useState(false);

  useEffect(() => {
    if (route.params.tab) {
      setTab(route.params.tab);
    }
  }, [route.params.tab]);

  const progress = useMemo(() => projectProgress(state, projectId), [state, projectId]);
  const nextStep = useMemo(
    () => (project ? nextStepOf(state, project, navigation) : undefined),
    [state, project, navigation],
  );

  if (!project || project.deletedAt) {
    return (
      <Screen>
        <Header title="Story" />
        <EmptyState title="Story not found" message="This story was deleted or is in Trash." />
      </Screen>
    );
  }

  const remove = async () => {
    if (await trashProjectWithConfirm(project)) {
      navigation.navigate('Tabs', { screen: 'Library' });
    }
  };

  return (
    <Screen>
      <Header
        title={project.title || 'Untitled'}
        right={
          <>
            <IconButton
              icon={Play}
              color={c.onAppBar}
              accessibilityLabel="Preview"
              onPress={() => navigation.navigate('Preview', { projectId })}
            />
            <IconButton
              icon={Upload}
              color={c.onAppBar}
              accessibilityLabel="Export"
              onPress={() => navigation.navigate('Export', { projectId })}
            />
            <IconButton
              icon={EllipsisVertical}
              color={c.onAppBar}
              accessibilityLabel="More"
              onPress={() => setMenu(true)}
            />
          </>
        }
      />
      <ScrollView contentContainerStyle={styles.content} stickyHeaderIndices={[2]}>
        <View style={styles.top}>
          <Pressable onPress={() => changeProjectCover(projectId)} accessibilityLabel="Change cover">
            <Cover project={project} width={96} />
          </Pressable>
          <View style={styles.topInfo}>
            <Text style={[font.title, { color: c.text }]}>{project.title || 'Untitled'}</Text>
            <View style={styles.tags}>
              {project.genres.map(genre => (
                <Tag key={genre} label={genre} />
              ))}
              <Tag label={ART_STYLE_LABEL[project.style]} />
              {project.done && <Tag label="Completed" color={c.successSoft} textColor={c.success} />}
            </View>
            {project.logline ? (
              <Pressable onPress={() => setExpanded(!expanded)}>
                <Text numberOfLines={expanded ? undefined : 2} style={[font.body, { color: c.textSecondary }]}>
                  {project.logline}
                </Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => setEditing(true)}>
                <Text style={[font.body, { color: c.muted }]}>Add a one-line summary…</Text>
              </Pressable>
            )}
            <ProgressLine
              value={progress.ratio}
              label={progress.total ? `${progress.done}/${progress.total} pages` : 'No pages yet'}
            />
          </View>
        </View>

        <View style={styles.padded}>
          {nextStep && !stepHidden && (
            <ComicCard halftone contentStyle={styles.stepCard}>
              <View style={styles.stepHead}>
                <Text style={[font.overline, styles.flex, { color: c.accent }]}>Next step</Text>
                <IconButton
                  icon={X}
                  size={18}
                  accessibilityLabel="Hide suggestion"
                  onPress={() => setStepHidden(true)}
                />
              </View>
              <Text style={[font.body, { color: c.text }]}>{nextStep.text}</Text>
              <View style={styles.stepActions}>
                {nextStep.actions.map((action, index) => (
                  <Button
                    key={action.label}
                    title={action.label}
                    small
                    variant={index === 0 ? 'primary' : 'secondary'}
                    onPress={action.onPress}
                  />
                ))}
              </View>
            </ComicCard>
          )}
        </View>

        <View style={{ backgroundColor: c.bg }}>
          <TabBar tabs={TABS} value={tab} onChange={setTab} stretch />
        </View>

        <View style={styles.tabBody}>
          {tab === 'chapters' && <ChaptersTab state={state} project={project} />}
          {tab === 'characters' && <CharactersTab state={state} projectId={projectId} />}
          {tab === 'world' && <WorldTab state={state} projectId={projectId} />}
          {tab === 'notes' && <NotesTab state={state} projectId={projectId} />}
        </View>
      </ScrollView>

      <MenuSheet
        visible={menu}
        onClose={() => setMenu(false)}
        title={project.title || 'Untitled'}
        items={[
          { label: 'Edit details', icon: Pencil, onPress: () => setEditing(true) },
          { label: 'Change cover', icon: ImageIcon, onPress: () => changeProjectCover(projectId) },
          {
            label: 'Change art style',
            subtitle: ART_STYLE_LABEL[project.style],
            icon: Palette,
            onPress: () => setStyleMenu(true),
          },
          { label: 'Export project (.mangaka)', icon: Share, onPress: () => exportProjectFile(projectId) },
          {
            label: project.done ? 'Mark as not completed' : 'Mark as completed',
            icon: BookCheck,
            onPress: () => useStory.getState().updateProject(projectId, { done: !project.done }),
          },
          { label: 'Delete story', icon: Trash, destructive: true, onPress: remove },
        ]}
      />
      <MenuSheet
        visible={styleMenu}
        onClose={() => setStyleMenu(false)}
        title="Art style"
        items={ART_STYLES.map(item => ({
          label: item.id === project.style ? `${item.label} (selected)` : item.label,
          subtitle: item.hint,
          onPress: () => useStory.getState().updateProject(projectId, { style: item.id }),
        }))}
      />
      <EditInfoSheet project={project} visible={editing} onClose={() => setEditing(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: space.xl * 2 },
  top: { flexDirection: 'row', gap: space.md, padding: space.lg },
  topInfo: { flex: 1, gap: space.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  padded: { paddingHorizontal: space.lg, paddingBottom: space.md },
  stepCard: { padding: space.md, gap: space.sm },
  stepHead: { flexDirection: 'row', alignItems: 'center' },
  stepActions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tabBody: { padding: space.lg },
  sheetBody: { padding: space.lg, gap: space.sm },
  loglineInput: { minHeight: 80, textAlignVertical: 'top' },
  counter: { alignSelf: 'flex-end' },
});
