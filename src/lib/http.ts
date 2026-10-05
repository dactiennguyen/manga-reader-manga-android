import { getOrigin } from './url';

/**
 * Lớp tải HTML/JSON cho parser (tương đương handler nativeFetch của app gốc).
 *
 * Trên Android, fetch của React Native dùng chung CookieManager với WebView,
 * nên sau khi người dùng vượt Cloudflare trong tab trình duyệt thì request ở
 * đây cũng mang cookie cf_clearance. Cookie đó gắn với User-Agent, vì vậy mọi
 * request phải gửi đúng UA của WebView — xem setWebUserAgent.
 */

export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36';

let webUserAgent: string | undefined;

export function setWebUserAgent(ua: string | undefined): void {
  if (ua) {
    webUserAgent = ua;
  }
}

export function getUserAgent(): string {
  return webUserAgent ?? DEFAULT_USER_AGENT;
}

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string,
    /** Trang chặn bot (Cloudflare…) — cần mở trong trình duyệt để xác minh. */
    readonly challenge = false,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function isChallengeError(error: unknown): error is HttpError {
  return error instanceof HttpError && error.challenge;
}

export type RequestOptions = {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  /** Body dạng form (x-www-form-urlencoded) hoặc chuỗi thô. */
  form?: Record<string, string | number | (string | number)[]>;
  body?: string;
  referer?: string;
  timeoutMs?: number;
  /** Gửi header X-Requested-With như request AJAX của jQuery. */
  ajax?: boolean;
};

const CHALLENGE_MARKERS = [
  'cf-browser-verification',
  'cf_chl_opt',
  'challenge-platform',
  'Just a moment...',
  'Attention Required! | Cloudflare',
  'ddos-guard',
];

function looksLikeChallenge(status: number, body: string): boolean {
  if (status !== 403 && status !== 503 && status !== 429) {
    return false;
  }
  const start = body.slice(0, 20000);
  return CHALLENGE_MARKERS.some(marker => start.includes(marker));
}

export function formEncode(
  form: Record<string, string | number | (string | number)[]>,
): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(form)) {
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      parts.push(
        `${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`,
      );
    }
  }
  return parts.join('&');
}

/** HTML do WebView chuyển sang khi người dùng bấm "Chạy addon" — dùng lại, khỏi tải lần nữa. */
const handedOff = new Map<string, { html: string; at: number }>();
const HANDOFF_TTL = 2 * 60 * 1000;

export function handOffHtml(url: string, html: string): void {
  const now = Date.now();
  // Addon có thể tải URL khác với URL được giao (vd. trang tìm kiếm → API) nên
  // dọn bản hết hạn ở đây, không chỉ khi lấy ra.
  for (const [key, entry] of handedOff) {
    if (now - entry.at >= HANDOFF_TTL) {
      handedOff.delete(key);
    }
  }
  handedOff.set(url, { html, at: now });
}

function takeHandedOff(url: string): string | undefined {
  const entry = handedOff.get(url);
  if (!entry) {
    return undefined;
  }
  handedOff.delete(url);
  return Date.now() - entry.at < HANDOFF_TTL ? entry.html : undefined;
}

export async function request(
  url: string,
  options: RequestOptions = {},
): Promise<{ status: number; url: string; text: string }> {
  const method = options.method ?? (options.form || options.body ? 'POST' : 'GET');
  if (method === 'GET') {
    const cached = takeHandedOff(url);
    if (cached !== undefined) {
      return { status: 200, url, text: cached };
    }
  }

  const headers: Record<string, string> = {
    'User-Agent': getUserAgent(),
    Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
    Referer: options.referer ?? `${getOrigin(url)}/`,
    ...options.headers,
  };
  let body = options.body;
  if (options.form) {
    body = formEncode(options.form);
    headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
  }
  if (options.ajax) {
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 25000);
  let response: Response;
  try {
    response = await fetch(url, { method, headers, body, signal: controller.signal });
  } catch (error) {
    const aborted = (error as Error)?.name === 'AbortError';
    throw new HttpError(
      aborted ? 'Hết thời gian chờ máy chủ phản hồi.' : 'Không kết nối được. Kiểm tra mạng rồi thử lại.',
      0,
      url,
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  if (looksLikeChallenge(response.status, text)) {
    throw new HttpError(
      'Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục.',
      response.status,
      url,
      true,
    );
  }
  if (!response.ok) {
    throw new HttpError(
      response.status === 404
        ? 'Không tìm thấy trang (404).'
        : `Máy chủ trả lỗi ${response.status}.`,
      response.status,
      url,
    );
  }
  return { status: response.status, url: response.url || url, text };
}

/**
 * Request HEAD — kiểm tra một URL (ảnh, file) có phục vụ được không mà không
 * tải nội dung. Lỗi mạng/hết giờ trả về null.
 */
export async function head(
  url: string,
  options: { headers?: Record<string, string>; timeoutMs?: number } = {},
): Promise<{ ok: boolean; status: number; contentType: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000);
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': getUserAgent(), ...options.headers },
      signal: controller.signal,
    });
    return { ok: res.ok, status: res.status, contentType: res.headers?.get?.('content-type') ?? '' };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function getText(url: string, options?: RequestOptions): Promise<string> {
  return (await request(url, options)).text;
}

export async function getJson<T>(url: string, options?: RequestOptions): Promise<T> {
  const text = await getText(url, {
    ...options,
    headers: { Accept: 'application/json', ...options?.headers },
  });
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError('Dữ liệu trả về không đúng định dạng JSON.', 200, url);
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
