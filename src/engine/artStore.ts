import { useSyncExternalStore } from 'react';
import { createMMKV } from 'react-native-mmkv';

import { uid } from '../lib/id';
import type { ArtLayer, ID, PanelArt } from '../model/types';

const artStorage = createMMKV({ id: 'mangaka-art' });

const cache = new Map<ID, PanelArt>();
const revs = new Map<ID, number>();
const listeners = new Set<() => void>();
let version = 0;

const key = (panelId: ID) => `art:${panelId}`;

function notify(panelId: ID): void {
  revs.set(panelId, (revs.get(panelId) ?? 0) + 1);
  version++;
  listeners.forEach(listener => listener());
}

export function newLayer(name: string): ArtLayer {
  return { id: uid(), name, visible: true, opacity: 1, locked: false, strokes: [] };
}

export function emptyArt(): PanelArt {
  const sketch = { ...newLayer('Sketch'), opacity: 1 };
  const ink = newLayer('Ink');
  return { layers: [sketch, ink], activeLayerId: sketch.id };
}

export function loadArt(panelId: ID): PanelArt | null {
  const cached = cache.get(panelId);
  if (cached) {
    return cached;
  }
  const raw = artStorage.getString(key(panelId));
  if (!raw) {
    return null;
  }
  try {
    const art = JSON.parse(raw) as PanelArt;
    cache.set(panelId, art);
    return art;
  } catch {
    return null;
  }
}

export function saveArt(panelId: ID, art: PanelArt): void {
  cache.set(panelId, art);
  artStorage.set(key(panelId), JSON.stringify(art));
  notify(panelId);
}

export function deleteArt(panelId: ID): void {
  cache.delete(panelId);
  artStorage.remove(key(panelId));
  notify(panelId);
}

export function copyArt(fromPanelId: ID, toPanelId: ID): void {
  const art = loadArt(fromPanelId);
  if (art) {
    saveArt(toPanelId, JSON.parse(JSON.stringify(art)) as PanelArt);
  }
}

export function artHasContent(art: PanelArt | null): boolean {
  return !!art && art.layers.some(layer => layer.strokes.length > 0 || !!layer.image);
}

export function panelHasArt(panelId: ID): boolean {
  return artHasContent(loadArt(panelId));
}

export function artRev(panelId: ID): number {
  return revs.get(panelId) ?? 0;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useArtRev(panelId: ID | undefined): number {
  return useSyncExternalStore(subscribe, () => (panelId ? artRev(panelId) : 0));
}

export function useArtVersion(): number {
  return useSyncExternalStore(subscribe, () => version);
}

export function exportArt(panelIds: ID[]): Record<ID, PanelArt> {
  const out: Record<ID, PanelArt> = {};
  for (const id of panelIds) {
    const art = loadArt(id);
    if (art) {
      out[id] = art;
    }
  }
  return out;
}

export function importArt(arts: Record<ID, PanelArt>): void {
  for (const [id, art] of Object.entries(arts)) {
    saveArt(id, art);
  }
}
