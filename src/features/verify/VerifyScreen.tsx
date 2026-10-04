import { useRoute, type RouteProp } from '@react-navigation/native';
import { Check, RotateCw } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { RootStackParamList } from '../../app/routes';
import { useAppNavigation } from '../../app/routes';
import { Header, IconButton, Screen } from '../../components/ui';
import { WebView, type WebViewMessageEvent, type WebViewRef } from '../../components/WebView';
import { getHost } from '../../lib/url';
import { useBrowser } from '../../store/useBrowser';
import { font, space, useTheme } from '../../theme';

/**
 * Màn xác minh chống bot (Cloudflare…). Request của parser dùng chung cookie
 * với WebView, nên chỉ cần người dùng qua được trang thử thách ở đây; khi
 * trang thật hiện ra thì tự đóng để màn trước thử lại.
 */

// Báo về RN: UA thật (cookie cf_clearance gắn với UA) và trang còn là trang thử thách không.
const PROBE = `
(function () {
  var html = document.documentElement ? document.documentElement.innerHTML.slice(0, 20000) : '';
  var challenge = /cf-browser-verification|cf_chl_opt|challenge-platform|ddos-guard/.test(html)
    || /^(Just a moment|Attention Required)/i.test(document.title || '');
  window.ReactNativeWebView.postMessage(JSON.stringify({
    ua: navigator.userAgent,
    challenge: challenge
  }));
})();
true;
`;

export function VerifyScreen() {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const { url } = useRoute<RouteProp<RootStackParamList, 'Verify'>>().params;
  const webRef = useRef<WebViewRef>(null);
  const [passed, setPassed] = useState(false);
  const [loading, setLoading] = useState(true);
  const setUserAgent = useBrowser(s => s.setUserAgent);

  useEffect(() => {
    if (!passed) {
      return;
    }
    const timer = setTimeout(() => navigation.goBack(), 900);
    return () => clearTimeout(timer);
  }, [passed, navigation]);

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as { ua?: string; challenge?: boolean };
      if (data.ua) {
        setUserAgent(data.ua);
      }
      if (data.challenge === false) {
        setPassed(true);
      }
    } catch {
      // Bỏ qua tin nhắn không phải của script này.
    }
  };

  return (
    <Screen>
      <Header
        title="Xác minh trang"
        subtitle={getHost(url)}
        right={
          <>
            <IconButton icon={RotateCw} onPress={() => webRef.current?.reload()} accessibilityLabel="Tải lại" />
            <IconButton icon={Check} onPress={() => navigation.goBack()} accessibilityLabel="Xong" />
          </>
        }
      />
      <View style={[styles.banner, { backgroundColor: passed ? c.success : c.accentSoft }]}>
        {loading && !passed && <ActivityIndicator size="small" color={c.accent} />}
        <Text style={[font.caption, styles.bannerText, { color: passed ? c.onAccent : c.text }]}>
          {passed
            ? 'Đã xác minh xong, đang quay lại…'
            : 'Hoàn tất bước kiểm tra của trang (nếu có). Màn này sẽ tự đóng khi trang tải xong.'}
        </Text>
      </View>
      <WebView
        ref={webRef}
        source={{ uri: url }}
        style={styles.flex}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        setSupportMultipleWindows={false}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => {
          setLoading(false);
          webRef.current?.injectJavaScript(PROBE);
        }}
        onMessage={onMessage}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  bannerText: { flex: 1 },
});
