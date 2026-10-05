import { memo, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { useAppNavigation } from '../../app/routes';
import { Cover } from '../../components/MangaCard';
import { Sheet } from '../../components/Sheet';
import {
  BookOpen,
  Clock,
  EllipsisVertical,
  Flame,
  History,
  Layers,
  RotateCcw,
  Search,
  Timer,
  Trophy,
  type LucideIcon,
} from '../../components/icons';
import {
  EmptyState,
  Header,
  IconButton,
  ListItem,
  Screen,
  Section,
  Segmented,
  confirm,
  toast,
} from '../../components/ui';
import { getEngine } from '../../sources';
import { addDays, dayKey, dayKeyToDate, formatDate, formatDuration, formatRelative } from '../../lib/time';
import { useHistory, type ReadingEntry } from '../../store/useHistory';
import { useSource } from '../../store/useSources';
import { computeStreak, lastDays, useStats, type DailyStats } from '../../store/useStats';
import { font, radius, space, useTheme } from '../../theme';
import { formatCount } from '../../lib/format';
import { formatMinutesShort } from './format';
import { BarChart, CalendarHeatmap, useChartColors, type BarDatum, type HeatCell } from './StatsCharts';

const RANGE_OPTIONS = [
  { value: 7, label: '7 ngày' },
  { value: 30, label: '30 ngày' },
] as const;

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const HEAT_WEEKS = 5;

/** dd/mm cho nhãn trục. */
function shortDate(key: string): string {
  const [, m, d] = key.split('-');
  return `${d}/${m}`;
}

function weekdayOf(key: string): string {
  return WEEKDAYS[dayKeyToDate(key).getDay()];
}

function describeDay(key: string, stats: DailyStats): string {
  const parts = [`${weekdayOf(key)}, ${formatDate(dayKeyToDate(key).getTime())}`];
  parts.push(stats.seconds > 0 ? formatDuration(stats.seconds) : 'chưa đọc');
  if (stats.chapters > 0) {
    parts.push(`${stats.chapters} chương`);
  }
  return parts.join(' · ');
}

/** Mức đậm của ô lịch nhiệt theo phút đọc trong ngày. */
function heatLevel(stats: DailyStats | undefined): number {
  if (!stats || (stats.seconds < 60 && stats.chapters === 0)) {
    return 0;
  }
  const minutes = stats.seconds / 60;
  if (minutes < 15) {
    return 1;
  }
  if (minutes < 30) {
    return 2;
  }
  if (minutes < 60) {
    return 3;
  }
  return 4;
}

export function ReadingStatsScreen() {
  const navigation = useAppNavigation();
  const { c } = useTheme();
  const stats = useStats(
    useShallow(s => ({
      daily: s.daily,
      totalSeconds: s.totalSeconds,
      totalChapters: s.totalChapters,
      totalSessions: s.totalSessions,
      longestSession: s.longestSession,
      reset: s.reset,
    })),
  );
  const recent = useHistory(s => s.reading);
  const [range, setRange] = useState<7 | 30>(7);
  const [menuOpen, setMenuOpen] = useState(false);

  const streak = useMemo(() => computeStreak(stats.daily), [stats.daily]);
  const isEmpty =
    stats.totalSessions === 0 && stats.totalChapters === 0 && Object.keys(stats.daily).length === 0;

  const resetStats = async () => {
    setMenuOpen(false);
    const ok = await confirm(
      'Đặt lại thống kê',
      'Toàn bộ thời gian đọc, số chương và chuỗi ngày đọc sẽ bị xoá. Lịch sử đọc truyện vẫn được giữ.',
      { confirmText: 'Đặt lại', destructive: true },
    );
    if (ok) {
      stats.reset();
      toast('Đã đặt lại thống kê đọc');
    }
  };

  return (
    <Screen>
      <Header
        title="Thống kê đọc"
        right={
          <IconButton
            icon={EllipsisVertical}
            color={c.onAppBar}
            onPress={() => setMenuOpen(true)}
            accessibilityLabel="Tuỳ chọn"
          />
        }
      />
      {isEmpty ? (
        <EmptyState
          icon={BookOpen}
          title="Chưa có hoạt động đọc nào"
          message="Thời gian đọc, số chương và chuỗi ngày đọc sẽ được ghi lại khi bạn đọc truyện."
          action={{ label: 'Tìm truyện để đọc', icon: Search, onPress: () => navigation.navigate('MangaSearch') }}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <StreakCard current={streak.current} best={streak.best} readToday={streak.readToday} daily={stats.daily} />

          <Section title="Thống kê tổng">
            <View style={styles.tiles}>
              <StatTile icon={Clock} label="Tổng thời gian đọc" value={formatDuration(stats.totalSeconds)} />
              <StatTile icon={BookOpen} label="Chương đã đọc" value={formatCount(stats.totalChapters)} />
              <StatTile icon={Layers} label="Phiên đọc" value={formatCount(stats.totalSessions)} />
              <StatTile icon={Timer} label="Phiên dài nhất" value={formatDuration(stats.longestSession)} />
            </View>
          </Section>

          <Section title="Thời gian đọc theo ngày">
            <View style={styles.card}>
              <Segmented options={RANGE_OPTIONS} value={range} onChange={setRange} />
              <ReadingChart daily={stats.daily} days={range} />
              <Text style={[font.caption, { color: c.muted }]}>Chạm vào cột để xem chi tiết từng ngày.</Text>
            </View>
          </Section>

          <Section title={`Lịch đọc ${HEAT_WEEKS} tuần gần nhất`}>
            <View style={styles.card}>
              <ReadingHeatmap daily={stats.daily} />
            </View>
          </Section>

          {recent.length > 0 && (
            <Section title="Hoạt động gần đây">
              {recent.slice(0, 5).map((entry, index) => (
                <View key={entry.key}>
                  {index > 0 && <View style={[styles.divider, { backgroundColor: c.border }]} />}
                  <RecentItem entry={entry} />
                </View>
              ))}
              <ListItem
                title="Xem toàn bộ lịch sử đọc"
                icon={History}
                chevron
                onPress={() => navigation.navigate('History', { tab: 'reading' })}
              />
            </Section>
          )}
        </ScrollView>
      )}

      <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)} title="Thống kê đọc">
        <ListItem
          title="Lịch sử đọc"
          icon={History}
          onPress={() => {
            setMenuOpen(false);
            navigation.navigate('History', { tab: 'reading' });
          }}
        />
        <ListItem
          title="Đặt lại thống kê"
          subtitle="Xoá thời gian đọc, số chương và chuỗi ngày"
          icon={RotateCcw}
          destructive
          disabled={isEmpty}
          onPress={resetStats}
        />
      </Sheet>
    </Screen>
  );
}

// ─── Chuỗi ngày đọc ─────────────────────────────────────────────────────────

function StreakCard({
  current,
  best,
  readToday,
  daily,
}: {
  current: number;
  best: number;
  readToday: boolean;
  daily: Record<string, DailyStats>;
}) {
  const { c } = useTheme();
  const { primary, onPrimary } = useChartColors();
  const week = lastDays(daily, 7);
  const message = readToday
    ? 'Bạn đã đọc hôm nay — chuỗi ngày đọc được giữ vững!'
    : current > 0
      ? 'Đọc một chương để giữ chuỗi!'
      : 'Đọc một chương hôm nay để bắt đầu chuỗi mới.';

  return (
    <View style={[styles.streakCard, { backgroundColor: c.surface }]}>
      <View style={styles.streakRow}>
        <View style={styles.streakMain}>
          <View style={[styles.flameBadge, { backgroundColor: readToday ? c.accentSoft : c.surfaceAlt }]}>
            <Flame size={30} color={readToday ? c.accent : c.muted} fill={readToday ? c.accent : 'transparent'} />
          </View>
          <View>
            <Text style={[styles.hero, { color: c.text }]}>
              {current} <Text style={[font.body, { color: c.muted }]}>ngày</Text>
            </Text>
            <Text style={[font.caption, { color: c.muted }]}>Chuỗi hiện tại</Text>
          </View>
        </View>
        <View style={styles.bestBox}>
          <View style={styles.bestRow}>
            <Trophy size={16} color={c.warning} />
            <Text style={[font.heading, { color: c.text }]}>{best}</Text>
          </View>
          <Text style={[font.caption, { color: c.muted }]}>Chuỗi dài nhất</Text>
        </View>
      </View>

      <View style={styles.weekRow}>
        {week.map(({ key, stats }) => {
          const active = heatLevel(stats) > 0;
          const isToday = key === dayKey();
          return (
            <View key={key} style={styles.weekDay}>
              <View
                style={[
                  styles.weekDot,
                  { backgroundColor: active ? primary : c.surfaceAlt },
                  isToday && !active && [styles.weekDotToday, { borderColor: c.muted }],
                ]}
              >
                {active && <Flame size={12} color={onPrimary} />}
              </View>
              <Text style={[styles.weekLabel, { color: isToday ? c.text : c.muted }]}>
                {isToday ? 'Nay' : weekdayOf(key)}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={[styles.messageBox, { backgroundColor: c.surfaceAlt }]}>
        <Text style={[font.label, { color: c.text }]}>Tiếp tục đọc nào!</Text>
        <Text style={[font.caption, { color: c.textSecondary }]}>{message}</Text>
      </View>
    </View>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  const { c } = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: c.surfaceAlt }]}>
      <Icon size={18} color={c.muted} />
      <Text style={[font.caption, { color: c.muted }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.tileValue, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

// ─── Biểu đồ ────────────────────────────────────────────────────────────────

function ReadingChart({ daily, days }: { daily: Record<string, DailyStats>; days: 7 | 30 }) {
  const { primary } = useChartColors();
  const range = useMemo(() => lastDays(daily, days), [daily, days]);
  const series = useMemo(() => [{ name: 'Phút đọc', color: primary }], [primary]);

  const data = useMemo<BarDatum[]>(
    () =>
      range.map(({ key, stats }, i) => ({
        key,
        // 30 cột: chỉ ghi nhãn mỗi 7 ngày và ngày cuối để nhãn không chồng nhau.
        axisLabel:
          days === 7 ? weekdayOf(key) : (range.length - 1 - i) % 7 === 0 ? shortDate(key) : '',
        values: [stats.seconds / 60],
        a11yLabel: describeDay(key, stats),
      })),
    [range, days],
  );

  const totalSeconds = range.reduce((sum, d) => sum + d.stats.seconds, 0);
  const activeDays = range.filter(d => d.stats.seconds > 0).length;

  const readout = (selected: BarDatum | undefined) => {
    if (selected) {
      const stats = range.find(d => d.key === selected.key)?.stats;
      return stats ? describeDay(selected.key, stats) : '';
    }
    if (!totalSeconds) {
      return `Chưa có thời gian đọc trong ${days} ngày qua.`;
    }
    return `Tổng ${formatDuration(totalSeconds)} · TB ${formatDuration(totalSeconds / days)}/ngày · ${activeDays}/${days} ngày có đọc`;
  };

  return (
    <BarChart data={data} series={series} height={150} formatTick={formatMinutesShort} readout={readout} />
  );
}

function ReadingHeatmap({ daily }: { daily: Record<string, DailyStats> }) {
  const weeks = useMemo(() => {
    const today = dayKey();
    // Tuần bắt đầu từ thứ Hai; getDay(): CN = 0.
    const offset = (dayKeyToDate(today).getDay() + 6) % 7;
    const start = addDays(today, -offset - (HEAT_WEEKS - 1) * 7);
    return Array.from({ length: HEAT_WEEKS }, (_, w) => {
      const weekStart = addDays(start, w * 7);
      const cells: HeatCell[] = Array.from({ length: 7 }, (__, d) => {
        const key = addDays(weekStart, d);
        const stats = daily[key];
        return {
          key,
          level: heatLevel(stats),
          future: key > today,
          today: key === today,
          a11yLabel: describeDay(key, stats ?? { seconds: 0, chapters: 0, sessions: 0 }),
        };
      });
      return { label: shortDate(weekStart), cells };
    });
  }, [daily]);

  const readout = (cell: HeatCell | undefined) =>
    cell
      ? describeDay(cell.key, daily[cell.key] ?? { seconds: 0, chapters: 0, sessions: 0 })
      : 'Ô càng đậm là ngày đọc càng lâu (dưới 15 phút, 15–30 phút, 30–60 phút, trên 1 giờ).';

  return <CalendarHeatmap weeks={weeks} readout={readout} />;
}

// ─── Hoạt động gần đây ──────────────────────────────────────────────────────

function RecentItemBase({ entry }: { entry: ReadingEntry }) {
  const navigation = useAppNavigation();
  const { c } = useTheme();
  const source = useSource(entry.sourceId);
  const headers = useMemo(() => (source ? getEngine(source.engine).imageHeaders(source) : undefined), [source]);
  return (
    <Pressable
      android_ripple={{ color: c.border }}
      onPress={() =>
        navigation.navigate('MangaDetail', {
          sourceId: entry.sourceId,
          url: entry.mangaUrl,
          title: entry.title,
          cover: entry.cover,
        })
      }
      style={styles.recent}
    >
      <Cover uri={entry.cover} headers={headers} style={styles.recentCover} />
      <View style={styles.recentBody}>
        <Text numberOfLines={1} style={[font.label, { color: c.text }]}>
          {entry.title}
        </Text>
        <Text numberOfLines={1} style={[font.caption, { color: c.textSecondary }]}>
          {entry.chapterName}
        </Text>
        <Text style={[font.caption, { color: c.muted }]}>{formatRelative(entry.at)}</Text>
      </View>
    </Pressable>
  );
}

const RecentItem = memo(RecentItemBase);

const styles = StyleSheet.create({
  content: { paddingVertical: space.lg, gap: space.xl },
  card: { padding: space.lg, gap: space.md },
  streakCard: { marginHorizontal: space.md, borderRadius: radius.lg, padding: space.lg, gap: space.lg },
  streakRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  streakMain: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flameBadge: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  hero: { fontSize: 34, fontWeight: '700', lineHeight: 40 },
  bestBox: { alignItems: 'flex-end', gap: 2 },
  bestRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', gap: 4, flex: 1 },
  weekDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  weekDotToday: { borderWidth: 1.5, borderStyle: 'solid' },
  weekLabel: { fontSize: 11, fontWeight: '600' },
  messageBox: { borderRadius: radius.md, padding: space.md, gap: 2 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', padding: space.sm, gap: space.sm },
  tile: { flexBasis: '47%', flexGrow: 1, borderRadius: radius.md, padding: space.md, gap: 4 },
  tileValue: { fontSize: 20, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 76 },
  recent: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm },
  recentCover: { width: 44 },
  recentBody: { flex: 1, justifyContent: 'center', gap: 2 },
});
