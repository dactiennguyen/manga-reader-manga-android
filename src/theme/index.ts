import { useColorScheme } from 'react-native';

import { useSettings } from '../store/useSettings';

/**
 * Bảng màu bám theo app gốc: Material 3 dựng từ màu hổ phách. Theme sáng có
 * app bar vàng, theme tối gần đen với điểm nhấn vàng kim.
 */
export type Palette = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  elevated: string;
  text: string;
  textSecondary: string;
  muted: string;
  border: string;
  /** Màu primary (chữ/icon nhấn, chỉ báo tab, slider). */
  accent: string;
  /** Nền nhạt của trạng thái đang chọn. */
  accentSoft: string;
  onAccent: string;
  /** Nút nổi "Start Reading", chip đang chọn (M3 primaryContainer). */
  primaryContainer: string;
  onPrimaryContainer: string;
  /** Thanh trên cùng (app bar, thanh địa chỉ). */
  appBar: string;
  onAppBar: string;
  /** Ô URL / nút vuông nằm trên app bar. */
  appBarField: string;
  danger: string;
  dangerSoft: string;
  success: string;
  warning: string;
  /** Góc bìa "có chương mới". */
  badgeNew: string;
  /** Góc bìa "chưa đọc". */
  badgeUnread: string;
  /** Ô chữ loại truyện (M/N) ở góc bìa. */
  badgeType: string;
  /** Nhãn tên site ở góc bìa. */
  badgeSite: string;
  /** Mảnh ghép addon khi trang được hỗ trợ. */
  addon: string;
  backdrop: string;
  /** Tab ẩn danh. */
  incognito: string;
  onIncognito: string;
  skeleton: string;
  /** Màu dữ liệu biểu đồ. */
  chart: string;
  onChart: string;
  chartAlt: string;
};

const fixed = {
  badgeNew: '#2196F3',
  badgeUnread: '#009688',
  badgeType: '#3F51B5',
  badgeSite: '#FF9800',
  addon: '#43A047',
  incognito: '#2B2540',
  onIncognito: '#EDE9FF',
  chart: '#B8860B',
  onChart: '#FFFFFF',
} as const;

export const lightPalette: Palette = {
  ...fixed,
  bg: '#FFFBF3',
  surface: '#FFFFFF',
  surfaceAlt: '#F3EDE2',
  elevated: '#FFF8EE',
  text: '#1E1B16',
  textSecondary: '#4C4639',
  muted: '#7C7466',
  border: '#E3DACB',
  accent: '#7B5800',
  accentSoft: '#FFEFC9',
  onAccent: '#FFFFFF',
  primaryContainer: '#FFDEA6',
  onPrimaryContainer: '#271900',
  appBar: '#FFD54F',
  onAppBar: '#1E1B16',
  appBarField: 'rgba(0, 0, 0, 0.08)',
  danger: '#BA1A1A',
  dangerSoft: '#FFDAD6',
  success: '#2E7D32',
  warning: '#B26A00',
  backdrop: 'rgba(0, 0, 0, 0.4)',
  skeleton: '#EDE6D9',
  chartAlt: '#1E88E5',
};

export const darkPalette: Palette = {
  ...fixed,
  bg: '#14130F',
  surface: '#1D1B16',
  surfaceAlt: '#2B2822',
  elevated: '#25221C',
  text: '#E9E2D6',
  textSecondary: '#CFC6B4',
  muted: '#9A9282',
  border: '#3A372F',
  accent: '#F3C04E',
  accentSoft: '#3D3318',
  onAccent: '#3F2E00',
  primaryContainer: '#5B4300',
  onPrimaryContainer: '#FFDEA6',
  appBar: '#1D1B16',
  onAppBar: '#E9E2D6',
  appBarField: 'rgba(255, 255, 255, 0.08)',
  danger: '#FFB4AB',
  dangerSoft: '#5C1A14',
  success: '#7FD18A',
  warning: '#F2B544',
  backdrop: 'rgba(0, 0, 0, 0.6)',
  skeleton: '#2A2721',
  chartAlt: '#64B5F6',
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
  /** Tiêu đề app bar (M3 title large). */
  appBarTitle: { fontSize: 21, fontWeight: '400' as const },
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
