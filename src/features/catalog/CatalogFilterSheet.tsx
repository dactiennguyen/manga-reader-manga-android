import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ErrorView } from '../../components/ErrorView';
import { Sheet } from '../../components/Sheet';
import { X } from '../../components/icons';
import { Button, Chip, SearchField } from '../../components/ui';
import type { Genre, SourceConfig } from '../../sources/types';
import { font, space, useTheme } from '../../theme';
import { getCachedGenres, loadGenres } from './genreCache';
import { RecentSearches } from './RecentSearches';
import { useRequestToken } from './useRequestToken';

/** Nhiều thể loại thì hiện ô lọc cho dễ tìm. */
const FILTER_THRESHOLD = 24;

/**
 * Nút lọc trên thanh tab catalog: tìm theo tên (kèm tìm gần đây) và
 * "Filter by Genre". Tìm kiếm và thể loại loại trừ nhau vì site không lọc
 * kết quả tìm theo thể loại.
 */
export function CatalogFilterSheet({
  visible,
  onClose,
  source,
  query,
  genre,
  onSearch,
  onGenre,
  onClear,
}: {
  visible: boolean;
  onClose: () => void;
  source: SourceConfig;
  query: string;
  genre?: Genre;
  onSearch: (query: string) => void;
  onGenre: (genre: Genre) => void;
  onClear: () => void;
}) {
  const { c } = useTheme();
  const [input, setInput] = useState(query);
  const [genres, setGenres] = useState<Genre[] | undefined>(() => getCachedGenres(source));
  const [error, setError] = useState<unknown>();
  const [genreFilter, setGenreFilter] = useState('');
  const token = useRequestToken();

  const load = useCallback(() => {
    const t = token.next();
    setError(undefined);
    loadGenres(source).then(
      list => token.isCurrent(t) && setGenres(list),
      e => token.isCurrent(t) && setError(e),
    );
  }, [source, token]);

  useEffect(() => {
    if (visible && !genres) {
      load();
    }
  }, [visible, genres, load]);

  const shownGenres = useMemo(() => {
    const q = genreFilter.trim().toLowerCase();
    return q && genres ? genres.filter(g => g.name.toLowerCase().includes(q)) : genres ?? [];
  }, [genres, genreFilter]);

  const submit = (raw: string) => {
    const q = raw.trim();
    if (!q) {
      return;
    }
    onSearch(q);
    onClose();
  };

  const pickGenre = (next: Genre) => {
    onGenre(next);
    onClose();
  };

  let genreBody;
  if (genres) {
    genreBody = genres.length ? (
      <>
        {genres.length > FILTER_THRESHOLD && (
          <SearchField
            value={genreFilter}
            onChangeText={setGenreFilter}
            onClear={() => setGenreFilter('')}
            placeholder="Lọc thể loại"
            style={styles.field}
          />
        )}
        <View style={styles.chips}>
          {shownGenres.map(g => (
            <Chip key={g.id} label={g.name} selected={g.id === genre?.id} onPress={() => pickGenre(g)} />
          ))}
        </View>
        {!shownGenres.length && (
          <Text style={[font.body, styles.message, { color: c.muted }]}>Không có thể loại nào khớp.</Text>
        )}
      </>
    ) : (
      <Text style={[font.body, styles.message, { color: c.muted }]}>Site này không cung cấp danh sách thể loại.</Text>
    );
  } else if (error) {
    genreBody = <ErrorView error={error} onRetry={load} style={styles.inline} />;
  } else {
    genreBody = (
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
      title="Tìm & lọc"
      subtitle={source.name}
      right={
        (!!query || !!genre) && (
          <Button
            title="Bỏ lọc"
            icon={X}
            variant="ghost"
            small
            onPress={() => {
              onClear();
              onClose();
            }}
          />
        )
      }
    >
      <SearchField
        value={input}
        onChangeText={setInput}
        onClear={() => setInput('')}
        onSubmitEditing={() => submit(input)}
        placeholder="Tìm theo tên truyện"
        style={styles.field}
      />
      <RecentSearches filter={input} onPick={submit} limit={5} embedded />
      <Text style={[font.overline, styles.title, { color: c.muted }]}>
        Thể loại{genres?.length ? ` (${genres.length})` : ''}
      </Text>
      {genreBody}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  field: { marginHorizontal: space.lg, marginBottom: space.sm },
  title: { paddingHorizontal: space.lg + 2, paddingTop: space.sm, paddingBottom: space.sm },
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
