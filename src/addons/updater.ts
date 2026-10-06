import { errorMessage, getJson, getText } from '../lib/http';
import { sha256 } from '../lib/sha256';
import { resolveUrl } from '../lib/url';
import { addonInfo, installAddon } from './registry';
import { SDK_VERSION } from './sdk';
import type { AddonPackage } from './types';


export const ADDON_CHECK_KEY = 'addons:lastCheck';

export type ManifestEntry = {
  uid: string;
  label?: string;
  version: number;
  sdk: number;
  file: string;
  sha256: string;
  size?: number;
};

export type AddonManifest = { sdk: number; addons: ManifestEntry[] };

export type UpdateReport = {
  installed: { uid: string; label: string; version: number }[];
  needsAppUpdate: string[];
  errors: string[];
};

function validManifest(value: unknown): value is AddonManifest {
  const m = value as AddonManifest;
  return !!m && Array.isArray(m.addons) && m.addons.every(e => e && typeof e.uid === 'string' && typeof e.file === 'string');
}

export async function checkAddonUpdates(manifestUrl: string): Promise<UpdateReport> {
  const report: UpdateReport = { installed: [], needsAppUpdate: [], errors: [] };
  const manifest = await getJson<unknown>(manifestUrl);
  if (!validManifest(manifest)) {
    throw new Error('Kho addon trả về manifest không hợp lệ.');
  }
  for (const entry of manifest.addons) {
    const current = addonInfo(entry.uid);
    if (current && entry.version <= current.version) {
      continue;
    }
    const label = entry.label ?? current?.label ?? entry.uid;
    if ((entry.sdk ?? 1) > SDK_VERSION) {
      report.needsAppUpdate.push(label);
      continue;
    }
    try {
      const text = await getText(resolveUrl(entry.file, manifestUrl), {
        headers: { Accept: 'application/json' },
      });
      if (sha256(text) !== entry.sha256) {
        throw new Error('gói tải về không khớp mã kiểm tra (sha256)');
      }
      const pkg = JSON.parse(text) as AddonPackage;
      if (pkg?.info?.uid !== entry.uid || pkg.info.version !== entry.version || typeof pkg.code !== 'string') {
        throw new Error('nội dung gói không khớp manifest');
      }
      installAddon(pkg);
      report.installed.push({ uid: entry.uid, label: pkg.info.label, version: pkg.info.version });
    } catch (error) {
      report.errors.push(`${label}: ${errorMessage(error)}`);
    }
  }
  return report;
}
