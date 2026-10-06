import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Tag } from '../../components/comic';
import { CircleAlert, RefreshCw, Settings, Sparkles } from '../../components/icons';
import { Button } from '../../components/ui';
import { font, space, useTheme } from '../../theme';

export function AiMark({ label = 'AI suggestion' }: { label?: string }) {
  const { c } = useTheme();
  return <Tag label={label} icon={Sparkles} color={c.aiSoft} textColor={c.ai} style={styles.mark} />;
}

export function AiSetupNotice({ onOpenProfile }: { onOpenProfile: () => void }) {
  const { c } = useTheme();
  return (
    <View style={styles.center}>
      <Sparkles size={32} color={c.ai} />
      <Text style={[font.heading, styles.centerText, { color: c.text }]}>AI is not set up yet</Text>
      <Text style={[font.body, styles.centerText, { color: c.textSecondary }]}>
        To get AI suggestions, set the AI server address in Profile first.
      </Text>
      <Button title="Open Profile" icon={Settings} variant="ai" onPress={onOpenProfile} style={styles.centerButton} />
    </View>
  );
}

export function AiBusy({ label, onCancel }: { label: string; onCancel: () => void }) {
  const { c } = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={c.ai} size="large" />
      <Text style={[font.body, styles.centerText, { color: c.textSecondary }]}>{label}</Text>
      <Button title="Cancel" variant="secondary" onPress={onCancel} style={styles.centerButton} />
    </View>
  );
}

export function AiFailure({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { c } = useTheme();
  return (
    <View style={styles.center}>
      <CircleAlert size={32} color={c.danger} />
      <Text style={[font.body, styles.centerText, { color: c.text }]}>{message}</Text>
      <Button title="Retry" icon={RefreshCw} variant="ai" onPress={onRetry} style={styles.centerButton} />
    </View>
  );
}

export function SheetFooter({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  return <View style={[styles.footer, { borderTopColor: c.border }]}>{children}</View>;
}

const styles = StyleSheet.create({
  mark: { alignSelf: 'flex-start' },
  center: { alignItems: 'center', gap: space.md, paddingHorizontal: space.xl, paddingVertical: space.xl },
  centerText: { textAlign: 'center' },
  centerButton: { alignSelf: 'stretch', marginTop: space.sm },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    gap: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
