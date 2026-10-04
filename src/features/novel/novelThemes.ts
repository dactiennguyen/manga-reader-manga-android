import type { TextStyle } from 'react-native';

import type { NovelFont, NovelSettings, NovelTheme } from '../../store/useSettings';

/** Bảng màu trang đọc novel — độc lập với theme sáng/tối của app. */
export type NovelPalette = {
  label: string;
  bg: string;
  text: string;
  muted: string;
  accent: string;
  /** Nền đoạn đang được đọc to. */
  highlight: string;
  /** Nền thanh điều khiển. */
  bar: string;
  border: string;
  statusBar: 'dark-content' | 'light-content';
};

export const NOVEL_THEMES: Record<NovelTheme, NovelPalette> = {
  light: {
    label: 'Sáng',
    bg: '#FFFFFF',
    text: '#1F2328',
    muted: '#6B7280',
    accent: '#E8572A',
    highlight: 'rgba(232, 87, 42, 0.14)',
    bar: '#F6F6F7',
    border: '#E2E4E9',
    statusBar: 'dark-content',
  },
  sepia: {
    label: 'Giấy cũ',
    bg: '#F4ECD8',
    text: '#5B4636',
    muted: '#8C7660',
    accent: '#B5651D',
    highlight: 'rgba(181, 101, 29, 0.18)',
    bar: '#EADFC6',
    border: '#DACCAE',
    statusBar: 'dark-content',
  },
  dark: {
    label: 'Tối',
    bg: '#1C1D21',
    text: '#D6D8DC',
    muted: '#8E949E',
    accent: '#FF7A4D',
    highlight: 'rgba(255, 122, 77, 0.18)',
    bar: '#25272C',
    border: '#33363D',
    statusBar: 'light-content',
  },
  black: {
    label: 'Đen',
    bg: '#000000',
    text: '#C9CBCF',
    muted: '#7C818A',
    accent: '#FF7A4D',
    highlight: 'rgba(255, 122, 77, 0.2)',
    bar: '#111214',
    border: '#24262B',
    statusBar: 'light-content',
  },
};

export const NOVEL_THEME_ORDER: NovelTheme[] = ['light', 'sepia', 'dark', 'black'];

/** 6 Google Font của app gốc, file TTF nằm trong android/app/src/main/assets/fonts. */
export const NOVEL_FONTS: readonly { value: NovelFont; label: string }[] = [
  { value: 'system', label: 'Mặc định' },
  { value: 'serif', label: 'Serif' },
  { value: 'Bellota-Regular', label: 'Bellota' },
  { value: 'Charm-Regular', label: 'Charm' },
  { value: 'Lato-Regular', label: 'Lato' },
  { value: 'Merriweather-Regular', label: 'Merriweather' },
  { value: 'PatrickHand-Regular', label: 'Patrick Hand' },
  { value: 'Quicksand-Regular', label: 'Quicksand' },
];

/** `system` → phông mặc định; `serif` là họ phông hệ thống; còn lại là tên file phông. */
export function novelFontFamily(fontName: NovelFont): string | undefined {
  return fontName === 'system' ? undefined : fontName;
}

export function novelTextStyle(settings: NovelSettings, palette: NovelPalette): TextStyle {
  return {
    fontFamily: novelFontFamily(settings.font),
    fontSize: settings.fontSize,
    lineHeight: Math.round(settings.fontSize * settings.lineHeight),
    color: palette.text,
  };
}

export const FONT_SIZE_RANGE = { min: 12, max: 32 } as const;
export const LINE_HEIGHT_RANGE = { min: 1.2, max: 2.4, step: 0.1 } as const;
export const VOICE_RANGE = { min: 0.5, max: 2, step: 0.1 } as const;

/** Làm tròn 1 chữ số thập phân (Stepper/Slider cộng số thực bị lệch 0.000…1). */
export const round1 = (value: number) => Math.round(value * 10) / 10;

export const SAMPLE_PARAGRAPH =
  'Gió đêm lùa qua khe cửa, mang theo mùi mưa đầu mùa. Cô khép cuốn sách lại, nhìn ánh đèn vàng hắt lên trang giấy cũ và mỉm cười — có những câu chuyện chỉ cần đọc một lần là nhớ mãi.';
