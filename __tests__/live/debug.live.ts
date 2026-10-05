/**
 * Soi nhanh một site khi sửa engine:
 *   SITE=cocomic.co ENGINE=madara npx jest -c jest.live.config.js debug
 *   SITE=… ENGINE=… DETAIL=<url> | CHAPTER=<url> | SEARCH=<từ khoá> | GENRES=1
 * Thiếu SITE thì bỏ qua.
 */
import { probeSite } from '../../src/features/addons/siteProbe';
import { errorMessage } from '../../src/lib/http';
import * as fs from 'fs';
import * as path from 'path';

import { getEngine } from '../../src/sources';
import { sourceEngine } from '../helpers/addons';
import { configureSources } from '../../src/sources/runtime';
import type { ContentType, EngineId, SourceConfig } from '../../src/sources/types';

const env = process.env;
const log = (...args: unknown[]) => process.stdout.write(`${args.map(a => (typeof a === 'string' ? a : JSON.stringify(a, null, 1))).join(' ')}\n`);

(env.SITE ? test : test.skip)('debug site', async () => {
  configureSources({ allowNsfw: true });
  // Có mã nguồn addon thì chạy thẳng mã nguồn (đang sửa), không thì bản đang dùng trong app.
  const id = env.ENGINE as EngineId;
  const engine = fs.existsSync(path.resolve(__dirname, '../../addons', id, 'main.ts')) ? sourceEngine(id) : getEngine(id);
  let baseUrl = `https://${env.SITE}`;
  let mangaDir = env.DIR ?? 'manga';
  if (engine.allowCustomSites && !env.DIR) {
    const probe = await probeSite(env.SITE!);
    log('probe', probe);
    baseUrl = probe.baseUrl;
    mangaDir = probe.mangaDir;
  }
  const src: SourceConfig = {
    id: env.SITE!,
    engine: engine.id,
    name: env.SITE!,
    baseUrl,
    content: (env.CONTENT as ContentType) ?? 'manga',
    lang: 'en',
    nsfw: false,
    enabled: true,
    addedAt: 0,
    options: { mangaDir },
  };
  try {
    if (env.DETAIL) {
      const d = await engine.detail(src, env.DETAIL);
      log({ ...d, chapters: d.chapters.slice(0, 5), chapterCount: d.chapters.length, similar: d.similar?.slice(0, 3) });
    } else if (env.CHAPTER) {
      const c = await engine.chapter(src, env.CHAPTER);
      log(c.kind === 'images' ? { ...c, pages: c.pages.slice(0, 5), count: c.pages.length } : { ...c, paragraphs: c.paragraphs.slice(0, 5), count: c.paragraphs.length });
    } else if (env.SEARCH) {
      log(await engine.search(src, env.SEARCH, Number(env.PAGE ?? 1)));
    } else if (env.GENRES) {
      log(await engine.genres(src));
    } else {
      const list = await engine.list(src, (env.SORT as any) ?? 'latest', Number(env.PAGE ?? 1));
      log({ hasNext: list.hasNext, count: list.items.length, items: list.items.slice(0, 5) });
    }
  } catch (error) {
    log('ERROR', errorMessage(error), (error as any)?.url ?? '');
  }
});
