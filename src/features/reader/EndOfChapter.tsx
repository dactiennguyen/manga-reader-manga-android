import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BookOpen, ChevronLeft, ChevronRight, X, type LucideIcon } from '../../components/icons';
import { Button } from '../../components/ui';
import type { Chapter } from '../../sources/types';
import { font, radius, space } from '../../theme';

export type EndTone = { text: string; muted: string };

export const DARK_TONE: EndTone = { text: '#FFFFFF', muted: 'rgba(255,255,255,0.6)' };

type Props = {
  chapterName: string;
  next?: Chapter;
  prev?: Chapter;
  delay: number;
  active: boolean;
  tone: EndTone;
  onNext: () => void;
  onPrev?: () => void;
  onOpenManga: () => void;
};

function ToneButton({
  title,
  icon: Icon,
  tone,
  onPress,
}: {
  title: string;
  icon: LucideIcon;
  tone: EndTone;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.toneButton, { borderColor: tone.muted }, pressed && styles.pressed]}
    >
      <Icon size={16} color={tone.text} />
      <Text style={[font.caption, styles.bold, { color: tone.text }]}>{title}</Text>
    </Pressable>
  );
}

export function EndOfChapter({ chapterName, next, prev, delay, active, tone, onNext, onPrev, onOpenManga }: Props) {
  const [cancelled, setCancelled] = useState(false);
  const [remaining, setRemaining] = useState(delay);
  const counting = active && !!next && delay > 0 && !cancelled;
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;

  useEffect(() => {
    setRemaining(delay);
    if (!counting) {
      return;
    }
    let left = delay;
    const timer = setInterval(() => {
      left -= 1;
      setRemaining(left);
      if (left <= 0) {
        clearInterval(timer);
        onNextRef.current();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [counting, delay]);

  const textColor = { color: tone.text };
  const mutedColor = { color: tone.muted };

  return (
    <View style={styles.root}>
      <Text style={[font.overline, mutedColor]}>Hết chương</Text>
      <Text style={[font.heading, styles.center, textColor]} numberOfLines={2}>
        {chapterName}
      </Text>

      {next ? (
        <>
          <View style={styles.nextInfo}>
            <Text style={[font.caption, mutedColor]}>Chương tiếp theo</Text>
            <Text style={[font.body, styles.bold, styles.center, textColor]} numberOfLines={2}>
              {next.name}
            </Text>
          </View>
          <View style={styles.actions}>
            {prev && onPrev && <ToneButton title="Chương trước" icon={ChevronLeft} tone={tone} onPress={onPrev} />}
            <Button title="Chương sau" icon={ChevronRight} variant="secondary" onPress={onNext} />
          </View>
          {counting && (
            <View style={styles.countdown}>
              <Text style={[font.caption, mutedColor]}>Tự chuyển sau {remaining} giây</Text>
              <ToneButton title="Huỷ" icon={X} tone={tone} onPress={() => setCancelled(true)} />
            </View>
          )}
        </>
      ) : (
        <>
          <Text style={[font.body, styles.center, mutedColor]}>Đã là chương mới nhất.</Text>
          <View style={styles.actions}>
            {prev && onPrev && <ToneButton title="Chương trước" icon={ChevronLeft} tone={tone} onPress={onPrev} />}
            <Button title="Về trang truyện" icon={BookOpen} variant="secondary" onPress={onOpenManga} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: space.md, paddingHorizontal: space.xl, paddingVertical: space.xl * 2 },
  center: { textAlign: 'center' },
  bold: { fontWeight: '700' },
  nextInfo: { alignItems: 'center', gap: 2, marginTop: space.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: space.sm },
  countdown: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  toneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  pressed: { opacity: 0.7 },
});
