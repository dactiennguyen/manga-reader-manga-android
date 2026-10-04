import { useColorScheme } from 'react-native';

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
  accent: string;
  accentSoft: string;
  onAccent: string;
  danger: string;
  dangerSoft: string;
  success: string;
  warning: string;
  /** Badge "NEW" / chương mới. */
  badgeNew: string;
  /** Badge số chương chưa đọc. */
  badgeUnread: string;
  backdrop: string;
  /** Tab ẩn danh. */
  incognito: string;
  onIncognito: string;
  skeleton: string;
  /** Màu dữ liệu biểu đồ — accent tối quá sáng cho cột/ô nên giữ tông đậm ở cả hai chế độ. */
  chart: string;
  onChart: string;
  chartAlt: string;
};

export const lightPalette: Palette = {
  bg: '#F5F5F7',
  surface: '#FFFFFF',
  surfaceAlt: '#EEEFF2',
  elevated: '#FFFFFF',
  text: '#16181D',
  textSecondary: '#3C414B',
  muted: '#6B7280',
  border: '#E2E4E9',
  accent: '#E8572A',
  accentSoft: '#FDE9E2',
  onAccent: '#FFFFFF',
  danger: '#D93A3A',
  dangerSoft: '#FBE4E4',
  success: '#1F9D55',
  warning: '#C98A0B',
  badgeNew: '#E8572A',
  badgeUnread: '#2F6DF6',
  backdrop: 'rgba(10, 12, 16, 0.45)',
  incognito: '#2B2540',
  onIncognito: '#EDE9FF',
  skeleton: '#E6E7EB',
  chart: '#E8572A',
  onChart: '#FFFFFF',
  chartAlt: '#2F6DF6',
};

export const darkPalette: Palette = {
  bg: '#0E0F12',
  surface: '#17191E',
  surfaceAlt: '#22252C',
  elevated: '#1D2026',
  text: '#ECEEF2',
  textSecondary: '#C9CDD5',
  muted: '#9AA1AD',
  border: '#2A2E36',
  accent: '#FF7A4D',
  accentSoft: '#3A231B',
  onAccent: '#140C08',
  danger: '#FF6B6B',
  dangerSoft: '#3A1D1D',
  success: '#3FCF7F',
  warning: '#F2B544',
  badgeNew: '#FF7A4D',
  badgeUnread: '#5B8DFF',
  backdrop: 'rgba(0, 0, 0, 0.6)',
  incognito: '#2B2540',
  onIncognito: '#EDE9FF',
  skeleton: '#262930',
  chart: '#E8572A',
  onChart: '#FFFFFF',
  chartAlt: '#5B8DFF',
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

export const radius = { sm: 6, md: 10, lg: 14, xl: 20, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const font = {
  title: { fontSize: 20, fontWeight: '700' as const },
  heading: { fontSize: 17, fontWeight: '700' as const },
  body: { fontSize: 15 },
  label: { fontSize: 14, fontWeight: '600' as const },
  caption: { fontSize: 12 },
  overline: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
};
