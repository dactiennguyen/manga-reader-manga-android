import { useRoute, type RouteProp } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { RootStackParamList } from '../../app/routes';
import { DropdownButton } from '../../components/Dropdown';
import { Header, Screen } from '../../components/ui';
import { useLibrary } from '../../store/useLibrary';
import { space } from '../../theme';
import { MediaBookmarksTab } from './MediaBookmarksTab';
import { MediaSitesTab } from './MediaSitesTab';
import { QuickAccessTab } from './QuickAccessTab';
import { WebBookmarksTab } from './WebBookmarksTab';

type BookmarkView = 'manga' | 'novel' | 'web' | 'sites' | 'quick';

const VIEW_OPTIONS = [
  { value: 'web', label: 'Trang web' },
  { value: 'manga', label: 'Truyện tranh' },
  { value: 'novel', label: 'Tiểu thuyết' },
  { value: 'sites', label: 'Site truyện' },
  { value: 'quick', label: 'Truy cập nhanh' },
] as const;

type TabParam = NonNullable<RootStackParamList['Bookmarks']>['tab'];

function viewFromParam(tab: TabParam): BookmarkView {
  if (tab === 'web' || tab === 'sites') {
    return tab;
  }
  const list = Object.values(useLibrary.getState().bookmarks);
  return !list.some(b => b.content === 'manga') && list.some(b => b.content === 'novel') ? 'novel' : 'manga';
}

export function BookmarksScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Bookmarks'>>();
  const tabParam = route.params?.tab;
  const [view, setView] = useState<BookmarkView>(() => viewFromParam(tabParam));

  useEffect(() => {
    if (tabParam) {
      setView(viewFromParam(tabParam));
    }
  }, [tabParam]);

  const dropdown = (
    <View style={styles.dropdown}>
      <DropdownButton value={view} options={VIEW_OPTIONS} onChange={setView} />
    </View>
  );

  return (
    <Screen>
      {view === 'manga' || view === 'novel' ? (
        <MediaBookmarksTab key={view} content={view} dropdown={dropdown} />
      ) : (
        <>
          <Header title="Bookmark" right={dropdown} />
          {view === 'web' && <WebBookmarksTab />}
          {view === 'sites' && <MediaSitesTab />}
          {view === 'quick' && <QuickAccessTab />}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  dropdown: { marginRight: space.sm },
});
