import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '../lib/storage';
import { getHost } from '../lib/url';
import { builtinSources, catalogSource, catalogSourceForUrl, catalogSources } from '../sources/catalog';
import type { SourceConfig } from '../sources/types';

/**
 * Site người dùng đã ghim, tự thêm hoặc chỉnh cài đặt (tương đương DBAddOn).
 * Site trong danh mục dựng sẵn (sources/catalog) dùng được kể cả khi chưa có ở đây.
 */
type SourcesState = {
  sources: SourceConfig[];
  addSource: (source: SourceConfig) => void;
  /** Site của danh mục chưa có trong danh sách thì thêm vào kèm thay đổi. */
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

/** Nguồn theo id: bản đã lưu, không có thì lấy từ danh mục. */
export function getSource(id: string): SourceConfig | undefined {
  return useSources.getState().sources.find(s => s.id === id) ?? catalogSource(id);
}

export function useSource(id: string | undefined): SourceConfig | undefined {
  const stored = useSources(state => (id ? state.sources.find(s => s.id === id) : undefined));
  return stored ?? (id ? catalogSource(id) : undefined);
}

/**
 * Danh mục + site đã lưu, site đã lưu đứng sau để ghi đè khi dựng map theo id
 * (nhãn site, header ảnh bìa của bookmark/lịch sử/tải xuống).
 */
export function withCatalog(sources: SourceConfig[]): SourceConfig[] {
  return [...catalogSources(), ...sources];
}

/** Tra nguồn trong một danh sách đã lấy từ store (dùng trong useMemo), có danh mục làm dự phòng. */
export function sourceIn(sources: SourceConfig[], id: string): SourceConfig | undefined {
  return sources.find(s => s.id === id) ?? catalogSource(id);
}

/**
 * Nguồn ứng với URL (bỏ qua www và subdomain m./w.): site đã lưu trước, rồi tới
 * danh mục. Không xét `enabled` — bỏ ghim chỉ ẩn site khỏi danh sách đã lưu,
 * addon vẫn chạy trên site đó như app gốc.
 */
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
