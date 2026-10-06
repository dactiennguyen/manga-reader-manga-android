import { useSettings } from '../../store/useSettings';

export type AiMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type AiErrorCode = 'not-configured' | 'network' | 'timeout' | 'server' | 'empty' | 'format' | 'cancelled';

export class AiError extends Error {
  code: AiErrorCode;

  constructor(code: AiErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export const AI_TIMEOUT_MS = 90000;

export function normalizeBaseUrl(input: string): string {
  let url = input.trim().replace(/\/+$/, '');
  if (!url) {
    return '';
  }
  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }
  return /\/v\d+$/i.test(url) ? url : `${url}/v1`;
}

export function aiConfigured(): boolean {
  return normalizeBaseUrl(useSettings.getState().aiBaseUrl) !== '';
}

export function useAiConfigured(): boolean {
  return useSettings(s => normalizeBaseUrl(s.aiBaseUrl) !== '');
}

export function aiErrorMessage(error: unknown): string {
  if (error instanceof AiError) {
    return error.message;
  }
  return 'Something went wrong. Try again.';
}

type ChatOptions = { signal?: AbortSignal; baseUrl?: string; model?: string; apiKey?: string; timeoutMs?: number };

export async function chat(messages: AiMessage[], options: ChatOptions = {}): Promise<string> {
  const settings = useSettings.getState();
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? settings.aiBaseUrl);
  if (!baseUrl) {
    throw new AiError('not-configured', 'Set the AI server address in Profile first.');
  }
  const apiKey = (options.apiKey ?? settings.aiApiKey).trim();
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? AI_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onAbort);
  if (options.signal?.aborted) {
    controller.abort();
  }
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : null) },
      body: JSON.stringify({ model: (options.model ?? settings.aiModel).trim() || 'gemini-3.6-flash', messages }),
      signal: controller.signal,
    });
    const raw = await response.text();
    let data: unknown = null;
    try {
      data = JSON.parse(raw);
    } catch {}
    if (!response.ok) {
      const detail = readPath(data, ['error', 'message']);
      throw new AiError(
        'server',
        response.status === 401 || response.status === 403
          ? 'The AI server rejected the API key.'
          : `The AI server answered with an error (${response.status})${detail ? `: ${detail.slice(0, 120)}` : '.'}`,
      );
    }
    const content = readPath(data, ['choices', 0, 'message', 'content']);
    if (!content || !content.trim()) {
      throw new AiError('empty', 'The AI returned an empty answer. Try again.');
    }
    return content;
  } catch (error) {
    if (error instanceof AiError) {
      throw error;
    }
    if (options.signal?.aborted) {
      throw new AiError('cancelled', 'Cancelled.');
    }
    if (timedOut) {
      throw new AiError('timeout', 'The AI took too long to answer. Try again.');
    }
    throw new AiError('network', 'Could not reach the AI server. Check the address and your connection.');
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onAbort);
  }
}

function readPath(data: unknown, path: (string | number)[]): string {
  let current: unknown = data;
  for (const key of path) {
    if (current === null || typeof current !== 'object') {
      return '';
    }
    current = (current as Record<string | number, unknown>)[key];
  }
  return typeof current === 'string' ? current : '';
}

export function repairJson(source: string): string {
  const text = source.replace(/[“”]/g, '"');
  const stack: string[] = [];
  let out = '';
  let inString = false;
  let escaped = false;
  let last = '';
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inString) {
      out += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
        last = '"';
      }
      i += 1;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      i += 1;
      continue;
    }
    if (/[A-Za-z_]/.test(ch) && (last === '{' || last === ',')) {
      const word = /^[A-Za-z_][A-Za-z0-9_]*/.exec(text.slice(i))?.[0] ?? ch;
      const after = text.slice(i + word.length);
      const key = /^"?\s*:/.exec(after);
      if (key) {
        out += `"${word}"`;
        i += word.length + (after[0] === '"' ? 1 : 0);
      } else {
        out += word;
        i += word.length;
      }
      last = 'w';
      continue;
    }
    if (ch === '{' || ch === '[') {
      stack.push(ch === '{' ? '}' : ']');
    } else if (ch === '}' || ch === ']') {
      out = out.replace(/,\s*$/, '');
      stack.pop();
    }
    out += ch;
    if (!/\s/.test(ch)) {
      last = ch;
    }
    i += 1;
  }
  if (inString) {
    out += '"';
  }
  return out.replace(/,\s*$/, '') + stack.reverse().join('');
}

export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/i);
  const source = (fenced ? fenced[1] : text).trim();
  const starts = [source.indexOf('{'), source.indexOf('[')].filter(index => index >= 0);
  if (!starts.length) {
    throw new AiError('format', 'The AI answer was not in the expected format. Try again.');
  }
  const start = Math.min(...starts);
  const end = Math.max(source.lastIndexOf('}'), source.lastIndexOf(']'));
  const candidates = [
    source.slice(start, end + 1),
    repairJson(source.slice(start, end + 1)),
    repairJson(source.slice(start)),
  ];
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {}
  }
  throw new AiError('format', 'The AI answer was not in the expected format. Try again.');
}

export async function testConnection(baseUrl: string, apiKey: string, model: string): Promise<string> {
  return chat([{ role: 'user', content: 'Reply with the single word: ready' }], {
    baseUrl,
    apiKey,
    model,
    timeoutMs: 30000,
  });
}
