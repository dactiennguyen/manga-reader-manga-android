import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '../lib/storage';
import { addDays, dayKey } from '../lib/time';

export type BlockKind = 'ad' | 'tracker';

type DayStats = { ads: number; trackers: number };

type AdblockState = {
  /** Thống kê chặn theo ngày ("Total block in last 30 days"). */
  daily: Record<string, DayStats>;
  adsListUrl: string;
  trackersListUrl: string;
  adsCount: number;
  trackersCount: number;
  updatedAt?: number;
  record: (kind: BlockKind, count?: number) => void;
  setListMeta: (meta: { adsCount: number; trackersCount: number; updatedAt?: number }) => void;
  setListUrls: (urls: { adsListUrl?: string; trackersListUrl?: string }) => void;
  resetStats: () => void;
};

export const DEFAULT_ADS_LIST_URL =
  'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=nohtml&showintro=0&mimetype=plaintext';
export const DEFAULT_TRACKERS_LIST_URL = 'https://v.firebog.net/hosts/Easyprivacy.txt';

export const useAdblock = create<AdblockState>()(
  persist(
    set => ({
      daily: {},
      adsListUrl: DEFAULT_ADS_LIST_URL,
      trackersListUrl: DEFAULT_TRACKERS_LIST_URL,
      adsCount: 0,
      trackersCount: 0,
      record: (kind, count = 1) =>
        set(state => {
          const key = dayKey();
          const today = state.daily[key] ?? { ads: 0, trackers: 0 };
          const daily = {
            ...state.daily,
            [key]: {
              ads: today.ads + (kind === 'ad' ? count : 0),
              trackers: today.trackers + (kind === 'tracker' ? count : 0),
            },
          };
          // Chỉ giữ 30 ngày gần nhất.
          const cutoff = addDays(key, -30);
          for (const day of Object.keys(daily)) {
            if (day < cutoff) {
              delete daily[day];
            }
          }
          return { daily };
        }),
      setListMeta: meta => set(meta),
      setListUrls: urls => set(urls),
      resetStats: () => set({ daily: {} }),
    }),
    { name: 'adblock', storage: persistStorage, version: 1 },
  ),
);

export function totalsLast30Days(daily: Record<string, DayStats>): DayStats {
  const cutoff = addDays(dayKey(), -30);
  let ads = 0;
  let trackers = 0;
  for (const [day, stats] of Object.entries(daily)) {
    if (day >= cutoff) {
      ads += stats.ads;
      trackers += stats.trackers;
    }
  }
  return { ads, trackers };
}
