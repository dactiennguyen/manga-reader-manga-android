const ABSOLUTE = /^[a-z][a-z0-9+.-]*:/i;
const ORIGIN = /^([a-z][a-z0-9+.-]*:\/\/[^/?#]+)/i;

export function getOrigin(url: string): string {
  return url.match(ORIGIN)?.[1] ?? '';
}

export function getHost(url: string): string {
  const origin = getOrigin(url);
  if (!origin) {
    return '';
  }
  return stripWww(
    origin
      .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
      .replace(/^[^@]*@/, '')
      .replace(/:\d+$/, '')
      .toLowerCase(),
  );
}

export function stripWww(host: string): string {
  return host.replace(/^www\./, '');
}

export function getPath(url: string): string {
  const rest = url.slice(getOrigin(url).length);
  const path = rest.split(/[?#]/)[0];
  return path.startsWith('/') ? path : `/${path}`;
}

export function pathSegments(url: string): string[] {
  return getPath(url)
    .split('/')
    .filter(Boolean)
    .map(s => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    });
}

export function resolveUrl(href: string | undefined | null, base: string): string {
  const value = (href ?? '').trim();
  if (!value) {
    return '';
  }
  if (ABSOLUTE.test(value)) {
    return value;
  }
  if (value.startsWith('//')) {
    const scheme = base.match(/^([a-z][a-z0-9+.-]*:)/i)?.[1] ?? 'https:';
    return scheme + value;
  }
  const origin = getOrigin(base);
  if (value.startsWith('/')) {
    return origin + value;
  }
  if (value.startsWith('?')) {
    return origin + getPath(base) + value;
  }
  if (value.startsWith('#')) {
    return base.split('#')[0] + value;
  }
  const dir = getPath(base).replace(/[^/]*$/, '');
  const parts = (dir + value).split('/');
  const out: string[] = [];
  for (const part of parts) {
    if (part === '..') {
      if (out.length > 1) {
        out.pop();
      }
    } else if (part !== '.') {
      out.push(part);
    }
  }
  return origin + out.join('/');
}

export function withQuery(
  url: string,
  params: Record<string, string | number | boolean | undefined | (string | number)[]>,
): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') {
      continue;
    }
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
    }
  }
  if (!parts.length) {
    return url;
  }
  return url + (url.includes('?') ? '&' : '?') + parts.join('&');
}

export function getQueryParam(url: string, name: string): string | undefined {
  const query = url.split('#')[0].split('?')[1];
  if (!query) {
    return undefined;
  }
  for (const pair of query.split('&')) {
    const [k, v = ''] = pair.split('=');
    if (decodeURIComponent(k) === name) {
      return decodeURIComponent(v.replace(/\+/g, ' '));
    }
  }
  return undefined;
}

export function ensureTrailingSlash(url: string): string {
  const [path, ...rest] = url.split('?');
  const fixed = path.endsWith('/') ? path : `${path}/`;
  return rest.length ? `${fixed}?${rest.join('?')}` : fixed;
}

export function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export function sameUrl(a: string, b: string): boolean {
  return urlIdentity(a) === urlIdentity(b);
}

export function urlIdentity(url: string): string {
  return (
    getHost(url) +
    trimTrailingSlash(url.slice(getOrigin(url).length).split('#')[0])
  );
}

export function looksLikeUrl(input: string): boolean {
  const value = input.trim();
  if (!value || /\s/.test(value)) {
    return false;
  }
  if (/^(https?|file|about|data):/i.test(value)) {
    return true;
  }
  if (/^localhost(:\d+)?(\/|$)/i.test(value)) {
    return true;
  }
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/|$)/.test(value)) {
    return true;
  }
  return /^[^/?#]+\.[a-z]{2,}(:\d+)?([/?#]|$)/i.test(value);
}

export function ensureScheme(input: string): string {
  const value = input.trim();
  return /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
}

export function displayUrl(url: string): string {
  if (!url) {
    return '';
  }
  return url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
}

export function faviconUrl(url: string): string {
  const host = getHost(url);
  return host ? `https://icons.duckduckgo.com/ip3/${host}.ico` : '';
}
