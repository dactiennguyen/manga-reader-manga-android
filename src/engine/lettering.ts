import {
  PaintStyle,
  PathOp,
  Skia,
  StrokeJoin,
  TextAlign,
  TileMode,
  type SkCanvas,
  type SkParagraph,
  type SkPath,
  type SkTypefaceFontProvider,
} from '@shopify/react-native-skia';

import { hashString, uid } from '../lib/id';
import type { Bubble, BubbleType, Effect, EffectType } from '../model/types';
import { FONT_FAMILY } from './fonts';
import type { PanelShape, Pt } from './layout';

export const MIN_FONT_SIZE = 17;
export const BUBBLE_STROKE = 3.5;

const INK = '#16161A';
const PAPER = '#FFFFFF';

export const SFX_STYLES: { label: string; font: Bubble['font']; letterSpacing: number; skew: number }[] = [
  { label: 'Đậm', font: 'display', letterSpacing: 1, skew: 0 },
  { label: 'Nghiêng', font: 'display', letterSpacing: 2, skew: -0.25 },
  { label: 'Giãn', font: 'display', letterSpacing: 10, skew: 0 },
  { label: 'Tay', font: 'hand', letterSpacing: 2, skew: -0.12 },
  { label: 'Vuông', font: 'sansBold', letterSpacing: 1, skew: 0 },
  { label: 'Rung', font: 'sansBold', letterSpacing: 6, skew: 0.2 },
];

function random(seed: string): () => number {
  let a = parseInt(hashString(seed), 36) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createBubble(type: BubbleType, center: Pt, init: Partial<Bubble> = {}): Bubble {
  const sfx = type === 'sfx';
  const narration = type === 'narration';
  const w = init.w ?? (sfx ? 300 : narration ? 320 : 260);
  const h = init.h ?? (sfx ? 130 : narration ? 110 : 170);
  return {
    id: uid(),
    type,
    text: '',
    x: center.x - w / 2,
    y: center.y - h / 2,
    w,
    h,
    rotation: sfx ? -8 : 0,
    tail: sfx || narration ? null : { x: center.x - w * 0.15, y: center.y + h / 2 + 50 },
    fontSize: sfx ? 84 : narration ? 26 : 28,
    font: sfx ? 'display' : narration ? 'sans' : 'hand',
    bold: type === 'shout',
    narrationStyle: narration ? 'box' : undefined,
    sfxStyle: sfx ? 0 : undefined,
    outline: sfx ? 6 : undefined,
    outlineColor: sfx ? 'white' : undefined,
    ...init,
  };
}

export function bubbleCenter(bubble: Pick<Bubble, 'x' | 'y' | 'w' | 'h'>): Pt {
  return { x: bubble.x + bubble.w / 2, y: bubble.y + bubble.h / 2 };
}

function ellipsePoint(bubble: Bubble, angle: number, scale = 1): Pt {
  const c = bubbleCenter(bubble);
  return { x: c.x + (Math.cos(angle) * bubble.w * scale) / 2, y: c.y + (Math.sin(angle) * bubble.h * scale) / 2 };
}

function unrotate(bubble: Bubble, p: Pt): Pt {
  if (!bubble.rotation) {
    return p;
  }
  const c = bubbleCenter(bubble);
  const r = (-bubble.rotation * Math.PI) / 180;
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return { x: c.x + dx * Math.cos(r) - dy * Math.sin(r), y: c.y + dx * Math.sin(r) + dy * Math.cos(r) };
}

function tailPath(bubble: Bubble, tip: Pt): SkPath {
  const c = bubbleCenter(bubble);
  const angle = Math.atan2((tip.y - c.y) / bubble.h, (tip.x - c.x) / bubble.w);
  const spread = 0.22;
  const a = ellipsePoint(bubble, angle - spread, 0.9);
  const b = ellipsePoint(bubble, angle + spread, 0.9);
  return Skia.PathBuilder.Make().moveTo(a.x, a.y).lineTo(tip.x, tip.y).lineTo(b.x, b.y).close().build();
}

function cloudPath(bubble: Bubble): SkPath {
  const builder = Skia.PathBuilder.Make();
  const bumps = Math.max(8, Math.round((bubble.w + bubble.h) / 55));
  const r = Math.min(bubble.w, bubble.h) * 0.2;
  builder.addOval(Skia.XYWHRect(bubble.x + r * 0.6, bubble.y + r * 0.6, bubble.w - r * 1.2, bubble.h - r * 1.2));
  for (let i = 0; i < bumps; i++) {
    const p = ellipsePoint(bubble, (i / bumps) * Math.PI * 2, 0.78);
    builder.addCircle(p.x, p.y, r);
  }
  const path = builder.build();
  return Skia.Path.Simplify(path) ?? path;
}

function burstPath(bubble: Bubble): SkPath {
  const rand = random(bubble.id);
  const spikes = Math.max(12, Math.round((bubble.w + bubble.h) / 34));
  const builder = Skia.PathBuilder.Make();
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i / (spikes * 2)) * Math.PI * 2;
    const scale = i % 2 === 0 ? 1.08 + rand() * 0.12 : 0.8 + rand() * 0.05;
    const p = ellipsePoint(bubble, angle, scale);
    if (i === 0) {
      builder.moveTo(p.x, p.y);
    } else {
      builder.lineTo(p.x, p.y);
    }
  }
  return builder.close().build();
}

export function bubbleBodyPath(bubble: Bubble): SkPath | null {
  const rect = Skia.XYWHRect(bubble.x, bubble.y, bubble.w, bubble.h);
  switch (bubble.type) {
    case 'sfx':
      return null;
    case 'narration':
      return bubble.narrationStyle === 'plain' ? null : Skia.Path.Rect(rect);
    case 'machine':
      return Skia.Path.Rect(rect);
    case 'think':
      return cloudPath(bubble);
    case 'shout':
      return burstPath(bubble);
    default:
      return Skia.Path.Oval(rect);
  }
}

function withTail(bubble: Bubble, body: SkPath): SkPath {
  if (!bubble.tail || bubble.type === 'think' || bubble.type === 'narration') {
    return body;
  }
  const tip = unrotate(bubble, bubble.tail);
  return Skia.Path.MakeFromOp(body, tailPath(bubble, tip), PathOp.Union) ?? body;
}

function textInset(bubble: Bubble): { x: number; y: number } {
  switch (bubble.type) {
    case 'sfx':
      return { x: 0, y: 0 };
    case 'narration':
    case 'machine':
      return { x: 16, y: 12 };
    case 'think':
      return { x: bubble.w * 0.2, y: bubble.h * 0.2 };
    case 'shout':
      return { x: bubble.w * 0.2, y: bubble.h * 0.2 };
    default:
      return { x: bubble.w * 0.15, y: bubble.h * 0.14 };
  }
}

function buildParagraph(
  bubble: Bubble,
  fonts: SkTypefaceFontProvider,
  fontSize: number,
  color: string,
  stroke?: { width: number; color: string },
): SkParagraph {
  const sfxStyle = bubble.type === 'sfx' ? SFX_STYLES[bubble.sfxStyle ?? 0] ?? SFX_STYLES[0] : null;
  const font = sfxStyle ? sfxStyle.font : bubble.bold && bubble.font === 'sans' ? 'sansBold' : bubble.font;
  const textStyle = {
    color: Skia.Color(color),
    fontFamilies: [FONT_FAMILY[font]],
    fontSize,
    heightMultiplier: sfxStyle ? 1 : 1.15,
    letterSpacing: sfxStyle ? sfxStyle.letterSpacing : 0,
  };
  const builder = Skia.ParagraphBuilder.Make({ textAlign: TextAlign.Center, textStyle }, fonts);
  if (stroke) {
    const paint = Skia.Paint();
    paint.setStyle(PaintStyle.Stroke);
    paint.setStrokeWidth(stroke.width);
    paint.setStrokeJoin(StrokeJoin.Round);
    paint.setAntiAlias(true);
    paint.setColor(Skia.Color(stroke.color));
    builder.pushStyle(textStyle, paint);
  } else {
    builder.pushStyle(textStyle);
  }
  builder.addText(bubble.text || ' ');
  return builder.build();
}

export function fitBubbleText(
  bubble: Bubble,
  fonts: SkTypefaceFontProvider,
): { fontSize: number; width: number; height: number; overflow: boolean } {
  const inset = textInset(bubble);
  const width = Math.max(20, bubble.w - inset.x * 2);
  const maxHeight = Math.max(20, bubble.h - inset.y * 2);
  let fontSize = bubble.fontSize;
  let height = 0;
  for (;;) {
    const paragraph = buildParagraph(bubble, fonts, fontSize, INK);
    paragraph.layout(width);
    height = paragraph.getHeight();
    if (bubble.type === 'sfx' || height <= maxHeight || fontSize <= MIN_FONT_SIZE) {
      break;
    }
    fontSize = Math.max(MIN_FONT_SIZE, fontSize - 2);
  }
  return { fontSize, width, height, overflow: bubble.type !== 'sfx' && height > maxHeight };
}

function drawThoughtTrail(canvas: SkCanvas, bubble: Bubble): void {
  if (!bubble.tail) {
    return;
  }
  const tip = unrotate(bubble, bubble.tail);
  const c = bubbleCenter(bubble);
  const angle = Math.atan2((tip.y - c.y) / bubble.h, (tip.x - c.x) / bubble.w);
  const start = ellipsePoint(bubble, angle, 1.02);
  const fill = Skia.Paint();
  fill.setAntiAlias(true);
  fill.setColor(Skia.Color(PAPER));
  const line = Skia.Paint();
  line.setAntiAlias(true);
  line.setStyle(PaintStyle.Stroke);
  line.setStrokeWidth(BUBBLE_STROKE);
  line.setColor(Skia.Color(INK));
  [0.25, 0.6, 0.95].forEach((t, index) => {
    const r = 15 - index * 4.5;
    const x = start.x + (tip.x - start.x) * t;
    const y = start.y + (tip.y - start.y) * t;
    canvas.drawCircle(x, y, r, fill);
    canvas.drawCircle(x, y, r, line);
  });
}

export function drawBubble(canvas: SkCanvas, bubble: Bubble, fonts: SkTypefaceFontProvider | null): void {
  const c = bubbleCenter(bubble);
  canvas.save();
  if (bubble.rotation) {
    canvas.rotate(bubble.rotation, c.x, c.y);
  }
  const inverse = bubble.type === 'narration' && bubble.narrationStyle === 'inverse';
  const body = bubbleBodyPath(bubble);
  if (body) {
    const path = withTail(bubble, body);
    const fill = Skia.Paint();
    fill.setAntiAlias(true);
    fill.setColor(Skia.Color(inverse ? INK : PAPER));
    canvas.drawPath(path, fill);
    const line = Skia.Paint();
    line.setAntiAlias(true);
    line.setStyle(PaintStyle.Stroke);
    line.setStrokeWidth(bubble.type === 'shout' ? BUBBLE_STROKE * 1.4 : BUBBLE_STROKE);
    line.setStrokeJoin(bubble.type === 'machine' || bubble.type === 'shout' ? StrokeJoin.Miter : StrokeJoin.Round);
    line.setColor(Skia.Color(INK));
    if (bubble.type === 'whisper') {
      line.setPathEffect(Skia.PathEffect.MakeDash([12, 9], 0));
    }
    canvas.drawPath(path, line);
    if (bubble.type === 'think') {
      drawThoughtTrail(canvas, bubble);
    }
  }
  if (fonts && bubble.text.trim()) {
    const fit = fitBubbleText(bubble, fonts);
    const inset = textInset(bubble);
    const x = bubble.x + inset.x;
    const y = c.y - fit.height / 2;
    const color = bubble.color ?? (inverse ? PAPER : INK);
    if (bubble.type === 'sfx') {
      const style = SFX_STYLES[bubble.sfxStyle ?? 0] ?? SFX_STYLES[0];
      const skew = bubble.skew ?? style.skew;
      if (skew) {
        canvas.translate(c.x, c.y);
        canvas.skew(skew, 0);
        canvas.translate(-c.x, -c.y);
      }
      if (bubble.outline) {
        const outlineColor = bubble.outlineColor === 'black' ? INK : PAPER;
        const outlined = buildParagraph(bubble, fonts, fit.fontSize, outlineColor, {
          width: bubble.outline * 2,
          color: outlineColor,
        });
        outlined.layout(fit.width);
        outlined.paint(canvas, x, y);
      }
    }
    if (bubble.bold && bubble.type !== 'sfx' && bubble.font !== 'sansBold') {
      const heavy = buildParagraph(bubble, fonts, fit.fontSize, color, { width: fit.fontSize * 0.05, color });
      heavy.layout(fit.width);
      heavy.paint(canvas, x, y);
    }
    const paragraph = buildParagraph(bubble, fonts, fit.fontSize, color);
    paragraph.layout(fit.width);
    paragraph.paint(canvas, x, y);
  }
  canvas.restore();
}

export function createEffect(type: EffectType, panelId: string): Effect {
  return {
    id: uid(),
    panelId,
    type,
    density: 0.5,
    angle: type === 'gradient' ? 90 : 0,
    cx: 0.5,
    cy: 0.5,
    opacity: type === 'tone' || type === 'gradient' ? 0.5 : 1,
  };
}

export function drawEffect(canvas: SkCanvas, effect: Effect, shape: PanelShape): void {
  const bb = shape.bbox;
  const rand = random(effect.id);
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setColor(Skia.Color(INK));
  paint.setAlphaf(effect.opacity);
  const diag = Math.hypot(bb.w, bb.h);
  const cx = bb.x + bb.w * effect.cx;
  const cy = bb.y + bb.h * effect.cy;

  if (effect.type === 'speed') {
    const builder = Skia.PathBuilder.Make();
    const count = Math.round(18 + effect.density * 90);
    for (let i = 0; i < count; i++) {
      const offset = (rand() - 0.5) * diag;
      const start = (rand() - 0.5) * diag * 0.9;
      const length = diag * (0.15 + rand() * 0.5);
      const width = 1 + rand() * 5;
      builder.moveTo(start, offset - width / 2);
      builder.lineTo(start + length, offset);
      builder.lineTo(start, offset + width / 2);
      builder.close();
    }
    canvas.save();
    canvas.translate(bb.x + bb.w / 2, bb.y + bb.h / 2);
    canvas.rotate(effect.angle, 0, 0);
    canvas.drawPath(builder.build(), paint);
    canvas.restore();
    return;
  }

  if (effect.type === 'focus') {
    const builder = Skia.PathBuilder.Make();
    const count = Math.round(40 + effect.density * 160);
    const inner = Math.min(bb.w, bb.h) * 0.3;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + rand() * 0.04;
      const spread = 0.004 + rand() * 0.012;
      const r0 = inner * (0.8 + rand() * 0.7);
      builder.moveTo(cx + Math.cos(angle) * r0, cy + Math.sin(angle) * r0);
      builder.lineTo(cx + Math.cos(angle - spread) * diag, cy + Math.sin(angle - spread) * diag);
      builder.lineTo(cx + Math.cos(angle + spread) * diag, cy + Math.sin(angle + spread) * diag);
      builder.close();
    }
    canvas.drawPath(builder.build(), paint);
    return;
  }

  if (effect.type === 'tone') {
    const builder = Skia.PathBuilder.Make();
    const gap = 11;
    const r = 1.2 + effect.density * 3.4;
    let row = 0;
    for (let y = bb.y; y <= bb.y + bb.h; y += gap * 0.866, row++) {
      for (let x = bb.x + (row % 2 ? gap / 2 : 0); x <= bb.x + bb.w; x += gap) {
        builder.addCircle(x, y, r);
      }
    }
    canvas.drawPath(builder.build(), paint);
    return;
  }

  if (effect.type === 'gradient') {
    const rad = (effect.angle * Math.PI) / 180;
    const dx = (Math.cos(rad) * bb.w) / 2;
    const dy = (Math.sin(rad) * bb.h) / 2;
    const strength = 0.35 + effect.density * 0.65;
    paint.setShader(
      Skia.Shader.MakeLinearGradient(
        Skia.Point(bb.x + bb.w / 2 - dx, bb.y + bb.h / 2 - dy),
        Skia.Point(bb.x + bb.w / 2 + dx, bb.y + bb.h / 2 + dy),
        [Skia.Color('rgba(22,22,26,0)'), Skia.Color(`rgba(22,22,26,${strength})`)],
        null,
        TileMode.Clamp,
      ),
    );
    canvas.drawRect(Skia.XYWHRect(bb.x, bb.y, bb.w, bb.h), paint);
    return;
  }

  const builder = Skia.PathBuilder.Make();
  const count = Math.round(6 + effect.density * 34);
  for (let i = 0; i < count; i++) {
    const x = bb.x + rand() * bb.w;
    const y = bb.y + rand() * bb.h;
    const r = 8 + rand() * 26;
    const k = r * 0.18;
    builder.moveTo(x, y - r);
    builder.quadTo(x + k, y - k, x + r, y);
    builder.quadTo(x + k, y + k, x, y + r);
    builder.quadTo(x - k, y + k, x - r, y);
    builder.quadTo(x - k, y - k, x, y - r);
    builder.close();
  }
  canvas.drawPath(builder.build(), paint);
}
