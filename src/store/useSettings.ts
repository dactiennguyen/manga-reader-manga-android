import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '../lib/storage';
import type { ArtStyle } from '../model/types';

export type ThemeMode = 'system' | 'light' | 'dark';

export type CreatorRole = 'write' | 'draw' | 'both';

export type Handedness = 'right' | 'left';

export type AppSettings = {
  themeMode: ThemeMode;
  handedness: Handedness;
  keepAwakeWhileDrawing: boolean;
  haptics: boolean;
  preventCapture: boolean;
  onboarded: boolean;
  onboardingStep: number;
  penName: string;
  role: CreatorRole;
  favoriteGenres: string[];
  defaultStyle: ArtStyle;
  libraryLayout: 'grid' | 'list';
  librarySort: 'updated' | 'title' | 'created';
  canvasTipsSeen: boolean;
  tipDismissedDay: string;
};

export const DEFAULT_SETTINGS: AppSettings = {
  themeMode: 'system',
  handedness: 'right',
  keepAwakeWhileDrawing: true,
  haptics: true,
  preventCapture: !__DEV__,
  onboarded: false,
  onboardingStep: 0,
  penName: '',
  role: 'both',
  favoriteGenres: [],
  defaultStyle: 'shounen',
  libraryLayout: 'grid',
  librarySort: 'updated',
  canvasTipsSeen: false,
  tipDismissedDay: '',
};

type SettingsActions = {
  set: (patch: Partial<AppSettings>) => void;
  reset: () => void;
};

export const useSettings = create<AppSettings & SettingsActions>()(
  persist(
    set => ({
      ...DEFAULT_SETTINGS,
      set: patch => set(patch),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'mangaka-settings',
      storage: persistStorage,
      version: 1,
      merge: (persisted, current) => ({ ...current, ...((persisted ?? {}) as Partial<AppSettings>) }),
    },
  ),
);
