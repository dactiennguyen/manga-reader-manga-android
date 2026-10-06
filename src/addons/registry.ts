import { create } from 'zustand';

import { readJSON, storage, writeJSON } from '../lib/storage';
import type { Engine } from '../sources/types';
import { BUILTIN_ADDONS } from './builtin.generated';
import { addonEngine } from './engine';
import * as sdk from './sdk';
import { SDK_VERSION } from './sdk';
import type { AddonInfo, AddonModule, AddonPackage } from './types';


const PACKAGE_KEY = (uid: string) => `addon:pkg:${uid}`;
const INSTALLED_KEY = 'addon:installed';

export type AddonOrigin = 'builtin' | 'update';

export type AddonEntry = {
  info: AddonInfo;
  origin: AddonOrigin;
  builtinVersion?: number;
};

export const useAddonRevision = create<{ revision: number }>(() => ({ revision: 0 }));

type Loaded = { pkg: AddonPackage; origin: AddonOrigin; builtinVersion?: number };

let entries: Map<string, Loaded> | null = null;
const engines = new Map<string, Engine>();
const broken = new Set<string>();

function installedUids(): string[] {
  return readJSON<string[]>(INSTALLED_KEY) ?? [];
}

export function isCompatible(info: AddonInfo): boolean {
  return (info.sdk ?? 1) <= SDK_VERSION;
}

function load(): Map<string, Loaded> {
  if (entries) {
    return entries;
  }
  const map = new Map<string, Loaded>();
  for (const pkg of BUILTIN_ADDONS) {
    map.set(pkg.info.uid, { pkg, origin: 'builtin', builtinVersion: pkg.info.version });
  }
  for (const uid of installedUids()) {
    const pkg = readJSON<AddonPackage>(PACKAGE_KEY(uid));
    const builtin = map.get(uid);
    if (
      pkg?.info?.uid === uid &&
      typeof pkg.code === 'string' &&
      isCompatible(pkg.info) &&
      !broken.has(uid) &&
      (!builtin || pkg.info.version > builtin.pkg.info.version)
    ) {
      map.set(uid, { pkg, origin: 'update', builtinVersion: builtin?.builtinVersion });
    }
  }
  entries = map;
  return map;
}

export function evaluateAddon(pkg: AddonPackage): AddonModule {
  const factory = new Function('__sdk', pkg.code) as (api: typeof sdk) => Partial<AddonModule>;
  const mod = factory(sdk);
  for (const name of ['getURL', 'fetch', 'run', 'get', 'match'] as const) {
    if (typeof mod?.[name] !== 'function') {
      throw new Error(`Addon ${pkg.info.uid} thiếu hàm ${name}().`);
    }
  }
  return mod as AddonModule;
}

export function addonInfos(): AddonInfo[] {
  return [...load().values()].map(entry => entry.pkg.info);
}

export function addonEntries(): AddonEntry[] {
  return [...load().values()].map(({ pkg, origin, builtinVersion }) => ({ info: pkg.info, origin, builtinVersion }));
}

export function addonInfo(uid: string): AddonInfo | undefined {
  return load().get(uid)?.pkg.info;
}

export function addonEngineFor(uid: string): Engine | undefined {
  const cached = engines.get(uid);
  if (cached) {
    return cached;
  }
  const entry = load().get(uid);
  if (!entry) {
    return undefined;
  }
  let engine: Engine;
  try {
    engine = addonEngine(entry.pkg.info, evaluateAddon(entry.pkg));
  } catch (error) {
    if (entry.origin !== 'update') {
      throw error;
    }
    if (__DEV__) {
      console.warn(`Addon ${uid} bản cập nhật lỗi, dùng bản có sẵn:`, error);
    }
    broken.add(uid);
    entries = null;
    return addonEngineFor(uid);
  }
  engines.set(uid, engine);
  return engine;
}

function invalidate(): void {
  entries = null;
  engines.clear();
  broken.clear();
  useAddonRevision.setState(state => ({ revision: state.revision + 1 }));
}

export function installAddon(pkg: AddonPackage): void {
  if (!isCompatible(pkg.info)) {
    throw new Error(`Addon ${pkg.info.label} cần bản app mới hơn.`);
  }
  evaluateAddon(pkg);
  writeJSON(PACKAGE_KEY(pkg.info.uid), pkg);
  const uids = installedUids();
  if (!uids.includes(pkg.info.uid)) {
    writeJSON(INSTALLED_KEY, [...uids, pkg.info.uid]);
  }
  invalidate();
}

export function uninstallAddon(uid: string): void {
  storage.remove(PACKAGE_KEY(uid));
  writeJSON(
    INSTALLED_KEY,
    installedUids().filter(u => u !== uid),
  );
  invalidate();
}
