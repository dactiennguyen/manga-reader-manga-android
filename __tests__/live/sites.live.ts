import * as fs from 'fs';
import * as path from 'path';

import { probeSite } from '../../src/features/addons/siteProbe';
import { errorMessage, getUserAgent, isChallengeError } from '../../src/lib/http';
import { getHost, sameUrl } from '../../src/lib/url';
import { getEngine, hasEngine } from '../../src/sources';
import { configureSources } from '../../src/sources/runtime';
import type { ChapterContent, Engine, EngineId, MangaDetail, SourceConfig } from '../../src/sources/types';
import { ADDON_ENGINES, engineForAddon } from './addonEngines';

const ROOT = path.resolve(__dirname, '../..');
const ADDON_TEST = path.join(ROOT, 'docs/cookie-manga-addon-test.csv');
const SITES_CHECK = path.join(ROOT, 'docs/cookie-manga-sites-check.csv');
const OUTPUT = path.join(ROOT, 'docs/rn-engine-test.csv');
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 8);
const SITE_TIMEOUT = 150_000;

type Site = {
  addon: string;
  key: string;
  host: string;
  name: string;
  lang: string;
  nsfw: boolean;
  bucket: string;
  origOk: boolean | '';
};

type Result = {
  ok: boolean;
  step: string;
  addon: string;
  engine: string;
  key: string;
  host: string;
  name: string;
  lang: string;
  nsfw: boolean;
  bucket: string;
  origOk: boolean | '';
  baseUrl: string;
  detected: string;
  mangaDir: string;
  listCount: number;
  page2: string;
  chapterCount: number;
  pageCount: number;
  kind: string;
  image: string;
  search: string;
  genres: string;
  classify: string;
  resolve: string;
  title: string;
  mangaUrl: string;
  chapterUrl: string;
  page1: string;
  error: string;
};

const COLUMNS: (keyof Result)[] = [
  'ok', 'step', 'addon', 'engine', 'key', 'host', 'name', 'lang', 'nsfw', 'bucket', 'origOk', 'baseUrl', 'detected', 'mangaDir',
  'listCount', 'page2', 'chapterCount', 'pageCount', 'kind', 'image', 'search', 'genres',
  'classify', 'resolve', 'title', 'mangaUrl', 'chapterUrl', 'page1', 'error',
];

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const input = text.replace(/^﻿/, '');
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') {
        i++;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [header, ...body] = rows.filter(r => r.some(Boolean));
  return body.map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const EXTRA_SITES: Site[] = [
  { addon: 'html_novel', key: 'novgo.net', host: 'novgo.net', name: 'NovGo', lang: 'en', nsfw: false, bucket: '0_extra', origOk: '' },
  {
    addon: 'html_novel',
    key: 'novelphoenix.net',
    host: 'novelphoenix.net',
    name: 'Novel Phoenix',
    lang: 'en',
    nsfw: false,
    bucket: '0_extra',
    origOk: '',
  },
];

function loadSites(): Site[] {
  const checks = new Map(parseCsv(fs.readFileSync(SITES_CHECK, 'utf8')).map(r => [r.key, r]));
  let sites = parseCsv(fs.readFileSync(ADDON_TEST, 'utf8')).map<Site>(r => ({
    addon: r.addon,
    key: r.key,
    host: r.host,
    name: checks.get(r.key)?.title ?? r.key,
    lang: r.lang,
    nsfw: r.nsfw === 'True',
    bucket: checks.get(r.key)?.bucket ?? '1_works',
    origOk: r.ok === 'True',
  }));
  sites.push(...EXTRA_SITES);
  const tested = new Set(sites.map(s => s.key));
  for (const r of checks.values()) {
    if (tested.has(r.key) || /^5_/.test(r.bucket)) {
      continue;
    }
    sites.push({
      addon: r.addon,
      key: r.key,
      host: getHost(r.final || r.url) || r.key,
      name: r.title,
      lang: r.lang,
      nsfw: r.nsfw === 'True',
      bucket: r.bucket,
      origOk: '',
    });
  }
  const only = process.env.ONLY?.split(',').map(s => s.trim()).filter(Boolean);
  if (only?.length) {
    sites = sites.filter(s => only.some(o => s.addon === o || s.key.includes(o) || s.host.includes(o)));
  }
  if (process.env.FAILED && fs.existsSync(OUTPUT)) {
    const failed = new Set(
      parseCsv(fs.readFileSync(OUTPUT, 'utf8'))
        .filter(r => r.ok !== 'true')
        .map(rowId),
    );
    sites = sites.filter(s => failed.has(rowId(s)));
  }
  return sites;
}

function rowId(row: { addon?: string; key?: string }): string {
  return `${row.addon}|${row.key}`;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`timeout ${label}`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

async function checkImage(uri: string, headers: Record<string, string> = {}): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(uri, {
      headers: { 'User-Agent': getUserAgent(), Accept: 'image/avif,image/webp,image/*,*/*;q=0.8', ...headers },
      signal: controller.signal,
    });
    const type = res.headers.get('content-type') ?? '';
    const body = await res.arrayBuffer();
    if (!res.ok) {
      return `http ${res.status}`;
    }
    if (!type.startsWith('image/') && !/octet-stream/.test(type)) {
      return `type ${type || '?'}`;
    }
    return body.byteLength > 512 ? 'ok' : `tiny ${body.byteLength}`;
  } catch (error) {
    return `err ${errorMessage(error)}`;
  } finally {
    clearTimeout(timer);
  }
}

function uniq<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function sizeOf(content: ChapterContent): number {
  return content.kind === 'images' ? content.pages.length : content.paragraphs.length;
}

function searchWord(title: string): string {
  const words = title
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3);
  return words.sort((a, b) => b.length - a.length)[0] ?? title;
}

async function readOneChapter(engine: Engine, src: SourceConfig, detail: MangaDetail, r: Result): Promise<void> {
  const chapters = detail.chapters;
  const candidates = uniq([chapters[0], chapters[chapters.length - 1], chapters[Math.floor(chapters.length / 2)]]);
  let chapterError: unknown;
  for (const chapter of candidates) {
    r.step = 'pages';
    r.chapterUrl = chapter.url;
    try {
      const content = await engine.chapter(src, chapter.url);
      r.kind = content.kind;
      r.pageCount = sizeOf(content);
      if (!r.pageCount) {
        throw new Error('chương không có nội dung');
      }
      r.step = 'image';
      if (content.kind === 'text') {
        r.page1 = content.paragraphs[0].slice(0, 80);
        r.image = 'text';
        r.ok = true;
        return;
      }
      const page = content.pages[Math.floor(content.pages.length / 2)];
      r.page1 = page.uri;
      r.image = await checkImage(page.uri, page.headers);
      if (r.image === 'ok') {
        r.ok = true;
        return;
      }
      throw new Error(`ảnh: ${r.image}`);
    } catch (error) {
      chapterError = error;
    }
  }
  throw chapterError;
}

async function runSite(site: Site): Promise<Result> {
  const engineId = engineForAddon(site.addon, site.host);
  const r: Result = {
    ok: false,
    step: 'engine',
    addon: site.addon,
    engine: engineId ?? '',
    key: site.key,
    host: site.host,
    name: site.name,
    lang: site.lang,
    nsfw: site.nsfw,
    bucket: site.bucket,
    origOk: site.origOk,
    baseUrl: '',
    detected: '',
    mangaDir: '',
    listCount: 0,
    page2: '',
    chapterCount: 0,
    pageCount: 0,
    kind: '',
    image: '',
    search: '',
    genres: '',
    classify: '',
    resolve: '',
    title: '',
    mangaUrl: '',
    chapterUrl: '',
    page1: '',
    error: '',
  };
  const engine = engineId && hasEngine(engineId) ? getEngine(engineId as EngineId) : undefined;
  if (!engine) {
    r.error = `chưa có engine cho addon ${site.addon}`;
    return r;
  }

  const meta = ADDON_ENGINES[site.addon];
  let baseUrl = `https://${site.host}`;
  let mangaDir = meta?.mangaDir ?? 'manga';
  try {
    r.step = 'probe';
    if (engine.allowCustomSites) {
      const probe = await probeSite(site.host);
      r.detected = probe.engine ?? '-';
      baseUrl = probe.baseUrl;
      mangaDir = probe.mangaDir;
    }
    r.mangaDir = mangaDir;
    r.baseUrl = baseUrl;
    const src: SourceConfig = {
      id: site.key,
      engine: engine.id,
      name: site.key,
      baseUrl,
      content: meta?.content ?? 'manga',
      lang: site.lang,
      nsfw: site.nsfw,
      enabled: true,
      addedAt: 0,
      options: { mangaDir },
    };

    r.step = 'list';
    const list = await engine.list(src, 'latest', 1);
    r.listCount = list.items.length;
    if (!list.items.length) {
      throw new Error('danh sách rỗng');
    }

    let detail: MangaDetail | undefined;
    let lastError: unknown;
    for (const item of list.items.slice(0, 3)) {
      try {
        r.step = 'detail';
        const d = await engine.detail(src, item.url);
        detail = d;
        r.title = d.title;
        r.mangaUrl = d.url;
        r.chapterCount = d.chapters.length;
        if (!d.title) {
          throw new Error('trang truyện không có tên');
        }
        r.step = 'chapters';
        if (!d.chapters.length) {
          throw new Error('không có chương');
        }
        await readOneChapter(engine, src, d, r);
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!r.ok || !detail) {
      throw lastError ?? new Error('không đọc được trang truyện');
    }
    r.step = 'done';

    const kinds = [
      engine.classifyUrl(src, detail.url),
      engine.classifyUrl(src, r.chapterUrl),
    ];
    r.classify = `${kinds[0] ?? '?'}/${kinds[1] ?? '?'}`;
    await Promise.all([
      engine
        .list(src, 'latest', 2)
        .then(p => (r.page2 = `${list.hasNext ? 'next' : 'last'}:${p.items.length}`))
        .catch(e => (r.page2 = `err ${errorMessage(e)}`)),
      engine
        .search(src, searchWord(detail.title), 1)
        .then(p => (r.search = String(p.items.length)))
        .catch(e => (r.search = `err ${errorMessage(e)}`)),
      engine
        .genres(src)
        .then(g => (r.genres = String(g.length)))
        .catch(e => (r.genres = `err ${errorMessage(e)}`)),
      engine
        .resolveMangaUrl(src, r.chapterUrl)
        .then(u => (r.resolve = u ? (sameUrl(u, detail.url) ? 'ok' : `diff ${u}`) : 'none'))
        .catch(e => (r.resolve = `err ${errorMessage(e)}`)),
    ]);
  } catch (error) {
    r.error = (isChallengeError(error) ? '[cloudflare] ' : '') + errorMessage(error);
  }
  return r;
}

async function pool<T, R>(items: T[], size: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        out[index] = await fn(items[index], index);
      }
    }),
  );
  return out;
}

type Row = Record<string, string>;

function writeResults(results: Result[]): Row[] {
  const merged = new Map<string, Row>();
  if ((process.env.FAILED || process.env.ONLY) && fs.existsSync(OUTPUT)) {
    for (const row of parseCsv(fs.readFileSync(OUTPUT, 'utf8'))) {
      merged.set(rowId(row), row);
    }
  }
  for (const r of results) {
    merged.set(rowId(r), Object.fromEntries(COLUMNS.map(c => [c, String(r[c] ?? '')])));
  }
  const rows = [...merged.values()].sort(
    (a, b) =>
      Number(b.ok === 'true') - Number(a.ok === 'true') ||
      a.bucket.localeCompare(b.bucket) ||
      a.addon.localeCompare(b.addon) ||
      a.key.localeCompare(b.key),
  );
  const lines = [COLUMNS.join(','), ...rows.map(row => COLUMNS.map(c => csvCell(row[c])).join(','))];
  fs.writeFileSync(OUTPUT, `${lines.join('\n')}\n`);
  return rows;
}

function tally(rows: Row[], keyOf: (row: Row) => string): string[] {
  const groups = new Map<string, { total: number; ok: number; orig: number }>();
  for (const row of rows) {
    const key = keyOf(row);
    const entry = groups.get(key) ?? { total: 0, ok: 0, orig: 0 };
    entry.total++;
    entry.ok += Number(row.ok === 'true');
    entry.orig += Number(row.origOk === 'true');
    groups.set(key, entry);
  }
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, e]) => `  ${key.padEnd(30)} ${String(e.ok).padStart(3)}/${e.total}${rows[0]?.origOk !== '' ? `   (addon gốc ${e.orig}/${e.total})` : ''}`);
}

function summarize(rows: Row[]): string {
  const original = rows.filter(r => r.origOk !== '');
  const others = rows.filter(r => r.origOk === '');
  const okOf = (list: Row[]) => list.filter(r => r.ok === 'true').length;
  const failed = rows
    .filter(r => r.ok !== 'true')
    .map(r => `  ✗ ${r.key} [${r.addon}/${r.bucket}] ${r.step}: ${r.error}${r.origOk === 'true' ? '   ← addon gốc chạy được' : ''}`);
  return [
    `Bộ test của addon gốc: ${okOf(original)}/${original.length} chạy trọn luồng (addon gốc: ${original.filter(r => r.origOk === 'true').length}/${original.length})`,
    ...tally(original, r => r.addon),
    '',
    `Site còn sống khác (Cloudflare, chặn từ VN, đổi giao diện): ${okOf(others)}/${others.length}`,
    ...tally(others, r => `${r.addon} · ${r.bucket}`),
    '',
    ...failed,
  ].join('\n');
}

test('mọi site trong bộ test addon', async () => {
  configureSources({ allowNsfw: true });
  const sites = loadSites();
  let done = 0;
  const results = await pool(sites, CONCURRENCY, async site => {
    const result = await withTimeout(runSite(site), SITE_TIMEOUT, site.key).catch<Result>(error => ({
      ...({} as Result),
      ok: false,
      step: 'timeout',
      addon: site.addon,
      engine: engineForAddon(site.addon, site.host) ?? '',
      key: site.key,
      host: site.host,
      name: site.name,
      lang: site.lang,
      nsfw: site.nsfw,
      bucket: site.bucket,
      origOk: site.origOk,
      error: errorMessage(error),
    }));
    done++;
    process.stdout.write(`[${done}/${sites.length}] ${result.ok ? '✓' : '✗'} ${site.key} ${result.ok ? '' : `${result.step}: ${result.error}`}\n`);
    return result;
  });
  const rows = writeResults(results);
  process.stdout.write(`\n${summarize(rows)}\n\nĐã ghi ${path.relative(ROOT, OUTPUT)}\n`);
  expect(results.length).toBe(sites.length);
});
