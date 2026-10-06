import { useEffect, useId, useState, type ReactNode } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

import { fileUri } from '../lib/files';
import { initialOf } from '../model/selectors';
import type { Character, Project } from '../model/types';
import { font, radius, space, useTheme } from '../theme';
import { Dialog, Sheet } from './Sheet';
import type { LucideIcon } from './icons';
import { ListItem } from './ui';

export function Halftone({
  color,
  size = 9,
  dot = 1.4,
  style,
}: {
  color?: string;
  size?: number;
  dot?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse">
            <Circle cx={size / 4} cy={size / 4} r={dot} fill={color ?? c.halftone} />
            <Circle cx={(size * 3) / 4} cy={(size * 3) / 4} r={dot} fill={color ?? c.halftone} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

export function ComicCard({
  children,
  onPress,
  onLongPress,
  style,
  contentStyle,
  color,
  borderColor,
  shadow = 4,
  halftone,
}: {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  color?: string;
  borderColor?: string;
  shadow?: number;
  halftone?: boolean;
}) {
  const { c } = useTheme();
  const edge = borderColor ?? c.ink;
  const body = (pressed: boolean) => (
    <>
      {shadow > 0 && (
        <View
          style={[
            styles.cardShadow,
            { backgroundColor: edge, top: shadow, left: shadow, right: -shadow, bottom: -shadow },
          ]}
        />
      )}
      <View
        style={[
          styles.card,
          { backgroundColor: color ?? c.surface, borderColor: edge },
          pressed && shadow > 0 && { transform: [{ translateX: shadow / 2 }, { translateY: shadow / 2 }] },
          contentStyle,
        ]}
      >
        {halftone && <Halftone />}
        {children}
      </View>
    </>
  );
  const outer = [{ marginRight: shadow, marginBottom: shadow }, style];
  if (!onPress && !onLongPress) {
    return <View style={outer}>{body(false)}</View>;
  }
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={outer}>
      {({ pressed }) => body(pressed)}
    </Pressable>
  );
}

export function SpeechBubble({
  children,
  tail = 'bottom-left',
  color,
  borderColor,
  style,
}: {
  children: ReactNode;
  tail?: 'bottom-left' | 'bottom-right' | 'none';
  color?: string;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const bg = color ?? c.surface;
  const edge = borderColor ?? c.ink;
  return (
    <View style={[styles.bubbleWrap, style]}>
      <View style={[styles.bubble, { backgroundColor: bg, borderColor: edge }]}>
        {typeof children === 'string' ? <Text style={[font.hand, { color: c.text }]}>{children}</Text> : children}
      </View>
      {tail !== 'none' && (
        <View
          style={[
            styles.bubbleTail,
            { backgroundColor: bg, borderColor: edge },
            tail === 'bottom-right' ? styles.bubbleTailRight : styles.bubbleTailLeft,
          ]}
        />
      )}
    </View>
  );
}

export function SectionTitle({
  children,
  right,
  style,
}: {
  children: string;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.sectionTitle, style]}>
      <Text style={[font.overline, styles.flex, { color: c.text }]}>{children}</Text>
      {right}
    </View>
  );
}

export function Cover({
  project,
  width,
  style,
  children,
}: {
  project: Pick<Project, 'title' | 'coverUri'>;
  width: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const { c } = useTheme();
  const height = Math.round(width * 1.5);
  return (
    <View style={[styles.cover, { width, height, borderColor: c.ink, backgroundColor: c.surfaceAlt }, style]}>
      {project.coverUri ? (
        <Image source={{ uri: fileUri(project.coverUri) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <>
          <Halftone />
          <View style={styles.coverTitleWrap}>
            <Text
              numberOfLines={4}
              adjustsFontSizeToFit
              style={[font.display, styles.coverTitle, { color: c.text, fontSize: Math.max(13, width * 0.16) }]}
            >
              {project.title || 'Untitled'}
            </Text>
          </View>
          <View style={[styles.coverStripe, { backgroundColor: c.accent }]} />
        </>
      )}
      {children}
    </View>
  );
}

export function Avatar({
  character,
  size = 44,
  square,
  style,
}: {
  character: Pick<Character, 'name' | 'sheet'> | null | undefined;
  size?: number;
  square?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const uri = character?.sheet.face;
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: square ? radius.md : size / 2,
          borderColor: c.ink,
          backgroundColor: c.surfaceAlt,
        },
        style,
      ]}
    >
      {uri ? (
        <Image source={{ uri: fileUri(uri) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <>
          <Halftone size={7} dot={1.1} />
          <Text style={[font.display, { color: c.text, fontSize: size * 0.42, lineHeight: size * 0.6 }]}>
            {character ? initialOf(character.name) : '?'}
          </Text>
        </>
      )}
    </View>
  );
}

export function ProgressLine({
  value,
  label,
  color,
  style,
}: {
  value: number;
  label?: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const ratio = Math.min(1, Math.max(0, value));
  return (
    <View style={[styles.progressRow, style]}>
      <View style={[styles.progressTrack, { borderColor: c.ink, backgroundColor: c.surface }]}>
        <View style={[styles.progressFill, { width: `${ratio * 100}%`, backgroundColor: color ?? c.accent }]} />
      </View>
      {!!label && <Text style={[font.caption, { color: c.muted }]}>{label}</Text>}
    </View>
  );
}

export type MenuItem = {
  label: string;
  icon?: LucideIcon;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  subtitle?: string;
};

export function MenuSheet({
  visible,
  onClose,
  title,
  subtitle,
  items,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  items: (MenuItem | false | null | undefined)[];
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title} subtitle={subtitle}>
      {items.filter(Boolean).map(item => {
        const entry = item as MenuItem;
        return (
          <ListItem
            key={entry.label}
            title={entry.label}
            subtitle={entry.subtitle}
            icon={entry.icon}
            destructive={entry.destructive}
            disabled={entry.disabled}
            onPress={() => {
              onClose();
              entry.onPress();
            }}
          />
        );
      })}
    </Sheet>
  );
}

export function PromptDialog({
  visible,
  onClose,
  onSubmit,
  title,
  message,
  initialValue = '',
  placeholder,
  confirmText = 'Save',
  maxLength,
  multiline,
  allowEmpty,
  inputProps,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title: string;
  message?: string;
  initialValue?: string;
  placeholder?: string;
  confirmText?: string;
  maxLength?: number;
  multiline?: boolean;
  allowEmpty?: boolean;
  inputProps?: TextInputProps;
}) {
  const { c } = useTheme();
  const [value, setValue] = useState(initialValue);
  useEffect(() => {
    if (visible) {
      setValue(initialValue);
    }
  }, [visible, initialValue]);
  const trimmed = value.trim();
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={title}
      message={message}
      actions={[
        { label: 'Cancel', onPress: onClose, variant: 'ghost' },
        {
          label: confirmText,
          variant: 'primary',
          disabled: !allowEmpty && !trimmed,
          onPress: () => {
            onClose();
            onSubmit(trimmed);
          },
        },
      ]}
    >
      <TextInput
        autoFocus
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        selectionColor={c.accent}
        maxLength={maxLength}
        multiline={multiline}
        {...inputProps}
        style={[
          styles.promptInput,
          { color: c.text, borderColor: c.ink, backgroundColor: c.surface },
          multiline && styles.promptMultiline,
        ]}
      />
      {!!maxLength && (
        <Text style={[font.caption, styles.counter, { color: c.muted }]}>
          {value.length}/{maxLength}
        </Text>
      )}
    </Dialog>
  );
}

export function Tag({
  label,
  color,
  textColor,
  icon: Icon,
  style,
}: {
  label: string;
  color?: string;
  textColor?: string;
  icon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.tag, { backgroundColor: color ?? c.surfaceAlt }, style]}>
      {Icon && <Icon size={12} color={textColor ?? c.textSecondary} />}
      <Text style={[styles.tagText, { color: textColor ?? c.textSecondary }]}>{label}</Text>
    </View>
  );
}

export function Banner({
  text,
  tone = 'warning',
  action,
  icon: Icon,
}: {
  text: string;
  tone?: 'warning' | 'info' | 'danger' | 'success';
  action?: { label: string; onPress: () => void };
  icon?: LucideIcon;
}) {
  const { c } = useTheme();
  const palette = {
    warning: { bg: c.warningSoft, fg: c.warning },
    info: { bg: c.surfaceAlt, fg: c.textSecondary },
    danger: { bg: c.dangerSoft, fg: c.danger },
    success: { bg: c.successSoft, fg: c.success },
  }[tone];
  return (
    <View style={[styles.banner, { backgroundColor: palette.bg }]}>
      {Icon && <Icon size={16} color={palette.fg} />}
      <Text style={[font.caption, styles.flex, { color: c.text }]}>{text}</Text>
      {action && (
        <Pressable onPress={action.onPress} hitSlop={8}>
          <Text style={[font.caption, styles.bannerAction, { color: palette.fg }]}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cardShadow: { position: 'absolute', borderRadius: radius.lg },
  card: { borderRadius: radius.lg, borderWidth: 2, overflow: 'hidden' },
  bubbleWrap: { paddingBottom: 10 },
  bubble: { borderWidth: 2, borderRadius: 18, paddingHorizontal: space.lg, paddingVertical: space.md },
  bubbleTail: {
    position: 'absolute',
    bottom: 3,
    width: 16,
    height: 16,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    transform: [{ rotate: '45deg' }],
  },
  bubbleTailLeft: { left: 28 },
  bubbleTailRight: { right: 28 },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    marginTop: space.lg,
    marginBottom: space.sm,
  },
  cover: { borderWidth: 2, borderRadius: radius.sm, overflow: 'hidden' },
  coverTitleWrap: { flex: 1, justifyContent: 'center', padding: 8 },
  coverTitle: { textAlign: 'center', lineHeight: undefined },
  coverStripe: { height: 6 },
  avatar: { borderWidth: 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  progressTrack: { flex: 1, height: 8, borderRadius: 4, borderWidth: 1.5, overflow: 'hidden' },
  progressFill: { height: '100%' },
  promptInput: {
    minHeight: 46,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    fontSize: 15,
  },
  promptMultiline: { minHeight: 96, textAlignVertical: 'top' },
  counter: { alignSelf: 'flex-end', marginTop: -4 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    height: 22,
    borderRadius: 11,
  },
  tagText: { fontSize: 11, fontWeight: '700' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  bannerAction: { fontWeight: '800' },
});
