import { useCallback, useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import type { ScreenProps } from '../../app/routes';
import { ComicCard } from '../../components/comic';
import { Brush, CircleCheck, PenLine, Star, type LucideIcon } from '../../components/icons';
import { Button, Chip, ChipRow, Header, ProgressBar, Screen, toast } from '../../components/ui';
import { ART_STYLES, GENRES, LIMITS } from '../../model/constants';
import { DEFAULT_SETTINGS, useSettings, type CreatorRole } from '../../store/useSettings';
import { font, space, useTheme } from '../../theme';
import { StyleSample } from './StyleSample';

const STEP_COUNT = 3;
const STEP_OFFSET = 2;

const ROLES: { id: CreatorRole; label: string; hint: string; icon: LucideIcon }[] = [
  { id: 'write', label: 'Write stories', hint: 'I have ideas and want to turn them into a script', icon: PenLine },
  { id: 'draw', label: 'Draw', hint: 'I want to open a canvas and start drawing', icon: Brush },
  { id: 'both', label: 'Both', hint: 'I write and draw my own stories', icon: Star },
];

const QUESTIONS = [
  { title: 'What do you want to do?', hint: 'Pick one.' },
  { title: 'Which genres do you like?', hint: `Pick up to ${LIMITS.favoriteGenres}.` },
  { title: 'Which art style do you like?', hint: 'Pick one. It becomes the default for new stories.' },
];

function clampStep(step: number): number {
  return Math.min(STEP_COUNT - 1, Math.max(0, step));
}

export function PreferencesScreen({ navigation, route }: ScreenProps<'Preferences'>) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const edit = !!route.params?.edit;
  const role = useSettings(s => s.role);
  const favoriteGenres = useSettings(s => s.favoriteGenres);
  const defaultStyle = useSettings(s => s.defaultStyle);
  const [step, setStepState] = useState(() =>
    edit ? 0 : clampStep(useSettings.getState().onboardingStep - STEP_OFFSET),
  );

  const setStep = useCallback(
    (next: number) => {
      setStepState(next);
      if (!edit) {
        useSettings.getState().set({ onboardingStep: next + STEP_OFFSET });
      }
    },
    [edit],
  );

  useEffect(() => {
    if (!edit && useSettings.getState().onboardingStep < STEP_OFFSET) {
      useSettings.getState().set({ onboardingStep: STEP_OFFSET });
    }
  }, [edit]);

  const leave = useCallback(() => {
    if (!edit) {
      useSettings.getState().set({ onboardingStep: 0 });
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
    }
  }, [edit, navigation]);

  const onBack = useCallback(() => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      leave();
    }
  }, [leave, setStep, step]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        onBack();
        return true;
      });
      return () => subscription.remove();
    }, [onBack]),
  );

  const finish = (useDefaults: boolean) => {
    if (edit) {
      navigation.goBack();
      return;
    }
    useSettings.getState().set({
      ...(useDefaults
        ? {
            role: DEFAULT_SETTINGS.role,
            favoriteGenres: DEFAULT_SETTINGS.favoriteGenres,
            defaultStyle: DEFAULT_SETTINGS.defaultStyle,
          }
        : null),
      onboarded: true,
      onboardingStep: 0,
    });
    navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
  };

  const onNext = () => {
    if (step < STEP_COUNT - 1) {
      setStep(step + 1);
    } else {
      finish(false);
    }
  };

  const toggleGenre = (genre: string) => {
    if (favoriteGenres.includes(genre)) {
      useSettings.getState().set({ favoriteGenres: favoriteGenres.filter(g => g !== genre) });
      return;
    }
    if (favoriteGenres.length >= LIMITS.favoriteGenres) {
      toast(`Up to ${LIMITS.favoriteGenres} genres`);
      return;
    }
    useSettings.getState().set({ favoriteGenres: [...favoriteGenres, genre] });
  };

  const cellWidth = Math.floor((Math.min(width, 560) - space.lg * 2 - space.md) / 2);
  const sampleSize = cellWidth - 4;
  const question = QUESTIONS[step];

  return (
    <Screen>
      <Header
        onBack={onBack}
        right={
          edit ? undefined : (
            <Pressable onPress={() => finish(true)} hitSlop={10} style={styles.skip} accessibilityRole="button">
              <Text style={[font.label, { color: c.onAppBar }]}>Skip</Text>
            </Pressable>
          )
        }
      >
        <View style={styles.progress}>
          <View style={styles.flex}>
            <ProgressBar value={(step + 1) / STEP_COUNT} />
          </View>
          <Text numberOfLines={1} style={[font.label, styles.stepLabel, { color: c.onAppBar }]}>
            {`${step + 1}/${STEP_COUNT}`}
          </Text>
        </View>
      </Header>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[font.display, { color: c.text }]}>{question.title}</Text>
        <Text style={[font.body, styles.hint, { color: c.textSecondary }]}>{question.hint}</Text>

        {step === 0 &&
          ROLES.map(item => {
            const selected = role === item.id;
            const Icon = item.icon;
            return (
              <ComicCard
                key={item.id}
                onPress={() => useSettings.getState().set({ role: item.id })}
                color={selected ? c.accentSoft : undefined}
                borderColor={selected ? c.accent : undefined}
                style={styles.roleCard}
                contentStyle={styles.roleContent}
              >
                <Icon size={26} color={selected ? c.accent : c.text} />
                <View style={styles.flex}>
                  <Text style={[font.heading, { color: c.text }]}>{item.label}</Text>
                  <Text style={[font.caption, styles.roleHint, { color: c.textSecondary }]}>{item.hint}</Text>
                </View>
                {selected && <CircleCheck size={22} color={c.accent} />}
              </ComicCard>
            );
          })}

        {step === 1 && (
          <>
            <ChipRow>
              {GENRES.map(genre => (
                <Chip
                  key={genre}
                  label={genre}
                  selected={favoriteGenres.includes(genre)}
                  onPress={() => toggleGenre(genre)}
                />
              ))}
            </ChipRow>
            <Text style={[font.caption, styles.count, { color: c.muted }]}>
              {favoriteGenres.length}/{LIMITS.favoriteGenres} selected
            </Text>
          </>
        )}

        {step === 2 && (
          <View style={styles.grid}>
            {ART_STYLES.map(item => {
              const selected = defaultStyle === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => useSettings.getState().set({ defaultStyle: item.id })}
                  style={{ width: cellWidth }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={item.label}
                >
                  <View
                    style={[styles.sample, { borderColor: selected ? c.accent : c.ink }, selected && styles.sampleOn]}
                  >
                    <StyleSample style={item.id} size={selected ? sampleSize - 4 : sampleSize} />
                    {selected && (
                      <View style={[styles.check, { backgroundColor: c.accent }]}>
                        <CircleCheck size={18} color={c.onAccent} />
                      </View>
                    )}
                  </View>
                  <Text style={[font.label, styles.styleName, { color: selected ? c.accent : c.text }]}>
                    {item.label}
                  </Text>
                  <Text numberOfLines={2} style={[font.caption, { color: c.muted }]}>
                    {item.hint}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: c.border }]}>
        <Button title={step < STEP_COUNT - 1 ? 'Next' : 'Done'} onPress={onNext} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingRight: space.sm },
  stepLabel: { minWidth: 30, textAlign: 'right' },
  skip: { paddingHorizontal: space.md, paddingVertical: space.sm },
  content: { padding: space.lg, paddingBottom: space.xl, width: '100%', maxWidth: 560, alignSelf: 'center' },
  hint: { marginTop: space.xs, marginBottom: space.lg },
  roleCard: { marginBottom: space.lg },
  roleContent: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  roleHint: { marginTop: 2 },
  count: { marginTop: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  sample: { borderWidth: 2, overflow: 'hidden' },
  sampleOn: { borderWidth: 4 },
  check: { position: 'absolute', right: 0, top: 0, padding: 3 },
  styleName: { marginTop: space.xs },
  footer: { paddingHorizontal: space.lg, paddingVertical: space.md, borderTopWidth: StyleSheet.hairlineWidth },
});
