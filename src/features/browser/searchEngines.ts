import { ensureScheme, looksLikeUrl, withQuery } from '../../lib/url';
import type { SearchEngineId } from '../../store/useSettings';

export type SearchEngine = {
  id: SearchEngineId;
  name: string;
  glyph: string;
  searchUrl: (query: string, safe: boolean) => string;
  suggestUrl: (query: string) => string;
};

const enc = encodeURIComponent;

export const SEARCH_ENGINES: SearchEngine[] = [
  {
    id: 'google',
    name: 'Google',
    glyph: 'G',
    searchUrl: (q, safe) =>
      withQuery('https://www.google.com/search', { q, safe: safe ? 'active' : undefined }),
    suggestUrl: q =>
      `https://suggestqueries.google.com/complete/search?client=firefox&oe=utf-8&q=${enc(q)}`,
  },
  {
    id: 'bing',
    name: 'Bing',
    glyph: 'B',
    searchUrl: (q, safe) =>
      withQuery('https://www.bing.com/search', { q, adlt: safe ? 'strict' : undefined }),
    suggestUrl: q => `https://api.bing.com/osjson.aspx?query=${enc(q)}`,
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    glyph: 'D',
    searchUrl: (q, safe) => withQuery('https://duckduckgo.com/', { q, kp: safe ? '1' : undefined }),
    suggestUrl: q => `https://duckduckgo.com/ac/?type=list&q=${enc(q)}`,
  },
  {
    id: 'yahoo',
    name: 'Yahoo',
    glyph: 'Y',
    searchUrl: (q, safe) =>
      withQuery('https://search.yahoo.com/search', { p: q, vm: safe ? 'r' : undefined }),
    suggestUrl: q => `https://ff.search.yahoo.com/gossip?output=fxjson&command=${enc(q)}`,
  },
  {
    id: 'yandex',
    name: 'Yandex',
    glyph: 'Я',
    searchUrl: (q, safe) =>
      withQuery('https://yandex.com/search/', { text: q, family: safe ? 'yes' : undefined }),
    suggestUrl: q => `https://suggest.yandex.com/suggest-ff.cgi?part=${enc(q)}`,
  },
];

export function getSearchEngine(id: SearchEngineId): SearchEngine {
  return SEARCH_ENGINES.find(e => e.id === id) ?? SEARCH_ENGINES[0];
}

export function buildSearchUrl(id: SearchEngineId, query: string, safe: boolean): string {
  return getSearchEngine(id).searchUrl(query.trim(), safe);
}

export function resolveInput(input: string, id: SearchEngineId, safe: boolean): string {
  const value = input.trim();
  return looksLikeUrl(value) ? ensureScheme(value) : buildSearchUrl(id, value, safe);
}

const MAX_SUGGESTIONS = 6;

export async function fetchSuggestions(
  id: SearchEngineId,
  query: string,
  signal: AbortSignal,
): Promise<string[]> {
  const response = await fetch(getSearchEngine(id).suggestUrl(query), {
    signal,
    headers: { Accept: 'application/json, text/javascript, */*' },
  });
  if (!response.ok) {
    return [];
  }
  let data: unknown;
  try {
    data = JSON.parse(await response.text());
  } catch {
    return [];
  }
  if (!Array.isArray(data) || !Array.isArray(data[1])) {
    return [];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of data[1] as unknown[]) {
    if (typeof item !== 'string') {
      continue;
    }
    const text = item.trim();
    const key = text.toLowerCase();
    if (text && !seen.has(key) && key !== query.trim().toLowerCase()) {
      seen.add(key);
      out.push(text);
    }
    if (out.length >= MAX_SUGGESTIONS) {
      break;
    }
  }
  return out;
}
