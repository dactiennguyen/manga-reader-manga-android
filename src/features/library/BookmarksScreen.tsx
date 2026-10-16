import { useRoute, type RouteProp } from '@react-navigation/native';
import { useEffect, useState } from 'react';

import type { RootStackParamList } from '../../app/routes';
import { Header, Screen } from '../../components/ui';
import { useLibrary } from '../../store/useLibrary';
import { LibraryBar, LibrarySheet, libraryLabel, type BookmarkView } from './LibraryFilter';
import { MediaBookmarksTab } from './MediaBookmarksTab';
import { MediaSitesTab } from './MediaSitesTab';
import { QuickAccessTab } from './QuickAccessTab';
import { WebBookmarksTab } from './WebBookmarksTab';

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
  const [libraryOpen, setLibraryOpen] = useState(false);

  useEffect(() => {
    if (tabParam) {
      setView(viewFromParam(tabParam));
    }
  }, [tabParam]);

  return (
    <Screen>
      {view === 'manga' || view === 'novel' ? (
        <MediaBookmarksTab key={view} content={view} onViewChange={setView} />
      ) : (
        <>
          <Header title="Bookmark" />
          <LibraryBar label={libraryLabel(view)} onPress={() => setLibraryOpen(true)} />
          {view === 'web' && <WebBookmarksTab />}
          {view === 'sites' && <MediaSitesTab />}
          {view === 'quick' && <QuickAccessTab />}
          <LibrarySheet
            visible={libraryOpen}
            onClose={() => setLibraryOpen(false)}
            view={view}
            onViewChange={setView}
          />
        </>
      )}
    </Screen>
  );
}
