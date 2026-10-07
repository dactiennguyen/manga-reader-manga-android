import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { useAppNavigation } from '../../app/routes';
import { Halftone } from '../../components/comic';
import { Button, Screen } from '../../components/ui';
import { useSettings } from '../../store/useSettings';
import { font, radius, space, useTheme } from '../../theme';
import { WelcomeArt, type WelcomeArtKind } from './WelcomeArt';

const SLIDES: { kind: WelcomeArtKind; title: string; text: string }[] = [
  {
    kind: 'write',
    title: 'Write your story',
    text: 'Start from a one-line idea, then build the plot and dialogue for each chapter.',
  },
  {
    kind: 'draw',
    title: 'Draw on your phone',
    text: 'Sketch, then ink on the canvas, staying true to your characters.',
  },
  {
    kind: 'finish',
    title: 'Finish a full chapter',
    text: 'Lay out panels, add dialogue, and export a file to share.',
  },
];

const ART_RATIO = 262 / 202;
const COPY_SPACE = 176;

let resumeChecked = false;

export function WelcomeScreen() {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const { width } = useWindowDimensions();
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const [index, setIndex] = useState(0);
  const [areaHeight, setAreaHeight] = useState(0);

  useEffect(() => {
    if (resumeChecked) {
      return;
    }
    resumeChecked = true;
    const step = useSettings.getState().onboardingStep;
    if (step >= 1) {
      navigation.reset({ index: 1, routes: [{ name: 'Welcome' }, { name: 'Preferences' }] });
    }
  }, [navigation]);

  const artHeight = Math.max(120, Math.min(areaHeight - COPY_SPACE, (width - space.xl * 4) * ART_RATIO));
  const artWidth = artHeight / ART_RATIO;

  const goPreferences = () => {
    useSettings.getState().set({ onboardingStep: 1 });
    navigation.navigate('Preferences');
  };

  const onNext = () => {
    if (index >= SLIDES.length - 1) {
      goPreferences();
      return;
    }
    scroller.current?.scrollTo({ x: (index + 1) * width, animated: true });
    setIndex(index + 1);
  };

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / Math.max(1, width));
    setIndex(Math.min(SLIDES.length - 1, Math.max(0, next)));
  };

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable onPress={goPreferences} hitSlop={12} accessibilityRole="button">
          <Text style={[font.label, { color: c.textSecondary }]}>Skip</Text>
        </Pressable>
      </View>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        onLayout={event => setAreaHeight(event.nativeEvent.layout.height)}
        style={styles.flex}
        contentContainerStyle={styles.slides}
      >
        {SLIDES.map(slide => (
          <View key={slide.kind} style={[styles.slide, { width }]}>
            <View style={[styles.artWrap, { backgroundColor: c.surfaceAlt, borderColor: c.ink }]}>
              <Halftone />
              {areaHeight > 0 && <WelcomeArt kind={slide.kind} width={artWidth} height={artHeight} />}
            </View>
            <View style={styles.copy}>
              <Text style={[font.display, { color: c.text }]}>{slide.title}</Text>
              <Text numberOfLines={2} style={[font.body, styles.text, { color: c.textSecondary }]}>
                {slide.text}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {SLIDES.map((slide, i) => (
          <View
            key={slide.kind}
            style={[
              styles.dot,
              { borderColor: c.ink },
              i === index && styles.dotActive,
              i === index && { backgroundColor: c.accent },
            ]}
          />
        ))}
      </View>
      <View style={styles.footer}>
        <Button title="Get started" onPress={onNext} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: space.lg, paddingVertical: space.md },
  slides: { flexGrow: 1 },
  slide: { paddingHorizontal: space.xl, justifyContent: 'center' },
  artWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.lg,
    borderWidth: 2,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  copy: { marginTop: space.lg, minHeight: 116 },
  text: { marginTop: space.sm, lineHeight: 22 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space.sm, paddingVertical: space.md },
  dot: { width: 10, height: 10, borderRadius: radius.pill, borderWidth: 2 },
  dotActive: { width: 22 },
  footer: { paddingHorizontal: space.xl, paddingBottom: space.lg },
});
