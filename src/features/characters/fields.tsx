import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { X } from '../../components/icons';
import { FieldLabel, TextField } from '../../components/ui';
import { fileUri } from '../../lib/files';
import { font, radius, space, useTheme } from '../../theme';

export function useDraft(value: string, commit: (value: string) => void, delay = 600) {
  const [text, setText] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<string | null>(null);
  const commitRef = useRef(commit);

  useEffect(() => {
    commitRef.current = commit;
  }, [commit]);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (pending.current !== null) {
      const next = pending.current;
      pending.current = null;
      commitRef.current(next);
    }
  }, []);

  const onChangeText = useCallback(
    (next: string) => {
      setText(next);
      pending.current = next;
      if (timer.current) {
        clearTimeout(timer.current);
      }
      timer.current = setTimeout(flush, delay);
    },
    [flush, delay],
  );

  useEffect(() => flush, [flush]);

  return { text, onChangeText, onBlur: flush, setText };
}

export function AutoField({
  label,
  value,
  onCommit,
  hint,
  multiline,
  maxLength,
  showCount,
  editable = true,
  minHeight = 96,
  ...props
}: Omit<TextInputProps, 'value' | 'onChangeText' | 'onBlur' | 'style'> & {
  label?: string;
  value: string;
  onCommit: (value: string) => void;
  hint?: string;
  showCount?: boolean;
  minHeight?: number;
}) {
  const { c } = useTheme();
  const draft = useDraft(value, onCommit);
  return (
    <View style={styles.fieldBlock}>
      {!!label && <FieldLabel>{label}</FieldLabel>}
      <TextField
        {...props}
        value={draft.text}
        onChangeText={draft.onChangeText}
        onBlur={draft.onBlur}
        multiline={multiline}
        maxLength={maxLength}
        editable={editable}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[multiline && styles.multiline, multiline && { minHeight }, !editable && styles.readOnly]}
        inputStyle={multiline ? [styles.multilineInput, { minHeight: minHeight - space.md * 2 }] : undefined}
      />
      {(!!hint || (showCount && !!maxLength)) && (
        <View style={styles.hintRow}>
          <Text style={[font.caption, styles.hint, { color: c.muted }]}>{hint ?? ''}</Text>
          {showCount && !!maxLength && (
            <Text style={[font.caption, { color: draft.text.length >= maxLength ? c.danger : c.muted }]}>
              {draft.text.length}/{maxLength}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

export function ImageViewer({
  path,
  title,
  onClose,
}: {
  path: string | null | undefined;
  title?: string;
  onClose: () => void;
}) {
  const { c } = useTheme();
  const { width, height } = useWindowDimensions();
  return (
    <Modal visible={!!path} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.viewer, { backgroundColor: c.toolbar }]}>
        {!!path && (
          <ScrollView
            maximumZoomScale={4}
            minimumZoomScale={1}
            centerContent
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.viewerContent}
          >
            <Pressable onPress={onClose}>
              <Image source={{ uri: fileUri(path) }} style={{ width, height }} resizeMode="contain" />
            </Pressable>
          </ScrollView>
        )}
        <View style={styles.viewerBar}>
          <Text style={[font.overline, styles.viewerTitle, { color: c.onToolbar }]} numberOfLines={1}>
            {title ?? ''}
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityLabel="Close"
            style={[styles.viewerClose, { backgroundColor: c.toolbarAlt }]}
          >
            <X size={22} color={c.onToolbar} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fieldBlock: { marginBottom: space.lg },
  multiline: { alignItems: 'flex-start', paddingVertical: space.sm },
  multilineInput: { textAlignVertical: 'top' },
  readOnly: { opacity: 0.6 },
  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, marginTop: space.xs },
  hint: { flex: 1 },
  viewer: { flex: 1 },
  viewerContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  viewerBar: {
    position: 'absolute',
    top: space.xl + space.lg,
    left: space.lg,
    right: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  viewerTitle: { flex: 1 },
  viewerClose: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
