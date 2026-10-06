import { ImageFormat, Skia, TextAlign, type SkImage } from '@shopify/react-native-skia';

import { FONT_FAMILY, loadFonts } from '../../engine/fonts';
import { loadImage } from '../../engine/images';
import { isRtl, pageSize } from '../../engine/layout';
import { pageContext, renderPageImage, renderPageToFile } from '../../engine/page';
import { DIRS, MIME, RNFS, ensureDirs, fileSize, removeFile, resetDir, zipDir, imagesToPdf } from '../../lib/files';
import { slugify, uid } from '../../lib/id';
import { dayKey } from '../../lib/time';
import type { ID, Project } from '../../model/types';
import { useStory } from '../../store/useStory';

export type ExportFormat = 'png' | 'pdf' | 'cbz' | 'long';

export type ExportOptions = {
  format: ExportFormat;
  quality: 1 | 2;
  spread: boolean;
  cover: boolean;
  info: boolean;
  penName: string;
  longWidth: 800 | 1080;
  autoCut: boolean;
  gap: number;
};

export type ExportResult = {
  path: string;
  fileName: string;
  mime: string;
  size: number;
  pages: number;
  format: ExportFormat;
  createdAt: number;
};

export type ExportProgress = { done: number; total: number };

export class ExportCancelled extends Error {}

export const LONG_CUT_HEIGHT = 4000;
const LONG_MAX_HEIGHT = 16000;
const PAPER = '#FFFFFF';
const INK = '#16161A';

const yieldToUi = () => new Promise<void>(resolve => setTimeout(resolve, 0));

function pad(n: number): string {
  return String(n).padStart(3, '0');
}

async function writeImage(image: SkImage, path: string, format: 'png' | 'jpg'): Promise<void> {
  const base64 =
    format === 'jpg' ? image.encodeToBase64(ImageFormat.JPEG, 92) : image.encodeToBase64(ImageFormat.PNG, 100);
  await RNFS.writeFile(path, base64, 'base64');
}

function paragraph(
  fonts: Awaited<ReturnType<typeof loadFonts>>,
  text: string,
  family: string,
  fontSize: number,
  width: number,
) {
  const builder = Skia.ParagraphBuilder.Make(
    { textAlign: TextAlign.Center, textStyle: { color: Skia.Color(INK), fontFamilies: [family], fontSize } },
    fonts,
  );
  builder.addText(text);
  const built = builder.build();
  built.layout(width);
  return built;
}

async function renderCover(project: Project, penName: string, w: number, h: number): Promise<SkImage | null> {
  const surface = Skia.Surface.Make(w, h);
  if (!surface) {
    return null;
  }
  const canvas = surface.getCanvas();
  canvas.drawColor(Skia.Color(PAPER));
  const art = project.coverUri ? await loadImage(project.coverUri) : null;
  if (art) {
    const scale = Math.max(w / art.width(), h / art.height());
    const sw = w / scale;
    const sh = h / scale;
    const src = Skia.XYWHRect((art.width() - sw) / 2, (art.height() - sh) / 2, sw, sh);
    canvas.drawImageRect(art, src, Skia.XYWHRect(0, 0, w, h), Skia.Paint());
  } else {
    const fonts = await loadFonts();
    const inner = w * 0.84;
    const title = paragraph(fonts, project.title.toUpperCase(), FONT_FAMILY.display, w * 0.13, inner);
    const top = Math.max(h * 0.12, (h - title.getHeight()) / 2 - h * 0.06);
    title.paint(canvas, (w - inner) / 2, top);
    const rule = Skia.Paint();
    rule.setColor(Skia.Color(INK));
    canvas.drawRect(
      Skia.XYWHRect(w * 0.38, top + title.getHeight() + h * 0.03, w * 0.24, Math.max(4, w * 0.008)),
      rule,
    );
    if (penName.trim()) {
      const author = paragraph(fonts, penName.trim(), FONT_FAMILY.sansBold, w * 0.04, inner);
      author.paint(canvas, (w - inner) / 2, top + title.getHeight() + h * 0.07);
    }
  }
  surface.flush();
  return surface.makeImageSnapshot();
}

async function renderInfo(project: Project, penName: string, w: number, h: number): Promise<SkImage | null> {
  const surface = Skia.Surface.Make(w, h);
  if (!surface) {
    return null;
  }
  const canvas = surface.getCanvas();
  canvas.drawColor(Skia.Color(PAPER));
  const fonts = await loadFonts();
  const inner = w * 0.8;
  const x = (w - inner) / 2;
  const title = paragraph(fonts, project.title.toUpperCase(), FONT_FAMILY.display, w * 0.07, inner);
  let y = h * 0.36;
  title.paint(canvas, x, y);
  y += title.getHeight() + h * 0.04;
  const lines = [penName.trim() ? `Author: ${penName.trim()}` : '', `Exported: ${dayKey()}`];
  for (const line of lines.filter(Boolean)) {
    const text = paragraph(fonts, line, FONT_FAMILY.sans, w * 0.032, inner);
    text.paint(canvas, x, y);
    y += text.getHeight() + h * 0.012;
  }
  surface.flush();
  return surface.makeImageSnapshot();
}

async function freeOutPath(base: string, ext: string): Promise<{ path: string; fileName: string }> {
  let fileName = `${base}.${ext}`;
  let n = 2;
  while (await RNFS.exists(`${DIRS.exports}/${fileName}`)) {
    fileName = `${base}-${n}.${ext}`;
    n++;
  }
  return { path: `${DIRS.exports}/${fileName}`, fileName };
}

export function extraPageCount(options: ExportOptions): number {
  return options.format === 'long' ? 0 : (options.cover ? 1 : 0) + (options.info ? 1 : 0);
}

export async function runExport(
  projectId: ID,
  pageIds: ID[],
  options: ExportOptions,
  onProgress: (progress: ExportProgress) => void,
  isCancelled: () => boolean,
): Promise<ExportResult> {
  const project = useStory.getState().projects[projectId];
  if (!project || pageIds.length === 0) {
    throw new Error('There are no pages to export.');
  }
  await ensureDirs();
  const tmpDir = `${DIRS.tmp}/export-${uid()}`;
  await resetDir(tmpDir);
  const base = `${slugify(project.title)}-${dayKey()}`;
  const total = pageIds.length;
  let outPath: string | null = null;
  const step = async (done: number) => {
    onProgress({ done, total });
    await yieldToUi();
    if (isCancelled()) {
      throw new ExportCancelled();
    }
  };

  try {
    await step(0);
    let out: { path: string; fileName: string };
    let mime: string;
    let count = total;

    if (options.format === 'long') {
      const width = options.longWidth;
      const heights = pageIds.map(id => {
        const ctx = pageContext(id);
        return ctx ? Math.round((ctx.size.h * width) / ctx.size.w) : 0;
      });
      const limit = options.autoCut ? LONG_CUT_HEIGHT : LONG_MAX_HEIGHT;
      const segments: { ids: number[]; height: number }[] = [];
      heights.forEach((h, i) => {
        if (!h) {
          return;
        }
        const last = segments[segments.length - 1];
        if (last && last.height + options.gap + h <= limit) {
          last.ids.push(i);
          last.height += options.gap + h;
        } else {
          segments.push({ ids: [i], height: h });
        }
      });
      if (segments.length === 0) {
        throw new Error('No pages could be rendered.');
      }
      let done = 0;
      const files: string[] = [];
      for (let s = 0; s < segments.length; s++) {
        const segment = segments[s];
        const surface = Skia.Surface.Make(width, segment.height);
        if (!surface) {
          throw new Error('Not enough memory to stitch the long image. Turn on auto-cut or pick a smaller width.');
        }
        const canvas = surface.getCanvas();
        canvas.drawColor(Skia.Color(PAPER));
        let y = 0;
        for (const index of segment.ids) {
          const image = await renderPageImage(pageIds[index], width);
          if (!image) {
            throw new Error(`Page ${index + 1} couldn't be rendered.`);
          }
          canvas.drawImage(image, 0, y);
          image.dispose();
          y += heights[index] + options.gap;
          done++;
          await step(done);
        }
        surface.flush();
        const snapshot = surface.makeImageSnapshot();
        const file = `${tmpDir}/${pad(s + 1)}.png`;
        await writeImage(snapshot, file, 'png');
        snapshot.dispose();
        surface.dispose();
        files.push(file);
      }
      count = files.length;
      if (files.length === 1) {
        out = await freeOutPath(base, 'png');
        mime = MIME.png;
        await RNFS.copyFile(files[0], out.path);
        outPath = out.path;
      } else {
        out = await freeOutPath(`${base}-long`, 'zip');
        mime = MIME.zip;
        outPath = out.path;
        await zipDir(tmpDir, out.path);
      }
    } else {
      const width = options.quality === 2 ? 2400 : 1200;
      const imageFormat = options.format === 'pdf' ? 'jpg' : 'png';
      const sheet = pageSize({ format: 'manga', pageSize: project.pageSize });
      const sheetH = Math.round((width * sheet.h) / sheet.w);
      const paths: string[] = [];
      if (options.cover) {
        const cover = await renderCover(project, options.penName, width, sheetH);
        if (cover) {
          const file = `${tmpDir}/000.${imageFormat}`;
          await writeImage(cover, file, imageFormat);
          cover.dispose();
          paths.push(file);
        }
      }
      for (let i = 0; i < total; i++) {
        const file = `${tmpDir}/${pad(i + 1)}.${imageFormat}`;
        if (!(await renderPageToFile(pageIds[i], width, file, imageFormat))) {
          throw new Error(`Page ${i + 1} couldn't be rendered.`);
        }
        paths.push(file);
        await step(i + 1);
      }
      if (options.info) {
        const info = await renderInfo(project, options.penName, width, sheetH);
        if (info) {
          const file = `${tmpDir}/${pad(total + 1)}.${imageFormat}`;
          await writeImage(info, file, imageFormat);
          info.dispose();
          paths.push(file);
        }
      }
      if (paths.length === 0) {
        throw new Error('No pages could be rendered.');
      }
      count = paths.length;
      if (options.format === 'pdf') {
        out = await freeOutPath(base, 'pdf');
        mime = MIME.pdf;
        outPath = out.path;
        await imagesToPdf(paths, out.path, options.spread, isRtl(project));
      } else {
        const cbz = options.format === 'cbz';
        out = await freeOutPath(base, cbz ? 'cbz' : 'zip');
        mime = cbz ? MIME.cbz : MIME.zip;
        outPath = out.path;
        await zipDir(tmpDir, out.path);
      }
    }
    if (isCancelled()) {
      throw new ExportCancelled();
    }
    return {
      path: out.path,
      fileName: out.fileName,
      mime,
      size: await fileSize(out.path),
      pages: count,
      format: options.format,
      createdAt: Date.now(),
    };
  } catch (error) {
    await removeFile(outPath);
    throw error;
  } finally {
    await removeFile(tmpDir);
  }
}
