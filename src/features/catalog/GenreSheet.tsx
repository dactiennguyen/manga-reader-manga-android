import { X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ErrorView } from '../../components/ErrorView';
import { Sheet } from '../../components/Sheet';
import { Button, Chip, SearchField } from '../../components/ui';
import type { Genre, SourceConfig } from '../../sources/types';
import { font, space, useTheme } from '../../theme';
import { getCachedGenres, loadGenres } from './genreCache';
import { useRequestToken } from './useRequestToken';

/** Nhiều thể loại thì hiện ô lọc cho dễ tìm. */
const FILTER_THRESHOLD = 24;

/** "Filter by Genre": chọn một thể loại để lọc catalog. */
export function GenreSheet({
  visible,
  onClose,
  source,
  selected,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  source: SourceConfig;
  selected?: Genre;
  onSelect: (genre: Genre | undefined) => void;
}) {
  const { c } = useTheme();
  const [genres, setGenres] = useState<Genre[] | undefined>(() => getCachedGenres(source));
  const [error, setError] = useState<unknown>();
  const [filter, setFilter] = useState('');
  const token = useRequestToken();

  const load = useCallback(() => {
    const t = token.next();
    setError(undefined);
    loadGenres(source).then(
      list => token.isCurrent(t) && setGenres(list),
      e => token.isCurrent(t) && setError(e),
    );
  }, [source, token]);

  // Chỉ tải khi mở sheet lần đầu; mở lại sau lỗi thì thử lại.
  useEffect(() => {
    if (visible && !genres) {
      load();
    }
  }, [visible, genres, load]);

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q && genres ? genres.filter(g => g.name.toLowerCase().includes(q)) : genres ?? [];
  }, [genres, filter]);

  const pick = (genre: Genre | undefined) => {
    onSelect(genre);
    onClose();
  };

  let body;
  if (genres) {
    body = genres.length ? (
      <>
        {genres.length > FILTER_THRESHOLD && (
          <SearchField
            value={filter}
            onChangeText={setFilter}
            onClear={() => setFilter('')}
            placeholder="Lọc thể loại"
            style={styles.filter}
          />
        )}
        <View style={styles.chips}>
          {shown.map(genre => (
            <Chip
              key={genre.id}
              label={genre.name}
              selected={genre.id === selected?.id}
              onPress={() => pick(genre)}
            />
          ))}
        </View>
        {!shown.length && (
          <Text style={[font.body, styles.message, { color: c.muted }]}>Không có thể loại nào khớp.</Text>
        )}
      </>
    ) : (
      <Text style={[font.body, styles.message, { color: c.muted }]}>
        Site này không cung cấp danh sách thể loại.
      </Text>
    );
  } else if (error) {
    body = <ErrorView error={error} onRetry={load} style={styles.inline} />;
  } else {
    body = (
      <View style={styles.loading}>
        <ActivityIndicator color={c.accent} />
        <Text style={[font.body, { color: c.muted }]}>Đang tải thể loại…</Text>
      </View>
    );
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Lọc theo thể loại"
      subtitle={genres?.length ? `${genres.length} thể loại · ${source.name}` : source.name}
      right={selected && <Button title="Bỏ lọc" icon={X} variant="ghost" small onPress={() => pick(undefined)} />}
    >
      {body}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  filter: { marginHorizontal: space.lg, marginBottom: space.sm },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  message: { textAlign: 'center', padding: space.xl },
  inline: { flex: 0, paddingVertical: space.lg },
  loading: { alignItems: 'center', gap: space.md, padding: space.xl },
});
