import { useRoute, type RouteProp } from '@react-navigation/native';
import { ArrowUpDown, LayoutGrid, List, RefreshCw } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { RootStackParamList } from '../../app/routes';
import { Header, IconButton, Screen, TabBar } from '../../components/ui';
import { useLibrary, type LibrarySort } from '../../store/useLibrary';
import { useSettings } from '../../store/useSettings';
import { useTheme } from '../../theme';
import { OptionSheet, type Option } from '../settings/OptionSheet';
import { MediaBookmarksTab } from './MediaBookmarksTab';
import { MediaSitesTab } from './MediaSitesTab';
import { runLibraryUpdateCheck } from './runUpdateCheck';
import { useUpdateCheck } from './updates';
import { WebBookmarksTab } from './WebBookmarksTab';

type Tab = 'media' | 'web' | 'sites';

const SORT_OPTIONS: Option<LibrarySort>[] = [
  { value: 'updated', label: 'Mới cập nhật', description: 'Truyện có chương mới lên đầu' },
  { value: 'added', label: 'Mới thêm' },
  { value: 'title', label: 'Tên (A–Z)' },
  { value: 'unread', label: 'Chưa đọc nhiều' },
];

export function BookmarksScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Bookmarks'>>();
  const { c } = useTheme();
  const [tab, setTab] = useState<Tab>(route.params?.tab ?? 'media');
  const [sortOpen, setSortOpen] = useState(false);
  const sort = useLibrary(s => s.sort);
  const setSort = useLibrary(s => s.setSort);
  const newCount = useLibrary(s =>
    Object.values(s.bookmarks).reduce((n, b) => n + (b.newChapters ? 1 : 0), 0),
  );
  const layout = useSettings(s => s.libraryLayout);
  const setSettings = useSettings(s => s.set);
  const running = useUpdateCheck(s => s.running);

  const tabs = useMemo(
    () => [
      { key: 'media' as const, label: 'Truyện', badge: newCount },
      { key: 'web' as const, label: 'Trang web' },
      { key: 'sites' as const, label: 'Site truyện' },
    ],
    [newCount],
  );

  return (
    <Screen>
      <Header
        title="Bookmark"
        right={
          tab === 'media' ? (
            <>
              {running ? (
                <View style={styles.spinner}>
                  <ActivityIndicator size="small" color={c.accent} />
                </View>
              ) : (
                <IconButton
                  icon={RefreshCw}
                  onPress={() => runLibraryUpdateCheck()}
                  accessibilityLabel="Kiểm tra cập nhật"
                />
              )}
              <IconButton icon={ArrowUpDown} onPress={() => setSortOpen(true)} accessibilityLabel="Sắp xếp" />
              <IconButton
                icon={layout === 'grid' ? List : LayoutGrid}
                onPress={() => setSettings({ libraryLayout: layout === 'grid' ? 'list' : 'grid' })}
                accessibilityLabel={layout === 'grid' ? 'Xem dạng danh sách' : 'Xem dạng lưới'}
              />
            </>
          ) : undefined
        }
      />
      <TabBar tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'media' && <MediaBookmarksTab />}
      {tab === 'web' && <WebBookmarksTab />}
      {tab === 'sites' && <MediaSitesTab />}

      <OptionSheet
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        title="Sắp xếp bookmark"
        options={SORT_OPTIONS}
        value={sort}
        onSelect={setSort}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  spinner: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
