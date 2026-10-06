import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '../lib/storage';
import { addDays, dayKey } from '../lib/time';

export type DailyStats = {
  seconds: number;
  chapters: number;
  sessions: number;
};

type StatsState = {
  daily: Record<string, DailyStats>;
  totalSeconds: number;
  totalChapters: number;
  totalSessions: number;
  longestSession: number;
  addSession: (seconds: number) => void;
  addChapterRead: () => void;
  reset: () => void;
  importStats: (data: Partial<StatsData>) => void;
};

export type StatsData = Pick<
  StatsState,
  'daily' | 'totalSeconds' | 'totalChapters' | 'totalSessions' | 'longestSession'
>;

const EMPTY_DAY: DailyStats = { seconds: 0, chapters: 0, sessions: 0 };
const MIN_SESSION_SECONDS = 10;

const INITIAL: StatsData = {
  daily: {},
  totalSeconds: 0,
  totalChapters: 0,
  totalSessions: 0,
  longestSession: 0,
};

export const useStats = create<StatsState>()(
  persist(
    set => ({
      ...INITIAL,
      addSession: seconds =>
        set(state => {
          const s = Math.round(seconds);
          if (s < MIN_SESSION_SECONDS) {
            return state;
          }
          const key = dayKey();
          const today = state.daily[key] ?? EMPTY_DAY;
          return {
            daily: {
              ...state.daily,
              [key]: { ...today, seconds: today.seconds + s, sessions: today.sessions + 1 },
            },
            totalSeconds: state.totalSeconds + s,
            totalSessions: state.totalSessions + 1,
            longestSession: Math.max(state.longestSession, s),
          };
        }),
      addChapterRead: () =>
        set(state => {
          const key = dayKey();
          const today = state.daily[key] ?? EMPTY_DAY;
          return {
            daily: { ...state.daily, [key]: { ...today, chapters: today.chapters + 1 } },
            totalChapters: state.totalChapters + 1,
          };
        }),
      reset: () => set(INITIAL),
      importStats: data => set(data),
    }),
    { name: 'stats', storage: persistStorage, version: 1 },
  ),
);

function isActive(day: DailyStats | undefined): boolean {
  return !!day && (day.seconds >= 60 || day.chapters > 0);
}

export function computeStreak(daily: Record<string, DailyStats>): {
  current: number;
  best: number;
  readToday: boolean;
} {
  const today = dayKey();
  const readToday = isActive(daily[today]);
  let current = 0;
  let cursor = readToday ? today : addDays(today, -1);
  while (isActive(daily[cursor])) {
    current++;
    cursor = addDays(cursor, -1);
  }

  let best = 0;
  let run = 0;
  let previous: string | undefined;
  for (const key of Object.keys(daily).sort()) {
    if (!isActive(daily[key])) {
      continue;
    }
    run = previous && addDays(previous, 1) === key ? run + 1 : 1;
    best = Math.max(best, run);
    previous = key;
  }
  return { current, best: Math.max(best, current), readToday };
}

export function lastDays(daily: Record<string, DailyStats>, count: number): { key: string; stats: DailyStats }[] {
  const today = dayKey();
  return Array.from({ length: count }, (_, i) => {
    const key = addDays(today, i - count + 1);
    return { key, stats: daily[key] ?? EMPTY_DAY };
  });
}
