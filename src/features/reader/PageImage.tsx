import { useRecyclingState } from '@shopify/flash-list';
import { ImageOff, RotateCw, ShieldCheck } from 'lucide-react-native';
import { memo, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type ImageLoadEvent,
} from 'react-native';

import type { Page } from '../../sources/types';
import { space } from '../../theme';
import { getPageRatio, rememberPageRatio, usePageReload } from './pageImageCache';

/** Tỉ lệ cao/rộng tạm khi chưa biết kích thước ảnh. */
export const PLACEHOLDER_RATIO = 1.4;

type Status = 'loading' | 'loaded' | 'error';

type Props = {
  page: Page;
  index: number;
  width: number;
  /** Khung cố định (chế độ lật, ảnh vừa khung). Bỏ trống: cao theo tỉ lệ ảnh (chế độ dọc). */
  height?: number;
  highRes: boolean;
  onPress: (event: GestureResponderEvent) => void;
  onLongPress?: (index: number) => void;
  /** Mở màn xác minh chống bot của trang chương (ảnh lỗi có thể do Cloudflare). */
  onVerify?: () => void;
};

/**
 * Một trang truyện. State dùng useRecyclingState vì FlashList tái sử dụng
 * component cho trang khác — đổi uri là state tự về ban đầu.
 */
export const PageImage = memo(function PageImageView({
  page,
  index,
  width,
  height,
  highRes,
  onPress,
  onLongPress,
  onVerify,
}: Props) {
  const { uri, headers } = page;
  const [ratio, setRatio] = useRecyclingState<number | undefined>(() => getPageRatio(uri), [uri]);
  const [status, setStatus] = useRecyclingState<Status>('loading', [uri]);
  const [attempt, setAttempt] = useRecyclingState(0, [uri]);

  const reload = useCallback(() => {
    setStatus('loading', true);
    setAttempt(value => value + 1, true);
  }, [setStatus, setAttempt]);
  const onReloadRequest = useCallback(
    (failedOnly: boolean) => {
      if (!failedOnly || status === 'error') {
        reload();
      }
    },
    [reload, status],
  );
  usePageReload(uri, onReloadRequest);

  const source = useMemo(() => ({ uri, headers }), [uri, headers]);

  const onLoad = useCallback(
    (event: ImageLoadEvent) => {
      const { width: w, height: h } = event.nativeEvent.source;
      if (w > 0 && h > 0) {
        rememberPageRatio(uri, h / w);
        setRatio(h / w);
      }
      setStatus('loaded', true);
    },
    [uri, setRatio, setStatus],
  );
  const onError = useCallback(() => setStatus('error', true), [setStatus]);
  const handleLongPress = useMemo(
    () => (onLongPress ? () => onLongPress(index) : undefined),
    [onLongPress, index],
  );

  const boxHeight = height ?? Math.round(width * (ratio ?? PLACEHOLDER_RATIO));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={handleLongPress}
      delayLongPress={450}
      style={[styles.box, { width, height: boxHeight }]}
    >
      {status !== 'error' && (
        <Image
          key={attempt}
          source={source}
          style={styles.image}
          resizeMode="contain"
          resizeMethod={highRes ? 'scale' : 'resize'}
          onLoad={onLoad}
          onError={onError}
        />
      )}
      {status === 'loading' && (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator color="#fff" />
          <Text style={styles.number}>{index + 1}</Text>
        </View>
      )}
      {status === 'error' && (
        <View style={styles.overlay}>
          <ImageOff size={28} color="#fff" />
          <Text style={styles.errorTitle}>Không tải được ảnh</Text>
          <Text style={styles.number}>Trang {index + 1}</Text>
          <View style={styles.actions}>
            <Pressable onPress={reload} hitSlop={8} style={styles.action} accessibilityRole="button">
              <RotateCw size={16} color="#fff" />
              <Text style={styles.actionText}>Thử lại</Text>
            </Pressable>
            {onVerify && (
              <Pressable onPress={onVerify} hitSlop={8} style={styles.action} accessibilityRole="button">
                <ShieldCheck size={16} color="#fff" />
                <Text style={styles.actionText}>Xác minh</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </Pressable>
  );
});

const fill = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

const styles = StyleSheet.create({
  box: { backgroundColor: '#000', alignSelf: 'center' },
  image: fill,
  overlay: {
    ...fill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    padding: space.lg,
  },
  number: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  errorTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm, marginTop: space.xs },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  actionText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
