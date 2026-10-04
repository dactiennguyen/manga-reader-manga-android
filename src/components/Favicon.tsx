import { memo, useState } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { faviconUrl, getHost } from '../lib/url';
import { useTheme } from '../theme';

type FaviconProps = {
  url: string;
  /** Tên dùng lấy chữ cái khi không có icon; mặc định là host. */
  label?: string;
  size?: number;
  /** Đặt icon trong ô nền (danh sách) thay vì icon trần (thanh địa chỉ, tab). */
  tile?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Favicon của site, tải lỗi thì hiện chữ cái đầu. */
function FaviconView({ url, label, size = 24, tile, style }: FaviconProps) {
  const { c } = useTheme();
  const icon = faviconUrl(url);
  // Lưu URL bị lỗi thay vì cờ boolean để ô tái sử dụng (danh sách) không mang lỗi cũ sang.
  const [failedIcon, setFailedIcon] = useState<string>();
  const letter = (label?.trim() || getHost(url) || '?').charAt(0).toUpperCase();
  const box = { width: size, height: size, borderRadius: Math.round(size * (tile ? 0.28 : 0.25)) };
  const showIcon = !!icon && failedIcon !== icon;

  if (!showIcon) {
    return (
      <View style={[styles.center, box, { backgroundColor: tile ? c.surfaceAlt : c.accentSoft }, style]}>
        <Text style={[styles.letter, { color: c.accent, fontSize: Math.round(size * 0.46) }]}>{letter}</Text>
      </View>
    );
  }
  if (tile) {
    const inner = Math.round(size * 0.58);
    return (
      <View style={[styles.center, box, { backgroundColor: c.surfaceAlt }, style]}>
        <Image
          source={{ uri: icon }}
          style={{ width: inner, height: inner }}
          resizeMode="contain"
          onError={() => setFailedIcon(icon)}
        />
      </View>
    );
  }
  return (
    <View style={[box, styles.clip, style]}>
      <Image
        source={{ uri: icon }}
        style={StyleSheet.absoluteFill}
        resizeMode="contain"
        onError={() => setFailedIcon(icon)}
      />
    </View>
  );
}

export const Favicon = memo(FaviconView);

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  letter: { fontWeight: '800' },
  clip: { overflow: 'hidden' },
});
