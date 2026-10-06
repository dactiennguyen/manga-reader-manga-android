import { DocumentDirectoryPath, exists, mkdir, stat, writeFile } from '@dr.pogodin/react-native-fs';
import CookieManager from '@preeternal/react-native-cookie-manager';
import { Linking } from 'react-native';

import { uid } from '../../lib/id';
import { useBrowser } from '../../store/useBrowser';

const SAVED_DIR = `${DocumentDirectoryPath}/saved`;

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

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

export async function clearSiteCookies(url: string): Promise<number> {
  const cookies = await CookieManager.getAsArray(url);
  await Promise.all(cookies.map(cookie => CookieManager.clearByName(url, cookie.name)));
  await CookieManager.flush();
  return cookies.length;
}

type IntentInfo = { target?: string; fallback?: string; pkg?: string };

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
