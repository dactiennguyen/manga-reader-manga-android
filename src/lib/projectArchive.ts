import { exportArt, importArt } from '../engine/artStore';
import type {
  Chapter,
  Character,
  ID,
  LayoutNode,
  Page,
  Panel,
  PanelArt,
  Project,
  Relation,
  Scene,
  WorldEntry,
} from '../model/types';
import { useStory } from '../store/useStory';
import {
  DIRS,
  RNFS,
  copyIntoImages,
  ensureDirs,
  extensionOf,
  removeFile,
  resetDir,
  stripFileScheme,
  unzipTo,
  zipDir,
} from './files';
import { slugify, uid } from './id';
import { dayKey } from './time';

export const ARCHIVE_EXTENSION = 'mangaka';

const INVALID_MESSAGE = "This file can't be read or isn't a Mangaka project";
const RELATIVE_IMAGE = /^images\/[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/;

export type ProjectBundle = {
  version: 1;
  app: 'mangaka';
  exportedAt: number;
  project: Project;
  chapters: Chapter[];
  scenes: Scene[];
  characters: Character[];
  relations: Relation[];
  world: WorldEntry[];
  pages: Page[];
  art: Record<ID, PanelArt>;
};

type PathMapper = (path: string) => string | undefined;

function collectLayoutPanelIds(node: LayoutNode | null, out: ID[]): void {
  if (!node) {
    return;
  }
  if (node.kind === 'panel') {
    out.push(node.id);
    return;
  }
  collectLayoutPanelIds(node.a, out);
  collectLayoutPanelIds(node.b, out);
}

export function buildProjectBundle(projectId: ID): ProjectBundle | null {
  const state = useStory.getState();
  const project = state.projects[projectId];
  if (!project) {
    return null;
  }
  const chapters = Object.values(state.chapters).filter(chapter => chapter.projectId === projectId);
  const chapterIds = new Set(chapters.map(chapter => chapter.id));
  const scenes = Object.values(state.scenes).filter(scene => chapterIds.has(scene.chapterId));
  const pages = Object.values(state.pages).filter(page => chapterIds.has(page.chapterId));
  const panelIds: ID[] = [];
  for (const page of pages) {
    const ids = Object.keys(page.panels);
    collectLayoutPanelIds(page.layout, ids);
    panelIds.push(...ids);
  }
  return {
    version: 1,
    app: 'mangaka',
    exportedAt: Date.now(),
    project,
    chapters,
    scenes,
    characters: Object.values(state.characters).filter(character => character.projectId === projectId),
    relations: Object.values(state.relations).filter(relation => relation.projectId === projectId),
    world: Object.values(state.world).filter(entry => entry.projectId === projectId),
    pages,
    art: exportArt([...new Set(panelIds)]),
  };
}

export function mapBundleImages(bundle: ProjectBundle, mapPath: PathMapper): ProjectBundle {
  const optional = (path: string | undefined) => (path ? mapPath(path) : undefined);
  const art: Record<ID, PanelArt> = {};
  for (const [panelId, panelArt] of Object.entries(bundle.art)) {
    art[panelId] = {
      ...panelArt,
      layers: panelArt.layers.map(layer => {
        if (!layer.image) {
          return layer;
        }
        const uri = mapPath(layer.image.uri);
        const { image, ...rest } = layer;
        return uri ? { ...rest, image: { ...image, uri } } : rest;
      }),
    };
  }
  return {
    ...bundle,
    project: { ...bundle.project, coverUri: optional(bundle.project.coverUri) },
    characters: bundle.characters.map(character => {
      const expressions: Character['sheet']['expressions'] = {};
      for (const [name, path] of Object.entries(character.sheet?.expressions ?? {})) {
        const mapped = optional(path);
        if (mapped) {
          expressions[name as keyof typeof expressions] = mapped;
        }
      }
      return {
        ...character,
        sheet: { face: optional(character.sheet?.face), body: optional(character.sheet?.body), expressions },
      };
    }),
    world: bundle.world.map(entry => ({
      ...entry,
      images: (entry.images ?? []).map(mapPath).filter((path): path is string => !!path),
    })),
    art,
  };
}

function remapLayout(node: LayoutNode | null, map: (id: ID) => ID): LayoutNode | null {
  if (!node) {
    return null;
  }
  if (node.kind === 'panel') {
    return { kind: 'panel', id: map(node.id) };
  }
  return {
    ...node,
    id: map(node.id),
    a: remapLayout(node.a, map) as LayoutNode,
    b: remapLayout(node.b, map) as LayoutNode,
  };
}

export function remapBundleIds(bundle: ProjectBundle, newId: () => ID = uid): ProjectBundle {
  const table = new Map<ID, ID>();
  const map = (id: ID): ID => {
    let next = table.get(id);
    if (!next) {
      next = newId();
      table.set(id, next);
    }
    return next;
  };
  const optional = (id: ID | undefined): ID | undefined => (id ? map(id) : undefined);
  const list = (ids: ID[] | undefined): ID[] => (ids ?? []).map(map);

  const project: Project = {
    ...bundle.project,
    id: map(bundle.project.id),
    acts: (bundle.project.acts ?? []).map(act => ({ ...act, id: map(act.id), chapterIds: list(act.chapterIds) })),
    lastOpened: bundle.project.lastOpened
      ? {
          ...bundle.project.lastOpened,
          chapterId: optional(bundle.project.lastOpened.chapterId),
          pageId: optional(bundle.project.lastOpened.pageId),
          panelId: optional(bundle.project.lastOpened.panelId),
        }
      : undefined,
  };

  const chapters = bundle.chapters.map(chapter => ({
    ...chapter,
    id: map(chapter.id),
    projectId: project.id,
    characterIds: list(chapter.characterIds),
    sceneIds: list(chapter.sceneIds),
    pageIds: list(chapter.pageIds),
  }));

  const scenes = bundle.scenes.map(scene => ({
    ...scene,
    id: map(scene.id),
    chapterId: map(scene.chapterId),
    blocks: (scene.blocks ?? []).map(block => ({
      ...block,
      id: map(block.id),
      characterId: optional(block.characterId),
    })),
  }));

  const characters = bundle.characters.map(character => ({
    ...character,
    id: map(character.id),
    projectId: project.id,
  }));

  const relations = bundle.relations.map(relation => ({
    ...relation,
    id: map(relation.id),
    projectId: project.id,
    a: map(relation.a),
    b: map(relation.b),
  }));

  const world = bundle.world.map(entry => ({
    ...entry,
    id: map(entry.id),
    projectId: project.id,
    characterIds: list(entry.characterIds),
    leaderId: optional(entry.leaderId),
    anchor: entry.anchor === 'before' || entry.anchor === 'after' ? entry.anchor : optional(entry.anchor),
  }));

  const pages = bundle.pages.map(page => {
    const panels: Record<ID, Panel> = {};
    for (const [panelId, panel] of Object.entries(page.panels ?? {})) {
      const id = map(panelId);
      panels[id] = { ...panel, id, blockIds: list(panel.blockIds) };
    }
    return {
      ...page,
      id: map(page.id),
      chapterId: map(page.chapterId),
      layout: remapLayout(page.layout, map),
      panels,
      order: page.order ? list(page.order) : undefined,
      bubbles: (page.bubbles ?? []).map(bubble => ({
        ...bubble,
        id: map(bubble.id),
        blockId: optional(bubble.blockId),
        characterId: optional(bubble.characterId),
      })),
      effects: (page.effects ?? []).map(effect => ({ ...effect, id: map(effect.id), panelId: map(effect.panelId) })),
    };
  });

  const art: Record<ID, PanelArt> = {};
  for (const [panelId, panelArt] of Object.entries(bundle.art ?? {})) {
    art[map(panelId)] = panelArt;
  }

  return { ...bundle, project, chapters, scenes, characters, relations, world, pages, art };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasId(value: unknown): boolean {
  return isRecord(value) && typeof value.id === 'string' && value.id.length > 0;
}

export function parseProjectBundle(json: string): ProjectBundle {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error(INVALID_MESSAGE);
  }
  if (!isRecord(data) || data.version !== 1 || !isRecord(data.project) || !hasId(data.project)) {
    throw new Error(INVALID_MESSAGE);
  }
  if (typeof data.project.title !== 'string' || !Array.isArray(data.project.acts)) {
    throw new Error(INVALID_MESSAGE);
  }
  const lists = ['chapters', 'scenes', 'characters', 'relations', 'world', 'pages'] as const;
  for (const name of lists) {
    const items = data[name];
    if (!Array.isArray(items) || !items.every(hasId)) {
      throw new Error(INVALID_MESSAGE);
    }
  }
  if (data.art !== undefined && !isRecord(data.art)) {
    throw new Error(INVALID_MESSAGE);
  }
  const art: Record<ID, PanelArt> = {};
  for (const [panelId, value] of Object.entries((data.art as Record<string, unknown>) ?? {})) {
    if (panelId !== '__proto__' && isRecord(value) && Array.isArray(value.layers)) {
      art[panelId] = value as unknown as PanelArt;
    }
  }
  return { ...(data as unknown as ProjectBundle), art };
}

function uniqueTitle(title: string): string {
  const taken = new Set(Object.values(useStory.getState().projects).map(project => project.title));
  if (!taken.has(title)) {
    return title;
  }
  let n = 2;
  while (taken.has(`${title} (${n})`)) {
    n++;
  }
  return `${title} (${n})`;
}

async function freeArchivePath(base: string): Promise<string> {
  let path = `${DIRS.exports}/${base}.${ARCHIVE_EXTENSION}`;
  let n = 2;
  while (await RNFS.exists(path)) {
    path = `${DIRS.exports}/${base}-${n}.${ARCHIVE_EXTENSION}`;
    n++;
  }
  return path;
}

function byId<T extends { id: ID }>(items: T[]): Record<ID, T> {
  const out: Record<ID, T> = {};
  for (const item of items) {
    out[item.id] = item;
  }
  return out;
}

export async function exportProjectArchive(projectId: ID): Promise<string> {
  const bundle = buildProjectBundle(projectId);
  if (!bundle) {
    throw new Error('Story not found.');
  }
  await ensureDirs();
  const tmpDir = `${DIRS.tmp}/archive-${uid()}`;
  await resetDir(tmpDir);
  try {
    await RNFS.mkdir(`${tmpDir}/images`);
    const names = new Map<string, string>();
    const portable = mapBundleImages(bundle, path => {
      const source = stripFileScheme(path);
      let relative = names.get(source);
      if (!relative) {
        relative = `images/${names.size + 1}.${extensionOf(source)}`;
        names.set(source, relative);
      }
      return relative;
    });
    const missing = new Set<string>();
    for (const [source, relative] of names) {
      if (await RNFS.exists(source)) {
        await RNFS.copyFile(source, `${tmpDir}/${relative}`);
      } else {
        missing.add(relative);
      }
    }
    const story = missing.size ? mapBundleImages(portable, path => (missing.has(path) ? undefined : path)) : portable;
    await RNFS.writeFile(`${tmpDir}/story.json`, JSON.stringify(story), 'utf8');
    const outPath = await freeArchivePath(`${slugify(bundle.project.title)}-${dayKey()}`);
    await zipDir(tmpDir, outPath);
    return outPath;
  } finally {
    await removeFile(tmpDir);
  }
}

export async function importProjectArchive(archivePath: string): Promise<ID> {
  await ensureDirs();
  const tmpDir = `${DIRS.tmp}/import-${uid()}`;
  await resetDir(tmpDir);
  try {
    let json: string;
    try {
      await unzipTo(stripFileScheme(archivePath), tmpDir);
      json = await RNFS.readFile(`${tmpDir}/story.json`, 'utf8');
    } catch {
      throw new Error(INVALID_MESSAGE);
    }
    const remapped = remapBundleIds(parseProjectBundle(json));

    const relatives = new Set<string>();
    mapBundleImages(remapped, path => {
      if (RELATIVE_IMAGE.test(path)) {
        relatives.add(path);
      }
      return path;
    });
    const copied = new Map<string, string>();
    for (const relative of relatives) {
      const source = `${tmpDir}/${relative}`;
      if (await RNFS.exists(source)) {
        copied.set(relative, await copyIntoImages(source));
      }
    }
    const local = mapBundleImages(remapped, path => copied.get(path));

    const now = Date.now();
    const project: Project = { ...local.project, title: uniqueTitle(local.project.title), updatedAt: now };
    delete project.deletedAt;
    useStory.getState().mergeEntities({
      projects: { [project.id]: project },
      chapters: byId(local.chapters),
      scenes: byId(local.scenes),
      characters: byId(local.characters),
      relations: byId(local.relations),
      world: byId(local.world),
      pages: byId(local.pages),
    });
    importArt(local.art);
    return project.id;
  } finally {
    await removeFile(tmpDir);
  }
}
