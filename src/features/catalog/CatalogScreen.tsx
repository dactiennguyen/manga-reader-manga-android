import { useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import type { LucideIcon } from 'lucide-react-native';
import {
  Globe,
  LayoutGrid,
  List,
  Lock,
  Power,
  PowerOff,
  RotateCw,
  Search,
  SearchX,
  ShieldAlert,
  Tags,
  X,
} from 'lucide-react-native';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Keyboard,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { openInBrowser, useAppNavigation, type RootStackParamList } from '../../app/routes';
import { ErrorView } from '../../components/ErrorView';
import { gridColumns, MangaGridItem, MangaListItem, type CardBadge } from '../../components/MangaCard';
import {
  Button,
  Chip,
  ChipRow,
  EmptyState,
  Header,
  IconButton,
  LoadingView,
  Screen,
  SearchField,
} from '../../components/ui';
import { isChallengeError } from '../../lib/http';
import { getEngine, mangaKey } from '../../sources';
import type { Genre, ListSort, MangaItem, SourceConfig } from '../../sources/types';
import { useHistory } from '../../store/useHistory';
import { useLibrary } from '../../store/useLibrary';
import { useAllowNsfw, useSettings } from '../../store/useSettings';
import { useSource, useSources } from '../../store/useSources';
import { font, space, useTheme } from '../../theme';
import { GenreSheet } from './GenreSheet';
import { toggleQuickBookmark } from './quickBookmark';
import { RecentSearches } from './RecentSearches';
import { usePagedList } from './usePagedList';

/** Trang chủ catalog của một nguồn (widget cataloghome/cataloglist). */
export function CatalogScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Catalog'>>();
  const { sourceId, query, genre } = route.params;
  const source = useSource(sourceId);
  const allowNsfw = useAllowNsfw();
  const updateSource = useSources(s => s.updateSource);
  const navigation = useAppNavigation();

  if (!source) {
    return (
      <Gate
        title="Catalog"
        icon={SearchX}
        heading="Không tìm thấy nguồn"
        message="Nguồn này đã bị xoá hoặc chưa được thêm."
        action={{ label: 'Quản lý addon', onPress: () => navigation.navigate('Addons') }}
      />
    );
  }
  if (source.nsfw && !allowNsfw) {
    return (
      <Gate
        title={source.name}
        icon={Lock}
        heading="Nguồn 18+ đang bị khoá"
        message="Bật hiển thị nội dung 18+ và xác nhận đủ tuổi trong Cài đặt để xem nguồn này."
        action={{ label: 'Mở Cài đặt', onPress: () => navigation.navigate('Settings') }}
      />
    );
  }
  if (!source.enabled) {
    return (
      <Gate
        title={source.name}
        icon={PowerOff}
        heading="Nguồn đang tắt"
        message="Bật lại nguồn để xem danh sách truyện, tìm kiếm và kiểm tra chương mới."
        action={{ label: 'Bật nguồn', icon: Power, onPress: () => updateSource(source.id, { enabled: true }) }}
      />
    );
  }
  // Đổi tham số tại chỗ (cùng màn) thì dựng lại từ đầu thay vì giữ trạng thái cũ.
  return (
    <CatalogBody
      key={`${source.id}|${query ?? ''}|${genre?.id ?? ''}`}
      source={source}
      initialQuery={query}
      initialGenre={genre}
    />
  );
}

function Gate({
  title,
  icon,
  heading,
  message,
  action,
}: {
  title: string;
  icon: LucideIcon;
  heading: string;
  message: string;
  action: { label: string; onPress: () => void; icon?: LucideIcon };
}) {
  return (
    <Screen>
      <Header title={title} />
      <EmptyState icon={icon} title={heading} message={message} action={action} />
    </Screen>
  );
}

function CatalogBody({
  source,
  initialQuery,
  initialGenre,
}: {
  source: SourceConfig;
  initialQuery?: string;
  initialGenre?: Genre;
}) {
  const navigation = useAppNavigation();
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const engine = getEngine(source.engine);
  const layout = useSettings(s => s.catalogLayout);
  const setSettings = useSettings(s => s.set);
  const newTab = useSettings(s => s.openNativeLinksInNewTab);
  const bookmarks = useLibrary(s => s.bookmarks);
  const addSearch = useHistory(s => s.addSearch);

  const [sort, setSort] = useState<ListSort>(engine.sorts[0]?.id ?? 'latest');
  const [genre, setGenre] = useState<Genre | undefined>(initialGenre);
  const [searching, setSearching] = useState(!!initialQuery?.trim());
  const [input, setInput] = useState(initialQuery?.trim() ?? '');
  const [query, setQuery] = useState(initialQuery?.trim() ?? '');
  const [editing, setEditing] = useState(false);
  const [genreOpen, setGenreOpen] = useState(false);

  // Khoá danh sách: đổi nguồn/sắp xếp/thể loại/từ khoá thì tải lại từ trang 1.
  const listKey = JSON.stringify([
    source.id,
    source.engine,
    source.lang,
    source.options ?? null,
    query ? ['search', query] : ['list', sort, genre?.id ?? null],
  ]);
  const fetchPage = useCallback(
    (page: number) => {
      if (query) {
        return engine.search(source, query, page);
      }
      if (genre) {
        return engine.byGenre(source, genre, sort, page);
      }
      return engine.list(source, sort, page);
    },
    [engine, source, query, genre, sort],
  );
  const list = usePagedList(listKey, fetchPage);

  const submit = useCallback(
    (raw: string) => {
      const q = raw.trim();
      if (!q) {
        return;
      }
      addSearch(q, 'manga');
      setInput(q);
      setQuery(q);
      setEditing(false);
      Keyboard.dismiss();
    },
    [addSearch],
  );

  const closeSearch = useCallback(() => {
    Keyboard.dismiss();
    setSearching(false);
    setEditing(false);
    setInput('');
    setQuery('');
  }, []);

  // Phím back khi đang tìm thì thoát chế độ tìm trước (trừ khi mở sẵn với từ khoá).
  useFocusEffect(
    useCallback(() => {
      if (!searching || initialQuery) {
        return;
      }
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        closeSearch();
        return true;
      });
      return () => sub.remove();
    }, [searching, initialQuery, closeSearch]),
  );

  // Ẩn bàn phím bằng nút back của Android không làm mất focus ô nhập — tự bỏ focus.
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidHide', () => {
      Keyboard.dismiss();
      setEditing(false);
    });
    return () => sub.remove();
  }, []);

  const grid = layout === 'grid';
  const columns = grid ? gridColumns(width) : 1;
  const headers = useMemo(() => engine.imageHeaders(source), [engine, source]);
  const savedBadge = useMemo<CardBadge[]>(() => [{ text: 'Đã lưu', color: c.accent }], [c.accent]);

  const openItem = useCallback(
    (item: MangaItem) =>
      navigation.navigate('MangaDetail', {
        sourceId: source.id,
        url: item.url,
        title: item.title,
        cover: item.cover,
      }),
    [navigation, source.id],
  );
  const toggleItem = useCallback((item: MangaItem) => toggleQuickBookmark(source, item), [source]);

  const renderItem = useCallback(
    ({ item }: { item: MangaItem }) => (
      <CatalogCell
        item={item}
        grid={grid}
        headers={headers}
        badges={bookmarks[mangaKey(source.id, item.url)] ? savedBadge : undefined}
        onOpen={openItem}
        onToggle={toggleItem}
      />
    ),
    [grid, headers, bookmarks, source.id, savedBadge, openItem, toggleItem],
  );

  const showSuggestions = searching && (editing || !query);
  const sortLabel = engine.sorts.find(s => s.id === sort)?.label;
  const subtitle = genre ? `Thể loại: ${genre.name} · ${sortLabel}` : sortLabel;

  let footer = null;
  if (list.loadingMore) {
    footer = (
      <View style={styles.footer}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  } else if (list.moreError) {
    const challenge = isChallengeError(list.moreError) ? list.moreError : undefined;
    footer = (
      <View style={styles.footer}>
        <Text style={[font.caption, styles.center, { color: c.muted }]}>
          {challenge ? 'Trang tiếp theo cần xác minh trên trình duyệt.' : 'Không tải được trang tiếp theo.'}
        </Text>
        <View style={styles.footerActions}>
          {challenge && (
            <Button
              title="Xác minh"
              icon={ShieldAlert}
              variant="secondary"
              small
              onPress={() => navigation.push('Verify', { url: challenge.url })}
            />
          )}
          <Button title="Thử lại" icon={RotateCw} small onPress={list.retryMore} />
        </View>
      </View>
    );
  } else if (!list.hasNext && list.items.length > 0) {
    footer = <Text style={[font.caption, styles.end, { color: c.muted }]}>Đã hết danh sách</Text>;
  }

  let emptyMessage = 'Site không trả về truyện nào. Kéo xuống để làm mới hoặc kiểm tra thư mục danh sách trong cài đặt nguồn.';
  if (query) {
    emptyMessage = `Không có kết quả cho "${query}". Thử từ khoá ngắn hơn hoặc tên khác của truyện.`;
  } else if (genre) {
    emptyMessage = `Chưa có truyện nào trong thể loại ${genre.name}.`;
  }

  let content;
  if (list.status === 'error') {
    content = (
      <ErrorView
        error={list.error}
        onRetry={list.reload}
        url={isChallengeError(list.error) ? list.error.url : source.baseUrl}
      />
    );
  } else if (list.status !== 'ready') {
    content = <LoadingView label={query ? `Đang tìm "${query}"…` : 'Đang tải danh sách truyện…'} />;
  } else {
    content = (
      <FlashList
        key={`${layout}-${columns}`}
        data={list.items}
        numColumns={columns}
        renderItem={renderItem}
        keyExtractor={item => item.url}
        extraData={bookmarks}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.8}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={grid ? styles.gridContent : styles.listContent}
        ListHeaderComponent={
          query ? (
            <Text numberOfLines={1} style={[font.caption, styles.resultLabel, { color: c.muted }]}>
              Kết quả tìm "{query}" trên {source.name}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState icon={SearchX} title="Không tìm thấy truyện phù hợp" message={emptyMessage} style={styles.empty} />
        }
        ListFooterComponent={footer}
        refreshControl={
          <RefreshControl
            refreshing={list.refreshing}
            onRefresh={list.refresh}
            colors={[c.accent]}
            tintColor={c.accent}
            progressBackgroundColor={c.surface}
          />
        }
      />
    );
  }

  return (
    <Screen>
      {searching ? (
        <Header right={<IconButton icon={X} onPress={closeSearch} accessibilityLabel="Đóng tìm kiếm" />}>
          <SearchField
            value={input}
            onChangeText={setInput}
            onClear={() => setInput('')}
            onSubmitEditing={() => submit(input)}
            onFocus={() => setEditing(true)}
            onBlur={() => setEditing(false)}
            autoFocus={!initialQuery}
            placeholder="Tìm theo tên truyện"
          />
        </Header>
      ) : (
        <Header
          title={source.name}
          subtitle={subtitle}
          right={
            <>
              <IconButton icon={Search} onPress={() => setSearching(true)} accessibilityLabel="Tìm truyện" />
              <IconButton
                icon={grid ? List : LayoutGrid}
                onPress={() => setSettings({ catalogLayout: grid ? 'list' : 'grid' })}
                accessibilityLabel={grid ? 'Xem dạng danh sách' : 'Xem dạng lưới'}
              />
              <IconButton
                icon={Globe}
                onPress={() => openInBrowser(navigation, source.baseUrl, { newTab })}
                accessibilityLabel="Mở site trên trình duyệt"
              />
            </>
          }
        />
      )}

      {!searching && (
        <View style={[styles.toolbar, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
          <ChipRow>
            {genre && <Chip label={genre.name} icon={X} selected onPress={() => setGenre(undefined)} />}
            <Chip label={genre ? 'Đổi thể loại' : 'Lọc thể loại'} icon={Tags} onPress={() => setGenreOpen(true)} />
            <View style={[styles.separator, { backgroundColor: c.border }]} />
            {engine.sorts.map(option => (
              <Chip
                key={option.id}
                label={option.label}
                selected={sort === option.id}
                onPress={() => setSort(option.id)}
              />
            ))}
          </ChipRow>
        </View>
      )}

      <View style={styles.flex}>
        {content}
        {showSuggestions && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg }]}>
            <RecentSearches
              filter={input}
              onPick={submit}
              empty={
                <EmptyState
                  icon={Search}
                  title={`Tìm trong ${source.name}`}
                  message="Nhập tên truyện rồi bấm tìm trên bàn phím."
                />
              }
            />
          </View>
        )}
      </View>

      <GenreSheet
        visible={genreOpen}
        onClose={() => setGenreOpen(false)}
        source={source}
        selected={genre}
        onSelect={setGenre}
      />
    </Screen>
  );
}

const CatalogCell = memo(function CatalogCellItem({
  item,
  grid,
  headers,
  badges,
  onOpen,
  onToggle,
}: {
  item: MangaItem;
  grid: boolean;
  headers: Record<string, string>;
  badges?: CardBadge[];
  onOpen: (item: MangaItem) => void;
  onToggle: (item: MangaItem) => void;
}) {
  const Card = grid ? MangaGridItem : MangaListItem;
  return (
    <Card
      title={item.title}
      subtitle={item.subtitle}
      cover={item.cover}
      headers={headers}
      badges={badges}
      onPress={() => onOpen(item)}
      onLongPress={() => onToggle(item)}
    />
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  toolbar: { borderBottomWidth: StyleSheet.hairlineWidth },
  separator: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: 6 },
  gridContent: { paddingHorizontal: space.sm, paddingTop: space.sm },
  listContent: { paddingTop: space.xs },
  resultLabel: { paddingHorizontal: space.md, paddingBottom: space.sm },
  empty: { paddingTop: space.xl * 2 },
  footer: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl },
  footerActions: { flexDirection: 'row', gap: space.sm },
  end: { textAlign: 'center', paddingVertical: space.xl },
});
