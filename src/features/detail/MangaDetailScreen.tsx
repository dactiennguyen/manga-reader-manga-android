import { useRoute, type RouteProp } from '@react-navigation/native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, Share, StyleSheet, View, useWindowDimensions } from 'react-native';

import { openInBrowser, useAppNavigation, type RootStackParamList } from '../../app/routes';
import { AddonBar } from '../../components/AddressBarParts';
import { ErrorView } from '../../components/ErrorView';
import { MangaGridItem } from '../../components/MangaCard';
import { Bookmark, BookmarkPlus, BookOpen, Lock, Play, SearchX, X } from '../../components/icons';
import { EmptyState, Fab, Header, IconButton, LoadingView, Screen, TabBar, toast } from '../../components/ui';
import { getEngine, mangaKey } from '../../sources';
import type { Chapter, Genre, MangaItem, SourceConfig } from '../../sources/types';
import { getProgress, useProgress } from '../../store/progress';
import { useDownloads, type DownloadManga } from '../../store/useDownloads';
import { useIsBookmarked } from '../../store/useLibrary';
import { useAllowNsfw, useSettings } from '../../store/useSettings';
import { useSource } from '../../store/useSources';
import { space, useTheme } from '../../theme';
import { BookmarkDialog, type BookmarkTarget } from './BookmarkDialog';
import { ChapterRow } from './ChapterRow';
import { READ_LABEL, readTarget, scanlatorGroups } from './chapters';
import { ChapterSummaryDialog } from './ChapterSummaryDialog';
import { ChapterToolbar } from './ChapterToolbar';
import { DetailBottomBar, DetailMenu, ToolButton } from './DetailActions';
import { DetailInfo } from './DetailInfo';
import { DownloadChapterDialog } from './DownloadChapterDialog';
import { MarkChapterDialog, type ChapterTarget } from './MarkChapterDialog';
import { useMangaDetail } from './useMangaDetail';

type DetailParams = RootStackParamList['MangaDetail'];

type Row =
  | { type: 'chapter'; chapter: Chapter; index: number }
  | { type: 'similar'; items: MangaItem[] };

type Tab = 'info' | 'chapters';

const TABS: { key: Tab; label: string }[] = [
  { key: 'info', label: 'Mô tả' },
  { key: 'chapters', label: 'Chương' },
];

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
          action={{ label: 'Site được hỗ trợ', onPress: () => navigation.navigate('Addons') }}
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
  const pageUrl = detail?.url ?? params.url;

  const listRef = useRef<FlashListRef<Row>>(null);
  const [tab, setTab] = useState<Tab>('info');
  const [ascending, setAscending] = useState(false);
  const [scanlator, setScanlator] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [markTarget, setMarkTarget] = useState<ChapterTarget>();
  const [markOpen, setMarkOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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

  // "Similar Manga" là một dải cuộn ngang như app gốc, rộng vừa ~3,4 bìa để thấy là cuộn được.
  const similarWidth = Math.min(140, Math.max(100, Math.floor(width / 3.4)));
  const similarRows = useMemo<Row[]>(() => (similar.length ? [{ type: 'similar', items: similar }] : []), [similar]);

  let data = NO_ROWS;
  if (!locked) {
    data = tab === 'chapters' ? chapterRows : similarRows;
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

  const openCatalog = useCallback(
    (genre?: Genre) => navigation.navigate('Catalog', genre ? { sourceId: source.id, genre } : { sourceId: source.id }),
    [navigation, source.id],
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

  const read = useCallback(() => target && openChapter(target.chapter), [target, openChapter]);

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

  // Đổi tab thay cả nội dung danh sách: về đầu để không đứng giữa chừng.
  const switchTab = useCallback((next: Tab) => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    setTab(next);
  }, []);

  const toggleOrder = useCallback(() => {
    setAscending(v => !v);
    switchTab('chapters');
  }, [switchTab]);

  const renderItem = useCallback(
    ({ item }: { item: Row }) => {
      if (item.type === 'similar') {
        return (
          <SimilarRow
            items={item.items}
            itemWidth={similarWidth}
            headers={headers}
            blur={!allowNsfw && source.nsfw}
            onOpen={openSimilar}
          />
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
    [
      similarWidth,
      headers,
      allowNsfw,
      source.nsfw,
      openSimilar,
      key,
      progress.read,
      currentUrl,
      currentInfo,
      openChapter,
      openMark,
    ],
  );

  let listHeader = null;
  let empty = null;
  if (tab === 'info') {
    listHeader = (
      <DetailInfo
        source={source}
        url={params.url}
        title={title}
        cover={cover}
        headers={headers}
        detail={detail}
        error={error}
        locked={locked}
        hasSimilar={!locked && similar.length > 0}
        onRetry={retry}
        onGenre={openCatalog}
        onSource={() => openCatalog()}
        onUnlock={() => navigation.navigate('Settings')}
      />
    );
  } else if (locked) {
    empty = (
      <EmptyState
        icon={Lock}
        title="Nội dung 18+"
        message="Bật hiển thị nội dung 18+ và xác nhận đủ tuổi trong Cài đặt để xem danh sách chương."
        action={{ label: 'Mở Cài đặt', onPress: () => navigation.navigate('Settings') }}
        style={styles.inline}
      />
    );
  } else if (!detail && error) {
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
  } else {
    listHeader = (
      <ChapterToolbar
        count={chapterRows.length}
        unread={unread}
        ascending={ascending}
        onToggleOrder={() => setAscending(v => !v)}
        groups={groups}
        activeGroup={activeGroup}
        onSelectGroup={setScanlator}
        onSummary={() => setSummaryOpen(true)}
      />
    );
  }

  return (
    <Screen edges={[]}>
      <AddonBar url={pageUrl} onMenu={() => setMenuOpen(true)} />
      <TabBar
        tabs={TABS}
        value={tab}
        onChange={switchTab}
        right={
          <>
            <ToolButton
              icon={bookmarked ? Bookmark : BookmarkPlus}
              filled={bookmarked}
              color={bookmarked ? c.accent : undefined}
              disabled={locked}
              onPress={bookmarkSheet.open}
              accessibilityLabel={bookmarked ? 'Đã lưu bookmark' : 'Thêm vào bookmark'}
            />
            <IconButton icon={X} size={24} onPress={() => navigation.goBack()} accessibilityLabel="Đóng" />
          </>
        }
      />

      <View style={styles.flex}>
        <FlashList
          ref={listRef}
          data={data}
          renderItem={renderItem}
          keyExtractor={item => (item.type === 'chapter' ? item.chapter.url : 'similar')}
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
        {!locked && target && (
          <Fab icon={Play} label={READ_LABEL[target.kind]} onPress={read} style={styles.fab} />
        )}
      </View>

      <DetailBottomBar
        bookmarked={bookmarked}
        ascending={ascending}
        locked={locked}
        hasChapters={chapters.length > 0}
        canRead={!!target}
        onBookmark={bookmarkSheet.open}
        onDownload={downloadSheet.open}
        onRead={read}
        onToggleOrder={toggleOrder}
      />

      <DetailMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        url={pageUrl}
        sourceName={source.name}
        onOpenWeb={() => openWeb(pageUrl)}
        onShare={share}
        onCatalog={() => openCatalog()}
        onSourceSettings={() => navigation.navigate('SourceSettings', { sourceId: source.id })}
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
      <ChapterSummaryDialog
        visible={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        mangaKey={key}
        chapters={chapters}
      />
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
  itemWidth,
  headers,
  blur,
  onOpen,
}: {
  items: MangaItem[];
  itemWidth: number;
  headers: Record<string, string>;
  blur: boolean;
  onOpen: (item: MangaItem) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.similarRow}>
      {items.map(item => (
        <View key={item.url} style={{ width: itemWidth }}>
          <MangaGridItem
            title={item.title}
            cover={item.cover}
            headers={headers}
            blur={blur}
            onPress={() => onOpen(item)}
          />
        </View>
      ))}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  inline: { flex: 0, paddingVertical: space.xl },
  // Chừa chỗ cho nút nổi "Bắt đầu đọc".
  footer: { height: 96 },
  fab: { bottom: space.lg },
  similarRow: { paddingHorizontal: space.lg - 6, paddingTop: space.sm },
});
