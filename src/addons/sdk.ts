import { handOffHtml } from '../lib/http';
import type { SourceConfig, UrlKind } from '../sources/types';
import type { AddonModule } from './types';

export const SDK_VERSION = 1;

export { mapLimit } from '../lib/async';
export { decodeBase64 } from '../lib/base64';
export {
  errorMessage,
  formEncode,
  getJson,
  getText,
  getUserAgent,
  head,
  HttpError,
  isChallengeError,
  request,
  type RequestOptions,
} from '../lib/http';
export {
  getHost,
  getOrigin,
  getPath,
  getQueryParam,
  pathSegments,
  resolveUrl,
  stripWww,
  trimTrailingSlash,
  withQuery,
} from '../lib/url';
export {
  cleanText,
  harvestMangaLinks,
  imageSrc,
  paragraphsOf,
  parseChapterNumber,
  parseDate,
  parseHtml,
  textOf,
  uniqBy,
} from '../sources/html';
export { sourcesRuntime } from '../sources/runtime';

export const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export function runFromHtml(
  addon: Pick<AddonModule, 'fetch' | 'match'>,
  input: Parameters<AddonModule['run']>[0],
): ReturnType<AddonModule['run']> {
  const kind: UrlKind | null = input.method ?? addon.match({ site: input.site, url: input.url, html: input.html });
  if (kind !== 'list' && kind !== 'detail' && kind !== 'chapter') {
    return Promise.reject(new Error('Trang này không được addon hỗ trợ.'));
  }
  handOffHtml(input.url, input.html);
  return addon.fetch({ site: input.site, url: input.url, method: kind });
}

export function refererHeaders(site: SourceConfig): Record<string, string> {
  return { Referer: `${site.baseUrl}/` };
}
