import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { SlideInLeft, SlideInRight } from 'react-native-reanimated';

import { PromptDialog } from '../../components/comic';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Lock,
  LockOpen,
  Merge,
  Pencil,
  Plus,
  Trash,
  X,
  type LucideIcon,
} from '../../components/icons';
import { confirm, toast } from '../../components/ui';
import { newLayer } from '../../engine/artStore';
import { LIMITS } from '../../model/constants';
import type { ArtLayer, ID, PanelArt } from '../../model/types';
import { font, radius, space, useTheme } from '../../theme';
import { ToolSlider } from './CanvasBars';
import { patchLayer } from './canvasShared';

function RowAction({
  icon: Icon,
  label,
  onPress,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.action, disabled && styles.disabled]}
    >
      <Icon size={18} color={c.onToolbar} />
    </Pressable>
  );
}

export function LayerPanel({
  art,
  side,
  onChange,
  onCommit,
  onImportImage,
  onClose,
}: {
  art: PanelArt;
  side: 'left' | 'right';
  onChange: (next: PanelArt, history: boolean) => void;
  onCommit: () => void;
  onImportImage: () => void;
  onClose: () => void;
}) {
  const { c } = useTheme();
  const [renameId, setRenameId] = useState<ID | null>(null);
  const renaming = art.layers.find(layer => layer.id === renameId);
  const full = art.layers.length >= LIMITS.layers;

  const add = () => {
    if (full) {
      toast(`Up to ${LIMITS.layers} layers`);
      return;
    }
    const layer = newLayer(`Layer ${art.layers.length + 1}`);
    const at = art.layers.findIndex(item => item.id === art.activeLayerId);
    const layers = [...art.layers];
    layers.splice(at < 0 ? layers.length : at + 1, 0, layer);
    onChange({ layers, activeLayerId: layer.id }, true);
  };

  const remove = async (layer: ArtLayer) => {
    if (art.layers.length <= 1) {
      toast('Keep at least one layer');
      return;
    }
    if (
      (layer.strokes.length || layer.image) &&
      !(await confirm(`Delete layer "${layer.name}"?`, 'Its strokes will be lost.', {
        confirmText: 'Delete',
        destructive: true,
      }))
    ) {
      return;
    }
    const index = art.layers.indexOf(layer);
    const layers = art.layers.filter(item => item !== layer);
    const activeLayerId = art.activeLayerId === layer.id ? layers[Math.max(0, index - 1)].id : art.activeLayerId;
    onChange({ layers, activeLayerId }, true);
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= art.layers.length) {
      return;
    }
    const layers = [...art.layers];
    [layers[index], layers[target]] = [layers[target], layers[index]];
    onChange({ ...art, layers }, true);
  };

  const mergeDown = (index: number) => {
    const upper = art.layers[index];
    const lower = art.layers[index - 1];
    if (!lower) {
      return;
    }
    if (lower.locked) {
      toast('The layer below is locked');
      return;
    }
    if (upper.image && (lower.image || lower.strokes.length)) {
      toast('Cannot merge an image layer onto a layer with content');
      return;
    }
    const strokes = upper.strokes.map(stroke =>
      stroke.tool === 'eraser' || upper.opacity >= 1 ? stroke : { ...stroke, opacity: stroke.opacity * upper.opacity },
    );
    const merged: ArtLayer = {
      ...lower,
      image: lower.image ?? upper.image,
      strokes: [...lower.strokes, ...strokes],
    };
    const layers = art.layers.filter(item => item !== upper).map(item => (item === lower ? merged : item));
    onChange({ layers, activeLayerId: merged.id }, true);
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close layers panel" />
      <Animated.View
        entering={(side === 'right' ? SlideInRight : SlideInLeft).duration(180)}
        style={[styles.panel, side === 'right' ? styles.right : styles.left, { backgroundColor: c.toolbar }]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.onToolbar }]}>
            Layers {art.layers.length}/{LIMITS.layers}
          </Text>
          <RowAction icon={ImageIcon} label="Import image into layer" onPress={onImportImage} />
          <RowAction icon={Plus} label="Add layer" onPress={add} disabled={full} />
          <RowAction icon={X} label="Close" onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={styles.list}>
          {art.layers
            .map((layer, index) => ({ layer, index }))
            .reverse()
            .map(({ layer, index }) => {
              const active = layer.id === art.activeLayerId;
              return (
                <View
                  key={layer.id}
                  style={[styles.row, { backgroundColor: c.toolbarAlt, borderColor: active ? c.accent : c.toolbarAlt }]}
                >
                  <View style={styles.rowTop}>
                    <RowAction
                      icon={layer.visible ? Eye : EyeOff}
                      label={layer.visible ? 'Hide layer' : 'Show layer'}
                      onPress={() =>
                        onChange(
                          patchLayer(art, layer.id, l => ({ ...l, visible: !l.visible })),
                          true,
                        )
                      }
                    />
                    <Pressable
                      style={styles.name}
                      onPress={() => onChange({ ...art, activeLayerId: layer.id }, false)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`Select layer ${layer.name}`}
                    >
                      <Text numberOfLines={1} style={[styles.nameText, { color: c.onToolbar }]}>
                        {layer.name}
                      </Text>
                      <Text style={[styles.meta, { color: c.onToolbarMuted }]}>
                        {Math.round(layer.opacity * 100)}% · {layer.strokes.length} strokes
                        {layer.image ? ' · image' : ''}
                      </Text>
                    </Pressable>
                    <RowAction
                      icon={layer.locked ? Lock : LockOpen}
                      label={layer.locked ? 'Unlock layer' : 'Lock layer'}
                      onPress={() =>
                        onChange(
                          patchLayer(art, layer.id, l => ({ ...l, locked: !l.locked })),
                          true,
                        )
                      }
                    />
                  </View>
                  {active ? (
                    <>
                      <View style={styles.sliderWrap}>
                        <ToolSlider
                          label="Opacity"
                          value={layer.opacity}
                          min={0}
                          max={1}
                          text={`${Math.round(layer.opacity * 100)}%`}
                          onChange={value =>
                            onChange(
                              patchLayer(art, layer.id, l => ({ ...l, opacity: Math.round(value * 100) / 100 })),
                              false,
                            )
                          }
                          onEnd={onCommit}
                        />
                      </View>
                      <View style={styles.actions}>
                        <RowAction
                          icon={ArrowUp}
                          label="Move layer up"
                          onPress={() => move(index, 1)}
                          disabled={index >= art.layers.length - 1}
                        />
                        <RowAction
                          icon={ArrowDown}
                          label="Move layer down"
                          onPress={() => move(index, -1)}
                          disabled={index === 0}
                        />
                        <RowAction
                          icon={Merge}
                          label="Merge down"
                          onPress={() => mergeDown(index)}
                          disabled={index === 0}
                        />
                        <RowAction icon={Pencil} label="Rename layer" onPress={() => setRenameId(layer.id)} />
                        <RowAction icon={Trash} label="Delete layer" onPress={() => remove(layer)} />
                      </View>
                    </>
                  ) : null}
                </View>
              );
            })}
        </ScrollView>
      </Animated.View>
      <PromptDialog
        visible={!!renaming}
        onClose={() => setRenameId(null)}
        title="Rename layer"
        initialValue={renaming?.name ?? ''}
        maxLength={30}
        onSubmit={value => {
          if (renaming && value.trim()) {
            onChange(
              patchLayer(art, renaming.id, l => ({ ...l, name: value.trim() })),
              true,
            );
          }
          setRenameId(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { position: 'absolute', top: 0, bottom: 0, width: 264, padding: space.sm },
  left: { left: 0 },
  right: { right: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingBottom: space.sm },
  title: { ...font.overline, flex: 1, paddingLeft: space.xs },
  list: { gap: space.sm, paddingBottom: space.lg },
  row: { borderRadius: radius.md, borderWidth: 2, padding: space.xs },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  name: { flex: 1, minHeight: 40, justifyContent: 'center' },
  nameText: { ...font.label },
  meta: { ...font.caption },
  sliderWrap: { flexDirection: 'row', paddingHorizontal: space.xs },
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
  action: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  disabled: { opacity: 0.35 },
});
