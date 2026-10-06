import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

import { ChevronLeft, ChevronRight, Pipette } from '../../components/icons';
import type { StrokeTool } from '../../model/types';
import { font, radius, space, useTheme } from '../../theme';
import { TOOLS } from './canvasShared';

export function ToolSlider({
  label,
  value,
  min,
  max,
  text,
  onChange,
  onEnd,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  text: string;
  onChange: (value: number) => void;
  onEnd?: () => void;
}) {
  const { c } = useTheme();
  const [width, setWidth] = useState(1);
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const update = (e: GestureResponderEvent) => {
    const t = Math.max(0, Math.min(1, (e.nativeEvent.locationX - 10) / Math.max(1, width - 20)));
    onChange(min + t * (max - min));
  };
  return (
    <View style={styles.sliderRow}>
      <Text style={[styles.sliderLabel, { color: c.onToolbarMuted }]}>{label}</Text>
      <View
        style={styles.sliderTouch}
        onLayout={e => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={update}
        onResponderMove={update}
        onResponderRelease={onEnd}
        onResponderTerminate={onEnd}
        accessibilityRole="adjustable"
        accessibilityLabel={label}
      >
        <View pointerEvents="none" style={[styles.sliderTrack, { backgroundColor: c.toolbarAlt }]}>
          <View style={[styles.sliderFill, { backgroundColor: c.onToolbar, width: `${ratio * 100}%` }]} />
        </View>
        <View
          pointerEvents="none"
          style={[
            styles.sliderThumb,
            { backgroundColor: c.onToolbar, borderColor: c.toolbar, left: 10 + ratio * Math.max(0, width - 20) - 9 },
          ]}
        />
      </View>
      <Text style={[styles.sliderValue, { color: c.onToolbar }]}>{text}</Text>
    </View>
  );
}

export function ColorStrip({
  colors,
  recent,
  value,
  onPick,
}: {
  colors: string[];
  recent: string[];
  value: string;
  onPick: (color: string) => void;
}) {
  const { c } = useTheme();
  const swatch = (color: string, key: string) => (
    <Pressable
      key={key}
      onPress={() => onPick(color)}
      accessibilityRole="button"
      accessibilityLabel={`Color ${color}`}
      style={[
        styles.swatch,
        { backgroundColor: color, borderColor: value === color ? c.accent : c.onToolbarMuted },
        value === color && styles.swatchActive,
      ]}
    />
  );
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorRow}>
      {recent.map(color => swatch(color, `r-${color}`))}
      {recent.length ? <View style={[styles.colorDivider, { backgroundColor: c.toolbarAlt }]} /> : null}
      {colors.map(color => swatch(color, color))}
    </ScrollView>
  );
}

export function ToolRail({
  tool,
  picking,
  collapsed,
  side,
  onTool,
  onPick,
  onToggle,
}: {
  tool: StrokeTool;
  picking: boolean;
  collapsed: boolean;
  side: 'left' | 'right';
  onTool: (tool: StrokeTool) => void;
  onPick: () => void;
  onToggle: () => void;
}) {
  const { c } = useTheme();
  const current = TOOLS.find(item => item.id === tool) ?? TOOLS[0];
  const Collapse = (side === 'left') === collapsed ? ChevronRight : ChevronLeft;
  return (
    <View style={[styles.rail, side === 'left' ? styles.railLeft : styles.railRight, { backgroundColor: c.toolbar }]}>
      {(collapsed ? [current] : TOOLS).map(item => {
        const active = item.id === tool && !picking;
        return (
          <Pressable
            key={item.id}
            onPress={() => (collapsed ? onToggle() : onTool(item.id))}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            style={[styles.railButton, active && { backgroundColor: c.accent }]}
          >
            <item.icon size={22} color={active ? c.onAccent : c.onToolbar} />
          </Pressable>
        );
      })}
      {collapsed ? null : (
        <>
          <Pressable
            onPress={onPick}
            accessibilityRole="button"
            accessibilityLabel="Eyedropper"
            style={[styles.railButton, picking && { backgroundColor: c.accent }]}
          >
            <Pipette size={22} color={picking ? c.onAccent : c.onToolbar} />
          </Pressable>
          <View style={[styles.railDivider, { backgroundColor: c.toolbarAlt }]} />
          <Pressable
            onPress={onToggle}
            accessibilityRole="button"
            accessibilityLabel="Collapse toolbar"
            style={styles.railButton}
          >
            <Collapse size={20} color={c.onToolbarMuted} />
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sliderRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.xs },
  sliderLabel: { ...font.caption, width: 50 },
  sliderTouch: { flex: 1, height: 36, justifyContent: 'center' },
  sliderTrack: { marginHorizontal: 10, height: 4, borderRadius: radius.pill, overflow: 'hidden' },
  sliderFill: { height: 4 },
  sliderThumb: { position: 'absolute', width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  sliderValue: { ...font.caption, width: 34, textAlign: 'right', fontVariant: ['tabular-nums'] },
  colorRow: { alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 1 },
  swatchActive: { borderWidth: 3 },
  colorDivider: { width: 2, height: 22 },
  rail: { position: 'absolute', top: space.md, borderRadius: radius.lg, padding: space.xs, gap: space.xs },
  railLeft: { left: space.sm },
  railRight: { right: space.sm },
  railButton: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  railDivider: { height: 2, marginHorizontal: space.xs },
});
