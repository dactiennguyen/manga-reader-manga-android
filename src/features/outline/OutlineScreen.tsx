import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import type { ScreenProps } from '../../app/routes';
import { ComicCard, MenuSheet, PromptDialog, SpeechBubble } from '../../components/comic';
import type { MenuItem } from '../../components/comic';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Columns2,
  EllipsisVertical,
  FolderInput,
  List,
  Pencil,
  Plus,
  Share2,
  Trash2,
} from '../../components/icons';
import { Button, confirm, EmptyState, Header, IconButton, Screen, toast } from '../../components/ui';
import { CHAPTER_STATUS_LABEL, LIMITS } from '../../model/constants';
import { chapterIdsOf, chapterStatus } from '../../model/selectors';
import type { Act, ChapterStatus, ID } from '../../model/types';
import { useLastOpened, useProject } from '../../store/hooks';
import { useStory } from '../../store/useStory';
import { font, radius, space, useTheme } from '../../theme';
import { ChapterEditSheet } from './ChapterEditSheet';

function chapterCount(count: number): string {
  return `${count} ${count === 1 ? 'chapter' : 'chapters'}`;
}

type MenuState =
  | { kind: 'main' }
  | { kind: 'chapter'; chapterId: ID }
  | { kind: 'chapterToAct'; chapterId: ID }
  | { kind: 'act'; actId: ID }
  | { kind: 'removeAct'; actId: ID }
  | null;

export function OutlineScreen({ route }: ScreenProps<'Outline'>) {
  const { projectId } = route.params;
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const project = useProject(projectId);
  const chapters = useStory(s => s.chapters);
  const statuses = useStory(
    useShallow(s => {
      const out: Record<ID, ChapterStatus> = {};
      for (const id of chapterIdsOf(s.projects[projectId])) {
        out[id] = chapterStatus(s, id);
      }
      return out;
    }),
  );
  const [listMode, setListMode] = useState(false);
  const [menu, setMenu] = useState<MenuState>(null);
  const [editingId, setEditingId] = useState<ID | undefined>();
  const [renamingActId, setRenamingActId] = useState<ID | undefined>();
  const [logline, setLogline] = useState(project?.logline ?? '');
  useLastOpened(projectId, { screen: 'Outline' });

  const storedLogline = project?.logline;
  useEffect(() => {
    if (storedLogline !== undefined) {
      setLogline(storedLogline);
    }
  }, [storedLogline]);

  const numbers = useMemo(() => {
    const out: Record<ID, number> = {};
    chapterIdsOf(project).forEach((id, index) => {
      out[id] = index + 1;
    });
    return out;
  }, [project]);

  if (!project) {
    return (
      <Screen>
        <Header title="Outline" />
        <EmptyState title="Story not found" message="This story may have been deleted." />
      </Screen>
    );
  }

  const acts = project.acts;
  const story = useStory.getState();
  const total = chapterIdsOf(project).length;
  const columnWidth = Math.round(width * 0.85);
  const statusColor: Record<ChapterStatus, string> = {
    unwritten: c.border,
    writing: c.warning,
    drawing: c.accent,
    done: c.success,
  };
  const statusLabel: Record<ChapterStatus, string> = {
    unwritten: 'No script yet',
    writing: 'Script written',
    drawing: CHAPTER_STATUS_LABEL.drawing,
    done: 'Fully drawn',
  };

  const addChapter = (actId?: ID) => {
    const id = story.addChapter(projectId, { actId: actId ?? acts[0]?.id });
    setEditingId(id);
  };

  const saveLogline = () => {
    const value = logline.trim();
    if (value !== project.logline) {
      story.updateProject(projectId, { logline: value });
    }
  };

  const shareOutline = () => {
    const lines = [project.title.toUpperCase()];
    if (project.logline) {
      lines.push(project.logline);
    }
    for (const act of acts) {
      lines.push('', act.title.toUpperCase());
      for (const id of act.chapterIds) {
        const chapter = chapters[id];
        if (!chapter) {
          continue;
        }
        lines.push(`Chapter ${numbers[id]}. ${chapter.title}`);
        if (chapter.summary) {
          lines.push(`  ${chapter.summary}`);
        }
        if (chapter.goal) {
          lines.push(`  Goal: ${chapter.goal}`);
        }
      }
    }
    Share.share({ title: `${project.title} outline`, message: lines.join('\n') }).catch(() => toast('Sharing failed'));
  };

  const locate = (chapterId: ID) => {
    const actIndex = acts.findIndex(act => act.chapterIds.includes(chapterId));
    return { actIndex, act: acts[actIndex], index: acts[actIndex]?.chapterIds.indexOf(chapterId) ?? -1 };
  };

  const shiftChapter = (chapterId: ID, delta: -1 | 1) => {
    const { actIndex, act, index } = locate(chapterId);
    if (!act) {
      return;
    }
    const target = index + delta;
    if (target >= 0 && target < act.chapterIds.length) {
      story.moveChapter(chapterId, act.id, target);
      return;
    }
    const neighbor = acts[actIndex + delta];
    if (neighbor) {
      story.moveChapter(chapterId, neighbor.id, delta < 0 ? neighbor.chapterIds.length : 0);
      toast(`Moved to ${neighbor.title}`);
    }
  };

  const requestRemoveAct = async (act: Act) => {
    if (acts.length <= 1) {
      toast('A story needs at least one act');
      return;
    }
    if (act.chapterIds.length > 0) {
      setMenu({ kind: 'removeAct', actId: act.id });
      return;
    }
    if (
      await confirm(`Delete "${act.title}"?`, 'This act is empty.', { confirmText: 'Delete act', destructive: true })
    ) {
      story.removeAct(projectId, act.id);
    }
  };

  const menuItems = (): { title?: string; subtitle?: string; items: (MenuItem | false)[] } => {
    if (!menu) {
      return { items: [] };
    }
    if (menu.kind === 'main') {
      return {
        title: 'Outline',
        items: [
          {
            label: listMode ? 'View as board' : 'View as list',
            icon: listMode ? Columns2 : List,
            onPress: () => setListMode(value => !value),
          },
          { label: 'Export outline as text', icon: Share2, onPress: shareOutline },
        ],
      };
    }
    if (menu.kind === 'chapter') {
      const id = menu.chapterId;
      const { actIndex, act, index } = locate(id);
      const first = actIndex <= 0 && index <= 0;
      const last = actIndex === acts.length - 1 && act !== undefined && index === act.chapterIds.length - 1;
      return {
        title: `Chapter ${numbers[id] ?? ''}`,
        subtitle: chapters[id]?.title,
        items: [
          { label: 'Edit chapter', icon: Pencil, onPress: () => setEditingId(id) },
          { label: 'Move up', icon: ArrowUp, disabled: first, onPress: () => shiftChapter(id, -1) },
          { label: 'Move down', icon: ArrowDown, disabled: last, onPress: () => shiftChapter(id, 1) },
          acts.length > 1 && {
            label: 'Move to act…',
            icon: FolderInput,
            onPress: () => setTimeout(() => setMenu({ kind: 'chapterToAct', chapterId: id }), 250),
          },
        ],
      };
    }
    if (menu.kind === 'chapterToAct') {
      const id = menu.chapterId;
      const current = locate(id).act;
      return {
        title: 'Move to act',
        subtitle: chapters[id]?.title,
        items: acts
          .filter(act => act.id !== current?.id)
          .map(act => ({
            label: act.title,
            subtitle: chapterCount(act.chapterIds.length),
            onPress: () => story.moveChapter(id, act.id, act.chapterIds.length),
          })),
      };
    }
    const act = acts.find(item => item.id === menu.actId);
    if (!act) {
      return { items: [] };
    }
    const actIndex = acts.indexOf(act);
    if (menu.kind === 'removeAct') {
      return {
        title: `Delete "${act.title}"`,
        subtitle: `This act still has ${chapterCount(act.chapterIds.length)}. Which act should they move to?`,
        items: acts
          .filter(item => item.id !== act.id)
          .map(item => ({
            label: item.title,
            subtitle: chapterCount(item.chapterIds.length),
            onPress: () => {
              story.removeAct(projectId, act.id, item.id);
              toast(`Chapters moved to ${item.title}`);
            },
          })),
      };
    }
    return {
      title: act.title,
      subtitle: chapterCount(act.chapterIds.length),
      items: [
        { label: 'Rename', icon: Pencil, onPress: () => setTimeout(() => setRenamingActId(act.id), 250) },
        {
          label: 'Move left',
          icon: ArrowLeft,
          disabled: actIndex === 0,
          onPress: () => story.moveAct(projectId, act.id, -1),
        },
        {
          label: 'Move right',
          icon: ArrowRight,
          disabled: actIndex === acts.length - 1,
          onPress: () => story.moveAct(projectId, act.id, 1),
        },
        {
          label: 'Delete act',
          icon: Trash2,
          destructive: true,
          onPress: () => setTimeout(() => requestRemoveAct(act), 250),
        },
      ],
    };
  };

  const renderCard = (id: ID) => {
    const chapter = chapters[id];
    if (!chapter) {
      return null;
    }
    const status = statuses[id] ?? 'unwritten';
    return (
      <ComicCard
        key={id}
        onPress={() => setEditingId(id)}
        onLongPress={() => setMenu({ kind: 'chapter', chapterId: id })}
        contentStyle={styles.card}
      >
        <View style={styles.cardHead}>
          <View style={[styles.number, { backgroundColor: c.ink }]}>
            <Text style={[styles.numberText, { color: c.onInk }]}>{numbers[id]}</Text>
          </View>
          <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={2}>
            {chapter.title || 'Untitled'}
          </Text>
        </View>
        {chapter.summary ? (
          <Text style={[styles.summary, { color: c.textSecondary }]} numberOfLines={4}>
            {chapter.summary}
          </Text>
        ) : (
          <Text style={[styles.summary, { color: c.muted }]}>Tap to add a summary.</Text>
        )}
        {!!chapter.goal && (
          <Text style={[styles.goal, { color: c.muted }]} numberOfLines={2}>
            Goal: {chapter.goal}
          </Text>
        )}
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: statusColor[status], borderColor: c.ink }]} />
          <Text style={[styles.statusText, { color: c.muted }]}>{statusLabel[status]}</Text>
        </View>
      </ComicCard>
    );
  };

  const renderAct = (act: Act, board: boolean) => {
    const body = (
      <>
        {act.chapterIds.map(renderCard)}
        <Button title="Chapter" icon={Plus} variant="secondary" small onPress={() => addChapter(act.id)} />
      </>
    );
    return (
      <View
        key={act.id}
        style={[
          styles.column,
          { backgroundColor: c.surfaceAlt, borderColor: c.border },
          board && { width: columnWidth },
        ]}
      >
        <Pressable
          style={styles.actHead}
          onPress={() => setRenamingActId(act.id)}
          onLongPress={() => setMenu({ kind: 'act', actId: act.id })}
          accessibilityLabel={`Rename ${act.title}`}
        >
          <Text style={[styles.actTitle, { color: c.text }]} numberOfLines={1}>
            {act.title}
          </Text>
          <Text style={[styles.actCount, { color: c.muted }]}>{chapterCount(act.chapterIds.length)}</Text>
        </Pressable>
        {board ? (
          <ScrollView nestedScrollEnabled contentContainerStyle={styles.cards} showsVerticalScrollIndicator={false}>
            {body}
          </ScrollView>
        ) : (
          <View style={styles.cards}>{body}</View>
        )}
      </View>
    );
  };

  const addActButton = (board: boolean) => (
    <Pressable
      style={[styles.addAct, { borderColor: c.border }, board && styles.addActBoard]}
      onPress={() => story.addAct(projectId)}
    >
      <Plus size={20} color={c.textSecondary} />
      <Text style={[styles.addActText, { color: c.textSecondary }]}>Act</Text>
    </Pressable>
  );

  const current = menuItems();
  const renamingAct = acts.find(act => act.id === renamingActId);

  return (
    <Screen>
      <Header
        title="Outline"
        subtitle={project.title}
        right={
          <IconButton icon={EllipsisVertical} onPress={() => setMenu({ kind: 'main' })} accessibilityLabel="More" />
        }
      />
      <TextInput
        value={logline}
        onChangeText={setLogline}
        onBlur={saveLogline}
        onEndEditing={saveLogline}
        placeholder="Your story in one sentence…"
        placeholderTextColor={c.muted}
        maxLength={LIMITS.logline}
        multiline
        submitBehavior="blurAndSubmit"
        style={[styles.logline, { color: c.text, borderColor: c.border }]}
      />
      {total === 0 && (
        <View style={styles.empty}>
          <SpeechBubble>
            <Text style={[styles.emptyText, { color: c.text }]}>
              Not sure where to start? Add your first chapter and sum it up in one sentence.
            </Text>
          </SpeechBubble>
          <Button title="Add chapter" icon={Plus} onPress={() => addChapter()} style={styles.emptyButton} />
        </View>
      )}
      {listMode ? (
        <ScrollView style={styles.flex} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
          {acts.map(act => renderAct(act, false))}
          {addActButton(false)}
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.flex}
          horizontal
          snapToInterval={columnWidth + space.md}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.board}
        >
          {acts.map(act => renderAct(act, true))}
          {addActButton(true)}
        </ScrollView>
      )}
      <MenuSheet
        visible={menu !== null}
        onClose={() => setMenu(null)}
        title={current.title}
        subtitle={current.subtitle}
        items={current.items}
      />
      <PromptDialog
        visible={renamingAct !== undefined}
        onClose={() => setRenamingActId(undefined)}
        title="Rename act"
        initialValue={renamingAct?.title ?? ''}
        placeholder="Act title"
        maxLength={40}
        onSubmit={value => {
          if (renamingAct) {
            story.renameAct(projectId, renamingAct.id, value.trim());
          }
        }}
      />
      {editingId !== undefined && (
        <ChapterEditSheet
          chapterId={editingId}
          number={numbers[editingId] ?? 0}
          onClose={() => setEditingId(undefined)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  logline: {
    ...font.body,
    marginHorizontal: space.lg,
    marginBottom: space.sm,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
  },
  empty: { paddingHorizontal: space.lg, paddingVertical: space.md },
  emptyText: { ...font.hand },
  emptyButton: { marginTop: space.lg, alignSelf: 'flex-start' },
  board: { paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.md },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xl, gap: space.md },
  column: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  actHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  actTitle: { ...font.overline, fontSize: 15, flex: 1 },
  actCount: { ...font.caption },
  cards: { paddingHorizontal: space.md, paddingBottom: space.lg, gap: space.md },
  card: { padding: space.md, gap: space.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  number: {
    minWidth: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xs,
  },
  numberText: { ...font.overline, fontSize: 15 },
  cardTitle: { ...font.heading, flex: 1 },
  summary: { ...font.body, lineHeight: 21 },
  goal: { ...font.caption, fontStyle: 'italic' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1 },
  statusText: { ...font.caption },
  addAct: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space.xs,
    paddingVertical: space.lg,
  },
  addActBoard: { width: 120, alignSelf: 'flex-start', height: 120 },
  addActText: { ...font.overline },
});
