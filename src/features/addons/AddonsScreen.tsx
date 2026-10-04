import { EyeOff, Info, Plus, Puzzle, Settings } from 'lucide-react-native';
import { memo, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { useAppNavigation } from '../../app/routes';
import {
  Badge,
  Chip,
  ChipRow,
  Divider,
  EmptyState,
  Header,
  IconButton,
  Screen,
  Section,
  Segmented,
} from '../../components/ui';
import { getHost } from '../../lib/url';
import { ENGINE_LIST, languageName } from '../../sources';
import type { ContentType, Engine, EngineId, SourceConfig } from '../../sources/types';
import { useAllowNsfw } from '../../store/useSettings';
import { useSources } from '../../store/useSources';
import { font, radius, space, useTheme } from '../../theme';
import { Favicon } from '../../components/Favicon';

type ContentFilter = 'all' | ContentType;

const CONTENT_FILTERS: { value: ContentFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'manga', label: 'Truyện tranh' },
  { value: 'novel', label: 'Tiểu thuyết' },
];

const CONTENT_LABEL: Record<ContentType, string> = { manga: 'Truyện tranh', novel: 'Tiểu thuyết' };

type EngineGroup = {
  engine: Engine;
  /** Số site của engine, không tính bộ lọc. */
  total: number;
  visible: SourceConfig[];
};

/** "Manage add-ons": các addon (engine) và site đang dùng chúng. */
export function AddonsScreen() {
  const navigation = useAppNavigation();
  const { c } = useTheme();
  const sources = useSources(s => s.sources);
  const updateSource = useSources(s => s.updateSource);
  const allowNsfw = useAllowNsfw();
  const [content, setContent] = useState<ContentFilter>('all');
  const [lang, setLang] = useState<string | null>(null);

  const languages = useMemo(
    () =>
      [...new Set(sources.filter(s => allowNsfw || !s.nsfw).map(s => s.lang))].sort((a, b) =>
        languageName(a).localeCompare(languageName(b)),
      ),
    [sources, allowNsfw],
  );
  // Ngôn ngữ đã chọn không còn site nào (vừa xoá/ẩn) thì coi như bỏ lọc.
  const activeLang = lang && languages.includes(lang) ? lang : null;

  const { groups, hiddenNsfw } = useMemo(() => {
    let hidden = 0;
    const list: EngineGroup[] = ENGINE_LIST.filter(e => content === 'all' || e.contents.includes(content)).map(
      engine => {
        const own = sources.filter(s => s.engine === engine.id);
        const matching = own.filter(
          s => (content === 'all' || s.content === content) && (!activeLang || s.lang === activeLang),
        );
        const visible = matching.filter(s => allowNsfw || !s.nsfw);
        hidden += matching.length - visible.length;
        return { engine, total: own.length, visible };
      },
    );
    return { groups: list, hiddenNsfw: hidden };
  }, [sources, content, activeLang, allowNsfw]);

  const addSite = (engine?: EngineId) => navigation.navigate('AddSite', engine ? { engine } : undefined);

  return (
    <Screen>
      <Header
        title="Addon & nguồn truyện"
        subtitle={`${sources.length} nguồn`}
        right={<IconButton icon={Plus} onPress={() => addSite()} accessibilityLabel="Thêm site" />}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.intro, { backgroundColor: c.surface }]}>
          <View style={[styles.introIcon, { backgroundColor: c.accentSoft }]}>
            <Info size={20} color={c.accent} />
          </View>
          <View style={styles.flex}>
            <Text style={[font.label, { color: c.text }]}>Addon hoạt động thế nào?</Text>
            <Text style={[font.caption, styles.introText, { color: c.textSecondary }]}>
              Mỗi addon hiểu cấu trúc HTML của một loại theme. App tải trang của site, trích danh sách, thông tin
              truyện và ảnh chương rồi hiển thị bằng giao diện native — gọn và không quảng cáo. App không đóng gói
              sẵn site: hãy thêm domain của site dùng theme được hỗ trợ.
            </Text>
          </View>
        </View>

        <View style={styles.filters}>
          <Segmented options={CONTENT_FILTERS} value={content} onChange={setContent} />
        </View>
        {languages.length > 1 && (
          <ChipRow style={styles.chips}>
            <Chip label="Mọi ngôn ngữ" selected={!activeLang} onPress={() => setLang(null)} />
            {languages.map(code => (
              <Chip
                key={code}
                label={languageName(code)}
                selected={activeLang === code}
                onPress={() => setLang(code)}
              />
            ))}
          </ChipRow>
        )}

        {hiddenNsfw > 0 && (
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            style={[styles.nsfwNote, { backgroundColor: c.surfaceAlt }]}
          >
            <EyeOff size={16} color={c.muted} />
            <Text style={[font.caption, styles.flex, { color: c.textSecondary }]}>
              Một số nguồn 18+ đang ẩn — bật trong Cài đặt
            </Text>
          </Pressable>
        )}

        {groups.map(group => (
          <EngineSection
            key={group.engine.id}
            group={group}
            onAdd={() => addSite(group.engine.id)}
            onOpen={source => navigation.navigate('Catalog', { sourceId: source.id })}
            onSettings={source => navigation.navigate('SourceSettings', { sourceId: source.id })}
            onToggle={(source, enabled) => updateSource(source.id, { enabled })}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

function EngineSection({
  group,
  onAdd,
  onOpen,
  onSettings,
  onToggle,
}: {
  group: EngineGroup;
  onAdd: () => void;
  onOpen: (source: SourceConfig) => void;
  onSettings: (source: SourceConfig) => void;
  onToggle: (source: SourceConfig, enabled: boolean) => void;
}) {
  const { c } = useTheme();
  const { engine, total, visible } = group;
  const showContent = engine.contents.length > 1;

  return (
    <Section>
      <View style={styles.engineHead}>
        <View style={[styles.engineIcon, { backgroundColor: c.accentSoft }]}>
          <Puzzle size={20} color={c.accent} />
        </View>
        <View style={styles.flex}>
          <Text style={[font.label, { color: c.text }]}>{engine.label}</Text>
          <Text style={[font.caption, { color: c.muted }]}>
            {engine.contents.map(t => CONTENT_LABEL[t]).join(' · ')} · {total} site
          </Text>
        </View>
        {engine.allowCustomSites && total > 0 && (
          <IconButton icon={Plus} size={20} onPress={onAdd} accessibilityLabel={`Thêm site ${engine.label}`} />
        )}
      </View>
      <Text style={[font.caption, styles.engineDesc, { color: c.textSecondary }]}>{engine.description}</Text>

      {visible.map(source => (
        <View key={source.id}>
          <Divider inset={space.lg} />
          <SourceRow
            source={source}
            showContent={showContent}
            onOpen={onOpen}
            onSettings={onSettings}
            onToggle={onToggle}
          />
        </View>
      ))}

      {total === 0 && engine.allowCustomSites && (
        <>
          <Divider inset={space.lg} />
          <EmptyState
            title="Chưa có site nào"
            message={`Thêm domain của site dùng theme ${engine.label} để đọc bằng addon này.`}
            action={{ label: 'Thêm site dùng theme này', icon: Plus, onPress: onAdd }}
            style={styles.inlineEmpty}
          />
        </>
      )}
      {total > 0 && !visible.length && (
        <Text style={[font.caption, styles.noMatch, { color: c.muted }]}>Không có site nào khớp bộ lọc.</Text>
      )}
    </Section>
  );
}

const SourceRow = memo(function SourceRowItem({
  source,
  showContent,
  onOpen,
  onSettings,
  onToggle,
}: {
  source: SourceConfig;
  showContent: boolean;
  onOpen: (source: SourceConfig) => void;
  onSettings: (source: SourceConfig) => void;
  onToggle: (source: SourceConfig, enabled: boolean) => void;
}) {
  const { c } = useTheme();
  const meta = [getHost(source.baseUrl), languageName(source.lang)];
  if (showContent) {
    meta.push(CONTENT_LABEL[source.content]);
  }
  if (!source.enabled) {
    meta.push('Đã tắt');
  }
  return (
    <Pressable
      onPress={() => onOpen(source)}
      android_ripple={{ color: c.border }}
      style={styles.sourceRow}
    >
      <View style={[styles.sourceInfo, !source.enabled && styles.disabled]}>
        <Favicon url={source.baseUrl} label={source.name} size={36} tile />
        <View style={styles.flex}>
          <View style={styles.nameRow}>
            <Text numberOfLines={1} style={[font.body, styles.name, { color: c.text }]}>
              {source.name}
            </Text>
            {source.nsfw && <Badge text="18+" color={c.danger} />}
          </View>
          <Text numberOfLines={1} style={[font.caption, { color: c.muted }]}>
            {meta.join(' · ')}
          </Text>
        </View>
      </View>
      <IconButton
        icon={Settings}
        size={20}
        color={c.muted}
        onPress={() => onSettings(source)}
        accessibilityLabel={`Cài đặt ${source.name}`}
      />
      <Switch
        value={source.enabled}
        onValueChange={enabled => onToggle(source, enabled)}
        trackColor={{ true: c.accent, false: c.border }}
        thumbColor={Platform.OS === 'android' ? c.surface : undefined}
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingVertical: space.md, gap: space.lg },
  intro: {
    flexDirection: 'row',
    gap: space.md,
    marginHorizontal: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
  },
  introIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  introText: { marginTop: 4, lineHeight: 18 },
  filters: { paddingHorizontal: space.md },
  chips: { paddingVertical: 0 },
  nsfwNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    borderRadius: radius.md,
  },
  engineHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.lg,
    paddingRight: space.xs,
    paddingTop: space.md,
  },
  engineIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  engineDesc: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.md, lineHeight: 18 },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 60,
    paddingLeft: space.lg,
    paddingRight: space.md,
    paddingVertical: space.sm,
  },
  sourceInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  disabled: { opacity: 0.55 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { flexShrink: 1, fontWeight: '600' },
  inlineEmpty: { flex: 0, paddingVertical: space.lg },
  noMatch: { paddingHorizontal: space.lg, paddingBottom: space.md },
});
