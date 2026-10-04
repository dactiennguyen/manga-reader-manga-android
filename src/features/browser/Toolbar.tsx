import { ChevronLeft, ChevronRight, EllipsisVertical, House } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '../../components/ui';
import { radius, useTheme } from '../../theme';
import type { TourRegister } from './Tour';

/** Thanh công cụ dưới: Lùi, Tiến, Trang chủ, Tab, Menu. */
export function Toolbar({
  incognito,
  canBack,
  canForward,
  onBack,
  onForward,
  onHome,
  homeActive,
  tabCount,
  onTabs,
  onNewTab,
  onMenu,
  registerTour,
}: {
  incognito: boolean;
  canBack: boolean;
  canForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onHome: () => void;
  homeActive: boolean;
  tabCount: number;
  onTabs: () => void;
  onNewTab: () => void;
  onMenu: () => void;
  registerTour: TourRegister;
}) {
  const { c } = useTheme();
  const fg = incognito ? c.onIncognito : c.text;
  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: incognito ? c.incognito : c.surface, borderTopColor: incognito ? c.incognito : c.border },
      ]}
    >
      <IconButton icon={ChevronLeft} size={26} color={fg} disabled={!canBack} onPress={onBack} accessibilityLabel="Lùi" />
      <IconButton
        icon={ChevronRight}
        size={26}
        color={fg}
        disabled={!canForward}
        onPress={onForward}
        accessibilityLabel="Tiến"
      />
      <IconButton
        icon={House}
        color={homeActive ? c.accent : fg}
        onPress={onHome}
        accessibilityLabel="Trang chủ"
      />
      <View ref={registerTour('tabs')} collapsable={false}>
        <Pressable
          onPress={onTabs}
          onLongPress={onNewTab}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`${tabCount} tab${incognito ? ' ẩn danh' : ''}`}
          android_ripple={{ color: c.border, borderless: true, radius: 22 }}
          style={styles.tabButton}
        >
          <View
            style={[
              styles.tabBox,
              incognito
                ? { backgroundColor: c.onIncognito, borderColor: c.onIncognito }
                : { borderColor: fg },
            ]}
          >
            <Text style={[styles.tabCount, { color: incognito ? c.incognito : fg }]}>
              {tabCount > 99 ? '99+' : tabCount}
            </Text>
          </View>
        </Pressable>
      </View>
      <View ref={registerTour('menu')} collapsable={false}>
        <IconButton
          icon={EllipsisVertical}
          color={fg}
          onPress={onMenu}
          accessibilityLabel="Menu"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 54,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  tabBox: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 3,
    borderRadius: radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabCount: { fontSize: 12, fontWeight: '800' },
});
