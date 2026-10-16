import { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Battery, BatteryCharging, BatteryFull, BatteryLow, ChevronLeft, ChevronRight } from '../../components/icons';
import { getBatteryState, type BatteryState } from '../../lib/screen';
import { space } from '../../theme';
import { useStoreValue, type ValueStore } from './valueStore';

const CLOCK_MS = 15_000;
const BATTERY_MS = 60_000;

function clock(): string {
  const now = new Date();
  return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function useClock(active: boolean): string {
  const [value, setValue] = useState(clock);
  useEffect(() => {
    if (!active) {
      return;
    }
    setValue(clock());
    const timer = setInterval(() => setValue(clock()), CLOCK_MS);
    return () => clearInterval(timer);
  }, [active]);
  return value;
}

function useBattery(active: boolean): BatteryState | undefined {
  const [value, setValue] = useState(getBatteryState);
  useEffect(() => {
    if (!active) {
      return;
    }
    setValue(getBatteryState());
    const timer = setInterval(() => setValue(getBatteryState()), BATTERY_MS);
    return () => clearInterval(timer);
  }, [active]);
  return value;
}

function BatteryIcon({ state }: { state: BatteryState }) {
  const color = !state.charging && state.level <= 15 ? '#FF8A80' : TEXT;
  if (state.charging) {
    return <BatteryCharging size={13} color={color} />;
  }
  if (state.level >= 95) {
    return <BatteryFull size={13} color={color} />;
  }
  return state.level <= 15 ? <BatteryLow size={13} color={color} /> : <Battery size={13} color={color} />;
}

export const ReaderStatusInfo = memo(function ReaderStatusInfoView({
  visible,
  chapterName,
  pageStore,
  total,
  bottom,
}: {
  visible: boolean;
  chapterName: string;
  pageStore: ValueStore<number>;
  total: number;
  bottom: number;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const page = useStoreValue(pageStore);
  const time = useClock(visible && !collapsed);
  const battery = useBattery(visible && !collapsed);

  if (!visible || total <= 0) {
    return null;
  }

  if (collapsed) {
    return (
      <Pressable
        onPress={() => setCollapsed(false)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Hiện dòng trạng thái"
        style={[styles.pill, styles.collapsed, { bottom }]}
      >
        <ChevronLeft size={16} color={TEXT} />
      </Pressable>
    );
  }

  return (
    <View pointerEvents="box-none" style={[styles.pill, { bottom }]}>
      <Pressable
        onPress={() => setCollapsed(true)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Thu gọn dòng trạng thái"
      >
        <ChevronRight size={14} color={MUTED} />
      </Pressable>
      <View pointerEvents="none" style={styles.info}>
        <Text numberOfLines={1} style={[styles.text, styles.chapter]}>
          {chapterName}
        </Text>
        <Text style={styles.text}>{time}</Text>
        {battery && (
          <>
            <BatteryIcon state={battery} />
            <Text style={[styles.text, styles.battery]}>{battery.level}%</Text>
          </>
        )}
        <Text style={styles.text}>
          {Math.min(total, page + 1)}/{total}
        </Text>
      </View>
    </View>
  );
});

const TEXT = 'rgba(255,255,255,0.92)';
const MUTED = 'rgba(255,255,255,0.6)';

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    maxWidth: '82%',
    paddingLeft: space.sm,
    paddingRight: space.md,
    paddingVertical: 3,
    borderTopLeftRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  info: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  collapsed: { paddingHorizontal: space.xs, paddingVertical: space.xs },
  text: { color: TEXT, fontSize: 12, fontVariant: ['tabular-nums'] },
  chapter: { flexShrink: 1 },
  battery: { marginLeft: -space.xs },
});
