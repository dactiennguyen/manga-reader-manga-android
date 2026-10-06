import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import type { ScreenProps } from '../../app/routes';
import { Banner, MenuSheet, ProgressLine, SpeechBubble } from '../../components/comic';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CircleCheck,
  Copy,
  EllipsisVertical,
  Eye,
  Flag,
  LayoutGrid,
  List,
  ListChecks,
  Plus,
  ScrollText,
  Share2,
  SquarePlus,
  Trash2,
  X,
} from '../../components/icons';
import { Button, confirm, Fab, Header, IconButton, Screen, toast } from '../../components/ui';
import { Dialog } from '../../components/Sheet';
import { isRtl, pageSize, panelOrder } from '../../engine/layout';
import { plural } from '../../lib/format';
import { SHOT_LABEL } from '../../model/constants';
import type { PagePlan } from '../../model/paginate';
import { chapterLabel, scriptOutdated } from '../../model/selectors';
import type { ID, Page, Scene } from '../../model/types';
import { useChapter, useLastOpened, useProjectOfChapter } from '../../store/hooks';
import { useStory } from '../../store/useStory';
import { font, space, useTheme } from '../../theme';
import { AutoPaginateSheet } from './AutoPaginateSheet';
import { PageThumb } from './PageThumb';

type Row = { key: string; pageIds: ID[] };

const WEBTOON_MAX_H = 360;

export function StoryboardScreen({ navigation, route }: ScreenProps<'Storyboard'>) {
  const { chapterId } = route.params;
  const { c } = useTheme();
  const { width: screenW } = useWindowDimensions();
  const chapter = useChapter(chapterId);
  const project = useProjectOfChapter(chapterId);
  const allPages = useStory(s => s.pages);
  const allScenes = useStory(s => s.scenes);
  const label = useStory(s => chapterLabel(s, chapterId));
  const [listView, setListView] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pageMenu, setPageMenu] = useState<ID | null>(null);
  const [flagNote, setFlagNote] = useState<ID | null>(null);
  const [selection, setSelection] = useState<ID[] | null>(null);
  const [paginating, setPaginating] = useState(false);

  useLastOpened(project?.id, { screen: 'Storyboard', chapterId });

  const pages = useMemo(
    () => (chapter?.pageIds ?? []).map(id => allPages[id]).filter((p): p is Page => !!p),
    [chapter, allPages],
  );
  const scenes = useMemo(
    () => (chapter?.sceneIds ?? []).map(id => allScenes[id]).filter((s): s is Scene => !!s),
    [chapter, allScenes],
  );
  const usedBlockIds = useMemo(() => {
    const used = new Set<ID>();
    for (const page of pages) {
      for (const panel of Object.values(page.panels)) {
        panel.blockIds.forEach(id => used.add(id));
      }
    }
    return used;
  }, [pages]);
  const hasScript = scenes.some(scene => scene.blocks.some(block => block.text.trim()));
  const hasUnassigned = scenes.some(scene =>
    scene.blocks.some(block => block.text.trim() && !usedBlockIds.has(block.id)),
  );

  const manga = project?.format !== 'webtoon';
  const rows = useMemo<Row[]>(() => {
    const ids = pages.map(p => p.id);
    if (listView || !manga) {
      return ids.map(id => ({ key: id, pageIds: [id] }));
    }
    const out: Row[] = [];
    if (ids.length) {
      out.push({ key: ids[0], pageIds: [ids[0]] });
    }
    for (let i = 1; i < ids.length; i += 2) {
      out.push({ key: ids[i], pageIds: ids.slice(i, i + 2) });
    }
    return out;
  }, [pages, listView, manga]);

  if (!chapter || !project) {
    return (
      <Screen>
        <Header title="Storyboard" />
      </Screen>
    );
  }

  const story = useStory.getState();
  const rtl = isRtl(project);
  const numberOf = (pageId: ID) => chapter.pageIds.indexOf(pageId) + 1;
  const doneCount = pages.filter(p => p.done).length;
  const flagCount = pages.filter(p => p.flag).length;
  const thumbW = listView ? 84 : manga ? Math.min(180, (screenW - space.lg * 2) / 2) : Math.min(200, screenW * 0.5);
  const thumbH = (page: Page) => {
    const size = pageSize(project, page);
    const h = (thumbW * size.h) / size.w;
    return manga ? h : Math.min(h, listView ? 160 : WEBTOON_MAX_H);
  };

  const openPage = (pageId: ID) => navigation.navigate('PanelLayout', { pageId });
  const addPage = (index?: number) => {
    const id = story.addPage(chapterId, index === undefined ? undefined : { index });
    if (index === undefined) {
      openPage(id);
    }
  };
  const removePages = async (ids: ID[]) => {
    const hasContent = ids.some(id => {
      const page = allPages[id];
      return page && (page.layout || page.bubbles.length > 0);
    });
    if (hasContent) {
      const ok = await confirm(
        ids.length > 1 ? `Delete ${ids.length} pages?` : `Delete page ${numberOf(ids[0])}?`,
        'Panels, art and lettering will be lost. This cannot be undone.',
        { confirmText: 'Delete', destructive: true },
      );
      if (!ok) {
        return;
      }
    }
    ids.forEach(id => story.removePage(id));
    setSelection(null);
    toast(ids.length > 1 ? `${ids.length} pages deleted` : 'Page deleted');
  };
  const applyPlans = (plans: PagePlan[]) => {
    const created = story.applyPagination(chapterId, plans, 'append');
    setPaginating(false);
    toast(`${plural(created.length, 'page')} added from script`);
  };
  const toggleSelect = (pageId: ID) =>
    setSelection(prev => {
      const list = prev ?? [];
      return list.includes(pageId) ? list.filter(id => id !== pageId) : [...list, pageId];
    });
  const pressPage = (pageId: ID) => (selection ? toggleSelect(pageId) : openPage(pageId));
  const longPressPage = (pageId: ID) => (selection ? toggleSelect(pageId) : setPageMenu(pageId));

  const menuPage = pageMenu ? allPages[pageMenu] : undefined;
  const menuIndex = pageMenu ? chapter.pageIds.indexOf(pageMenu) : -1;
  const flagPage = flagNote ? allPages[flagNote] : undefined;

  const renderThumb = (pageId: ID) => {
    const page = allPages[pageId];
    return page ? (
      <PageThumb
        key={pageId}
        pageId={pageId}
        number={numberOf(pageId)}
        width={thumbW}
        height={thumbH(page)}
        selecting={!!selection}
        selected={selection?.includes(pageId)}
        onPress={() => pressPage(pageId)}
        onLongPress={() => longPressPage(pageId)}
      />
    ) : null;
  };

  const renderRow = ({ item }: { item: Row }) => {
    if (listView) {
      const page = allPages[item.pageIds[0]];
      const order = page ? panelOrder(page, rtl) : [];
      return (
        <Pressable
          onPress={() => pressPage(item.pageIds[0])}
          onLongPress={() => longPressPage(item.pageIds[0])}
          style={[styles.listRow, { borderBottomColor: c.border }]}
        >
          {renderThumb(item.pageIds[0])}
          <View style={styles.listText}>
            {order.length === 0 && <Text style={[font.caption, { color: c.muted }]}>No panels yet</Text>}
            {order.map((panelId, index) => {
              const panel = page?.panels[panelId];
              return (
                <Text key={panelId} numberOfLines={2} style={[font.caption, { color: c.textSecondary }]}>
                  <Text style={[font.label, { color: c.text }]}>
                    {index + 1}
                    {panel?.shot ? ` · ${SHOT_LABEL[panel.shot]}` : ''}
                  </Text>
                  {`  ${panel?.description || 'No description'}`}
                </Text>
              );
            })}
          </View>
        </Pressable>
      );
    }
    return <View style={[styles.gridRow, manga && rtl && styles.rtlRow]}>{item.pageIds.map(renderThumb)}</View>;
  };

  return (
    <Screen>
      <Header
        title="Storyboard"
        subtitle={label}
        right={
          selection ? (
            <IconButton
              icon={X}
              color={c.onAppBar}
              onPress={() => setSelection(null)}
              accessibilityLabel="Cancel selection"
            />
          ) : (
            <>
              <IconButton
                icon={Eye}
                color={c.onAppBar}
                disabled={pages.length === 0}
                onPress={() => navigation.navigate('Preview', { projectId: project.id, chapterId })}
                accessibilityLabel="Preview"
              />
              <IconButton
                icon={Share2}
                color={c.onAppBar}
                disabled={pages.length === 0}
                onPress={() => navigation.navigate('Export', { projectId: project.id, chapterId })}
                accessibilityLabel="Export"
              />
              <IconButton
                icon={EllipsisVertical}
                color={c.onAppBar}
                onPress={() => setMenuOpen(true)}
                accessibilityLabel="More"
              />
            </>
          )
        }
      />
      {scriptOutdated(chapter) && (
        <Banner
          text="The script changed after pagination."
          action={{ label: 'View script', onPress: () => navigation.navigate('Script', { chapterId }) }}
        />
      )}
      {pages.length > 0 && (
        <View style={styles.stats}>
          <Text style={[font.caption, { color: c.textSecondary }]}>
            {selection
              ? `${selection.length} selected`
              : `${plural(pages.length, 'page')} · ${doneCount} done · ${flagCount} flagged   ${
                  manga ? '← reading direction' : '↓ vertical scroll'
                }`}
          </Text>
          <ProgressLine value={pages.length ? doneCount / pages.length : 0} />
        </View>
      )}
      {pages.length > 0 && hasUnassigned && !selection && (
        <View style={styles.cta}>
          <Button
            title="Auto-paginate from script"
            variant="secondary"
            icon={ScrollText}
            small
            onPress={() => setPaginating(true)}
          />
        </View>
      )}
      {pages.length === 0 ? (
        <View style={styles.empty}>
          <SpeechBubble>
            <Text style={[font.body, { color: c.text }]}>
              {hasScript
                ? 'This chapter has a script. Paginate from it, or add a blank page.'
                : 'Write the script first, or start drawing right away.'}
            </Text>
          </SpeechBubble>
          {hasScript ? (
            <Button title="Auto-paginate from script" icon={ScrollText} onPress={() => setPaginating(true)} />
          ) : (
            <Button
              title="Write script"
              icon={ScrollText}
              onPress={() => navigation.navigate('Script', { chapterId })}
            />
          )}
          <Button title="Add blank page" variant="secondary" icon={Plus} onPress={() => addPage()} />
        </View>
      ) : (
        <FlatList
          key={listView ? 'list' : 'grid'}
          data={rows}
          keyExtractor={row => row.key}
          renderItem={renderRow}
          contentContainerStyle={styles.content}
        />
      )}
      {selection ? (
        <View style={[styles.bulkBar, { backgroundColor: c.surface, borderTopColor: c.ink }]}>
          <Button
            title="Delete"
            variant="danger"
            icon={Trash2}
            disabled={selection.length === 0}
            onPress={() => removePages(selection)}
            style={styles.flex}
          />
          <Button
            title="Mark done"
            variant="ink"
            icon={CircleCheck}
            disabled={selection.length === 0}
            onPress={() => {
              selection.forEach(id => story.updatePage(id, { done: true }));
              setSelection(null);
            }}
            style={styles.flex}
          />
        </View>
      ) : (
        pages.length > 0 && <Fab icon={Plus} label="Page" onPress={() => addPage()} />
      )}
      <MenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={[
          { label: 'View script', icon: ScrollText, onPress: () => navigation.navigate('Script', { chapterId }) },
          listView
            ? { label: 'View: Grid', icon: LayoutGrid, onPress: () => setListView(false) }
            : { label: 'View: List', icon: List, onPress: () => setListView(true) },
          pages.length > 0 && { label: 'Select multiple', icon: ListChecks, onPress: () => setSelection([]) },
        ]}
      />
      <MenuSheet
        visible={!!menuPage}
        onClose={() => setPageMenu(null)}
        title={menuPage ? `Page ${menuIndex + 1}` : undefined}
        items={
          menuPage
            ? [
                {
                  label: menuPage.done ? 'Mark not done' : 'Mark done',
                  icon: CircleCheck,
                  onPress: () => story.updatePage(menuPage.id, { done: !menuPage.done }),
                },
                { label: 'Duplicate', icon: Copy, onPress: () => story.duplicatePage(menuPage.id) },
                { label: 'Insert page before', icon: SquarePlus, onPress: () => addPage(menuIndex) },
                { label: 'Insert page after', icon: SquarePlus, onPress: () => addPage(menuIndex + 1) },
                {
                  label: 'Move earlier',
                  icon: manga ? ArrowLeft : ArrowUp,
                  disabled: menuIndex <= 0,
                  onPress: () => story.movePage(chapterId, menuIndex, menuIndex - 1),
                },
                {
                  label: 'Move later',
                  icon: ArrowDown,
                  disabled: menuIndex >= chapter.pageIds.length - 1,
                  onPress: () => story.movePage(chapterId, menuIndex, menuIndex + 1),
                },
                menuPage.flag && { label: 'View flag note', icon: Flag, onPress: () => setFlagNote(menuPage.id) },
                menuPage.flag && {
                  label: 'Remove flag',
                  icon: Flag,
                  onPress: () => story.updatePage(menuPage.id, { flag: undefined }),
                },
                { label: 'Delete', icon: Trash2, destructive: true, onPress: () => removePages([menuPage.id]) },
              ]
            : []
        }
      />
      <Dialog
        visible={!!flagPage?.flag}
        onClose={() => setFlagNote(null)}
        title="Flag note"
        actions={[{ label: 'Close', onPress: () => setFlagNote(null) }]}
      >
        <Text style={[font.body, { color: c.text }]}>
          {[flagPage?.flag?.note, ...(flagPage?.flag?.reasons ?? [])].filter(Boolean).join('\n') || 'No note.'}
        </Text>
      </Dialog>
      <AutoPaginateSheet
        visible={paginating}
        scenes={scenes}
        skipBlockIds={usedBlockIds}
        firstPageNumber={pages.length + 1}
        onClose={() => setPaginating(false)}
        onApply={applyPlans}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stats: { paddingHorizontal: space.lg, paddingTop: space.md, gap: space.xs },
  cta: { paddingHorizontal: space.lg, paddingTop: space.md, alignItems: 'flex-start' },
  content: { padding: space.lg, paddingBottom: 96, gap: space.md },
  gridRow: { flexDirection: 'row', justifyContent: 'center' },
  rtlRow: { flexDirection: 'row-reverse' },
  listRow: {
    flexDirection: 'row',
    gap: space.md,
    paddingBottom: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listText: { flex: 1, gap: space.xs },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md },
  bulkBar: { flexDirection: 'row', gap: space.md, padding: space.md, borderTopWidth: 2 },
});
