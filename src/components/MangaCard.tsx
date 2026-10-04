import { ImageOff } from 'lucide-react-native';
import { memo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { font, radius, space, useTheme } from '../theme';

type CoverProps = {
  uri?: string;
  headers?: Record<string, string>;
  style?: StyleProp<ViewStyle>;
  /** Làm mờ ảnh bìa 18+ khi chưa cho phép nội dung người lớn. */
  blur?: boolean;
};

/** Ảnh bìa tỉ lệ 2:3, có nền chờ và icon khi lỗi. */
function CoverView({ uri, headers, style, blur }: CoverProps) {
  const { c } = useTheme();
  const [failed, setFailed] = useState(false);
  return (
    <View style={[styles.cover, { backgroundColor: c.skeleton }, style]}>
      {uri && !failed ? (
        <Image
          source={{ uri, headers }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          resizeMethod="resize"
          blurRadius={blur ? 18 : 0}
          onError={() => setFailed(true)}
        />
      ) : (
        <ImageOff size={22} color={c.muted} />
      )}
    </View>
  );
}

export const Cover = memo(CoverView);

export type CardBadge = { text: string; color: string };

type CardProps = {
  title: string;
  subtitle?: string;
  cover?: string;
  headers?: Record<string, string>;
  badges?: CardBadge[];
  onPress?: () => void;
  onLongPress?: () => void;
  selected?: boolean;
  blur?: boolean;
  /** Mờ đi (ví dụ đã có trong thư viện). */
  dimmed?: boolean;
};

/** Ô truyện trong lưới (BookmarkGrid / catalog grid). */
function GridItem({
  title,
  subtitle,
  cover,
  headers,
  badges,
  onPress,
  onLongPress,
  selected,
  blur,
  dimmed,
}: CardProps) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.grid, { opacity: pressed ? 0.75 : dimmed ? 0.55 : 1 }]}
    >
      <View>
        <Cover uri={cover} headers={headers} blur={blur} style={selected && [styles.selected, { borderColor: c.accent }]} />
        {!!badges?.length && (
          <View style={styles.badges}>
            {badges.map(b => (
              <View key={b.text} style={[styles.badge, { backgroundColor: b.color }]}>
                <Text style={styles.badgeText}>{b.text}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <Text numberOfLines={2} style={[font.caption, styles.gridTitle, { color: c.text }]}>
        {title}
      </Text>
      {!!subtitle && (
        <Text numberOfLines={1} style={[styles.gridSubtitle, { color: c.muted }]}>
          {subtitle}
        </Text>
      )}
    </Pressable>
  );
}

export const MangaGridItem = memo(GridItem);

/** Dòng truyện trong danh sách (chế độ List View). */
function ListRow({
  title,
  subtitle,
  cover,
  headers,
  badges,
  onPress,
  onLongPress,
  selected,
  blur,
  dimmed,
  meta,
}: CardProps & { meta?: string }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      android_ripple={{ color: c.border }}
      style={({ pressed }) => [
        styles.list,
        selected && { backgroundColor: c.accentSoft },
        { opacity: pressed ? 0.8 : dimmed ? 0.55 : 1 },
      ]}
    >
      <Cover uri={cover} headers={headers} blur={blur} style={styles.listCover} />
      <View style={styles.listBody}>
        <Text numberOfLines={2} style={[font.label, { color: c.text }]}>
          {title}
        </Text>
        {!!subtitle && (
          <Text numberOfLines={1} style={[font.caption, { color: c.muted }]}>
            {subtitle}
          </Text>
        )}
        {!!meta && (
          <Text numberOfLines={1} style={[font.caption, { color: c.muted }]}>
            {meta}
          </Text>
        )}
        {!!badges?.length && (
          <View style={styles.listBadges}>
            {badges.map(b => (
              <View key={b.text} style={[styles.badge, { backgroundColor: b.color }]}>
                <Text style={styles.badgeText}>{b.text}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

export const MangaListItem = memo(ListRow);

/** Số cột lưới theo bề rộng màn hình. */
export function gridColumns(width: number, min = 3): number {
  return Math.max(min, Math.floor(width / 128));
}

const styles = StyleSheet.create({
  cover: {
    aspectRatio: 2 / 3,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { borderWidth: 3 },
  grid: { flex: 1, padding: space.xs + 2 },
  gridTitle: { marginTop: 6, fontWeight: '600' },
  gridSubtitle: { fontSize: 11, marginTop: 2 },
  badges: { position: 'absolute', top: 6, left: 6, right: 6, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  list: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm },
  listCover: { width: 64 },
  listBody: { flex: 1, gap: 3, justifyContent: 'center' },
  listBadges: { flexDirection: 'row', gap: 4, marginTop: 2 },
});
