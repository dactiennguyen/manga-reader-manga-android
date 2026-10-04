import { useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import {
  Bookmark,
  LayoutGrid,
  List,
  ListFilter,
  Lock,
  Power,
  PowerOff,
  RotateCw,
  Search,
  SearchX,
  ShieldAlert,
  Tags,
  X,
} from '../../components/icons';
import { memo, useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { useAppNavigation, type RootStackParamList } from '../../app/routes';
import { AddonBar } from '../../components/AddressBarParts';
import { ErrorView } from '../../components/ErrorView';
import { Cover, gridColumns, MangaGridItem, type CoverRibbon } from '../../components/MangaCard';
import type { LucideIcon } from '../../components/icons';
import {
  Button,
  ChipRow,
  EmptyState,
  Header,
  IconButton,
  LoadingView,
  Screen,
  TabBar,
} from '../../components/ui';
import { isChallengeError } from '../../lib/http';
import { getEngine, mangaKey } from '../../sources';
import type { Genre, ListSort, MangaItem, SourceConfig } from '../../sources/types';
import { useHistory } from '../../store/useHistory';
import { useLibrary, type Bookmark as LibraryBookmark } from '../../store/useLibrary';
import { useAllowNsfw, useSettings } from '../../store/useSettings';
import { useSource, useSources } from '../../store/useSources';
import { font, radius, space, useTheme } from '../../theme';
import { CatalogFilterSheet } from './CatalogFilterSheet';
import { toggleQuickBookmark } from './quickBookmark';
import { usePagedList } from './usePagedList';

/** Nhãn tab ngắn như "Latest | Popular | Newest" của app gốc. */
const SORT_LABEL: Record<ListSort, string> = {
  latest: 'Mới nhất',
  popular: 'Phổ biến',
  new: 'Truyện mới',
  rating: 'Đánh giá',
  az: 'A-Z',
};

/** Đang xem kết quả tìm thì không tab sắp xếp nào được chọn. */
type CatalogTab = ListSort | 'search';

/** Truyện đã bookmark: góc "có chương mới" hoặc góc sách như bìa trong Bookmark. */
function ribbonOf(bookmark: LibraryBookmark | undefined): CoverRibbon | undefined {
  if (!bookmark) {
    return undefined;
  }
  return bookmark.newChapters ? 'new' : 'unread';
}

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
        icon={SearchX}
        heading="Không tìm thấy nguồn"
        message="Nguồn này đã bị xoá hoặc chưa được thêm."
        action={{ label: 'Site được hỗ trợ', onPress: () => navigation.navigate('Addons') }}
      />
    );
  }
  if (source.nsfw && !allowNsfw) {
    return (
      <Gate
        url={source.baseUrl}
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
        url={source.baseUrl}
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
  url,
  icon,
  heading,
  message,
  action,
}: {
  /** Có nguồn thì giữ thanh địa chỉ như các màn addon khác. */
  url?: string;
  icon: LucideIcon;
  heading: string;
  message: string;
  action: { label: string; onPress: () => void; icon?: LucideIcon };
}) {
  return (
    <Screen edges={url ? ['bottom'] : undefined}>
      {url ? <AddonBar url={url} /> : <Header title="Catalog" />}
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
  const bookmarks = useLibrary(s => s.bookmarks);
  const addSearch = useHistory(s => s.addSearch);

  const [sort, setSort] = useState<ListSort>(engine.sorts[0]?.id ?? 'latest');
  const [genre, setGenre] = useState<Genre | undefined>(initialGenre);
  const [query, setQuery] = useState(initialQuery?.trim() ?? '');
  // seq dựng lại sheet mỗi lần mở để ô tìm bắt đầu từ từ khoá hiện tại.
  const [filter, setFilter] = useState({ visible: false, seq: 0 });
  const filtered = !!query || !!genre;

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

  const search = useCallback(
    (q: string) => {
      addSearch(q, 'manga');
      setQuery(q);
      setGenre(undefined);
    },
    [addSearch],
  );
  const pickGenre = useCallback((next: Genre) => {
    setGenre(next);
    setQuery('');
  }, []);
  const clearFilters = useCallback(() => {
    setGenre(undefined);
    setQuery('');
  }, []);

  // Phím back khi đang xem kết quả tìm thì bỏ tìm trước (trừ khi mở sẵn với từ khoá).
  useFocusEffect(
    useCallback(() => {
      if (!query || initialQuery) {
        return;
      }
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        setQuery('');
        return true;
      });
      return () => sub.remove();
    }, [query, initialQuery]),
  );

  const tabs = useMemo(
    () => engine.sorts.map((s): { key: CatalogTab; label: string } => ({ key: s.id, label: SORT_LABEL[s.id] })),
    [engine],
  );
  const changeTab = useCallback(
    (key: CatalogTab) => {
      if (key === 'search') {
        return;
      }
      setSort(key);
      setQuery('');
    },
    [],
  );

  const grid = layout === 'grid';
  const columns = grid ? gridColumns(width) : 1;
  const headers = useMemo(() => engine.imageHeaders(source), [engine, source]);

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
        ribbon={ribbonOf(bookmarks[mangaKey(source.id, item.url)])}
        onOpen={openItem}
        onToggle={toggleItem}
      />
    ),
    [grid, headers, bookmarks, source.id, openItem, toggleItem],
  );

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
        contentContainerStyle={grid ? styles.gridContent : styles.listContent}
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
    <Screen edges={['bottom']}>
      <AddonBar url={source.baseUrl} />
      <TabBar
        tabs={tabs}
        value={query ? 'search' : sort}
        onChange={changeTab}
        right={
          <>
            <IconButton
              icon={Bookmark}
              onPress={() => navigation.navigate('Bookmarks', { tab: 'media' })}
              accessibilityLabel="Bookmark"
              style={styles.tool}
            />
            <IconButton
              icon={grid ? List : LayoutGrid}
              onPress={() => setSettings({ catalogLayout: grid ? 'list' : 'grid' })}
              accessibilityLabel={grid ? 'Xem dạng danh sách' : 'Xem dạng lưới'}
              style={styles.tool}
            />
            <IconButton
              icon={ListFilter}
              active={filtered}
              onPress={() => setFilter(f => ({ visible: true, seq: f.seq + 1 }))}
              accessibilityLabel="Tìm và lọc theo thể loại"
              style={styles.tool}
            />
          </>
        }
      />

      {filtered && (
        <View style={[styles.filters, { borderBottomColor: c.border }]}>
          <ChipRow style={styles.filterChips}>
            {!!query && (
              <FilterChip icon={Search} label={`"${query}"`} onRemove={() => setQuery('')} accessibilityLabel="Bỏ tìm kiếm" />
            )}
            {genre && (
              <FilterChip icon={Tags} label={genre.name} onRemove={() => setGenre(undefined)} accessibilityLabel="Bỏ lọc thể loại" />
            )}
          </ChipRow>
        </View>
      )}

      <View style={styles.flex}>{content}</View>

      {filter.seq > 0 && (
        <CatalogFilterSheet
          key={filter.seq}
          visible={filter.visible}
          onClose={() => setFilter(f => ({ ...f, visible: false }))}
          source={source}
          query={query}
          genre={genre}
          onSearch={search}
          onGenre={pickGenre}
          onClear={clearFilters}
        />
      )}
    </Screen>
  );
}

/** Chip bộ lọc đang áp dụng; bấm để bỏ. */
function FilterChip({
  icon: Icon,
  label,
  onRemove,
  accessibilityLabel,
}: {
  icon: LucideIcon;
  label: string;
  onRemove: () => void;
  accessibilityLabel: string;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onRemove}
      accessibilityRole="button"
      accessibilityLabel={`${accessibilityLabel}: ${label}`}
      style={({ pressed }) => [styles.filterChip, { backgroundColor: c.primaryContainer, opacity: pressed ? 0.8 : 1 }]}
    >
      <Icon size={14} color={c.onPrimaryContainer} />
      <Text numberOfLines={1} style={[styles.filterLabel, { color: c.onPrimaryContainer }]}>
        {label}
      </Text>
      <X size={14} color={c.onPrimaryContainer} strokeWidth={2.5} />
    </Pressable>
  );
}

const CatalogCell = memo(function CatalogCellItem({
  item,
  grid,
  headers,
  ribbon,
  onOpen,
  onToggle,
}: {
  item: MangaItem;
  grid: boolean;
  headers: Record<string, string>;
  ribbon?: CoverRibbon;
  onOpen: (item: MangaItem) => void;
  onToggle: (item: MangaItem) => void;
}) {
  if (grid) {
    return (
      <MangaGridItem
        title={item.title}
        cover={item.cover}
        headers={headers}
        ribbon={ribbon}
        onPress={() => onOpen(item)}
        onLongPress={() => onToggle(item)}
      />
    );
  }
  return (
    <CatalogRow
      item={item}
      headers={headers}
      saved={!!ribbon}
      onPress={() => onOpen(item)}
      onLongPress={() => onToggle(item)}
    />
  );
});

/** Dòng chế độ danh sách như app gốc: bìa nhỏ, tên đậm, dòng phụ. */
function CatalogRow({
  item,
  headers,
  saved,
  onPress,
  onLongPress,
}: {
  item: MangaItem;
  headers: Record<string, string>;
  saved: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} android_ripple={{ color: c.border }} style={styles.row}>
      <Cover uri={item.cover} headers={headers} style={styles.rowCover} />
      <View style={styles.rowBody}>
        <Text numberOfLines={2} style={[styles.rowTitle, { color: c.text }]}>
          {item.title}
        </Text>
        {!!item.subtitle && (
          <Text numberOfLines={1} style={[font.caption, { color: c.muted }]}>
            {item.subtitle}
          </Text>
        )}
      </View>
      {saved && <Bookmark size={18} color={c.badgeUnread} fill={c.badgeUnread} accessibilityLabel="Đã bookmark" />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  tool: { width: 40 },
  filters: { borderBottomWidth: StyleSheet.hairlineWidth },
  filterChips: { paddingVertical: 6 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
    maxWidth: 260,
    paddingHorizontal: 10,
    borderRadius: radius.sm + 2,
  },
  filterLabel: { flexShrink: 1, fontSize: 13, fontWeight: '600' },
  gridContent: { paddingHorizontal: space.xs, paddingTop: space.sm },
  listContent: { paddingVertical: space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  rowCover: { width: 56, borderRadius: radius.sm },
  rowBody: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 14, lineHeight: 19, fontWeight: '700' },
  empty: { paddingTop: space.xl * 2 },
  footer: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl },
  footerActions: { flexDirection: 'row', gap: space.sm },
  end: { textAlign: 'center', paddingVertical: space.xl },
});
