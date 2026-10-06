import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { Sheet } from '../../components/Sheet';
import { Chip, ChipRow } from '../../components/ui';
import { templatePreview, templatesFor, type LayoutTemplate, type Size, type TemplateKind } from '../../engine/layout';
import type { ProjectFormat } from '../../model/types';
import { font, space, useTheme } from '../../theme';

const KIND_LABEL: Record<TemplateKind, string> = {
  grid: 'Even grid',
  diagonal: 'Diagonal',
  bleed: 'Bleed',
  koma: '4-koma',
  strip: 'Strip',
};

function TemplateTile({
  template,
  width,
  ratio,
  rtl,
  onPress,
}: {
  template: LayoutTemplate;
  width: number;
  ratio: number;
  rtl: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  const size: Size = { w: width, h: width * ratio };
  const shapes = useMemo(
    () => templatePreview(template, { w: width, h: width * ratio }, rtl),
    [template, width, ratio, rtl],
  );
  return (
    <Pressable onPress={onPress} accessibilityLabel={`${template.count}-panel template`} style={styles.tile}>
      <View style={[styles.paper, { width: size.w, height: size.h, borderColor: c.ink }]}>
        <Svg width={size.w} height={size.h}>
          {shapes.map(shape => (
            <Polygon
              key={shape.id}
              points={shape.poly.map(p => `${p.x},${p.y}`).join(' ')}
              fill="#FFFFFF"
              stroke="#16161A"
              strokeWidth={1.5}
            />
          ))}
        </Svg>
      </View>
      <Text style={[font.caption, { color: c.textSecondary }]}>
        {template.count} {template.count === 1 ? 'panel' : 'panels'}
      </Text>
    </Pressable>
  );
}

export function TemplateSheet({
  visible,
  format,
  ratio,
  rtl,
  onClose,
  onPick,
}: {
  visible: boolean;
  format: ProjectFormat;
  ratio: number;
  rtl: boolean;
  onClose: () => void;
  onPick: (template: LayoutTemplate) => void;
}) {
  const { width: screenW } = useWindowDimensions();
  const [count, setCount] = useState(0);
  const [kind, setKind] = useState<TemplateKind | null>(null);
  const all = useMemo(() => templatesFor(format), [format]);
  const counts = useMemo(() => [...new Set(all.map(t => t.count))].sort((a, b) => a - b), [all]);
  const kinds = useMemo(() => [...new Set(all.map(t => t.kind))], [all]);
  const shown = all.filter(t => (!count || t.count === count) && (!kind || t.kind === kind));
  const tileW = Math.floor((Math.min(screenW, 560) - space.lg * 2 - space.md * 2) / 3);
  const tileRatio = Math.min(ratio, 1.6);

  return (
    <Sheet visible={visible} onClose={onClose} title="Panel templates">
      <ChipRow style={styles.chips}>
        <Chip label="All" selected={!count} onPress={() => setCount(0)} />
        {counts.map(n => (
          <Chip key={n} label={`${n}`} selected={count === n} onPress={() => setCount(n)} />
        ))}
      </ChipRow>
      {kinds.length > 1 && (
        <ChipRow style={styles.chips}>
          <Chip label="Any style" selected={!kind} onPress={() => setKind(null)} />
          {kinds.map(k => (
            <Chip key={k} label={KIND_LABEL[k]} selected={kind === k} onPress={() => setKind(k)} />
          ))}
        </ChipRow>
      )}
      <View style={styles.grid}>
        {shown.map(template => (
          <TemplateTile
            key={template.id}
            template={template}
            width={tileW}
            ratio={tileRatio}
            rtl={rtl}
            onPress={() => onPick(template)}
          />
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chips: { paddingHorizontal: space.lg, paddingBottom: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, padding: space.lg },
  tile: { alignItems: 'center', gap: space.xs },
  paper: { borderWidth: 2, backgroundColor: '#FFFFFF' },
});
