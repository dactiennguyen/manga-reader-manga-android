import { urlIdentity } from '../lib/url';
import { madara } from './engines/madara';
import { mangadex } from './engines/mangadex';
import { themesia } from './engines/themesia';
import type { Engine, EngineId, SourceConfig } from './types';

export * from './types';

export const ENGINES: Record<EngineId, Engine> = { madara, themesia, mangadex };

export const ENGINE_LIST: Engine[] = [madara, themesia, mangadex];

export function getEngine(id: EngineId): Engine {
  return ENGINES[id];
}

/** Đoán theme từ HTML trang chủ khi người dùng thêm site. */
export function detectEngine(html: string): EngineId | null {
  for (const engine of ENGINE_LIST) {
    if (engine.allowCustomSites && engine.detect?.(html)) {
      return engine.id;
    }
  }
  return null;
}

/**
 * Nguồn có sẵn. Chỉ MangaDex vì có API công khai; site theme WordPress
 * thì người dùng tự thêm (bài học từ docs: danh sách cứng chết rất nhanh).
 */
export const BUILTIN_SOURCES: SourceConfig[] = [
  {
    id: 'mangadex.org',
    engine: 'mangadex',
    name: 'MangaDex',
    baseUrl: 'https://mangadex.org',
    content: 'manga',
    lang: 'en',
    nsfw: false,
    enabled: true,
    builtin: true,
    addedAt: 0,
    options: { chapterLang: 'en' },
  },
];

/** Khoá ổn định cho một truyện, dùng cho bookmark, tiến độ, lịch sử, tải xuống. */
export function mangaKey(sourceId: string, url: string): string {
  return `${sourceId}|${urlIdentity(url)}`;
}

/** 15 ngôn ngữ site, giống bộ lọc supportedSiteLanguages của app gốc. */
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
