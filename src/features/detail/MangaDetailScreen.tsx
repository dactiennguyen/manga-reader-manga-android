import { useRoute, type RouteProp } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { BookOpen, SearchX } from 'lucide-react-native';
import { memo, useCallback, useMemo, useState } from 'react';
import { RefreshControl, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { openInBrowser, useAppNavigation, type RootStackParamList } from '../../app/routes';
import { ErrorView } from '../../components/ErrorView';
import { gridColumns, MangaGridItem } from '../../components/MangaCard';
import { EmptyState, Header, LoadingView, Screen, TabBar, toast } from '../../components/ui';
import { getEngine, mangaKey } from '../../sources';
import type { Chapter, Genre, MangaItem, SourceConfig } from '../../sources/types';
import { getProgress, useProgress } from '../../store/progress';
import { useDownloads, type DownloadManga } from '../../store/useDownloads';
import { useIsBookmarked } from '../../store/useLibrary';
import { useAllowNsfw, useSettings } from '../../store/useSettings';
import { useSource } from '../../store/useSources';
import { font, space, useTheme } from '../../theme';
import { BookmarkDialog, type BookmarkTarget } from './BookmarkDialog';
import { ChapterRow } from './ChapterRow';
import { readTarget, scanlatorGroups } from './chapters';
import { ChapterToolbar } from './ChapterToolbar';
import { DetailHero } from './DetailHero';
import { DownloadChapterDialog } from './DownloadChapterDialog';
import { MarkChapterDialog, type ChapterTarget } from './MarkChapterDialog';
import { useMangaDetail } from './useMangaDetail';

type DetailParams = RootStackParamList['MangaDetail'];

type Row =
  | { type: 'chapter'; chapter: Chapter; index: number }
  | { type: 'similar'; key: string; items: MangaItem[] };

type Tab = 'chapters' | 'similar';

const NO_CHAPTERS: Chapter[] = [];
const NO_ITEMS: MangaItem[] = [];
const NO_ROWS: Row[] = [];

/** Sheet dựng lại mỗi lần mở (key = seq) để trạng thái bên trong luôn mới. */
function useSheetState() {
  const [state, setState] = useState({ visible: false, seq: 0 });
  const open = useCallback(() => setState(s => ({ visible: true, seq: s.seq + 1 })), []);
  const close = useCallback(() => setState(s => ({ ...s, visible: false })), []);
  return { ...state, open, close };
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/** "Manga Detail" (widget catalogdetail). */
export function MangaDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'MangaDetail'>>();
  const source = useSource(route.params.sourceId);
  const navigation = useAppNavigation();

  if (!source) {
    return (
      <Screen>
        <Header title={route.params.title ?? 'Chi tiết truyện'} />
        <EmptyState
          icon={SearchX}
          title="Không tìm thấy nguồn"
          message="Nguồn của truyện này đã bị xoá. Thêm lại site để tiếp tục đọc."
          action={{ label: 'Quản lý addon', onPress: () => navigation.navigate('Addons') }}
        />
      </Screen>
    );
  }
  return (
    <DetailBody key={`${route.params.sourceId}|${route.params.url}`} source={source} params={route.params} />
  );
}

function DetailBody({ source, params }: { source: SourceConfig; params: DetailParams }) {
  const navigation = useAppNavigation();
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const allowNsfw = useAllowNsfw();
  const newTab = useSettings(s => s.openNativeLinksInNewTab);
  const key = useMemo(() => mangaKey(source.id, params.url), [source.id, params.url]);
  const sourceLocked = source.nsfw && !allowNsfw;
  const { detail, error, loading, refreshing, refresh, retry } = useMangaDetail(
    source.id,
    params.url,
    key,
    !sourceLocked,
  );
  const locked = !allowNsfw && (source.nsfw || !!detail?.nsfw);
  const progress = useProgress(key);
  const bookmarked = useIsBookmarked(key);
  const headers = useMemo(() => getEngine(source.engine).imageHeaders(source), [source]);

  const title = detail?.title || params.title || 'Đang tải…';
  const cover = detail?.cover ?? params.cover;
  const chapters = detail?.chapters ?? NO_CHAPTERS;
  const similar = detail?.similar ?? NO_ITEMS;

  const [tab, setTab] = useState<Tab>('chapters');
  const [ascending, setAscending] = useState(false);
  const [scanlator, setScanlator] = useState<string | null>(null);
  const [markTarget, setMarkTarget] = useState<ChapterTarget>();
  const [markOpen, setMarkOpen] = useState(false);
  const bookmarkSheet = useSheetState();
  const downloadSheet = useSheetState();

  const groups = useMemo(() => scanlatorGroups(chapters), [chapters]);
  const activeGroup = scanlator && groups.some(g => g.name === scanlator) ? scanlator : null;

  const chapterRows = useMemo(() => {
    const rows: Row[] = [];
    chapters.forEach((chapter, index) => {
      if (!activeGroup || chapter.scanlator === activeGroup) {
        rows.push({ type: 'chapter', chapter, index });
      }
    });
    return ascending ? rows.reverse() : rows;
  }, [chapters, activeGroup, ascending]);

  const columns = gridColumns(width);
  const similarRows = useMemo<Row[]>(
    () => chunk(similar, columns).map((items, i) => ({ type: 'similar', key: `similar-${i}`, items })),
    [similar, columns],
  );

  const showSimilar = tab === 'similar' && similar.length > 0;
  let data = chapterRows;
  if (locked) {
    data = NO_ROWS;
  } else if (showSimilar) {
    data = similarRows;
  }

  const unread = useMemo(
    () => chapters.reduce((n, ch) => (progress.read[ch.url] ? n : n + 1), 0),
    [chapters, progress.read],
  );
  const target = useMemo(() => readTarget(chapters, progress), [chapters, progress]);

  // Chương đang đọc dở (chưa đánh dấu xong) để tô nổi trong danh sách.
  const last = progress.last;
  const currentUrl = last && !progress.read[last.chapterUrl] ? last.chapterUrl : undefined;
  const percent = last?.total ? Math.min(100, Math.round(((last.page + 1) / last.total) * 100)) : undefined;
  const currentInfo = useMemo(() => ({ percent }), [percent]);

  const downloadManga = useMemo<DownloadManga>(
    () => ({
      mangaKey: key,
      sourceId: source.id,
      mangaUrl: params.url,
      mangaTitle: title,
      cover,
      content: source.content,
    }),
    [key, source.id, source.content, params.url, title, cover],
  );

  const bookmarkTarget = useMemo<BookmarkTarget>(
    () => ({
      key,
      sourceId: source.id,
      url: params.url,
      title,
      cover,
      content: source.content,
      nsfw: source.nsfw || detail?.nsfw,
      chapters,
    }),
    [key, source.id, source.content, source.nsfw, params.url, title, cover, detail?.nsfw, chapters],
  );

  const openWeb = useCallback(
    (url: string) => openInBrowser(navigation, url, { newTab }),
    [navigation, newTab],
  );

  const openChapter = useCallback(
    (chapter: Chapter) => {
      // Chỉ mở lại đúng trang khi đây là chương đang đọc dở.
      const p = getProgress(key);
      const resume = p.last?.chapterUrl === chapter.url && !p.read[chapter.url] ? p.last.page : undefined;
      if (source.content === 'novel') {
        navigation.navigate('NovelReader', {
          sourceId: source.id,
          mangaUrl: params.url,
          chapterUrl: chapter.url,
          paragraph: resume,
        });
      } else {
        navigation.navigate('Reader', {
          sourceId: source.id,
          mangaUrl: params.url,
          chapterUrl: chapter.url,
          page: resume,
        });
      }
    },
    [key, navigation, source.content, source.id, params.url],
  );

  const openMark = useCallback((chapter: Chapter, index: number) => {
    setMarkTarget({ chapter, index });
    setMarkOpen(true);
  }, []);

  const downloadOne = useCallback(
    (chapter: Chapter) => {
      const added = useDownloads.getState().enqueue(downloadManga, [chapter]);
      toast(added ? 'Đã thêm chương vào hàng đợi tải' : 'Chương này đã có trong hàng đợi tải');
    },
    [downloadManga],
  );

  const openSimilar = useCallback(
    (item: MangaItem) =>
      // Cùng tên màn: push để có màn mới thay vì đổi tham số màn hiện tại.
      navigation.push('MangaDetail', { sourceId: source.id, url: item.url, title: item.title, cover: item.cover }),
    [navigation, source.id],
  );

  const share = useCallback(() => {
    Share.share({ title, message: `${title}\n${params.url}` }).catch(() => {});
  }, [title, params.url]);

  const renderItem = useCallback(
    ({ item }: { item: Row }) => {
      if (item.type === 'similar') {
        return (
          <SimilarRow items={item.items} columns={columns} headers={headers} blur={!allowNsfw && source.nsfw} onOpen={openSimilar} />
        );
      }
      const url = item.chapter.url;
      return (
        <ChapterRow
          chapter={item.chapter}
          index={item.index}
          mangaKey={key}
          read={!!progress.read[url]}
          current={url === currentUrl ? currentInfo : undefined}
          onPress={openChapter}
          onLongPress={openMark}
        />
      );
    },
    [columns, headers, allowNsfw, source.nsfw, openSimilar, key, progress.read, currentUrl, currentInfo, openChapter, openMark],
  );

  const tabs = useMemo(
    () => [
      { key: 'chapters' as const, label: `Chương (${chapters.length})` },
      { key: 'similar' as const, label: 'Truyện tương tự' },
    ],
    [chapters.length],
  );

  const listHeader = (
    <View>
      <DetailHero
        source={source}
        title={title}
        cover={cover}
        headers={headers}
        detail={detail}
        locked={locked}
        loading={!detail && !error}
        bookmarked={bookmarked}
        target={target}
        onRead={() => target && openChapter(target.chapter)}
        onBookmark={bookmarkSheet.open}
        onDownload={downloadSheet.open}
        onOpenWeb={() => openWeb(params.url)}
        onShare={share}
        onGenre={(genre: Genre) => navigation.navigate('Catalog', { sourceId: source.id, genre })}
        onSource={() => navigation.navigate('Catalog', { sourceId: source.id })}
        onUnlock={() => navigation.navigate('Settings')}
      />
      {!locked && !!detail && (
        <>
          {similar.length > 0 ? (
            <TabBar tabs={tabs} value={showSimilar ? 'similar' : 'chapters'} onChange={setTab} />
          ) : (
            <View style={[styles.sectionHead, { borderTopColor: c.border }]}>
              <Text style={[font.heading, { color: c.text }]}>Danh sách chương</Text>
            </View>
          )}
          {!showSimilar && chapters.length > 0 && (
            <ChapterToolbar
              count={chapterRows.length}
              unread={unread}
              ascending={ascending}
              onToggleOrder={() => setAscending(v => !v)}
              groups={groups}
              activeGroup={activeGroup}
              onSelectGroup={setScanlator}
            />
          )}
        </>
      )}
    </View>
  );

  let empty = null;
  if (!locked) {
    if (!detail && error) {
      empty = <ErrorView error={error} onRetry={retry} url={params.url} style={styles.inline} />;
    } else if (!detail) {
      empty = loading ? <LoadingView label="Đang tải danh sách chương…" style={styles.inline} /> : null;
    } else if (!chapters.length) {
      empty = (
        <EmptyState
          icon={BookOpen}
          title="Chưa có chương nào"
          message="Site chưa đăng chương hoặc addon không đọc được danh sách chương của truyện này."
          action={{ label: 'Mở trang gốc', onPress: () => openWeb(params.url) }}
          style={styles.inline}
        />
      );
    }
  }

  return (
    <Screen>
      <Header title={title} subtitle={source.name} />
      <FlashList
        data={data}
        renderItem={renderItem}
        keyExtractor={item => (item.type === 'chapter' ? item.chapter.url : item.key)}
        getItemType={item => item.type}
        extraData={progress}
        // Đảo thứ tự/đổi tab thay cả danh sách: không neo theo dòng đang thấy kẻo nhảy tới cuối.
        maintainVisibleContentPosition={{ disabled: true }}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={empty}
        ListFooterComponent={<View style={styles.footer} />}
        refreshControl={
          sourceLocked ? undefined : (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              colors={[c.accent]}
              tintColor={c.accent}
              progressBackgroundColor={c.surface}
            />
          )
        }
      />

      {bookmarkSheet.seq > 0 && (
        <BookmarkDialog
          key={bookmarkSheet.seq}
          visible={bookmarkSheet.visible}
          onClose={bookmarkSheet.close}
          target={bookmarkTarget}
        />
      )}
      {downloadSheet.seq > 0 && (
        <DownloadChapterDialog
          key={downloadSheet.seq}
          visible={downloadSheet.visible}
          onClose={downloadSheet.close}
          manga={downloadManga}
          chapters={chapters}
        />
      )}
      <MarkChapterDialog
        visible={markOpen}
        onClose={() => setMarkOpen(false)}
        target={markTarget}
        chapters={chapters}
        mangaKey={key}
        onDownload={downloadOne}
        onOpenWeb={chapter => openWeb(chapter.url)}
      />
    </Screen>
  );
}

const SimilarRow = memo(function SimilarRowItem({
  items,
  columns,
  headers,
  blur,
  onOpen,
}: {
  items: MangaItem[];
  columns: number;
  headers: Record<string, string>;
  blur: boolean;
  onOpen: (item: MangaItem) => void;
}) {
  return (
    <View style={styles.similarRow}>
      {items.map(item => (
        <MangaGridItem
          key={item.url}
          title={item.title}
          subtitle={item.subtitle}
          cover={item.cover}
          headers={headers}
          blur={blur}
          onPress={() => onOpen(item)}
        />
      ))}
      {Array.from({ length: Math.max(0, columns - items.length) }, (_, i) => (
        <View key={`filler-${i}`} style={styles.filler} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  sectionHead: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inline: { flex: 0, paddingVertical: space.xl },
  footer: { height: space.xl },
  similarRow: { flexDirection: 'row', paddingHorizontal: space.sm },
  filler: { flex: 1 },
});
