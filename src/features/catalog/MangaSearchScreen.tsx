import { useRoute, type RouteProp } from '@react-navigation/native';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppNavigation, type RootStackParamList } from '../../app/routes';
import { MangaGridItem } from '../../components/MangaCard';
import { ChevronRight, Puzzle, RotateCw, Search, ShieldAlert } from '../../components/icons';
import { EmptyState, Header, IconButton, Screen, SearchField } from '../../components/ui';
import { errorMessage, isChallengeError } from '../../lib/http';
import { getEngine } from '../../sources';
import type { MangaItem, SourceConfig } from '../../sources/types';
import { useHistory } from '../../store/useHistory';
import { useAllowNsfw, useSettings } from '../../store/useSettings';
import { useSources } from '../../store/useSources';
import { font, radius, space, useTheme } from '../../theme';
import { Favicon } from '../../components/Favicon';
import { RecentSearches } from './RecentSearches';
import { useRequestToken } from './useRequestToken';

/** Số nguồn tìm song song — đủ nhanh mà không dồn quá nhiều request một lúc. */
const CONCURRENCY = 4;

type BlockState =
  | { status: 'queued' | 'loading' }
  | { status: 'done'; items: MangaItem[] }
  | { status: 'error'; error: unknown };

/** Khối có kết quả lên trước, rồi đang tìm, lỗi, cuối cùng là không có kết quả. */
function rank(state: BlockState | undefined): number {
  if (!state) {
    return 3;
  }
  switch (state.status) {
    case 'done':
      return state.items.length ? 0 : 3;
    case 'error':
      return 2;
    default:
      return 1;
  }
}

/** "Manga Search": tìm truyện trên mọi nguồn đang bật. */
export function MangaSearchScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'MangaSearch'>>();
  const initialQuery = route.params?.query?.trim() ?? '';
  const navigation = useAppNavigation();
  const { c } = useTheme();
  const sources = useSources(s => s.sources);
  const allowNsfw = useAllowNsfw();
  const addSearch = useHistory(s => s.addSearch);

  const [input, setInput] = useState(initialQuery);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(false);
  const [targets, setTargets] = useState<SourceConfig[]>([]);
  const [results, setResults] = useState<Record<string, BlockState>>({});
  const token = useRequestToken();
  const autoSearched = useRef(false);

  const available = useMemo(
    () => sources.filter(s => s.enabled && (allowNsfw || !s.nsfw)),
    [sources, allowNsfw],
  );

  const searchOne = useCallback(
    async (source: SourceConfig, q: string, t: number) => {
      setResults(prev => ({ ...prev, [source.id]: { status: 'loading' } }));
      try {
        const page = await getEngine(source.engine).search(source, q, 1);
        if (token.isCurrent(t)) {
          setResults(prev => ({ ...prev, [source.id]: { status: 'done', items: page.items } }));
        }
      } catch (error) {
        if (token.isCurrent(t)) {
          setResults(prev => ({ ...prev, [source.id]: { status: 'error', error } }));
        }
      }
    },
    [token],
  );

  const search = useCallback(
    (raw: string) => {
      const q = raw.trim();
      if (!q) {
        return;
      }
      Keyboard.dismiss();
      addSearch(q, 'manga');
      setInput(q);
      setQuery(q);
      setEditing(false);
      // Lượt mới: kết quả của từ khoá cũ về muộn sẽ bị bỏ.
      const t = token.next();
      // Đọc store lúc bấm tìm để hàm này ổn định (không chạy lại tìm tự động khi danh sách nguồn đổi).
      const { showNsfw, ageConfirmed } = useSettings.getState();
      const list = useSources
        .getState()
        .sources.filter(s => s.enabled && (!s.nsfw || (showNsfw && ageConfirmed)));
      setTargets(list);
      setResults(Object.fromEntries(list.map((s): [string, BlockState] => [s.id, { status: 'queued' }])));
      const queue = [...list];
      const worker = async () => {
        for (let source = queue.shift(); source && token.isCurrent(t); source = queue.shift()) {
          await searchOne(source, q, t);
        }
      };
      Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
    },
    [addSearch, searchOne, token],
  );

  useEffect(() => {
    if (!initialQuery || autoSearched.current) {
      return;
    }
    autoSearched.current = true;
    search(initialQuery);
    return () => {
      autoSearched.current = false;
    };
  }, [initialQuery, search]);

  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidHide', () => {
      Keyboard.dismiss();
      setEditing(false);
    });
    return () => sub.remove();
  }, []);

  const retry = useCallback(
    (source: SourceConfig) => searchOne(source, query, token.current()),
    [query, searchOne, token],
  );

  const ordered = useMemo(
    () =>
      targets
        .map((source, index) => ({ source, index, rank: rank(results[source.id]) }))
        .sort((a, b) => a.rank - b.rank || a.index - b.index)
        .map(entry => entry.source),
    [targets, results],
  );

  const pending = targets.filter(s => {
    const status = results[s.id]?.status;
    return status === 'queued' || status === 'loading';
  }).length;
  const found = targets.filter(s => rank(results[s.id]) === 0).length;

  const openItem = useCallback(
    (source: SourceConfig, item: MangaItem) =>
      navigation.navigate('MangaDetail', { sourceId: source.id, url: item.url, title: item.title, cover: item.cover }),
    [navigation],
  );
  const openMore = useCallback(
    (source: SourceConfig) => navigation.navigate('Catalog', { sourceId: source.id, query }),
    [navigation, query],
  );
  const verify = useCallback((url: string) => navigation.push('Verify', { url }), [navigation]);

  const showSuggestions = editing || !query;

  let body;
  if (showSuggestions) {
    body = (
      <RecentSearches
        filter={input}
        onPick={search}
        empty={
          available.length ? (
            <EmptyState
              icon={Search}
              title="Tìm truyện trên mọi nguồn"
              message={`Tìm cùng lúc trên ${available.length} nguồn đang bật.`}
            />
          ) : (
            <NoSources onManage={() => navigation.navigate('Addons')} />
          )
        }
      />
    );
  } else if (!targets.length) {
    body = <NoSources onManage={() => navigation.navigate('Addons')} />;
  } else {
    body = (
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.results}>
        <Text style={[font.caption, styles.summary, { color: c.muted }]}>
          {pending
            ? `Đang tìm "${query}"… đã xong ${targets.length - pending}/${targets.length} nguồn`
            : `"${query}": có kết quả trên ${found}/${targets.length} nguồn`}
        </Text>
        {ordered.map(source => (
          <SearchBlock
            key={source.id}
            source={source}
            state={results[source.id]}
            onOpen={openItem}
            onMore={openMore}
            onRetry={retry}
            onVerify={verify}
          />
        ))}
      </ScrollView>
    );
  }

  return (
    <Screen>
      <Header>
        <SearchField
          value={input}
          onChangeText={setInput}
          onClear={() => setInput('')}
          onSubmitEditing={() => search(input)}
          onFocus={() => setEditing(true)}
          onBlur={() => setEditing(false)}
          autoFocus={!initialQuery}
          placeholder="Tìm truyện trên mọi nguồn"
          style={[styles.headerSearch, { backgroundColor: c.appBarField }]}
          inputStyle={{ color: c.onAppBar }}
        />
      </Header>
      <View style={styles.flex}>{body}</View>
    </Screen>
  );
}

function NoSources({ onManage }: { onManage: () => void }) {
  return (
    <EmptyState
      icon={Puzzle}
      title="Chưa có nguồn nào đang bật"
      message="Thêm site hoặc bật lại nguồn trong phần quản lý addon để tìm truyện."
      action={{ label: 'Quản lý addon', onPress: onManage }}
    />
  );
}

const SearchBlock = memo(function SearchBlockItem({
  source,
  state,
  onOpen,
  onMore,
  onRetry,
  onVerify,
}: {
  source: SourceConfig;
  state: BlockState | undefined;
  onOpen: (source: SourceConfig, item: MangaItem) => void;
  onMore: (source: SourceConfig) => void;
  onRetry: (source: SourceConfig) => void;
  onVerify: (url: string) => void;
}) {
  const { c } = useTheme();
  const headers = useMemo(() => getEngine(source.engine).imageHeaders(source), [source]);
  const items = state?.status === 'done' ? state.items : [];
  const challenge = state?.status === 'error' && isChallengeError(state.error) ? state.error : undefined;

  let status;
  if (!state || state.status === 'queued' || state.status === 'loading') {
    status = (
      <View style={styles.status}>
        {state?.status === 'loading' && <ActivityIndicator size="small" color={c.accent} />}
        <Text style={[font.caption, { color: c.muted }]}>
          {state?.status === 'loading' ? 'Đang tìm…' : 'Đang chờ…'}
        </Text>
      </View>
    );
  } else if (state.status === 'error') {
    status = (
      <View style={styles.status}>
        <Text numberOfLines={1} style={[font.caption, styles.errorText, { color: c.danger }]}>
          {challenge ? 'Cần xác minh' : errorMessage(state.error)}
        </Text>
        {challenge && (
          <IconButton
            icon={ShieldAlert}
            size={18}
            color={c.accent}
            onPress={() => onVerify(challenge.url)}
            accessibilityLabel="Mở trang để xác minh"
          />
        )}
        <IconButton
          icon={RotateCw}
          size={18}
          color={c.muted}
          onPress={() => onRetry(source)}
          accessibilityLabel={`Thử lại ${source.name}`}
        />
      </View>
    );
  } else if (!items.length) {
    status = <Text style={[font.caption, { color: c.muted }]}>Không có kết quả</Text>;
  } else {
    status = (
      <Pressable onPress={() => onMore(source)} hitSlop={8} style={styles.status}>
        <Text style={[font.label, { color: c.accent }]}>Xem thêm</Text>
        <ChevronRight size={16} color={c.accent} />
      </Pressable>
    );
  }

  return (
    <View style={[styles.block, { backgroundColor: c.surface }]}>
      <View style={styles.blockHead}>
        <Favicon url={source.baseUrl} label={source.name} size={28} tile />
        <View style={styles.flex}>
          <Text numberOfLines={1} style={[font.label, { color: c.text }]}>
            {source.name}
          </Text>
          {items.length > 0 && (
            <Text style={[font.caption, { color: c.muted }]}>{items.length} kết quả ở trang đầu</Text>
          )}
        </View>
        {status}
      </View>
      {items.length > 0 && (
        <FlatList
          horizontal
          data={items}
          keyExtractor={item => item.url}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          initialNumToRender={4}
          renderItem={({ item }) => (
            <View style={styles.cell}>
              <MangaGridItem
                title={item.title}
                subtitle={item.subtitle}
                cover={item.cover}
                headers={headers}
                onPress={() => onOpen(source, item)}
              />
            </View>
          )}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerSearch: { marginRight: space.sm },
  results: { paddingVertical: space.md, gap: space.md },
  summary: { paddingHorizontal: space.lg },
  block: { marginHorizontal: space.md, borderRadius: radius.lg, paddingVertical: space.md },
  blockHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.md,
    paddingRight: space.sm,
    minHeight: 40,
  },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '55%' },
  errorText: { flexShrink: 1 },
  row: { paddingHorizontal: space.sm, paddingTop: space.sm },
  cell: { width: 112 },
});
