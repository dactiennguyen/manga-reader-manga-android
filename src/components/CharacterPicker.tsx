import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ROLE_LABEL } from '../model/constants';
import type { ID } from '../model/types';
import { useCharacters } from '../store/hooks';
import { useStory } from '../store/useStory';
import { font, space, useTheme } from '../theme';
import { Avatar } from './comic';
import { Lock, Plus, UserPlus } from './icons';
import { Sheet } from './Sheet';
import { Button, ListItem, SearchField, TextField } from './ui';

export function CharacterPicker({
  visible,
  onClose,
  projectId,
  onPick,
  selectedIds = [],
  excludeIds = [],
  title = 'Chọn nhân vật',
  allowClear,
  allowCreate = true,
}: {
  visible: boolean;
  onClose: () => void;
  projectId: ID;
  onPick: (characterId: ID | undefined) => void;
  selectedIds?: ID[];
  excludeIds?: ID[];
  title?: string;
  allowClear?: boolean;
  allowCreate?: boolean;
}) {
  const { c } = useTheme();
  const characters = useCharacters(projectId);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const needle = query.trim().toLowerCase();
  const shown = characters.filter(
    character => !excludeIds.includes(character.id) && (!needle || character.name.toLowerCase().includes(needle)),
  );

  const close = () => {
    setQuery('');
    setCreating(false);
    setName('');
    onClose();
  };

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    const id = useStory.getState().addCharacter(projectId, { name: trimmed });
    close();
    onPick(id);
  };

  return (
    <Sheet visible={visible} onClose={close} title={title}>
      <View style={styles.body}>
        {characters.length > 5 && (
          <SearchField value={query} onChangeText={setQuery} placeholder="Tìm nhân vật" onClear={() => setQuery('')} />
        )}
        {!shown.length && !creating && (
          <Text style={[font.body, styles.empty, { color: c.muted }]}>
            {characters.length ? 'Không có nhân vật nào khớp.' : 'Truyện chưa có nhân vật nào.'}
          </Text>
        )}
      </View>
      {allowClear && (
        <ListItem
          title="Không gán nhân vật"
          onPress={() => {
            close();
            onPick(undefined);
          }}
        />
      )}
      {shown.map(character => (
        <ListItem
          key={character.id}
          title={character.name || 'Chưa đặt tên'}
          subtitle={ROLE_LABEL[character.role]}
          left={<Avatar character={character} size={40} />}
          selected={selectedIds.includes(character.id)}
          right={character.locked ? <Lock size={16} color={c.muted} /> : undefined}
          onPress={() => {
            close();
            onPick(character.id);
          }}
        />
      ))}
      {allowCreate &&
        (creating ? (
          <View style={styles.createRow}>
            <TextField
              autoFocus
              value={name}
              onChangeText={setName}
              placeholder="Tên nhân vật mới"
              maxLength={30}
              onSubmitEditing={create}
              style={styles.flex}
            />
            <Button title="Tạo" icon={Plus} small onPress={create} disabled={!name.trim()} />
          </View>
        ) : (
          <ListItem title="Tạo nhanh nhân vật mới" icon={UserPlus} onPress={() => setCreating(true)} />
        ))}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: space.lg, gap: space.sm },
  empty: { paddingVertical: space.md },
  createRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
});
