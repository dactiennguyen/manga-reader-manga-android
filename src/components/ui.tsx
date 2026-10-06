import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Check, ChevronRight, Search, X } from './icons';
import { useEffect, useRef, useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import {
  ActivityIndicator,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  ToastAndroid,
  Alert,
  View,
  useWindowDimensions,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardHeight } from '../lib/keyboard';
import { font, radius, space, useTheme } from '../theme';
import type { LucideIcon } from './icons';

export function toast(message: string): void {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert(message);
  }
}

export function confirm(
  title: string,
  message?: string,
  options: { confirmText?: string; destructive?: boolean; cancelText?: string } = {},
): Promise<boolean> {
  return new Promise(resolve => {
    Alert.alert(
      title,
      message,
      [
        { text: options.cancelText ?? 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        {
          text: options.confirmText ?? 'OK',
          style: options.destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export function Screen({
  children,
  style,
  edges = ['top', 'bottom'],
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom')[];
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const { height: windowHeight } = useWindowDimensions();
  const root = useRef<ComponentRef<typeof View>>(null);
  const [overlap, setOverlap] = useState(0);
  useEffect(() => {
    if (keyboard <= 0) {
      setOverlap(0);
      return;
    }
    root.current?.measureInWindow((_x, y, _width, height) => {
      const covered = y + height - (windowHeight - keyboard);
      setOverlap(covered > 0 ? covered + insets.bottom : 0);
    });
  }, [keyboard, windowHeight, insets.bottom]);
  const bottom = overlap > 0 ? overlap : edges.includes('bottom') ? insets.bottom : 0;
  return (
    <View ref={root} collapsable={false} style={[styles.flex, { backgroundColor: c.bg, paddingBottom: bottom }, style]}>
      {edges.includes('top') && <View style={{ height: insets.top, backgroundColor: c.appBar }} />}
      {children}
    </View>
  );
}

export function Header({
  title,
  subtitle,
  onBack,
  hideBack,
  right,
  children,
}: {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  hideBack?: boolean;
  right?: ReactNode;
  children?: ReactNode;
}) {
  const { c } = useTheme();
  const navigation = useNavigation();
  return (
    <View style={[styles.header, { backgroundColor: c.appBar }]}>
      {!hideBack && (
        <IconButton
          icon={ArrowLeft}
          color={c.onAppBar}
          onPress={onBack ?? (() => navigation.goBack())}
          accessibilityLabel="Back"
        />
      )}
      <View style={[styles.flex, styles.headerTitle, hideBack && { paddingLeft: space.md }]}>
        {children ?? (
          <>
            <Text numberOfLines={1} style={[font.appBarTitle, { color: c.onAppBar }]}>
              {title}
            </Text>
            {!!subtitle && (
              <Text numberOfLines={1} style={[font.caption, styles.headerSubtitle, { color: c.onAppBar }]}>
                {subtitle}
              </Text>
            )}
          </>
        )}
      </View>
      {right && <View style={styles.row}>{right}</View>}
    </View>
  );
}

export function IconButton({
  icon: Icon,
  onPress,
  onLongPress,
  size = 22,
  color,
  badge,
  disabled,
  active,
  accessibilityLabel,
  style,
}: {
  icon: LucideIcon;
  onPress?: () => void;
  onLongPress?: () => void;
  size?: number;
  color?: string;
  badge?: string | number;
  disabled?: boolean;
  active?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={{ color: c.border, borderless: true, radius: 22 }}
      style={({ pressed }) => [
        styles.iconButton,
        active && { backgroundColor: c.accentSoft },
        { opacity: disabled ? 0.35 : pressed && Platform.OS !== 'android' ? 0.5 : 1 },
        style,
      ]}
    >
      <Icon size={size} color={color ?? (active ? c.accent : c.text)} strokeWidth={2} />
      {badge !== undefined && badge !== '' && badge !== 0 && (
        <View style={[styles.iconBadge, { backgroundColor: c.accent }]}>
          <Text style={[styles.iconBadgeText, { color: c.onAccent }]}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'ink';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon: Icon,
  loading,
  disabled,
  small,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const palette = {
    primary: { bg: c.accent, fg: c.onAccent, border: c.ink },
    secondary: { bg: c.surface, fg: c.text, border: c.ink },
    ghost: { bg: 'transparent', fg: c.text, border: c.border },
    danger: { bg: c.dangerSoft, fg: c.danger, border: c.danger },
    ink: { bg: c.ink, fg: c.onInk, border: c.ink },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        Icon && <Icon size={small ? 16 : 18} color={palette.fg} />
      )}
      <Text style={[small ? font.caption : font.label, styles.bold, { color: palette.fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Fab({
  icon: Icon,
  label,
  onPress,
  style,
}: {
  icon: LucideIcon;
  label?: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.fab,
        { backgroundColor: c.accent, borderColor: c.ink, bottom: insets.bottom + 20, opacity: pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <Icon size={22} color={c.onAccent} />
      {!!label && <Text style={[font.label, { color: c.onAccent }]}>{label}</Text>}
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  onLongPress,
  icon: Icon,
  count,
  style,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  icon?: LucideIcon;
  count?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const fg = selected ? c.onPrimaryContainer : c.textSecondary;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.chip,
        selected
          ? { backgroundColor: c.primaryContainer, borderColor: c.primaryContainer }
          : { borderColor: c.border, backgroundColor: c.surface },
        { opacity: pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {selected && !Icon ? <Check size={14} color={fg} strokeWidth={3} /> : Icon && <Icon size={14} color={fg} />}
      <Text style={[styles.chipLabel, { color: fg }]}>{label}</Text>
      {count !== undefined && <Text style={[font.caption, { color: c.muted }]}>{count}</Text>}
    </Pressable>
  );
}

export function ChipRow({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chipRow, style]}>
      {children}
    </ScrollView>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.segmented, { borderColor: c.ink, backgroundColor: c.surface }, disabled && styles.disabled]}>
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              index > 0 && [styles.segmentDivider, { borderLeftColor: c.ink }],
              active && { backgroundColor: c.primaryContainer },
            ]}
          >
            {active && <Check size={14} color={c.onPrimaryContainer} strokeWidth={3} />}
            <Text
              numberOfLines={1}
              style={[font.caption, styles.bold, { color: active ? c.onPrimaryContainer : c.textSecondary }]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function TabBar<T extends string>({
  tabs,
  value,
  onChange,
  right,
  stretch,
}: {
  tabs: readonly { key: T; label: string; badge?: number }[];
  value: T;
  onChange: (key: T) => void;
  right?: ReactNode;
  stretch?: boolean;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.tabBar, { backgroundColor: c.bg, borderBottomColor: c.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.flex}
        contentContainerStyle={[styles.tabScroll, stretch && styles.flexGrow]}
      >
        {tabs.map(tab => {
          const active = tab.key === value;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onChange(tab.key)}
              android_ripple={{ color: c.border }}
              style={[styles.tab, stretch && styles.flex]}
            >
              <View style={styles.row}>
                <Text style={[styles.tabLabel, { color: active ? c.accent : c.textSecondary }]}>{tab.label}</Text>
                {!!tab.badge && <Badge text={String(tab.badge)} />}
              </View>
              <View style={[styles.tabIndicator, active && { backgroundColor: c.accent }]} />
            </Pressable>
          );
        })}
      </ScrollView>
      {right && <View style={styles.tabRight}>{right}</View>}
    </View>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}) {
  const { c } = useTheme();
  return (
    <Pressable onPress={() => onChange(!checked)} style={styles.checkboxRow} hitSlop={6}>
      <View
        style={[
          styles.checkbox,
          { borderColor: checked ? c.accent : c.muted },
          checked && { backgroundColor: c.accent },
        ]}
      >
        {checked && <Check size={14} color={c.onAccent} strokeWidth={3} />}
      </View>
      {!!label && <Text style={[font.body, styles.flex, { color: c.text }]}>{label}</Text>}
    </Pressable>
  );
}

export function Radio({
  selected,
  onPress,
  label,
  description,
}: {
  selected: boolean;
  onPress: () => void;
  label: string;
  description?: string;
}) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.radioRow}>
      <View style={[styles.radio, { borderColor: selected ? c.accent : c.muted }]}>
        {selected && <View style={[styles.radioDot, { backgroundColor: c.accent }]} />}
      </View>
      <View style={styles.flex}>
        <Text style={[font.body, { color: c.text }]}>{label}</Text>
        {!!description && <Text style={[font.caption, { color: c.muted }]}>{description}</Text>}
      </View>
    </Pressable>
  );
}

export function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (value: number) => string;
}) {
  const { c } = useTheme();
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => onChange(clamp(value - step))}
        disabled={value <= min}
        style={[styles.stepButton, { borderColor: c.border }, value <= min && styles.dimmed]}
      >
        <Text style={[styles.stepGlyph, { color: c.text }]}>−</Text>
      </Pressable>
      <Text style={[font.label, styles.stepValue, { color: c.text }]}>{format ? format(value) : value}</Text>
      <Pressable
        onPress={() => onChange(clamp(value + step))}
        disabled={value >= max}
        style={[styles.stepButton, { borderColor: c.border }, value >= max && styles.dimmed]}
      >
        <Text style={[styles.stepGlyph, { color: c.text }]}>+</Text>
      </Pressable>
    </View>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  onComplete,
  disabled,
  style,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange?: (value: number) => void;
  onComplete?: (value: number) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const [width, setWidth] = useState(1);
  const [dragValue, setDragValue] = useState<number | null>(null);
  const ref = useRef({ width, min, max, step, onChange, onComplete, startX: 0 });
  ref.current = { ...ref.current, width, min, max, step, onChange, onComplete };

  const valueAt = (x: number) => {
    const r = ref.current;
    const ratio = Math.min(1, Math.max(0, x / r.width));
    const raw = r.min + ratio * (r.max - r.min);
    return Math.min(r.max, Math.max(r.min, Math.round(raw / r.step) * r.step));
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: event => {
        ref.current.startX = event.nativeEvent.locationX;
        const v = valueAt(ref.current.startX);
        setDragValue(v);
        ref.current.onChange?.(v);
      },
      onPanResponderMove: (_, gesture) => {
        const v = valueAt(ref.current.startX + gesture.dx);
        setDragValue(v);
        ref.current.onChange?.(v);
      },
      onPanResponderRelease: (_, gesture) => {
        const v = valueAt(ref.current.startX + gesture.dx);
        setDragValue(null);
        ref.current.onComplete?.(v);
      },
      onPanResponderTerminate: () => setDragValue(null),
    }),
  ).current;

  const shown = dragValue ?? value;
  const ratio = max > min ? (shown - min) / (max - min) : 0;
  return (
    <View
      style={[styles.slider, disabled && styles.disabled, style]}
      onLayout={e => setWidth(Math.max(1, e.nativeEvent.layout.width))}
      pointerEvents={disabled ? 'none' : 'auto'}
      {...responder.panHandlers}
    >
      <View pointerEvents="none" style={[styles.sliderTrack, { backgroundColor: c.border }]}>
        <View style={[styles.sliderFill, { width: `${ratio * 100}%`, backgroundColor: c.accent }]} />
      </View>
      <View
        pointerEvents="none"
        style={[styles.sliderThumb, { left: ratio * width - 10, backgroundColor: c.accent, borderColor: c.surface }]}
      />
    </View>
  );
}

export function Section({
  title,
  footer,
  children,
  style,
}: {
  title?: string;
  footer?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.section, style]}>
      {!!title && <Text style={[font.overline, styles.sectionTitle, { color: c.muted }]}>{title}</Text>}
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>{children}</View>
      {!!footer && <Text style={[font.caption, styles.sectionFooter, { color: c.muted }]}>{footer}</Text>}
    </View>
  );
}

export function ListItem({
  title,
  subtitle,
  icon: Icon,
  iconColor,
  left,
  right,
  onPress,
  onLongPress,
  destructive,
  chevron,
  selected,
  titleLines = 1,
  disabled,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  left?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  destructive?: boolean;
  chevron?: boolean;
  selected?: boolean;
  titleLines?: number;
  disabled?: boolean;
}) {
  const { c } = useTheme();
  const color = destructive ? c.danger : c.text;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled || (!onPress && !onLongPress)}
      android_ripple={{ color: c.border }}
      style={({ pressed }) => [
        styles.listItem,
        selected && { backgroundColor: c.accentSoft },
        { opacity: disabled ? 0.45 : pressed && Platform.OS !== 'android' ? 0.6 : 1 },
      ]}
    >
      {left ?? (Icon && <Icon size={20} color={iconColor ?? (destructive ? c.danger : c.muted)} />)}
      <View style={styles.flex}>
        <Text numberOfLines={titleLines} style={[font.body, { color }]}>
          {title}
        </Text>
        {!!subtitle && (
          <Text numberOfLines={2} style={[font.caption, { color: c.muted }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
      {chevron && <ChevronRight size={18} color={c.muted} />}
    </Pressable>
  );
}

export function SwitchRow({
  title,
  subtitle,
  value,
  onValueChange,
  icon,
  disabled,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  icon?: LucideIcon;
  disabled?: boolean;
}) {
  const { c } = useTheme();
  return (
    <ListItem
      title={title}
      subtitle={subtitle}
      icon={icon}
      titleLines={2}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      right={
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ true: c.accent, false: c.border }}
          thumbColor={Platform.OS === 'android' ? c.surface : undefined}
        />
      }
    />
  );
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const { c } = useTheme();
  const pct = `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` as const;
  return (
    <View style={[styles.progressTrack, { backgroundColor: c.surfaceAlt }]}>
      <View style={[styles.progressFill, { width: pct, backgroundColor: color ?? c.accent }]} />
    </View>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const { c } = useTheme();
  return <View style={[styles.divider, { backgroundColor: c.border, marginLeft: inset }]} />;
}

export function Badge({ text, color, style }: { text: string; color?: string; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: color ?? c.accent }, style]}>
      <Text style={[styles.badgeText, !color && { color: c.onAccent }]}>{text}</Text>
    </View>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
  style,
}: {
  icon?: LucideIcon;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void; icon?: LucideIcon };
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.empty, style]}>
      {Icon && (
        <View style={[styles.emptyIcon, { backgroundColor: c.surface, borderColor: c.ink }]}>
          <Icon size={30} color={c.text} />
        </View>
      )}
      <Text style={[font.heading, styles.center, { color: c.text }]}>{title}</Text>
      {!!message && <Text style={[font.body, styles.center, { color: c.muted }]}>{message}</Text>}
      {action && <Button title={action.label} icon={action.icon} onPress={action.onPress} style={styles.emptyAction} />}
    </View>
  );
}

export function LoadingView({ label, style }: { label?: string; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[styles.empty, style]}>
      <ActivityIndicator color={c.accent} size="large" />
      {!!label && <Text style={[font.body, { color: c.muted }]}>{label}</Text>}
    </View>
  );
}

type TextFieldProps = TextInputProps & {
  ref?: Ref<ComponentRef<typeof TextInput>>;
  icon?: LucideIcon;
  onClear?: () => void;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

export function TextField({ ref, icon: Icon, onClear, style, inputStyle, ...props }: TextFieldProps) {
  const { c } = useTheme();
  return (
    <View style={[styles.field, { backgroundColor: c.surface, borderColor: c.border }, style]}>
      {Icon && <Icon size={18} color={c.muted} />}
      <TextInput
        ref={ref}
        placeholderTextColor={c.muted}
        selectionColor={c.accent}
        {...props}
        style={[styles.fieldInput, { color: c.text }, inputStyle]}
      />
      {onClear && !!props.value && (
        <Pressable onPress={onClear} hitSlop={8}>
          <X size={18} color={c.muted} />
        </Pressable>
      )}
    </View>
  );
}

export function SearchField(props: Omit<TextFieldProps, 'icon'>) {
  return <TextField icon={Search} returnKeyType="search" autoCorrect={false} autoCapitalize="none" {...props} />;
}

export function FieldLabel({ children }: { children: string }) {
  const { c } = useTheme();
  return <Text style={[font.label, styles.fieldLabel, { color: c.textSecondary }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  bold: { fontWeight: '700' },
  center: { textAlign: 'center' },
  disabled: { opacity: 0.4 },
  dimmed: { opacity: 0.4 },
  flexGrow: { flexGrow: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: space.xs,
    gap: space.xs,
  },
  headerTitle: { paddingLeft: space.sm },
  headerSubtitle: { opacity: 0.7 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadge: {
    position: 'absolute',
    top: 6,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeText: { fontSize: 10, fontWeight: '800' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: 46,
    paddingHorizontal: space.xl,
    borderRadius: radius.md,
    borderWidth: 2,
  },
  buttonSmall: { minHeight: 34, paddingHorizontal: space.lg, gap: 6 },
  fab: {
    position: 'absolute',
    right: 16,
    minWidth: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    elevation: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1.5,
  },
  chipLabel: { fontSize: 13, fontWeight: '500' },
  chipRow: { gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
  segmented: { flexDirection: 'row', borderRadius: radius.md, borderWidth: 2, overflow: 'hidden' },
  segment: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  segmentDivider: { borderLeftWidth: 2 },
  tabBar: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  tabScroll: { paddingHorizontal: space.xs },
  tab: { alignItems: 'center', paddingTop: 14, paddingHorizontal: 14 },
  tabLabel: { fontSize: 15, fontWeight: '500' },
  tabIndicator: { height: 3, alignSelf: 'stretch', marginTop: 11, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  tabRight: { flexDirection: 'row', alignItems: 'center', paddingRight: space.xs },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 40 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48, paddingHorizontal: space.lg },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 11, height: 11, borderRadius: 6 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepButton: {
    width: 36,
    height: 34,
    borderRadius: radius.sm + 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepGlyph: { fontSize: 18, fontWeight: '600' },
  stepValue: { minWidth: 44, textAlign: 'center' },
  slider: { height: 36, justifyContent: 'center' },
  sliderTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  sliderFill: { height: 4 },
  sliderThumb: { position: 'absolute', width: 20, height: 20, borderRadius: 10, borderWidth: 3 },
  section: { gap: space.sm },
  sectionTitle: { paddingHorizontal: space.lg },
  sectionFooter: { paddingHorizontal: space.lg },
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden', marginHorizontal: space.lg },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md + 2,
    minHeight: 54,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  divider: { height: StyleSheet.hairlineWidth },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  progressFill: { height: 4, borderRadius: 2 },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAction: { marginTop: space.sm },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: space.md,
  },
  fieldInput: { flex: 1, fontSize: 15, paddingVertical: 10 },
  fieldLabel: { marginBottom: 6, marginTop: space.md },
});
