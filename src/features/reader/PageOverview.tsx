import { memo, useCallback, useMemo } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { X } from '../../components/icons';
import { withUserAgent } from '../../lib/http';
import type { Page } from '../../sources/types';
import { radius, space } from '../../theme';
import { CHROME_ACCENT, CHROME_BAR, CHROME_FG, ChromeButton } from './chromeParts';

const COLUMNS = 3;
const GAP = space.sm;
const THUMB_RATIO = 1.42;

type Cell = { page: Page; index: number };

export function PageOverview({
  visible,
  onClose,
  chapterName,
  pages,
  current,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  chapterName: string;
  pages: readonly Page[];
  current: number;
  onPick: (index: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const columns = width >= 900 ? 5 : width >= 600 ? 4 : COLUMNS;
  const cellWidth = Math.floor((width - GAP * (columns + 1)) / columns);
  const rowHeight = Math.round(cellWidth * THUMB_RATIO) + GAP;
  const cells = useMemo(() => pages.map((page, index) => ({ page, index })), [pages]);
  const rows = Math.ceil(cells.length / columns);
  const initialRow = Math.min(Math.max(0, Math.floor(current / columns) - 1), Math.max(0, rows - 1));

  const getItemLayout = useCallback(
    (_: unknown, row: number) => ({ length: rowHeight, offset: GAP / 2 + rowHeight * row, index: row }),
    [rowHeight],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Cell>) => (
      <Thumb
        page={item.page}
        index={item.index}
        width={cellWidth}
        active={item.index === current}
        onPick={onPick}
      />
    ),
    [cellWidth, current, onPick],
  );

  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="fade" statusBarTranslucent>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <ChromeButton icon={X} onPress={onClose} accessibilityLabel="Đóng tổng quan trang" />
          <View style={styles.flex}>
            <Text numberOfLines={1} style={styles.title}>
              Tổng quan trang
            </Text>
            <Text numberOfLines={1} style={styles.subtitle}>
              {chapterName} · {pages.length} trang
            </Text>
          </View>
        </View>
        {visible && (
          <FlatList
            key={columns}
            data={cells}
            numColumns={columns}
            renderItem={renderItem}
            keyExtractor={item => `${item.index}:${item.page.uri}`}
            getItemLayout={getItemLayout}
            initialScrollIndex={initialRow}
            initialNumToRender={columns * 6}
            windowSize={7}
            columnWrapperStyle={styles.row}
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + GAP }]}
          />
        )}
      </View>
    </Modal>
  );
}

const Thumb = memo(function ThumbView({
  page,
  index,
  width,
  active,
  onPick,
}: {
  page: Page;
  index: number;
  width: number;
  active: boolean;
  onPick: (index: number) => void;
}) {
  const source = useMemo(
    () => (page.uri.startsWith('file://') ? { uri: page.uri } : { uri: page.uri, headers: withUserAgent(page.headers) }),
    [page.uri, page.headers],
  );
  return (
    <Pressable
      onPress={() => onPick(index)}
      accessibilityRole="button"
      accessibilityLabel={`Trang ${index + 1}`}
      style={[styles.thumb, { width, height: Math.round(width * THUMB_RATIO) }, active && styles.active]}
    >
      <Image source={source} style={styles.image} resizeMode="cover" resizeMethod="resize" />
      <View style={[styles.number, active && { backgroundColor: CHROME_ACCENT }]}>
        <Text style={styles.numberText}>{index + 1}</Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CHROME_BAR },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 56,
    paddingHorizontal: space.xs,
  },
  title: { color: CHROME_FG, fontSize: 18, fontWeight: '600' },
  subtitle: { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  content: { paddingHorizontal: GAP, paddingTop: GAP / 2 },
  row: { gap: GAP, marginBottom: GAP },
  thumb: {
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: '#222',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  active: { borderColor: CHROME_ACCENT },
  image: { width: '100%', height: '100%' },
  number: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    minWidth: 26,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderTopRightRadius: radius.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
  },
  numberText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
