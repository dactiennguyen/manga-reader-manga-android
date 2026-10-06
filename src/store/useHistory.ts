import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '../lib/storage';
import type { ContentType } from '../sources/types';

export type ReadingEntry = {
  key: string;
  sourceId: string;
  mangaUrl: string;
  title: string;
  cover?: string;
  content: ContentType;
  chapterUrl: string;
  chapterName: string;
  at: number;
};

export type WebEntry = {
  url: string;
  title: string;
  at: number;
};

const MAX_READING = 500;
const MAX_WEB = 1500;
const MAX_SEARCHES = 20;

type HistoryState = {
  reading: ReadingEntry[];
  web: WebEntry[];
  searches: string[];
  webSearches: string[];
  addReading: (entry: Omit<ReadingEntry, 'at'>) => void;
  removeReading: (keys: string[]) => void;
  clearReading: () => void;
  addWeb: (entry: Omit<WebEntry, 'at'>) => void;
  updateWebTitle: (url: string, title: string) => void;
  removeWeb: (items: { url: string; at: number }[]) => void;
  clearWeb: (since?: number) => void;
  addSearch: (query: string, kind?: 'manga' | 'web') => void;
  removeSearch: (query: string, kind?: 'manga' | 'web') => void;
  clearSearches: (kind?: 'manga' | 'web') => void;
};

export const useHistory = create<HistoryState>()(
  persist(
    set => ({
      reading: [],
      web: [],
      searches: [],
      webSearches: [],
      addReading: entry =>
        set(state => ({
          reading: [
            { ...entry, at: Date.now() },
            ...state.reading.filter(e => e.key !== entry.key),
          ].slice(0, MAX_READING),
        })),
      removeReading: keys =>
        set(state => ({ reading: state.reading.filter(e => !keys.includes(e.key)) })),
      clearReading: () => set({ reading: [] }),
      addWeb: entry =>
        set(state => {
          const latest = state.web[0];
          if (latest && latest.url === entry.url) {
            return { web: [{ ...latest, title: entry.title || latest.title, at: Date.now() }, ...state.web.slice(1)] };
          }
          return { web: [{ ...entry, at: Date.now() }, ...state.web].slice(0, MAX_WEB) };
        }),
      updateWebTitle: (url, title) =>
        set(state => {
          const latest = state.web[0];
          if (!latest || latest.url !== url || !title || latest.title === title) {
            return state;
          }
          return { web: [{ ...latest, title }, ...state.web.slice(1)] };
        }),
      removeWeb: items =>
        set(state => ({
          web: state.web.filter(e => !items.some(i => i.url === e.url && i.at === e.at)),
        })),
      clearWeb: since =>
        set(state => ({ web: since ? state.web.filter(e => e.at < since) : [] })),
      addSearch: (query, kind = 'manga') =>
        set(state => {
          const q = query.trim();
          if (!q) {
            return state;
          }
          const field = kind === 'manga' ? 'searches' : 'webSearches';
          return {
            [field]: [q, ...state[field].filter(s => s.toLowerCase() !== q.toLowerCase())].slice(
              0,
              MAX_SEARCHES,
            ),
          };
        }),
      removeSearch: (query, kind = 'manga') =>
        set(state =>
          kind === 'manga'
            ? { searches: state.searches.filter(s => s !== query) }
            : { webSearches: state.webSearches.filter(s => s !== query) },
        ),
      clearSearches: kind =>
        set(
          kind === 'manga'
            ? { searches: [] }
            : kind === 'web'
              ? { webSearches: [] }
              : { searches: [], webSearches: [] },
        ),
    }),
    { name: 'history', storage: persistStorage, version: 1 },
  ),
);
