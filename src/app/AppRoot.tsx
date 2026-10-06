import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  createNavigationContainerRef,
  type NavigationState,
  type Theme,
} from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { AppState, StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SnackbarHost } from '../components/ui';
import { loadFonts } from '../engine/fonts';
import { ensureDirs } from '../lib/files';
import { setSecureScreen } from '../lib/screen';
import { flushPendingWrites } from '../lib/storage';
import { useStory } from '../store/useStory';
import { useTheme } from '../theme';
import { RootNavigator } from './navigation';

function useBootstrap() {
  useEffect(() => {
    setSecureScreen(!__DEV__);
    ensureDirs().catch(() => {});
    loadFonts().catch(() => {});
    useStory.getState().purgeTrash();
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        flushPendingWrites();
      }
    });
    return () => {
      subscription.remove();
      flushPendingWrites();
    };
  }, []);
}

const TAB_BAR_HEIGHT = 62;

const navigationRef = createNavigationContainerRef();

function showsTabBar(state: NavigationState | undefined): boolean {
  return state?.routes[state.index]?.name === 'Tabs';
}

export function AppRoot() {
  const { c, dark } = useTheme();
  const [onTabs, setOnTabs] = useState(false);
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
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
        <NavigationContainer
          ref={navigationRef}
          theme={navigationTheme}
          onReady={() => setOnTabs(showsTabBar(navigationRef.getRootState()))}
          onStateChange={state => setOnTabs(showsTabBar(state))}
        >
          <RootNavigator />
        </NavigationContainer>
        <SnackbarHost bottomOffset={onTabs ? TAB_BAR_HEIGHT : 0} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
