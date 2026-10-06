import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Banner, MenuSheet, SectionTitle } from '../../components/comic';
import { ImagePlus, Lock, LockOpen, Plus, Trash2 } from '../../components/icons';
import { Button, confirm, toast } from '../../components/ui';
import { EXPRESSION_LABEL, EXPRESSIONS, LIMITS } from '../../model/constants';
import type { Character, CharacterSheet, Expression } from '../../model/types';
import { fileUri, pickImage } from '../../lib/files';
import { useStory } from '../../store/useStory';
import { font, radius, space, useTheme } from '../../theme';
import { AutoField, ImageViewer } from './fields';

type Slot = 'face' | 'body' | Expression;

function slotLabel(slot: Slot): string {
  if (slot === 'face') {
    return 'Face';
  }
  if (slot === 'body') {
    return 'Full body';
  }
  return EXPRESSION_LABEL[slot];
}

function slotPath(sheet: CharacterSheet, slot: Slot): string | undefined {
  if (slot === 'face' || slot === 'body') {
    return sheet[slot];
  }
  return sheet.expressions[slot];
}

function withSlot(sheet: CharacterSheet, slot: Slot, path: string | undefined): CharacterSheet {
  if (slot === 'face' || slot === 'body') {
    return { ...sheet, [slot]: path };
  }
  const expressions = { ...sheet.expressions };
  if (path) {
    expressions[slot] = path;
  } else {
    delete expressions[slot];
  }
  return { ...sheet, expressions };
}

function SheetSlot({
  label,
  path,
  small,
  locked,
  onPress,
  onLongPress,
}: {
  label: string;
  path: string | undefined;
  small?: boolean;
  locked: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <View style={small ? styles.smallSlot : styles.bigSlot}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityLabel={path ? `View ${label} image` : `Upload ${label} image`}
        style={[
          styles.slotFrame,
          small ? styles.smallFrame : styles.bigFrame,
          { borderColor: c.ink, backgroundColor: c.surfaceAlt },
          !path && styles.slotEmpty,
        ]}
      >
        {path ? (
          <Image source={{ uri: fileUri(path) }} style={styles.slotImage} resizeMode="cover" />
        ) : locked ? (
          <Lock size={small ? 16 : 22} color={c.muted} />
        ) : (
          <Plus size={small ? 20 : 28} color={c.muted} />
        )}
      </Pressable>
      <Text
        style={[small ? font.caption : font.overline, styles.slotLabel, { color: c.textSecondary }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

export function DesignTab({ character }: { character: Character }) {
  const { c } = useTheme();
  const update = useStory(s => s.updateCharacter);
  const [menuSlot, setMenuSlot] = useState<Slot | null>(null);
  const [viewSlot, setViewSlot] = useState<Slot | null>(null);
  const { sheet, locked } = character;
  const canLock = !!sheet.face && !!sheet.body;
  const displayName = character.name.trim() || 'this character';

  const upload = async (slot: Slot) => {
    try {
      const path = await pickImage();
      if (!path) {
        return;
      }
      const current = useStory.getState().characters[character.id];
      if (current) {
        update(character.id, { sheet: withSlot(current.sheet, slot, path) });
      }
    } catch {
      toast('Could not load the image');
    }
  };

  const clear = async (slot: Slot) => {
    const ok = await confirm(`Delete the ${slotLabel(slot)} image?`, undefined, {
      confirmText: 'Delete',
      destructive: true,
    });
    if (!ok) {
      return;
    }
    const current = useStory.getState().characters[character.id];
    if (current) {
      update(character.id, { sheet: withSlot(current.sheet, slot, undefined) });
    }
  };

  const pressSlot = (slot: Slot) => {
    if (slotPath(sheet, slot)) {
      setViewSlot(slot);
    } else if (locked) {
      toast('Unlock to edit the design sheet');
    } else {
      upload(slot);
    }
  };

  const longPressSlot = (slot: Slot) => {
    if (locked) {
      toast('Unlock to edit the design sheet');
    } else if (slotPath(sheet, slot)) {
      setMenuSlot(slot);
    } else {
      upload(slot);
    }
  };

  const lock = async () => {
    const ok = await confirm(
      'Lock as reference?',
      `These images become the reference for ${displayName}: look at them while drawing to keep the character consistent. While locked, the appearance and design sheet cannot be edited.`,
      { confirmText: 'Lock' },
    );
    if (ok) {
      update(character.id, { locked: true });
    }
  };

  const renderSlot = (slot: Slot, small?: boolean) => (
    <SheetSlot
      key={slot}
      label={slotLabel(slot)}
      path={slotPath(sheet, slot)}
      small={small}
      locked={locked}
      onPress={() => pressSlot(slot)}
      onLongPress={() => longPressSlot(slot)}
    />
  );

  return (
    <View>
      {locked && (
        <Banner tone="info" icon={Lock} text="Locked as reference. Unlock to edit the appearance and images." />
      )}
      <Pressable onPress={locked ? () => toast('Unlock to edit the appearance') : undefined} disabled={!locked}>
        <View pointerEvents={locked ? 'none' : 'auto'}>
          <AutoField
            label="Appearance"
            value={character.appearance}
            onCommit={appearance => update(character.id, { appearance })}
            placeholder="Short messy black hair, big eyes, orange delivery jacket…"
            hint="Worth covering: hair, eyes, build, outfit, distinguishing features."
            multiline
            maxLength={LIMITS.appearance}
            showCount
            editable={!locked}
            minHeight={110}
          />
        </View>
      </Pressable>

      <SectionTitle>Design sheet</SectionTitle>
      <View style={styles.bigRow}>
        {renderSlot('face')}
        {renderSlot('body')}
      </View>

      <SectionTitle style={styles.expressionsTitle}>Expressions</SectionTitle>
      <View style={styles.smallGrid}>{EXPRESSIONS.map(expression => renderSlot(expression, true))}</View>

      <Text style={[font.caption, styles.note, { color: c.muted }]}>
        Tap an empty slot to upload an image from your device; long-press a filled slot to replace or delete it.
        Reference images are what you look at while drawing so the character stays the same in every panel.
      </Text>

      {locked ? (
        <Button
          title="Unlock to edit"
          icon={LockOpen}
          variant="secondary"
          onPress={() => update(character.id, { locked: false })}
        />
      ) : (
        <Button title="Lock as reference" icon={Lock} variant="ink" disabled={!canLock} onPress={lock} />
      )}
      {!locked && !canLock && (
        <Text style={[font.caption, styles.lockHint, { color: c.muted }]}>
          Add Face and Full body images to lock them as reference.
        </Text>
      )}

      <MenuSheet
        visible={!!menuSlot}
        onClose={() => setMenuSlot(null)}
        title={menuSlot ? slotLabel(menuSlot) : undefined}
        items={[
          {
            label: 'Replace image',
            icon: ImagePlus,
            onPress: () => {
              const slot = menuSlot;
              setMenuSlot(null);
              if (slot) {
                upload(slot);
              }
            },
          },
          {
            label: 'Delete image',
            icon: Trash2,
            destructive: true,
            onPress: () => {
              const slot = menuSlot;
              setMenuSlot(null);
              if (slot) {
                clear(slot);
              }
            },
          },
        ]}
      />
      <ImageViewer
        path={viewSlot ? slotPath(sheet, viewSlot) : null}
        title={viewSlot ? `${displayName} · ${slotLabel(viewSlot)}` : undefined}
        onClose={() => setViewSlot(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bigRow: { flexDirection: 'row', gap: space.md },
  bigSlot: { flex: 1 },
  smallGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  smallSlot: { width: '31%', flexGrow: 1 },
  slotFrame: {
    borderWidth: 2,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotEmpty: { borderStyle: 'dashed' },
  bigFrame: { aspectRatio: 3 / 4 },
  smallFrame: { aspectRatio: 1 },
  slotImage: { width: '100%', height: '100%' },
  slotLabel: { marginTop: space.xs, textAlign: 'center' },
  expressionsTitle: { marginTop: space.lg },
  note: { marginTop: space.lg, marginBottom: space.lg, lineHeight: 18 },
  lockHint: { marginTop: space.sm, textAlign: 'center' },
});
