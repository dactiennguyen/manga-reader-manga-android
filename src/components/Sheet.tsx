import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
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
  scroll?: boolean;
  maxHeight?: `${number}%` | number;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const [height, setHeight] = useState(600);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => finished && setMounted(false));
    }
  }, [visible, progress]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.backdrop, opacity: progress }]}>
          <Pressable style={styles.fill} onPress={onClose} />
        </Animated.View>
        <View style={styles.fill} pointerEvents="box-none" />
        <Animated.View
          onLayout={e => setHeight(e.nativeEvent.layout.height)}
          style={[
            styles.sheet,
            {
              backgroundColor: c.elevated,
              paddingBottom: insets.bottom + space.md,
              maxHeight,
              transform: [{ translateY }],
            },
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
        </Animated.View>
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
