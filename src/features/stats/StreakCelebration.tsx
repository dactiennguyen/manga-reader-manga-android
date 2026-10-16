import type { NavigationContainerRef } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { RootStackParamList } from '../../app/routes';
import { Dialog } from '../../components/Sheet';
import { Flame, PartyPopper } from '../../components/icons';
import { addDays, dayKey } from '../../lib/time';
import { useSettings } from '../../store/useSettings';
import { computeStreak, useStats } from '../../store/useStats';
import { font, space, useTheme } from '../../theme';

const READER_ROUTES: string[] = ['Reader', 'NovelReader'];
const CHECK_DELAY = 600;

type Celebration = { days: number; record: boolean };

function pendingCelebration(): Celebration | null {
  const { daily, streakShownDay } = useStats.getState();
  const today = dayKey();
  if (!useSettings.getState().streakPopup || streakShownDay === today) {
    return null;
  }
  const { current, readToday } = computeStreak(daily);
  if (!readToday) {
    return null;
  }
  const start = addDays(today, 1 - current);
  const earlier = Object.fromEntries(Object.entries(daily).filter(([key]) => key < start));
  return { days: current, record: current > 1 && current > computeStreak(earlier).best };
}

function celebrationMessage({ days, record }: Celebration): string {
  if (days <= 1) {
    return 'Khởi đầu tốt! Bạn vừa bắt đầu chuỗi ngày đọc mới. Tiếp tục nhé! 📖';
  }
  if (record) {
    return `Kỷ lục mới! ${days} ngày đọc liên tiếp, chuỗi dài nhất từ trước đến nay. 🏆`;
  }
  return `Bạn đã đọc ${days} ngày liên tiếp. Ngày mai nhớ quay lại để giữ chuỗi nhé! 🔥`;
}

export function StreakCelebration({ navigation }: { navigation: NavigationContainerRef<RootStackParamList> }) {
  const { c } = useTheme();
  const [celebration, setCelebration] = useState<Celebration>({ days: 0, record: false });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let reading = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = navigation.addListener('state', ({ data }) => {
      const wasReading = reading;
      reading = !!data.state?.routes.some(route => READER_ROUTES.includes(route.name));
      if (!wasReading || reading) {
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        const next = reading ? null : pendingCelebration();
        if (next) {
          useStats.getState().markStreakShown();
          setCelebration(next);
          setVisible(true);
        }
      }, CHECK_DELAY);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [navigation]);

  const close = () => setVisible(false);
  const Icon = celebration.record ? PartyPopper : Flame;

  return (
    <Dialog
      visible={visible}
      onClose={close}
      actions={[
        {
          label: 'Xem thống kê',
          onPress: () => {
            close();
            navigation.navigate('ReadingStats');
          },
        },
        { label: 'Đọc tiếp', variant: 'primary', onPress: close },
      ]}
    >
      <View style={styles.top}>
        <View style={[styles.badge, { backgroundColor: c.accentSoft }]}>
          <Icon size={32} color={c.accent} />
        </View>
        <Text style={[font.heading, { color: c.text }]}>Chuỗi ngày đọc</Text>
        <Text style={[styles.hero, { color: c.text }]}>
          {celebration.days} <Text style={[font.body, { color: c.muted }]}>ngày</Text>
        </Text>
      </View>
      <Text style={[font.body, styles.center, { color: c.textSecondary }]}>{celebrationMessage(celebration)}</Text>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', gap: space.sm },
  badge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  hero: { fontSize: 34, fontWeight: '700', lineHeight: 40 },
  center: { textAlign: 'center' },
});
