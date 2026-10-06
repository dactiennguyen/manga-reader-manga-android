import {
  AlphaType,
  BlendMode,
  ColorType,
  PaintStyle,
  Skia,
  StrokeCap,
  StrokeJoin,
  type SkCanvas,
  type SkPaint,
  type SkPath,
  type SkPicture,
} from '@shopify/react-native-skia';
import { getStroke, type StrokeOptions } from 'perfect-freehand';

import type { ArtLayer, ID, PanelArt, Stroke } from '../model/types';
import { getImage } from './images';

export type ArtDrawOptions = { skipLayerId?: ID; onlyLayerIds?: ID[] };

export function freehandOptions(stroke: Pick<Stroke, 'tool' | 'size' | 'pressure'>, last = true): StrokeOptions {
  const brush = stroke.tool === 'brush';
  return {
    size: stroke.size,
    thinning: brush ? 0.86 : 0.64,
    smoothing: brush ? 0.6 : 0.52,
    streamline: brush ? 0.4 : 0.5,
    easing: brush ? (t: number) => t * t : (t: number) => Math.sin((t * Math.PI) / 2),
    simulatePressure: !stroke.pressure,
    start: { taper: brush ? stroke.size * 2.5 : stroke.size * 1.2, cap: true },
    end: { taper: brush ? stroke.size * 4.5 : stroke.size * 2.4, cap: true },
    last,
  };
}

function toTriples(stroke: Pick<Stroke, 'points' | 'pressure'>): number[][] {
  const out: number[][] = [];
  const step = stroke.pressure ? 3 : 2;
  for (let i = 0; i + step - 1 < stroke.points.length; i += step) {
    out.push(
      stroke.pressure
        ? [stroke.points[i], stroke.points[i + 1], stroke.points[i + 2]]
        : [stroke.points[i], stroke.points[i + 1]],
    );
  }
  return out;
}

function outlinePath(outline: number[][]): SkPath | null {
  if (outline.length < 3) {
    return null;
  }
  const builder = Skia.PathBuilder.Make();
  builder.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length - 1; i++) {
    const [x, y] = outline[i];
    const [nx, ny] = outline[i + 1];
    builder.quadTo(x, y, (x + nx) / 2, (y + ny) / 2);
  }
  builder.close();
  return builder.build();
}

function centerPath(points: number[][]): SkPath | null {
  if (!points.length) {
    return null;
  }
  const builder = Skia.PathBuilder.Make();
  builder.moveTo(points[0][0], points[0][1]);
  if (points.length === 1) {
    builder.lineTo(points[0][0] + 0.01, points[0][1] + 0.01);
  }
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const [nx, ny] = points[i + 1];
    builder.quadTo(x, y, (x + nx) / 2, (y + ny) / 2);
  }
  if (points.length > 1) {
    const lastPoint = points[points.length - 1];
    builder.lineTo(lastPoint[0], lastPoint[1]);
  }
  return builder.build();
}

export function isOutlineTool(tool: Stroke['tool']): boolean {
  return tool === 'gpen' || tool === 'brush';
}

const pathCache = new WeakMap<Stroke, SkPath | null>();

function buildStrokePath(stroke: Stroke, last: boolean): SkPath | null {
  const points = toTriples(stroke);
  if (!points.length) {
    return null;
  }
  if (isOutlineTool(stroke.tool)) {
    return outlinePath(getStroke(points, freehandOptions(stroke, last)));
  }
  return centerPath(points);
}

export function strokePath(stroke: Stroke, last = true): SkPath | null {
  if (!last) {
    return buildStrokePath(stroke, false);
  }
  if (pathCache.has(stroke)) {
    return pathCache.get(stroke) ?? null;
  }
  const path = buildStrokePath(stroke, true);
  pathCache.set(stroke, path);
  return path;
}

export function liveStrokePath(stroke: Stroke): SkPath | null {
  return buildStrokePath(stroke, false);
}

export function appendPoint(points: number[], x: number, y: number, minDistance: number): boolean {
  const px = Math.round(x * 10) / 10;
  const py = Math.round(y * 10) / 10;
  const n = points.length;
  if (n >= 2 && Math.hypot(points[n - 2] - px, points[n - 1] - py) < minDistance) {
    return false;
  }
  points.push(px, py);
  return true;
}

export function fitImageRect(
  imageW: number,
  imageH: number,
  box: { x: number; y: number; w: number; h: number },
): { x: number; y: number; w: number; h: number } {
  const scale = Math.min(box.w / Math.max(1, imageW), box.h / Math.max(1, imageH));
  const w = Math.round(imageW * scale * 10) / 10;
  const h = Math.round(imageH * scale * 10) / 10;
  return {
    x: Math.round((box.x + (box.w - w) / 2) * 10) / 10,
    y: Math.round((box.y + (box.h - h) / 2) * 10) / 10,
    w,
    h,
  };
}

export function strokePaint(stroke: Stroke): SkPaint {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  if (stroke.tool === 'eraser') {
    paint.setBlendMode(BlendMode.Clear);
  } else {
    paint.setColor(Skia.Color(stroke.color));
    paint.setAlphaf(stroke.opacity);
  }
  if (isOutlineTool(stroke.tool)) {
    paint.setStyle(PaintStyle.Fill);
  } else {
    paint.setStyle(PaintStyle.Stroke);
    paint.setStrokeWidth(stroke.size);
    paint.setStrokeCap(StrokeCap.Round);
    paint.setStrokeJoin(StrokeJoin.Round);
  }
  return paint;
}

export function drawStroke(canvas: SkCanvas, stroke: Stroke, last = true): void {
  const path = strokePath(stroke, last);
  if (path) {
    canvas.drawPath(path, strokePaint(stroke));
  }
}

export function drawLayer(canvas: SkCanvas, layer: ArtLayer): void {
  if (!layer.visible || (!layer.strokes.length && !layer.image)) {
    return;
  }
  const layerPaint = Skia.Paint();
  layerPaint.setAlphaf(layer.opacity);
  canvas.saveLayer(layerPaint);
  drawLayerContent(canvas, layer);
  canvas.restore();
}

export function drawLayerContent(canvas: SkCanvas, layer: Pick<ArtLayer, 'strokes' | 'image'>): void {
  if (layer.image) {
    const image = getImage(layer.image.uri);
    if (image) {
      const paint = Skia.Paint();
      paint.setAntiAlias(true);
      canvas.drawImageRect(
        image,
        Skia.XYWHRect(0, 0, image.width(), image.height()),
        Skia.XYWHRect(layer.image.x, layer.image.y, layer.image.w, layer.image.h),
        paint,
      );
    }
  }
  for (const stroke of layer.strokes) {
    drawStroke(canvas, stroke);
  }
}

const RECORD_BOUNDS = 40000;

export function recordLayerContent(layer: Pick<ArtLayer, 'strokes' | 'image'>): SkPicture {
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(
    Skia.XYWHRect(-RECORD_BOUNDS, -RECORD_BOUNDS, RECORD_BOUNDS * 2, RECORD_BOUNDS * 2),
  );
  drawLayerContent(canvas, layer);
  return recorder.finishRecordingAsPicture();
}

export function sampleArtColor(art: PanelArt, x: number, y: number): string | null {
  const surface = Skia.Surface.Make(1, 1);
  if (!surface) {
    return null;
  }
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color('transparent'));
  canvas.translate(-x, -y);
  drawArt(canvas, art);
  surface.flush();
  const pixels = surface
    .makeImageSnapshot()
    .readPixels(0, 0, { width: 1, height: 1, colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul });
  if (!pixels || pixels.length < 4 || pixels[3] < 8) {
    return null;
  }
  const alpha = pixels[3] / 255;
  const hex = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v * alpha + 255 * (1 - alpha))))
      .toString(16)
      .padStart(2, '0');
  return `#${hex(pixels[0])}${hex(pixels[1])}${hex(pixels[2])}`.toUpperCase();
}

export function drawArt(canvas: SkCanvas, art: PanelArt | null, options: ArtDrawOptions = {}): void {
  if (!art) {
    return;
  }
  for (const layer of art.layers) {
    if (layer.id === options.skipLayerId) {
      continue;
    }
    if (options.onlyLayerIds && !options.onlyLayerIds.includes(layer.id)) {
      continue;
    }
    drawLayer(canvas, layer);
  }
}

export function artImageUris(art: PanelArt | null): string[] {
  return art ? art.layers.flatMap(layer => (layer.image ? [layer.image.uri] : [])) : [];
}
