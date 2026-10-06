import { useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, PermissionsAndroid, Platform, StyleSheet, Text, View } from 'react-native';
import { Camera, CameraType } from 'react-native-camera-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { openInBrowser, useAppNavigation } from '../../app/routes';
import { ArrowLeft, CameraOff, Flashlight, FlashlightOff } from '../../components/icons';
import { EmptyState, Header, IconButton, LoadingView, Screen } from '../../components/ui';
import { ensureScheme, looksLikeUrl } from '../../lib/url';
import { useSettings } from '../../store/useSettings';
import { font, radius, space, useTheme } from '../../theme';
import { buildSearchUrl } from './searchEngines';

type Permission = 'checking' | 'granted' | 'denied';

const ON_CAMERA = '#FFFFFF';
const CAMERA_SHADE = 'rgba(0, 0, 0, 0.55)';
const CAMERA_BG = '#000000';

async function checkCamera(request: boolean): Promise<Permission> {
  if (Platform.OS !== 'android') {
    return 'granted';
  }
  const permission = PermissionsAndroid.PERMISSIONS.CAMERA;
  if (await PermissionsAndroid.check(permission)) {
    return 'granted';
  }
  if (!request) {
    return 'denied';
  }
  const result = await PermissionsAndroid.request(permission, {
    title: 'Cho phép dùng camera',
    message: 'Ứng dụng cần quyền camera để quét mã QR.',
    buttonPositive: 'Cho phép',
    buttonNegative: 'Không',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied';
}

export function QRScannerScreen() {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [permission, setPermission] = useState<Permission>('checking');
  const [torch, setTorch] = useState(false);
  const handled = useRef(false);

  useEffect(() => {
    let cancelled = false;
    checkCamera(true)
      .then(result => !cancelled && setPermission(result))
      .catch(() => !cancelled && setPermission('denied'));
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        checkCamera(false)
          .then(result => !cancelled && result === 'granted' && setPermission('granted'))
          .catch(() => {});
      }
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  const onRead = useCallback(
    (value: string | undefined) => {
      const text = value?.trim();
      if (!text || handled.current) {
        return;
      }
      handled.current = true;
      if (/^https?:\/\//i.test(text) || looksLikeUrl(text)) {
        openInBrowser(navigation, ensureScheme(text));
        return;
      }
      const { searchEngine, safeSearch } = useSettings.getState();
      openInBrowser(navigation, buildSearchUrl(searchEngine, text, safeSearch));
    },
    [navigation],
  );

  if (permission !== 'granted') {
    return (
      <Screen>
        <Header title="Quét mã QR" />
        {permission === 'checking' ? (
          <LoadingView />
        ) : (
          <EmptyState
            icon={CameraOff}
            title="Cần quyền camera để quét mã QR"
            message="Hãy cấp quyền camera cho ứng dụng trong phần cài đặt của máy rồi quay lại."
            action={{ label: 'Mở cài đặt', onPress: () => Linking.openSettings().catch(() => {}) }}
          />
        )}
      </Screen>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: CAMERA_BG }]}>
      {isFocused && (
        <Camera
          style={StyleSheet.absoluteFill}
          cameraType={CameraType.Back}
          scanBarcode
          showFrame
          laserColor={c.accent}
          frameColor={ON_CAMERA}
          scanThrottleDelay={1000}
          torchMode={torch ? 'on' : 'off'}
          onReadCode={event => onRead(event.nativeEvent.codeStringValue)}
        />
      )}
      <View style={[styles.top, { paddingTop: insets.top + space.xs, backgroundColor: CAMERA_SHADE }]}>
        <IconButton icon={ArrowLeft} color={ON_CAMERA} onPress={() => navigation.goBack()} accessibilityLabel="Quay lại" />
        <Text style={[font.heading, styles.flex, { color: ON_CAMERA }]}>Quét mã QR</Text>
        <IconButton
          icon={torch ? FlashlightOff : Flashlight}
          color={ON_CAMERA}
          onPress={() => setTorch(t => !t)}
          accessibilityLabel={torch ? 'Tắt đèn' : 'Bật đèn'}
        />
      </View>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + space.xl }]}>
        <View style={[styles.hint, { backgroundColor: CAMERA_SHADE }]}>
          <Text style={[font.body, { color: ON_CAMERA }]}>Đặt mã vào trong khung</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.xs,
    paddingBottom: space.xs,
  },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  hint: { paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radius.pill },
});
