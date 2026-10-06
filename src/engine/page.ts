import {
  ClipOp,
  ImageFormat,
  PaintStyle,
  Skia,
  StrokeJoin,
  TextAlign,
  type SkCanvas,
  type SkImage,
  type SkPath,
  type SkPicture,
  type SkTypefaceFontProvider,
} from '@shopify/react-native-skia';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { DIRS, RNFS, ensureDirs, fileUri } from '../lib/files';
import { storage } from '../lib/storage';
import { SHOT_LABEL } from '../model/constants';
import type { ID, Page, Project } from '../model/types';
import { useStory } from '../store/useStory';
import { artImageUris, drawArt } from './art';
import { loadArt, useArtVersion } from './artStore';
import { FONT_FAMILY, loadFonts, useEngineFonts } from './fonts';
import { loadImage, useImageCacheRev } from './images';
import { computePanels, isRtl, pageSize, type PanelShape, type Poly, type Size } from './layout';
import { drawBubble, drawEffect } from './lettering';

export const PANEL_BORDER = 5;
export const THUMB_WIDTH = 360;

export type PageDrawOptions = {
  art?: boolean;
  effects?: boolean;
  bubbles?: boolean;
  borders?: boolean;
  placeholders?: boolean;
  background?: string | null;
  dimExceptPanelId?: ID;
  skipArtPanelId?: ID;
  skipBubbleId?: ID;
};

export type PageContext = { page: Page; project: Project; size: Size; shapes: PanelShape[]; rtl: boolean };

export function buildPageContext(page: Page, project: Project): PageContext {
  const size = pageSize(project, page);
  const rtl = isRtl(project);
  return { page, project, size, rtl, shapes: computePanels(page, size, { rtl }) };
}

export function pageContext(pageId: ID): PageContext | null {
  const state = useStory.getState();
  const page = state.pages[pageId];
  const project = page ? state.projects[state.chapters[page.chapterId]?.projectId] : undefined;
  return page && project ? buildPageContext(page, project) : null;
}

export function polyPath(poly: Poly): SkPath {
  return Skia.Path.Polygon(
    poly.map(p => Skia.Point(p.x, p.y)),
    true,
  );
}

function drawPlaceholder(
  canvas: SkCanvas,
  shape: PanelShape,
  text: string,
  fonts: SkTypefaceFontProvider | null,
): void {
  if (!fonts || !text) {
    return;
  }
  const builder = Skia.ParagraphBuilder.Make(
    {
      textAlign: TextAlign.Center,
      textStyle: {
        color: Skia.Color('#9A958E'),
        fontFamilies: [FONT_FAMILY.sans],
        fontSize: 24,
        heightMultiplier: 1.2,
      },
    },
    fonts,
  );
  builder.addText(text);
  const paragraph = builder.build();
  const width = Math.max(40, shape.bbox.w - 48);
  paragraph.layout(width);
  paragraph.paint(canvas, shape.bbox.x + 24, shape.bbox.y + shape.bbox.h / 2 - paragraph.getHeight() / 2);
}

export function drawPage(
  canvas: SkCanvas,
  ctx: PageContext,
  fonts: SkTypefaceFontProvider | null,
  options: PageDrawOptions = {},
): void {
  const { page, size, shapes } = ctx;
  const background = options.background === undefined ? '#FFFFFF' : options.background;
  if (background) {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color(background));
    canvas.drawRect(Skia.XYWHRect(0, 0, size.w, size.h), paint);
  }
  const white = Skia.Paint();
  white.setColor(Skia.Color('#FFFFFF'));
  white.setAntiAlias(true);
  const border = Skia.Paint();
  border.setAntiAlias(true);
  border.setStyle(PaintStyle.Stroke);
  border.setStrokeWidth(PANEL_BORDER);
  border.setStrokeJoin(StrokeJoin.Miter);
  border.setColor(Skia.Color('#16161A'));

  for (const shape of shapes) {
    const panel = page.panels[shape.id];
    const path = polyPath(shape.poly);
    canvas.save();
    canvas.clipPath(path, ClipOp.Intersect, true);
    canvas.drawPath(path, white);
    const art = options.art === false || shape.id === options.skipArtPanelId ? null : loadArt(shape.id);
    if (art) {
      drawArt(canvas, art);
    }
    const hasArt = !!art && art.layers.some(layer => layer.visible && (layer.strokes.length > 0 || !!layer.image));
    if (options.placeholders && !hasArt && panel) {
      const label = [panel.shot ? SHOT_LABEL[panel.shot] : '', panel.description].filter(Boolean).join(' · ');
      drawPlaceholder(canvas, shape, label, fonts);
    }
    if (options.effects !== false) {
      for (const effect of page.effects) {
        if (effect.panelId === shape.id) {
          drawEffect(canvas, effect, shape);
        }
      }
    }
    canvas.restore();
    if (options.borders !== false && !panel?.borderless) {
      canvas.drawPath(path, border);
    }
  }

  if (options.dimExceptPanelId) {
    const active = shapes.find(shape => shape.id === options.dimExceptPanelId);
    canvas.save();
    if (active) {
      canvas.clipPath(polyPath(active.poly), ClipOp.Difference, true);
    }
    const veil = Skia.Paint();
    veil.setColor(Skia.Color('rgba(255,255,255,0.72)'));
    canvas.drawRect(Skia.XYWHRect(0, 0, size.w, size.h), veil);
    canvas.restore();
  }

  if (options.bubbles !== false) {
    for (const bubble of page.bubbles) {
      if (bubble.id !== options.skipBubbleId) {
        drawBubble(canvas, bubble, fonts);
      }
    }
  }
}

export function recordPage(
  ctx: PageContext,
  fonts: SkTypefaceFontProvider | null,
  options: PageDrawOptions = {},
): SkPicture {
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, ctx.size.w, ctx.size.h));
  drawPage(canvas, ctx, fonts, options);
  return recorder.finishRecordingAsPicture();
}

export function usePageContext(pageId: ID | undefined): PageContext | null {
  const page = useStory(s => (pageId ? s.pages[pageId] : undefined));
  const project = useStory(s => (page ? s.projects[s.chapters[page.chapterId]?.projectId] : undefined));
  return useMemo(() => (page && project ? buildPageContext(page, project) : null), [page, project]);
}

export function usePagePicture(
  pageId: ID | undefined,
  options: PageDrawOptions = {},
): { picture: SkPicture | null; ctx: PageContext | null } {
  const ctx = usePageContext(pageId);
  const fonts = useEngineFonts();
  const artVersion = useArtVersion();
  const imageRev = useImageCacheRev();
  const key = JSON.stringify(options);
  const picture = useMemo(
    () => (ctx ? recordPage(ctx, fonts, JSON.parse(key) as PageDrawOptions) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ctx, fonts, artVersion, imageRev, key],
  );
  return { picture, ctx };
}

async function preloadPageImages(ctx: PageContext): Promise<void> {
  const uris = ctx.shapes.flatMap(shape => artImageUris(loadArt(shape.id)));
  await Promise.all(uris.map(loadImage));
}

export async function renderPageImage(
  pageId: ID,
  widthPx: number,
  options: PageDrawOptions = {},
): Promise<SkImage | null> {
  const ctx = pageContext(pageId);
  if (!ctx) {
    return null;
  }
  const fonts = await loadFonts();
  await preloadPageImages(ctx);
  const scale = widthPx / ctx.size.w;
  const surface = Skia.Surface.Make(Math.round(widthPx), Math.round(ctx.size.h * scale));
  if (!surface) {
    return null;
  }
  const canvas = surface.getCanvas();
  canvas.scale(scale, scale);
  drawPage(canvas, ctx, fonts, options);
  surface.flush();
  return surface.makeImageSnapshot();
}

export async function renderPageToFile(
  pageId: ID,
  widthPx: number,
  path: string,
  format: 'png' | 'jpg' = 'png',
  options: PageDrawOptions = {},
): Promise<boolean> {
  const image = await renderPageImage(pageId, widthPx, options);
  if (!image) {
    return false;
  }
  const base64 =
    format === 'jpg' ? image.encodeToBase64(ImageFormat.JPEG, 92) : image.encodeToBase64(ImageFormat.PNG, 100);
  await RNFS.writeFile(path, base64, 'base64');
  return true;
}

const thumbListeners = new Set<() => void>();
const thumbQueue: ID[] = [];
let thumbBusy = false;
let thumbRev = 0;

export function thumbPath(pageId: ID): string {
  return `${DIRS.thumbs}/${pageId}.png`;
}

function thumbStamp(pageId: ID): number {
  return storage.getNumber(`thumb:${pageId}`) ?? 0;
}

async function runThumbQueue(): Promise<void> {
  if (thumbBusy) {
    return;
  }
  thumbBusy = true;
  await ensureDirs();
  while (thumbQueue.length) {
    const pageId = thumbQueue.shift()!;
    const page = useStory.getState().pages[pageId];
    if (!page) {
      continue;
    }
    const stamp = page.updatedAt;
    try {
      if (await renderPageToFile(pageId, THUMB_WIDTH, thumbPath(pageId), 'png')) {
        storage.set(`thumb:${pageId}`, stamp);
        thumbRev++;
        thumbListeners.forEach(listener => listener());
      }
    } catch {}
  }
  thumbBusy = false;
}

export function requestThumb(pageId: ID): void {
  if (!thumbQueue.includes(pageId)) {
    thumbQueue.push(pageId);
    runThumbQueue();
  }
}

export function forgetThumb(pageId: ID): void {
  storage.remove(`thumb:${pageId}`);
  RNFS.unlink(thumbPath(pageId)).catch(() => {});
}

function subscribeThumbs(listener: () => void): () => void {
  thumbListeners.add(listener);
  return () => {
    thumbListeners.delete(listener);
  };
}

export function useThumb(pageId: ID | undefined): string | null {
  const updatedAt = useStory(s => (pageId ? s.pages[pageId]?.updatedAt : undefined));
  useSyncExternalStore(subscribeThumbs, () => thumbRev);
  const [, force] = useState(0);
  const stamp = pageId ? thumbStamp(pageId) : 0;
  useEffect(() => {
    if (pageId && updatedAt && stamp !== updatedAt) {
      requestThumb(pageId);
      force(n => n + 1);
    }
  }, [pageId, updatedAt, stamp]);
  return pageId && stamp ? `${fileUri(thumbPath(pageId))}?v=${stamp}` : null;
}
