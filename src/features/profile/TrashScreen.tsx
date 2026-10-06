import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Cover } from '../../components/comic';
import { ArchiveRestore, Trash } from '../../components/icons';
import { Button, confirm, EmptyState, Header, IconButton, Screen, toast } from '../../components/ui';
import { plural } from '../../lib/format';
import { DAY_MS } from '../../lib/time';
import { LIMITS } from '../../model/constants';
import type { Project } from '../../model/types';
import { useStory } from '../../store/useStory';
import { font, radius, space, useTheme } from '../../theme';

function daysLeft(project: Project, now: number): number {
  const expiresAt = (project.deletedAt ?? now) + LIMITS.trashDays * DAY_MS;
  return Math.max(0, Math.ceil((expiresAt - now) / DAY_MS));
}

export function TrashScreen() {
  const { c } = useTheme();
  const projects = useStory(s => s.projects);
  const items = useMemo(
    () =>
      Object.values(projects)
        .filter(project => !!project.deletedAt)
        .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0)),
    [projects],
  );
  const now = Date.now();

  const onRestore = (project: Project) => {
    useStory.getState().restoreProject(project.id);
    toast(`Restored "${project.title}"`);
  };

  const onDelete = async (project: Project) => {
    const ok = await confirm(
      `Delete "${project.title}" forever?`,
      'The story and all of its pages and images will be gone for good.',
      {
        confirmText: 'Delete forever',
        destructive: true,
      },
    );
    if (ok) {
      useStory.getState().deleteProjectForever(project.id);
    }
  };

  const onDeleteAll = async () => {
    const ok = await confirm(
      `Delete ${plural(items.length, 'story', 'stories')} in the trash forever?`,
      'This cannot be undone.',
      {
        confirmText: 'Delete all',
        destructive: true,
      },
    );
    if (ok) {
      const { deleteProjectForever } = useStory.getState();
      items.forEach(project => deleteProjectForever(project.id));
      toast('Trash emptied');
    }
  };

  return (
    <Screen>
      <Header
        title="Trash"
        right={
          items.length > 0 ? (
            <IconButton icon={Trash} color={c.onAppBar} onPress={onDeleteAll} accessibilityLabel="Delete all" />
          ) : undefined
        }
      />
      <FlatList
        data={items}
        keyExtractor={project => project.id}
        contentContainerStyle={items.length === 0 ? styles.emptyWrap : styles.list}
        ListHeaderComponent={
          items.length > 0 ? (
            <Text style={[font.caption, styles.note, { color: c.muted }]}>
              Stories in the trash are deleted forever after {LIMITS.trashDays} days.
            </Text>
          ) : undefined
        }
        ListEmptyComponent={
          <EmptyState
            icon={Trash}
            title="Trash is empty"
            message={`Stories you delete stay here for ${LIMITS.trashDays} days before they are gone for good.`}
          />
        }
        renderItem={({ item }) => {
          const left = daysLeft(item, now);
          return (
            <View style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Cover project={item} width={56} />
              <View style={styles.flex}>
                <Text numberOfLines={2} style={[font.heading, { color: c.text }]}>
                  {item.title}
                </Text>
                <Text style={[font.caption, styles.days, { color: left <= 3 ? c.danger : c.muted }]}>
                  {left > 1 ? `${left} days left` : left === 1 ? '1 day left' : 'Will be deleted today'}
                </Text>
                <View style={styles.actions}>
                  <Button
                    title="Restore"
                    icon={ArchiveRestore}
                    variant="secondary"
                    small
                    onPress={() => onRestore(item)}
                  />
                  <Button title="Delete forever" variant="danger" small onPress={() => onDelete(item)} />
                </View>
              </View>
            </View>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: space.lg, gap: space.md },
  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
  note: { marginBottom: space.xs },
  row: { flexDirection: 'row', gap: space.md, padding: space.md, borderWidth: 1, borderRadius: radius.md },
  days: { marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
});
