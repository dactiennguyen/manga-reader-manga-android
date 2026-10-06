import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppNavigation } from '../../app/routes';
import { MenuSheet, PromptDialog, SpeechBubble, Tag, type MenuItem } from '../../components/comic';
import { ArrowDown, ArrowUp, Copy, ListOrdered, Pencil, Plus, Trash } from '../../components/icons';
import { Button, ProgressBar, toast } from '../../components/ui';
import { CHAPTER_STATUS_LABEL, LIMITS } from '../../model/constants';
import { chapterProgress, chapterStatus, scriptOutdated } from '../../model/selectors';
import type { ID, Project } from '../../model/types';
import { useStory, type StoryData } from '../../store/useStory';
import { font, radius, space, useTheme } from '../../theme';

export function ChaptersTab({ state, project }: { state: StoryData; project: Project }) {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const [menuId, setMenuId] = useState<ID | null>(null);
  const [renameId, setRenameId] = useState<ID | null>(null);
  const [deleteId, setDeleteId] = useState<ID | null>(null);

  const acts = project.acts;
  const total = acts.reduce((sum, act) => sum + act.chapterIds.length, 0);
  const nameOf = (chapterId: ID, number: number) => state.chapters[chapterId]?.title.trim() || `Chapter ${number}`;
  const numberOf = (chapterId: ID) => acts.flatMap(act => act.chapterIds).indexOf(chapterId) + 1;

  const move = (chapterId: ID, delta: -1 | 1) => {
    const actIndex = acts.findIndex(act => act.chapterIds.includes(chapterId));
    const act = acts[actIndex];
    if (!act) {
      return;
    }
    const index = act.chapterIds.indexOf(chapterId);
    const target = index + delta;
    const story = useStory.getState();
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

  const addChapter = () => {
    const lastUsed = [...acts].reverse().find(act => act.chapterIds.length > 0) ?? acts[0];
    useStory.getState().addChapter(project.id, { actId: lastUsed?.id });
  };

  const flat = acts.flatMap(act => act.chapterIds);
  const menuNumber = menuId ? numberOf(menuId) : 0;
  const menuItems: MenuItem[] = menuId
    ? [
        { label: 'Rename', icon: Pencil, onPress: () => setRenameId(menuId) },
        { label: 'Move up', icon: ArrowUp, disabled: flat[0] === menuId, onPress: () => move(menuId, -1) },
        {
          label: 'Move down',
          icon: ArrowDown,
          disabled: flat[flat.length - 1] === menuId && acts[acts.length - 1]?.chapterIds.includes(menuId),
          onPress: () => move(menuId, 1),
        },
        {
          label: 'Duplicate',
          icon: Copy,
          onPress: () => {
            if (useStory.getState().duplicateChapter(menuId)) {
              toast('Chapter duplicated');
            }
          },
        },
        { label: 'Delete', icon: Trash, destructive: true, onPress: () => setDeleteId(menuId) },
      ]
    : [];
  const deleteName = deleteId ? nameOf(deleteId, numberOf(deleteId)) : '';

  return (
    <View style={styles.wrap}>
      <View style={styles.actions}>
        <Button
          title="Outline"
          icon={ListOrdered}
          variant="secondary"
          small
          onPress={() => navigation.navigate('Outline', { projectId: project.id })}
        />
        <Button title="Add chapter" icon={Plus} variant="ink" small onPress={addChapter} />
      </View>

      {total === 0 && <SpeechBubble tail="bottom-left">No chapters yet. Add the first one!</SpeechBubble>}

      {acts.map(act =>
        act.chapterIds.length === 0 ? null : (
          <View key={act.id} style={styles.act}>
            <Text style={[font.overline, { color: c.muted }]}>{act.title}</Text>
            {act.chapterIds.map(chapterId => {
              const chapter = state.chapters[chapterId];
              if (!chapter) {
                return null;
              }
              const number = numberOf(chapterId);
              const status = chapterStatus(state, chapterId);
              const progress = chapterProgress(state, chapterId);
              const hasPages = chapter.pageIds.length > 0;
              return (
                <Pressable
                  key={chapterId}
                  onPress={() =>
                    hasPages
                      ? navigation.navigate('Storyboard', { chapterId })
                      : navigation.navigate('Script', { chapterId })
                  }
                  onLongPress={() => setMenuId(chapterId)}
                  style={[styles.row, { borderColor: c.ink, backgroundColor: c.surface }]}
                >
                  <View style={styles.rowTop}>
                    <View style={[styles.number, { backgroundColor: c.ink }]}>
                      <Text style={[font.overline, { color: c.onInk }]}>{number}</Text>
                    </View>
                    <Text numberOfLines={1} style={[font.heading, styles.flex, { color: c.text }]}>
                      {nameOf(chapterId, number)}
                    </Text>
                    <Tag
                      label={CHAPTER_STATUS_LABEL[status]}
                      color={status === 'done' ? c.successSoft : undefined}
                      textColor={status === 'done' ? c.success : undefined}
                    />
                  </View>
                  {scriptOutdated(chapter) && (
                    <View style={styles.outdated}>
                      <View style={[styles.dot, { backgroundColor: c.warning }]} />
                      <Text style={[font.caption, { color: c.warning }]}>Script changed</Text>
                    </View>
                  )}
                  {hasPages && (
                    <View style={styles.progress}>
                      <View style={styles.flex}>
                        <ProgressBar value={progress.total ? progress.done / progress.total : 0} />
                      </View>
                      <Text style={[font.caption, { color: c.muted }]}>
                        {progress.done}/{progress.total} pages
                      </Text>
                    </View>
                  )}
                  <View style={styles.shortcuts}>
                    <Button
                      title="Script"
                      variant="ghost"
                      small
                      onPress={() => navigation.navigate('Script', { chapterId })}
                    />
                    <Button
                      title="Storyboard"
                      variant="ghost"
                      small
                      onPress={() => navigation.navigate('Storyboard', { chapterId })}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        ),
      )}

      <MenuSheet
        visible={!!menuId}
        onClose={() => setMenuId(null)}
        title={menuId ? nameOf(menuId, menuNumber) : undefined}
        items={menuItems}
      />
      <PromptDialog
        visible={!!renameId}
        onClose={() => setRenameId(null)}
        title="Rename chapter"
        initialValue={renameId ? state.chapters[renameId]?.title ?? '' : ''}
        placeholder="Chapter title"
        maxLength={LIMITS.chapterTitle}
        onSubmit={value => {
          if (renameId && value.trim()) {
            useStory.getState().updateChapter(renameId, { title: value.trim() });
          }
        }}
      />
      <PromptDialog
        visible={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete chapter?"
        message={`The script and all pages of this chapter will be permanently deleted. Type "${deleteName}" to confirm.`}
        placeholder={deleteName}
        confirmText="Delete"
        onSubmit={value => {
          if (!deleteId) {
            return;
          }
          if (value.trim().toLocaleLowerCase('vi') !== deleteName.toLocaleLowerCase('vi')) {
            toast('Chapter title does not match. Nothing was deleted');
            return;
          }
          useStory.getState().removeChapter(deleteId);
          toast('Chapter deleted');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { gap: space.md },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  act: { gap: space.sm },
  row: { borderWidth: 2, borderRadius: radius.md, padding: space.md, gap: space.sm },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  number: { minWidth: 28, height: 28, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  outdated: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  shortcuts: { flexDirection: 'row', gap: space.sm },
});
