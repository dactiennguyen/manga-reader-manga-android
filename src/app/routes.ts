import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { EngineId, Genre } from '../sources/types';
import { useBrowser } from '../store/useBrowser';

export type RootStackParamList = {
  Browser: undefined;
  Tabs: undefined;
  Bookmarks: { tab?: 'media' | 'web' | 'sites' } | undefined;
  History: { tab?: 'reading' | 'web' } | undefined;
  Downloads: { tab?: 'chapters' | 'pages' | 'files' } | undefined;
  Addons: undefined;
  AddonManager: undefined;
  AddSite: { url?: string; engine?: EngineId } | undefined;
  SourceSettings: { sourceId: string };
  Catalog: { sourceId: string; query?: string; genre?: Genre };
  MangaSearch: { query?: string } | undefined;
  MangaDetail: { sourceId: string; url: string; title?: string; cover?: string };
  Reader: { sourceId: string; mangaUrl: string; chapterUrl: string; page?: number };
  NovelReader: { sourceId: string; mangaUrl: string; chapterUrl: string; paragraph?: number };
  ReadingStats: undefined;
  Settings: undefined;
  ViewerSettings: undefined;
  NovelSettings: undefined;
  AdblockSettings: undefined;
  CustomizeHomepage: undefined;
  BackupRestore: undefined;
  ClearData: undefined;
  About: undefined;
  ViewSource: { url: string };
  SavedPage: { id: string };
  QRScanner: undefined;
  Verify: { url: string };
};

export type AppNavigation = NativeStackNavigationProp<RootStackParamList>;

export function useAppNavigation(): AppNavigation {
  return useNavigation<AppNavigation>();
}

export function openInBrowser(
  navigation: AppNavigation,
  url: string,
  options: { newTab?: boolean } = {},
): void {
  useBrowser.getState().openUrl(url, { newTab: options.newTab ?? true });
  navigation.popTo('Browser');
}
