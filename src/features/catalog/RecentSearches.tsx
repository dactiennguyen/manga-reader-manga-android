import { History, X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { confirm, Divider, IconButton } from '../../components/ui';
import { useHistory } from '../../store/useHistory';
import { font, radius, space, useTheme } from '../../theme';

/**
 * "Recent Searches": từ khoá tìm truyện gần đây, lọc theo chữ đang gõ.
 * `empty` hiện khi chưa có từ khoá nào.
 */
export function RecentSearches({
  filter = '',
  onPick,
  empty,
}: {
  filter?: string;
  onPick: (query: string) => void;
  empty?: ReactNode;
}) {
  const { c } = useTheme();
  const searches = useHistory(s => s.searches);
  const removeSearch = useHistory(s => s.removeSearch);
  const clearSearches = useHistory(s => s.clearSearches);

  const q = filter.trim().toLowerCase();
  const shown = q ? searches.filter(s => s.toLowerCase().includes(q)) : searches;

  if (!searches.length) {
    return <>{empty}</>;
  }

  const clearAll = async () => {
    if (await confirm('Xoá tìm kiếm gần đây?', 'Toàn bộ từ khoá tìm truyện đã lưu sẽ bị xoá.', { confirmText: 'Xoá', destructive: true })) {
      clearSearches('manga');
    }
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <Text style={[font.overline, styles.title, { color: c.muted }]}>Tìm gần đây</Text>
      <View style={[styles.card, { backgroundColor: c.surface }]}>
        {shown.map((query, index) => (
          <View key={query}>
            {index > 0 && <Divider inset={52} />}
            <Pressable
              onPress={() => onPick(query)}
              android_ripple={{ color: c.border }}
              style={styles.row}
            >
              <History size={18} color={c.muted} />
              <Text numberOfLines={1} style={[font.body, styles.flex, { color: c.text }]}>
                {query}
              </Text>
              <IconButton
                icon={X}
                size={18}
                color={c.muted}
                onPress={() => removeSearch(query, 'manga')}
                accessibilityLabel={`Xoá "${query}"`}
              />
            </Pressable>
          </View>
        ))}
        {!shown.length && (
          <Text style={[font.body, styles.none, { color: c.muted }]}>Không có từ khoá nào khớp.</Text>
        )}
      </View>
      <Pressable onPress={clearAll} hitSlop={8} style={styles.clear}>
        <Text style={[font.label, { color: c.danger }]}>Xoá tìm kiếm gần đây</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingVertical: space.lg, gap: space.sm },
  title: { paddingHorizontal: space.lg + 2 },
  card: { marginHorizontal: space.md, borderRadius: radius.lg, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md + 2,
    minHeight: 50,
    paddingLeft: space.lg,
    paddingRight: space.xs,
  },
  none: { padding: space.lg },
  clear: { alignSelf: 'center', padding: space.md },
});
