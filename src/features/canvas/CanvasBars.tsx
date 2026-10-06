import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

import type { ReactNode } from 'react';

import { ChevronLeft, ChevronRight, Pipette, type LucideIcon } from '../../components/icons';
import { TONE_DENSITIES } from '../../engine/artMath';
import { font, radius, space, useTheme } from '../../theme';
import { SHAPES_ICON, SHAPE_TOOLS, TOOLS, isShapeId, type CanvasTool, type ShapeTool } from './canvasShared';

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
  leading,
  onPick,
}: {
  colors: string[];
  recent: string[];
  value: string;
  leading?: ReactNode;
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
      {leading}
      {recent.map(color => swatch(color, `r-${color}`))}
      {recent.length ? <View style={[styles.colorDivider, { backgroundColor: c.toolbarAlt }]} /> : null}
      {colors.map(color => swatch(color, color))}
    </ScrollView>
  );
}

export function TonePicker({ value, onChange }: { value: number | null; onChange: (value: number | null) => void }) {
  const { c } = useTheme();
  const chip = (density: number | null) => {
    const active = value === density;
    const label = density === null ? 'Solid' : `${Math.round(density * 100)}%`;
    return (
      <Pressable
        key={label}
        onPress={() => onChange(density)}
        accessibilityRole="button"
        accessibilityLabel={density === null ? 'Solid color' : `Screentone ${label}`}
        accessibilityState={{ selected: active }}
        style={[
          styles.toneChip,
          { borderColor: active ? c.accent : c.onToolbarMuted },
          active && { backgroundColor: c.accent },
        ]}
      >
        <Text style={[styles.toneText, { color: active ? c.onAccent : c.onToolbar }]}>{label}</Text>
      </Pressable>
    );
  };
  return (
    <>
      {chip(null)}
      {TONE_DENSITIES.map(chip)}
      <View style={[styles.colorDivider, { backgroundColor: c.toolbarAlt }]} />
    </>
  );
}

export function ToolRail({
  tool,
  shape,
  picking,
  collapsed,
  side,
  maxHeight,
  onTool,
  onPick,
  onToggle,
}: {
  tool: CanvasTool;
  shape: ShapeTool;
  picking: boolean;
  collapsed: boolean;
  side: 'left' | 'right';
  maxHeight: number;
  onTool: (tool: CanvasTool) => void;
  onPick: () => void;
  onToggle: () => void;
}) {
  const { c } = useTheme();
  const [shapesOpen, setShapesOpen] = useState(false);
  const shapeActive = isShapeId(tool) && !picking;
  const shapeDef = SHAPE_TOOLS.find(item => item.id === (isShapeId(tool) ? tool : shape)) ?? SHAPE_TOOLS[0];
  const current = isShapeId(tool) ? shapeDef : TOOLS.find(item => item.id === tool) ?? TOOLS[0];
  const Collapse = (side === 'left') === collapsed ? ChevronRight : ChevronLeft;
  const ShapeIcon = isShapeId(tool) ? shapeDef.icon : SHAPES_ICON;
  const button = (item: { id: CanvasTool; label: string; icon: LucideIcon }) => {
    const active = item.id === tool && !picking;
    return (
      <Pressable
        key={item.id}
        onPress={() => {
          setShapesOpen(false);
          if (collapsed) {
            onToggle();
          } else {
            onTool(item.id);
          }
        }}
        accessibilityRole="button"
        accessibilityLabel={item.label}
        accessibilityState={{ selected: active }}
        style={[styles.railButton, active && { backgroundColor: c.accent }]}
      >
        <item.icon size={22} color={active ? c.onAccent : c.onToolbar} />
      </Pressable>
    );
  };
  return (
    <View pointerEvents="box-none" style={[styles.railWrap, side === 'left' ? styles.railLeft : styles.railRight]}>
      <View style={[styles.rail, { backgroundColor: c.toolbar, maxHeight }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.railContent}>
          {collapsed ? (
            button(current)
          ) : (
            <>
              {TOOLS.slice(0, 4).map(button)}
              <Pressable
                onPress={() => {
                  if (shapeActive) {
                    setShapesOpen(v => !v);
                  } else {
                    onTool(shapeDef.id);
                  }
                }}
                onLongPress={() => {
                  onTool(shapeDef.id);
                  setShapesOpen(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Shapes, ${shapeDef.label}`}
                accessibilityHint="Tap again or long press to choose a shape"
                accessibilityState={{ selected: shapeActive, expanded: shapesOpen }}
                style={[styles.railButton, shapeActive && { backgroundColor: c.accent }]}
              >
                <ShapeIcon size={22} color={shapeActive ? c.onAccent : c.onToolbar} />
              </Pressable>
              {TOOLS.slice(4).map(button)}
              <Pressable
                onPress={() => {
                  setShapesOpen(false);
                  onPick();
                }}
                accessibilityRole="button"
                accessibilityLabel="Eyedropper"
                accessibilityState={{ selected: picking }}
                style={[styles.railButton, picking && { backgroundColor: c.accent }]}
              >
                <Pipette size={22} color={picking ? c.onAccent : c.onToolbar} />
              </Pressable>
              <View style={[styles.railDivider, { backgroundColor: c.toolbarAlt }]} />
              <Pressable
                onPress={() => {
                  setShapesOpen(false);
                  onToggle();
                }}
                accessibilityRole="button"
                accessibilityLabel="Collapse toolbar"
                style={styles.railButton}
              >
                <Collapse size={20} color={c.onToolbarMuted} />
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>
      {shapesOpen && !collapsed ? (
        <View style={[styles.rail, styles.flyout, { backgroundColor: c.toolbar }]}>
          {SHAPE_TOOLS.map(item => {
            const active = item.id === tool && !picking;
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  onTool(item.id);
                  setShapesOpen(false);
                }}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: active }}
                style={[styles.railButton, active && { backgroundColor: c.accent }]}
              >
                <item.icon size={22} color={active ? c.onAccent : c.onToolbar} />
              </Pressable>
            );
          })}
        </View>
      ) : null}
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
  railWrap: { position: 'absolute', top: space.md, alignItems: 'flex-start', gap: space.xs },
  rail: { width: 44 + space.xs * 2, borderRadius: radius.lg, padding: space.xs },
  railContent: { gap: space.xs },
  flyout: { gap: space.xs },
  toneChip: {
    height: 28,
    minWidth: 40,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toneText: { ...font.caption, fontVariant: ['tabular-nums'] },
  railLeft: { left: space.sm, flexDirection: 'row' },
  railRight: { right: space.sm, flexDirection: 'row-reverse' },
  railButton: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  railDivider: { height: 2, marginHorizontal: space.xs },
});
