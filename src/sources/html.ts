import type { Cheerio, CheerioAPI } from 'cheerio/slim';
import { load } from 'cheerio/slim';
import type { AnyNode } from 'domhandler';

import { resolveUrl } from '../lib/url';

/** Dùng bản slim (chỉ htmlparser2) — nhẹ và chạy được trong Hermes. */
export function parseHtml(html: string): CheerioAPI {
  return load(html);
}

export function cleanText(value: string | undefined | null): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

export function textOf($el: Cheerio<AnyNode>): string {
  return cleanText($el.first().text());
}

const IMAGE_ATTRS = [
  'data-src',
  'data-lazy-src',
  'data-original',
  'data-cfsrc',
  'data-url',
  'data-srcset',
  'data-lazy-srcset',
  'srcset',
  'src',
];

/** Lấy URL ảnh thật, bỏ qua placeholder lazy-load. */
export function imageSrc($img: Cheerio<AnyNode>, base: string): string | undefined {
  const el = $img.first();
  if (!el.length) {
    return undefined;
  }
  let fallback: string | undefined;
  for (const attr of IMAGE_ATTRS) {
    let value = el.attr(attr)?.trim();
    if (!value) {
      continue;
    }
    if (attr.includes('srcset')) {
      value = pickFromSrcset(value);
    }
    if (!value) {
      continue;
    }
    if (value.startsWith('data:')) {
      fallback ??= value;
      continue;
    }
    return resolveUrl(value, base);
  }
  return fallback;
}

/** Chọn ảnh lớn nhất trong srcset. */
function pickFromSrcset(srcset: string): string | undefined {
  let best: { url: string; size: number } | undefined;
  for (const candidate of srcset.split(',')) {
    const [url, descriptor] = candidate.trim().split(/\s+/);
    if (!url) {
      continue;
    }
    const size = parseFloat(descriptor ?? '') || 0;
    if (!best || size > best.size) {
      best = { url, size };
    }
  }
  return best?.url;
}

const CHAPTER_NUMBER =
  /(?:chapter|chap|ch\.?|chương|chuong|episode|ep\.?|capitulo|capítulo|cap\.?|bölüm|bab|chapitre|глава)\s*[-#:]?\s*(\d+(?:[.,]\d+)?)/i;

export function parseChapterNumber(name: string): number | undefined {
  const match = name.match(CHAPTER_NUMBER) ?? name.match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    return undefined;
  }
  const value = parseFloat(match[1].replace(',', '.'));
  return Number.isFinite(value) ? value : undefined;
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const RELATIVE_UNITS: [RegExp, number][] = [
  [/(sec|giây|segundo|detik)/i, 1000],
  [/(min|phút|minuto|menit)/i, 60_000],
  [/(hour|hr|giờ|hora|jam)/i, 3_600_000],
  [/(day|ngày|día|dia|hari)/i, 86_400_000],
  [/(week|tuần|semana|minggu)/i, 7 * 86_400_000],
  [/(month|tháng|mes|bulan)/i, 30 * 86_400_000],
  [/(year|năm|año|ano|tahun)/i, 365 * 86_400_000],
];

/** Parse ngày kiểu "2 days ago", "October 3, 2026", "03/10/2026". Không chắc thì trả undefined. */
export function parseDate(value: string | undefined, now = Date.now()): number | undefined {
  const text = cleanText(value).toLowerCase();
  if (!text) {
    return undefined;
  }
  if (/today|hôm nay|hoy|hari ini|just now|vừa xong/.test(text)) {
    return now;
  }
  if (/yesterday|hôm qua|ayer|kemarin/.test(text)) {
    return now - 86_400_000;
  }
  const relative = text.match(/(\d+)\s*([^\d\s]+)/);
  if (relative && /ago|trước|hace|lalu|atrás/.test(text)) {
    const unit = RELATIVE_UNITS.find(([re]) => re.test(relative[2]));
    if (unit) {
      return now - Number(relative[1]) * unit[1];
    }
  }
  const named = text.match(/([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (named && MONTHS[named[1]] !== undefined) {
    return new Date(Number(named[3]), MONTHS[named[1]], Number(named[2])).getTime();
  }
  const dayFirst = text.match(/(\d{1,2})\s+([a-z]{3})[a-z]*\.?,?\s+(\d{4})/);
  if (dayFirst && MONTHS[dayFirst[2]] !== undefined) {
    return new Date(Number(dayFirst[3]), MONTHS[dayFirst[2]], Number(dayFirst[1])).getTime();
  }
  const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])).getTime();
  }
  const numeric = text.match(/(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})/);
  if (numeric) {
    const year = Number(numeric[3]) < 100 ? 2000 + Number(numeric[3]) : Number(numeric[3]);
    let [a, b] = [Number(numeric[1]), Number(numeric[2])];
    // Ưu tiên dd/mm; nếu ô thứ hai > 12 thì chắc chắn là mm/dd.
    if (b > 12) {
      [a, b] = [b, a];
    }
    return new Date(year, b - 1, a).getTime();
  }
  return undefined;
}

/** Tách đoạn văn của chương novel: ưu tiên thẻ <p>, không có thì tách theo <br>. */
export function paragraphsOf($: CheerioAPI, $root: Cheerio<AnyNode>): string[] {
  $root.find('script, style, noscript, ins, iframe, .adsbygoogle, [class*="ads"]').remove();
  const fromP = $root
    .find('p')
    .toArray()
    .map(el => cleanText($(el).text()))
    .filter(Boolean);
  if (fromP.length >= 3) {
    return fromP;
  }
  const html = $root.html() ?? '';
  return html
    .split(/<br\s*\/?>|<\/p>|<\/div>/i)
    .map(chunk => cleanText(load(`<div>${chunk}</div>`)('div').text()))
    .filter(Boolean);
}

export function uniqBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const k = key(item);
    if (seen.has(k)) {
      return false;
    }
    seen.add(k);
    return true;
  });
}
