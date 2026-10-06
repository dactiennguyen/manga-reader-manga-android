import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

import { PageView } from '../../components/PageView';
import { Sheet } from '../../components/Sheet';
import { ComicCard } from '../../components/comic';
import { Flag } from '../../components/icons';
import { Button, Chip, TextField, confirm } from '../../components/ui';
import type { ID, PageFlag } from '../../model/types';
import { usePage } from '../../store/hooks';
import { useStory } from '../../store/useStory';
import { font, radius, space, useTheme } from '../../theme';

export const FLAG_REASONS = ['Art', 'Dialogue', 'Layout', 'Reading order'] as const;

const PAGE_OPTIONS = { placeholders: true };

export const PreviewPage = memo(function PreviewPageItem({
  pageId,
  frameWidth,
  frameHeight,
  pageWidth,
  onTap,
  onFlag,
}: {
  pageId: ID;
  frameWidth: number;
  frameHeight: number;
  pageWidth: number;
  onTap: (x: number) => void;
  onFlag: (pageId: ID) => void;
}) {
  const { c } = useTheme();
  const page = usePage(pageId);
  const press = (event: GestureResponderEvent) => onTap(event.nativeEvent.pageX);
  return (
    <Pressable
      onPress={press}
      onLongPress={() => onFlag(pageId)}
      delayLongPress={450}
      style={[styles.frame, { width: frameWidth, height: frameHeight }]}
    >
      <View>
        <PageView pageId={pageId} width={pageWidth} options={PAGE_OPTIONS} />
        {page && !page.done && (
          <View style={[styles.unfinished, { backgroundColor: c.toolbar }]}>
            <Text style={[font.caption, { color: c.onToolbar }]}>Not done</Text>
          </View>
        )}
        {page?.flag && (
          <Pressable
            onPress={() => onFlag(pageId)}
            hitSlop={12}
            accessibilityLabel="Edit flag"
            style={[styles.flagBadge, { backgroundColor: c.accent, borderColor: c.onAccent }]}
          >
            <Flag size={16} color={c.onAccent} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
});

function FlagEditor({ pageId, flag, onClose }: { pageId: ID; flag: PageFlag | undefined; onClose: () => void }) {
  const [note, setNote] = useState(flag?.note ?? '');
  const [reasons, setReasons] = useState<string[]>(flag?.reasons ?? []);
  const toggle = (reason: string) =>
    setReasons(list => (list.includes(reason) ? list.filter(item => item !== reason) : [...list, reason]));
  const save = (next: PageFlag | undefined) => {
    useStory.getState().updatePage(pageId, { flag: next });
    onClose();
  };
  return (
    <View style={styles.editor}>
      <TextField
        value={note}
        onChangeText={setNote}
        placeholder="What needs fixing on this page?"
        multiline
        maxLength={300}
      />
      <View style={styles.chips}>
        {FLAG_REASONS.map(reason => (
          <Chip key={reason} label={reason} selected={reasons.includes(reason)} onPress={() => toggle(reason)} />
        ))}
      </View>
      <View style={styles.row}>
        {flag && <Button title="Remove flag" variant="secondary" style={styles.flex} onPress={() => save(undefined)} />}
        <Button
          title={flag ? 'Save' : 'Flag page'}
          icon={Flag}
          style={styles.flex}
          onPress={() => save({ note: note.trim(), reasons })}
        />
      </View>
    </View>
  );
}

export function FlagSheet({
  pageId,
  pageLabel,
  onClose,
}: {
  pageId: ID | null;
  pageLabel: string;
  onClose: () => void;
}) {
  const page = usePage(pageId ?? undefined);
  return (
    <Sheet
      visible={!!pageId}
      onClose={onClose}
      title={page?.flag ? 'Edit flag' : 'Flag this page'}
      subtitle={pageLabel}
    >
      {pageId && <FlagEditor key={pageId} pageId={pageId} flag={page?.flag} onClose={onClose} />}
    </Sheet>
  );
}

export function FlagListSheet({
  visible,
  onClose,
  pageIds,
  onJump,
}: {
  visible: boolean;
  onClose: () => void;
  pageIds: ID[];
  onJump: (pageId: ID) => void;
}) {
  const { c } = useTheme();
  const pages = useStory(s => s.pages);
  const flagged = pageIds.filter(id => !!pages[id]?.flag);
  const clearAll = async () => {
    if (await confirm('Remove all flags?', 'Every flag in this chapter will be cleared.', { destructive: true })) {
      const { updatePage } = useStory.getState();
      flagged.forEach(id => updatePage(id, { flag: undefined }));
      onClose();
    }
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Flags" subtitle={`${flagged.length} in this chapter`} scroll>
      <View style={styles.editor}>
        {flagged.length === 0 && (
          <Text style={[font.body, { color: c.textSecondary }]}>
            No flags yet. Long-press a page to mark something to fix.
          </Text>
        )}
        {flagged.map(id => {
          const flag = pages[id].flag as PageFlag;
          return (
            <ComicCard
              key={id}
              shadow={0}
              contentStyle={styles.flagItem}
              onPress={() => {
                onClose();
                onJump(id);
              }}
            >
              <Text style={[font.overline, { color: c.accent }]}>Page {pageIds.indexOf(id) + 1}</Text>
              {!!flag.note && <Text style={[font.body, { color: c.text }]}>{flag.note}</Text>}
              {flag.reasons.length > 0 && (
                <Text style={[font.caption, { color: c.textSecondary }]}>{flag.reasons.join(' · ')}</Text>
              )}
            </ComicCard>
          );
        })}
        {flagged.length > 0 && <Button title="Remove all" variant="danger" small onPress={clearAll} />}
      </View>
    </Sheet>
  );
}

export function EndCard({
  width,
  height,
  chapterNumber,
  pageCount,
  hasNext,
  onNext,
  onExport,
  onClose,
}: {
  width: number;
  height: number;
  chapterNumber: number;
  pageCount: number;
  hasNext: boolean;
  onNext: () => void;
  onExport: () => void;
  onClose: () => void;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.frame, { width, height }]}>
      <ComicCard style={styles.endCard} contentStyle={styles.endContent} halftone>
        <Text style={[font.display, styles.center, { color: c.text }]}>End of chapter {chapterNumber}</Text>
        <Text style={[font.caption, styles.center, { color: c.textSecondary }]}>
          {pageCount === 1 ? '1 page' : `${pageCount} pages`}
        </Text>
        {hasNext && <Button title="Read next chapter" onPress={onNext} />}
        <Button title="Export" variant={hasNext ? 'secondary' : 'primary'} onPress={onExport} />
        <Button title="Close" variant="ghost" onPress={onClose} />
      </ComicCard>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  frame: { alignItems: 'center', justifyContent: 'center' },
  unfinished: {
    position: 'absolute',
    top: space.sm,
    left: space.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    opacity: 0.7,
  },
  flagBadge: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editor: { gap: space.md, padding: space.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
  flagItem: { padding: space.md, gap: space.xs },
  endCard: { width: '80%', maxWidth: 360 },
  endContent: { padding: space.lg, gap: space.md },
});
