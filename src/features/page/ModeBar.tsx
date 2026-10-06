import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppNavigation } from '../../app/routes';
import { Brush, MessageSquare, PanelsTopLeft, type LucideIcon } from '../../components/icons';
import type { ID } from '../../model/types';
import { useTheme } from '../../theme';

export type PageMode = 'panels' | 'art' | 'lettering';

const MODES: { key: PageMode; label: string; icon: LucideIcon }[] = [
  { key: 'panels', label: 'Panels', icon: PanelsTopLeft },
  { key: 'art', label: 'Art', icon: Brush },
  { key: 'lettering', label: 'Lettering', icon: MessageSquare },
];

export function ModeBar({
  pageId,
  mode,
  onChange,
}: {
  pageId: ID;
  mode: PageMode;
  onChange?: (mode: 'panels' | 'art') => void;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();

  const select = (next: PageMode) => {
    if (next === mode) {
      return;
    }
    if (next === 'lettering') {
      navigation.replace('Lettering', { pageId });
    } else if (mode === 'lettering') {
      navigation.replace('PanelLayout', { pageId, mode: next });
    } else {
      onChange?.(next);
    }
  };

  return (
    <View style={[styles.bar, { backgroundColor: c.surface, borderTopColor: c.ink, paddingBottom: insets.bottom }]}>
      {MODES.map(item => {
        const active = item.key === mode;
        const Icon = item.icon;
        return (
          <Pressable
            key={item.key}
            onPress={() => select(item.key)}
            accessibilityRole="button"
            accessibilityState={active ? { selected: true } : {}}
            style={[styles.item, active && { backgroundColor: c.ink }]}
          >
            <Icon size={18} color={active ? c.onInk : c.textSecondary} />
            <Text style={[styles.label, { color: active ? c.onInk : c.textSecondary }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 2, paddingHorizontal: 8, paddingTop: 6, gap: 6 },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
    marginBottom: 6,
  },
  label: { fontSize: 13, fontWeight: '700' },
});
