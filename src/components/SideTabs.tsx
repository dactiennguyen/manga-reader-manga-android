import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { space, useTheme } from '../theme';

type Option<T> = { value: T; label: string };

export function SideTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
}) {
  const { c } = useTheme();
  return (
    <ScrollView
      style={[styles.rail, { backgroundColor: c.surface, borderRightColor: c.border }]}
      contentContainerStyle={styles.content}
      accessibilityRole="tablist"
    >
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            android_ripple={{ color: c.border }}
            style={[styles.item, selected && { backgroundColor: c.surfaceAlt }]}
          >
            <Text
              numberOfLines={1}
              style={[styles.label, { color: selected ? c.accent : c.text }, selected && styles.selected]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rail: { width: 220, flexGrow: 0, borderRightWidth: StyleSheet.hairlineWidth },
  content: { paddingVertical: space.sm },
  item: { minHeight: 48, justifyContent: 'center', paddingHorizontal: space.lg },
  label: { fontSize: 14 },
  selected: { fontWeight: '600' },
});
