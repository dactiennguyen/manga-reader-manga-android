import {
  DocumentDirectoryPath,
  DownloadDirectoryPath,
  downloadFile,
  exists,
  mkdir,
  scanFile,
  stat,
  writeFile,
} from '@dr.pogodin/react-native-fs';
import CookieManager from '@preeternal/react-native-cookie-manager';
import { Linking } from 'react-native';

import { getUserAgent } from '../../lib/http';
import { uid } from '../../lib/id';
import { getPath } from '../../lib/url';
import { useBrowser } from '../../store/useBrowser';

const SAVED_DIR = `${DocumentDirectoryPath}/saved`;

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif|bmp|svg)$/i;

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Tên file ảnh từ URL, bỏ ký tự không hợp lệ, luôn có đuôi. */
function imageFileName(src: string, mime?: string): string {
  const last = safeDecode(getPath(src).split('/').filter(Boolean).pop() ?? '');
  let name = last.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '').slice(-80) || `image_${Date.now()}`;
  if (!IMAGE_EXT.test(name)) {
    const ext = mime?.split('/')[1]?.replace('jpeg', 'jpg').replace(/\+.*$/, '') || 'jpg';
    name = `${name}.${ext}`;
  }
  return name;
}

async function uniquePath(dir: string, name: string): Promise<string> {
  const path = `${dir}/${name}`;
  if (!(await exists(path))) {
    return path;
  }
  const dot = name.lastIndexOf('.');
  return `${dir}/${name.slice(0, dot)}_${Date.now()}${name.slice(dot)}`;
}

/** "Tải ảnh": lưu vào thư mục Download của máy. Trả về đường dẫn file. */
export async function downloadImage(src: string, referer: string): Promise<string> {
  const dataUri = /^data:(image\/[\w.+-]+);base64,(.*)$/i.exec(src);
  if (dataUri) {
    const path = await uniquePath(DownloadDirectoryPath, imageFileName(`image_${Date.now()}`, dataUri[1]));
    await writeFile(path, dataUri[2], 'base64');
    await scanFile(path).catch(() => null);
    return path;
  }
  if (!/^https?:/i.test(src)) {
    throw new Error('Không tải được ảnh này.');
  }
  const path = await uniquePath(DownloadDirectoryPath, imageFileName(src));
  const { promise } = downloadFile({
    fromUrl: src,
    toFile: path,
    headers: { 'User-Agent': getUserAgent(), Referer: referer },
    connectionTimeout: 20000,
    readTimeout: 30000,
  });
  const result = await promise;
  if (result.statusCode < 200 || result.statusCode >= 300) {
    throw new Error(`Máy chủ trả lỗi ${result.statusCode}.`);
  }
  await scanFile(path).catch(() => null);
  return path;
}

/** "Lưu trang": ghi HTML vào thư mục app rồi thêm vào danh sách trang đã lưu. Trả id. */
export async function savePage(title: string, url: string, html: string): Promise<string | undefined> {
  if (!(await exists(SAVED_DIR))) {
    await mkdir(SAVED_DIR);
  }
  const file = `${SAVED_DIR}/${uid()}.html`;
  const content = /^\s*<!doctype/i.test(html) ? html : `<!DOCTYPE html>\n${html}`;
  await writeFile(file, content, 'utf8');
  const info = await stat(file).catch(() => undefined);
  const { addSavedPage } = useBrowser.getState();
  return addSavedPage({ title, url, file, size: info?.size ?? content.length });
}

/** Xoá cookie của site đang xem ("Clear cookies and site data"). */
export async function clearSiteCookies(url: string): Promise<number> {
  const cookies = await CookieManager.getAsArray(url);
  await Promise.all(cookies.map(cookie => CookieManager.clearByName(url, cookie.name)));
  await CookieManager.flush();
  return cookies.length;
}

type IntentInfo = { target?: string; fallback?: string; pkg?: string };

/** `intent://host/path#Intent;scheme=x;package=y;S.browser_fallback_url=z;end` */
export function parseIntentUrl(url: string): IntentInfo {
  const marker = url.indexOf('#Intent;');
  const params: Record<string, string> = {};
  if (marker >= 0) {
    for (const part of url.slice(marker + '#Intent;'.length).split(';')) {
      const eq = part.indexOf('=');
      if (eq > 0) {
        params[part.slice(0, eq)] = part.slice(eq + 1);
      }
    }
  }
  const rest = (marker >= 0 ? url.slice(0, marker) : url).replace(/^intent:(\/\/)?/i, '');
  const fallback = params['S.browser_fallback_url'] ? safeDecode(params['S.browser_fallback_url']) : undefined;
  return {
    target: params.scheme ? `${params.scheme}://${rest}` : undefined,
    fallback: fallback && /^https?:/i.test(fallback) ? fallback : undefined,
    pkg: params.package,
  };
}

async function tryOpen(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Mở link dành cho app khác (intent:, market:, mailto:, tel:…).
 * `intent://` thử app đích → link dự phòng của trang → Play Store.
 * Trả về URL web cần mở trong tab (link dự phòng), `true` nếu đã mở app, `false` nếu thất bại.
 */
export async function launchExternal(url: string): Promise<string | boolean> {
  if (/^intent:/i.test(url)) {
    const intent = parseIntentUrl(url);
    if (intent.target && (await tryOpen(intent.target))) {
      return true;
    }
    if (intent.fallback) {
      return intent.fallback;
    }
    if (intent.pkg) {
      return tryOpen(`market://details?id=${intent.pkg}`);
    }
    return false;
  }
  return tryOpen(url);
}
