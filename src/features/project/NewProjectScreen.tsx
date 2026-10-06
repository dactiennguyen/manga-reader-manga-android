import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ScreenProps } from '../../app/routes';
import { ComicCard, SpeechBubble } from '../../components/comic';
import { ArrowRight, Check, X } from '../../components/icons';
import {
  Button,
  Chip,
  ChipRow,
  confirm,
  FieldLabel,
  Header,
  IconButton,
  Screen,
  SwitchRow,
  TextField,
  toast,
} from '../../components/ui';
import { StyleSample } from '../onboarding/StyleSample';
import { ART_STYLE_LABEL, ART_STYLES, GENRES, LIMITS } from '../../model/constants';
import type { ArtStyle, PageSize, ProjectFormat } from '../../model/types';
import { useSettings } from '../../store/useSettings';
import { useStory } from '../../store/useStory';
import { font, radius, space, useIsWide, useTheme } from '../../theme';

type FormatKey = 'manga-B5' | 'manga-A5' | 'webtoon';

const PAPER = '#FFFFFF';
const INK = '#16161A';

const FORMATS: { key: FormatKey; format: ProjectFormat; pageSize: PageSize; label: string; hint: string }[] = [
  {
    key: 'manga-B5',
    format: 'manga',
    pageSize: 'B5',
    label: 'Manga page B5',
    hint: 'Common print size, read page by page',
  },
  {
    key: 'manga-A5',
    format: 'manga',
    pageSize: 'A5',
    label: 'Manga page A5',
    hint: 'Compact size, great for short stories',
  },
  {
    key: 'webtoon',
    format: 'webtoon',
    pageSize: 'B5',
    label: 'Webtoon',
    hint: 'Vertical strip, scroll to read on a phone',
  },
];

function FormatArt({ kind }: { kind: FormatKey }) {
  const webtoon = kind === 'webtoon';
  const small = kind === 'manga-A5';
  return (
    <View style={[styles.formatPage, webtoon && styles.formatStrip, small && styles.formatSmall]}>
      <View style={styles.formatPanelTall} />
      {webtoon ? (
        <>
          <View style={styles.formatPanel} />
          <View style={styles.formatPanelTall} />
        </>
      ) : (
        <View style={styles.formatRow}>
          <View style={styles.formatPanelFlex} />
          <View style={styles.formatPanelFlex} />
        </View>
      )}
    </View>
  );
}

function StyleArt({ style }: { style: ArtStyle }) {
  return (
    <View style={styles.styleArt}>
      <StyleSample style={style} size={112} />
    </View>
  );
}

export function NewProjectScreen({ navigation, route }: ScreenProps<'NewProject'>) {
  const { c } = useTheme();
  const wide = useIsWide();
  const idea = route.params?.idea?.trim() ?? '';
  const favoriteGenres = useSettings(s => s.favoriteGenres);
  const defaultStyle = useSettings(s => s.defaultStyle);
  const projects = useStory(s => s.projects);
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [logline, setLogline] = useState(idea.slice(0, LIMITS.logline));
  const [formatKey, setFormatKey] = useState<FormatKey>('manga-B5');
  const [style, setStyle] = useState<ArtStyle>(defaultStyle);
  const [color, setColor] = useState(false);

  const genreList = useMemo(
    () => [...GENRES.filter(g => favoriteGenres.includes(g)), ...GENRES.filter(g => !favoriteGenres.includes(g))],
    [favoriteGenres],
  );
  const name = title.trim();
  const duplicate = useMemo(
    () =>
      !!name && Object.values(projects).some(p => !p.deletedAt && p.title.trim().toLowerCase() === name.toLowerCase()),
    [projects, name],
  );
  const format = FORMATS.find(item => item.key === formatKey) ?? FORMATS[0];
  const dirty = !!name || genres.length > 0 || logline.trim() !== idea.slice(0, LIMITS.logline) || step > 0;

  const close = useCallback(async () => {
    if (
      dirty &&
      !(await confirm('Discard this new story?', 'What you entered will not be saved.', {
        confirmText: 'Discard',
        destructive: true,
      }))
    ) {
      return;
    }
    navigation.goBack();
  }, [dirty, navigation]);

  const back = useCallback(() => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      close();
    }
  }, [step, close]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        back();
        return true;
      });
      return () => subscription.remove();
    }, [back]),
  );

  const toggleGenre = (genre: string) => {
    if (genres.includes(genre)) {
      setGenres(genres.filter(item => item !== genre));
    } else if (genres.length >= LIMITS.genresPerProject) {
      toast(`Pick up to ${LIMITS.genresPerProject} genres`);
    } else {
      setGenres([...genres, genre]);
    }
  };

  const next = () => {
    if (step === 0 && !name) {
      toast('Give your story a title');
      return;
    }
    setStep(step + 1);
  };

  const create = () => {
    const projectId = useStory.getState().createProject({
      title: name,
      genres,
      logline: logline.trim(),
      format: format.format,
      pageSize: format.pageSize,
      style,
      color,
    });
    navigation.replace('Project', { projectId });
  };

  return (
    <Screen>
      <Header
        title="New story"
        subtitle={`Step ${step + 1}/3`}
        onBack={back}
        right={<IconButton icon={X} color={c.onAppBar} onPress={close} accessibilityLabel="Close" />}
      />
      <View style={styles.steps}>
        {[0, 1, 2].map(index => (
          <View key={index} style={[styles.stepBar, { backgroundColor: index <= step ? c.accent : c.border }]} />
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <>
            <Text style={[font.display, { color: c.text }]}>Your story</Text>
            {!!idea && (
              <SpeechBubble tail="none">
                <Text style={[font.hand, { color: c.text }]}>Idea: {idea}</Text>
              </SpeechBubble>
            )}
            <View style={styles.field}>
              <FieldLabel>Story title</FieldLabel>
              <TextField
                value={title}
                onChangeText={setTitle}
                placeholder="E.g. The Magic Pen"
                maxLength={LIMITS.projectTitle}
                autoFocus={!idea}
              />
              {duplicate && (
                <Text style={[font.caption, { color: c.muted }]}>You already have a story with this title</Text>
              )}
            </View>
            <View style={styles.field}>
              <FieldLabel>{`Genres (${genres.length}/${LIMITS.genresPerProject})`}</FieldLabel>
              <ChipRow>
                {genreList.map(genre => (
                  <Chip
                    key={genre}
                    label={genre}
                    selected={genres.includes(genre)}
                    onPress={() => toggleGenre(genre)}
                  />
                ))}
              </ChipRow>
            </View>
            <View style={styles.field}>
              <FieldLabel>One-line summary</FieldLabel>
              <TextField
                value={logline}
                onChangeText={setLogline}
                placeholder="Who is it about, what do they want, what stands in the way?"
                maxLength={LIMITS.logline}
                multiline
                inputStyle={styles.logline}
              />
              <Text style={[font.caption, styles.counter, { color: c.muted }]}>
                {logline.length}/{LIMITS.logline}
              </Text>
            </View>
          </>
        )}

        {step === 1 && (
          <>
            <Text style={[font.display, { color: c.text }]}>Format</Text>
            {FORMATS.map(item => {
              const selected = item.key === formatKey;
              return (
                <ComicCard
                  key={item.key}
                  onPress={() => setFormatKey(item.key)}
                  borderColor={selected ? c.accent : undefined}
                  contentStyle={styles.formatCard}
                >
                  <View style={styles.formatArtBox}>
                    <FormatArt kind={item.key} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={[font.heading, { color: c.text }]}>{item.label}</Text>
                    <Text style={[font.body, { color: c.textSecondary }]}>{item.hint}</Text>
                  </View>
                  {selected && <Check size={22} color={c.accent} strokeWidth={3} />}
                </ComicCard>
              );
            })}
            <Text style={[font.caption, { color: c.muted }]}>
              Note: the format cannot be changed after you draw the first page.
            </Text>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={[font.display, { color: c.text }]}>Art style</Text>
            <View style={styles.styleGrid}>
              {ART_STYLES.map(item => {
                const selected = item.id === style;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setStyle(item.id)}
                    style={[
                      styles.styleCell,
                      wide && styles.styleCellWide,
                      { borderColor: selected ? c.accent : c.ink, backgroundColor: c.surface },
                    ]}
                  >
                    <StyleArt style={item.id} />
                    <View style={styles.styleText}>
                      <Text style={[font.label, { color: c.text }]}>{item.label}</Text>
                      <Text numberOfLines={2} style={[font.caption, { color: c.muted }]}>
                        {item.hint}
                      </Text>
                    </View>
                    {selected && (
                      <View style={[styles.styleCheck, { backgroundColor: c.accent }]}>
                        <Check size={14} color={c.onAccent} strokeWidth={3} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
            <SwitchRow
              title="Color story"
              subtitle="Turn off for classic black and white manga"
              value={color}
              onValueChange={setColor}
            />
            <ComicCard halftone contentStyle={styles.summary}>
              <Text style={[font.overline, { color: c.muted }]}>Summary</Text>
              <Text style={[font.heading, { color: c.text }]}>{name}</Text>
              <Text style={[font.body, { color: c.textSecondary }]}>
                {[
                  genres.join(', ') || 'No genre',
                  format.label,
                  ART_STYLE_LABEL[style],
                  color ? 'Color story' : 'Black and white',
                ].join(' · ')}
              </Text>
              {!!logline.trim() && <Text style={[font.body, { color: c.text }]}>{logline.trim()}</Text>}
            </ComicCard>
          </>
        )}
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: c.border, backgroundColor: c.bg }]}>
        {step > 0 && <Button title="Back" variant="secondary" onPress={back} />}
        {step < 2 ? (
          <Button title="Next" icon={ArrowRight} onPress={next} disabled={step === 0 && !name} style={styles.flex} />
        ) : (
          <Button title="Create story" onPress={create} disabled={!name} style={styles.flex} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  steps: { flexDirection: 'row', gap: space.xs, paddingHorizontal: space.lg, paddingTop: space.md },
  stepBar: { flex: 1, height: 4, borderRadius: radius.pill },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xl * 2 },
  field: { gap: space.sm },
  logline: { minHeight: 88, textAlignVertical: 'top' },
  counter: { alignSelf: 'flex-end' },
  formatCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  formatArtBox: { width: 56, height: 76, alignItems: 'center', justifyContent: 'center' },
  formatPage: { width: 50, height: 70, backgroundColor: PAPER, borderWidth: 2, borderColor: INK, padding: 4, gap: 3 },
  formatSmall: { width: 42, height: 60 },
  formatStrip: { width: 30, height: 76 },
  formatRow: { flex: 1, flexDirection: 'row', gap: 3 },
  formatPanel: { flex: 1, borderWidth: 1.5, borderColor: INK },
  formatPanelTall: { flex: 1.4, borderWidth: 1.5, borderColor: INK },
  formatPanelFlex: { flex: 1, borderWidth: 1.5, borderColor: INK },
  styleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  styleCell: { width: '47%', flexGrow: 1, borderWidth: 2, borderRadius: radius.md, overflow: 'hidden' },
  styleCellWide: { width: '30%' },
  styleArt: { height: 112, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: PAPER },
  styleText: { padding: space.sm, gap: 2 },
  styleCheck: {
    position: 'absolute',
    top: space.xs,
    right: space.xs,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: { padding: space.md, gap: space.xs },
  footer: { flexDirection: 'row', gap: space.md, padding: space.lg, borderTopWidth: StyleSheet.hairlineWidth },
});
