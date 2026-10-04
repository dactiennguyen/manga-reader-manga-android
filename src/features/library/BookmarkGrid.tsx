import { FlashList } from '@shopify/flash-list';
import { memo, useMemo } from 'react';
import { RefreshControl, StyleSheet, useWindowDimensions } from 'react-native';

import { gridColumns, MangaGridItem, MangaListItem, type CardBadge } from '../../components/MangaCard';
import type { Bookmark } from '../../store/useLibrary';
import { space, useTheme } from '../../theme';

type ItemProps = {
  bookmark: Bookmark;
  layout: 'grid' | 'list';
  selected: boolean;
  headers?: Record<string, string>;
  blur: boolean;
  sourceName?: string;
  onPress: (bookmark: Bookmark) => void;
  onLongPress: (bookmark: Bookmark) => void;
};

function BookmarkItemBase({
  bookmark,
  layout,
  selected,
  headers,
  blur,
  sourceName,
  onPress,
  onLongPress,
}: ItemProps) {
  const { c } = useTheme();
  const badges = useMemo(() => {
    const list: CardBadge[] = [];
    if (bookmark.newChapters) {
      list.push({ text: `MỚI ${bookmark.newChapters}`, color: c.badgeNew });
    }
    if (bookmark.unread) {
      list.push({ text: String(bookmark.unread), color: c.badgeUnread });
    }
    return list;
  }, [bookmark.newChapters, bookmark.unread, c.badgeNew, c.badgeUnread]);

  const common = {
    title: bookmark.title,
    cover: bookmark.cover,
    headers,
    badges,
    blur,
    selected,
    onPress: () => onPress(bookmark),
    onLongPress: () => onLongPress(bookmark),
  };

  if (layout === 'list') {
    const meta = [
      sourceName ?? bookmark.sourceId,
      bookmark.chapterCount ? `${bookmark.chapterCount} chương` : '',
      bookmark.group,
    ]
      .filter(Boolean)
      .join(' · ');
    return <MangaListItem {...common} subtitle={bookmark.latestChapter} meta={meta} />;
  }
  return <MangaGridItem {...common} subtitle={bookmark.latestChapter} />;
}

const BookmarkItem = memo(BookmarkItemBase);

/** Lưới/danh sách bookmark truyện (BookmarkGrid), có kéo để kiểm tra cập nhật. */
export function BookmarkGrid({
  items,
  layout,
  selected,
  sourceInfo,
  allowNsfw,
  refreshing,
  onRefresh,
  onPress,
  onLongPress,
}: {
  items: Bookmark[];
  layout: 'grid' | 'list';
  selected: ReadonlySet<string>;
  sourceInfo: Record<string, { headers: Record<string, string>; name: string; nsfw: boolean }>;
  allowNsfw: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onPress: (bookmark: Bookmark) => void;
  onLongPress: (bookmark: Bookmark) => void;
}) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const columns = layout === 'grid' ? gridColumns(width) : 1;

  return (
    <FlashList
      // Đổi số cột cần dựng lại list.
      key={`${layout}-${columns}`}
      data={items}
      numColumns={columns}
      keyExtractor={item => item.key}
      extraData={selected}
      contentContainerStyle={layout === 'grid' ? styles.grid : styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[c.accent]} tintColor={c.accent} />
      }
      renderItem={({ item }) => {
        const info = sourceInfo[item.sourceId];
        return (
          <BookmarkItem
            bookmark={item}
            layout={layout}
            selected={selected.has(item.key)}
            headers={info?.headers}
            sourceName={info?.name}
            blur={!!(item.nsfw || info?.nsfw) && !allowNsfw}
            onPress={onPress}
            onLongPress={onLongPress}
          />
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  grid: { paddingHorizontal: space.sm, paddingBottom: 96 },
  list: { paddingBottom: 96 },
});
