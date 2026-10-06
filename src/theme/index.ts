import { useColorScheme, useWindowDimensions } from 'react-native';

import { useSettings } from '../store/useSettings';

export type Palette = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  elevated: string;
  text: string;
  textSecondary: string;
  muted: string;
  border: string;
  ink: string;
  onInk: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  appBar: string;
  onAppBar: string;
  appBarField: string;
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  ai: string;
  aiSoft: string;
  onAi: string;
  backdrop: string;
  skeleton: string;
  halftone: string;
  workspace: string;
  toolbar: string;
  toolbarAlt: string;
  onToolbar: string;
  onToolbarMuted: string;
};

const fixed = {
  toolbar: '#1C1C20',
  toolbarAlt: '#2B2B31',
  onToolbar: '#F2EFEA',
  onToolbarMuted: '#A09B94',
} as const;

export const lightPalette: Palette = {
  ...fixed,
  bg: '#FAF7F2',
  surface: '#FFFFFF',
  surfaceAlt: '#F1ECE3',
  elevated: '#FFFFFF',
  text: '#16161A',
  textSecondary: '#45423D',
  muted: '#6B6660',
  border: '#DDD6CA',
  ink: '#16161A',
  onInk: '#FFFFFF',
  accent: '#E5383B',
  accentSoft: '#FDE3E3',
  onAccent: '#FFFFFF',
  primaryContainer: '#16161A',
  onPrimaryContainer: '#FFFFFF',
  appBar: '#FAF7F2',
  onAppBar: '#16161A',
  appBarField: 'rgba(0, 0, 0, 0.06)',
  danger: '#C62828',
  dangerSoft: '#FBE0E0',
  success: '#2E9E6B',
  successSoft: '#DDF3E8',
  warning: '#B26A00',
  warningSoft: '#FFF0D2',
  ai: '#6C4CF1',
  aiSoft: '#ECE7FF',
  onAi: '#FFFFFF',
  backdrop: 'rgba(0, 0, 0, 0.45)',
  skeleton: '#EAE4D9',
  halftone: 'rgba(22, 22, 26, 0.10)',
  workspace: '#8E8A84',
};

export const darkPalette: Palette = {
  ...fixed,
  bg: '#121214',
  surface: '#1C1C20',
  surfaceAlt: '#26262B',
  elevated: '#222227',
  text: '#F2EFEA',
  textSecondary: '#CFCBC4',
  muted: '#A09B94',
  border: '#34343A',
  ink: '#F2EFEA',
  onInk: '#16161A',
  accent: '#FF5A5F',
  accentSoft: '#3A1E20',
  onAccent: '#16161A',
  primaryContainer: '#F2EFEA',
  onPrimaryContainer: '#16161A',
  appBar: '#121214',
  onAppBar: '#F2EFEA',
  appBarField: 'rgba(255, 255, 255, 0.08)',
  danger: '#FF8A80',
  dangerSoft: '#4A1F1C',
  success: '#4CC38A',
  successSoft: '#17362A',
  warning: '#F2B544',
  warningSoft: '#3D3015',
  ai: '#9C87FF',
  aiSoft: '#2A2447',
  onAi: '#16161A',
  backdrop: 'rgba(0, 0, 0, 0.65)',
  skeleton: '#2A2A2F',
  halftone: 'rgba(242, 239, 234, 0.10)',
  workspace: '#3A3A40',
};

export function useIsDark(): boolean {
  const scheme = useColorScheme();
  const mode = useSettings(s => s.themeMode);
  return mode === 'system' ? scheme === 'dark' : mode === 'dark';
}

export function useTheme(): { c: Palette; dark: boolean } {
  const dark = useIsDark();
  return { c: dark ? darkPalette : lightPalette, dark };
}

export const WIDE_MIN_WIDTH = 600;

export function useIsWide(): boolean {
  return useWindowDimensions().width >= WIDE_MIN_WIDTH;
}

export const radius = { sm: 6, md: 10, lg: 12, xl: 20, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const fontFamily = {
  display: 'Anton-Regular',
  hand: 'PatrickHand-Regular',
} as const;

export const font = {
  display: {
    fontFamily: fontFamily.display,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  appBarTitle: {
    fontFamily: fontFamily.display,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  title: { fontSize: 20, fontWeight: '700' as const },
  heading: { fontSize: 17, fontWeight: '700' as const },
  body: { fontSize: 15 },
  label: { fontSize: 14, fontWeight: '600' as const },
  caption: { fontSize: 12 },
  overline: {
    fontFamily: fontFamily.display,
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  hand: { fontFamily: fontFamily.hand, fontSize: 16 },
};
