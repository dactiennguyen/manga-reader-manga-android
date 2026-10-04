import { ChevronDown, ChevronUp, Search, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';

import { IconButton } from '../../components/ui';
import { radius, space, useTheme } from '../../theme';

export type FindResult = { count: number; index: number };

/** "Tìm trong trang": thanh dưới cùng, kết quả do script trong trang đánh dấu. */
export function FindBar({
  result,
  onQuery,
  onStep,
  onClose,
}: {
  result: FindResult;
  onQuery: (query: string) => void;
  onStep: (delta: 1 | -1) => void;
  onClose: () => void;
}) {
  const { c } = useTheme();
  const [text, setText] = useState('');
  const inputRef = useRef<TextInputInstance>(null);

  // Thanh mở từ menu: đợi sheet đóng hẳn rồi mới focus để bàn phím bật lên.
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => onQuery(text.trim()), 250);
    return () => clearTimeout(timer);
  }, [text, onQuery]);

  const hasQuery = !!text.trim();
  const counter = hasQuery ? (result.count ? `${result.index + 1}/${result.count}` : '0/0') : '';

  return (
    <View style={[styles.bar, { backgroundColor: c.surface, borderTopColor: c.border }]}>
      <View style={[styles.field, { backgroundColor: c.surfaceAlt }]}>
        <Search size={17} color={c.muted} />
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          placeholder="Tìm trong trang…"
          placeholderTextColor={c.muted}
          selectionColor={c.accent}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={() => onStep(1)}
          submitBehavior="submit"
          style={[styles.input, { color: c.text }]}
        />
        {!!counter && (
          <Text style={[styles.counter, { color: hasQuery && !result.count ? c.danger : c.muted }]}>{counter}</Text>
        )}
      </View>
      <IconButton icon={ChevronUp} disabled={!result.count} onPress={() => onStep(-1)} accessibilityLabel="Kết quả trước" />
      <IconButton icon={ChevronDown} disabled={!result.count} onPress={() => onStep(1)} accessibilityLabel="Kết quả sau" />
      <IconButton icon={X} onPress={onClose} accessibilityLabel="Đóng tìm trong trang" />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    paddingLeft: space.md,
    paddingRight: space.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 40,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
  counter: { fontSize: 12, fontWeight: '700' },
});
