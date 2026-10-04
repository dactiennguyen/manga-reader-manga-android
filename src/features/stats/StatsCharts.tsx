import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { font, radius, space, useTheme } from '../../theme';
import { niceTicks } from './format';

/**
 * Biểu đồ vẽ bằng View (không cần thư viện chart).
 *
 * Màu mark lấy từ token chart/chartAlt của theme: accent tối (#FF7A4D) quá
 * sáng để làm mark trên nền tối (OKLCH L 0.73, vượt dải 0.48–0.67), nên cả
 * hai chế độ dùng #E8572A. Cặp này đã chạy validator dataviz: CVD ΔE ≥ 29,
 * tương phản ≥ 3:1 trên nền sáng lẫn tối.
 */
export function useChartColors(): { primary: string; onPrimary: string; secondary: string } {
  const { c } = useTheme();
  return { primary: c.chart, onPrimary: c.onChart, secondary: c.chartAlt };
}

/** "#RRGGBB" + alpha → "rgba(...)" để dựng thang tuần tự một màu. */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ─── Biểu đồ cột ────────────────────────────────────────────────────────────

export type ChartSeries = { name: string; color: string };

export type BarDatum = {
  key: string;
  /** Nhãn trục x; chuỗi rỗng = không hiện (tránh chồng nhãn khi nhiều cột). */
  axisLabel: string;
  /** Mỗi phần tử ứng với một series, xếp chồng từ dưới lên. */
  values: number[];
  /** Mô tả đầy đủ cho trình đọc màn hình. */
  a11yLabel: string;
};

const AXIS_WIDTH = 34;
const X_BAND = 22;
const MAX_BAR = 24;
const GAP = 2;
const LABEL_WIDTH = 44;

function BarChartBase({
  data,
  series,
  height = 140,
  formatTick = String,
  readout,
}: {
  data: BarDatum[];
  series: ChartSeries[];
  height?: number;
  formatTick?: (value: number) => string;
  /** Dòng số liệu phía trên biểu đồ; nhận undefined khi chưa chọn cột nào. */
  readout: (selected: BarDatum | undefined) => string;
}) {
  const { c } = useTheme();
  const [plotWidth, setPlotWidth] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = data.find(d => d.key === selectedKey);

  const maxTotal = Math.max(0, ...data.map(d => d.values.reduce((a, b) => a + b, 0)));
  const ticks = niceTicks(maxTotal);
  const top = ticks[ticks.length - 1];
  const slot = data.length ? plotWidth / data.length : 0;
  const barWidth = Math.min(MAX_BAR, Math.max(3, Math.floor(slot - Math.max(GAP, slot * 0.3))));

  return (
    <View style={styles.chart}>
      {series.length > 1 && (
        <View style={styles.legend}>
          {series.map(s => (
            <View key={s.name} style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: s.color }]} />
              <Text style={[font.caption, { color: c.textSecondary }]}>{s.name}</Text>
            </View>
          ))}
        </View>
      )}
      <Text
        style={[font.caption, styles.readout, { color: selected ? c.text : c.textSecondary }]}
        numberOfLines={2}
      >
        {readout(selected)}
      </Text>

      <View style={styles.plotRow}>
        <View style={[styles.axis, { height }]}>
          {ticks.map(tick => (
            <Text
              key={tick}
              style={[styles.tick, { color: c.muted, bottom: (tick / top) * height - 7 }]}
            >
              {formatTick(tick)}
            </Text>
          ))}
        </View>
        <View
          style={[styles.plot, { height }]}
          onLayout={e => setPlotWidth(e.nativeEvent.layout.width)}
        >
          {ticks.map(tick => (
            <View
              key={tick}
              pointerEvents="none"
              style={[styles.gridline, { backgroundColor: c.border, bottom: (tick / top) * height }]}
            />
          ))}
          <View style={styles.bars}>
            {data.map(d => (
              <Bar
                key={d.key}
                datum={d}
                series={series}
                top={top}
                height={height}
                width={barWidth}
                dimmed={!!selected && selected.key !== d.key}
                active={selected?.key === d.key}
                onPress={() => setSelectedKey(k => (k === d.key ? null : d.key))}
              />
            ))}
          </View>
        </View>
      </View>

      <View style={[styles.xBand, { marginLeft: AXIS_WIDTH }]}>
        {plotWidth > 0 &&
          data.map((d, i) =>
            d.axisLabel ? (
              <Text
                key={d.key}
                numberOfLines={1}
                style={[
                  styles.xLabel,
                  {
                    color: selected?.key === d.key ? c.text : c.muted,
                    left: Math.min(
                      plotWidth - LABEL_WIDTH,
                      Math.max(0, slot * i + slot / 2 - LABEL_WIDTH / 2),
                    ),
                  },
                ]}
              >
                {d.axisLabel}
              </Text>
            ) : null,
          )}
      </View>
    </View>
  );
}

export const BarChart = memo(BarChartBase);

function BarBase({
  datum,
  series,
  top,
  height,
  width,
  dimmed,
  active,
  onPress,
}: {
  datum: BarDatum;
  series: ChartSeries[];
  top: number;
  height: number;
  width: number;
  dimmed: boolean;
  active: boolean;
  onPress: () => void;
}) {
  // Đoạn dưới cùng là series 0; đoạn khác 0 nhỏ nhất vẫn cao 2px để không biến mất.
  const segments = datum.values
    .map((value, i) => ({
      color: series[i]?.color,
      h: value > 0 ? Math.max(2, (value / top) * height) : 0,
    }))
    .filter(s => s.h > 0);
  const topIndex = segments.length - 1;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={datum.a11yLabel}
      accessibilityState={{ selected: active }}
      style={[styles.slot, dimmed && styles.dimmed]}
    >
      {segments
        .map((s, i) => {
          const capRadius = Math.min(4, s.h / 2);
          return (
            <View
              key={i}
              style={[
                { width, height: s.h, backgroundColor: s.color },
                // Khe 2px màu nền tách các đoạn chồng nhau thay vì kẻ viền.
                i < topIndex && styles.segmentGap,
                i === topIndex && { borderTopLeftRadius: capRadius, borderTopRightRadius: capRadius },
              ]}
            />
          );
        })
        .reverse()}
    </Pressable>
  );
}

const Bar = memo(BarBase);

// ─── Lịch nhiệt ─────────────────────────────────────────────────────────────

export type HeatCell = {
  key: string;
  /** 0 = không đọc, 1–4 = cường độ tăng dần. */
  level: number;
  /** Ngày chưa tới — vẽ ô trống. */
  future: boolean;
  today: boolean;
  a11yLabel: string;
};

const LEVEL_ALPHA = [0, 0.3, 0.52, 0.76, 1];
const WEEKDAY_HEADER = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/** Lịch nhiệt theo tuần (hàng = tuần, cột = thứ), thang tuần tự một màu. */
function CalendarHeatmapBase({
  weeks,
  readout,
}: {
  weeks: { label: string; cells: HeatCell[] }[];
  readout: (selected: HeatCell | undefined) => string;
}) {
  const { c } = useTheme();
  const { primary } = useChartColors();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = weeks.flatMap(w => w.cells).find(cell => cell.key === selectedKey);
  const fill = (level: number) => (level > 0 ? withAlpha(primary, LEVEL_ALPHA[level]) : c.surfaceAlt);

  return (
    <View style={styles.heatmap}>
      <Text
        style={[font.caption, styles.readout, { color: selected ? c.text : c.textSecondary }]}
        numberOfLines={2}
      >
        {readout(selected)}
      </Text>
      <View style={styles.heatRow}>
        <View style={styles.heatRowLabel} />
        {WEEKDAY_HEADER.map(day => (
          <Text key={day} style={[styles.heatHeader, { color: c.muted }]}>
            {day}
          </Text>
        ))}
      </View>
      {weeks.map(week => (
        <View key={week.label} style={styles.heatRow}>
          <Text style={[styles.heatRowLabel, { color: c.muted }]}>{week.label}</Text>
          {week.cells.map(cell => (
            <Pressable
              key={cell.key}
              disabled={cell.future}
              onPress={() => setSelectedKey(k => (k === cell.key ? null : cell.key))}
              accessibilityLabel={cell.a11yLabel}
              accessibilityState={{ selected: selected?.key === cell.key }}
              style={[
                styles.heatCell,
                cell.future
                  ? { borderWidth: StyleSheet.hairlineWidth, borderColor: c.border }
                  : { backgroundColor: fill(cell.level) },
                (cell.today || selected?.key === cell.key) && [
                  styles.heatCellRing,
                  { borderColor: selected?.key === cell.key ? c.text : c.textSecondary },
                ],
              ]}
            />
          ))}
        </View>
      ))}
      <View style={styles.heatLegend}>
        <Text style={[font.caption, { color: c.muted }]}>Ít</Text>
        {LEVEL_ALPHA.map((_, level) => (
          <View key={level} style={[styles.heatLegendCell, { backgroundColor: fill(level) }]} />
        ))}
        <Text style={[font.caption, { color: c.muted }]}>Nhiều</Text>
      </View>
    </View>
  );
}

export const CalendarHeatmap = memo(CalendarHeatmapBase);

const styles = StyleSheet.create({
  chart: { gap: space.xs },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 10, height: 10, borderRadius: 2 },
  readout: { minHeight: 32, fontVariant: ['tabular-nums'] },
  plotRow: { flexDirection: 'row', marginTop: space.xs },
  axis: { width: AXIS_WIDTH },
  tick: {
    position: 'absolute',
    right: 6,
    fontSize: 10,
    lineHeight: 14,
    fontVariant: ['tabular-nums'],
  },
  plot: { flex: 1 },
  gridline: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  bars: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'flex-end' },
  slot: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  segmentGap: { marginTop: GAP },
  dimmed: { opacity: 0.4 },
  xBand: { height: X_BAND },
  xLabel: {
    position: 'absolute',
    top: 6,
    width: LABEL_WIDTH,
    textAlign: 'center',
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  heatmap: { gap: 6, maxWidth: 420, width: '100%', alignSelf: 'center' },
  heatRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heatRowLabel: { width: 38, fontSize: 10, fontVariant: ['tabular-nums'] },
  heatHeader: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '600' },
  heatCell: { flex: 1, aspectRatio: 1, borderRadius: radius.sm - 2 },
  heatCellRing: { borderWidth: 2 },
  heatLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: space.xs,
  },
  heatLegendCell: { width: 12, height: 12, borderRadius: 3 },
});
