import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Dialog, Sheet } from '../../components/Sheet';
import { FolderPlus, Trash2 } from '../../components/icons';
import { Button, Divider, Radio, TextField, confirm, toast } from '../../components/ui';
import { useLibrary } from '../../store/useLibrary';
import { space } from '../../theme';

/** Chọn (hoặc tạo) nhóm để chuyển các bookmark đã chọn vào. */
export function GroupSheet({
  visible,
  onClose,
  current,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  /** Nhóm chung của các mục đang chọn, undefined nếu khác nhau. */
  current?: string;
  onSelect: (group: string) => void;
}) {
  const groups = useLibrary(s => s.groups);
  const [name, setName] = useState('');

  useEffect(() => {
    if (visible) {
      setName('');
    }
  }, [visible]);

  const choose = (group: string) => {
    onClose();
    onSelect(group);
  };

  const create = () => {
    const value = name.trim();
    if (!value) {
      return;
    }
    choose(value);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Chuyển nhóm" subtitle="Chọn nhóm bookmark">
      <Radio label="Không nhóm" selected={current === ''} onPress={() => choose('')} />
      {groups.map(group => (
        <Radio key={group} label={group} selected={current === group} onPress={() => choose(group)} />
      ))}
      <Divider />
      <View style={styles.create}>
        <TextField
          value={name}
          onChangeText={setName}
          placeholder="Tên nhóm mới"
          icon={FolderPlus}
          style={styles.flex}
          returnKeyType="done"
          onSubmitEditing={create}
        />
        <Button title="Tạo" small disabled={!name.trim()} onPress={create} />
      </View>
    </Sheet>
  );
}

/** Tạo nhóm mới (chip "+ Nhóm mới"). */
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

/** Đổi tên / xoá nhóm (nhấn giữ chip nhóm). */
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
    const ok = await confirm('Xoá nhóm', `Xoá nhóm “${group}”? Truyện trong nhóm sẽ chuyển về Không nhóm.`, {
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
  create: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.lg },
  remove: { alignSelf: 'flex-start' },
});
