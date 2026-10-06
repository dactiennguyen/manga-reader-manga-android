import type { Cheerio, CheerioAPI } from 'cheerio/slim';
import { load } from 'cheerio/slim';
import type { AnyNode } from 'domhandler';

import { getHost, pathSegments, resolveUrl } from '../lib/url';

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

const MONTH_PREFIXES: Record<string, number> = {
  jan: 0, ene: 0, gen: 0, oca: 0, янв: 0,
  feb: 1, fev: 1, sub: 1, фев: 1,
  mar: 2, мар: 2,
  apr: 3, abr: 3, avr: 3, nis: 3, апр: 3,
  may: 4, mai: 4, mei: 4, mag: 4, мая: 4, май: 4,
  jun: 5, haz: 5, giu: 5, июн: 5,
  jul: 6, tem: 6, lug: 6, июл: 6,
  aug: 7, ago: 7, agu: 7, aou: 7, авг: 7,
  sep: 8, set: 8, eyl: 8, сен: 8,
  oct: 9, out: 9, okt: 9, eki: 9, ott: 9, окт: 9,
  nov: 10, kas: 10, ноя: 10,
  dec: 11, dic: 11, dez: 11, des: 11, ara: 11, дек: 11,
};

const MONTH_NAMES: string[][] = [
  ['มกราคม', 'يناير'],
  ['กุมภาพันธ์', 'فبراير'],
  ['มีนาคม', 'مارس'],
  ['เมษายน', 'أبريل', 'ابريل'],
  ['พฤษภาคม', 'مايو'],
  ['มิถุนายน', 'يونيو'],
  ['กรกฎาคม', 'يوليو'],
  ['สิงหาคม', 'أغسطس', 'اغسطس'],
  ['กันยายน', 'سبتمبر'],
  ['ตุลาคม', 'أكتوبر', 'اكتوبر'],
  ['พฤศจิกายน', 'نوفمبر'],
  ['ธันวาคม', 'ديسمبر'],
];

function stripDiacritics(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
}

function monthOf(text: string): number | undefined {
  const index = MONTH_NAMES.findIndex(names => names.some(name => text.includes(name)));
  if (index >= 0) {
    return index;
  }
  for (const word of stripDiacritics(text).match(/\p{L}{3,}/gu) ?? []) {
    if (word.startsWith('jui')) {
      return word.startsWith('juil') ? 6 : 5;
    }
    const month = MONTH_PREFIXES[word.slice(0, 3)];
    if (month !== undefined) {
      return month;
    }
  }
  return undefined;
}

function parseNamedDate(text: string): number | undefined {
  const month = monthOf(text);
  const yearMatch = text.match(/(?:^|\D)(\d{4})(?!\d)/);
  if (month === undefined || !yearMatch) {
    return undefined;
  }
  let year = Number(yearMatch[1]);
  if (year > 2400) {
    year -= 543;
  }
  const rest = text.replace(yearMatch[1], ' ');
  const day = Number(rest.match(/(?:^|\D)(\d{1,2})(?!\d)/)?.[1] ?? 1);
  return day >= 1 && day <= 31 ? new Date(year, month, day).getTime() : undefined;
}

const RELATIVE_UNITS: [RegExp, number][] = [
  [/(sec|giây|segundo|detik|saniye|วินาที|сек)/i, 1000],
  [/(min|phút|minuto|menit|dakika|นาที|мин)/i, 60_000],
  [/(hour|hr|giờ|hora|jam|heure|saat|ชั่วโมง|час)/i, 3_600_000],
  [/(day|ngày|día|dia|hari|jour|gün|วัน|дн|день|дня)/i, 86_400_000],
  [/(week|tuần|semana|minggu|semaine|hafta|สัปดาห์|нед)/i, 7 * 86_400_000],
  [/(month|tháng|mes|bulan|mois|ay\b|เดือน|мес)/i, 30 * 86_400_000],
  [/(year|năm|año|ano|tahun|an\b|ans|yıl|ปี|год|лет)/i, 365 * 86_400_000],
];

const AGO = /ago|trước|hace|lalu|atrás|il y a|önce|แล้ว|назад|منذ/;

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
  if (relative && AGO.test(text)) {
    const unit = RELATIVE_UNITS.find(([re]) => re.test(relative[2]));
    if (unit) {
      return now - Number(relative[1]) * unit[1];
    }
  }
  const cjk = text.match(/(\d{4})\s*[年년]\s*(\d{1,2})\s*[月월]\s*(\d{1,2})/);
  if (cjk) {
    return new Date(Number(cjk[1]), Number(cjk[2]) - 1, Number(cjk[3])).getTime();
  }
  const named = parseNamedDate(text);
  if (named !== undefined) {
    return named;
  }
  const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])).getTime();
  }
  const numeric = text.match(/(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})/);
  if (numeric) {
    const year = Number(numeric[3]) < 100 ? 2000 + Number(numeric[3]) : Number(numeric[3]);
    let [a, b] = [Number(numeric[1]), Number(numeric[2])];
    if (b > 12) {
      [a, b] = [b, a];
    }
    return new Date(year, b - 1, a).getTime();
  }
  return undefined;
}

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

export function harvestMangaLinks(
  $: CheerioAPI,
  base: string,
  dir: string,
): { url: string; title: string; cover?: string }[] {
  const host = getHost(base);
  const found = new Map<string, { url: string; title: string; cover?: string }>();
  $('a[href]').each((_, el) => {
    const $a = $(el);
    const url = resolveUrl($a.attr('href'), base);
    if (getHost(url) !== host) {
      return;
    }
    const segments = pathSegments(url);
    if (segments.length !== 2 || segments[0] !== dir || segments[1] === 'page') {
      return;
    }
    const key = `${dir}/${segments[1]}`;
    const entry = found.get(key) ?? { url, title: '' };
    const $img = $a.find('img');
    const text = cleanText($a.text());
    if (!entry.title) {
      entry.title = (text.length <= 150 ? text : '') || cleanText($a.attr('title')) || cleanText($img.attr('alt'));
    }
    if (!entry.cover && $img.length) {
      entry.cover = imageSrc($img, base);
    }
    found.set(key, entry);
  });
  return [...found.values()].filter(item => item.title);
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
