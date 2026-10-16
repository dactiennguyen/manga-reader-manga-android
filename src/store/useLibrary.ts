import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '../lib/storage';
import type { ContentType } from '../sources/types';

export type Bookmark = {
  key: string;
  sourceId: string;
  url: string;
  title: string;
  cover?: string;
  content: ContentType;
  groups: string[];
  addedAt: number;
  nsfw?: boolean;
  checkedAt?: number;
  chapterCount?: number;
  latestChapter?: string;
  newChapters?: number;
  unread?: number;
  updatedAt?: number;
};

export type LibrarySort = 'updated' | 'added' | 'title' | 'unread';

export type GroupChanges = { add?: string[]; remove?: string[] };

type LibraryState = {
  bookmarks: Record<string, Bookmark>;
  groups: string[];
  sort: LibrarySort;
  addBookmark: (bookmark: Omit<Bookmark, 'addedAt' | 'groups'> & { groups?: string[] }) => void;
  removeBookmarks: (keys: string[]) => void;
  updateBookmark: (key: string, patch: Partial<Bookmark>) => void;
  setBookmarkGroups: (keys: string[], changes: GroupChanges) => void;
  setGroupsFor: (key: string, groups: string[]) => void;
  addGroup: (name: string) => void;
  renameGroup: (from: string, to: string) => void;
  removeGroup: (name: string) => void;
  setSort: (sort: LibrarySort) => void;
  clear: () => void;
};

const cleanNames = (names: string[]) => [...new Set(names.map(n => n.trim()).filter(Boolean))];

function withGroups(all: string[], names: string[]): string[] {
  const missing = names.filter(n => !all.includes(n));
  return missing.length ? [...all, ...missing] : all;
}

export const useLibrary = create<LibraryState>()(
  persist(
    set => ({
      bookmarks: {},
      groups: [],
      sort: 'updated',
      addBookmark: ({ groups: names, ...bookmark }) =>
        set(state => {
          const existing = state.bookmarks[bookmark.key];
          const chosen = cleanNames(names ?? existing?.groups ?? []);
          const groups = withGroups(state.groups, chosen);
          return {
            bookmarks: {
              ...state.bookmarks,
              [bookmark.key]: {
                ...existing,
                ...bookmark,
                groups: groups.filter(g => chosen.includes(g)),
                addedAt: existing?.addedAt ?? Date.now(),
              },
            },
            groups,
          };
        }),
      removeBookmarks: keys =>
        set(state => {
          const next = { ...state.bookmarks };
          for (const key of keys) {
            delete next[key];
          }
          return { bookmarks: next };
        }),
      updateBookmark: (key, patch) =>
        set(state =>
          state.bookmarks[key]
            ? { bookmarks: { ...state.bookmarks, [key]: { ...state.bookmarks[key], ...patch } } }
            : state,
        ),
      setBookmarkGroups: (keys, { add = [], remove = [] }) =>
        set(state => {
          const added = cleanNames(add);
          const groups = withGroups(state.groups, added);
          const bookmarks = { ...state.bookmarks };
          for (const key of keys) {
            if (bookmarks[key]) {
              const next = new Set(bookmarks[key].groups);
              remove.forEach(name => next.delete(name));
              added.forEach(name => next.add(name));
              bookmarks[key] = { ...bookmarks[key], groups: groups.filter(g => next.has(g)) };
            }
          }
          return { bookmarks, groups };
        }),
      setGroupsFor: (key, names) =>
        set(state => {
          if (!state.bookmarks[key]) {
            return state;
          }
          const chosen = cleanNames(names);
          const groups = withGroups(state.groups, chosen);
          return {
            bookmarks: {
              ...state.bookmarks,
              [key]: { ...state.bookmarks[key], groups: groups.filter(g => chosen.includes(g)) },
            },
            groups,
          };
        }),
      addGroup: name =>
        set(state =>
          !name.trim() || state.groups.includes(name.trim())
            ? state
            : { groups: [...state.groups, name.trim()] },
        ),
      renameGroup: (from, to) =>
        set(state => {
          const target = to.trim();
          if (!target || from === target) {
            return state;
          }
          const groups = [...new Set(state.groups.map(g => (g === from ? target : g)))];
          const bookmarks = { ...state.bookmarks };
          for (const key of Object.keys(bookmarks)) {
            if (bookmarks[key].groups.includes(from)) {
              const next = bookmarks[key].groups.map(g => (g === from ? target : g));
              bookmarks[key] = { ...bookmarks[key], groups: groups.filter(g => next.includes(g)) };
            }
          }
          return { bookmarks, groups };
        }),
      removeGroup: name =>
        set(state => {
          const bookmarks = { ...state.bookmarks };
          for (const key of Object.keys(bookmarks)) {
            if (bookmarks[key].groups.includes(name)) {
              bookmarks[key] = { ...bookmarks[key], groups: bookmarks[key].groups.filter(g => g !== name) };
            }
          }
          return { bookmarks, groups: state.groups.filter(g => g !== name) };
        }),
      setSort: sort => set({ sort }),
      clear: () => set({ bookmarks: {}, groups: [] }),
    }),
    {
      name: 'library',
      storage: persistStorage,
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as {
          bookmarks?: Record<string, Partial<Bookmark> & { group?: string }>;
          groups?: string[];
        };
        if (version < 2) {
          const names = new Set(state.groups ?? []);
          for (const bookmark of Object.values(state.bookmarks ?? {})) {
            bookmark.groups = bookmark.group ? [bookmark.group] : [];
            delete bookmark.group;
            bookmark.groups.forEach(name => names.add(name));
          }
          state.groups = [...names];
        }
        return state as LibraryState;
      },
    },
  ),
);

export const useIsBookmarked = (key: string | undefined) =>
  useLibrary(state => (key ? !!state.bookmarks[key] : false));

export function sortBookmarks(list: Bookmark[], sort: LibrarySort): Bookmark[] {
  const sorted = [...list];
  switch (sort) {
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'added':
      return sorted.sort((a, b) => b.addedAt - a.addedAt);
    case 'unread':
      return sorted.sort((a, b) => (b.unread ?? 0) - (a.unread ?? 0));
    default:
      return sorted.sort(
        (a, b) =>
          Number(!!b.newChapters) - Number(!!a.newChapters) ||
          (b.updatedAt ?? b.addedAt) - (a.updatedAt ?? a.addedAt),
      );
  }
}
