import type { CheerioAPI } from 'cheerio/slim';

import { request } from '../../lib/http';
import { ensureScheme, getHost, getOrigin, pathSegments, resolveUrl } from '../../lib/url';
import { detectEngine, getEngine, SITE_LANGUAGES } from '../../sources';
import { cleanText, parseHtml } from '../../sources/html';
import type { ContentType, EngineId, SourceConfig } from '../../sources/types';


export type SiteProbe = {
  baseUrl: string;
  host: string;
  engine: EngineId | null;
  name: string;
  mangaDir: string;
  lang: string;
  nsfw: boolean;
  content: ContentType;
};

const LIST_DIRS = new Set([
  'manga',
  'mangas',
  'series',
  'comics',
  'comic',
  'manhwa',
  'manhua',
  'webtoon',
  'webtoons',
  'komik',
  'truyen',
  'novel',
  'novels',
]);

const NOVEL_DIRS = new Set(['novel', 'novels']);

const NSFW_WORDS = /\b(hentai|porn|porno|xxx|nsfw|smut|erotic|ecchi|doujin(?:shi)?|r-?18|adult)\b|18\+/i;

function siteName($: CheerioAPI, host: string): string {
  const og = cleanText($('meta[property="og:site_name"]').attr('content'));
  if (/\p{L}/u.test(og)) {
    return og;
  }
  const parts = cleanText($('title').first().text())
    .split(/\s+[|–—-]\s+|\s*[|–—]\s*/)
    .map(p => p.trim())
    .filter(p => p && !/^(home|trang chủ|inicio|accueil|beranda)$/i.test(p));
  if (parts[0]) {
    return parts[0];
  }
  const label = host.split('.')[0] ?? host;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const NOT_DIRS = new Set([
  'page',
  'tag',
  'tags',
  'genre',
  'genres',
  'manga-genre',
  'category',
  'author',
  'artist',
  'wp-content',
  'wp-json',
  'wp-admin',
  'feed',
]);

function dirFromLinks(urls: string[], host: string): string | undefined {
  const counts = new Map<string, number>();
  for (const url of urls) {
    if (getHost(url) !== host) {
      continue;
    }
    const segments = pathSegments(url);
    const dir = segments[0];
    if (segments.length < 2 || segments[1] === 'page' || !dir || NOT_DIRS.has(dir.toLowerCase())) {
      continue;
    }
    counts.set(dir, (counts.get(dir) ?? 0) + 1);
  }
  let best: string | undefined;
  let bestCount = 0;
  for (const [dir, count] of counts) {
    if (count > bestCount) {
      best = dir;
      bestCount = count;
    }
  }
  return best;
}

async function engineMangaDir(
  engineId: EngineId,
  $: CheerioAPI,
  baseUrl: string,
  host: string,
): Promise<string | undefined> {
  const engine = getEngine(engineId);
  if (!engine.itemLinkSelector) {
    return undefined;
  }
  const hrefs = $(engine.itemLinkSelector)
    .toArray()
    .map(el => resolveUrl($(el).attr('href'), `${baseUrl}/`));
  const fromHome = dirFromLinks(hrefs, host);
  if (fromHome) {
    return fromHome;
  }
  const src: SourceConfig = {
    id: host,
    engine: engineId,
    name: host,
    baseUrl,
    content: 'manga',
    lang: 'en',
    nsfw: false,
    enabled: true,
    addedAt: 0,
  };
  for (const query of ['', 'a']) {
    const result = await engine.search(src, query, 1).catch(() => undefined);
    const dir = dirFromLinks(result?.items.map(item => item.url) ?? [], host);
    if (dir) {
      return dir;
    }
  }
  return undefined;
}

function guessMangaDir($: CheerioAPI, baseUrl: string, host: string): string {
  const counts = new Map<string, number>();
  $('a[href]').each((_, el) => {
    const url = resolveUrl($(el).attr('href'), `${baseUrl}/`);
    if (getHost(url) !== host) {
      return;
    }
    const segments = pathSegments(url);
    const dir = segments[0]?.toLowerCase();
    if (!dir || !LIST_DIRS.has(dir)) {
      return;
    }
    const weight = segments.length >= 2 && segments[1] !== 'page' ? 2 : 1;
    counts.set(dir, (counts.get(dir) ?? 0) + weight);
  });
  let best = 'manga';
  let bestCount = 0;
  for (const [dir, count] of counts) {
    if (count > bestCount) {
      best = dir;
      bestCount = count;
    }
  }
  return best;
}

export function normalizeLanguage(raw: string | undefined): string {
  const value = (raw ?? '').trim().replace('_', '-').toLowerCase();
  if (!value) {
    return 'en';
  }
  const exact = SITE_LANGUAGES.find(l => l.code.toLowerCase() === value);
  if (exact) {
    return exact.code;
  }
  const base = value.split('-')[0];
  return SITE_LANGUAGES.find(l => l.code.toLowerCase().split('-')[0] === base)?.code ?? 'en';
}

function guessNsfw($: CheerioAPI): boolean {
  const rating = $('meta[name="rating"]').attr('content') ?? '';
  if (/adult|mature|RTA-5042/i.test(rating)) {
    return true;
  }
  const text = [
    $('title').first().text(),
    $('meta[name="description"]').attr('content'),
    $('meta[property="og:description"]').attr('content'),
    $('meta[name="keywords"]').attr('content'),
  ].join(' ');
  return NSFW_WORDS.test(text);
}

export async function probeSite(input: string): Promise<SiteProbe> {
  const origin = getOrigin(ensureScheme(input));
  if (!origin || !getHost(origin)) {
    throw new Error('Địa chỉ site không hợp lệ.');
  }
  const res = await request(`${origin}/`, { timeoutMs: 60_000 });
  const baseUrl = getOrigin(res.url) || origin;
  const host = getHost(baseUrl);
  const $ = parseHtml(res.text);
  const engine = detectEngine(res.text);
  const mangaDir =
    (engine && (await engineMangaDir(engine, $, baseUrl, host))) || guessMangaDir($, baseUrl, host);
  const name = siteName($, host);
  return {
    baseUrl,
    host,
    engine,
    name,
    mangaDir,
    lang: normalizeLanguage($('html').attr('lang') ?? $('meta[property="og:locale"]').attr('content')),
    nsfw: guessNsfw($),
    content:
      (engine && getEngine(engine).contents.join() === 'novel') || NOVEL_DIRS.has(mangaDir) || /\bnovels?\b/i.test(name)
        ? 'novel'
        : 'manga',
  };
}
