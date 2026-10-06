import { readJSON, storage, writeJSON } from '../lib/storage';
import { LIMITS } from '../model/constants';
import type { Block, ID } from '../model/types';
import { useStory } from './useStory';

export type ScriptVersion = { at: number; scenes: { description: string; blocks: Block[] }[] };

const key = (chapterId: ID) => `script-history:${chapterId}`;

export function listScriptVersions(chapterId: ID): ScriptVersion[] {
  return readJSON<ScriptVersion[]>(key(chapterId)) ?? [];
}

export function snapshotScript(chapterId: ID): void {
  const state = useStory.getState();
  const chapter = state.chapters[chapterId];
  if (!chapter) {
    return;
  }
  const scenes = chapter.sceneIds
    .map(id => state.scenes[id])
    .filter(Boolean)
    .map(scene => ({ description: scene.description, blocks: scene.blocks }));
  if (!scenes.some(scene => scene.blocks.some(block => block.text.trim()))) {
    return;
  }
  const versions = listScriptVersions(chapterId);
  if (versions.length && JSON.stringify(versions[0].scenes) === JSON.stringify(scenes)) {
    return;
  }
  writeJSON(key(chapterId), [{ at: Date.now(), scenes }, ...versions].slice(0, LIMITS.scriptVersions));
}

export function restoreScriptVersion(chapterId: ID, version: ScriptVersion): void {
  snapshotScript(chapterId);
  useStory.getState().replaceScript(
    chapterId,
    version.scenes.map(scene => ({
      description: scene.description,
      blocks: scene.blocks.map(block => ({ ...block })),
    })),
  );
}

export function clearScriptHistory(chapterId: ID): void {
  storage.remove(key(chapterId));
}
