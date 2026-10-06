import { useRef, useState, type ComponentRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { radius, space, useTheme } from '../theme';
import { Check, ChevronDown } from './icons';

type Option<T> = { value: T; label: string };

export function DropdownButton<T extends string>({
  value,
  options,
  onChange,
  accessibilityLabel,
}: {
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const anchor = useRef<ComponentRef<typeof View>>(null);
  const [menu, setMenu] = useState<{ top: number; right: number } | null>(null);
  const current = options.find(o => o.value === value);

  const open = () => {
    anchor.current?.measureInWindow((x, y, width, height) => {
      setMenu({ top: y + height + 4, right: Math.max(space.sm, screenWidth - (x + width)) });
    });
  };

  const pick = (next: T) => {
    setMenu(null);
    if (next !== value) {
      onChange(next);
    }
  };

  return (
    <>
      <View ref={anchor} collapsable={false}>
        <Pressable
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? current?.label}
          style={({ pressed }) => [styles.button, { backgroundColor: c.appBarField, opacity: pressed ? 0.75 : 1 }]}
        >
          <Text numberOfLines={1} style={[styles.label, { color: c.onAppBar }]}>
            {current?.label}
          </Text>
          <ChevronDown size={16} color={c.onAppBar} />
        </Pressable>
      </View>
      <Modal
        visible={!!menu}
        transparent
        animationType="fade"
        onRequestClose={() => setMenu(null)}
        statusBarTranslucent
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenu(null)} />
        {menu && (
          <View style={[styles.menu, { top: menu.top, right: menu.right, backgroundColor: c.elevated }]}>
            {options.map(option => {
              const selected = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => pick(option.value)}
                  android_ripple={{ color: c.border }}
                  style={[styles.item, selected && { backgroundColor: c.accentSoft }]}
                >
                  <Text style={[styles.itemLabel, { color: c.text }]}>{option.label}</Text>
                  {selected && <Check size={16} color={c.accent} />}
                </Pressable>
              );
            })}
          </View>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 36,
    maxWidth: 170,
    paddingLeft: space.md,
    paddingRight: space.sm,
    borderRadius: radius.sm + 2,
  },
  label: { fontSize: 15, flexShrink: 1 },
  menu: {
    position: 'absolute',
    minWidth: 180,
    paddingVertical: space.sm,
    borderRadius: radius.sm,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    minHeight: 48,
    paddingHorizontal: space.lg,
  },
  itemLabel: { fontSize: 15 },
});
