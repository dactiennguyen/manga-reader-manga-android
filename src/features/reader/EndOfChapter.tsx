import { BookOpen, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/ui';
import type { Chapter } from '../../sources/types';
import { font, space } from '../../theme';

/** Màu chữ của khối, theo nền reader (đen với manga, theme đọc với novel). */
export type EndTone = { text: string; muted: string };

export const DARK_TONE: EndTone = { text: '#FFFFFF', muted: 'rgba(255,255,255,0.6)' };

type Props = {
  chapterName: string;
  next?: Chapter;
  prev?: Chapter;
  /** Giây đếm ngược trước khi tự sang chương sau (NEXT_CHAPTER_WAITING_TIME); 0 = tắt. */
  delay: number;
  /** Khối đang hiện trên màn — chỉ đếm ngược khi người đọc thật sự tới đây. */
  active: boolean;
  tone: EndTone;
  onNext: () => void;
  onPrev?: () => void;
  onOpenManga: () => void;
};

/**
 * Khối "Hết chương" cuối danh sách trang/đoạn văn. Đặt `key` theo chương để
 * trạng thái "Huỷ" không dính sang chương sau.
 */
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
            {prev && onPrev && (
              <Button title="Chương trước" icon={ChevronLeft} variant="secondary" small onPress={onPrev} />
            )}
            <Button title="Chương sau" icon={ChevronRight} onPress={onNext} />
          </View>
          {counting && (
            <View style={styles.countdown}>
              <Text style={[font.caption, mutedColor]}>Tự chuyển sau {remaining} giây</Text>
              <Button title="Huỷ" icon={X} variant="ghost" small onPress={() => setCancelled(true)} />
            </View>
          )}
        </>
      ) : (
        <>
          <Text style={[font.body, styles.center, mutedColor]}>Đã là chương mới nhất.</Text>
          <View style={styles.actions}>
            {prev && onPrev && (
              <Button title="Chương trước" icon={ChevronLeft} variant="secondary" small onPress={onPrev} />
            )}
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
});
