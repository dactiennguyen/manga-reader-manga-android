import { Children, useMemo, useState, type ReactNode, type Ref } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAppNavigation } from '../../app/routes';
import { Cover, CoverOverlays, MangaGridItem, type CoverRibbon } from '../../components/MangaCard';
import { Dialog, Sheet } from '../../components/Sheet';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleHelp,
  Pencil,
  Plus,
  Settings,
  Trash2,
} from '../../components/icons';
import { Button, IconButton, ListItem } from '../../components/ui';
import { displayUrl } from '../../lib/url';
import { getEngine, type ContentType, type SourceConfig } from '../../sources';
import { getProgress } from '../../store/progress';
import { useBrowser, type QuickAccessItem } from '../../store/useBrowser';
import { useHistory, type ReadingEntry } from '../../store/useHistory';
import { sortBookmarks, useLibrary } from '../../store/useLibrary';
import { HOME_WIDGET_LIMITS, useAllowNsfw, useSettings, type HomeWidget } from '../../store/useSettings';
import { sourceIn, useSources, withCatalog } from '../../store/useSources';
import { font, radius, space, useTheme } from '../../theme';
import { Favicon } from '../../components/Favicon';
import { OptionSheet, type Option } from '../settings/OptionSheet';
import { ShortcutDialog } from '../settings/ShortcutDialog';
import type { ViewRef } from './Tour';

const GRID_COLUMNS = 5;

const LIMIT_OPTIONS: Option<number>[] = HOME_WIDGET_LIMITS.map(n => ({ value: n, label: `${n} mục` }));

const gridFill = (count: number, limit: number) => {
  if (count >= limit) {
    return 0;
  }
  const rest = count % GRID_COLUMNS;
  return rest ? GRID_COLUMNS - rest : 1;
};


export function WidgetSection({
  widget,
  title,
  help,
  onTitlePress,
  flush,
  children,
  ref,
}: {
  widget: HomeWidget;
  title: string;
  help: string;
  onTitlePress?: () => void;
  flush?: boolean;
  children: ReactNode;
  ref?: Ref<ViewRef>;
}) {
  const { c } = useTheme();
  const updateHomeWidget = useSettings(s => s.updateHomeWidget);
  const [helpOpen, setHelpOpen] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  const collapsed = !!widget.collapsed;

  return (
    <View ref={ref} collapsable={false} style={styles.section}>
      <View style={styles.sectionHeader}>
        <Pressable
          onPress={onTitlePress}
          disabled={!onTitlePress}
          accessibilityRole={onTitlePress ? 'button' : 'header'}
          style={({ pressed }) => [styles.titleButton, pressed && styles.pressed]}
        >
          <Text numberOfLines={1} style={[styles.sectionTitle, { color: c.text }]}>
            {title}
          </Text>
          {onTitlePress && <ChevronRight size={20} color={c.muted} />}
        </Pressable>
        <IconButton
          icon={CircleHelp}
          size={20}
          color={c.muted}
          onPress={() => setHelpOpen(true)}
          accessibilityLabel={`Giới thiệu ${title}`}
          style={styles.headerButton}
        />
        <IconButton
          icon={Settings}
          size={20}
          color={c.muted}
          onPress={() => setLimitOpen(true)}
          accessibilityLabel={`Số mục hiển thị của ${title}`}
          style={styles.headerButton}
        />
        <IconButton
          icon={collapsed ? ChevronUp : ChevronDown}
          size={22}
          color={c.muted}
          onPress={() => updateHomeWidget(widget.id, { collapsed: !collapsed })}
          accessibilityLabel={collapsed ? `Mở rộng ${title}` : `Thu gọn ${title}`}
          style={styles.headerButton}
        />
      </View>
      {!collapsed && <View style={[styles.box, flush && styles.flush, { borderColor: c.muted }]}>{children}</View>}

      <Dialog
        visible={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={title}
        message={help}
        actions={[{ label: 'Đã hiểu', onPress: () => setHelpOpen(false), variant: 'secondary' }]}
      />
      <OptionSheet
        visible={limitOpen}
        onClose={() => setLimitOpen(false)}
        title="Số mục hiển thị"
        subtitle="Chọn số mục hiển thị cho widget này."
        options={LIMIT_OPTIONS}
        value={widget.limit}
        onSelect={limit => updateHomeWidget(widget.id, { limit })}
      />
    </View>
  );
}

function EmptyHint({ text, action }: { text: string; action?: { label: string; onPress: () => void } }) {
  const { c } = useTheme();
  return (
    <View style={styles.empty}>
      <Text style={[font.body, { color: c.textSecondary }]}>{text}</Text>
      {action && <Button title={action.label} variant="secondary" onPress={action.onPress} style={styles.emptyButton} />}
    </View>
  );
}

function TileGrid({ children }: { children: ReactNode }) {
  const cells = Children.toArray(children);
  const rows: ReactNode[][] = [];
  for (let i = 0; i < cells.length; i += GRID_COLUMNS) {
    rows.push(cells.slice(i, i + GRID_COLUMNS));
  }
  return (
    <View>
      {rows.map((row, i) => (
        <View key={i} style={styles.gridRow}>
          {row}
          {Array.from({ length: GRID_COLUMNS - row.length }, (_, j) => (
            <View key={`pad-${j}`} style={styles.tile} />
          ))}
        </View>
      ))}
    </View>
  );
}

type AddTileProps = { label: string; cover?: boolean; onPress: () => void };

function addTiles(count: number, props: AddTileProps) {
  return Array.from({ length: count }, (_, i) => <AddTile key={`add-${i}`} {...props} />);
}

function AddTile({ label, cover, onPress }: AddTileProps) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <View style={[cover ? styles.coverAdd : styles.iconTile, styles.addTile, { borderColor: c.border }]}>
        <Plus size={22} color={c.muted} />
      </View>
    </Pressable>
  );
}

type SourceInfo = { name: string; headers: Record<string, string> };

function useSourceInfo(): (sourceId: string) => SourceInfo | undefined {
  const sources = useSources(s => s.sources);
  return useMemo(() => {
    const map = new Map<string, SourceInfo>();
    for (const src of withCatalog(sources)) {
      map.set(src.id, { name: src.name, headers: getEngine(src.engine).imageHeaders(src) });
    }
    return (sourceId: string) => map.get(sourceId);
  }, [sources]);
}

const typeLabelOf = (content: ContentType) => (content === 'novel' ? 'N' : 'M');


export function QuickAccessWidget({ widget, onOpenUrl }: { widget: HomeWidget; onOpenUrl: (url: string) => void }) {
  const { c } = useTheme();
  const items = useBrowser(s => s.quickAccess);
  const [selected, setSelected] = useState<QuickAccessItem | null>(null);
  const [editing, setEditing] = useState<QuickAccessItem | 'new' | null>(null);
  const shown = items.slice(0, widget.limit);

  return (
    <WidgetSection
      widget={widget}
      title="Truy cập nhanh"
      help="Lối tắt tới các trang web bạn hay mở. Bấm ô + để thêm lối tắt, nhấn giữ một lối tắt để sửa hoặc xoá."
    >
      {shown.length ? (
        <TileGrid>
          {shown.map(item => (
            <Pressable
              key={item.id}
              onPress={() => onOpenUrl(item.url)}
              onLongPress={() => setSelected(item)}
              style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
            >
              <View style={[styles.iconTile, { backgroundColor: c.surfaceAlt }]}>
                <Favicon url={item.url} label={item.title} size={26} />
              </View>
              <Text numberOfLines={1} style={[styles.tileLabel, { color: c.textSecondary }]}>
                {item.title}
              </Text>
            </Pressable>
          ))}
          {addTiles(gridFill(shown.length, widget.limit), { label: 'Thêm lối tắt', onPress: () => setEditing('new') })}
        </TileGrid>
      ) : (
        <EmptyHint
          text="Bạn chưa có trang web nào trong Truy cập nhanh. Bấm nút bên dưới để bắt đầu thêm trang web."
          action={{ label: 'Thêm trang web', onPress: () => setEditing('new') }}
        />
      )}

      <Sheet visible={!!selected} onClose={() => setSelected(null)} title={selected?.title} subtitle={selected ? displayUrl(selected.url) : undefined}>
        <ListItem
          icon={Pencil}
          title="Sửa"
          onPress={() => {
            setEditing(selected);
            setSelected(null);
          }}
        />
        <ListItem
          icon={Trash2}
          title="Xoá"
          destructive
          onPress={() => {
            if (selected) {
              useBrowser.getState().removeQuickAccess(selected.id);
            }
            setSelected(null);
          }}
        />
      </Sheet>

      <ShortcutDialog
        visible={editing !== null}
        item={editing === 'new' || editing === null ? undefined : editing}
        onClose={() => setEditing(null)}
      />
    </WidgetSection>
  );
}


export function ContinueReadingWidget({ widget }: { widget: HomeWidget }) {
  const navigation = useAppNavigation();
  const reading = useHistory(s => s.reading);
  const sources = useSources(s => s.sources);
  const allowNsfw = useAllowNsfw();
  const sourceInfo = useSourceInfo();
  const limit = widget.limit;

  const items = useMemo(() => {
    const visible: { entry: ReadingEntry; source: SourceConfig }[] = [];
    for (const entry of reading) {
      const source = sourceIn(sources, entry.sourceId);
      if (source && (!source.nsfw || allowNsfw)) {
        visible.push({ entry, source });
      }
      if (visible.length >= limit) {
        break;
      }
    }
    return visible;
  }, [reading, sources, allowNsfw, limit]);

  if (!items.length) {
    return null;
  }

  const open = (entry: ReadingEntry) => {
    const last = getProgress(entry.key).last;
    const position = last && last.chapterUrl === entry.chapterUrl ? last.page : undefined;
    const base = { sourceId: entry.sourceId, mangaUrl: entry.mangaUrl, chapterUrl: entry.chapterUrl };
    if (entry.content === 'novel') {
      navigation.navigate('NovelReader', { ...base, paragraph: position });
    } else {
      navigation.navigate('Reader', { ...base, page: position });
    }
  };

  return (
    <WidgetSection
      widget={widget}
      title="Đọc tiếp"
      help="Các truyện bạn đang đọc dở, mới đọc gần đây nhất ở đầu. Bấm để đọc tiếp từ chỗ đã dừng, nhấn giữ để mở trang truyện."
      onTitlePress={() => navigation.navigate('History', { tab: 'reading' })}
      flush
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
        {items.map(({ entry }) => {
          const info = sourceInfo(entry.sourceId);
          return (
            <View key={entry.key} style={styles.coverCard}>
              <MangaGridItem
                title={entry.title}
                subtitle={entry.chapterName}
                cover={entry.cover}
                headers={info?.headers}
                siteLabel={info?.name}
                typeLabel={typeLabelOf(entry.content)}
                onPress={() => open(entry)}
                onLongPress={() =>
                  navigation.navigate('MangaDetail', {
                    sourceId: entry.sourceId,
                    url: entry.mangaUrl,
                    title: entry.title,
                    cover: entry.cover,
                  })
                }
              />
            </View>
          );
        })}
      </ScrollView>
    </WidgetSection>
  );
}


export function MediaSitesWidget({ widget, tourRef }: { widget: HomeWidget; tourRef?: Ref<ViewRef> }) {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const sources = useSources(s => s.sources);
  const allowNsfw = useAllowNsfw();
  const limit = widget.limit;
  const visible = useMemo(
    () => sources.filter(s => s.enabled && (!s.nsfw || allowNsfw)).slice(0, limit),
    [sources, allowNsfw, limit],
  );
  const addSite = () => navigation.navigate('Addons');

  return (
    <WidgetSection
      ref={tourRef}
      widget={widget}
      title="Site truyện đã lưu"
      help="Các site truyện bạn đã ghim từ danh sách site được hỗ trợ. Bấm một site để xem truyện của site đó, bấm ô + để ghim thêm site."
      onTitlePress={() => navigation.navigate('Bookmarks', { tab: 'sites' })}
    >
      {visible.length ? (
        <TileGrid>
          {visible.map(src => (
            <Pressable
              key={src.id}
              onPress={() => navigation.navigate('Catalog', { sourceId: src.id })}
              style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
            >
              <View style={[styles.iconTile, { backgroundColor: c.surfaceAlt }]}>
                <Favicon url={src.baseUrl} label={src.name} size={26} />
                <View style={[styles.siteType, { backgroundColor: c.badgeType, borderColor: c.bg }]}>
                  <Text style={styles.siteTypeText}>{typeLabelOf(src.content)}</Text>
                </View>
              </View>
              <Text numberOfLines={1} style={[styles.tileLabel, { color: c.textSecondary }]}>
                {src.name}
              </Text>
            </Pressable>
          ))}
          {addTiles(gridFill(visible.length, limit), { label: 'Thêm site', onPress: addSite })}
        </TileGrid>
      ) : (
        <EmptyHint
          text="Chưa ghim site truyện nào. Chọn site trong danh sách site được hỗ trợ để ghim vào đây."
          action={{ label: 'Chọn site', onPress: addSite }}
        />
      )}
    </WidgetSection>
  );
}


export function BookmarksWidget({ widget, content }: { widget: HomeWidget; content: ContentType }) {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const bookmarks = useLibrary(s => s.bookmarks);
  const sort = useLibrary(s => s.sort);
  const allowNsfw = useAllowNsfw();
  const sourceInfo = useSourceInfo();
  const limit = widget.limit;
  const list = useMemo(
    () =>
      sortBookmarks(
        Object.values(bookmarks).filter(b => b.content === content),
        sort,
      ).slice(0, limit),
    [bookmarks, content, sort, limit],
  );
  const novel = content === 'novel';
  const findMore = () => navigation.navigate('MangaSearch');

  return (
    <WidgetSection
      widget={widget}
      title={novel ? 'Tiểu thuyết đã lưu' : 'Truyện tranh đã lưu'}
      help={`${novel ? 'Tiểu thuyết' : 'Truyện tranh'} bạn đã bookmark, dấu ở góc bìa cho biết có chương mới hoặc chương chưa đọc. Mở trang truyện và bấm bookmark để thêm vào đây.`}
      onTitlePress={() => navigation.navigate('Bookmarks', { tab: 'media' })}
    >
      {list.length ? (
        <TileGrid>
          {list.map(b => {
            const ribbon: CoverRibbon | undefined = b.newChapters ? 'new' : b.unread ? 'unread' : undefined;
            return (
              <Pressable
                key={b.key}
                onPress={() =>
                  navigation.navigate('MangaDetail', { sourceId: b.sourceId, url: b.url, title: b.title, cover: b.cover })
                }
                style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
              >
                <View style={styles.coverTile}>
                  <Cover uri={b.cover} headers={sourceInfo(b.sourceId)?.headers} blur={!!b.nsfw && !allowNsfw} />
                  <CoverOverlays ribbon={ribbon} />
                </View>
                <Text numberOfLines={2} style={[styles.coverLabel, { color: c.text }]}>
                  {b.title}
                </Text>
              </Pressable>
            );
          })}
          {addTiles(gridFill(list.length, limit), { cover: true, label: 'Tìm truyện', onPress: findMore })}
        </TileGrid>
      ) : (
        <EmptyHint
          text={
            novel
              ? 'Chưa có tiểu thuyết nào được lưu. Mở trang truyện và bấm bookmark để theo dõi chương mới.'
              : 'Chưa có truyện nào được lưu. Mở trang truyện và bấm bookmark để theo dõi chương mới.'
          }
          action={{ label: 'Tìm truyện', onPress: findMore }}
        />
      )}
    </WidgetSection>
  );
}


export function WebBookmarksWidget({ widget, onOpenUrl }: { widget: HomeWidget; onOpenUrl: (url: string) => void }) {
  const navigation = useAppNavigation();
  const bookmarks = useBrowser(s => s.webBookmarks);
  const shown = bookmarks.slice(0, widget.limit);

  return (
    <WidgetSection
      widget={widget}
      title="Trang đã đánh dấu"
      help="Các trang web bạn đã đánh dấu, mới nhất ở đầu. Khi đang xem trang, mở menu ⋮ và bấm biểu tượng ngôi sao để thêm vào đây."
      onTitlePress={() => navigation.navigate('Bookmarks', { tab: 'web' })}
      flush={shown.length > 0}
    >
      {shown.length ? (
        shown.map(b => (
          <ListItem
            key={b.id}
            left={<Favicon url={b.url} label={b.title} size={22} />}
            title={b.title || displayUrl(b.url)}
            subtitle={displayUrl(b.url)}
            onPress={() => onOpenUrl(b.url)}
          />
        ))
      ) : (
        <EmptyHint text="Chưa có trang nào được đánh dấu. Khi đang xem trang, mở menu ⋮ và bấm biểu tượng ngôi sao." />
      )}
    </WidgetSection>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  section: { gap: space.xs },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingLeft: space.lg, paddingRight: space.sm },
  titleButton: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 36 },
  sectionTitle: { flexShrink: 1, fontSize: 18, fontWeight: '700' },
  headerButton: { width: 34, height: 34, borderRadius: 17 },
  box: {
    marginHorizontal: space.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    padding: space.sm,
  },
  flush: { padding: 0, overflow: 'hidden' },
  empty: { padding: space.sm, gap: space.md },
  emptyButton: { alignSelf: 'stretch' },
  gridRow: { flexDirection: 'row' },
  tile: { flex: 1, minWidth: 0, alignItems: 'center', gap: 6, paddingHorizontal: 3, paddingVertical: space.xs },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: { borderWidth: 1.5, borderStyle: 'dashed' },
  tileLabel: { alignSelf: 'stretch', fontSize: 12, textAlign: 'center' },
  coverTile: { width: '100%', maxWidth: 120 },
  coverAdd: {
    width: '100%',
    maxWidth: 120,
    aspectRatio: 2 / 3,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverLabel: { alignSelf: 'stretch', fontSize: 11, lineHeight: 14, fontWeight: '600', textAlign: 'center' },
  hList: { padding: space.xs },
  coverCard: { width: 108 },
  siteType: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 17,
    height: 17,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  siteTypeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
