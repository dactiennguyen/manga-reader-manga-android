import { readFile, unlink } from '@dr.pogodin/react-native-fs';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';

import { openInBrowser, useAppNavigation, type RootStackParamList } from '../../app/routes';
import { ErrorView } from '../../components/ErrorView';
import { FileX, Globe, Share2, Trash2 } from '../../components/icons';
import { EmptyState, Header, IconButton, LoadingView, Screen, confirm, toast } from '../../components/ui';
import { WebView } from '../../components/WebView';
import { formatDate, formatTime } from '../../lib/time';
import { useBrowser } from '../../store/useBrowser';
import { useTheme } from '../../theme';

const ORIGIN_ALL = ['*'];

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Xem trang web đã lưu offline ("Save page as"). */
export function SavedPageScreen() {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'SavedPage'>>();
  const page = useBrowser(s => s.savedPages.find(p => p.id === params.id));
  const [content, setContent] = useState<{ html: string } | { error: unknown } | null>(null);
  const file = page?.file;

  useEffect(() => {
    if (!file) {
      return;
    }
    let cancelled = false;
    readFile(file, 'utf8')
      .then(html => !cancelled && setContent({ html }))
      .catch(() => !cancelled && setContent({ error: new Error('Không đọc được file trang đã lưu. File có thể đã bị xoá.') }));
    return () => {
      cancelled = true;
    };
  }, [file]);

  const source = useMemo(
    () => (content && 'html' in content && page ? { html: content.html, baseUrl: page.url } : undefined),
    [content, page],
  );

  if (!page) {
    return (
      <Screen>
        <Header title="Trang đã lưu" />
        <EmptyState icon={FileX} title="Không tìm thấy trang đã lưu" message="Trang này có thể đã bị xoá." />
      </Screen>
    );
  }

  const remove = async () => {
    const ok = await confirm('Xoá trang đã lưu?', page.title, { confirmText: 'Xoá', destructive: true });
    if (!ok) {
      return;
    }
    await unlink(page.file).catch(() => {});
    useBrowser.getState().removeSavedPages([page.id]);
    toast('Đã xoá trang đã lưu');
    navigation.goBack();
  };

  // Bản lưu tĩnh: bấm link thì mở bản trực tuyến trong trình duyệt.
  const onShouldStart = (request: ShouldStartLoadRequest) => {
    const { url } = request;
    if (!request.isTopFrame || url === page.url || /^(about|data|blob):/i.test(url)) {
      return true;
    }
    if (/^https?:/i.test(url)) {
      openInBrowser(navigation, url);
    }
    return false;
  };

  return (
    <Screen>
      <Header
        title={page.title}
        subtitle={`Đã lưu ${formatTime(page.savedAt)} ${formatDate(page.savedAt)} · ${formatSize(page.size)}`}
        right={
          <>
            <IconButton
              icon={Globe}
              onPress={() => openInBrowser(navigation, page.url)}
              accessibilityLabel="Mở bản trực tuyến"
            />
            <IconButton
              icon={Share2}
              onPress={() => Share.share({ message: page.url, title: page.title }).catch(() => {})}
              accessibilityLabel="Chia sẻ link"
            />
            <IconButton icon={Trash2} onPress={remove} accessibilityLabel="Xoá" />
          </>
        }
      />
      <View style={[styles.flex, { backgroundColor: c.bg }]}>
        {!content && <LoadingView />}
        {content && 'error' in content && <ErrorView error={content.error} url={page.url} />}
        {source && (
          <WebView
            source={source}
            originWhitelist={ORIGIN_ALL}
            // Script trong bản lưu có thể chạy lại và phá bố cục đã chụp — chỉ hiển thị tĩnh.
            javaScriptEnabled={false}
            onShouldStartLoadWithRequest={onShouldStart}
            setSupportMultipleWindows={false}
            mixedContentMode="compatibility"
            setDisplayZoomControls={false}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
