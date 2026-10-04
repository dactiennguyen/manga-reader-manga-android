import Clipboard from '@react-native-clipboard/clipboard';
import { ArrowUpLeft, BookOpen, Bookmark, Copy, Globe, History, Search, Share2, X } from '../../components/icons';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import type { LucideIcon } from '../../components/icons';
import { Chip, ChipRow, Divider, IconButton, Segmented, toast } from '../../components/ui';
import { displayUrl, ensureScheme, looksLikeUrl } from '../../lib/url';
import { useBrowser } from '../../store/useBrowser';
import { useHistory } from '../../store/useHistory';
import type { SearchCategory, SearchEngineId } from '../../store/useSettings';
import { font, space, useTheme } from '../../theme';
import { Favicon } from '../../components/Favicon';
import { fetchSuggestions, getSearchEngine, SEARCH_ENGINES } from './searchEngines';

const CATEGORY_OPTIONS = [
  { value: 'web' as const, label: 'Web' },
  { value: 'manga' as const, label: 'Truyện' },
];

const MAX_PAGE_MATCHES = 5;

/** Gợi ý từ API của công cụ tìm kiếm: debounce, huỷ request cũ khi gõ tiếp. */
function useRemoteSuggestions(engine: SearchEngineId, query: string): string[] {
  const [items, setItems] = useState<string[]>([]);
  const q = query.trim();
  const enabled = !!q && !looksLikeUrl(q);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchSuggestions(engine, q, controller.signal)
        .then(setItems)
        .catch(() => {});
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [engine, q, enabled]);

  // Giữ gợi ý cũ trong lúc chờ kết quả mới để danh sách không nhấp nháy.
  return enabled ? items : [];
}

type PageMatch = { url: string; title: string; bookmarked: boolean };

export function SuggestionsPanel({
  query,
  category,
  engine,
  currentUrl,
  currentTitle,
  onSubmitText,
  onOpenUrl,
  onFill,
  onChangeCategory,
  onChangeEngine,
}: {
  query: string;
  category: SearchCategory;
  engine: SearchEngineId;
  currentUrl: string;
  currentTitle: string;
  /** Tìm/mở theo chữ (giống bấm Enter). */
  onSubmitText: (text: string) => void;
  onOpenUrl: (url: string) => void;
  /** Điền gợi ý vào ô nhập để sửa tiếp. */
  onFill: (text: string) => void;
  onChangeCategory: (category: SearchCategory) => void;
  onChangeEngine: (engine: SearchEngineId) => void;
}) {
  const { c } = useTheme();
  const q = query.trim();
  const lower = q.toLowerCase();
  const kind = category === 'manga' ? 'manga' : 'web';
  const recent = useHistory(s => (kind === 'manga' ? s.searches : s.webSearches));
  const webHistory = useHistory(s => s.web);
  const bookmarks = useBrowser(s => s.webBookmarks);
  const remote = useRemoteSuggestions(engine, q);
  const engineName = getSearchEngine(engine).name;

  const recentShown = useMemo(
    () => (lower ? recent.filter(s => s.toLowerCase().includes(lower) && s.toLowerCase() !== lower) : recent).slice(0, 8),
    [recent, lower],
  );

  const remoteShown = useMemo(
    () => remote.filter(s => !recentShown.some(r => r.toLowerCase() === s.toLowerCase())),
    [remote, recentShown],
  );

  const pageMatches = useMemo<PageMatch[]>(() => {
    if (!lower || kind !== 'web') {
      return [];
    }
    const out: PageMatch[] = [];
    const seen = new Set<string>();
    const consider = (url: string, title: string, bookmarked: boolean) => {
      if (out.length >= MAX_PAGE_MATCHES || seen.has(url)) {
        return;
      }
      if (url.toLowerCase().includes(lower) || title.toLowerCase().includes(lower)) {
        seen.add(url);
        out.push({ url, title, bookmarked });
      }
    };
    bookmarks.forEach(b => consider(b.url, b.title, true));
    for (const entry of webHistory) {
      if (out.length >= MAX_PAGE_MATCHES) {
        break;
      }
      consider(entry.url, entry.title, false);
    }
    return out;
  }, [lower, kind, bookmarks, webHistory]);

  const removeRecent = (text: string) => useHistory.getState().removeSearch(text, kind);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg }]}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={[styles.options, { backgroundColor: c.surfaceAlt, borderBottomColor: c.border }]}>
          <View style={styles.categoryRow}>
            <Text style={[font.caption, { color: c.muted }]}>Hạng mục tìm kiếm</Text>
            <View style={styles.segmented}>
              <Segmented options={CATEGORY_OPTIONS} value={category} onChange={onChangeCategory} />
            </View>
          </View>
          {category === 'web' && (
            <ChipRow style={styles.engines}>
              {SEARCH_ENGINES.map(e => (
                <Chip key={e.id} label={e.name} selected={e.id === engine} onPress={() => onChangeEngine(e.id)} />
              ))}
            </ChipRow>
          )}
        </View>

        {!q && !!currentUrl && (
          <Row
            left={<Favicon url={currentUrl} label={currentTitle} size={22} />}
            title={currentTitle || displayUrl(currentUrl)}
            subtitle={currentUrl}
            onPress={() => onFill(currentUrl)}
            right={
              <>
                <IconButton
                  icon={Copy}
                  size={18}
                  color={c.muted}
                  accessibilityLabel="Sao chép link"
                  onPress={() => {
                    Clipboard.setString(currentUrl);
                    toast('Đã sao chép link');
                  }}
                />
                <IconButton
                  icon={Share2}
                  size={18}
                  color={c.muted}
                  accessibilityLabel="Chia sẻ link"
                  onPress={() => Share.share({ message: currentUrl }).catch(() => {})}
                />
              </>
            }
          />
        )}

        {!!q && (
          <>
            {kind === 'web' && looksLikeUrl(q) && (
              <Row icon={Globe} title={ensureScheme(q)} subtitle="Mở trang web" onPress={() => onOpenUrl(ensureScheme(q))} />
            )}
            <Row
              icon={kind === 'manga' ? BookOpen : Search}
              title={q}
              subtitle={kind === 'manga' ? 'Tìm truyện trên các nguồn đã thêm' : `Tìm với ${engineName}`}
              onPress={() => onSubmitText(q)}
            />
          </>
        )}

        {recentShown.length > 0 && (
          <>
            {!q && (
              <SectionHeader
                title="Tìm kiếm gần đây"
                action={{ label: 'Xoá tất cả', onPress: () => useHistory.getState().clearSearches(kind) }}
              />
            )}
            {recentShown.map(text => (
              <Row
                key={`r-${text}`}
                icon={History}
                title={text}
                onPress={() => onSubmitText(text)}
                right={
                  <IconButton
                    icon={X}
                    size={18}
                    color={c.muted}
                    accessibilityLabel="Xoá khỏi lịch sử tìm kiếm"
                    onPress={() => removeRecent(text)}
                  />
                }
              />
            ))}
          </>
        )}

        {remoteShown.map(text => (
          <Row
            key={`s-${text}`}
            icon={Search}
            title={text}
            onPress={() => onSubmitText(text)}
            right={
              <IconButton
                icon={ArrowUpLeft}
                size={18}
                color={c.muted}
                accessibilityLabel="Điền vào ô tìm kiếm"
                onPress={() => onFill(text)}
              />
            }
          />
        ))}

        {pageMatches.length > 0 && (
          <>
            <Divider inset={space.lg} />
            {pageMatches.map(match => (
              <Row
                key={`p-${match.url}`}
                icon={match.bookmarked ? Bookmark : undefined}
                left={match.bookmarked ? undefined : <Favicon url={match.url} label={match.title} size={20} />}
                title={match.title || displayUrl(match.url)}
                subtitle={displayUrl(match.url)}
                onPress={() => onOpenUrl(match.url)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, action }: { title: string; action?: { label: string; onPress: () => void } }) {
  const { c } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[font.overline, styles.flex, { color: c.muted }]}>{title}</Text>
      {action && (
        <Pressable onPress={action.onPress} hitSlop={8}>
          <Text style={[font.caption, styles.bold, { color: c.accent }]}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

function Row({
  icon: Icon,
  left,
  title,
  subtitle,
  right,
  onPress,
}: {
  icon?: LucideIcon;
  left?: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} android_ripple={{ color: c.border }} style={styles.row}>
      <View style={styles.rowIcon}>{left ?? (Icon && <Icon size={19} color={c.muted} />)}</View>
      <View style={styles.flex}>
        <Text numberOfLines={1} style={[font.body, { color: c.text }]}>
          {title}
        </Text>
        {!!subtitle && (
          <Text numberOfLines={1} style={[font.caption, { color: c.muted }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space.xl },
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  options: { paddingTop: space.md, gap: space.xs, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: space.xs },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg },
  segmented: { flex: 1, maxWidth: 220, marginLeft: 'auto' },
  engines: { paddingHorizontal: space.lg },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 50,
    paddingLeft: space.lg,
    paddingRight: space.xs,
    paddingVertical: 4,
  },
  rowIcon: { width: 24, alignItems: 'center' },
});
