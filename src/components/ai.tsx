import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { font, radius, space, useTheme } from '../theme';
import { RefreshCw, Sparkles } from './icons';
import { Button } from './ui';

export function AiNote({ text, style }: { text: string; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[styles.note, { backgroundColor: c.aiSoft, borderColor: c.ai }, style]}>
      <Sparkles size={14} color={c.ai} />
      <Text style={[font.caption, styles.noteText, { color: c.ai }]}>{text}</Text>
    </View>
  );
}

export function AiPanel({
  title,
  children,
  style,
}: {
  title: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.panel, { backgroundColor: c.aiSoft, borderColor: c.ai }, style]}>
      <View style={styles.panelHeader}>
        <Sparkles size={16} color={c.ai} />
        <Text style={[font.label, styles.flex, { color: c.ai }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export function AiLoading({
  label,
  onCancel,
  style,
}: {
  label: string;
  onCancel: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.status, { backgroundColor: c.aiSoft, borderColor: c.ai }, style]}>
      <ActivityIndicator size="small" color={c.ai} />
      <Text style={[font.body, styles.flex, { color: c.text }]}>{label}</Text>
      <Button title="Cancel" variant="secondary" small onPress={onCancel} />
    </View>
  );
}

export function AiErrorBox({
  message,
  onRetry,
  onDismiss,
  action,
  style,
}: {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.error, { backgroundColor: c.dangerSoft, borderColor: c.danger }, style]}>
      <Text style={[font.body, { color: c.text }]}>{message}</Text>
      <View style={styles.actions}>
        {onDismiss && <Button title="Dismiss" variant="ghost" small onPress={onDismiss} />}
        {action && <Button title={action.label} variant="secondary" small onPress={action.onPress} />}
        {onRetry && <Button title="Retry" variant="ai" icon={RefreshCw} small onPress={onRetry} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  noteText: { fontWeight: '600', flexShrink: 1 },
  panel: { borderWidth: 2, borderRadius: radius.md, padding: space.md, gap: space.sm },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    paddingLeft: space.md,
    borderWidth: 2,
    borderRadius: radius.md,
  },
  error: { borderWidth: 2, borderRadius: radius.md, padding: space.md, gap: space.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: space.sm },
});
