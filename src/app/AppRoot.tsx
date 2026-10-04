import { DarkTheme, DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { useEffect, useMemo } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { startDownloader } from '../features/downloads/downloader';
import { checkLibraryUpdates } from '../features/library/updates';
import { setWebUserAgent } from '../lib/http';
import { storage } from '../lib/storage';
import { DAY_MS } from '../lib/time';
import { configureSources } from '../sources/runtime';
import { useBrowser } from '../store/useBrowser';
import { useLibrary } from '../store/useLibrary';
import { useSettings } from '../store/useSettings';
import { useTheme } from '../theme';
import { RootNavigator } from './navigation';

const LAST_UPDATE_CHECK = 'updates:lastRun';
const UPDATE_CHECK_INTERVAL = 6 * 60 * 60 * 1000;

const TAB_MAX_AGE = { never: 0, day: DAY_MS, week: 7 * DAY_MS, month: 30 * DAY_MS } as const;

/** Việc chạy một lần khi mở app. */
function useBootstrap() {
  useEffect(() => {
    startDownloader();

    // Engine đọc cấu hình NSFW và UA từ đây thay vì import store.
    const applySettings = () => {
      const s = useSettings.getState();
      configureSources({ allowNsfw: s.showNsfw && s.ageConfirmed });
    };
    applySettings();
    const unsubscribeSettings = useSettings.subscribe(applySettings);
    setWebUserAgent(useBrowser.getState().userAgent);
    const unsubscribeBrowser = useBrowser.subscribe(state => setWebUserAgent(state.userAgent));

    const { autoCloseTabs, checkUpdatesOnLaunch } = useSettings.getState();
    if (autoCloseTabs !== 'never') {
      useBrowser.getState().closeTabsOlderThan(TAB_MAX_AGE[autoCloseTabs]);
    }

    const lastRun = storage.getNumber(LAST_UPDATE_CHECK) ?? 0;
    const hasBookmarks = Object.keys(useLibrary.getState().bookmarks).length > 0;
    if (checkUpdatesOnLaunch && hasBookmarks && Date.now() - lastRun > UPDATE_CHECK_INTERVAL) {
      storage.set(LAST_UPDATE_CHECK, Date.now());
      // Đợi giao diện ổn định rồi mới chạy để không tranh mạng với trang đầu tiên.
      const timer = setTimeout(() => checkLibraryUpdates(), 4000);
      return () => {
        clearTimeout(timer);
        unsubscribeSettings();
        unsubscribeBrowser();
      };
    }
    return () => {
      unsubscribeSettings();
      unsubscribeBrowser();
    };
  }, []);
}

export function AppRoot() {
  const { c, dark } = useTheme();
  const hideStatusBar = useSettings(s => s.hideStatusBar);
  useBootstrap();

  const navigationTheme = useMemo<Theme>(() => {
    const base = dark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: c.accent,
        background: c.bg,
        card: c.surface,
        text: c.text,
        border: c.border,
        notification: c.accent,
      },
    };
  }, [c, dark]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} hidden={hideStatusBar} />
      <NavigationContainer theme={navigationTheme}>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
