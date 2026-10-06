import {
  BlendMode,
  PaintStyle,
  Skia,
  StrokeCap,
  StrokeJoin,
  type SkCanvas,
  type SkPaint,
  type SkPath,
} from '@shopify/react-native-skia';
import { getStroke, type StrokeOptions } from 'perfect-freehand';

import type { ArtLayer, ID, PanelArt, Stroke } from '../model/types';
import { getImage } from './images';

export type ArtDrawOptions = { skipLayerId?: ID; onlyLayerIds?: ID[] };

export function freehandOptions(stroke: Pick<Stroke, 'tool' | 'size' | 'pressure'>, last = true): StrokeOptions {
  const brush = stroke.tool === 'brush';
  return {
    size: stroke.size,
    thinning: brush ? 0.75 : 0.6,
    smoothing: 0.55,
    streamline: 0.45,
    simulatePressure: !stroke.pressure,
    start: { taper: brush ? stroke.size * 3 : stroke.size * 1.5, cap: true },
    end: { taper: brush ? stroke.size * 4 : stroke.size * 2, cap: true },
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

export function strokePath(stroke: Stroke, last = true): SkPath | null {
  const points = toTriples(stroke);
  if (!points.length) {
    return null;
  }
  if (isOutlineTool(stroke.tool)) {
    return outlinePath(getStroke(points, freehandOptions(stroke, last)));
  }
  return centerPath(points);
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
  canvas.restore();
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
