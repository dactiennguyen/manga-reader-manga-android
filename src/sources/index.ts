import { addonEngineFor, addonInfos, useAddonRevision } from '../addons/registry';
import { urlIdentity } from '../lib/url';
import type { ContentType, Engine, EngineId } from './types';

export * from './types';

export type EngineSummary = {
  id: EngineId;
  label: string;
  description: string;
  version?: number;
  contents: ContentType[];
  allowCustomSites: boolean;
};

const GENERIC_THEMES = new Set(['madara', 'themesia']);

let summaries: { revision: number; list: EngineSummary[] } | null = null;

export function engineSummaries(): EngineSummary[] {
  const { revision } = useAddonRevision.getState();
  if (summaries?.revision === revision) {
    return summaries.list;
  }
  const list: EngineSummary[] = addonInfos().map(info => ({
    id: info.uid,
    label: info.label,
    description: info.desc,
    version: info.version,
    contents: info.content,
    allowCustomSites: info.allowCustomSites,
  }));
  list.sort((a, b) => Number(GENERIC_THEMES.has(a.id)) - Number(GENERIC_THEMES.has(b.id)));
  summaries = { revision, list };
  return list;
}

export function useEngineSummaries(): EngineSummary[] {
  useAddonRevision(state => state.revision);
  return engineSummaries();
}

function missingEngine(id: EngineId): Engine {
  const fail = (): never => {
    throw new Error(`Addon "${id}" chưa được cài.`);
  };
  return {
    id,
    label: id,
    description: '',
    contents: ['manga'],
    allowCustomSites: false,
    sorts: [{ id: 'latest', label: 'Mới cập nhật' }],
    list: fail,
    search: fail,
    genres: fail,
    byGenre: fail,
    detail: fail,
    chapter: fail,
    classifyUrl: () => null,
    resolveMangaUrl: fail,
    imageHeaders: src => ({ Referer: `${src.baseUrl}/` }),
  };
}

export function getEngine(id: EngineId): Engine {
  return addonEngineFor(id) ?? missingEngine(id);
}

export function hasEngine(id: EngineId): boolean {
  return addonInfos().some(info => info.uid === id);
}

export function detectEngine(html: string): EngineId | null {
  for (const summary of engineSummaries()) {
    if (summary.allowCustomSites && getEngine(summary.id).detect?.(html)) {
      return summary.id;
    }
  }
  return null;
}

export function mangaKey(sourceId: string, url: string): string {
  return `${sourceId}|${urlIdentity(url)}`;
}

export const SITE_LANGUAGES: { code: string; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'es', name: 'Español' },
  { code: 'pt-BR', name: 'Português (BR)' },
  { code: 'fr', name: 'Français' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'th', name: 'ไทย' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'ar', name: 'العربية' },
  { code: 'ru', name: 'Русский' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'zh', name: '中文' },
];

export function languageName(code: string): string {
  return SITE_LANGUAGES.find(l => l.code === code)?.name ?? code;
}
