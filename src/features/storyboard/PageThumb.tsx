import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Check, Circle, CircleCheck, Flag, PanelsTopLeft, PenLine, type LucideIcon } from '../../components/icons';
import { useThumb } from '../../engine/page';
import { PAGE_STATUS_LABEL } from '../../model/constants';
import { pageStatus } from '../../model/selectors';
import type { ID, PageStatus } from '../../model/types';
import { usePage } from '../../store/hooks';
import { font, space, useTheme } from '../../theme';

export const THUMB_META_H = 26;

export const STATUS_ICON: Record<PageStatus, LucideIcon> = {
  empty: Circle,
  paneled: PanelsTopLeft,
  drawing: PenLine,
  done: CircleCheck,
};

export function PageThumb({
  pageId,
  number,
  width,
  height,
  selecting,
  selected,
  onPress,
  onLongPress,
}: {
  pageId: ID;
  number: number;
  width: number;
  height: number;
  selecting?: boolean;
  selected?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const { c } = useTheme();
  const page = usePage(pageId);
  const uri = useThumb(pageId);
  if (!page) {
    return null;
  }
  const status = pageStatus(page);
  const StatusIcon = STATUS_ICON[status];
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={`Page ${number}, ${PAGE_STATUS_LABEL[status]}`}
      style={{ width }}
    >
      <View
        style={[
          styles.frame,
          uri ? styles.paper : { backgroundColor: c.skeleton },
          { width, height, borderColor: selected ? c.accent : c.ink },
        ]}
      >
        {uri && <Image source={{ uri }} style={styles.image} resizeMode="cover" resizeMethod="resize" />}
        {selecting && (
          <View style={[styles.check, { borderColor: c.ink, backgroundColor: selected ? c.accent : c.surface }]}>
            {selected && <Check size={16} color={c.onAccent} />}
          </View>
        )}
      </View>
      <View style={styles.meta}>
        <Text style={[font.label, { color: c.text }]}>{number}</Text>
        <StatusIcon size={14} color={status === 'done' ? c.success : c.textSecondary} />
        {page.flag && <Flag size={14} color={c.accent} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: { borderWidth: 2, overflow: 'hidden' },
  paper: { backgroundColor: '#FFFFFF' },
  image: { width: '100%', height: '100%' },
  check: {
    position: 'absolute',
    top: space.xs,
    right: space.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    height: THUMB_META_H,
  },
});
