import { create } from 'zustand';

import { storage } from '../../lib/storage';

/**
 * Độ sáng khi đọc (manga và novel dùng chung): lớp phủ đen trên trang đọc,
 * không đổi độ sáng hệ thống nên không cần quyền WRITE_SETTINGS.
 */
export const BRIGHTNESS_RANGE = { min: 20, max: 100 } as const;

const KEY = 'reader.brightness';

const clamp = (value: number) =>
  Math.min(BRIGHTNESS_RANGE.max, Math.max(BRIGHTNESS_RANGE.min, Math.round(value)));

export const useReaderBrightness = create<{ value: number; set: (value: number) => void }>(set => ({
  value: clamp(storage.getNumber(KEY) ?? BRIGHTNESS_RANGE.max),
  set: value => {
    const next = clamp(value);
    storage.set(KEY, next);
    set({ value: next });
  },
}));
