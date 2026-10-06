import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useAppNavigation, useAppRoute } from '../../app/routes';
import { CharacterPicker } from '../../components/CharacterPicker';
import { Banner, MenuSheet } from '../../components/comic';
import {
  ArrowDown,
  ArrowUp,
  Check,
  CircleCheck,
  Copy,
  EllipsisVertical,
  Eye,
  EyeOff,
  ListChecks,
  ListOrdered,
  MessageCircle,
  Redo2,
  ScrollText,
  StickyNote,
  Trash2,
  Undo2,
  Wind,
  Zap,
} from '../../components/icons';
import { PageView } from '../../components/PageView';
import { Sheet } from '../../components/Sheet';
import { Button, Chip, ChipRow, Header, IconButton, ListItem, Screen, TextField, toast } from '../../components/ui';
import { panelHasArt, useArtVersion } from '../../engine/artStore';
import { useEngineFonts } from '../../engine/fonts';
import { hitTestPanel, type Pt } from '../../engine/layout';
import {
  bubbleCenter,
  createBubble,
  createEffect,
  fitBubbleText,
  hitTestBubble,
  rotatePoint,
  toBubbleLocal,
} from '../../engine/lettering';
import { usePageContext } from '../../engine/page';
import { uid } from '../../lib/id';
import { BUBBLE_TYPE_LABEL, EFFECT_LABEL } from '../../model/constants';
import type { Bubble, BubbleType, Effect, EffectType, ID } from '../../model/types';
import { useChapter, useCharacters, useLastOpened, usePage, useProjectOfPage } from '../../store/hooks';
import { useStory } from '../../store/useStory';
import { font, radius, space, useTheme } from '../../theme';
import { ModeBar } from '../page/ModeBar';
import { Overlay, rotateHandle, type Guide } from './Overlay';
import { BubbleCard, EffectCard } from './PropertyCard';
import { autoPlace, blockMapOf, pageBlocksOf, placeBlock, type PageBlock, type Snapshot } from './script';

type Selection = { kind: 'bubble' | 'effect'; id: ID } | null;
type Pending = { kind: 'bubble'; type: BubbleType } | { kind: 'effect'; type: EffectType } | null;
type ViewState = { z: number; tx: number; ty: number };
type DragMode = 'move' | 'resize' | 'rotate' | 'tail' | 'center' | 'view';
type Drag = { mode: DragMode; p0: Pt; start: Bubble | null; corner: number; view0: ViewState; live: Bubble | null };

const SNAP_ANGLES = [0, 15, -15, 45, -45, 90, -90, 180, -180];
const EFFECT_TYPES = Object.keys(EFFECT_LABEL) as EffectType[];
const ADD_BUTTONS = [
  { type: 'speak' as BubbleType, label: 'Dialogue', icon: MessageCircle },
  { type: 'narration' as BubbleType, label: 'Narration', icon: StickyNote },
  { type: 'sfx' as BubbleType, label: 'SFX', icon: Zap },
];

function distance(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function snapTo(value: number, targets: number[], tolerance: number): number | null {
  let best: number | null = null;
  targets.forEach(target => {
    if (Math.abs(target - value) <= tolerance && (best === null || Math.abs(target - value) < Math.abs(best - value))) {
      best = target;
    }
  });
  return best;
}

export function LetteringScreen() {
  const { pageId } = useAppRoute<'Lettering'>().params;
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const page = usePage(pageId);
  const project = useProjectOfPage(pageId);
  const chapter = useChapter(page?.chapterId);
  const ctx = usePageContext(pageId);
  const fonts = useEngineFonts();
  const artVersion = useArtVersion();
  const scenes = useStory(s => s.scenes);
  const characters = useCharacters(project?.id);
  useLastOpened(project?.id, { screen: 'Lettering', chapterId: page?.chapterId, pageId });

  const [box, setBox] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<ViewState | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [draft, setDraft] = useState<Bubble | null>(null);
  const [draftCenter, setDraftCenter] = useState<Pt | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [editing, setEditing] = useState(false);
  const [menu, setMenu] = useState(false);
  const [itemMenu, setItemMenu] = useState<ID | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [effectsOpen, setEffectsOpen] = useState(false);
  const [speakerOpen, setSpeakerOpen] = useState(false);
  const [hideBubbles, setHideBubbles] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [, bump] = useState(0);
  const history = useRef<{ past: Snapshot[]; future: Snapshot[]; tag?: string }>({ past: [], future: [] });
  const drag = useRef<Drag | null>(null);
  const pinch = useRef<{ view0: ViewState; fx: number; fy: number } | null>(null);
  const lastTap = useRef<{ time: number; id: ID | null }>({ time: 0, id: null });

  const size = ctx?.size ?? { w: 1000, h: 1414 };
  const tall = size.h / size.w > 2.2;
  const bw = Math.max(1, tall ? box.w - 24 : Math.min(box.w - 24, ((box.h - 24) * size.w) / size.h));
  const bh = (bw * size.h) / size.w;
  const scale = bw / size.w;
  const fit: ViewState = useMemo(() => ({ z: 1, tx: 0, ty: tall ? (bh - box.h) / 2 + 12 : 0 }), [tall, bh, box.h]);
  const v = view ?? fit;
  const k = scale * v.z;

  const bubbles = useMemo(() => page?.bubbles ?? [], [page?.bubbles]);
  const effects = useMemo(() => page?.effects ?? [], [page?.effects]);
  const blockMap = useMemo(
    () => blockMapOf((chapter?.sceneIds ?? []).map(id => scenes[id])),
    [chapter?.sceneIds, scenes],
  );
  const pageBlocks = useMemo(
    () => (page ? pageBlocksOf(page, blockMap, ctx?.rtl ?? false) : []),
    [page, blockMap, ctx?.rtl],
  );
  const unplaced = pageBlocks.filter(item => !item.placed);
  const orphans = useMemo(
    () => (chapter ? bubbles.filter(bubble => bubble.blockId && !blockMap[bubble.blockId]) : []),
    [bubbles, blockMap, chapter],
  );
  const warned = useMemo(
    () => (fonts ? bubbles.filter(bubble => bubble.text.trim() && fitBubbleText(bubble, fonts).overflow) : []),
    [bubbles, fonts],
  );
  const stored = selection?.kind === 'bubble' ? bubbles.find(bubble => bubble.id === selection.id) ?? null : null;
  const selectedBubble = draft && stored && draft.id === stored.id ? draft : stored;
  const selectedEffect =
    selection?.kind === 'effect' ? effects.find(effect => effect.id === selection.id) ?? null : null;
  const effectShape = selectedEffect ? ctx?.shapes.find(shape => shape.id === selectedEffect.panelId) ?? null : null;
  const effectCenter =
    selectedEffect?.type === 'focus' && effectShape
      ? draftCenter ?? {
          x: effectShape.bbox.x + effectShape.bbox.w * selectedEffect.cx,
          y: effectShape.bbox.y + effectShape.bbox.h * selectedEffect.cy,
        }
      : null;
  const order = useMemo(() => {
    const shapes = ctx?.shapes ?? [];
    const rank = (bubble: Bubble) => {
      const id = hitTestPanel(shapes, bubbleCenter(bubble));
      const index = shapes.findIndex(shape => shape.id === id);
      return index < 0 ? shapes.length : index;
    };
    return [...bubbles].sort((a, b) => rank(a) - rank(b) || a.y - b.y || (ctx?.rtl ? b.x - a.x : a.x - b.x));
  }, [bubbles, ctx?.shapes, ctx?.rtl]);

  const noArt = useMemo(
    () => !!ctx && ctx.shapes.length > 0 && !ctx.shapes.some(shape => panelHasArt(shape.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ctx, artVersion],
  );

  const commit = useCallback(
    (patch: Partial<Snapshot>, tag?: string) => {
      const current = useStory.getState().pages[pageId];
      if (!current) {
        return;
      }
      const h = history.current;
      if (!tag || tag !== h.tag) {
        h.past.push({ bubbles: current.bubbles, effects: current.effects });
        if (h.past.length > 60) {
          h.past.shift();
        }
      }
      h.tag = tag;
      h.future = [];
      useStory.getState().updatePage(pageId, patch);
      bump(n => n + 1);
    },
    [pageId],
  );

  const travel = (from: Snapshot[], to: Snapshot[]) => {
    const current = useStory.getState().pages[pageId];
    const snapshot = from.pop();
    if (!current || !snapshot) {
      return;
    }
    to.push({ bubbles: current.bubbles, effects: current.effects });
    history.current.tag = undefined;
    useStory.getState().updatePage(pageId, snapshot);
    setDraft(null);
    bump(n => n + 1);
  };

  const changeBubble = (id: ID, patch: Partial<Bubble>, tag?: string) =>
    commit({ bubbles: bubbles.map(b => (b.id === id ? { ...b, ...patch } : b)) }, tag ? `${id}:${tag}` : undefined);
  const changeEffect = (id: ID, patch: Partial<Effect>, tag?: string) =>
    commit({ effects: effects.map(e => (e.id === id ? { ...e, ...patch } : e)) }, tag ? `${id}:${tag}` : undefined);
  const removeBubble = (id: ID) => {
    commit({ bubbles: bubbles.filter(b => b.id !== id) });
    setSelection(null);
  };
  const removeEffect = (id: ID) => {
    commit({ effects: effects.filter(e => e.id !== id) });
    setSelection(null);
  };
  const reorder = (id: ID, step: number) => {
    const index = bubbles.findIndex(b => b.id === id);
    const target = index + step;
    if (index < 0 || target < 0 || target >= bubbles.length) {
      return;
    }
    const next = [...bubbles];
    [next[index], next[target]] = [next[target], next[index]];
    commit({ bubbles: next });
  };
  const duplicate = (id: ID) => {
    const source = bubbles.find(b => b.id === id);
    if (!source) {
      return;
    }
    const created: Bubble = {
      ...source,
      id: uid(),
      blockId: undefined,
      x: source.x + 30,
      y: source.y + 30,
      tail: source.tail ? { x: source.tail.x + 30, y: source.tail.y + 30 } : null,
    };
    commit({ bubbles: [...bubbles, created] });
    setSelection({ kind: 'bubble', id: created.id });
  };

  const toPage = (x: number, y: number): Pt => ({
    x: ((x - box.w / 2 - v.tx) / v.z + bw / 2) / scale,
    y: ((y - box.h / 2 - v.ty) / v.z + bh / 2) / scale,
  });
  const bubbleAt = (p: Pt): Bubble | null => {
    if (hideBubbles) {
      return null;
    }
    for (let i = bubbles.length - 1; i >= 0; i--) {
      if (hitTestBubble(bubbles[i], p, 4 / k)) {
        return bubbles[i];
      }
    }
    return null;
  };

  const beginDrag = (x: number, y: number) => {
    const p = toPage(x, y);
    const tolerance = 22 / k;
    const base = { p0: p, corner: 0, view0: v, live: null };
    const b = hideBubbles ? null : stored;
    if (b) {
      const q = toBubbleLocal(b, p);
      const corners = [
        { x: b.x, y: b.y },
        { x: b.x + b.w, y: b.y },
        { x: b.x + b.w, y: b.y + b.h },
        { x: b.x, y: b.y + b.h },
      ];
      const corner = corners.findIndex(point => distance(point, q) < tolerance);
      if (b.tail && distance(b.tail, p) < tolerance) {
        drag.current = { ...base, mode: 'tail', start: b };
      } else if (distance(rotateHandle(b, k), q) < tolerance) {
        drag.current = { ...base, mode: 'rotate', start: b };
      } else if (corner >= 0) {
        drag.current = { ...base, mode: 'resize', start: b, corner };
      } else if (hitTestBubble(b, p, 4 / k)) {
        drag.current = { ...base, mode: 'move', start: b };
      } else {
        drag.current = null;
      }
      if (drag.current) {
        return;
      }
    }
    if (effectCenter && distance(effectCenter, p) < tolerance) {
      drag.current = { ...base, mode: 'center', start: null };
      return;
    }
    const hit = pending ? null : bubbleAt(p);
    drag.current = hit ? { ...base, mode: 'move', start: hit } : { ...base, mode: 'view', start: null };
  };

  const moveDrag = (translationX: number, translationY: number) => {
    const d = drag.current;
    if (!d) {
      return;
    }
    if (d.mode === 'view') {
      setView({ z: d.view0.z, tx: d.view0.tx + translationX, ty: d.view0.ty + translationY });
      return;
    }
    const dx = translationX / k;
    const dy = translationY / k;
    const p = { x: d.p0.x + dx, y: d.p0.y + dy };
    if (d.mode === 'center') {
      const bb = effectShape?.bbox;
      if (bb) {
        setDraftCenter({
          x: Math.max(bb.x, Math.min(bb.x + bb.w, p.x)),
          y: Math.max(bb.y, Math.min(bb.y + bb.h, p.y)),
        });
      }
      return;
    }
    const s = d.start;
    if (!s) {
      return;
    }
    const center = bubbleCenter(s);
    let next: Bubble = s;
    if (d.mode === 'move') {
      const others = bubbles.filter(b => b.id !== s.id).map(bubbleCenter);
      const boxes = (ctx?.shapes ?? []).map(shape => shape.bbox);
      const xs = [...others.map(o => o.x), ...boxes.flatMap(bb => [bb.x, bb.x + bb.w / 2, bb.x + bb.w])];
      const ys = [...others.map(o => o.y), ...boxes.flatMap(bb => [bb.y, bb.y + bb.h / 2, bb.y + bb.h])];
      const sx = snapTo(center.x + dx, xs, 6 / k);
      const sy = snapTo(center.y + dy, ys, 6 / k);
      const mx = sx === null ? dx : sx - center.x;
      const my = sy === null ? dy : sy - center.y;
      const lines: Guide[] = [];
      if (sx !== null) {
        lines.push({ axis: 'x', at: sx });
      }
      if (sy !== null) {
        lines.push({ axis: 'y', at: sy });
      }
      setGuides(lines);
      next = { ...s, x: s.x + mx, y: s.y + my, tail: s.tail ? { x: s.tail.x + mx, y: s.tail.y + my } : null };
    } else if (d.mode === 'resize') {
      const q = rotatePoint(p, center, -s.rotation);
      const left = d.corner === 0 || d.corner === 3;
      const top = d.corner === 0 || d.corner === 1;
      const ax = left ? s.x + s.w : s.x;
      const ay = top ? s.y + s.h : s.y;
      const w = Math.max(60, left ? ax - q.x : q.x - ax);
      const h = Math.max(40, top ? ay - q.y : q.y - ay);
      const local = { x: left ? ax - w / 2 : ax + w / 2, y: top ? ay - h / 2 : ay + h / 2 };
      const world = rotatePoint(local, center, s.rotation);
      next = { ...s, x: world.x - w / 2, y: world.y - h / 2, w, h };
    } else if (d.mode === 'rotate') {
      let angle = (Math.atan2(p.y - center.y, p.x - center.x) * 180) / Math.PI + 90;
      angle = angle > 180 ? angle - 360 : angle;
      next = { ...s, rotation: snapTo(angle, SNAP_ANGLES, 4) ?? Math.round(angle) };
    } else if (d.mode === 'tail') {
      next = { ...s, tail: p };
    }
    d.live = next;
    setDraft(next);
  };

  const endDrag = (success: boolean) => {
    const d = drag.current;
    drag.current = null;
    setGuides([]);
    if (d && success && d.mode === 'center' && selectedEffect && effectShape && draftCenter) {
      const bb = effectShape.bbox;
      changeEffect(selectedEffect.id, { cx: (draftCenter.x - bb.x) / bb.w, cy: (draftCenter.y - bb.y) / bb.h });
    }
    if (d && success && d.live && d.start) {
      let result = d.live;
      if (
        d.mode === 'tail' &&
        result.tail &&
        hitTestBubble(result, result.tail, -Math.min(result.w, result.h) * 0.12)
      ) {
        result = { ...result, tail: null };
      }
      commit({ bubbles: bubbles.map(b => (b.id === result.id ? result : b)) });
    }
    setDraftCenter(null);
    setDraft(null);
  };

  const closeEditor = () => {
    setEditing(false);
    const block = stored?.blockId ? blockMap[stored.blockId] : undefined;
    const text = stored?.text.trim() ?? '';
    if (!block || !text || block.text.trim() === text) {
      return;
    }
    const scene = (chapter?.sceneIds ?? []).map(id => scenes[id]).find(sc => sc?.blocks.some(b => b.id === block.id));
    if (scene) {
      useStory
        .getState()
        .updateScene(scene.id, { blocks: scene.blocks.map(b => (b.id === block.id ? { ...b, text } : b)) });
    }
  };

  const openEditor = (id: ID) => {
    setSelection({ kind: 'bubble', id });
    setEditing(true);
  };

  const handleTap = (x: number, y: number) => {
    const p = toPage(x, y);
    const now = Date.now();
    if (pending?.kind === 'bubble') {
      if (p.x < 0 || p.y < 0 || p.x > size.w || p.y > size.h) {
        return;
      }
      const created = createBubble(pending.type, p);
      commit({ bubbles: [...bubbles, created] });
      setPending(null);
      setHideBubbles(false);
      openEditor(created.id);
      return;
    }
    if (pending?.kind === 'effect') {
      const panelId = hitTestPanel(ctx?.shapes ?? [], p);
      if (!panelId) {
        toast('Tap inside a panel to apply the effect');
        return;
      }
      const created = createEffect(pending.type, panelId);
      commit({ effects: [...effects, created] });
      setPending(null);
      setSelection({ kind: 'effect', id: created.id });
      return;
    }
    const hit = bubbleAt(p);
    const double = now - lastTap.current.time < 320 && lastTap.current.id === (hit?.id ?? null);
    lastTap.current = { time: double ? 0 : now, id: hit?.id ?? null };
    if (hit) {
      if (double) {
        openEditor(hit.id);
      } else {
        setSelection({ kind: 'bubble', id: hit.id });
      }
    } else if (double) {
      setView(null);
    } else {
      setSelection(null);
    }
  };

  const handlers = {
    begin: beginDrag,
    start: () => {
      const d = drag.current;
      if (d?.mode === 'move' && d.start && d.start.id !== stored?.id) {
        setSelection({ kind: 'bubble', id: d.start.id });
      }
    },
    move: moveDrag,
    end: endDrag,
    tap: handleTap,
    hold: (x: number, y: number) => {
      const hit = bubbleAt(toPage(x, y));
      if (hit) {
        setSelection({ kind: 'bubble', id: hit.id });
        setItemMenu(hit.id);
      }
    },
    pinchStart: (fx: number, fy: number) => {
      pinch.current = { view0: v, fx, fy };
    },
    pinchMove: (factor: number, fx: number, fy: number) => {
      const start = pinch.current;
      if (!start) {
        return;
      }
      const z = Math.max(0.5, Math.min(6, start.view0.z * factor));
      const ratio = z / start.view0.z;
      setView({
        z,
        tx: fx - box.w / 2 - (start.fx - box.w / 2 - start.view0.tx) * ratio,
        ty: fy - box.h / 2 - (start.fy - box.h / 2 - start.view0.ty) * ratio,
      });
    },
  };
  const live = useRef(handlers);
  live.current = handlers;

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .runOnJS(true)
      .maxPointers(1)
      .minDistance(4)
      .onBegin(e => live.current.begin(e.x, e.y))
      .onStart(() => live.current.start())
      .onUpdate(e => live.current.move(e.translationX, e.translationY))
      .onEnd((_e, success) => live.current.end(success))
      .onFinalize((_e, success) => {
        if (!success) {
          live.current.end(false);
        }
      });
    const tap = Gesture.Tap()
      .runOnJS(true)
      .maxDuration(280)
      .onEnd((e, success) => {
        if (success) {
          live.current.tap(e.x, e.y);
        }
      });
    const hold = Gesture.LongPress()
      .runOnJS(true)
      .minDuration(450)
      .onStart(e => live.current.hold(e.x, e.y));
    const zoom = Gesture.Pinch()
      .runOnJS(true)
      .onStart(e => live.current.pinchStart(e.focalX, e.focalY))
      .onUpdate(e => live.current.pinchMove(e.scale, e.focalX, e.focalY));
    return Gesture.Simultaneous(zoom, Gesture.Race(pan, hold, tap));
  }, []);

  const placeFromList = (item: PageBlock) => {
    const shape = ctx?.shapes.find(s => s.id === item.panelId);
    if (!shape) {
      return;
    }
    const inPanel = bubbles.filter(b => hitTestPanel(ctx?.shapes ?? [], bubbleCenter(b)) === shape.id);
    const bottom = inPanel.reduce((max, b) => Math.max(max, b.y + b.h * 0.72), shape.bbox.y + 20);
    const created = placeBlock(item, shape.bbox, inPanel.length, { y: bottom }, ctx?.rtl ?? false, fonts);
    commit({ bubbles: [...bubbles, created] });
    setSelection({ kind: 'bubble', id: created.id });
    setListOpen(false);
  };

  const runAutoPlace = () => {
    const created = autoPlace(pageBlocks, ctx?.shapes ?? [], ctx?.rtl ?? false, fonts);
    if (!created.length) {
      return;
    }
    commit({ bubbles: [...bubbles, ...created] });
    setHideBubbles(false);
    toast(`Placed ${created.length} ${created.length === 1 ? 'bubble' : 'bubbles'}`);
  };

  const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  if (!page || !ctx || !project) {
    return (
      <Screen>
        <Header title="Lettering" />
      </Screen>
    );
  }

  const index = chapter ? chapter.pageIds.indexOf(pageId) + 1 : 1;
  const speaker = characters.find(ch => ch.id === stored?.characterId)?.name;
  const menuBubble = bubbles.find(b => b.id === itemMenu);
  const isOrphan = !!stored && orphans.some(b => b.id === stored.id);
  const differs = (item: PageBlock) => {
    const existing = bubbles.find(b => b.blockId === item.block.id);
    return !!existing && existing.text.trim() !== item.block.text.trim();
  };
  const panelNumber = (panelId: ID) => ctx.shapes.findIndex(s => s.id === panelId) + 1;

  return (
    <Screen edges={['top']}>
      <Header
        title={`Page ${index} / ${chapter?.pageIds.length ?? 1}`}
        right={
          <>
            <IconButton
              icon={Undo2}
              disabled={!history.current.past.length}
              onPress={() => travel(history.current.past, history.current.future)}
              accessibilityLabel="Undo"
            />
            <IconButton
              icon={Redo2}
              disabled={!history.current.future.length}
              onPress={() => travel(history.current.future, history.current.past)}
              accessibilityLabel="Redo"
            />
            <IconButton
              icon={page.done ? CircleCheck : Check}
              active={page.done}
              onPress={() => useStory.getState().updatePage(pageId, { done: !page.done })}
              accessibilityLabel={page.done ? 'Mark page as not done' : 'Mark page as done'}
            />
            <IconButton icon={EllipsisVertical} onPress={() => setMenu(true)} accessibilityLabel="Menu" />
          </>
        }
      />
      {noArt && <Banner tone="info" text="This page has no art yet. Bubble positions may need adjusting later." />}
      <View style={[styles.workspace, { backgroundColor: c.workspace }]} onLayout={onLayout}>
        <GestureDetector gesture={gesture}>
          <View style={StyleSheet.absoluteFill} collapsable={false}>
            {box.w > 0 && (
              <View
                style={[
                  styles.page,
                  {
                    left: (box.w - bw) / 2,
                    top: (box.h - bh) / 2,
                    width: bw,
                    height: bh,
                    transform: [{ translateX: v.tx }, { translateY: v.ty }, { scale: v.z }],
                  },
                ]}
              >
                <PageView
                  pageId={pageId}
                  width={bw}
                  options={{ bubbles: !hideBubbles, skipBubbleId: draft ? draft.id : undefined }}
                >
                  <Overlay
                    scale={scale}
                    k={k}
                    size={size}
                    fonts={fonts}
                    selected={hideBubbles ? null : selectedBubble}
                    floating={!!draft}
                    guides={guides}
                    warned={hideBubbles ? [] : warned.filter(b => b.id !== draft?.id)}
                    orphans={hideBubbles ? [] : orphans.filter(b => b.id !== draft?.id)}
                    effectBox={effectShape?.bbox ?? null}
                    effectCenter={effectCenter}
                    accent={c.accent}
                    warning={c.warning}
                    danger={c.danger}
                  />
                </PageView>
                {showOrder &&
                  !hideBubbles &&
                  order.map((bubble, i) => (
                    <View
                      key={bubble.id}
                      pointerEvents="none"
                      style={[
                        styles.badge,
                        { backgroundColor: c.ink, left: bubble.x * scale - 8, top: bubble.y * scale - 8 },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: c.onInk }]}>{i + 1}</Text>
                    </View>
                  ))}
              </View>
            )}
          </View>
        </GestureDetector>
        <View style={styles.top} pointerEvents="box-none">
          {pending ? (
            <Chip
              label={pending.kind === 'bubble' ? 'Tap the page to place · Cancel' : 'Tap a panel to apply · Cancel'}
              selected
              onPress={() => setPending(null)}
            />
          ) : unplaced.length > 0 ? (
            <Button
              small
              variant="ink"
              icon={ListChecks}
              title={`Auto-place dialogue (${unplaced.length})`}
              onPress={runAutoPlace}
            />
          ) : null}
        </View>
        <View style={styles.bottom} pointerEvents="box-none">
          {isOrphan && stored && (
            <View style={[styles.orphan, { backgroundColor: c.dangerSoft, borderColor: c.danger }]}>
              <Text style={[styles.orphanText, { color: c.danger }]}>No longer in script</Text>
              <Button
                small
                variant="ghost"
                title="Keep"
                onPress={() => changeBubble(stored.id, { blockId: undefined })}
              />
              <Button small variant="danger" title="Delete" onPress={() => removeBubble(stored.id)} />
            </View>
          )}
          {stored && !draft && !hideBubbles && (
            <BubbleCard
              bubble={stored}
              speaker={speaker}
              onChange={(patch, tag) => changeBubble(stored.id, patch, tag)}
              onEdit={() => setEditing(true)}
              onDelete={() => removeBubble(stored.id)}
              onToggleTail={() =>
                changeBubble(stored.id, {
                  tail: stored.tail ? null : { x: stored.x + stored.w * 0.35, y: stored.y + stored.h + 50 },
                })
              }
              onPickSpeaker={() => setSpeakerOpen(true)}
            />
          )}
          {selectedEffect && (
            <EffectCard
              effect={selectedEffect}
              panelNumber={panelNumber(selectedEffect.panelId)}
              onChange={(patch, tag) => changeEffect(selectedEffect.id, patch, tag)}
              onDelete={() => removeEffect(selectedEffect.id)}
            />
          )}
        </View>
      </View>
      <View style={[styles.addBar, { backgroundColor: c.surface, borderTopColor: c.ink }]}>
        {ADD_BUTTONS.map(item => (
          <Chip
            key={item.type}
            label={item.label}
            icon={item.icon}
            selected={pending?.kind === 'bubble' && pending.type === item.type}
            onPress={() => {
              setSelection(null);
              setPending(
                pending?.kind === 'bubble' && pending.type === item.type ? null : { kind: 'bubble', type: item.type },
              );
            }}
          />
        ))}
        <Chip
          label="Effects"
          icon={Wind}
          count={effects.length || undefined}
          selected={pending?.kind === 'effect'}
          onPress={() => setEffectsOpen(true)}
        />
      </View>
      <ModeBar pageId={pageId} mode="lettering" />

      <Sheet visible={editing && !!stored} onClose={closeEditor} title="Edit text">
        <View style={styles.sheetBody}>
          <TextField
            autoFocus
            multiline
            value={stored?.text ?? ''}
            placeholder={stored?.type === 'sfx' ? 'Sound effect' : 'Type the text'}
            onChangeText={text => stored && changeBubble(stored.id, { text }, 'text')}
            inputStyle={styles.input}
          />
          <Button title="Done" onPress={closeEditor} />
        </View>
      </Sheet>

      <Sheet visible={effectsOpen} onClose={() => setEffectsOpen(false)} title="Effects">
        <View style={styles.sheetBody}>
          <Text style={[styles.sheetLabel, { color: c.textSecondary }]}>Pick a type, then tap a panel</Text>
          <ChipRow>
            {EFFECT_TYPES.map(type => (
              <Chip
                key={type}
                label={EFFECT_LABEL[type]}
                onPress={() => {
                  setPending({ kind: 'effect', type });
                  setSelection(null);
                  setEffectsOpen(false);
                }}
              />
            ))}
          </ChipRow>
        </View>
        {effects.map(effect => (
          <ListItem
            key={effect.id}
            title={EFFECT_LABEL[effect.type]}
            subtitle={`Panel ${panelNumber(effect.panelId)}`}
            selected={selection?.id === effect.id}
            onPress={() => {
              setSelection({ kind: 'effect', id: effect.id });
              setEffectsOpen(false);
            }}
            right={
              <IconButton
                icon={Trash2}
                color={c.danger}
                onPress={() => removeEffect(effect.id)}
                accessibilityLabel="Delete effect"
              />
            }
          />
        ))}
      </Sheet>

      <Sheet
        visible={listOpen}
        onClose={() => setListOpen(false)}
        title="Page dialogue list"
        subtitle={`${pageBlocks.length - unplaced.length} / ${pageBlocks.length} placed`}
      >
        {pageBlocks.length === 0 && (
          <Text style={[styles.empty, { color: c.textSecondary }]}>No script lines are linked to this page.</Text>
        )}
        {pageBlocks.map(item => (
          <ListItem
            key={item.block.id}
            title={item.block.text || '(empty)'}
            titleLines={2}
            subtitle={`Panel ${item.panelIndex + 1} · ${
              !item.placed ? 'Tap to place' : differs(item) ? 'Differs from script · Tap to update' : 'Placed'
            }`}
            icon={item.placed ? CircleCheck : MessageCircle}
            iconColor={item.placed ? c.success : c.textSecondary}
            onPress={() => {
              const existing = bubbles.find(b => b.blockId === item.block.id);
              if (existing && differs(item)) {
                changeBubble(existing.id, { text: item.block.text.trim() });
              } else if (existing) {
                setSelection({ kind: 'bubble', id: existing.id });
                setListOpen(false);
              } else {
                placeFromList(item);
              }
            }}
          />
        ))}
      </Sheet>

      <MenuSheet
        visible={menu}
        onClose={() => setMenu(false)}
        items={[
          { label: 'Page dialogue list', icon: ListChecks, onPress: () => setListOpen(true) },
          {
            label: showOrder ? 'Hide reading order' : 'Show reading order',
            icon: ListOrdered,
            onPress: () => setShowOrder(!showOrder),
          },
          {
            label: hideBubbles ? 'Show all bubbles' : 'Hide all bubbles',
            icon: hideBubbles ? Eye : EyeOff,
            onPress: () => setHideBubbles(!hideBubbles),
          },
          {
            label: 'View script',
            icon: ScrollText,
            onPress: () => navigation.navigate('Script', { chapterId: page.chapterId }),
          },
        ]}
      />
      <MenuSheet
        visible={!!menuBubble}
        onClose={() => setItemMenu(null)}
        title={menuBubble ? BUBBLE_TYPE_LABEL[menuBubble.type] : undefined}
        subtitle={menuBubble?.text || undefined}
        items={
          menuBubble
            ? [
                { label: 'Duplicate', icon: Copy, onPress: () => duplicate(menuBubble.id) },
                { label: 'Bring forward', icon: ArrowUp, onPress: () => reorder(menuBubble.id, 1) },
                { label: 'Send backward', icon: ArrowDown, onPress: () => reorder(menuBubble.id, -1) },
                { label: 'Delete', icon: Trash2, destructive: true, onPress: () => removeBubble(menuBubble.id) },
              ]
            : []
        }
      />
      <CharacterPicker
        visible={speakerOpen}
        onClose={() => setSpeakerOpen(false)}
        projectId={project.id}
        title="Speaker"
        allowClear
        selectedIds={stored?.characterId ? [stored.characterId] : []}
        onPick={characterId => {
          if (stored) {
            changeBubble(stored.id, { characterId });
          }
          setSpeakerOpen(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  workspace: { flex: 1, overflow: 'hidden' },
  page: { position: 'absolute' },
  badge: {
    position: 'absolute',
    minWidth: 18,
    height: 18,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  top: { position: 'absolute', top: space.sm, left: space.sm, right: space.sm, alignItems: 'center' },
  bottom: { position: 'absolute', left: space.sm, right: space.sm, bottom: space.sm, gap: space.xs },
  orphan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  orphanText: { ...font.label, flex: 1 },
  addBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: space.sm,
    paddingHorizontal: space.sm,
    borderTopWidth: 2,
  },
  sheetBody: { padding: space.lg, gap: space.md },
  sheetLabel: { ...font.caption },
  input: { minHeight: 96, textAlignVertical: 'top' },
  empty: { ...font.body, padding: space.lg, textAlign: 'center' },
});
