import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native';

import { displayUrl } from '../lib/url';
import { space, useTheme } from '../theme';
import { ExternalLink, X } from './icons';
import { Sheet } from './Sheet';
import { IconButton } from './ui';
import { WebView } from './WebView';

export function PreviewSheet({
  url,
  onClose,
  onOpenInTab,
  incognito,
}: {
  url: string | null;
  onClose: () => void;
  onOpenInTab: (url: string) => void;
  incognito?: boolean;
}) {
  const { c } = useTheme();
  const { height } = useWindowDimensions();
  const [shown, setShown] = useState(url);
  const [pageUrl, setPageUrl] = useState(url);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (url) {
      setShown(url);
      setPageUrl(url);
      setTitle('');
      setLoading(true);
    }
  }, [url]);

  const source = url ?? shown;
  const current = pageUrl ?? source;

  return (
    <Sheet
      visible={!!url}
      onClose={onClose}
      title={title || 'Xem trước trang'}
      subtitle={current ? displayUrl(current) : undefined}
      scroll={false}
      maxHeight="92%"
      right={
        <>
          <IconButton
            icon={ExternalLink}
            onPress={() => {
              if (current) {
                onClose();
                onOpenInTab(current);
              }
            }}
            accessibilityLabel="Mở trong tab mới"
          />
          <IconButton icon={X} onPress={onClose} accessibilityLabel="Đóng xem trước" />
        </>
      }
    >
      <View style={[styles.body, { height: height * 0.78, borderTopColor: c.border }]}>
        {!!source && (
          <WebView
            source={{ uri: source }}
            style={styles.web}
            cacheEnabled={!incognito}
            saveFormDataDisabled={incognito}
            sharedCookiesEnabled={!incognito}
            thirdPartyCookiesEnabled
            setSupportMultipleWindows={false}
            onNavigationStateChange={event => {
              if (/^https?:/i.test(event.url)) {
                setPageUrl(event.url);
              }
            }}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={event => {
              setLoading(false);
              setTitle(event.nativeEvent.title || '');
            }}
          />
        )}
        {loading && (
          <View pointerEvents="none" style={styles.loading}>
            <ActivityIndicator color={c.accent} />
          </View>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { borderTopWidth: StyleSheet.hairlineWidth, marginBottom: -space.md },
  web: { flex: 1 },
  loading: { position: 'absolute', top: space.lg, left: 0, right: 0, alignItems: 'center' },
});
