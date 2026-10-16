import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import {
  BarChart3,
  BookOpen,
  ChevronRight,
  Clock,
  Flame,
  Layers,
  Timer,
  Trophy,
  type LucideIcon,
} from '../../components/icons';
import { formatCount } from '../../lib/format';
import { computeStreak, useStats } from '../../store/useStats';
import { font, radius, space, useTheme } from '../../theme';
import { formatDurationShort } from './format';
import { withAlpha } from './StatsCharts';

const TONES = {
  light: { blue: '#1E88E5', green: '#2E7D32', purple: '#7E57C2', orange: '#E64A19', gold: '#B8860B', teal: '#00897B' },
  dark: { blue: '#64B5F6', green: '#7FD18A', purple: '#B39DDB', orange: '#FF8A65', gold: '#F3C04E', teal: '#4DB6AC' },
};

type Tile = { icon: LucideIcon; label: string; value: string; color: string };

export function StatsSummaryCard({ onPress }: { onPress: () => void }) {
  const { c, dark } = useTheme();
  const stats = useStats(
    useShallow(s => ({
      daily: s.daily,
      totalSeconds: s.totalSeconds,
      totalChapters: s.totalChapters,
      totalSessions: s.totalSessions,
      longestSession: s.longestSession,
    })),
  );
  const streak = useMemo(() => computeStreak(stats.daily), [stats.daily]);
  const tone = dark ? TONES.dark : TONES.light;

  const rows: Tile[][] = [
    [
      { icon: BookOpen, label: 'Chương', value: formatCount(stats.totalChapters), color: tone.blue },
      { icon: Clock, label: 'Thời gian đọc', value: formatDurationShort(stats.totalSeconds), color: tone.green },
      { icon: Layers, label: 'Phiên đọc', value: formatCount(stats.totalSessions), color: tone.purple },
    ],
    [
      { icon: Flame, label: 'Chuỗi hiện tại', value: `${streak.current} ngày`, color: tone.orange },
      { icon: Trophy, label: 'Chuỗi dài nhất', value: `${streak.best} ngày`, color: tone.gold },
      { icon: Timer, label: 'Phiên dài nhất', value: formatDurationShort(stats.longestSession), color: tone.teal },
    ],
  ];

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: c.border }}
      accessibilityRole="button"
      style={[styles.card, { backgroundColor: c.surface }]}
    >
      <View style={styles.header}>
        <BarChart3 size={20} color={c.accent} />
        <Text style={[font.heading, styles.flex, { color: c.text }]}>Thống kê đọc</Text>
        <ChevronRight size={18} color={c.muted} />
      </View>
      {rows.map((row, index) => (
        <View key={index} style={styles.row}>
          {row.map(({ icon: Icon, label, value, color }) => (
            <View key={label} style={[styles.tile, { backgroundColor: withAlpha(color, dark ? 0.16 : 0.1) }]}>
              <Icon size={18} color={color} />
              <Text style={[styles.value, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>
                {value}
              </Text>
              <Text style={[font.caption, { color: c.textSecondary }]} numberOfLines={2}>
                {label}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    marginHorizontal: space.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
    padding: space.md,
    gap: space.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingBottom: space.xs },
  row: { flexDirection: 'row', gap: space.sm },
  tile: { flex: 1, borderRadius: radius.md, padding: space.sm + 2, gap: 2 },
  value: { fontSize: 18, fontWeight: '700', marginTop: space.xs },
});
