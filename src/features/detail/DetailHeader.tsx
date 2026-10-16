import { useMemo, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeft, Bookmark, EllipsisVertical } from '../../components/icons';
import { withUserAgent } from '../../lib/http';
import { darkPalette, space } from '../../theme';
import { ToolButton } from './DetailActions';

const ON_HEADER = '#FFFFFF';
const HEADER_ACCENT = darkPalette.accent;
export const HEADER_BAR_HEIGHT = 56;
export const HEADER_TABS_HEIGHT = 48;

export function DetailHeader<T extends string>({
  title,
  cover,
  headers,
  bookmarked,
  locked,
  tabs,
  tab,
  scrollY,
  onTab,
  onBack,
  onBookmark,
  onMenu,
  onHeight,
}: {
  title: string;
  cover?: string;
  headers: Record<string, string>;
  bookmarked: boolean;
  locked: boolean;
  tabs: readonly { key: T; label: string }[];
  tab: T;
  scrollY: Animated.Value;
  onTab: (key: T) => void;
  onBack: () => void;
  onBookmark: () => void;
  onMenu: () => void;
  onHeight: (height: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const [titleHeight, setTitleHeight] = useState(0);
  const [failedUri, setFailedUri] = useState<string>();
  const source = useMemo(
    () => (cover && /^https?:/i.test(cover) ? { uri: cover, headers: withUserAgent(headers) } : { uri: cover, headers }),
    [cover, headers],
  );

  const anim = useMemo(() => {
    const range = Math.max(1, titleHeight);
    const clamp = 'clamp' as const;
    return {
      shift: scrollY.interpolate({ inputRange: [0, range], outputRange: [0, -range], extrapolate: clamp }),
      unshift: scrollY.interpolate({ inputRange: [0, range], outputRange: [0, range], extrapolate: clamp }),
      large: scrollY.interpolate({ inputRange: [0, range * 0.6], outputRange: [1, 0], extrapolate: clamp }),
      compact: scrollY.interpolate({ inputRange: [range * 0.6, range], outputRange: [0, 1], extrapolate: clamp }),
    };
  }, [scrollY, titleHeight]);

  return (
    <Animated.View
      onLayout={e => onHeight(e.nativeEvent.layout.height)}
      style={[styles.header, { paddingTop: insets.top, transform: [{ translateY: anim.shift }] }]}
    >
      {!!cover && failedUri !== cover && (
        <>
          <Image
            source={source}
            blurRadius={locked ? 40 : 18}
            resizeMode="cover"
            onError={() => setFailedUri(cover)}
            style={StyleSheet.absoluteFill}
          />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim]} />
        </>
      )}

      <Animated.View style={[styles.bar, { transform: [{ translateY: anim.unshift }] }]}>
        <ToolButton icon={ArrowLeft} color={ON_HEADER} onPress={onBack} accessibilityLabel="Quay lại" />
        <View style={styles.flex} />
        <ToolButton
          icon={Bookmark}
          filled={bookmarked}
          color={bookmarked ? HEADER_ACCENT : ON_HEADER}
          disabled={locked}
          onPress={onBookmark}
          accessibilityLabel={bookmarked ? 'Đã lưu bookmark' : 'Thêm vào bookmark'}
        />
        <ToolButton icon={EllipsisVertical} color={ON_HEADER} onPress={onMenu} accessibilityLabel="Menu" />
        <Animated.View pointerEvents="none" style={[styles.compact, { opacity: anim.compact }]}>
          <Text numberOfLines={1} style={[styles.compactTitle, styles.shadow]}>
            {title}
          </Text>
        </Animated.View>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        onLayout={e => setTitleHeight(e.nativeEvent.layout.height)}
        style={[styles.large, { opacity: anim.large }]}
      >
        <Text numberOfLines={3} style={[styles.largeTitle, styles.shadow]}>
          {title}
        </Text>
      </Animated.View>

      <View style={styles.tabs}>
        {tabs.map(item => {
          const active = item.key === tab;
          return (
            <Pressable
              key={item.key}
              onPress={() => onTab(item.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
              style={styles.tab}
            >
              <Text style={[styles.tabLabel, styles.shadow, active ? styles.tabActive : styles.tabIdle]}>
                {item.label}
              </Text>
              <View style={[styles.indicator, active && { backgroundColor: HEADER_ACCENT }]} />
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    backgroundColor: darkPalette.surface,
  },
  scrim: { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  bar: {
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: HEADER_BAR_HEIGHT,
    paddingHorizontal: space.xs,
  },
  compact: { position: 'absolute', top: 0, bottom: 0, left: 96, right: 96, justifyContent: 'center' },
  compactTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', color: ON_HEADER },
  large: { paddingHorizontal: space.xl, paddingTop: space.xs, paddingBottom: space.lg },
  largeTitle: { fontSize: 28, lineHeight: 34, fontWeight: '700', textAlign: 'center', color: ON_HEADER },
  shadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  tabs: { flexDirection: 'row', height: HEADER_TABS_HEIGHT },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  tabLabel: { fontSize: 15, paddingBottom: space.md - 1 },
  tabActive: { color: ON_HEADER, fontWeight: '700' },
  tabIdle: { color: 'rgba(255, 255, 255, 0.72)', fontWeight: '500' },
  indicator: {
    height: 3,
    alignSelf: 'stretch',
    marginHorizontal: space.xl,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
});
