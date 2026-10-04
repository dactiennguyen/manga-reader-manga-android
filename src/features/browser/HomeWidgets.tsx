import { Pencil, Plus, Trash2 } from 'lucide-react-native';
import { useMemo, useState, type ReactNode, type Ref } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAppNavigation } from '../../app/routes';
import { Cover, MangaGridItem, type CardBadge } from '../../components/MangaCard';
import { Dialog, Sheet } from '../../components/Sheet';
import { Button, FieldLabel, ListItem, TextField, toast } from '../../components/ui';
import { displayUrl, ensureScheme, getHost, looksLikeUrl } from '../../lib/url';
import { getEngine, languageName, type ContentType, type SourceConfig } from '../../sources';
import { getProgress } from '../../store/progress';
import { useBrowser, type QuickAccessItem } from '../../store/useBrowser';
import { useHistory, type ReadingEntry } from '../../store/useHistory';
import { sortBookmarks, useLibrary } from '../../store/useLibrary';
import { useAllowNsfw } from '../../store/useSettings';
import { useSources } from '../../store/useSources';
import { font, radius, space, useTheme } from '../../theme';
import { Favicon } from '../../components/Favicon';
import type { ViewRef } from './Tour';

// ─── Khung widget ───────────────────────────────────────────────────────────

export function WidgetSection({
  title,
  action,
  children,
  ref,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
  children: ReactNode;
  ref?: Ref<ViewRef>;
}) {
  const { c } = useTheme();
  return (
    <View ref={ref} collapsable={false} style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[font.heading, styles.flex, { color: c.text }]}>{title}</Text>
        {action && (
          <Pressable onPress={action.onPress} hitSlop={8}>
            <Text style={[font.caption, styles.bold, { color: c.accent }]}>{action.label}</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

function EmptyHint({ text, action }: { text: string; action?: { label: string; onPress: () => void } }) {
  const { c } = useTheme();
  return (
    <View style={[styles.emptyCard, { backgroundColor: c.surface }]}>
      <Text style={[font.body, { color: c.muted }]}>{text}</Text>
      {action && <Button title={action.label} icon={Plus} small onPress={action.onPress} style={styles.emptyButton} />}
    </View>
  );
}

/** Header ảnh bìa theo nguồn (Referer chống hotlink). */
function useSourceHeaders(): (sourceId: string) => Record<string, string> | undefined {
  const sources = useSources(s => s.sources);
  return useMemo(() => {
    const map = new Map<string, Record<string, string>>();
    for (const src of sources) {
      map.set(src.id, getEngine(src.engine).imageHeaders(src));
    }
    return (sourceId: string) => map.get(sourceId);
  }, [sources]);
}

// ─── Truy cập nhanh ─────────────────────────────────────────────────────────

export function QuickAccessWidget({ limit, onOpenUrl }: { limit: number; onOpenUrl: (url: string) => void }) {
  const { c } = useTheme();
  const items = useBrowser(s => s.quickAccess);
  const [selected, setSelected] = useState<QuickAccessItem | null>(null);
  const [editing, setEditing] = useState<QuickAccessItem | 'new' | null>(null);

  return (
    <WidgetSection title="Truy cập nhanh">
      <View style={styles.grid}>
        {items.slice(0, limit).map(item => (
          <Pressable
            key={item.id}
            onPress={() => onOpenUrl(item.url)}
            onLongPress={() => setSelected(item)}
            style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
          >
            <View style={[styles.tileIcon, { backgroundColor: c.surface }]}>
              <Favicon url={item.url} label={item.title} size={28} />
            </View>
            <Text numberOfLines={1} style={[styles.tileLabel, { color: c.textSecondary }]}>
              {item.title}
            </Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => setEditing('new')}
          style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
          accessibilityLabel="Thêm lối tắt"
        >
          <View style={[styles.tileIcon, styles.addTile, { borderColor: c.border }]}>
            <Plus size={24} color={c.muted} />
          </View>
          <Text numberOfLines={1} style={[styles.tileLabel, { color: c.muted }]}>
            Thêm lối tắt
          </Text>
        </Pressable>
      </View>

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

      {editing && (
        <QuickAccessDialog item={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}
    </WidgetSection>
  );
}

function QuickAccessDialog({ item, onClose }: { item?: QuickAccessItem; onClose: () => void }) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [url, setUrl] = useState(item?.url ?? '');
  const valid = looksLikeUrl(url) || /^https?:\/\/\S+$/i.test(url.trim());

  const save = () => {
    if (!valid) {
      toast('Địa chỉ web không hợp lệ');
      return;
    }
    const fixed = ensureScheme(url);
    const name = title.trim() || getHost(fixed) || fixed;
    const store = useBrowser.getState();
    if (item) {
      store.updateQuickAccess(item.id, { title: name, url: fixed });
    } else {
      store.addQuickAccess({ title: name, url: fixed });
    }
    onClose();
  };

  return (
    <Dialog
      visible
      onClose={onClose}
      title={item ? 'Sửa lối tắt' : 'Lối tắt mới'}
      actions={[
        { label: 'Huỷ', onPress: onClose },
        { label: 'Lưu', onPress: save, variant: 'primary', disabled: !url.trim() },
      ]}
    >
      <View>
        <FieldLabel>Tên</FieldLabel>
        <TextField value={title} onChangeText={setTitle} placeholder="Ví dụ: MangaDex" autoFocus={!item} />
        <FieldLabel>URL</FieldLabel>
        <TextField
          value={url}
          onChangeText={setUrl}
          placeholder="https://…"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          onSubmitEditing={save}
        />
      </View>
    </Dialog>
  );
}

// ─── Đọc tiếp ───────────────────────────────────────────────────────────────

export function ContinueReadingWidget({ limit }: { limit: number }) {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const reading = useHistory(s => s.reading);
  const sources = useSources(s => s.sources);
  const allowNsfw = useAllowNsfw();
  const headersOf = useSourceHeaders();

  const items = useMemo(() => {
    const visible: { entry: ReadingEntry; source: SourceConfig }[] = [];
    for (const entry of reading) {
      const source = sources.find(s => s.id === entry.sourceId);
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
    <WidgetSection title="Đọc tiếp" action={{ label: 'Lịch sử', onPress: () => navigation.navigate('History', { tab: 'reading' }) }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
        {items.map(({ entry }) => (
          <Pressable
            key={entry.key}
            onPress={() => open(entry)}
            onLongPress={() =>
              navigation.navigate('MangaDetail', {
                sourceId: entry.sourceId,
                url: entry.mangaUrl,
                title: entry.title,
                cover: entry.cover,
              })
            }
            style={({ pressed }) => [styles.readingCard, pressed && styles.pressed]}
          >
            <Cover uri={entry.cover} headers={headersOf(entry.sourceId)} />
            <Text numberOfLines={2} style={[font.caption, styles.bold, { color: c.text }]}>
              {entry.title}
            </Text>
            <Text numberOfLines={1} style={[styles.small, { color: c.accent }]}>
              {entry.chapterName}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </WidgetSection>
  );
}

// ─── Site truyện đã lưu ─────────────────────────────────────────────────────

export function MediaSitesWidget({ limit, tourRef }: { limit: number; tourRef?: Ref<ViewRef> }) {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const sources = useSources(s => s.sources);
  const allowNsfw = useAllowNsfw();
  const visible = useMemo(
    () => sources.filter(s => s.enabled && (!s.nsfw || allowNsfw)).slice(0, limit),
    [sources, allowNsfw, limit],
  );

  return (
    <WidgetSection
      ref={tourRef}
      title="Site truyện đã lưu"
      action={visible.length ? { label: 'Quản lý', onPress: () => navigation.navigate('Addons') } : undefined}
    >
      {visible.length ? (
        <View style={styles.siteGrid}>
          {visible.map(src => (
            <Pressable
              key={src.id}
              onPress={() => navigation.navigate('Catalog', { sourceId: src.id })}
              style={({ pressed }) => [styles.site, { backgroundColor: c.surface }, pressed && styles.pressed]}
            >
              <Favicon url={src.baseUrl} label={src.name} size={28} />
              <View style={styles.flex}>
                <Text numberOfLines={1} style={[font.label, { color: c.text }]}>
                  {src.name}
                </Text>
                <Text numberOfLines={1} style={[styles.small, { color: c.muted }]}>
                  {`${src.content === 'novel' ? 'Tiểu thuyết' : 'Truyện tranh'} · ${languageName(src.lang)}`}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <EmptyHint
          text="Bạn chưa có site truyện nào. Thêm site để addon đọc truyện bằng giao diện của app."
          action={{ label: 'Thêm site', onPress: () => navigation.navigate('Addons') }}
        />
      )}
    </WidgetSection>
  );
}

// ─── Truyện đã bookmark ─────────────────────────────────────────────────────

export function BookmarksWidget({ content, limit }: { content: ContentType; limit: number }) {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const bookmarks = useLibrary(s => s.bookmarks);
  const sort = useLibrary(s => s.sort);
  const allowNsfw = useAllowNsfw();
  const headersOf = useSourceHeaders();
  const list = useMemo(
    () =>
      sortBookmarks(
        Object.values(bookmarks).filter(b => b.content === content),
        sort,
      ).slice(0, limit),
    [bookmarks, content, sort, limit],
  );
  const novel = content === 'novel';

  return (
    <WidgetSection
      title={novel ? 'Tiểu thuyết đã lưu' : 'Truyện tranh đã lưu'}
      action={list.length ? { label: 'Xem tất cả', onPress: () => navigation.navigate('Bookmarks', { tab: 'media' }) } : undefined}
    >
      {list.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
          {list.map(b => {
            const badges: CardBadge[] = [];
            if (b.newChapters) {
              badges.push({ text: 'MỚI', color: c.badgeNew });
            }
            if (b.unread) {
              badges.push({ text: String(b.unread), color: c.badgeUnread });
            }
            return (
              <View key={b.key} style={styles.bookmarkCard}>
                <MangaGridItem
                  title={b.title}
                  subtitle={b.latestChapter}
                  cover={b.cover}
                  headers={headersOf(b.sourceId)}
                  badges={badges}
                  blur={!!b.nsfw && !allowNsfw}
                  onPress={() =>
                    navigation.navigate('MangaDetail', { sourceId: b.sourceId, url: b.url, title: b.title, cover: b.cover })
                  }
                />
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <EmptyHint
          text={
            novel
              ? 'Chưa có tiểu thuyết nào được lưu. Mở trang truyện và bấm bookmark để theo dõi chương mới.'
              : 'Chưa có truyện nào được lưu. Mở trang truyện và bấm bookmark để theo dõi chương mới.'
          }
        />
      )}
    </WidgetSection>
  );
}

// ─── Trang web đã đánh dấu ──────────────────────────────────────────────────

export function WebBookmarksWidget({ limit, onOpenUrl }: { limit: number; onOpenUrl: (url: string) => void }) {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const bookmarks = useBrowser(s => s.webBookmarks);
  const shown = bookmarks.slice(0, limit);

  return (
    <WidgetSection
      title="Trang đã đánh dấu"
      action={shown.length ? { label: 'Xem tất cả', onPress: () => navigation.navigate('Bookmarks', { tab: 'web' }) } : undefined}
    >
      {shown.length ? (
        <View style={[styles.card, { backgroundColor: c.surface }]}>
          {shown.map(b => (
            <ListItem
              key={b.id}
              left={<Favicon url={b.url} label={b.title} size={22} />}
              title={b.title || displayUrl(b.url)}
              subtitle={displayUrl(b.url)}
              onPress={() => onOpenUrl(b.url)}
            />
          ))}
        </View>
      ) : (
        <EmptyHint text="Chưa có trang nào được đánh dấu. Khi đang xem trang, mở menu và chọn “Thêm bookmark”." />
      )}
    </WidgetSection>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  pressed: { opacity: 0.7 },
  small: { fontSize: 11 },
  section: { gap: space.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg },
  emptyCard: {
    marginHorizontal: space.md,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
  },
  emptyButton: { alignSelf: 'flex-start' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space.sm },
  tile: { width: '25%', alignItems: 'center', gap: 6, paddingVertical: space.sm },
  tileIcon: {
    width: 54,
    height: 54,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: { borderWidth: 1.5, borderStyle: 'dashed' },
  tileLabel: { fontSize: 12, maxWidth: 76, textAlign: 'center' },
  hList: { paddingHorizontal: space.md, gap: space.sm },
  readingCard: { width: 108, gap: 4 },
  bookmarkCard: { width: 112 },
  siteGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space.md, gap: space.sm },
  site: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    flexBasis: '47%',
    flexGrow: 1,
    maxWidth: '50%',
    padding: space.md,
    borderRadius: radius.lg,
  },
  card: { borderRadius: radius.lg, overflow: 'hidden', marginHorizontal: space.md },
});
