import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { font, radius, space, useTheme } from '../theme';
import { Button, type ButtonVariant } from './ui';

/** Bottom sheet dạng modal (BottomSheet của app gốc). */
export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  right,
  children,
  scroll = true,
  maxHeight = '85%',
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  /** Bọc nội dung trong ScrollView. Tắt khi bên trong đã có FlatList. */
  scroll?: boolean;
  maxHeight?: `${number}%` | number;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={[styles.fill, { backgroundColor: c.backdrop }]} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: c.elevated, paddingBottom: insets.bottom + space.md, maxHeight },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: c.border }]} />
          {(!!title || right) && (
            <View style={styles.sheetHeader}>
              <View style={styles.fill}>
                {!!title && <Text style={[font.heading, { color: c.text }]}>{title}</Text>}
                {!!subtitle && <Text style={[font.caption, { color: c.muted }]}>{subtitle}</Text>}
              </View>
              {right}
            </View>
          )}
          {scroll ? (
            <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
              {children}
            </ScrollView>
          ) : (
            children
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export type DialogAction = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
};

/** Hộp thoại giữa màn hình với nội dung tuỳ ý. */
export function Dialog({
  visible,
  onClose,
  title,
  message,
  children,
  actions,
  style,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  children?: ReactNode;
  actions?: DialogAction[];
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={[styles.fill, styles.dialogWrap]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.backdrop }]} onPress={onClose} />
        <View style={[styles.dialog, { backgroundColor: c.elevated }, style]}>
          {!!title && <Text style={[font.heading, { color: c.text }]}>{title}</Text>}
          {!!message && <Text style={[font.body, { color: c.textSecondary }]}>{message}</Text>}
          {children}
          {!!actions?.length && (
            <View style={styles.dialogActions}>
              {actions.map(action => (
                <Button
                  key={action.label}
                  title={action.label}
                  onPress={action.onPress}
                  variant={action.variant ?? 'secondary'}
                  disabled={action.disabled}
                  loading={action.loading}
                  small
                />
              ))}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: space.sm,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: space.sm },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    gap: space.sm,
  },
  dialogWrap: { justifyContent: 'center', padding: space.xl },
  dialog: { borderRadius: radius.xl, padding: space.xl, gap: space.md, maxHeight: '90%' },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
});
