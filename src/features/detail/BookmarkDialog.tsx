import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Sheet } from '../../components/Sheet';
import { BookmarkMinus, Check } from '../../components/icons';
import { Button, Divider, Radio, TextField, toast } from '../../components/ui';
import type { Chapter, ContentType } from '../../sources/types';
import { useLibrary } from '../../store/useLibrary';
import { font, space, useTheme } from '../../theme';
import { countUnread } from '../library/updates';

const NEW_GROUP = '\u0000new';

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
  const [group, setGroup] = useState(() => bookmark?.group ?? '');
  const [newName, setNewName] = useState('');

  const resolveGroup = (): string | undefined => {
    if (group !== NEW_GROUP) {
      return group;
    }
    const name = newName.trim();
    if (!name) {
      toast('Nhập tên nhóm mới.');
      return undefined;
    }
    return name;
  };

  const save = () => {
    const chosen = resolveGroup();
    if (chosen === undefined) {
      return;
    }
    const library = useLibrary.getState();
    if (bookmark) {
      if (chosen !== bookmark.group) {
        library.setGroup([target.key], chosen);
        toast(chosen ? `Đã chuyển sang nhóm "${chosen}"` : 'Đã bỏ khỏi nhóm');
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
        group: chosen,
        chapterCount: chapters.length,
        latestChapter: chapters[0]?.name,
        unread: countUnread(target.key, chapters),
      });
      toast(chosen ? `Đã lưu vào nhóm "${chosen}"` : 'Đã thêm vào bookmark');
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
      <Radio selected={group === ''} label="Không nhóm" onPress={() => setGroup('')} />
      {groups.map(name => (
        <Radio key={name} selected={group === name} label={name} onPress={() => setGroup(name)} />
      ))}
      <Radio selected={group === NEW_GROUP} label="Tạo nhóm mới" onPress={() => setGroup(NEW_GROUP)} />
      {group === NEW_GROUP && (
        <TextField
          value={newName}
          onChangeText={setNewName}
          placeholder="Tên nhóm, ví dụ: Đang theo dõi"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={save}
          style={styles.newGroup}
        />
      )}

      <Text style={[font.caption, styles.note, { color: c.muted }]}>
        Truyện đã bookmark sẽ được tự kiểm tra chương mới.
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
  newGroup: { marginHorizontal: space.lg, marginBottom: space.sm },
  note: { paddingHorizontal: space.lg, paddingTop: space.sm },
  actions: { flexDirection: 'row', gap: space.sm, padding: space.lg },
  removeWrap: { padding: space.lg },
});
