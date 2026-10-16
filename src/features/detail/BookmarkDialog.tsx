import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Sheet } from '../../components/Sheet';
import { BookmarkMinus, Check } from '../../components/icons';
import { Button, Divider, toast } from '../../components/ui';
import type { Chapter, ContentType } from '../../sources/types';
import { useLibrary } from '../../store/useLibrary';
import { font, space, useTheme } from '../../theme';
import { GroupCheck, NewGroupField } from '../library/GroupSheet';
import { countUnread } from '../library/updates';

export type BookmarkTarget = {
  key: string;
  sourceId: string;
  url: string;
  title: string;
  cover?: string;
  content: ContentType;
  nsfw?: boolean;
  chapters: Chapter[];
};

export function BookmarkDialog({
  visible,
  onClose,
  target,
}: {
  visible: boolean;
  onClose: () => void;
  target: BookmarkTarget;
}) {
  const { c } = useTheme();
  const bookmark = useLibrary(s => s.bookmarks[target.key]);
  const groups = useLibrary(s => s.groups);
  const [saved] = useState(() => !!bookmark);
  const [chosen, setChosen] = useState<string[]>(() => bookmark?.groups ?? []);
  const [newName, setNewName] = useState('');

  const toggleGroup = (name: string) =>
    setChosen(current => (current.includes(name) ? current.filter(g => g !== name) : [...current, name]));

  const createGroup = () => {
    const name = newName.trim();
    if (!name) {
      return;
    }
    useLibrary.getState().addGroup(name);
    setChosen(current => (current.includes(name) ? current : [...current, name]));
    setNewName('');
  };

  const save = () => {
    const names = groups.filter(g => chosen.includes(g));
    const pending = newName.trim();
    if (pending && !names.includes(pending)) {
      names.push(pending);
    }
    const label = names.map(name => `"${name}"`).join(', ');
    const library = useLibrary.getState();
    if (bookmark) {
      const changed = names.length !== bookmark.groups.length || names.some(g => !bookmark.groups.includes(g));
      if (changed) {
        library.setGroupsFor(target.key, names);
        toast(names.length ? `Đã lưu vào nhóm ${label}` : 'Đã bỏ khỏi nhóm');
      }
    } else {
      const { chapters } = target;
      library.addBookmark({
        key: target.key,
        sourceId: target.sourceId,
        url: target.url,
        title: target.title,
        cover: target.cover,
        content: target.content,
        nsfw: target.nsfw || undefined,
        groups: names,
        chapterCount: chapters.length,
        latestChapter: chapters[0]?.name,
        unread: countUnread(target.key, chapters),
      });
      toast(names.length ? `Đã lưu vào nhóm ${label}` : 'Đã thêm vào bookmark');
    }
    onClose();
  };

  const remove = () => {
    useLibrary.getState().removeBookmarks([target.key]);
    toast('Đã bỏ khỏi bookmark');
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={saved ? 'Đã lưu trong bookmark' : 'Thêm vào bookmark'}
      subtitle={target.title}
    >
      <Text style={[font.overline, styles.label, { color: c.muted }]}>Nhóm bookmark</Text>
      {groups.map(name => (
        <GroupCheck
          key={name}
          label={name}
          state={chosen.includes(name) ? 'checked' : 'unchecked'}
          onPress={() => toggleGroup(name)}
        />
      ))}
      <NewGroupField value={newName} onChangeText={setNewName} onCreate={createGroup} />

      <Text style={[font.caption, styles.note, { color: c.muted }]}>
        Có thể chọn nhiều nhóm. Truyện đã bookmark sẽ được tự kiểm tra chương mới.
      </Text>

      <View style={styles.actions}>
        <Button title="Huỷ" variant="secondary" onPress={onClose} style={styles.flex} />
        <Button title={saved ? 'Lưu thay đổi' : 'Lưu'} icon={Check} onPress={save} style={styles.flex} />
      </View>
      {saved && (
        <>
          <Divider />
          <View style={styles.removeWrap}>
            <Button title="Bỏ khỏi bookmark" icon={BookmarkMinus} variant="danger" onPress={remove} />
          </View>
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  label: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.xs },
  note: { paddingHorizontal: space.lg },
  actions: { flexDirection: 'row', gap: space.sm, padding: space.lg },
  removeWrap: { padding: space.lg },
});
