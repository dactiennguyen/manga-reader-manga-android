import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import type { ScreenProps } from '../../app/routes';
import { ComicCard, MenuSheet, PromptDialog } from '../../components/comic';
import {
  Brush,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Copy,
  Ellipsis,
  EllipsisVertical,
  Frame,
  LayoutGrid,
  ListOrdered,
  Merge,
  Minus,
  Pencil,
  Plus,
  Redo2,
  Scissors,
  ScrollText,
  SlidersHorizontal,
  SquareDashed,
  Trash2,
  Undo2,
  Expand,
  Focus,
} from '../../components/icons';
import { PageView } from '../../components/PageView';
import { Sheet } from '../../components/Sheet';
import { Button, Chip, confirm, Header, IconButton, ListItem, Screen, Slider, toast } from '../../components/ui';
import { deleteArt, panelHasArt } from '../../engine/artStore';
import {
  canMerge,
  computeDividers,
  computePanels,
  cutFromLine,
  hitTestPanel,
  mergePanels,
  removePanel,
  setSplit,
  splitPanel,
  type LayoutTemplate,
  type Pt,
} from '../../engine/layout';
import { usePageContext } from '../../engine/page';
import { uid } from '../../lib/id';
import { SHOT_LABEL, SHOTS } from '../../model/constants';
import type { ID } from '../../model/types';
import { useChapter, useLastOpened } from '../../store/hooks';
import { useStory } from '../../store/useStory';
import { font, radius, space, useTheme } from '../../theme';
import { ModeBar } from './ModeBar';
import { PageOverlay } from './PageOverlay';
import {
  blankPanel,
  copyLayout,
  dragSplit,
  hasLayoutClipboard,
  hitHandle,
  pasteLayout,
  usePageHistory,
  type HandleKind,
} from './pageEdit';
import { TemplateSheet } from './TemplateSheet';

type Tool = 'none' | 'cut' | 'merge' | 'gutter' | 'order';
type ViewState = { scale: number; tx: number; ty: number };
type Drag = { splitId: ID; t0: number; t1: number };
type Active =
  | { kind: 'cut'; p0: Pt }
  | { kind: 'handle'; splitId: ID; handle: HandleKind }
  | { kind: 'swipe' }
  | { kind: 'view'; tx: number; ty: number };

const PAD = 16;
const HOME: ViewState = { scale: 1, tx: 0, ty: 0 };
const TOOL_HINT: Record<Tool, string> = {
  none: 'Drag a handle to move a divider. Long-press a panel for more.',
  cut: 'Draw a line across the panel to cut.',
  merge: 'Tap two adjacent panels to merge them.',
  gutter: 'Adjust the gutter between panels.',
  order: 'Tap the panels in reading order.',
};

export function PanelLayoutScreen({ navigation, route }: ScreenProps<'PanelLayout'>) {
  const { pageId } = route.params;
  const { c } = useTheme();
  const ctx = usePageContext(pageId);
  const chapter = useChapter(ctx?.page.chapterId);
  const history = usePageHistory(pageId);
  const [mode, setMode] = useState<'panels' | 'art'>(route.params.mode ?? (ctx?.page.layout ? 'art' : 'panels'));
  const [tool, setTool] = useState<Tool>('none');
  const [view, setView] = useState<ViewState>(HOME);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [selected, setSelected] = useState<ID | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [cutLine, setCutLine] = useState<{ p0: Pt; p1: Pt } | null>(null);
  const [picked, setPicked] = useState<ID[]>([]);
  const [safeGrid, setSafeGrid] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(!ctx?.page.layout && (route.params.mode ?? 'panels') === 'panels');
  const [sheet, setSheet] = useState<'menu' | 'jump' | 'art' | 'shot' | 'describe' | null>(null);
  const [panelMenu, setPanelMenu] = useState<ID | null>(null);
  const active = useRef<Active | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const pinchStart = useRef(1);
  const panStart = useRef({ tx: 0, ty: 0 });
  const gutterDirty = useRef(false);

  useLastOpened(ctx?.project.id, { screen: 'PanelLayout', chapterId: ctx?.page.chapterId ?? '', pageId });

  const page = ctx?.page;
  const layout = page?.layout ?? null;
  const panelIds = useMemo(() => (page ? Object.keys(page.panels) : []), [page]);

  useEffect(() => {
    if (selected && !panelIds.includes(selected)) {
      setSelected(null);
    }
  }, [selected, panelIds]);

  const draftPage = useMemo(
    () => (page && layout && drag ? { ...page, layout: setSplit(layout, drag.splitId, drag.t0, drag.t1) } : null),
    [page, layout, drag],
  );
  const draftShapes = useMemo(
    () => (ctx && draftPage ? computePanels(draftPage, ctx.size, { rtl: ctx.rtl }) : null),
    [ctx, draftPage],
  );
  const dividers = useMemo(
    () =>
      ctx && mode === 'panels' && tool === 'none'
        ? computeDividers(draftPage ?? ctx.page, ctx.size, { rtl: ctx.rtl })
        : [],
    [ctx, draftPage, mode, tool],
  );

  if (!ctx || !page || !chapter) {
    return (
      <Screen>
        <Header title="Page" />
      </Screen>
    );
  }

  const story = useStory.getState();
  const { size, shapes, rtl, project } = ctx;
  const webtoon = project.format === 'webtoon';
  const index = chapter.pageIds.indexOf(pageId);
  const total = chapter.pageIds.length;
  const fit = box.w
    ? webtoon
      ? ((box.w - PAD * 2) / size.w) * 0.8
      : Math.min((box.w - PAD * 2) / size.w, (box.h - PAD * 2) / size.h)
    : 0;
  const k = Math.max(0.01, fit * view.scale);
  const ox = (box.w - size.w * k) / 2 + view.tx;
  const oy = webtoon ? PAD + view.ty : (box.h - size.h * k) / 2 + view.ty;
  const toPage = (x: number, y: number): Pt => ({ x: (x - ox) / k, y: (y - oy) / k });
  const inside = (p: Pt) => p.x >= 0 && p.y >= 0 && p.x <= size.w && p.y <= size.h;

  const clampView = (next: ViewState): ViewState => {
    const kk = fit * next.scale;
    const limitX = Math.max(0, (size.w * kk - box.w) / 2 + 40);
    const tx = Math.min(limitX, Math.max(-limitX, next.tx));
    if (webtoon) {
      return { scale: next.scale, tx, ty: Math.min(0, Math.max(Math.min(0, box.h - PAD * 2 - size.h * kk), next.ty)) };
    }
    const limitY = Math.max(0, (size.h * kk - box.h) / 2 + 40);
    return { scale: next.scale, tx, ty: Math.min(limitY, Math.max(-limitY, next.ty)) };
  };

  const goTo = (target: number) => {
    const id = chapter.pageIds[target];
    if (id) {
      navigation.replace('PanelLayout', { pageId: id, mode });
    } else {
      toast(target < 0 ? 'This is the first page' : 'This is the last page');
    }
  };
  const goBack = () =>
    navigation.canGoBack() ? navigation.goBack() : navigation.replace('Storyboard', { chapterId: chapter.id });
  const pickTool = (next: Tool) => {
    setTool(tool === next ? 'none' : next);
    setSelected(null);
    setPicked([]);
  };

  const pickTemplate = async (template: LayoutTemplate) => {
    if (panelIds.some(panelHasArt)) {
      const ok = await confirm('Change template?', 'Art stays where it was on the page.', { confirmText: 'Change' });
      if (!ok) {
        return;
      }
    }
    history.record();
    story.applyTemplate(pageId, template.id);
    setTemplatesOpen(false);
    setSelected(null);
  };
  const clearPanels = async () => {
    if (
      await confirm('Clear all panels?', 'Art inside the panels is deleted too.', {
        confirmText: 'Clear',
        destructive: true,
      })
    ) {
      history.commit({ layout: null, panels: {}, order: undefined });
    }
  };
  const paste = async () => {
    const snap = pasteLayout();
    if (!snap) {
      return;
    }
    if (
      layout &&
      !(await confirm('Paste layout?', 'Current panels and their art will be replaced.', { confirmText: 'Paste' }))
    ) {
      return;
    }
    history.commit(snap);
  };
  const cut = (p0: Pt, p1: Pt) => {
    const id = hitTestPanel(shapes, { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 });
    const shape = shapes.find(s => s.id === id);
    const line = shape && cutFromLine(shape, p0, p1);
    if (!layout || !shape || !line) {
      toast('Draw a longer line across the panel');
      return;
    }
    const newId = uid();
    history.commit({
      layout: splitPanel(layout, shape.id, line.dir, line.t0, line.t1, { splitId: uid(), panelId: newId }),
      panels: { ...page.panels, [newId]: blankPanel(newId) },
      order: undefined,
    });
  };
  const merge = (keepId: ID, removeId: ID) => {
    const next = layout && canMerge(layout, keepId, removeId) ? mergePanels(layout, keepId, removeId) : null;
    if (!next) {
      toast('Only two panels sharing one divider can be merged');
      setSelected(null);
      return;
    }
    const panels = { ...page.panels };
    delete panels[removeId];
    history.commit({ layout: next, panels, order: page.order?.filter(id => id !== removeId) });
    setSelected(null);
  };
  const deletePanel = (panelId: ID) => {
    if (!layout) {
      return;
    }
    const panels = { ...page.panels };
    delete panels[panelId];
    history.commit({ layout: removePanel(layout, panelId), panels, order: page.order?.filter(id => id !== panelId) });
  };
  const togglePanel = (panelId: ID, key: 'bleed' | 'borderless') => {
    history.record();
    story.updatePanel(pageId, panelId, { [key]: !page.panels[panelId]?.[key] });
  };
  const setGutter = (patch: { gutterH?: number; gutterV?: number }) => {
    if (!gutterDirty.current) {
      gutterDirty.current = true;
      history.record();
    }
    story.updatePage(pageId, patch);
  };
  const tapPanel = (id: ID | null) => {
    if (mode === 'panels' && tool === 'merge' && id && selected && id !== selected) {
      merge(selected, id);
    } else if (mode === 'panels' && tool === 'order' && id) {
      const next = picked.includes(id) ? picked.filter(p => p !== id) : [...picked, id];
      if (next.length === shapes.length) {
        history.commit({ order: next });
        setPicked([]);
        setTool('none');
        toast('Reading order set');
      } else {
        setPicked(next);
      }
    } else {
      setSelected(id === selected ? null : id);
    }
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .maxPointers(1)
    .onStart(e => {
      const p = toPage(e.x - e.translationX, e.y - e.translationY);
      const hit = mode === 'panels' && tool === 'none' ? hitHandle(dividers, p, 24 / k) : null;
      if (mode === 'panels' && tool === 'cut' && inside(p)) {
        active.current = { kind: 'cut', p0: p };
      } else if (hit) {
        active.current = { kind: 'handle', splitId: hit.divider.splitId, handle: hit.kind };
      } else if (!inside(p)) {
        active.current = { kind: 'swipe' };
      } else {
        active.current = { kind: 'view', tx: view.tx, ty: view.ty };
      }
    })
    .onUpdate(e => {
      const a = active.current;
      if (a?.kind === 'cut') {
        setCutLine({ p0: a.p0, p1: toPage(e.x, e.y) });
      } else if (a?.kind === 'handle') {
        const base = computeDividers(page, size, { rtl }).find(d => d.splitId === a.splitId);
        if (base) {
          dragRef.current = {
            splitId: a.splitId,
            ...dragSplit(base, a.handle, e.translationX / k, e.translationY / k),
          };
          setDrag(dragRef.current);
        }
      } else if (a?.kind === 'view' && (webtoon || view.scale > 1)) {
        setView(clampView({ scale: view.scale, tx: a.tx + e.translationX, ty: a.ty + e.translationY }));
      }
    })
    .onEnd(e => {
      const a = active.current;
      if (a?.kind === 'cut') {
        cut(a.p0, toPage(e.x, e.y));
      } else if (a?.kind === 'handle' && dragRef.current && layout) {
        history.commit({ layout: setSplit(layout, a.splitId, dragRef.current.t0, dragRef.current.t1) });
      } else if (
        a?.kind === 'swipe' &&
        Math.abs(e.translationX) > 60 &&
        Math.abs(e.translationX) > Math.abs(e.translationY)
      ) {
        goTo(index + (e.translationX > 0 === rtl ? 1 : -1));
      }
    })
    .onFinalize(() => {
      active.current = null;
      dragRef.current = null;
      setDrag(null);
      setCutLine(null);
    });
  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onStart(() => {
      pinchStart.current = view.scale;
    })
    .onUpdate(e => {
      const scale = Math.min(6, Math.max(webtoon ? 0.4 : 1, pinchStart.current * e.scale));
      setView(prev => clampView({ ...prev, scale }));
    });
  const pan2 = Gesture.Pan()
    .runOnJS(true)
    .minPointers(2)
    .onStart(() => {
      panStart.current = { tx: view.tx, ty: view.ty };
    })
    .onUpdate(e => {
      setView(prev =>
        clampView({ ...prev, tx: panStart.current.tx + e.translationX, ty: panStart.current.ty + e.translationY }),
      );
    });
  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e, ok) => {
      if (ok) {
        tapPanel(hitTestPanel(shapes, toPage(e.x, e.y)));
      }
    });
  const doubleTap = Gesture.Tap()
    .runOnJS(true)
    .numberOfTaps(2)
    .onEnd((e, ok) => {
      const id = ok ? hitTestPanel(shapes, toPage(e.x, e.y)) : null;
      if (ok && mode === 'art' && id) {
        navigation.navigate('Canvas', { pageId, panelId: id });
      } else if (ok) {
        setView(HOME);
      }
    });
  const longPress = Gesture.LongPress()
    .runOnJS(true)
    .onStart(e => {
      const id = hitTestPanel(shapes, toPage(e.x, e.y));
      if (id && mode === 'panels' && tool === 'none') {
        setPanelMenu(id);
      }
    });
  const gesture = Gesture.Simultaneous(pinch, pan2, Gesture.Race(pan, longPress, Gesture.Exclusive(doubleTap, tap)));

  const selectedPanel = selected ? page.panels[selected] : undefined;
  const menuPanel = panelMenu ? page.panels[panelMenu] : undefined;
  const orderLabels =
    mode === 'panels' && tool === 'order'
      ? Object.fromEntries(shapes.map(s => [s.id, picked.includes(s.id) ? `${picked.indexOf(s.id) + 1}` : '']))
      : undefined;
  const scriptBlockId = shapes.map(s => page.panels[s.id]?.blockIds[0]).find(Boolean);

  return (
    <Screen>
      <Header
        onBack={goBack}
        right={
          <>
            <IconButton
              icon={Undo2}
              color={c.onAppBar}
              disabled={!history.canUndo}
              onPress={history.undo}
              accessibilityLabel="Undo"
            />
            <IconButton
              icon={Redo2}
              color={c.onAppBar}
              disabled={!history.canRedo}
              onPress={history.redo}
              accessibilityLabel="Redo"
            />
            <IconButton
              icon={CircleCheck}
              color={page.done ? c.success : c.onAppBar}
              active={page.done}
              onPress={() => story.updatePage(pageId, { done: !page.done })}
              accessibilityLabel={page.done ? 'Mark not done' : 'Mark page done'}
            />
            <IconButton
              icon={EllipsisVertical}
              color={c.onAppBar}
              onPress={() => setSheet('menu')}
              accessibilityLabel="More"
            />
          </>
        }
      >
        <Pressable onPress={() => setSheet('jump')} style={styles.titleRow} accessibilityLabel="Jump to another page">
          <Text numberOfLines={1} style={[font.appBarTitle, { color: c.onAppBar }]}>
            Page {index + 1} / {total}
          </Text>
          <ChevronDown size={20} color={c.onAppBar} />
        </Pressable>
      </Header>
      <GestureDetector gesture={gesture}>
        <View
          style={[styles.workspace, { backgroundColor: c.workspace }]}
          onLayout={e => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        >
          {fit > 0 && (
            <View style={[styles.page, { left: ox, top: oy, width: size.w * k, height: size.h * k }]}>
              <PageView pageId={pageId} width={size.w * k} options={{ placeholders: true }} />
              <PageOverlay
                size={size}
                k={k}
                shapes={shapes}
                selectedIds={selected ? [selected] : []}
                labels={orderLabels}
                draftShapes={draftShapes}
                dividers={dividers}
                activeSplitId={drag?.splitId}
                cutLine={cutLine}
                safeGrid={safeGrid}
              />
            </View>
          )}
        </View>
      </GestureDetector>
      <View style={styles.arrows} pointerEvents="box-none">
        <IconButton
          icon={ChevronLeft}
          onPress={() => goTo(index + (rtl ? 1 : -1))}
          accessibilityLabel={rtl ? 'Next page' : 'Previous page'}
          style={[styles.arrow, { backgroundColor: c.surface, borderColor: c.ink }]}
        />
        <IconButton
          icon={ChevronRight}
          onPress={() => goTo(index + (rtl ? -1 : 1))}
          accessibilityLabel={rtl ? 'Previous page' : 'Next page'}
          style={[styles.arrow, { backgroundColor: c.surface, borderColor: c.ink }]}
        />
      </View>
      {mode === 'panels' ? (
        <View style={[styles.tools, { backgroundColor: c.surface, borderTopColor: c.ink }]}>
          <Text style={[font.caption, styles.hint, { color: c.textSecondary }]}>
            {layout ? TOOL_HINT[tool] : 'No panels yet. Pick a template to start.'}
          </Text>
          {tool === 'gutter' && (
            <View style={styles.gutters}>
              <Text style={[font.caption, { color: c.text }]}>Horizontal gutter · {Math.round(page.gutterH)}</Text>
              <Slider
                value={page.gutterH}
                min={4}
                max={60}
                onChange={v => setGutter({ gutterH: v })}
                onComplete={() => (gutterDirty.current = false)}
              />
              <Text style={[font.caption, { color: c.text }]}>Vertical gutter · {Math.round(page.gutterV)}</Text>
              <Slider
                value={page.gutterV}
                min={4}
                max={60}
                onChange={v => setGutter({ gutterV: v })}
                onComplete={() => (gutterDirty.current = false)}
              />
            </View>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolRow}>
            <Chip label="Templates" icon={LayoutGrid} onPress={() => setTemplatesOpen(true)} />
            {!!layout && (
              <>
                <Chip label="Cut" icon={Scissors} selected={tool === 'cut'} onPress={() => pickTool('cut')} />
                <Chip label="Merge" icon={Merge} selected={tool === 'merge'} onPress={() => pickTool('merge')} />
                <Chip
                  label="Gutter"
                  icon={SlidersHorizontal}
                  selected={tool === 'gutter'}
                  onPress={() => pickTool('gutter')}
                />
                <Chip label="Order" icon={ListOrdered} selected={tool === 'order'} onPress={() => pickTool('order')} />
              </>
            )}
            {tool === 'order' && !!page.order && (
              <Chip label="Auto" onPress={() => history.commit({ order: undefined })} />
            )}
            {webtoon && (
              <>
                <Chip
                  label="Extend strip"
                  icon={Plus}
                  onPress={() => story.updatePage(pageId, { height: size.h + 800 })}
                />
                <Chip
                  label="Shorten"
                  icon={Minus}
                  onPress={() => story.updatePage(pageId, { height: Math.max(1200, size.h - 800) })}
                />
              </>
            )}
          </ScrollView>
        </View>
      ) : (
        selectedPanel && (
          <ComicCard style={styles.artCard}>
            <View style={styles.flex}>
              <Text style={[font.label, { color: c.text }]}>
                Panel {(shapes.find(s => s.id === selected)?.index ?? 0) + 1}
                {selectedPanel.shot ? ` · ${SHOT_LABEL[selectedPanel.shot]}` : ''}
              </Text>
              <Text numberOfLines={2} style={[font.caption, { color: c.textSecondary }]}>
                {selectedPanel.description || 'No description'}
              </Text>
            </View>
            <Button
              title="Draw"
              icon={Brush}
              small
              onPress={() => navigation.navigate('Canvas', { pageId, panelId: selectedPanel.id })}
            />
            <IconButton icon={Ellipsis} onPress={() => setSheet('art')} accessibilityLabel="Panel options" />
          </ComicCard>
        )
      )}
      <ModeBar
        pageId={pageId}
        mode={mode}
        onChange={next => {
          setMode(next);
          setTool('none');
          setSelected(null);
        }}
      />
      <TemplateSheet
        visible={templatesOpen}
        format={project.format}
        ratio={size.h / size.w}
        rtl={rtl}
        onClose={() => setTemplatesOpen(false)}
        onPick={pickTemplate}
      />
      <MenuSheet
        visible={sheet === 'menu'}
        onClose={() => setSheet(null)}
        items={[
          {
            label: 'View script for this page',
            icon: ScrollText,
            onPress: () => navigation.navigate('Script', { chapterId: chapter.id, blockId: scriptBlockId }),
          },
          { label: 'Fit to screen', icon: Focus, onPress: () => setView(HOME) },
          { label: safeGrid ? 'Hide safe area' : 'Show safe area', icon: Frame, onPress: () => setSafeGrid(!safeGrid) },
          {
            label: 'Copy layout',
            icon: Copy,
            disabled: !layout,
            onPress: () => {
              copyLayout(page);
              toast('Layout copied');
            },
          },
          { label: 'Paste layout', icon: SquareDashed, disabled: !hasLayoutClipboard(), onPress: paste },
          { label: 'Clear all panels', icon: Trash2, destructive: true, disabled: !layout, onPress: clearPanels },
        ]}
      />
      <MenuSheet
        visible={!!menuPanel}
        onClose={() => setPanelMenu(null)}
        title={menuPanel ? `Panel ${(shapes.find(s => s.id === menuPanel.id)?.index ?? 0) + 1}` : undefined}
        items={
          menuPanel
            ? [
                {
                  label: menuPanel.bleed ? 'Turn off bleed' : 'Bleed',
                  icon: Expand,
                  onPress: () => togglePanel(menuPanel.id, 'bleed'),
                },
                {
                  label: menuPanel.borderless ? 'Show border' : 'Borderless',
                  icon: SquareDashed,
                  onPress: () => togglePanel(menuPanel.id, 'borderless'),
                },
                { label: 'Delete panel', icon: Trash2, destructive: true, onPress: () => deletePanel(menuPanel.id) },
              ]
            : []
        }
      />
      <MenuSheet
        visible={sheet === 'art' && !!selectedPanel}
        onClose={() => setSheet(null)}
        items={[
          { label: 'Edit description', icon: Pencil, onPress: () => setSheet('describe') },
          { label: 'Change shot', icon: Focus, onPress: () => setSheet('shot') },
          {
            label: 'Delete art',
            icon: Trash2,
            destructive: true,
            disabled: !selected || !panelHasArt(selected),
            onPress: async () => {
              if (
                selected &&
                (await confirm("Delete this panel's art?", 'This cannot be undone.', {
                  confirmText: 'Delete',
                  destructive: true,
                }))
              ) {
                deleteArt(selected);
                story.bumpArt(pageId);
              }
            },
          },
        ]}
      />
      <MenuSheet
        visible={sheet === 'shot' && !!selectedPanel}
        onClose={() => setSheet(null)}
        title="Shot"
        items={[
          ...SHOTS.map(shot => ({
            label: SHOT_LABEL[shot],
            icon: selectedPanel?.shot === shot ? CircleCheck : undefined,
            onPress: () => selected && story.updatePanel(pageId, selected, { shot }),
          })),
          { label: 'No shot', onPress: () => selected && story.updatePanel(pageId, selected, { shot: undefined }) },
        ]}
      />
      <PromptDialog
        visible={sheet === 'describe' && !!selectedPanel}
        onClose={() => setSheet(null)}
        title="Panel description"
        initialValue={selectedPanel?.description ?? ''}
        placeholder="What happens in this panel?"
        multiline
        allowEmpty
        onSubmit={value => {
          if (selected) {
            story.updatePanel(pageId, selected, { description: value.trim() });
          }
          setSheet(null);
        }}
      />
      <Sheet visible={sheet === 'jump'} onClose={() => setSheet(null)} title="Jump to page">
        {chapter.pageIds.map((id, i) => (
          <ListItem
            key={id}
            title={`Page ${i + 1}`}
            subtitle={id === pageId ? 'Current' : undefined}
            onPress={() => {
              setSheet(null);
              if (id !== pageId) {
                goTo(i);
              }
            }}
          />
        ))}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 44 },
  workspace: { flex: 1, overflow: 'hidden' },
  page: { position: 'absolute' },
  arrows: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space.sm,
    marginTop: -52,
    height: 52,
  },
  arrow: { borderWidth: 2, borderRadius: radius.pill },
  tools: { borderTopWidth: 2, paddingTop: space.sm },
  hint: { paddingHorizontal: space.lg },
  gutters: { paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.xs },
  toolRow: { paddingHorizontal: space.lg, paddingVertical: space.sm, gap: space.sm },
  artCard: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, margin: space.md },
});
