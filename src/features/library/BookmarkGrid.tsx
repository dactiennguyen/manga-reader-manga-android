import { FlashList } from '@shopify/flash-list';
import { memo, useMemo } from 'react';
import { RefreshControl, StyleSheet, useWindowDimensions } from 'react-native';

import {
  gridColumns,
  MangaGridItem,
  MangaListItem,
  type CardBadge,
  type CoverRibbon,
} from '../../components/MangaCard';
import { getHost } from '../../lib/url';
import type { Bookmark } from '../../store/useLibrary';
import { space, useTheme } from '../../theme';

export type BookmarkSourceInfo = {
  headers: Record<string, string>;
  name: string;
  nsfw: boolean;
  host: string;
};

type ItemProps = {
  bookmark: Bookmark;
  layout: 'grid' | 'list';
  selected: boolean;
  headers?: Record<string, string>;
  blur: boolean;
  sourceName?: string;
  host: string;
  onPress: (bookmark: Bookmark) => void;
  onLongPress: (bookmark: Bookmark) => void;
};

function ribbonOf(bookmark: Bookmark): CoverRibbon | undefined {
  if (bookmark.newChapters) {
    return 'new';
  }
  return bookmark.unread ? 'unread' : undefined;
}

function BookmarkItemBase({
  bookmark,
  layout,
  selected,
  headers,
  blur,
  sourceName,
  host,
  onPress,
  onLongPress,
}: ItemProps) {
  const { c } = useTheme();
  const common = {
    title: bookmark.title,
    cover: bookmark.cover,
    headers,
    blur,
    selected,
    ribbon: ribbonOf(bookmark),
    onPress: () => onPress(bookmark),
    onLongPress: () => onLongPress(bookmark),
  };

  const badges = useMemo(() => {
    const list: CardBadge[] = [];
    if (bookmark.newChapters) {
      list.push({ text: `${bookmark.newChapters} chương mới`, color: c.badgeNew });
    }
    if (bookmark.unread) {
      list.push({ text: `${bookmark.unread} chưa đọc`, color: c.badgeUnread });
    }
    return list;
  }, [bookmark.newChapters, bookmark.unread, c.badgeNew, c.badgeUnread]);

  if (layout === 'list') {
    const meta = [
      host || sourceName || bookmark.sourceId,
      bookmark.chapterCount ? `${bookmark.chapterCount} chương` : '',
      bookmark.group,
    ]
      .filter(Boolean)
      .join(' · ');
    return <MangaListItem {...common} badges={badges} subtitle={bookmark.latestChapter} meta={meta} />;
  }
  return <MangaGridItem {...common} siteLabel={host || sourceName} />;
}

const BookmarkItem = memo(BookmarkItemBase);

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
  sourceInfo: Record<string, BookmarkSourceInfo>;
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
            host={info?.host || getHost(item.url)}
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
  grid: { paddingHorizontal: space.xs, paddingTop: space.xs, paddingBottom: 96 },
  list: { paddingTop: space.xs, paddingBottom: 96 },
});
