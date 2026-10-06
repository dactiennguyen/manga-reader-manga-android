import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '../lib/storage';
import { getHost } from '../lib/url';
import { builtinSources, catalogSource, catalogSourceForUrl, catalogSources } from '../sources/catalog';
import type { SourceConfig } from '../sources/types';

type SourcesState = {
  sources: SourceConfig[];
  addSource: (source: SourceConfig) => void;
  updateSource: (id: string, patch: Partial<SourceConfig>) => void;
  removeSource: (id: string) => void;
};

export const useSources = create<SourcesState>()(
  persist(
    set => ({
      sources: builtinSources(),
      addSource: source =>
        set(state => ({
          sources: [...state.sources.filter(s => s.id !== source.id), source],
        })),
      updateSource: (id, patch) =>
        set(state => {
          if (state.sources.some(s => s.id === id)) {
            return { sources: state.sources.map(s => (s.id === id ? { ...s, ...patch } : s)) };
          }
          const base = catalogSource(id);
          return base ? { sources: [...state.sources, { ...base, addedAt: Date.now(), ...patch }] } : state;
        }),
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
        const missingBuiltins = builtinSources().filter(b => !saved.some(s => s.id === b.id));
        return { ...current, sources: [...missingBuiltins, ...saved] };
      },
    },
  ),
);

export function getSource(id: string): SourceConfig | undefined {
  return useSources.getState().sources.find(s => s.id === id) ?? catalogSource(id);
}

export function useSource(id: string | undefined): SourceConfig | undefined {
  const stored = useSources(state => (id ? state.sources.find(s => s.id === id) : undefined));
  return stored ?? (id ? catalogSource(id) : undefined);
}

export function withCatalog(sources: SourceConfig[]): SourceConfig[] {
  return [...catalogSources(), ...sources];
}

export function sourceIn(sources: SourceConfig[], id: string): SourceConfig | undefined {
  return sources.find(s => s.id === id) ?? catalogSource(id);
}

export function findSourceForUrl(url: string): SourceConfig | undefined {
  const host = getHost(url);
  if (!host) {
    return undefined;
  }
  const bare = host.replace(/^[mw]\./, '');
  const stored = useSources
    .getState()
    .sources.find(s => s.id === host || s.id === bare || getHost(s.baseUrl) === host);
  return stored ?? catalogSourceForUrl(url);
}
