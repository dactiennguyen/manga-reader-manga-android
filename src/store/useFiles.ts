import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '../lib/storage';

export type FileKind = 'image' | 'video' | 'audio' | 'file';

export type FileDownload = {
  id: string;
  url: string;
  pageUrl?: string;
  name: string;
  path: string;
  kind: FileKind;
  status: 'downloading' | 'done' | 'error';
  bytes: number;
  total: number;
  error?: string;
  createdAt: number;
};

type FilesState = {
  files: FileDownload[];
  add: (file: FileDownload) => void;
  update: (id: string, patch: Partial<Omit<FileDownload, 'id'>>) => void;
  remove: (ids: string[]) => void;
};

export const useFiles = create<FilesState>()(
  persist(
    set => ({
      files: [],
      add: file => set(state => ({ files: [file, ...state.files] })),
      update: (id, patch) =>
        set(state => ({ files: state.files.map(f => (f.id === id ? { ...f, ...patch } : f)) })),
      remove: ids => set(state => ({ files: state.files.filter(f => !ids.includes(f.id)) })),
    }),
    {
      name: 'files',
      storage: persistStorage,
      version: 1,
      merge: (persisted, current) => {
        const saved = (persisted as Partial<FilesState> | undefined)?.files ?? [];
        return {
          ...current,
          files: saved.map(f =>
            f.status === 'downloading' ? { ...f, status: 'error', error: 'Bị gián đoạn khi đóng app' } : f,
          ),
        };
      },
    },
  ),
);
