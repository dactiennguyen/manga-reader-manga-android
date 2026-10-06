import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAppNavigation } from '../../app/routes';
import { ComicCard, Cover, ProgressLine, SectionTitle, SpeechBubble } from '../../components/comic';
import { Brush, Lightbulb, Plus, X } from '../../components/icons';
import { Button, Chip, ChipRow, IconButton, Screen, TextField, toast } from '../../components/ui';
import { dayKey, dayKeyToDate, formatRelative } from '../../lib/time';
import { DAILY_TIPS, GENRES, LIMITS } from '../../model/constants';
import { activeProjects, chapterIdsOf, projectProgress } from '../../model/selectors';
import { useSettings } from '../../store/useSettings';
import { useStory } from '../../store/useStory';
import { font, space, useTheme } from '../../theme';
import { resumeTarget } from '../project/projectActions';
import { useStoryData } from '../project/useStoryData';

const IDEAS = [
  'A blind swordsman must protect a child who bears the mark of his old enemy.',
  'Two sisters row out to find an island that only appears on moonless nights.',
  'Two strangers trade letters through a library desk drawer without ever meeting.',
  'A retired demon king opens a noodle shop, and the hero keeps eating on credit.',
  'An old apartment block grows one extra floor every time the power goes out.',
  'A club about to be shut down has three members left and a secret in the storeroom.',
  'A mail boy works in a kingdom where every letter is a living creature.',
  "A robot mechanic finds an old machine that still holds her mother's memories.",
  'A bike repair shop at the end of an alley, and the visitors each rainy season brings.',
  'A student detective receives a riddle letter signed in his own handwriting.',
  'A fishing village volleyball team travels to the city for its first tournament.',
  'A young papermaker unknowingly keeps the map the whole capital is hunting for.',
];

const DEFAULT_IDEA_INDEXES = [1, 5, 6];

function pickIdeas(favorites: string[]): string[] {
  const genres: readonly string[] = GENRES;
  const indexes = [...favorites.map(genre => genres.indexOf(genre)), ...DEFAULT_IDEA_INDEXES];
  return indexes
    .filter((value, index, all) => value >= 0 && all.indexOf(value) === index)
    .flatMap(index => IDEAS[index] ?? [])
    .slice(0, 3);
}

export function HomeScreen() {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const penName = useSettings(s => s.penName);
  const role = useSettings(s => s.role);
  const favoriteGenres = useSettings(s => s.favoriteGenres);
  const defaultStyle = useSettings(s => s.defaultStyle);
  const tipDismissedDay = useSettings(s => s.tipDismissedDay);
  const state = useStoryData();
  const [idea, setIdea] = useState('');

  const today = dayKey();
  const data = useMemo(() => {
    const projects = activeProjects(state);
    const current = projects[0];
    return {
      projects,
      current,
      resume: current ? resumeTarget(state, current) : undefined,
      progress: current ? projectProgress(state, current.id) : undefined,
    };
  }, [state]);
  const ideas = useMemo(() => pickIdeas(favoriteGenres), [favoriteGenres]);
  const tip = DAILY_TIPS[Math.floor(dayKeyToDate(today).getTime() / 86400000) % DAILY_TIPS.length] ?? DAILY_TIPS[0];
  const { projects, current, resume, progress } = data;
  const empty = projects.length === 0;
  const trimmed = idea.trim();

  const startFromIdea = () => {
    if (!trimmed) {
      return;
    }
    navigation.navigate('NewProject', { idea: trimmed });
    setIdea('');
  };

  const openBlankCanvas = () => {
    const story = useStory.getState();
    const projectId = story.createProject({
      title: 'Untitled story',
      genres: [],
      logline: '',
      format: 'manga',
      pageSize: 'B5',
      style: defaultStyle,
      color: false,
    });
    const chapterId = chapterIdsOf(useStory.getState().projects[projectId])[0];
    if (!chapterId) {
      navigation.navigate('Project', { projectId });
      return;
    }
    const pageId = story.addPage(chapterId, { templateId: 'g1' });
    const panelId = Object.keys(useStory.getState().pages[pageId]?.panels ?? {})[0];
    if (!panelId) {
      toast('Could not open the canvas. Lay out the page first');
      navigation.navigate('PanelLayout', { pageId });
      return;
    }
    navigation.navigate('Canvas', { pageId, panelId });
  };

  const ideaBox = (
    <ComicCard contentStyle={styles.cardBody}>
      <TextField
        value={idea}
        onChangeText={setIdea}
        placeholder="E.g. A girl finds a pen that makes whatever she draws real…"
        maxLength={LIMITS.logline}
        multiline
        inputStyle={empty ? styles.ideaInputLarge : styles.ideaInput}
      />
      <View style={styles.rowBetween}>
        <Text style={[font.caption, { color: c.muted }]}>
          {idea.length}/{LIMITS.logline}
        </Text>
        <Button title="Create story" icon={Plus} onPress={startFromIdea} disabled={!trimmed} small={!empty} />
      </View>
      <ChipRow>
        {ideas.map(sample => (
          <Chip key={sample} label={sample} onPress={() => setIdea(sample)} />
        ))}
      </ChipRow>
    </ComicCard>
  );

  const extraButtons = (
    <View style={styles.gap}>
      {empty && <Button title="Blank story" variant="secondary" onPress={() => navigation.navigate('NewProject')} />}
      {role === 'draw' && <Button title="Open blank canvas" variant="ink" icon={Brush} onPress={openBlankCanvas} />}
    </View>
  );

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={[font.display, { color: c.text }]}>{penName.trim() ? `Hi ${penName.trim()}` : 'Hi there'}</Text>
          <Text style={[font.body, { color: c.textSecondary }]}>
            {empty ? 'Start a new story today.' : 'Which story are you working on today?'}
          </Text>
        </View>

        {empty && (
          <SpeechBubble tail="bottom-left" style={styles.bubble}>
            Tell me your idea!
          </SpeechBubble>
        )}

        {current && resume && progress && (
          <View style={styles.gap}>
            <SectionTitle>Continue</SectionTitle>
            <ComicCard
              halftone
              onPress={() => navigation.navigate('Project', { projectId: current.id })}
              contentStyle={styles.continueBody}
            >
              <Cover project={current} width={84} />
              <View style={styles.continueInfo}>
                <Text numberOfLines={2} style={[font.heading, { color: c.text }]}>
                  {current.title || 'Untitled'}
                </Text>
                <Text numberOfLines={1} style={[font.label, { color: c.accent }]}>
                  {resume.where}
                </Text>
                <Text style={[font.caption, { color: c.muted }]}>Edited {formatRelative(current.updatedAt)}</Text>
                <ProgressLine
                  value={progress.ratio}
                  label={progress.total ? `${progress.done}/${progress.total} pages` : 'No pages yet'}
                />
                <Button title={resume.action} small onPress={() => resume.go(navigation)} style={styles.selfStart} />
              </View>
            </ComicCard>
          </View>
        )}

        <View style={styles.gap}>
          <SectionTitle>Start from one line</SectionTitle>
          {ideaBox}
          {(empty || role === 'draw') && extraButtons}
        </View>

        {projects.length > 0 && (
          <View style={styles.gap}>
            <SectionTitle
              right={
                <Pressable hitSlop={8} onPress={() => navigation.navigate('Tabs', { screen: 'Library' })}>
                  <Text style={[font.label, { color: c.accent }]}>See all</Text>
                </Pressable>
              }
            >
              Recent stories
            </SectionTitle>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRow}>
              {projects.slice(0, 6).map(project => (
                <Pressable
                  key={project.id}
                  style={styles.recentItem}
                  onPress={() => navigation.navigate('Project', { projectId: project.id })}
                >
                  <Cover project={project} width={104} />
                  <Text numberOfLines={2} style={[font.label, { color: c.text }]}>
                    {project.title || 'Untitled'}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {tipDismissedDay !== today && (
          <View style={styles.gap}>
            <SectionTitle
              right={
                <IconButton
                  icon={X}
                  size={18}
                  accessibilityLabel="Hide today's tip"
                  onPress={() => useSettings.getState().set({ tipDismissedDay: today })}
                />
              }
            >
              Tip of the day
            </SectionTitle>
            <SpeechBubble tail="bottom-right">
              <View style={styles.tipRow}>
                <Lightbulb size={18} color={c.accent} />
                <Text style={[font.hand, styles.flex, { color: c.text }]}>{tip}</Text>
              </View>
            </SpeechBubble>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.xl, paddingBottom: space.xl * 2 },
  gap: { gap: space.md },
  flex: { flex: 1 },
  bubble: { alignSelf: 'flex-start' },
  cardBody: { padding: space.md, gap: space.md },
  ideaInput: { minHeight: 64, textAlignVertical: 'top' },
  ideaInputLarge: { minHeight: 120, textAlignVertical: 'top', fontSize: 17 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  continueBody: { flexDirection: 'row', padding: space.md, gap: space.md },
  continueInfo: { flex: 1, gap: space.xs },
  selfStart: { alignSelf: 'flex-start', marginTop: space.xs },
  recentRow: { gap: space.md, paddingRight: space.lg, paddingBottom: space.xs },
  recentItem: { width: 104, gap: space.xs },
  tipRow: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
});
