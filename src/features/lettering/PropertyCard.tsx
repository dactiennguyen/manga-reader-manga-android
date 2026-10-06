import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Bold, Minus, PenLine, Plus, Trash2, User } from '../../components/icons';
import { Chip, IconButton, Segmented, Slider } from '../../components/ui';
import { FONT_LABEL } from '../../engine/fonts';
import { SFX_STYLES } from '../../engine/lettering';
import { hasTranslation, translationOf } from '../../engine/translation';
import { BUBBLE_TYPE_LABEL, EFFECT_LABEL } from '../../model/constants';
import type { Bubble, BubbleFont, BubbleType, Effect, EffectType } from '../../model/types';
import { font, radius, space, useTheme } from '../../theme';

const SPEECH_TYPES: BubbleType[] = ['speak', 'think', 'shout', 'whisper', 'machine'];
const FONTS = Object.keys(FONT_LABEL) as BubbleFont[];
const EFFECT_TYPES = Object.keys(EFFECT_LABEL) as EffectType[];
const NARRATION_STYLES: { value: NonNullable<Bubble['narrationStyle']>; label: string }[] = [
  { value: 'box', label: 'Border' },
  { value: 'inverse', label: 'Black' },
  { value: 'plain', label: 'No border' },
];
const OUTLINE_COLORS: { value: NonNullable<Bubble['outlineColor']>; label: string }[] = [
  { value: 'white', label: 'White outline' },
  { value: 'black', label: 'Black outline' },
];

function Row({ label, children }: { label?: string; children: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={styles.row}>
      {label ? <Text style={[styles.rowLabel, { color: c.textSecondary }]}>{label}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowContent}>
        {children}
      </ScrollView>
    </View>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  text,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  text: string;
  onChange: (value: number) => void;
}) {
  const { c } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: c.textSecondary }]}>{label}</Text>
      <Slider value={value} min={min} max={max} step={step} onChange={onChange} style={styles.slider} />
      <Text style={[styles.value, { color: c.text }]}>{text}</Text>
    </View>
  );
}

function SizeControl({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const { c } = useTheme();
  return (
    <View style={styles.size}>
      <IconButton icon={Minus} size={18} onPress={() => onChange(value - 2)} accessibilityLabel="Decrease font size" />
      <Text style={[styles.value, { color: c.text }]}>{Math.round(value)}</Text>
      <IconButton icon={Plus} size={18} onPress={() => onChange(value + 2)} accessibilityLabel="Increase font size" />
    </View>
  );
}

export function BubbleCard({
  bubble,
  speaker,
  lang,
  onChange,
  onEdit,
  onDelete,
  onToggleTail,
  onPickSpeaker,
}: {
  bubble: Bubble;
  speaker?: string;
  lang?: string | null;
  onChange: (patch: Partial<Bubble>, tag?: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleTail: () => void;
  onPickSpeaker: () => void;
}) {
  const { c } = useTheme();
  const sfx = bubble.type === 'sfx';
  const narration = bubble.type === 'narration';
  const speech = !sfx && !narration;
  const setSize = (value: number) =>
    onChange({ fontSize: Math.max(sfx ? 24 : 14, Math.min(sfx ? 220 : 72, value)) }, 'size');
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.ink }]}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: c.text }]}>{BUBBLE_TYPE_LABEL[bubble.type]}</Text>
        <SizeControl value={bubble.fontSize} onChange={setSize} />
        {!sfx && (
          <IconButton
            icon={Bold}
            size={18}
            active={bubble.bold}
            onPress={() => onChange({ bold: !bubble.bold })}
            accessibilityLabel="Bold"
          />
        )}
        <IconButton icon={PenLine} size={18} onPress={onEdit} accessibilityLabel="Edit text" />
        <IconButton icon={Trash2} size={18} color={c.danger} onPress={onDelete} accessibilityLabel="Delete" />
      </View>
      {!!lang && (
        <Pressable onPress={onEdit} style={styles.langRow} accessibilityRole="button">
          <View
            style={[
              styles.langDot,
              { borderColor: c.ink, backgroundColor: hasTranslation(bubble, lang) ? c.success : c.warning },
            ]}
          />
          <Text style={[styles.langText, { color: c.textSecondary }]} numberOfLines={1}>
            {hasTranslation(bubble, lang)
              ? `${lang}: ${translationOf(bubble, lang)}`
              : `No ${lang} text yet · showing the original`}
          </Text>
        </Pressable>
      )}
      {speech && (
        <Row label="Style">
          {SPEECH_TYPES.map(type => (
            <Chip
              key={type}
              label={BUBBLE_TYPE_LABEL[type]}
              selected={bubble.type === type}
              onPress={() => onChange({ type, bold: type === 'shout' ? true : bubble.bold })}
            />
          ))}
        </Row>
      )}
      {narration && (
        <Row label="Box">
          {NARRATION_STYLES.map(style => (
            <Chip
              key={style.value}
              label={style.label}
              selected={(bubble.narrationStyle ?? 'box') === style.value}
              onPress={() => onChange({ narrationStyle: style.value })}
            />
          ))}
        </Row>
      )}
      {sfx ? (
        <>
          <Row label="Style">
            {SFX_STYLES.map((style, index) => (
              <Chip
                key={style.label}
                label={style.label}
                selected={(bubble.sfxStyle ?? 0) === index}
                onPress={() => onChange({ sfxStyle: index, skew: style.skew })}
              />
            ))}
          </Row>
          <SliderRow
            label="Rotate"
            value={Math.round(bubble.rotation)}
            min={-180}
            max={180}
            step={1}
            text={`${Math.round(bubble.rotation)}°`}
            onChange={rotation => onChange({ rotation }, 'rotation')}
          />
          <SliderRow
            label="Skew"
            value={Math.round((bubble.skew ?? SFX_STYLES[bubble.sfxStyle ?? 0]?.skew ?? 0) * 100)}
            min={-60}
            max={60}
            step={5}
            text={`${Math.round((bubble.skew ?? SFX_STYLES[bubble.sfxStyle ?? 0]?.skew ?? 0) * 100)}`}
            onChange={value => onChange({ skew: value / 100 }, 'skew')}
          />
          <SliderRow
            label="Outline"
            value={bubble.outline ?? 0}
            min={0}
            max={16}
            step={1}
            text={`${bubble.outline ?? 0}`}
            onChange={outline => onChange({ outline }, 'outline')}
          />
          <View style={styles.row}>
            <Segmented
              options={OUTLINE_COLORS}
              value={bubble.outlineColor ?? 'white'}
              onChange={outlineColor => onChange({ outlineColor })}
            />
          </View>
        </>
      ) : (
        <Row label="Font">
          {FONTS.map(key => (
            <Chip
              key={key}
              label={FONT_LABEL[key]}
              selected={bubble.font === key}
              onPress={() => onChange({ font: key })}
            />
          ))}
        </Row>
      )}
      {speech && (
        <Row>
          <Chip label="Tail" selected={!!bubble.tail} onPress={onToggleTail} />
          <Chip label={speaker ?? 'Speaker'} icon={User} selected={!!speaker} onPress={onPickSpeaker} />
        </Row>
      )}
    </View>
  );
}

export function EffectCard({
  effect,
  panelNumber,
  onChange,
  onDelete,
}: {
  effect: Effect;
  panelNumber: number;
  onChange: (patch: Partial<Effect>, tag?: string) => void;
  onDelete: () => void;
}) {
  const { c } = useTheme();
  const angled = effect.type === 'speed' || effect.type === 'gradient';
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.ink }]}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: c.text }]}>{`Effect · Panel ${panelNumber}`}</Text>
        <IconButton icon={Trash2} size={18} color={c.danger} onPress={onDelete} accessibilityLabel="Delete effect" />
      </View>
      <Row label="Type">
        {EFFECT_TYPES.map(type => (
          <Chip
            key={type}
            label={EFFECT_LABEL[type]}
            selected={effect.type === type}
            onPress={() => onChange({ type })}
          />
        ))}
      </Row>
      <SliderRow
        label="Density"
        value={Math.round(effect.density * 100)}
        min={0}
        max={100}
        step={5}
        text={`${Math.round(effect.density * 100)}%`}
        onChange={value => onChange({ density: value / 100 }, 'density')}
      />
      {angled && (
        <SliderRow
          label="Angle"
          value={Math.round(effect.angle)}
          min={0}
          max={345}
          step={15}
          text={`${Math.round(effect.angle)}°`}
          onChange={angle => onChange({ angle }, 'angle')}
        />
      )}
      <SliderRow
        label="Opacity"
        value={Math.round(effect.opacity * 100)}
        min={10}
        max={100}
        step={5}
        text={`${Math.round(effect.opacity * 100)}%`}
        onChange={value => onChange({ opacity: value / 100 }, 'opacity')}
      />
      {effect.type === 'focus' && (
        <Text style={[styles.hint, { color: c.textSecondary }]}>Drag the dot inside the panel to set the center.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 2, borderRadius: radius.lg, paddingVertical: space.xs, paddingHorizontal: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  title: { ...font.overline, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 40 },
  rowLabel: { ...font.caption, width: 56 },
  rowContent: { gap: space.xs, alignItems: 'center', paddingRight: space.sm },
  slider: { flex: 1 },
  value: { ...font.label, minWidth: 40, textAlign: 'center' },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs },
  langDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  langText: { ...font.caption, flex: 1 },
  size: { flexDirection: 'row', alignItems: 'center' },
  hint: { ...font.caption, paddingVertical: space.xs },
});
