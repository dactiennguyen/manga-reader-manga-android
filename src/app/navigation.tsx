import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AddonManagerScreen } from '../features/addons/AddonManagerScreen';
import { AddonsScreen } from '../features/addons/AddonsScreen';
import { AddSiteScreen } from '../features/addons/AddSiteScreen';
import { SourceSettingsScreen } from '../features/addons/SourceSettingsScreen';
import { BrowserScreen } from '../features/browser/BrowserScreen';
import { QRScannerScreen } from '../features/browser/QRScannerScreen';
import { SavedPageScreen } from '../features/browser/SavedPageScreen';
import { TabsScreen } from '../features/browser/TabsScreen';
import { ViewSourceScreen } from '../features/browser/ViewSourceScreen';
import { CatalogScreen } from '../features/catalog/CatalogScreen';
import { MangaSearchScreen } from '../features/catalog/MangaSearchScreen';
import { MangaDetailScreen } from '../features/detail/MangaDetailScreen';
import { DownloadsScreen } from '../features/downloads/DownloadsScreen';
import { HistoryScreen } from '../features/history/HistoryScreen';
import { BookmarksScreen } from '../features/library/BookmarksScreen';
import { NovelReaderScreen } from '../features/novel/NovelReaderScreen';
import { NovelSettingsScreen } from '../features/novel/NovelSettingsScreen';
import { ReaderScreen } from '../features/reader/ReaderScreen';
import { ViewerSettingsScreen } from '../features/reader/ViewerSettingsScreen';
import { AboutScreen } from '../features/settings/AboutScreen';
import { AdblockSettingsScreen } from '../features/settings/AdblockSettingsScreen';
import { BackupRestoreScreen } from '../features/settings/BackupRestoreScreen';
import { ClearDataScreen } from '../features/settings/ClearDataScreen';
import { CustomizeHomepageScreen } from '../features/settings/CustomizeHomepageScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { ReadingStatsScreen } from '../features/stats/ReadingStatsScreen';
import { VerifyScreen } from '../features/verify/VerifyScreen';
import { useTheme } from '../theme';
import type { RootStackParamList } from './routes';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { c } = useTheme();
  return (
    <Stack.Navigator
      initialRouteName="Browser"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: c.bg },
      }}
    >
      <Stack.Screen name="Browser" component={BrowserScreen} />
      <Stack.Screen name="Tabs" component={TabsScreen} options={{ animation: 'fade_from_bottom' }} />
      <Stack.Screen name="Bookmarks" component={BookmarksScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="Downloads" component={DownloadsScreen} />
      <Stack.Screen name="Addons" component={AddonsScreen} />
      <Stack.Screen name="AddonManager" component={AddonManagerScreen} />
      <Stack.Screen name="AddSite" component={AddSiteScreen} />
      <Stack.Screen name="SourceSettings" component={SourceSettingsScreen} />
      <Stack.Screen name="Catalog" component={CatalogScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="MangaSearch" component={MangaSearchScreen} />
      <Stack.Screen name="MangaDetail" component={MangaDetailScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="Reader" component={ReaderScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="NovelReader" component={NovelReaderScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="ReadingStats" component={ReadingStatsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="ViewerSettings" component={ViewerSettingsScreen} />
      <Stack.Screen name="NovelSettings" component={NovelSettingsScreen} />
      <Stack.Screen name="AdblockSettings" component={AdblockSettingsScreen} />
      <Stack.Screen name="CustomizeHomepage" component={CustomizeHomepageScreen} />
      <Stack.Screen name="BackupRestore" component={BackupRestoreScreen} />
      <Stack.Screen name="ClearData" component={ClearDataScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="ViewSource" component={ViewSourceScreen} />
      <Stack.Screen name="SavedPage" component={SavedPageScreen} />
      <Stack.Screen name="QRScanner" component={QRScannerScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Verify" component={VerifyScreen} options={{ animation: 'slide_from_bottom' }} />
    </Stack.Navigator>
  );
}
