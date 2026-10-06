import { memo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { font, radius, space, useTheme } from '../theme';
import { BadgeAlert, BookOpen, ImageOff } from './icons';

type CoverProps = {
  uri?: string;
  headers?: Record<string, string>;
  style?: StyleProp<ViewStyle>;
  blur?: boolean;
};

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

export type CoverRibbon = 'new' | 'unread';

type CardProps = {
  title: string;
  subtitle?: string;
  cover?: string;
  headers?: Record<string, string>;
  badges?: CardBadge[];
  ribbon?: CoverRibbon;
  siteLabel?: string;
  typeLabel?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  selected?: boolean;
  blur?: boolean;
  dimmed?: boolean;
};

export function CoverOverlays({
  ribbon,
  siteLabel,
  typeLabel,
  badges,
}: Pick<CardProps, 'ribbon' | 'siteLabel' | 'typeLabel' | 'badges'>) {
  const { c } = useTheme();
  const RibbonIcon = ribbon === 'new' ? BadgeAlert : BookOpen;
  return (
    <>
      {ribbon && (
        <View pointerEvents="none" style={styles.ribbonWrap}>
          <View
            style={[styles.ribbon, { borderTopColor: ribbon === 'new' ? c.badgeNew : c.badgeUnread }]}
          />
          <RibbonIcon size={14} color="#fff" strokeWidth={2.5} style={styles.ribbonIcon} />
        </View>
      )}
      {!!badges?.length && (
        <View pointerEvents="none" style={[styles.badges, ribbon && styles.badgesShifted]}>
          {badges.map(b => (
            <View key={b.text} style={[styles.badge, { backgroundColor: b.color }]}>
              <Text style={styles.badgeText}>{b.text}</Text>
            </View>
          ))}
        </View>
      )}
      {!!siteLabel && (
        <View pointerEvents="none" style={[styles.site, { backgroundColor: c.badgeSite }]}>
          <Text numberOfLines={1} style={styles.siteText}>
            {siteLabel}
          </Text>
        </View>
      )}
      {!!typeLabel && (
        <View pointerEvents="none" style={[styles.type, { backgroundColor: c.badgeType }]}>
          <Text style={styles.typeText}>{typeLabel}</Text>
        </View>
      )}
    </>
  );
}

function GridItem({
  title,
  subtitle,
  cover,
  headers,
  badges,
  ribbon,
  siteLabel,
  typeLabel,
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
        <CoverOverlays ribbon={ribbon} siteLabel={siteLabel} typeLabel={typeLabel} badges={badges} />
      </View>
      <Text numberOfLines={2} style={[styles.gridTitle, { color: c.text }]}>
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

function ListRow({
  title,
  subtitle,
  cover,
  headers,
  badges,
  ribbon,
  typeLabel,
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
      <View style={styles.listCover}>
        <Cover uri={cover} headers={headers} blur={blur} />
        <CoverOverlays ribbon={ribbon} typeLabel={typeLabel} />
      </View>
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
  gridTitle: { marginTop: 6, fontSize: 13, lineHeight: 17, fontWeight: '700', textAlign: 'center' },
  gridSubtitle: { fontSize: 11, marginTop: 2, textAlign: 'center' },
  ribbonWrap: { position: 'absolute', top: 0, left: 0, width: 34, height: 34 },
  ribbon: {
    width: 0,
    height: 0,
    borderTopWidth: 34,
    borderRightWidth: 34,
    borderRightColor: 'transparent',
    borderTopLeftRadius: radius.md,
  },
  ribbonIcon: { position: 'absolute', top: 3, left: 3 },
  badgesShifted: { left: 36 },
  site: {
    position: 'absolute',
    left: 5,
    bottom: 5,
    maxWidth: '78%',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  siteText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  type: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    width: 20,
    height: 20,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  badges: { position: 'absolute', top: 6, left: 6, right: 6, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  list: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm },
  listCover: { width: 64 },
  listBody: { flex: 1, gap: 3, justifyContent: 'center' },
  listBadges: { flexDirection: 'row', gap: 4, marginTop: 2 },
});
