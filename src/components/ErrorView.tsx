import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { openInBrowser, useAppNavigation } from '../app/routes';
import { errorMessage, isChallengeError } from '../lib/http';
import { font, space, useTheme } from '../theme';
import { CloudOff, Globe, RotateCw, ShieldAlert } from './icons';
import { Button } from './ui';

/**
 * Màn lỗi chung. Lỗi Cloudflare/chống bot thì mở màn Verify để người dùng
 * vượt trang thử thách ("Error loading image or page, the website need you
 * to verify that you are not a bot to continue.") — quay lại là tự thử lại.
 */
export function ErrorView({
  error,
  onRetry,
  url,
  style,
}: {
  error: unknown;
  onRetry?: () => void;
  /** URL để mở trên web; mặc định lấy từ lỗi HTTP. */
  url?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const challenge = isChallengeError(error);
  const target = url ?? (challenge ? error.url : undefined);
  const Icon = challenge ? ShieldAlert : CloudOff;
  const verifying = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (verifying.current) {
        verifying.current = false;
        onRetry?.();
      }
    }, [onRetry]),
  );

  const verify = () => {
    if (target) {
      verifying.current = true;
      navigation.push('Verify', { url: target });
    }
  };

  return (
    <View style={[styles.root, style]}>
      <View style={[styles.icon, { backgroundColor: challenge ? c.accentSoft : c.dangerSoft }]}>
        <Icon size={30} color={challenge ? c.accent : c.danger} />
      </View>
      <Text style={[font.heading, styles.center, { color: c.text }]}>
        {challenge ? 'Cần xác minh trên trình duyệt' : 'Không tải được dữ liệu'}
      </Text>
      <Text style={[font.body, styles.center, { color: c.muted }]}>
        {challenge
          ? 'Trang yêu cầu xác minh bạn không phải bot. Bấm "Xác minh", chờ trang tải xong rồi app sẽ tự thử lại.'
          : errorMessage(error)}
      </Text>
      <View style={styles.actions}>
        {!!target &&
          (challenge ? (
            <Button title="Xác minh" icon={ShieldAlert} onPress={verify} />
          ) : (
            <Button
              title="Mở trang gốc"
              icon={Globe}
              variant="secondary"
              onPress={() => openInBrowser(navigation, target)}
            />
          ))}
        {onRetry && (
          <Button title="Thử lại" icon={RotateCw} variant={challenge ? 'secondary' : 'primary'} onPress={onRetry} />
        )}
      </View>
    </View>
  );
}

/** Mở màn xác minh từ chỗ khác (footer phân trang, reader…). */
export function useVerify(): (url: string) => void {
  const navigation = useAppNavigation();
  return useCallback((url: string) => navigation.push('Verify', { url }), [navigation]);
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md },
  icon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm, marginTop: space.sm },
});
