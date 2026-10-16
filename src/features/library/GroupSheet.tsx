import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Dialog, Sheet } from '../../components/Sheet';
import { Check, FolderPlus, SquareCheck, SquareDashed, SquareMinus, Trash2 } from '../../components/icons';
import { Button, Divider, TextField, confirm, toast } from '../../components/ui';
import { useLibrary, type GroupChanges } from '../../store/useLibrary';
import { font, space, useTheme } from '../../theme';

export type CheckState = 'checked' | 'mixed' | 'unchecked';

const CHECK_ICONS = { checked: SquareCheck, mixed: SquareMinus, unchecked: SquareDashed };

export function GroupCheck({ label, state, onPress }: { label: string; state: CheckState; onPress: () => void }) {
  const { c } = useTheme();
  const Icon = CHECK_ICONS[state];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: state === 'mixed' ? 'mixed' : state === 'checked' }}
      android_ripple={{ color: c.border }}
      style={styles.check}
    >
      <Icon size={24} color={state === 'unchecked' ? c.muted : c.accent} />
      <Text numberOfLines={1} style={[font.body, styles.flex, { color: c.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function NewGroupField({
  value,
  onChangeText,
  onCreate,
}: {
  value: string;
  onChangeText: (value: string) => void;
  onCreate: () => void;
}) {
  return (
    <View style={styles.create}>
      <TextField
        value={value}
        onChangeText={onChangeText}
        placeholder="Tạo nhóm mới"
        icon={FolderPlus}
        style={styles.flex}
        returnKeyType="done"
        onSubmitEditing={onCreate}
      />
      <Button title="Tạo" small disabled={!value.trim()} onPress={onCreate} />
    </View>
  );
}

const nextState = (shown: CheckState, initial: CheckState): CheckState =>
  shown === 'checked' ? 'unchecked' : shown === 'unchecked' && initial === 'mixed' ? 'mixed' : 'checked';

export function GroupSheet({
  visible,
  onClose,
  keys,
  onApply,
}: {
  visible: boolean;
  onClose: () => void;
  keys: string[];
  onApply: (changes: GroupChanges) => void;
}) {
  const { c } = useTheme();
  const groups = useLibrary(s => s.groups);
  const bookmarks = useLibrary(s => s.bookmarks);
  const addGroup = useLibrary(s => s.addGroup);
  const [changes, setChanges] = useState<Record<string, boolean>>({});
  const [name, setName] = useState('');

  useEffect(() => {
    if (visible) {
      setName('');
      setChanges({});
    }
  }, [visible]);

  const initial = useMemo(() => {
    const states: Record<string, CheckState> = {};
    for (const group of groups) {
      const count = keys.filter(key => bookmarks[key]?.groups.includes(group)).length;
      states[group] = !count ? 'unchecked' : count === keys.length ? 'checked' : 'mixed';
    }
    return states;
  }, [groups, keys, bookmarks]);

  const shown = (group: string): CheckState =>
    group in changes ? (changes[group] ? 'checked' : 'unchecked') : initial[group];

  const cycle = (group: string) => {
    const next = nextState(shown(group), initial[group]);
    setChanges(current => {
      const updated = { ...current };
      if (next === initial[group]) {
        delete updated[group];
      } else {
        updated[group] = next === 'checked';
      }
      return updated;
    });
  };

  const create = () => {
    const value = name.trim();
    if (!value) {
      return;
    }
    addGroup(value);
    setChanges(current => ({ ...current, [value]: true }));
    setName('');
  };

  const apply = () => {
    const pending = name.trim();
    const add = Object.keys(changes).filter(group => changes[group]);
    const remove = Object.keys(changes).filter(group => !changes[group]);
    if (pending && !add.includes(pending)) {
      add.push(pending);
    }
    onClose();
    if (add.length || remove.length) {
      onApply({ add, remove });
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Đặt nhóm" subtitle={`Đã chọn ${keys.length} truyện`}>
      {groups.map(group => (
        <GroupCheck key={group} label={group} state={shown(group)} onPress={() => cycle(group)} />
      ))}
      {groups.length > 0 && <Divider />}
      <NewGroupField value={name} onChangeText={setName} onCreate={create} />
      <Text style={[font.caption, styles.note, { color: c.muted }]}>Chỉ áp dụng các nhóm bạn thay đổi.</Text>
      <View style={styles.actions}>
        <Button title="Huỷ" variant="secondary" onPress={onClose} style={styles.flex} />
        <Button title="Áp dụng" icon={Check} onPress={apply} style={styles.flex} />
      </View>
    </Sheet>
  );
}

export function NewGroupDialog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const addGroup = useLibrary(s => s.addGroup);
  const groups = useLibrary(s => s.groups);
  const [name, setName] = useState('');

  useEffect(() => {
    if (visible) {
      setName('');
    }
  }, [visible]);

  const save = () => {
    const value = name.trim();
    if (!value) {
      return;
    }
    if (groups.includes(value)) {
      toast('Nhóm này đã tồn tại');
      return;
    }
    addGroup(value);
    onClose();
  };

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title="Nhóm mới"
      message="Nhóm giúp bạn chia bookmark theo chủ đề, ví dụ “Đang đọc”, “Đọc sau”."
      actions={[
        { label: 'Huỷ', onPress: onClose },
        { label: 'Tạo', variant: 'primary', onPress: save, disabled: !name.trim() },
      ]}
    >
      <TextField value={name} onChangeText={setName} placeholder="Tên nhóm" autoFocus onSubmitEditing={save} />
    </Dialog>
  );
}

export function EditGroupDialog({
  group,
  onClose,
  onRemoved,
}: {
  group: string | null;
  onClose: () => void;
  onRemoved?: (group: string) => void;
}) {
  const renameGroup = useLibrary(s => s.renameGroup);
  const removeGroup = useLibrary(s => s.removeGroup);
  const groups = useLibrary(s => s.groups);
  const [name, setName] = useState('');

  useEffect(() => {
    setName(group ?? '');
  }, [group]);

  const save = () => {
    const value = name.trim();
    if (!group || !value) {
      return;
    }
    if (value !== group && groups.includes(value)) {
      toast('Đã có nhóm trùng tên');
      return;
    }
    renameGroup(group, value);
    onClose();
  };

  const remove = async () => {
    if (!group) {
      return;
    }
    const ok = await confirm('Xoá nhóm', `Xoá nhóm “${group}”? Truyện trong nhóm vẫn còn trong bookmark.`, {
      confirmText: 'Xoá',
      destructive: true,
    });
    if (ok) {
      removeGroup(group);
      onClose();
      onRemoved?.(group);
    }
  };

  return (
    <Dialog
      visible={group !== null}
      onClose={onClose}
      title="Sửa nhóm"
      actions={[
        { label: 'Huỷ', onPress: onClose },
        { label: 'Lưu', variant: 'primary', onPress: save, disabled: !name.trim() },
      ]}
    >
      <TextField value={name} onChangeText={setName} placeholder="Tên nhóm" onSubmitEditing={save} />
      <Button title="Xoá nhóm" icon={Trash2} variant="danger" small onPress={remove} style={styles.remove} />
    </Dialog>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  check: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48, paddingHorizontal: space.lg },
  create: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.lg },
  note: { paddingHorizontal: space.lg },
  actions: { flexDirection: 'row', gap: space.sm, padding: space.lg },
  remove: { alignSelf: 'flex-start' },
});
