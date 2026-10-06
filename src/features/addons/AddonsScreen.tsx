import { useFocusEffect } from '@react-navigation/native';
import { memo, useCallback, useMemo, useState } from 'react';
import { BackHandler, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppNavigation } from '../../app/routes';
import { Favicon } from '../../components/Favicon';
import { ChevronDown, EyeOff, Plus, Puzzle, Search, Settings2 } from '../../components/icons';
import {
  Button,
  Checkbox,
  Chip,
  ChipRow,
  Divider,
  EmptyState,
  Header,
  IconButton,
  Screen,
  SearchField,
} from '../../components/ui';
import { getHost } from '../../lib/url';
import { languageName, useEngineSummaries } from '../../sources';
import { CATALOG_NOTES, catalogSite, catalogSources } from '../../sources/catalog';
import type { ContentType, EngineId, SourceConfig } from '../../sources/types';
import { useAllowNsfw } from '../../store/useSettings';
import { useSources } from '../../store/useSources';
import { font, radius, space, useTheme } from '../../theme';
import { LanguageSheet } from './LanguageSheet';

const CONTENT_FILTERS: { value: ContentType; label: string }[] = [
  { value: 'manga', label: 'Truyện tranh' },
  { value: 'novel', label: 'Tiểu thuyết' },
];


export function AddonsScreen() {
  const navigation = useAppNavigation();
  const { c } = useTheme();
  const stored = useSources(s => s.sources);
  const customEngines = useEngineSummaries().filter(e => e.allowCustomSites);
  const updateSource = useSources(s => s.updateSource);
  const sources = useMemo(() => {
    const byId = new Map(catalogSources().map(s => [s.id, s]));
    for (const s of stored) {
      byId.set(s.id, s);
    }
    return [...byId.values()];
  }, [stored]);
  const allowNsfw = useAllowNsfw();
  const [content, setContent] = useState<ContentType | null>(null);
  const [lang, setLang] = useState<string | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [text, setText] = useState('');

  const languages = useMemo(
    () =>
      [...new Set(sources.filter(s => allowNsfw || !s.nsfw).map(s => s.lang))].sort((a, b) =>
        languageName(a).localeCompare(languageName(b)),
      ),
    [sources, allowNsfw],
  );
  const activeLang = lang && languages.includes(lang) ? lang : null;
  const q = searching ? text.trim().toLowerCase() : '';
  const filtered = !!content || !!activeLang || !!q;

  const { shown, hiddenNsfw } = useMemo(() => {
    const matching = sources.filter(
      s =>
        (!content || s.content === content) &&
        (!activeLang || s.lang === activeLang) &&
        (!q || s.name.toLowerCase().includes(q) || s.id.includes(q)),
    );
    const visible = matching
      .filter(s => allowNsfw || !s.nsfw)
      .sort((a, b) => a.name.localeCompare(b.name));
    return { shown: visible, hiddenNsfw: matching.length - visible.length };
  }, [sources, content, activeLang, q, allowNsfw]);

  const closeSearch = useCallback(() => {
    setSearching(false);
    setText('');
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!searching) {
        return;
      }
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        closeSearch();
        return true;
      });
      return () => sub.remove();
    }, [searching, closeSearch]),
  );

  const addSite = useCallback(
    (engine?: EngineId) => navigation.navigate('AddSite', engine ? { engine } : undefined),
    [navigation],
  );
  const openSource = useCallback(
    (source: SourceConfig) => navigation.navigate('Catalog', { sourceId: source.id }),
    [navigation],
  );
  const openSettings = useCallback(
    (source: SourceConfig) => navigation.navigate('SourceSettings', { sourceId: source.id }),
    [navigation],
  );
  const toggleSource = useCallback(
    (source: SourceConfig, enabled: boolean) => updateSource(source.id, { enabled }),
    [updateSource],
  );
  const clearFilters = () => {
    setContent(null);
    setLang(null);
    setText('');
  };

  const empty = sources.length ? (
    <View style={styles.noMatch}>
      <Text style={[font.body, styles.center, { color: c.muted }]}>Không có site nào khớp bộ lọc.</Text>
      {filtered && <Button title="Bỏ lọc" variant="ghost" small onPress={clearFilters} />}
    </View>
  ) : (
    <EmptyState
      icon={Puzzle}
      title="Chưa có site nào"
      message="Thêm domain của site dùng theme được hỗ trợ để đọc truyện bằng giao diện native."
      action={{ label: 'Thêm site', icon: Plus, onPress: () => addSite() }}
    />
  );

  const footer = (
    <View style={[styles.footer, { borderTopColor: c.border }]}>
      {hiddenNsfw > 0 && (
        <Pressable
          onPress={() => navigation.navigate('Settings')}
          style={[styles.note, { backgroundColor: c.surfaceAlt }]}
        >
          <EyeOff size={16} color={c.muted} />
          <Text style={[font.caption, styles.flex, { color: c.textSecondary }]}>
            {hiddenNsfw} site 18+ đang ẩn — bật nội dung 18+ trong Cài đặt
          </Text>
        </Pressable>
      )}
      <Text style={[font.caption, styles.explain, { color: c.muted }]}>
        Mỗi addon hiểu cấu trúc HTML của một loại theme: khi bạn mở các site này trong trình duyệt, app hiển thị danh
        sách, thông tin truyện và ảnh chương bằng giao diện native, không quảng cáo. Đánh dấu để ghim site vào trang
        chủ và Bookmark › Site truyện; nhấn giữ để mở cài đặt nguồn. Site không có trong danh sách nhưng dùng cùng
        theme thì thêm bằng nút bên dưới.
      </Text>
      <Text style={[font.overline, { color: c.muted }]}>Thêm site theo theme</Text>
      <View style={styles.engines}>
        {customEngines.map(engine => (
          <Chip key={engine.id} icon={Plus} label={engine.label} onPress={() => addSite(engine.id)} />
        ))}
      </View>
    </View>
  );

  return (
    <Screen>
      {searching ? (
        <Header onBack={closeSearch}>
          <SearchField
            value={text}
            onChangeText={setText}
            onClear={() => setText('')}
            autoFocus
            placeholder="Tìm site theo tên hoặc domain"
            style={[styles.headerSearch, { backgroundColor: c.appBarField }]}
            inputStyle={{ color: c.onAppBar }}
          />
        </Header>
      ) : (
        <Header
          title="Site được hỗ trợ"
          right={
            <>
              <IconButton
                icon={Search}
                color={c.onAppBar}
                onPress={() => setSearching(true)}
                accessibilityLabel="Tìm site"
              />
              <IconButton icon={Plus} color={c.onAppBar} onPress={() => addSite()} accessibilityLabel="Thêm site" />
              <IconButton
                icon={Settings2}
                color={c.onAppBar}
                onPress={() => navigation.navigate('AddonManager')}
                accessibilityLabel="Quản lý addon"
              />
            </>
          }
        />
      )}

      <View style={[styles.chips, { borderBottomColor: c.border }]}>
        <ChipRow style={styles.chipRow}>
          <DropdownChip
            label={activeLang ? languageName(activeLang) : 'Mọi ngôn ngữ'}
            selected={!!activeLang}
            onPress={() => setLangOpen(true)}
          />
          {CONTENT_FILTERS.map(option => (
            <Chip
              key={option.value}
              label={option.label}
              selected={content === option.value}
              onPress={() => setContent(current => (current === option.value ? null : option.value))}
            />
          ))}
        </ChipRow>
      </View>

      <FlatList
        data={shown}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <SourceRow source={item} onOpen={openSource} onSettings={openSettings} onToggle={toggleSource} />
        )}
        ItemSeparatorComponent={Divider}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
      />

      <LanguageSheet
        visible={langOpen}
        onClose={() => setLangOpen(false)}
        value={activeLang ?? ''}
        codes={languages}
        allLabel="Mọi ngôn ngữ"
        title="Ngôn ngữ của site"
        onSelect={code => setLang(code || null)}
      />
    </Screen>
  );
}

function DropdownChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const fg = selected ? c.onPrimaryContainer : c.textSecondary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ngôn ngữ: ${label}`}
      style={({ pressed }) => [
        styles.dropdown,
        selected ? { backgroundColor: c.primaryContainer, borderColor: c.primaryContainer } : { borderColor: c.border },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.dropdownLabel, { color: fg }]}>{label}</Text>
      <ChevronDown size={16} color={fg} />
    </Pressable>
  );
}

const SourceRow = memo(function SourceRowItem({
  source,
  onOpen,
  onSettings,
  onToggle,
}: {
  source: SourceConfig;
  onOpen: (source: SourceConfig) => void;
  onSettings: (source: SourceConfig) => void;
  onToggle: (source: SourceConfig, enabled: boolean) => void;
}) {
  const { c } = useTheme();
  const note = catalogSite(source.id)?.note;
  return (
    <Pressable
      onPress={() => onOpen(source)}
      onLongPress={() => onSettings(source)}
      android_ripple={{ color: c.border }}
      style={styles.row}
    >
      <View>
        <Favicon url={source.baseUrl} label={source.name} size={40} tile />
        <View style={[styles.type, { backgroundColor: c.badgeType }]}>
          <Text style={styles.typeText}>{source.content === 'novel' ? 'N' : 'M'}</Text>
        </View>
      </View>
      <View style={styles.flex}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={[font.body, styles.name, { color: c.text }]}>
            {source.name}
          </Text>
          {source.nsfw && (
            <View style={[styles.nsfw, { backgroundColor: c.dangerSoft }]}>
              <Text style={[styles.nsfwText, { color: c.danger }]}>18+</Text>
            </View>
          )}
        </View>
        <Text numberOfLines={1} style={[font.caption, { color: c.muted }]}>
          {getHost(source.baseUrl)} | {languageName(source.lang)}
        </Text>
        {note && (
          <Text numberOfLines={1} style={[font.caption, { color: c.warning }]}>
            {CATALOG_NOTES[note]}
          </Text>
        )}
      </View>
      <Checkbox checked={source.enabled} onChange={enabled => onToggle(source, enabled)} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  pressed: { opacity: 0.8 },
  headerSearch: { marginRight: space.sm },
  chips: { borderBottomWidth: StyleSheet.hairlineWidth },
  chipRow: { flexGrow: 1, justifyContent: 'center' },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 32,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  dropdownLabel: { fontSize: 13, fontWeight: '500' },
  list: { flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    minHeight: 68,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  type: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 16,
    height: 16,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, fontWeight: '500' },
  nsfw: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: radius.sm },
  nsfwText: { fontSize: 10, fontWeight: '800' },
  noMatch: { alignItems: 'center', gap: space.md, padding: space.xl },
  footer: {
    gap: space.sm,
    marginTop: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    borderRadius: radius.md,
  },
  explain: { lineHeight: 18 },
  engines: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
