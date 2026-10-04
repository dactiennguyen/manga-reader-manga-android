import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '../lib/storage';
import type { ContentType } from '../sources/types';

/** Truyện đã bookmark (DBBookmark). */
export type Bookmark = {
  key: string;
  sourceId: string;
  url: string;
  title: string;
  cover?: string;
  content: ContentType;
  /** Tên nhóm bookmark; '' = không nhóm. */
  group: string;
  addedAt: number;
  nsfw?: boolean;
  /** Lần kiểm tra chương mới gần nhất. */
  checkedAt?: number;
  chapterCount?: number;
  latestChapter?: string;
  /** Số chương mới phát hiện từ lần mở truyện gần nhất (badge "NEW"). */
  newChapters?: number;
  /** Số chương chưa đọc (badge "UNREAD"). */
  unread?: number;
  /** Lần cuối có chương mới — để sắp xếp "mới cập nhật". */
  updatedAt?: number;
};

export type LibrarySort = 'updated' | 'added' | 'title' | 'unread';

type LibraryState = {
  bookmarks: Record<string, Bookmark>;
  groups: string[];
  sort: LibrarySort;
  addBookmark: (bookmark: Omit<Bookmark, 'addedAt' | 'group'> & { group?: string }) => void;
  removeBookmarks: (keys: string[]) => void;
  updateBookmark: (key: string, patch: Partial<Bookmark>) => void;
  setGroup: (keys: string[], group: string) => void;
  addGroup: (name: string) => void;
  renameGroup: (from: string, to: string) => void;
  removeGroup: (name: string) => void;
  setSort: (sort: LibrarySort) => void;
  clear: () => void;
};

export const useLibrary = create<LibraryState>()(
  persist(
    set => ({
      bookmarks: {},
      groups: [],
      sort: 'updated',
      addBookmark: bookmark =>
        set(state => ({
          bookmarks: {
            ...state.bookmarks,
            [bookmark.key]: {
              ...state.bookmarks[bookmark.key],
              ...bookmark,
              group: bookmark.group ?? state.bookmarks[bookmark.key]?.group ?? '',
              addedAt: state.bookmarks[bookmark.key]?.addedAt ?? Date.now(),
            },
          },
          groups:
            bookmark.group && !state.groups.includes(bookmark.group)
              ? [...state.groups, bookmark.group]
              : state.groups,
        })),
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
      setGroup: (keys, group) =>
        set(state => {
          const next = { ...state.bookmarks };
          for (const key of keys) {
            if (next[key]) {
              next[key] = { ...next[key], group };
            }
          }
          return {
            bookmarks: next,
            groups: group && !state.groups.includes(group) ? [...state.groups, group] : state.groups,
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
          const bookmarks = { ...state.bookmarks };
          for (const key of Object.keys(bookmarks)) {
            if (bookmarks[key].group === from) {
              bookmarks[key] = { ...bookmarks[key], group: target };
            }
          }
          return {
            bookmarks,
            groups: [...new Set(state.groups.map(g => (g === from ? target : g)))],
          };
        }),
      removeGroup: name =>
        set(state => {
          const bookmarks = { ...state.bookmarks };
          for (const key of Object.keys(bookmarks)) {
            if (bookmarks[key].group === name) {
              bookmarks[key] = { ...bookmarks[key], group: '' };
            }
          }
          return { bookmarks, groups: state.groups.filter(g => g !== name) };
        }),
      setSort: sort => set({ sort }),
      clear: () => set({ bookmarks: {}, groups: [] }),
    }),
    { name: 'library', storage: persistStorage, version: 1 },
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
