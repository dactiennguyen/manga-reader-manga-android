import { Brush, Eraser, PenLine, Pencil, type LucideIcon } from '../../components/icons';
import type { ArtLayer, ID, PanelArt, Stroke, StrokeTool } from '../../model/types';

export type ToolDef = { id: StrokeTool; label: string; icon: LucideIcon };

export const TOOLS: ToolDef[] = [
  { id: 'gpen', label: 'G-pen', icon: PenLine },
  { id: 'pencil', label: 'Pencil', icon: Pencil },
  { id: 'brush', label: 'Brush', icon: Brush },
  { id: 'eraser', label: 'Eraser', icon: Eraser },
];

export const SIZE_MIN = 2;
export const SIZE_MAX = 60;

export const DEFAULT_SIZES: Record<StrokeTool, number> = { gpen: 6, pencil: 3, brush: 16, eraser: 28 };
export const DEFAULT_OPACITY: Record<StrokeTool, number> = { gpen: 1, pencil: 0.75, brush: 1, eraser: 1 };

export const GRAYS = ['#000000', '#FFFFFF', '#333333', '#666666', '#999999', '#CCCCCC'];

export const COLORS = [
  '#E53935',
  '#F4511E',
  '#FB8C00',
  '#FDD835',
  '#C0CA33',
  '#7CB342',
  '#2E7D32',
  '#00897B',
  '#00ACC1',
  '#039BE5',
  '#1E88E5',
  '#3949AB',
  '#5E35B1',
  '#8E24AA',
  '#D81B60',
  '#F8BBD0',
  '#FFCCBC',
  '#F1C27D',
  '#8D5524',
  '#4E342E',
];

export type ViewState = { tx: number; ty: number; scale: number; rot: number; flip: boolean };

export function screenToPage(view: ViewState, pageW: number, x: number, y: number): { x: number; y: number } {
  const dx = x - view.tx;
  const dy = y - view.ty;
  const cos = Math.cos(-view.rot);
  const sin = Math.sin(-view.rot);
  const px = (dx * cos - dy * sin) / view.scale;
  const py = (dx * sin + dy * cos) / view.scale;
  return { x: view.flip ? pageW - px : px, y: py };
}

export type LiveStore = {
  get: () => Stroke | null;
  set: (stroke: Stroke | null) => void;
  subscribe: (listener: () => void) => () => void;
};

export function createLiveStore(): LiveStore {
  let current: Stroke | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set: stroke => {
      current = stroke;
      listeners.forEach(listener => listener());
    },
    subscribe: listener => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function patchLayer(art: PanelArt, layerId: ID, patch: (layer: ArtLayer) => ArtLayer): PanelArt {
  return { ...art, layers: art.layers.map(layer => (layer.id === layerId ? patch(layer) : layer)) };
}

export function activeLayerOf(art: PanelArt): ArtLayer | undefined {
  return art.layers.find(layer => layer.id === art.activeLayerId) ?? art.layers[art.layers.length - 1];
}
