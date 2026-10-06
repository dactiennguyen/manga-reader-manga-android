import { Canvas, Group, Path, Picture, Skia } from '@shopify/react-native-skia';
import { useKeepAwake } from '@sayem314/react-native-keep-awake';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, PointerType } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppNavigation, useAppRoute } from '../../app/routes';
import { MenuSheet } from '../../components/comic';
import {
  Check,
  EllipsisVertical,
  FlipHorizontal,
  Grid2x2,
  Image as ImageIcon,
  ImagePlus,
  Layers,
  Pencil,
  Redo2,
  Trash,
  Undo2,
} from '../../components/icons';
import { EmptyState, Header, IconButton, Screen, confirm, toast } from '../../components/ui';
import { appendPoint, artImageUris, fitImageRect, sampleArtColor } from '../../engine/art';
import {
  IDENTITY_TRANSFORM,
  appendPressurePoint,
  composeTransform,
  cornerOffset,
  cornerScale,
  hitCorner,
  isFillTool,
  isIdentityTransform,
  isShapeTool,
  layerBounds,
  pinchTransform,
  transformLayer,
  type Box,
  type LayerTransform,
} from '../../engine/artMath';
import { artHasContent, emptyArt, loadArt, saveArt } from '../../engine/artStore';
import { useEngineFonts } from '../../engine/fonts';
import { getImage, loadImage, useImageCacheRev } from '../../engine/images';
import type { PanelShape } from '../../engine/layout';
import { PANEL_BORDER, polyPath, recordPage, usePageContext, type PageContext } from '../../engine/page';
import { pickImage } from '../../lib/files';
import { LIMITS } from '../../model/constants';
import type { ID, PanelArt, Stroke } from '../../model/types';
import { useLastOpened } from '../../store/hooks';
import { useSettings } from '../../store/useSettings';
import { useStory } from '../../store/useStory';
import { font, radius, space, useTheme } from '../../theme';
import { LayerNode, TransformFrame } from './ArtLayers';
import { ColorStrip, TonePicker, ToolRail, ToolSlider } from './CanvasBars';
import { LayerPanel } from './LayerPanel';
import { DescriptionBanner, ReferenceWindow, TipsOverlay } from './CanvasOverlays';
import {
  COLORS,
  DEFAULT_OPACITY,
  DEFAULT_SIZES,
  GRAYS,
  SIZE_MAX,
  SIZE_MIN,
  activeLayerOf,
  createLiveStore,
  createTransformStore,
  isShapeId,
  patchLayer,
  screenToPage,
  strokeToolOf,
  supportsTone,
  type CanvasTool,
  type ShapeTool,
  type ViewState,
} from './canvasShared';

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 16;
const SNAP_ANGLE = 0.1;
const TAP_MS = 300;
const HOLD_MS = 550;
const GRID_STEP = 50;

type Touch = { id: number; x: number; y: number };

type Session = {
  ids: Set<number>;
  mode: 'idle' | 'draw' | 'view' | 'pick' | 'blocked' | 'move' | 'pan';
  pen: boolean;
  pan: { x: number; y: number; view: ViewState } | null;
  xf: {
    bounds: Box;
    corner: number;
    grab: { x: number; y: number };
    start: { x: number; y: number };
    base: LayerTransform;
    pinch: { a: number; b: number; cx: number; cy: number; dist: number } | null;
  } | null;
  maxTouches: number;
  startTime: number;
  startX: number;
  startY: number;
  moved: boolean;
  stroke: Stroke | null;
  layerId: ID | null;
  base: { a: number; b: number; cx: number; cy: number; dist: number; angle: number; view: ViewState } | null;
  hold: ReturnType<typeof setTimeout> | null;
  tap: ReturnType<typeof setTimeout> | null;
};

function KeepAwake() {
  useKeepAwake();
  return null;
}

function fitView(area: { w: number; h: number }, shape: PanelShape, pageW: number, flip: boolean): ViewState {
  const pad = 28;
  const { bbox } = shape;
  const scale = Math.max(0.01, Math.min((area.w - pad * 2) / bbox.w, (area.h - pad * 2) / bbox.h));
  const cx = bbox.x + bbox.w / 2;
  return {
    scale,
    rot: 0,
    flip,
    tx: area.w / 2 - (flip ? pageW - cx : cx) * scale,
    ty: area.h / 2 - (bbox.y + bbox.h / 2) * scale,
  };
}

export function CanvasScreen() {
  const { pageId, panelId } = useAppRoute<'Canvas'>().params;
  const ctx = usePageContext(pageId);
  const shape = ctx?.shapes.find(item => item.id === panelId);
  if (!ctx || !shape) {
    return (
      <Screen>
        <Header title="Canvas" />
        <EmptyState title="Panel not found" message="This panel no longer exists on the page." />
      </Screen>
    );
  }
  return <CanvasEditor key={panelId} ctx={ctx} shape={shape} pageId={pageId} panelId={panelId} />;
}

function CanvasEditor({
  ctx,
  shape,
  pageId,
  panelId,
}: {
  ctx: PageContext;
  shape: PanelShape;
  pageId: ID;
  panelId: ID;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const fonts = useEngineFonts();
  const imageRev = useImageCacheRev();
  const handedness = useSettings(s => s.handedness);
  const keepAwake = useSettings(s => s.keepAwakeWhileDrawing);
  const tipsSeen = useSettings(s => s.canvasTipsSeen);
  const pageW = ctx.size.w;
  const panel = ctx.page.panels[panelId];
  useLastOpened(ctx.project.id, { screen: 'Canvas', chapterId: ctx.page.chapterId, pageId, panelId });

  const [initial] = useState(() => {
    const loaded = loadArt(panelId);
    return { art: loaded ?? emptyArt(), had: artHasContent(loaded) };
  });
  const [art, setArt] = useState<PanelArt>(initial.art);
  const artRef = useRef(art);
  const history = useRef({ list: [initial.art], index: 0 });
  const [hist, setHist] = useState({ index: 0, length: 1 });
  const dirty = useRef(false);
  const unsaved = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [tool, setTool] = useState<CanvasTool>(initial.had ? 'gpen' : 'pencil');
  const [shapeTool, setShapeTool] = useState<ShapeTool>('line');
  const [tone, setTone] = useState<number | null>(null);
  const [stylusMode, setStylusMode] = useState(false);
  const strokeTool = strokeToolOf(tool);
  const [sizes, setSizes] = useState(DEFAULT_SIZES);
  const [opacities, setOpacities] = useState(DEFAULT_OPACITY);
  const [color, setColor] = useState(GRAYS[0]);
  const [recent, setRecent] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [grid, setGrid] = useState(false);
  const [preview, setPreview] = useState(false);
  const [refPath, setRefPath] = useState<string | null>(null);
  const [banner, setBanner] = useState(!initial.had && !!panel?.description);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<ViewState>({ tx: 0, ty: 0, scale: 1, rot: 0, flip: false });
  const fitScale = useRef(1);
  const live = useMemo(createLiveStore, []);
  const xform = useMemo(createTransformStore, []);
  const pressure = useRef({ value: 0.5, seen: false });
  const side = handedness === 'left' ? 'right' : 'left';
  const palette = useMemo(() => (ctx.project.color ? [...GRAYS, ...COLORS] : GRAYS), [ctx.project.color]);

  const current = {
    view,
    tool,
    size: sizes[strokeTool],
    opacity: opacities[strokeTool],
    color,
    picking,
    area,
    tone: supportsTone(tool) ? tone : null,
    stylusMode,
  };
  const latest = useRef(current);
  latest.current = current;

  const flush = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (unsaved.current) {
      unsaved.current = false;
      saveArt(panelId, artRef.current);
    }
  }, [panelId]);

  const pushHistory = useCallback((next: PanelArt) => {
    const h = history.current;
    h.list = h.list.slice(Math.max(0, h.index + 1 - LIMITS.undoSteps), h.index + 1);
    h.list.push(next);
    h.index = h.list.length - 1;
    setHist({ index: h.index, length: h.list.length });
  }, []);

  const apply = useCallback(
    (next: PanelArt, record: boolean) => {
      artRef.current = next;
      setArt(next);
      dirty.current = true;
      unsaved.current = true;
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
      saveTimer.current = setTimeout(flush, 400);
      if (record) {
        pushHistory(next);
      }
    },
    [flush, pushHistory],
  );

  const commitHistory = useCallback(() => {
    if (history.current.list[history.current.index] !== artRef.current) {
      pushHistory(artRef.current);
    }
  }, [pushHistory]);

  const step = useCallback(
    (delta: number) => {
      const h = history.current;
      const index = h.index + delta;
      if (index < 0 || index >= h.list.length) {
        return;
      }
      h.index = index;
      setHist({ index, length: h.list.length });
      apply(h.list[index], false);
    },
    [apply],
  );

  const leave = useCallback(() => {
    flush();
    if (dirty.current) {
      dirty.current = false;
      useStory.getState().bumpArt(pageId);
    }
  }, [flush, pageId]);

  const done = useCallback(() => {
    leave();
    navigation.goBack();
  }, [leave, navigation]);

  useEffect(
    () => () => {
      const s = session.current;
      if (s.hold) {
        clearTimeout(s.hold);
        s.hold = null;
      }
      if (s.tap) {
        clearTimeout(s.tap);
        s.tap = null;
      }
      leave();
    },
    [leave],
  );

  const closeReference = useCallback(() => setRefPath(null), []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (layersOpen) {
        setLayersOpen(false);
      } else {
        done();
      }
      return true;
    });
    return () => sub.remove();
  }, [done, layersOpen]);

  useEffect(() => {
    if (!banner) {
      return;
    }
    const timer = setTimeout(() => setBanner(false), 5000);
    return () => clearTimeout(timer);
  }, [banner]);

  useEffect(() => {
    artImageUris(art).forEach(getImage);
    xform.set(null);
  }, [art, xform]);

  const resetView = useCallback(
    (flip: boolean) => {
      const a = latest.current.area;
      if (a.w > 0 && a.h > 0) {
        const next = fitView(a, shape, pageW, flip);
        fitScale.current = next.scale;
        setView(next);
      }
    },
    [shape, pageW],
  );

  useEffect(() => {
    resetView(latest.current.view.flip);
  }, [area, resetView]);

  const pickColorAt = useCallback(
    (x: number, y: number) => {
      const p = screenToPage(latest.current.view, pageW, x, y);
      const picked = sampleArtColor(artRef.current, p.x, p.y);
      setPicking(false);
      if (picked) {
        setColor(picked);
        toast(`Picked ${picked}`);
      }
      return !!picked;
    },
    [pageW],
  );

  const session = useRef<Session>({
    ids: new Set(),
    mode: 'idle',
    pen: false,
    pan: null,
    xf: null,
    maxTouches: 0,
    startTime: 0,
    startX: 0,
    startY: 0,
    moved: false,
    stroke: null,
    layerId: null,
    base: null,
    hold: null,
    tap: null,
  });

  const gesture = useMemo(() => {
    const s = session.current;
    const clearHold = () => {
      if (s.hold) {
        clearTimeout(s.hold);
        s.hold = null;
      }
    };
    const cancelStroke = () => {
      clearHold();
      s.stroke = null;
      live.set(null);
    };
    const pair = (touches: Touch[]) => {
      const [p, q] = touches;
      return {
        a: p.id,
        b: q.id,
        cx: (p.x + q.x) / 2,
        cy: (p.y + q.y) / 2,
        dist: Math.max(1, Math.hypot(q.x - p.x, q.y - p.y)),
        angle: Math.atan2(q.y - p.y, q.x - p.x),
      };
    };
    const startDraw = (t: Touch) => {
      const now = latest.current;
      const layer = activeLayerOf(artRef.current);
      if (!layer || layer.locked || !layer.visible) {
        s.mode = 'blocked';
        toast(layer?.locked ? 'Layer is locked' : 'Layer is hidden');
        return;
      }
      const p = screenToPage(now.view, pageW, t.x, t.y);
      if (now.tool === 'move') {
        const bounds = layerBounds(layer);
        if (!bounds) {
          s.mode = 'blocked';
          toast('Layer is empty');
          return;
        }
        s.mode = 'move';
        s.layerId = layer.id;
        const corner = hitCorner(bounds, p.x, p.y, 28 / now.view.scale);
        s.xf = {
          bounds,
          corner,
          grab: corner >= 0 ? cornerOffset(bounds, corner, p.x, p.y) : { x: 0, y: 0 },
          start: p,
          base: IDENTITY_TRANSFORM,
          pinch: null,
        };
        return;
      }
      const freehand = !isShapeTool(now.tool) && !isFillTool(now.tool);
      const withPressure = freehand && s.pen;
      const points: number[] = [];
      if (withPressure) {
        appendPressurePoint(points, p.x, p.y, pressure.current.seen ? pressure.current.value : 0.5, 0);
      } else {
        appendPoint(points, p.x, p.y, 0);
      }
      s.mode = 'draw';
      s.layerId = layer.id;
      s.stroke = { tool: now.tool, color: now.color, size: now.size, opacity: now.opacity, points };
      if (withPressure) {
        s.stroke.pressure = true;
      }
      if (now.tone !== null && now.tool !== 'eraser') {
        s.stroke.tone = { density: now.tone };
      }
      live.set(s.stroke);
      s.hold = setTimeout(() => {
        s.hold = null;
        if (s.mode === 'draw' && !s.moved && pickColorAt(s.startX, s.startY)) {
          cancelStroke();
          s.mode = 'blocked';
        }
      }, HOLD_MS);
    };
    const pagePair = (touches: Touch[]) => {
      const v = latest.current.view;
      const p = screenToPage(v, pageW, touches[0].x, touches[0].y);
      const q = screenToPage(v, pageW, touches[1].x, touches[1].y);
      return {
        a: touches[0].id,
        b: touches[1].id,
        cx: (p.x + q.x) / 2,
        cy: (p.y + q.y) / 2,
        dist: Math.max(0.01, Math.hypot(q.x - p.x, q.y - p.y)),
      };
    };
    const setTransform = (t: LayerTransform) => {
      const layer = artRef.current.layers.find(item => item.id === s.layerId);
      if (layer) {
        xform.set({ layer, t });
      }
    };
    const finishTap = () => {
      if (s.maxTouches === 3) {
        step(1);
      } else if (s.maxTouches === 2) {
        if (s.tap) {
          clearTimeout(s.tap);
          s.tap = null;
          resetView(latest.current.view.flip);
        } else {
          s.tap = setTimeout(() => {
            s.tap = null;
            step(-1);
          }, TAP_MS);
        }
      }
    };
    return Gesture.Manual()
      .runOnJS(true)
      .onTouchesDown((e, manager) => {
        if (e.allTouches.length <= e.changedTouches.length) {
          s.ids.clear();
        }
        const first = s.ids.size === 0;
        e.changedTouches.forEach(t => s.ids.add(t.id));
        const touches = e.allTouches.filter(t => s.ids.has(t.id));
        if (first) {
          manager.begin();
          manager.activate();
          const t = e.changedTouches[0];
          s.maxTouches = 1;
          s.startTime = Date.now();
          s.startX = t.x;
          s.startY = t.y;
          s.moved = false;
          s.base = null;
          s.pan = null;
          s.xf = null;
          s.pen = e.pointerType === PointerType.STYLUS;
          if (s.pen && !latest.current.stylusMode) {
            setStylusMode(true);
            toast('Stylus detected. One finger now pans the view.');
          }
          if (latest.current.picking) {
            s.mode = 'pick';
          } else if (latest.current.stylusMode && e.pointerType === PointerType.TOUCH) {
            s.mode = 'pan';
            s.pan = { x: t.x, y: t.y, view: latest.current.view };
          } else {
            startDraw(t);
          }
          return;
        }
        if (s.mode === 'draw' && s.pen && e.pointerType === PointerType.TOUCH) {
          e.changedTouches.forEach(t => s.ids.delete(t.id));
          return;
        }
        s.maxTouches = Math.max(s.maxTouches, s.ids.size);
        if (s.mode === 'draw') {
          cancelStroke();
        }
        if (s.mode === 'move' && s.xf) {
          s.xf.base = xform.get()?.t ?? IDENTITY_TRANSFORM;
          s.xf.pinch = touches.length >= 2 ? pagePair(touches) : null;
          return;
        }
        if (s.mode !== 'view') {
          s.mode = 'view';
          s.moved = false;
        }
        s.base = touches.length >= 2 ? { ...pair(touches), view: latest.current.view } : null;
      })
      .onTouchesMove(e => {
        const touches = e.allTouches.filter(t => s.ids.has(t.id));
        if (s.mode === 'draw' && s.stroke && touches.length === 1) {
          const t = touches[0];
          const now = latest.current;
          if (!s.moved && Math.hypot(t.x - s.startX, t.y - s.startY) > 8) {
            s.moved = true;
            clearHold();
          }
          const p = screenToPage(now.view, pageW, t.x, t.y);
          const gap = Math.max(0.3, 1.5 / now.view.scale);
          if (isShapeTool(s.stroke.tool)) {
            const [x0, y0] = s.stroke.points;
            s.stroke = { ...s.stroke, points: [x0, y0, Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10] };
            live.set(s.stroke);
          } else if (
            s.stroke.pressure
              ? appendPressurePoint(s.stroke.points, p.x, p.y, pressure.current.value, gap)
              : appendPoint(s.stroke.points, p.x, p.y, gap)
          ) {
            s.stroke = { ...s.stroke };
            live.set(s.stroke);
          }
          return;
        }
        if (s.mode === 'move' && s.xf) {
          const xf = s.xf;
          if (xf.pinch) {
            if (touches.length >= 2) {
              const cur = pagePair(touches);
              const slop = 8 / latest.current.view.scale;
              const shifted =
                Math.abs(cur.dist - xf.pinch.dist) > slop ||
                Math.hypot(cur.cx - xf.pinch.cx, cur.cy - xf.pinch.cy) > slop;
              if (cur.a === xf.pinch.a && cur.b === xf.pinch.b && (s.moved || shifted)) {
                s.moved = true;
                setTransform(composeTransform(xf.base, pinchTransform(xf.pinch, cur)));
              }
            }
          } else if (touches.length === 1) {
            if (!s.moved && Math.hypot(touches[0].x - s.startX, touches[0].y - s.startY) <= 6) {
              return;
            }
            const p = screenToPage(latest.current.view, pageW, touches[0].x, touches[0].y);
            s.moved = true;
            setTransform(
              xf.corner >= 0
                ? cornerScale(xf.bounds, xf.corner, p.x + xf.grab.x, p.y + xf.grab.y)
                : { s: 1, tx: p.x - xf.start.x, ty: p.y - xf.start.y },
            );
          }
          return;
        }
        if (s.mode === 'pan' && s.pan && touches.length === 1) {
          const t = touches[0];
          s.moved = true;
          setView({ ...s.pan.view, tx: s.pan.view.tx + t.x - s.pan.x, ty: s.pan.view.ty + t.y - s.pan.y });
          return;
        }
        if (s.mode !== 'view' || touches.length < 2) {
          return;
        }
        const cur = pair(touches);
        if (!s.base || s.base.a !== cur.a || s.base.b !== cur.b) {
          s.base = { ...cur, view: latest.current.view };
          return;
        }
        const b = s.base;
        const ratio = cur.dist / b.dist;
        let turn = cur.angle - b.angle;
        turn = Math.atan2(Math.sin(turn), Math.cos(turn));
        if (
          !s.moved &&
          (Math.hypot(cur.cx - b.cx, cur.cy - b.cy) > 10 || Math.abs(ratio - 1) > 0.06 || Math.abs(turn) > 0.08)
        ) {
          s.moved = true;
        }
        if (!s.moved) {
          return;
        }
        const fit = fitScale.current;
        const scale = Math.max(fit * ZOOM_MIN, Math.min(fit * ZOOM_MAX, b.view.scale * ratio));
        let rot = b.view.rot + turn;
        rot = Math.atan2(Math.sin(rot), Math.cos(rot));
        if (Math.abs(rot) < SNAP_ANGLE) {
          rot = 0;
        }
        const dx = b.cx - b.view.tx;
        const dy = b.cy - b.view.ty;
        const c0 = Math.cos(-b.view.rot);
        const s0 = Math.sin(-b.view.rot);
        const qx = ((dx * c0 - dy * s0) / b.view.scale) * scale;
        const qy = ((dx * s0 + dy * c0) / b.view.scale) * scale;
        const c1 = Math.cos(rot);
        const s1 = Math.sin(rot);
        setView({
          scale,
          rot,
          flip: b.view.flip,
          tx: cur.cx - (qx * c1 - qy * s1),
          ty: cur.cy - (qx * s1 + qy * c1),
        });
      })
      .onTouchesUp((e, manager) => {
        e.changedTouches.forEach(t => s.ids.delete(t.id));
        if (s.ids.size > 0) {
          s.base = null;
          return;
        }
        clearHold();
        if (s.mode === 'draw' && s.stroke && s.layerId) {
          const stroke = s.stroke;
          const layerId = s.layerId;
          const valid = isShapeTool(stroke.tool)
            ? s.moved && stroke.points.length >= 4
            : !isFillTool(stroke.tool) || (s.moved && stroke.points.length >= 6);
          if (valid) {
            apply(
              patchLayer(artRef.current, layerId, layer => ({ ...layer, strokes: [...layer.strokes, stroke] })),
              true,
            );
            if (stroke.tool !== 'eraser') {
              setRecent(list => [stroke.color, ...list.filter(item => item !== stroke.color)].slice(0, 6));
            }
          }
          s.stroke = null;
          live.set(null);
        } else if (s.mode === 'move' && s.layerId) {
          const pending = xform.get();
          const layerId = s.layerId;
          if (pending && !isIdentityTransform(pending.t)) {
            apply(
              patchLayer(artRef.current, layerId, layer => transformLayer(layer, pending.t)),
              true,
            );
          } else {
            xform.set(null);
            if (!s.moved && s.maxTouches >= 2 && Date.now() - s.startTime < TAP_MS) {
              finishTap();
            }
          }
          s.xf = null;
        } else if (s.mode === 'pick') {
          const t = e.changedTouches[0];
          if (!pickColorAt(t ? t.x : s.startX, t ? t.y : s.startY)) {
            toast('No color here');
          }
        } else if (s.mode === 'view' && !s.moved && Date.now() - s.startTime < TAP_MS) {
          finishTap();
        }
        s.mode = 'idle';
        manager.end();
      })
      .onTouchesCancelled((_e, manager) => {
        s.ids.clear();
        cancelStroke();
        xform.set(null);
        s.xf = null;
        s.pan = null;
        s.mode = 'idle';
        manager.fail();
      });
  }, [apply, live, pageW, pickColorAt, resetView, step, xform]);

  const composed = useMemo(() => {
    const read = (e: { stylusData?: { pressure: number } }) => {
      const value = e.stylusData?.pressure;
      if (typeof value === 'number' && value > 0) {
        pressure.current = { value, seen: true };
      }
    };
    const stylus = Gesture.Pan().runOnJS(true).minDistance(0).maxPointers(1).onBegin(read).onStart(read).onUpdate(read);
    return Gesture.Simultaneous(gesture, stylus);
  }, [gesture]);

  const background = useMemo(
    () => recordPage(ctx, fonts, { skipArtPanelId: panelId, dimExceptPanelId: panelId, bubbles: false }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ctx, fonts, panelId, imageRev],
  );
  const clip = useMemo(() => polyPath(shape.poly), [shape]);
  const gridPath = useMemo(() => {
    const { x, y, w, h } = shape.bbox;
    const builder = Skia.PathBuilder.Make();
    for (let gx = x + GRID_STEP; gx < x + w; gx += GRID_STEP) {
      builder.moveTo(gx, y).lineTo(gx, y + h);
    }
    for (let gy = y + GRID_STEP; gy < y + h; gy += GRID_STEP) {
      builder.moveTo(x, gy).lineTo(x + w, gy);
    }
    return builder.build();
  }, [shape]);
  const transform = useMemo(
    () => [
      { translateX: view.tx },
      { translateY: view.ty },
      { rotate: view.rot },
      { scale: view.scale },
      { translateX: view.flip ? pageW : 0 },
      { scaleX: view.flip ? -1 : 1 },
    ],
    [view, pageW],
  );

  const active = activeLayerOf(art);
  const moveBounds = useMemo(() => (tool === 'move' && active ? layerBounds(active) : null), [tool, active]);

  const editActive = (label: string, patch: (layer: NonNullable<typeof active>) => NonNullable<typeof active>) => {
    if (!active) {
      return;
    }
    if (active.locked) {
      toast('Layer is locked');
      return;
    }
    apply(patchLayer(artRef.current, active.id, patch), true);
    toast(label);
  };

  const importImage = async () => {
    if (active?.locked) {
      toast('Layer is locked');
      return;
    }
    const path = await pickImage();
    const image = path ? await loadImage(path) : null;
    if (!path || !image) {
      if (path) {
        toast('Could not open the image');
      }
      return;
    }
    const rect = fitImageRect(image.width(), image.height(), shape.bbox);
    editActive('Image placed on layer', layer => ({ ...layer, image: { uri: path, ...rect } }));
  };

  const clearActive = async () => {
    if (!active || (!active.strokes.length && !active.image)) {
      toast('Layer is already empty');
      return;
    }
    if (await confirm(`Clear layer "${active.name}"?`, undefined, { confirmText: 'Clear', destructive: true })) {
      editActive('Layer cleared', layer => ({ ...layer, strokes: [], image: undefined }));
    }
  };

  const addReference = async () => {
    const path = await pickImage();
    if (path) {
      setRefPath(path);
    }
  };

  const size = sizes[strokeTool];
  const previewSize = Math.max(4, size * view.scale);
  const zoom = Math.round((view.scale / fitScale.current) * 100);

  return (
    <View style={[styles.root, { backgroundColor: c.workspace }]}>
      {keepAwake ? <KeepAwake /> : null}
      <View style={[styles.topBar, { backgroundColor: c.toolbar, paddingTop: insets.top }]}>
        <IconButton icon={Check} onPress={done} color={c.onToolbar} accessibilityLabel="Done" />
        <Text numberOfLines={1} style={[styles.title, { color: c.onToolbar }]}>
          Panel {shape.index + 1}
        </Text>
        <IconButton
          icon={Undo2}
          onPress={() => step(-1)}
          color={c.onToolbar}
          disabled={hist.index <= 0}
          accessibilityLabel="Undo"
        />
        <IconButton
          icon={Redo2}
          onPress={() => step(1)}
          color={c.onToolbar}
          disabled={hist.index >= hist.length - 1}
          accessibilityLabel="Redo"
        />
        <IconButton
          icon={Layers}
          onPress={() => setLayersOpen(v => !v)}
          color={c.onToolbar}
          accessibilityLabel="Layers"
        />
        <IconButton
          icon={EllipsisVertical}
          onPress={() => setMenuOpen(true)}
          color={c.onToolbar}
          accessibilityLabel="More"
        />
      </View>

      <View
        style={styles.stage}
        onLayout={e => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        <GestureDetector gesture={composed}>
          <View style={StyleSheet.absoluteFill} collapsable={false}>
            <Canvas style={StyleSheet.absoluteFill}>
              <Group transform={transform}>
                <Picture picture={background} />
                <Group clip={clip}>
                  {art.layers.map(layer => (
                    <LayerNode
                      key={layer.id}
                      layer={layer}
                      live={layer.id === active?.id ? live : null}
                      transform={layer.id === active?.id && tool === 'move' ? xform : null}
                      imageRev={imageRev}
                    />
                  ))}
                  {grid ? <Path path={gridPath} style="stroke" strokeWidth={1} color={c.accent} opacity={0.4} /> : null}
                </Group>
                {panel?.borderless ? null : (
                  <Path path={clip} style="stroke" strokeWidth={PANEL_BORDER} strokeJoin="miter" color="#16161A" />
                )}
                {moveBounds && active && active.visible ? (
                  <TransformFrame
                    store={xform}
                    layer={active}
                    bounds={moveBounds}
                    color={c.accent}
                    viewScale={view.scale}
                  />
                ) : null}
              </Group>
            </Canvas>
          </View>
        </GestureDetector>

        {preview ? (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
            <View
              style={[
                styles.preview,
                { width: previewSize, height: previewSize, borderRadius: previewSize / 2, borderColor: c.accent },
              ]}
            />
          </View>
        ) : null}
        <Text
          pointerEvents="none"
          style={[
            styles.zoom,
            side === 'left' ? styles.zoomRight : styles.zoomLeft,
            { color: c.onToolbar, backgroundColor: c.toolbar },
          ]}
        >
          {zoom}%{view.rot ? ` · ${Math.round((view.rot * 180) / Math.PI)}°` : ''}
          {picking ? ' · Tap to pick a color' : ''}
          {stylusMode ? ' · Stylus' : ''}
        </Text>
        {banner && panel?.description ? <DescriptionBanner text={panel.description} /> : null}
        <ToolRail
          tool={tool}
          shape={shapeTool}
          picking={picking}
          collapsed={collapsed}
          side={side}
          maxHeight={Math.max(120, area.h - space.md * 2)}
          onTool={next => {
            setTool(next);
            if (isShapeId(next)) {
              setShapeTool(next);
            }
            setPicking(false);
          }}
          onPick={() => setPicking(v => !v)}
          onToggle={() => setCollapsed(v => !v)}
        />
        {refPath ? (
          <ReferenceWindow
            key={refPath}
            path={refPath}
            initialX={side === 'left' ? Math.max(0, area.w - 140) : space.sm}
            initialY={space.md}
            onClose={closeReference}
          />
        ) : null}
        {layersOpen ? (
          <LayerPanel
            art={art}
            side={side === 'left' ? 'right' : 'left'}
            onChange={apply}
            onCommit={commitHistory}
            onImportImage={importImage}
            onClose={() => setLayersOpen(false)}
          />
        ) : null}
      </View>

      <View style={[styles.bottomBar, { backgroundColor: c.toolbar, paddingBottom: insets.bottom }]}>
        {tool === 'move' ? (
          <Text style={[styles.hint, { color: c.onToolbar }]}>
            Drag to move the layer. Pinch or drag a corner handle to scale it.
          </Text>
        ) : (
          <>
            <ColorStrip
              colors={palette}
              recent={ctx.project.color ? recent : []}
              value={color}
              leading={supportsTone(tool) ? <TonePicker value={tone} onChange={setTone} /> : undefined}
              onPick={setColor}
            />
            <View style={styles.sliders}>
              {tool === 'fill' ? null : (
                <ToolSlider
                  label="Size"
                  value={size}
                  min={SIZE_MIN}
                  max={SIZE_MAX}
                  text={`${Math.round(size)}`}
                  onChange={value => {
                    setPreview(true);
                    setSizes(prev => ({ ...prev, [strokeTool]: Math.round(value) }));
                  }}
                  onEnd={() => setPreview(false)}
                />
              )}
              <ToolSlider
                label="Opacity"
                value={opacities[strokeTool]}
                min={0.05}
                max={1}
                text={`${Math.round(opacities[strokeTool] * 100)}%`}
                onChange={value => setOpacities(prev => ({ ...prev, [strokeTool]: Math.round(value * 100) / 100 }))}
              />
            </View>
          </>
        )}
      </View>

      <MenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={`Panel ${shape.index + 1}`}
        items={[
          { label: 'Flip view horizontally', icon: FlipHorizontal, onPress: () => resetView(!view.flip) },
          { label: grid ? 'Hide grid' : 'Show grid', icon: Grid2x2, onPress: () => setGrid(v => !v) },
          ...(stylusMode
            ? [{ label: 'Draw with a finger again', icon: Pencil, onPress: () => setStylusMode(false) }]
            : []),
          { label: 'Add reference image', icon: ImagePlus, onPress: addReference },
          { label: 'Import image into layer', icon: ImageIcon, onPress: importImage },
          { label: 'Clear current layer', icon: Trash, destructive: true, onPress: clearActive },
        ]}
      />
      {tipsSeen ? null : <TipsOverlay onClose={() => useSettings.getState().set({ canvasTipsSeen: true })} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xs },
  title: { ...font.appBarTitle, flex: 1, paddingHorizontal: space.sm },
  stage: { flex: 1, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
  preview: { borderWidth: 2 },
  zoom: {
    ...font.caption,
    position: 'absolute',
    bottom: space.sm,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    overflow: 'hidden',
    opacity: 0.8,
  },
  zoomLeft: { left: space.sm },
  zoomRight: { right: space.sm },
  bottomBar: {},
  hint: { ...font.caption, textAlign: 'center', paddingHorizontal: space.md, paddingVertical: space.lg },
  sliders: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.md, paddingBottom: space.xs },
});
