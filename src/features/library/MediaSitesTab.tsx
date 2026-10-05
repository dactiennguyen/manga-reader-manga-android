import { memo, useCallback, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppNavigation } from '../../app/routes';
import { Globe, Plus, Puzzle } from '../../components/icons';
import { Badge, Button, EmptyState } from '../../components/ui';
import { getHost } from '../../lib/url';
import { languageName } from '../../sources';
import type { SourceConfig } from '../../sources/types';
import { useAllowNsfw } from '../../store/useSettings';
import { useSources } from '../../store/useSources';
import { font, space, useTheme } from '../../theme';
import { Favicon } from '../../components/Favicon';

function SiteRowBase({ source, onOpen }: { source: SourceConfig; onOpen: (source: SourceConfig) => void }) {
  const { c } = useTheme();
  const meta = [
    getHost(source.baseUrl),
    languageName(source.lang),
    source.content === 'novel' ? 'Tiểu thuyết' : 'Truyện tranh',
  ].join(' · ');
  return (
    <Pressable onPress={() => onOpen(source)} android_ripple={{ color: c.border }} style={styles.row}>
      <Favicon url={source.baseUrl} label={source.name} size={40} tile />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={[font.label, styles.title, { color: c.text }]}>
            {source.name}
          </Text>
          {source.nsfw && <Badge text="18+" color={c.danger} />}
        </View>
        <Text numberOfLines={1} style={[font.caption, { color: c.muted }]}>
          {meta}
        </Text>
      </View>
    </Pressable>
  );
}

const SiteRow = memo(SiteRowBase);

/** Site truyện đã thêm ("Bookmarked Media Sites"). */
export function MediaSitesTab() {
  const navigation = useAppNavigation();
  const { c } = useTheme();
  const sources = useSources(s => s.sources);
  const allowNsfw = useAllowNsfw();

  const visible = useMemo(
    () =>
      sources
        .filter(s => s.enabled && (allowNsfw || !s.nsfw))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [sources, allowNsfw],
  );
  const hiddenNsfw = allowNsfw ? 0 : sources.filter(s => s.enabled && s.nsfw).length;

  const open = useCallback(
    (source: SourceConfig) => navigation.navigate('Catalog', { sourceId: source.id }),
    [navigation],
  );

  if (!visible.length) {
    return (
      <EmptyState
        icon={Globe}
        title="Chưa có site truyện"
        message={
          hiddenNsfw
            ? 'Các site đã ghim đều là site 18+ đang bị ẩn. Bật nội dung 18+ trong Cài đặt hoặc ghim thêm site.'
            : 'Chưa ghim site truyện nào. Đánh dấu site trong danh sách site được hỗ trợ để ghim vào đây.'
        }
        action={{ label: 'Site được hỗ trợ', icon: Puzzle, onPress: () => navigation.navigate('Addons') }}
      />
    );
  }

  const notes = hiddenNsfw ? [`${hiddenNsfw} site 18+ bị ẩn`] : [];

  return (
    <FlatList
      data={visible}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <SiteRow source={item} onOpen={open} />}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={[font.caption, { color: c.muted }]}>
            Mở site để xem danh sách truyện bằng giao diện native.
            {notes.length ? ` (${notes.join(', ')})` : ''}
          </Text>
          <View style={styles.actions}>
            <Button
              title="Site được hỗ trợ"
              icon={Puzzle}
              variant="secondary"
              small
              onPress={() => navigation.navigate('Addons')}
            />
            <Button
              title="Thêm site"
              icon={Plus}
              variant="ghost"
              small
              onPress={() => navigation.navigate('AddSite')}
            />
          </View>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: space.xl },
  header: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.sm },
  actions: { flexDirection: 'row', gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, minHeight: 64 },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { flexShrink: 1 },
});
