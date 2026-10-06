import { DarkTheme, DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { useEffect, useMemo } from 'react';
import { AppState, StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { loadFonts } from '../engine/fonts';
import { ensureDirs } from '../lib/files';
import { setSecureScreen } from '../lib/screen';
import { flushPendingWrites } from '../lib/storage';
import { useSettings } from '../store/useSettings';
import { useStory } from '../store/useStory';
import { useTheme } from '../theme';
import { RootNavigator } from './navigation';

function useBootstrap() {
  const preventCapture = useSettings(s => s.preventCapture);

  useEffect(() => {
    setSecureScreen(preventCapture);
  }, [preventCapture]);

  useEffect(() => {
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

export function AppRoot() {
  const { c, dark } = useTheme();
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
        <NavigationContainer theme={navigationTheme}>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
