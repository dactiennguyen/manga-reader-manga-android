import { useRoute, type RouteProp } from '@react-navigation/native';
import { BookOpen, Globe, SearchX, Trash2 } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';

import { openInBrowser, useAppNavigation, type RootStackParamList } from '../../app/routes';
import { Dialog, Sheet } from '../../components/Sheet';
import {
  Checkbox,
  EmptyState,
  Header,
  IconButton,
  ListItem,
  Screen,
  SearchField,
  TabBar,
  confirm,
  toast,
} from '../../components/ui';
import { dayKey, dayKeyToDate, groupByDay } from '../../lib/time';
import { getEngine } from '../../sources';
import { clearAllProgress, getProgress } from '../../store/progress';
import { useHistory, type ReadingEntry, type WebEntry } from '../../store/useHistory';
import { useLibrary } from '../../store/useLibrary';
import { useAllowNsfw } from '../../store/useSettings';
import { getSource, useSources } from '../../store/useSources';
import { font, space, useTheme } from '../../theme';
import { refreshUnread } from '../library/updates';
import { ReadingHistoryItem, WebHistoryItem } from './HistoryItems';

type Tab = 'reading' | 'web';

const TABS = [
  { key: 'reading', label: 'Đọc truyện' },
  { key: 'web', label: 'Duyệt web' },
] as const;

const HOUR_MS = 60 * 60 * 1000;

export function HistoryScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'History'>>();
  const [tab, setTab] = useState<Tab>(route.params?.tab ?? 'reading');
  const [query, setQuery] = useState('');
  const [clearReadingOpen, setClearReadingOpen] = useState(false);
  const [clearWebOpen, setClearWebOpen] = useState(false);
  const readingCount = useHistory(s => s.reading.length);
  const webCount = useHistory(s => s.web.length);
  const hasItems = tab === 'reading' ? readingCount > 0 : webCount > 0;

  return (
    <Screen>
      <Header
        title="Lịch sử"
        right={
          <IconButton
            icon={Trash2}
            disabled={!hasItems}
            onPress={() => (tab === 'reading' ? setClearReadingOpen(true) : setClearWebOpen(true))}
            accessibilityLabel={tab === 'reading' ? 'Xoá lịch sử đọc' : 'Xoá lịch sử duyệt web'}
          />
        }
      />
      <TabBar
        tabs={TABS}
        value={tab}
        onChange={next => {
          setTab(next);
          setQuery('');
        }}
      />
      {hasItems && (
        <View style={styles.search}>
          <SearchField
            value={query}
            onChangeText={setQuery}
            onClear={() => setQuery('')}
            placeholder={tab === 'reading' ? 'Lọc theo tên truyện, chương…' : 'Lọc theo tiêu đề, địa chỉ…'}
          />
        </View>
      )}
      {tab === 'reading' ? <ReadingHistory query={query} /> : <WebHistory query={query} />}

      <ClearReadingDialog visible={clearReadingOpen} onClose={() => setClearReadingOpen(false)} />
      <ClearWebSheet visible={clearWebOpen} onClose={() => setClearWebOpen(false)} />
    </Screen>
  );
}

function SectionHeader({ title }: { title: string }) {
  const { c } = useTheme();
  return (
    <View style={[styles.sectionHeader, { backgroundColor: c.bg }]}>
      <Text style={[font.overline, { color: c.muted }]}>{title}</Text>
    </View>
  );
}

function NoMatch() {
  return <EmptyState icon={SearchX} title="Không tìm thấy kết quả" message="Thử từ khoá khác." />;
}

// ─── Lịch sử đọc ────────────────────────────────────────────────────────────

function ReadingHistory({ query }: { query: string }) {
  const navigation = useAppNavigation();
  const reading = useHistory(s => s.reading);
  const removeReading = useHistory(s => s.removeReading);
  const sources = useSources(s => s.sources);
  const allowNsfw = useAllowNsfw();

  const sourceInfo = useMemo(() => {
    const map: Record<string, { headers: Record<string, string>; nsfw: boolean }> = {};
    for (const src of sources) {
      map[src.id] = { headers: getEngine(src.engine).imageHeaders(src), nsfw: src.nsfw };
    }
    return map;
  }, [sources]);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? reading.filter(e => e.title.toLowerCase().includes(q) || e.chapterName.toLowerCase().includes(q))
      : reading;
    return groupByDay(list, e => e.at);
  }, [reading, query]);

  const open = useCallback(
    (entry: ReadingEntry) => {
      if (!getSource(entry.sourceId)) {
        toast('Nguồn của truyện này đã bị xoá. Thêm lại site trong Addon để đọc tiếp.');
        return;
      }
      const last = getProgress(entry.key).last;
      const position = last && last.chapterUrl === entry.chapterUrl ? last.page : undefined;
      const base = { sourceId: entry.sourceId, mangaUrl: entry.mangaUrl, chapterUrl: entry.chapterUrl };
      if (entry.content === 'novel') {
        navigation.navigate('NovelReader', { ...base, paragraph: position });
      } else {
        navigation.navigate('Reader', { ...base, page: position });
      }
    },
    [navigation],
  );

  const openDetail = useCallback(
    (entry: ReadingEntry) =>
      navigation.navigate('MangaDetail', {
        sourceId: entry.sourceId,
        url: entry.mangaUrl,
        title: entry.title,
        cover: entry.cover,
      }),
    [navigation],
  );

  const remove = useCallback((entry: ReadingEntry) => removeReading([entry.key]), [removeReading]);

  if (!reading.length) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Chưa có lịch sử"
        message="Truyện bạn đọc sẽ xuất hiện ở đây để đọc tiếp nhanh."
      />
    );
  }
  if (!sections.length) {
    return <NoMatch />;
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={item => item.key}
      renderSectionHeader={({ section }) => <SectionHeader title={section.title} />}
      renderItem={({ item }) => (
        <ReadingHistoryItem
          entry={item}
          headers={sourceInfo[item.sourceId]?.headers}
          blur={!!sourceInfo[item.sourceId]?.nsfw && !allowNsfw}
          onOpen={open}
          onOpenDetail={openDetail}
          onRemove={remove}
        />
      )}
      stickySectionHeadersEnabled
      keyboardShouldPersistTaps="handled"
      initialNumToRender={12}
      windowSize={9}
      contentContainerStyle={styles.list}
    />
  );
}

function ClearReadingDialog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [withProgress, setWithProgress] = useState(false);
  const clear = () => {
    useHistory.getState().clearReading();
    if (withProgress) {
      clearAllProgress();
      for (const key of Object.keys(useLibrary.getState().bookmarks)) {
        refreshUnread(key);
      }
    }
    onClose();
    setWithProgress(false);
    toast('Đã xoá lịch sử đọc');
  };
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title="Xoá lịch sử đọc"
      message="Toàn bộ lịch sử đọc truyện sẽ bị xoá."
      actions={[
        { label: 'Huỷ', onPress: onClose },
        { label: 'Xoá', variant: 'danger', onPress: clear },
      ]}
    >
      <Checkbox
        checked={withProgress}
        onChange={setWithProgress}
        label="Xoá cả tiến độ đọc của truyện (kể cả truyện đã bookmark)"
      />
    </Dialog>
  );
}

// ─── Lịch sử duyệt web ──────────────────────────────────────────────────────

function WebHistory({ query }: { query: string }) {
  const navigation = useAppNavigation();
  const web = useHistory(s => s.web);
  const removeWeb = useHistory(s => s.removeWeb);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? web.filter(e => e.title.toLowerCase().includes(q) || e.url.toLowerCase().includes(q))
      : web;
    return groupByDay(list, e => e.at);
  }, [web, query]);

  const open = useCallback((entry: WebEntry) => openInBrowser(navigation, entry.url), [navigation]);
  const remove = useCallback((entry: WebEntry) => removeWeb([{ url: entry.url, at: entry.at }]), [removeWeb]);

  if (!web.length) {
    return (
      <EmptyState
        icon={Globe}
        title="Chưa có lịch sử"
        message="Các trang bạn mở trong trình duyệt sẽ xuất hiện ở đây. Tab ẩn danh không được ghi lại."
      />
    );
  }
  if (!sections.length) {
    return <NoMatch />;
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={item => `${item.at}|${item.url}`}
      renderSectionHeader={({ section }) => <SectionHeader title={section.title} />}
      renderItem={({ item }) => <WebHistoryItem entry={item} onOpen={open} onRemove={remove} />}
      stickySectionHeadersEnabled
      keyboardShouldPersistTaps="handled"
      initialNumToRender={16}
      windowSize={9}
      contentContainerStyle={styles.list}
    />
  );
}

function ClearWebSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const clear = async (label: string, since?: number) => {
    onClose();
    const ok = await confirm('Xoá lịch sử duyệt web', `Xoá lịch sử duyệt web của ${label.toLowerCase()}?`, {
      confirmText: 'Xoá',
      destructive: true,
    });
    if (ok) {
      useHistory.getState().clearWeb(since);
      toast('Đã xoá lịch sử duyệt web');
    }
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Xoá lịch sử duyệt web" subtitle="Chọn khoảng thời gian">
      <ListItem title="1 giờ qua" onPress={() => clear('1 giờ qua', Date.now() - HOUR_MS)} />
      <ListItem
        title="Hôm nay"
        onPress={() => clear('Hôm nay', dayKeyToDate(dayKey()).getTime())}
      />
      <ListItem title="Toàn bộ" destructive onPress={() => clear('Toàn bộ thời gian')} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  search: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xs },
  sectionHeader: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xs },
  list: { paddingBottom: space.xl },
});
