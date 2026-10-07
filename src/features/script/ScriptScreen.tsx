import type { ComponentRef } from 'react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ScreenProps } from '../../app/routes';
import { CharacterPicker } from '../../components/CharacterPicker';
import { Banner, MenuSheet } from '../../components/comic';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ChartColumn,
  ChevronDown,
  ChevronRight,
  EllipsisVertical,
  Focus,
  FolderInput,
  History,
  Minimize2,
  PanelsTopLeft,
  Plus,
  Redo2,
  Search,
  Share2,
  Sparkles,
  Trash2,
  Undo2,
} from '../../components/icons';
import { Button, Chip, confirm, EmptyState, Header, IconButton, Screen, snackbar, toast } from '../../components/ui';
import { RNFS, shareFile } from '../../lib/files';
import type { BlockDraft } from '../../lib/ai/writing';
import { isRtl, panelOrder } from '../../engine/layout';
import { plural } from '../../lib/format';
import { uid } from '../../lib/id';
import { BLOCK_LABEL, BLOCK_TYPES, DIALOGUE_KINDS, LIMITS } from '../../model/constants';
import { estimatePages, estimateScenePages } from '../../model/paginate';
import { chapterLabel, scriptOutdated } from '../../model/selectors';
import type { Block, BlockType, Character, ID, Scene } from '../../model/types';
import { useChapter, useLastOpened } from '../../store/hooks';
import { restoreScriptVersion, snapshotScript } from '../../store/scriptHistory';
import type { ScriptVersion } from '../../store/scriptHistory';
import { useStory } from '../../store/useStory';
import type { SceneInit } from '../../store/useStory';
import { font, radius, space, useTheme } from '../../theme';
import { applyTexts, insertDrafts } from './aiDrafts';
import type { AiAction, TextChange } from './aiDrafts';
import { AiToolbarButton, AiWriteSheet } from './AiWriteSheet';
import { BlockRow } from './BlockRow';
import type { BlockApi } from './BlockRow';
import { FindBar } from './FindBar';
import {
  findInText,
  findMatches,
  formatScript,
  replaceAllInScenes,
  replaceRange,
  sceneSummary,
  scriptFileName,
} from './scriptTools';
import { StatsSheet } from './StatsSheet';
import { VersionsSheet } from './VersionsSheet';

type PanelRef = { label: string; pageId: ID };

type SceneApi = {
  toggle: (sceneId: ID) => void;
  menu: (sceneId: ID) => void;
  describe: (sceneId: ID, description: string) => void;
  append: (sceneId: ID) => void;
  layout: (sceneId: ID, y: number) => void;
};

const MAX_HISTORY = Math.max(30, LIMITS.undoSteps);
const FIRST_PLACEHOLDER = 'Where does the story begin?';
const TEXT_MIME = 'text/plain';

function pagesText(value: number): string {
  return `~${Number.isInteger(value) ? value : value.toFixed(1)} ${value === 1 ? 'page' : 'pages'}`;
}

const SceneSection = memo(function SceneSectionBase({
  scene,
  index,
  characters,
  panels,
  matchIds,
  currentId,
  api,
  sceneApi,
}: {
  scene: Scene;
  index: number;
  characters: Record<ID, Character>;
  panels: Map<ID, PanelRef>;
  matchIds?: Set<ID>;
  currentId?: ID;
  api: BlockApi;
  sceneApi: SceneApi;
}) {
  const { c } = useTheme();
  const Caret = scene.collapsed ? ChevronRight : ChevronDown;
  return (
    <View style={styles.scene} onLayout={event => sceneApi.layout(scene.id, event.nativeEvent.layout.y)}>
      <View style={[styles.sceneHead, { borderBottomColor: c.ink }]}>
        <Pressable style={styles.sceneToggle} onPress={() => sceneApi.toggle(scene.id)}>
          <Caret size={18} color={c.text} />
          <Text style={[styles.sceneTitle, { color: c.text }]}>Scene {index + 1}</Text>
          <Text style={[styles.sceneMeta, { color: c.muted }]}>
            {pagesText(estimateScenePages(scene))} · {plural(scene.blocks.length, 'block')}
          </Text>
        </Pressable>
        <IconButton
          icon={EllipsisVertical}
          size={18}
          onPress={() => sceneApi.menu(scene.id)}
          accessibilityLabel={`Scene ${index + 1} options`}
        />
      </View>
      {!scene.collapsed && (
        <View style={styles.sceneBody}>
          {!!scene.description && (
            <TextInput
              defaultValue={scene.description}
              onChangeText={value => sceneApi.describe(scene.id, value)}
              multiline
              scrollEnabled={false}
              placeholder="Scene note from the outline"
              placeholderTextColor={c.muted}
              style={[styles.description, { color: c.textSecondary, borderColor: c.border }]}
            />
          )}
          {scene.blocks.map((block, blockIndex) => {
            const panel = panels.get(block.id);
            return (
              <BlockRow
                key={block.id}
                block={block}
                character={block.characterId ? characters[block.characterId] : undefined}
                panelLabel={panel?.label}
                panelPageId={panel?.pageId}
                placeholder={
                  index === 0 && blockIndex === 0 && block.type === 'setting' ? FIRST_PLACEHOLDER : undefined
                }
                mark={block.id === currentId ? 'current' : matchIds?.has(block.id) ? 'match' : undefined}
                api={api}
              />
            );
          })}
          <Pressable style={styles.addBlock} onPress={() => sceneApi.append(scene.id)} hitSlop={4}>
            <Plus size={14} color={c.muted} />
            <Text style={[styles.addBlockText, { color: c.muted }]}>add block</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
});

export function ScriptScreen({ route, navigation }: ScreenProps<'Script'>) {
  const { chapterId } = route.params;
  const initialBlockId = useRef(route.params.blockId);
  const { c } = useTheme();
  const chapter = useChapter(chapterId);
  const allScenes = useStory(s => s.scenes);
  const allPages = useStory(s => s.pages);
  const characters = useStory(s => s.characters);
  const title = useStory(s => chapterLabel(s, chapterId));
  const [focusedId, setFocusedId] = useState<ID | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sceneMenuId, setSceneMenuId] = useState<ID | null>(null);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [pickFor, setPickFor] = useState<ID | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [findIndex, setFindIndex] = useState(0);
  const [statsOpen, setStatsOpen] = useState(false);
  const [blockMenuId, setBlockMenuId] = useState<ID | null>(null);
  const [moveFor, setMoveFor] = useState<ID | null>(null);
  const [ai, setAi] = useState<{ blockId: ID | null; action: AiAction | null } | null>(null);
  const menuAnchor = useRef<ID | null>(null);
  const [, setHistoryTick] = useState(0);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const inputs = useRef(new Map<ID, ComponentRef<typeof TextInput>>());
  const pendingFocus = useRef<ID | null>(null);
  const sceneY = useRef(new Map<ID, number>());
  const blockY = useRef(new Map<ID, number>());
  const past = useRef<SceneInit[][]>([]);
  const future = useRef<SceneInit[][]>([]);
  const lastKey = useRef<string | null>(null);
  const savingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushRef = useRef<(() => void) | null>(null);
  useLastOpened(chapter?.projectId, { screen: 'Script', chapterId });

  const sceneIds = chapter?.sceneIds;
  const scenes = useMemo(
    () => (sceneIds ?? []).map(id => allScenes[id]).filter((scene): scene is Scene => Boolean(scene)),
    [sceneIds, allScenes],
  );

  const pageIds = chapter?.pageIds;
  const rtl = useStory(s => {
    const project = chapter ? s.projects[chapter.projectId] : undefined;
    return project ? isRtl(project) : true;
  });
  const panels = useMemo(() => {
    const map = new Map<ID, PanelRef>();
    (pageIds ?? []).forEach((pageId, pageIndex) => {
      const page = allPages[pageId];
      if (!page) {
        return;
      }
      panelOrder(page, rtl).forEach((panelId, panelIndex) => {
        for (const blockId of page.panels[panelId]?.blockIds ?? []) {
          map.set(blockId, { label: `P${pageIndex + 1}·${panelIndex + 1}`, pageId });
        }
      });
    });
    return map;
  }, [pageIds, allPages, rtl]);

  const ops = useMemo(() => {
    const story = () => useStory.getState();
    const currentScenes = () => {
      const state = story();
      return (state.chapters[chapterId]?.sceneIds ?? []).map(id => state.scenes[id]).filter(Boolean);
    };
    const snapshot = (): SceneInit[] =>
      currentScenes().map(scene => ({ description: scene.description, blocks: scene.blocks }));
    const find = (blockId: ID | null) => {
      if (!blockId) {
        return undefined;
      }
      for (const scene of currentScenes()) {
        const index = scene.blocks.findIndex(block => block.id === blockId);
        if (index >= 0) {
          return { scene, index, block: scene.blocks[index] };
        }
      }
      return undefined;
    };
    const record = (key?: string) => {
      if (savingTimer.current) {
        clearTimeout(savingTimer.current);
      }
      setSaving(true);
      savingTimer.current = setTimeout(() => setSaving(false), 700);
      if (key && key === lastKey.current) {
        return;
      }
      past.current = [...past.current, snapshot()].slice(-MAX_HISTORY);
      future.current = [];
      lastKey.current = key ?? null;
      setHistoryTick(tick => tick + 1);
    };
    const flush = () => flushRef.current?.();
    const setBlocks = (sceneId: ID, blocks: Block[], key?: string) => {
      record(key);
      story().updateScene(sceneId, { blocks });
    };
    const focusBlock = (blockId: ID) => {
      pendingFocus.current = blockId;
      setTimeout(() => {
        if (pendingFocus.current === blockId) {
          inputs.current.get(blockId)?.focus();
        }
      }, 60);
    };
    const patchBlock = (blockId: ID | null, patch: (block: Block) => Block, key?: string) => {
      const found = find(blockId);
      if (found) {
        setBlocks(
          found.scene.id,
          found.scene.blocks.map(block => (block.id === blockId ? patch(block) : block)),
          key,
        );
      }
    };
    const removeBlock = (blockId: ID | null) => {
      const found = find(blockId);
      if (!found || found.scene.blocks.length <= 1) {
        return;
      }
      const neighbor = found.scene.blocks[found.index - 1] ?? found.scene.blocks[found.index + 1];
      setBlocks(
        found.scene.id,
        found.scene.blocks.filter(block => block.id !== blockId),
      );
      focusBlock(neighbor.id);
    };
    const insertAfter = (blockId: ID | null, text = '') => {
      const found = find(blockId);
      if (!found) {
        return;
      }
      const { block } = found;
      const created: Block = { id: uid(), type: block.type === 'setting' ? 'action' : block.type, text };
      if (block.type === 'dialogue') {
        created.kind = block.kind ?? 'speak';
      }
      const blocks = [...found.scene.blocks];
      blocks.splice(found.index + 1, 0, created);
      setBlocks(found.scene.id, blocks);
      focusBlock(created.id);
    };
    const restore = (target: SceneInit[], from: { current: SceneInit[][] }, to: { current: SceneInit[][] }) => {
      to.current = [...to.current, snapshot()].slice(-MAX_HISTORY);
      from.current = from.current.slice(0, -1);
      lastKey.current = null;
      story().replaceScript(
        chapterId,
        target.map(scene => ({ description: scene.description, blocks: scene.blocks })),
      );
      setFocusedId(null);
      setHistoryTick(tick => tick + 1);
    };
    const api: BlockApi = {
      flushRef,
      text: (blockId, text) => {
        const found = find(blockId);
        if (found && found.block.text !== text) {
          patchBlock(blockId, block => ({ ...block, text }), `text:${blockId}`);
        }
      },
      enter: (blockId, before, after) => {
        const found = find(blockId);
        if (!found) {
          return;
        }
        if (!before && !after) {
          if (found.block.type !== 'action') {
            patchBlock(blockId, block => ({ id: block.id, type: 'action', text: '' }));
          } else {
            removeBlock(blockId);
          }
          return;
        }
        const blocks = found.scene.blocks.map(block => (block.id === blockId ? { ...block, text: before } : block));
        const type = found.block.type === 'setting' ? 'action' : found.block.type;
        const created: Block = { id: uid(), type, text: after };
        if (created.type === 'dialogue') {
          created.kind = found.block.kind ?? 'speak';
        }
        blocks.splice(found.index + 1, 0, created);
        setBlocks(found.scene.id, blocks);
        focusBlock(created.id);
      },
      backspaceEmpty: removeBlock,
      focus: blockId => setFocusedId(blockId),
      blur: blockId => setFocusedId(current => (current === blockId ? null : current)),
      register: (blockId, input) => {
        if (input) {
          inputs.current.set(blockId, input);
        } else {
          inputs.current.delete(blockId);
        }
      },
      layout: (blockId, y) => {
        blockY.current.set(blockId, y);
      },
      pickCharacter: blockId => {
        flush();
        setPickFor(blockId);
      },
      cycleKind: blockId =>
        patchBlock(blockId, block => {
          const at = DIALOGUE_KINDS.indexOf(block.kind ?? 'speak');
          return { ...block, kind: DIALOGUE_KINDS[(at + 1) % DIALOGUE_KINDS.length] };
        }),
      openPanel: pageId => navigation.navigate('PanelLayout', { pageId }),
      shorten: blockId => {
        flush();
        Keyboard.dismiss();
        setAi({ blockId, action: 'shorten' });
      },
    };
    const sceneApi: SceneApi = {
      toggle: sceneId => {
        flush();
        setFocusedId(null);
        story().updateScene(sceneId, { collapsed: !story().scenes[sceneId]?.collapsed });
      },
      menu: sceneId => setSceneMenuId(sceneId),
      describe: (sceneId, description) => {
        record(`description:${sceneId}`);
        story().updateScene(sceneId, { description });
      },
      append: sceneId => {
        const scene = story().scenes[sceneId];
        if (scene) {
          flush();
          const created: Block = { id: uid(), type: 'action', text: '' };
          setBlocks(sceneId, [...scene.blocks, created]);
          focusBlock(created.id);
        }
      },
      layout: (sceneId, y) => {
        sceneY.current.set(sceneId, y);
      },
    };
    return {
      api,
      sceneApi,
      scenes: currentScenes,
      find,
      flush,
      record,
      focusBlock,
      removeBlock,
      insertAfter,
      patchBlock,
      setBlocks,
      undo: () => {
        flush();
        const target = past.current[past.current.length - 1];
        if (target) {
          restore(target, past, future);
        }
      },
      redo: () => {
        flush();
        const target = future.current[future.current.length - 1];
        if (target) {
          restore(target, future, past);
        }
      },
    };
  }, [chapterId, navigation]);

  useEffect(() => {
    snapshotScript(chapterId);
    const flush = flushRef;
    return () => {
      flush.current?.();
      snapshotScript(chapterId);
    };
  }, [chapterId]);

  const hasChapter = chapter !== undefined;
  const sceneCount = sceneIds?.length ?? 0;
  useEffect(() => {
    if (hasChapter && sceneCount === 0) {
      useStory.getState().addScene(chapterId, { blocks: [{ id: uid(), type: 'setting', text: '' }] });
    }
  }, [hasChapter, sceneCount, chapterId]);

  useEffect(() => {
    const target = initialBlockId.current;
    const found = ops.find(target ?? null);
    if (!target || !found) {
      return;
    }
    if (found.scene.collapsed) {
      useStory.getState().updateScene(found.scene.id, { collapsed: false });
    }
    const timer = setTimeout(() => {
      const y = (sceneY.current.get(found.scene.id) ?? 0) + (blockY.current.get(target) ?? 0);
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 40), animated: false });
      ops.focusBlock(target);
    }, 400);
    return () => clearTimeout(timer);
  }, [ops]);

  const openStoryboard = useCallback(() => {
    ops.flush();
    navigation.navigate('Storyboard', { chapterId });
  }, [ops, navigation, chapterId]);

  const matches = useMemo(
    () => (findOpen ? findMatches(scenes, query, matchCase) : []),
    [findOpen, scenes, query, matchCase],
  );
  const matchIds = useMemo(
    () => (matches.length ? new Set(matches.map(match => match.blockId)) : undefined),
    [matches],
  );
  const currentIndex = matches.length ? Math.min(findIndex, matches.length - 1) : -1;
  const currentMatch = currentIndex >= 0 ? matches[currentIndex] : undefined;
  const currentSceneId = currentMatch?.sceneId;
  const currentBlockId = currentMatch?.blockId;

  const reveal = useCallback((sceneId: ID, blockId: ID) => {
    const scene = useStory.getState().scenes[sceneId];
    if (!scene) {
      return;
    }
    if (scene.collapsed) {
      useStory.getState().updateScene(sceneId, { collapsed: false });
    }
    setTimeout(
      () => {
        const y = (sceneY.current.get(sceneId) ?? 0) + (blockY.current.get(blockId) ?? 0);
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 40), animated: true });
      },
      scene.collapsed ? 150 : 0,
    );
  }, []);

  useEffect(() => {
    if (currentSceneId && currentBlockId) {
      reveal(currentSceneId, currentBlockId);
    }
  }, [currentSceneId, currentBlockId, currentIndex, reveal]);

  useEffect(() => {
    if (!findOpen) {
      return;
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setFindOpen(false);
      return true;
    });
    return () => subscription.remove();
  }, [findOpen]);

  if (!chapter) {
    return (
      <Screen>
        <Header title="Script" />
        <EmptyState title="Chapter not found" message="This chapter may have been deleted." />
      </Screen>
    );
  }

  const story = useStory.getState();
  const focused = ops.find(focusedId);
  const blockCount = scenes.reduce((sum, scene) => sum + scene.blocks.length, 0);

  const shareScript = async () => {
    ops.flush();
    const current = ops.scenes();
    if (!current.some(scene => scene.blocks.some(block => block.text.trim()))) {
      toast('Nothing to share yet');
      return;
    }
    const path = `${RNFS.CachesDirectoryPath}/${scriptFileName(title)}`;
    try {
      await RNFS.writeFile(path, formatScript(title, current, useStory.getState().characters), 'utf8');
      await shareFile(path, TEXT_MIME, title);
    } catch {
      toast('Could not share the script');
    }
  };

  const matchText = currentMatch ? ops.find(currentMatch.blockId)?.block.text : undefined;
  const findContext =
    currentMatch && matchText !== undefined
      ? {
          before:
            (currentMatch.start > 16 ? '…' : '') +
            matchText.slice(Math.max(0, currentMatch.start - 16), currentMatch.start).replace(/\n/g, ' '),
          match: matchText.slice(currentMatch.start, currentMatch.end).replace(/\n/g, ' '),
          after: matchText.slice(currentMatch.end, currentMatch.end + 24).replace(/\n/g, ' '),
        }
      : undefined;

  const openFind = () => {
    ops.flush();
    setFindIndex(0);
    setFindOpen(true);
  };

  const stepMatch = (delta: -1 | 1) => {
    if (matches.length) {
      setFindIndex((currentIndex + delta + matches.length) % matches.length);
    }
  };

  const replaceCurrent = () => {
    ops.flush();
    const fresh = findMatches(ops.scenes(), query, matchCase);
    const at = Math.min(Math.max(currentIndex, 0), fresh.length - 1);
    const target = fresh[at];
    if (!target) {
      return;
    }
    ops.patchBlock(target.blockId, block => ({
      ...block,
      text: replaceRange(block.text, target.start, target.end, replacement),
    }));
    const added = findInText(replacement, query, matchCase).length;
    const remaining = fresh.length - 1 + added;
    setFindIndex(remaining > 0 ? (at + added) % remaining : 0);
  };

  const replaceEverything = () => {
    ops.flush();
    const { changes, count } = replaceAllInScenes(ops.scenes(), query, replacement, matchCase);
    if (!count) {
      return;
    }
    snapshotScript(chapterId);
    ops.record();
    for (const change of changes) {
      useStory.getState().updateScene(change.sceneId, { blocks: change.blocks });
    }
    setFindIndex(0);
    Keyboard.dismiss();
    snackbar({
      message: `Replaced ${count} ${count === 1 ? 'occurrence' : 'occurrences'}`,
      actionLabel: 'Undo',
      onAction: ops.undo,
    });
  };

  const transferBlock = (blockId: ID, targetSceneId: ID, atStart: boolean) => {
    const found = ops.find(blockId);
    const target = useStory.getState().scenes[targetSceneId];
    if (!found || !target || target.id === found.scene.id) {
      return;
    }
    ops.record();
    const rest = found.scene.blocks.filter(block => block.id !== blockId);
    const state = useStory.getState();
    state.updateScene(found.scene.id, { blocks: rest.length ? rest : [{ id: uid(), type: 'action', text: '' }] });
    state.updateScene(target.id, {
      blocks: atStart ? [found.block, ...target.blocks] : [...target.blocks, found.block],
      collapsed: false,
    });
  };

  const openAi = (blockId: ID | null, action: AiAction | null = null) => {
    ops.flush();
    Keyboard.dismiss();
    setAi({ blockId, action });
  };

  const insertAiDrafts = (afterBlockId: ID | null, drafts: BlockDraft[]) => {
    ops.flush();
    const result = insertDrafts(ops.scenes(), drafts, afterBlockId, uid);
    if (!result.changes.length) {
      setAi(null);
      return;
    }
    snapshotScript(chapterId);
    ops.record();
    const state = useStory.getState();
    for (const change of result.changes) {
      state.updateScene(change.sceneId, { blocks: change.blocks, collapsed: false });
    }
    setAi(null);
    const sceneId = result.changes[0].sceneId;
    const firstId = result.blockIds[0];
    setTimeout(() => reveal(sceneId, firstId), 200);
    snackbar({
      message: `Inserted ${plural(result.blockIds.length, 'block')}`,
      actionLabel: 'Undo',
      onAction: ops.undo,
    });
  };

  const replaceAiTexts = (changes: TextChange[]) => {
    ops.flush();
    const sceneChanges = applyTexts(ops.scenes(), changes);
    setAi(null);
    if (!sceneChanges.length) {
      toast('Nothing changed');
      return;
    }
    snapshotScript(chapterId);
    ops.record();
    const state = useStory.getState();
    for (const change of sceneChanges) {
      state.updateScene(change.sceneId, { blocks: change.blocks });
    }
    snackbar({
      message: changes.length === 1 ? 'Line replaced' : `Replaced ${plural(changes.length, 'block')}`,
      actionLabel: 'Undo',
      onAction: ops.undo,
    });
  };

  const moveToScene = (blockId: ID, targetSceneId: ID) => {
    ops.flush();
    transferBlock(blockId, targetSceneId, false);
    const index = chapter.sceneIds.indexOf(targetSceneId);
    setTimeout(() => reveal(targetSceneId, blockId), 200);
    toast(`Moved to scene ${index + 1}`);
  };

  const changeType = (type: BlockType) => {
    ops.flush();
    ops.patchBlock(focusedId, block => {
      const next: Block = { id: block.id, type, text: block.text };
      if (type === 'dialogue') {
        next.kind = block.kind ?? 'speak';
        next.characterId = block.characterId;
      }
      return next;
    });
  };

  const moveBlock = (blockId: ID | null, delta: -1 | 1, refocus: boolean) => {
    ops.flush();
    const found = ops.find(blockId);
    if (!found || !blockId) {
      return;
    }
    const target = found.index + delta;
    if (target >= 0 && target < found.scene.blocks.length) {
      const blocks = [...found.scene.blocks];
      blocks.splice(found.index, 1);
      blocks.splice(target, 0, found.block);
      ops.setBlocks(found.scene.id, blocks);
      return;
    }
    const neighbor = chapter.sceneIds[chapter.sceneIds.indexOf(found.scene.id) + delta];
    if (neighbor) {
      transferBlock(blockId, neighbor, delta === 1);
      if (refocus) {
        ops.focusBlock(blockId);
      } else {
        setTimeout(() => reveal(neighbor, blockId), 200);
      }
    }
  };

  const edgeOf = (found: { scene: Scene; index: number } | undefined) => {
    const at = found ? chapter.sceneIds.indexOf(found.scene.id) : -1;
    return {
      first: !found || (found.index === 0 && at <= 0),
      last: !found || (found.index === found.scene.blocks.length - 1 && at >= chapter.sceneIds.length - 1),
    };
  };
  const focusedEdge = edgeOf(focused);
  const menuBlock = ops.find(blockMenuId);
  const menuEdge = edgeOf(menuBlock);
  const moveBlockScene = ops.find(moveFor)?.scene.id;

  const addScene = () => {
    ops.flush();
    ops.record();
    const first: Block = { id: uid(), type: 'setting', text: '' };
    story.addScene(chapterId, { blocks: [first] });
    ops.focusBlock(first.id);
  };

  const restoreVersion = async (version: ScriptVersion) => {
    const ok = await confirm('Restore this version?', 'Your current script is saved as a version first.', {
      confirmText: 'Restore',
    });
    if (ok) {
      ops.flush();
      ops.record();
      restoreScriptVersion(chapterId, version);
      setVersionsOpen(false);
      setFocusedId(null);
      toast('Version restored');
    }
  };

  const sceneMenuIndex = sceneMenuId ? chapter.sceneIds.indexOf(sceneMenuId) : -1;
  const moveSceneBy = (delta: -1 | 1) => {
    ops.flush();
    ops.record();
    story.moveScene(chapterId, sceneMenuIndex, sceneMenuIndex + delta);
  };
  const removeScene = async (sceneId: ID, number: number) => {
    const count = story.scenes[sceneId]?.blocks.length ?? 0;
    const ok = await confirm(
      `Delete scene ${number}?`,
      `Its ${count} ${count === 1 ? 'block' : 'blocks'} will be deleted.`,
      {
        confirmText: 'Delete scene',
        destructive: true,
      },
    );
    if (ok) {
      ops.flush();
      ops.record();
      useStory.getState().removeScene(sceneId);
    }
  };

  return (
    <Screen>
      {!focusMode && (
        <>
          <Header
            title="Script"
            subtitle={title}
            right={
              <View style={styles.headerRight}>
                <IconButton
                  icon={Undo2}
                  onPress={ops.undo}
                  disabled={past.current.length === 0}
                  accessibilityLabel="Undo"
                />
                <IconButton
                  icon={Redo2}
                  onPress={ops.redo}
                  disabled={future.current.length === 0}
                  accessibilityLabel="Redo"
                />
                <IconButton
                  icon={EllipsisVertical}
                  onPress={() => {
                    menuAnchor.current = focusedId;
                    setMenuOpen(true);
                  }}
                  accessibilityLabel="More"
                />
              </View>
            }
          />
          <View style={styles.stats}>
            <Text style={[styles.statsText, { color: c.muted }]}>
              {pagesText(estimatePages(scenes))} · {plural(scenes.length, 'scene')} · {plural(blockCount, 'block')}
            </Text>
            <Text style={[styles.statsText, { color: saving ? c.muted : c.success }]}>
              {saving ? 'Saving…' : 'Saved ✓'}
            </Text>
          </View>
        </>
      )}
      {focusMode && (
        <View style={styles.focusBar}>
          <IconButton icon={Undo2} onPress={ops.undo} disabled={past.current.length === 0} accessibilityLabel="Undo" />
          <IconButton icon={Minimize2} onPress={() => setFocusMode(false)} accessibilityLabel="Exit focus mode" />
        </View>
      )}
      {scriptOutdated(chapter) && (
        <Banner text="Script changed since pagination" action={{ label: 'Open storyboard', onPress: openStoryboard }} />
      )}
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      >
        {scenes.map((scene, index) => (
          <SceneSection
            key={scene.id}
            scene={scene}
            index={index}
            characters={characters}
            panels={panels}
            matchIds={matchIds}
            currentId={scene.id === currentSceneId ? currentBlockId : undefined}
            api={ops.api}
            sceneApi={ops.sceneApi}
          />
        ))}
        <Button title="New scene" icon={Plus} variant="secondary" onPress={addScene} />
        <Button title="Paginate" icon={ArrowRight} onPress={openStoryboard} />
      </ScrollView>
      {findOpen && (
        <FindBar
          query={query}
          replacement={replacement}
          matchCase={matchCase}
          count={matches.length}
          current={currentIndex}
          context={findContext}
          onQuery={value => {
            setQuery(value);
            setFindIndex(0);
          }}
          onReplacement={setReplacement}
          onMatchCase={value => {
            setMatchCase(value);
            setFindIndex(0);
          }}
          onNext={() => stepMatch(1)}
          onPrevious={() => stepMatch(-1)}
          onReplace={replaceCurrent}
          onReplaceAll={replaceEverything}
          onClose={() => setFindOpen(false)}
        />
      )}
      {focused && !findOpen && (
        <View style={[styles.toolbar, { backgroundColor: c.surface, borderTopColor: c.ink }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            contentContainerStyle={styles.toolbarRow}
          >
            <AiToolbarButton onPress={() => openAi(focusedId)} />
            {BLOCK_TYPES.map(type => (
              <Chip
                key={type}
                label={BLOCK_LABEL[type]}
                selected={focused.block.type === type}
                onPress={() => changeType(type)}
              />
            ))}
            <IconButton
              icon={Plus}
              onPress={() => {
                ops.flush();
                ops.insertAfter(focusedId);
              }}
              accessibilityLabel="Add block below"
            />
            <IconButton
              icon={ArrowUp}
              onPress={() => moveBlock(focusedId, -1, true)}
              disabled={focusedEdge.first}
              accessibilityLabel="Move block up"
            />
            <IconButton
              icon={ArrowDown}
              onPress={() => moveBlock(focusedId, 1, true)}
              disabled={focusedEdge.last}
              accessibilityLabel="Move block down"
            />
            <IconButton
              icon={Trash2}
              onPress={() => ops.removeBlock(focusedId)}
              disabled={focused.scene.blocks.length <= 1}
              accessibilityLabel="Delete block"
            />
            <IconButton
              icon={EllipsisVertical}
              onPress={() => {
                ops.flush();
                setBlockMenuId(focusedId);
              }}
              accessibilityLabel="Block options"
            />
          </ScrollView>
        </View>
      )}
      <MenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Script"
        items={[
          {
            label: 'AI writing help',
            icon: Sparkles,
            subtitle: 'Continue, rewrite, change voice, shorten, SFX ideas',
            onPress: () => {
              const blockId = menuAnchor.current;
              setTimeout(() => openAi(blockId), 250);
            },
          },
          { label: 'Find and replace', icon: Search, onPress: () => setTimeout(openFind, 250) },
          { label: 'Paginate', icon: PanelsTopLeft, onPress: openStoryboard },
          { label: 'Version history', icon: History, onPress: () => setTimeout(() => setVersionsOpen(true), 250) },
          { label: 'Focus mode', icon: Focus, onPress: () => setFocusMode(true) },
          { label: 'Statistics', icon: ChartColumn, onPress: () => setTimeout(() => setStatsOpen(true), 250) },
          { label: 'Share script', icon: Share2, subtitle: 'Plain-text screenplay (.txt)', onPress: shareScript },
        ]}
      />
      <MenuSheet
        visible={blockMenuId !== null}
        onClose={() => setBlockMenuId(null)}
        title={menuBlock ? BLOCK_LABEL[menuBlock.block.type] : 'Block'}
        subtitle={menuBlock?.block.text.trim().replace(/\s+/g, ' ').slice(0, 60) || undefined}
        items={[
          {
            label: 'Move up',
            icon: ArrowUp,
            disabled: menuEdge.first,
            onPress: () => moveBlock(blockMenuId, -1, false),
          },
          {
            label: 'Move down',
            icon: ArrowDown,
            disabled: menuEdge.last,
            onPress: () => moveBlock(blockMenuId, 1, false),
          },
          {
            label: 'Move to scene…',
            icon: FolderInput,
            disabled: chapter.sceneIds.length <= 1,
            onPress: () => {
              const blockId = blockMenuId;
              setTimeout(() => setMoveFor(blockId), 250);
            },
          },
          {
            label: 'Delete block',
            icon: Trash2,
            destructive: true,
            disabled: !menuBlock || menuBlock.scene.blocks.length <= 1,
            onPress: () => ops.removeBlock(blockMenuId),
          },
        ]}
      />
      <MenuSheet
        visible={moveFor !== null}
        onClose={() => setMoveFor(null)}
        title="Move to scene"
        subtitle="The block goes to the end of the scene"
        items={scenes.map((scene, index) => ({
          label: `Scene ${index + 1}`,
          subtitle:
            scene.id === moveBlockScene ? 'Current scene' : sceneSummary(scene) || plural(scene.blocks.length, 'block'),
          disabled: scene.id === moveBlockScene,
          onPress: () => {
            if (moveFor) {
              moveToScene(moveFor, scene.id);
            }
          },
        }))}
      />
      <StatsSheet
        visible={statsOpen}
        onClose={() => setStatsOpen(false)}
        title={title}
        scenes={scenes}
        characters={characters}
      />
      <MenuSheet
        visible={sceneMenuId !== null}
        onClose={() => setSceneMenuId(null)}
        title={`Scene ${sceneMenuIndex + 1}`}
        items={[
          { label: 'Move up', icon: ArrowUp, disabled: sceneMenuIndex <= 0, onPress: () => moveSceneBy(-1) },
          {
            label: 'Move down',
            icon: ArrowDown,
            disabled: sceneMenuIndex >= chapter.sceneIds.length - 1,
            onPress: () => moveSceneBy(1),
          },
          {
            label: 'Delete scene',
            icon: Trash2,
            destructive: true,
            disabled: chapter.sceneIds.length <= 1,
            onPress: () => {
              const sceneId = sceneMenuId;
              const number = sceneMenuIndex + 1;
              if (sceneId) {
                setTimeout(() => removeScene(sceneId, number), 250);
              }
            },
          },
        ]}
      />
      <VersionsSheet
        visible={versionsOpen}
        chapterId={chapterId}
        onClose={() => setVersionsOpen(false)}
        onRestore={restoreVersion}
      />
      {ai && (
        <AiWriteSheet
          chapterId={chapterId}
          projectId={chapter.projectId}
          blockId={ai.blockId}
          initialAction={ai.action ?? undefined}
          onClose={() => setAi(null)}
          onInsert={insertAiDrafts}
          onReplace={replaceAiTexts}
          onOpenProfile={() => {
            setAi(null);
            navigation.navigate('Tabs', { screen: 'Profile' });
          }}
        />
      )}
      <CharacterPicker
        visible={pickFor !== null}
        onClose={() => {
          const blockId = pickFor;
          setPickFor(null);
          if (blockId) {
            ops.focusBlock(blockId);
          }
        }}
        projectId={chapter.projectId}
        selectedIds={ops.find(pickFor)?.block.characterId ? [ops.find(pickFor)?.block.characterId as ID] : []}
        allowClear
        onPick={characterId => {
          const blockId = pickFor;
          setPickFor(null);
          if (blockId) {
            ops.patchBlock(blockId, block => ({ ...block, characterId }));
            ops.focusBlock(blockId);
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
  statsText: { ...font.caption },
  focusBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: space.sm },
  content: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.xl * 2, gap: space.md },
  scene: { gap: space.sm },
  sceneHead: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2 },
  sceneToggle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  sceneTitle: { ...font.overline, fontSize: 16 },
  sceneMeta: { ...font.caption },
  sceneBody: { gap: space.sm },
  description: {
    ...font.caption,
    fontSize: 13,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    textAlignVertical: 'top',
  },
  addBlock: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingVertical: space.sm },
  addBlockText: { ...font.caption },
  toolbar: { borderTopWidth: 2 },
  toolbarRow: { alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm },
});
