import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '../lib/storage';
import { getHost } from '../lib/url';
import { BUILTIN_SOURCES } from '../sources';
import type { SourceConfig } from '../sources/types';

/** Danh sách site người dùng đã thêm vào addon (tương đương DBAddOn). */
type SourcesState = {
  sources: SourceConfig[];
  addSource: (source: SourceConfig) => void;
  updateSource: (id: string, patch: Partial<SourceConfig>) => void;
  removeSource: (id: string) => void;
};

export const useSources = create<SourcesState>()(
  persist(
    set => ({
      sources: BUILTIN_SOURCES,
      addSource: source =>
        set(state => ({
          sources: [...state.sources.filter(s => s.id !== source.id), source],
        })),
      updateSource: (id, patch) =>
        set(state => ({
          sources: state.sources.map(s => (s.id === id ? { ...s, ...patch } : s)),
        })),
      removeSource: id =>
        set(state => ({
          sources: state.sources.filter(s => s.id !== id || s.builtin),
        })),
    }),
    {
      name: 'sources',
      storage: persistStorage,
      version: 1,
      merge: (persisted, current) => {
        const saved = (persisted as Partial<SourcesState> | undefined)?.sources ?? [];
        const missingBuiltins = BUILTIN_SOURCES.filter(b => !saved.some(s => s.id === b.id));
        return { ...current, sources: [...missingBuiltins, ...saved] };
      },
    },
  ),
);

export function getSource(id: string): SourceConfig | undefined {
  return useSources.getState().sources.find(s => s.id === id);
}

export function useSource(id: string | undefined): SourceConfig | undefined {
  return useSources(state => (id ? state.sources.find(s => s.id === id) : undefined));
}

/** Site đã thêm có host trùng với URL (bỏ qua www và subdomain m.). */
export function findSourceForUrl(url: string): SourceConfig | undefined {
  const host = getHost(url);
  if (!host) {
    return undefined;
  }
  const bare = host.replace(/^m\./, '');
  return useSources
    .getState()
    .sources.find(s => s.enabled && (s.id === host || s.id === bare || getHost(s.baseUrl) === host));
}
