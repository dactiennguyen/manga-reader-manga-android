import type { TextStyle } from 'react-native';
import { create } from 'zustand';

import { storage } from '../../lib/storage';
import { useSettings, type NovelFont, type NovelSettings, type NovelTheme } from '../../store/useSettings';
import { darkPalette, lightPalette } from '../../theme';

/** Bảng màu trang đọc novel — độc lập với theme sáng/tối của app. */
export type NovelPalette = {
  label: string;
  bg: string;
  text: string;
  muted: string;
  /** Màu nhấn (slider, nút đang chọn): primary của app theo độ sáng nền. */
  accent: string;
  /** Nền đoạn đang được đọc to. */
  highlight: string;
  /** Nền thanh điều khiển. */
  bar: string;
  border: string;
  statusBar: 'dark-content' | 'light-content';
  /** Giá trị lưu trong `settings.novel.theme` (kiểu chung chỉ có 4 giá trị). */
  base: NovelTheme;
};

/** 7 màu theme như hàng chấm tròn của app gốc. */
export type NovelThemeId = 'white' | 'cream' | 'gray' | 'night' | 'paper' | 'mint' | 'amber';

const onLight = {
  accent: lightPalette.accent,
  highlight: 'rgba(123, 88, 0, 0.14)',
  statusBar: 'dark-content',
} as const;
const onDark = {
  accent: darkPalette.accent,
  highlight: 'rgba(243, 192, 78, 0.16)',
  statusBar: 'light-content',
} as const;

export const NOVEL_THEMES: Record<NovelThemeId, NovelPalette> = {
  white: {
    ...onLight,
    label: 'Trắng',
    base: 'light',
    bg: '#FFFFFF',
    text: '#1F2328',
    muted: '#6B7280',
    bar: '#F4F4F5',
    border: '#E4E4E7',
  },
  cream: {
    ...onLight,
    label: 'Kem',
    base: 'sepia',
    bg: '#F8F1E3',
    text: '#4B3B2A',
    muted: '#8A7660',
    bar: '#EFE5D0',
    border: '#E0D2B6',
  },
  gray: {
    ...onDark,
    label: 'Xám tối',
    base: 'dark',
    bg: '#26272B',
    text: '#D4D6DA',
    muted: '#8E939C',
    bar: '#1D1E21',
    border: '#3A3C42',
  },
  night: {
    ...onDark,
    label: 'Xanh đêm',
    base: 'dark',
    bg: '#142130',
    text: '#C9D4E0',
    muted: '#7F8FA3',
    bar: '#0F1925',
    border: '#24364A',
  },
  paper: {
    ...onLight,
    label: 'Nâu giấy',
    base: 'sepia',
    bg: '#E6D2AE',
    text: '#3F2F1D',
    muted: '#76603F',
    bar: '#DCC59C',
    border: '#CBB287',
  },
  mint: {
    ...onLight,
    label: 'Bạc hà',
    base: 'light',
    bg: '#E2F3EA',
    text: '#1F3A2E',
    muted: '#5E7C6D',
    bar: '#D3EADD',
    border: '#B9D9C7',
  },
  amber: {
    ...onDark,
    label: 'Đen vàng',
    base: 'black',
    bg: '#000000',
    text: '#E5C77A',
    muted: '#8C7A4A',
    bar: '#0E0E0E',
    border: '#2A2416',
  },
};

export const NOVEL_THEME_ORDER: NovelThemeId[] = ['white', 'cream', 'gray', 'night', 'paper', 'mint', 'amber'];

/** Theme hiển thị khi `settings.novel.theme` không khớp lựa chọn mở rộng đã lưu. */
const CANONICAL: Record<NovelTheme, NovelThemeId> = { light: 'white', sepia: 'cream', dark: 'gray', black: 'amber' };

const VARIANT_KEY = 'novel.themeVariant';

const isThemeId = (value: unknown): value is NovelThemeId =>
  typeof value === 'string' && value in NOVEL_THEMES;

/**
 * Lựa chọn trong 7 theme lưu MMKV riêng; `settings.novel.theme` vẫn giữ giá
 * trị gốc tương ứng để phần còn lại của app (sao lưu, mặc định) không đổi.
 */
const useThemeVariant = create<{ value?: NovelThemeId }>(() => {
  const saved = storage.getString(VARIANT_KEY);
  return { value: isThemeId(saved) ? saved : undefined };
});

export function resolveNovelTheme(base: NovelTheme, variant?: NovelThemeId): NovelThemeId {
  return variant && NOVEL_THEMES[variant].base === base ? variant : CANONICAL[base] ?? 'white';
}

export function setNovelTheme(id: NovelThemeId): void {
  storage.set(VARIANT_KEY, id);
  useThemeVariant.setState({ value: id });
  useSettings.getState().setNovel({ theme: NOVEL_THEMES[id].base });
}

/** Theme đọc đang dùng (một trong 7). */
export function useNovelTheme(): { id: NovelThemeId; palette: NovelPalette } {
  const base = useSettings(state => state.novel.theme);
  const variant = useThemeVariant(state => state.value);
  const id = resolveNovelTheme(base, variant);
  return { id, palette: NOVEL_THEMES[id] };
}

/** 6 Google Font của app gốc, file TTF nằm trong android/app/src/main/assets/fonts. */
export const NOVEL_FONTS: readonly { value: NovelFont; label: string }[] = [
  { value: 'system', label: 'Hệ thống' },
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
/** 3 nút giãn dòng của panel đáy (nhiều gạch = dòng sít hơn). */
export const LINE_HEIGHT_PRESETS = [
  { value: 2, lines: 2, label: 'Giãn dòng rộng' },
  { value: 1.6, lines: 3, label: 'Giãn dòng vừa' },
  { value: 1.3, lines: 4, label: 'Giãn dòng hẹp' },
] as const;
export const LINE_HEIGHT_RANGE = { min: 1.2, max: 2.4, step: 0.1 } as const;
export const VOICE_RANGE = { min: 0.5, max: 2, step: 0.1 } as const;

/** Làm tròn 1 chữ số thập phân (Stepper/Slider cộng số thực bị lệch 0.000…1). */
export const round1 = (value: number) => Math.round(value * 10) / 10;

export const SAMPLE_PARAGRAPH =
  'Gió đêm lùa qua khe cửa, mang theo mùi mưa đầu mùa. Cô khép cuốn sách lại, nhìn ánh đèn vàng hắt lên trang giấy cũ và mỉm cười — có những câu chuyện chỉ cần đọc một lần là nhớ mãi.';
