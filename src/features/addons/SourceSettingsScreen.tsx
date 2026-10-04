import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  BookOpen,
  Eye,
  FolderOpen,
  Globe,
  Languages,
  Power,
  SearchX,
  Trash2,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { openInBrowser, useAppNavigation, type RootStackParamList } from '../../app/routes';
import {
  confirm,
  Divider,
  EmptyState,
  FieldLabel,
  Header,
  ListItem,
  Screen,
  Section,
  Segmented,
  SwitchRow,
  TextField,
  toast,
} from '../../components/ui';
import { displayUrl } from '../../lib/url';
import { getEngine, languageName } from '../../sources';
import type { ContentType, SourceConfig } from '../../sources/types';
import { useSettings } from '../../store/useSettings';
import { useSource, useSources } from '../../store/useSources';
import { font, radius, space, useTheme } from '../../theme';
import { LanguageSheet } from './LanguageSheet';
import { Favicon } from '../../components/Favicon';

/** Bỏ "/" thừa ở hai đầu; để trống thì về mặc định "manga". */
function cleanDir(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, '') || 'manga';
}

const CONTENT_OPTIONS: { value: ContentType; label: string }[] = [
  { value: 'manga', label: 'Truyện tranh' },
  { value: 'novel', label: 'Tiểu thuyết' },
];

/** Cài đặt một nguồn (trang settings.html của addon gốc). */
export function SourceSettingsScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'SourceSettings'>>();
  const source = useSource(route.params.sourceId);
  const navigation = useAppNavigation();

  if (!source) {
    return (
      <Screen>
        <Header title="Cài đặt nguồn" />
        <EmptyState
          icon={SearchX}
          title="Không tìm thấy nguồn"
          message="Nguồn này đã bị xoá hoặc chưa được thêm."
          action={{ label: 'Quản lý addon', onPress: () => navigation.navigate('Addons') }}
        />
      </Screen>
    );
  }
  return <SourceSettingsBody source={source} />;
}

function SourceSettingsBody({ source }: { source: SourceConfig }) {
  const navigation = useAppNavigation();
  const { c } = useTheme();
  const updateSource = useSources(s => s.updateSource);
  const removeSource = useSources(s => s.removeSource);
  const newTab = useSettings(s => s.openNativeLinksInNewTab);
  const engine = getEngine(source.engine);
  const [langOpen, setLangOpen] = useState(false);
  // Giữ loại đang chọn cả lúc sheet đóng để tiêu đề không đổi giữa chừng hiệu ứng.
  const [langTarget, setLangTarget] = useState<'site' | 'chapter'>('site');
  const openLang = (target: 'site' | 'chapter') => {
    setLangTarget(target);
    setLangOpen(true);
  };

  // Ô nhập lưu khi rời ô để không ghi store theo từng phím.
  const [name, setName] = useState(source.name);
  const [mangaDir, setMangaDir] = useState(source.options?.mangaDir ?? 'manga');
  const pending = useRef({ id: source.id, name, mangaDir });
  useEffect(() => {
    pending.current = { id: source.id, name, mangaDir };
  });

  const commitName = (text: string) => {
    const value = text.trim();
    if (!value) {
      setName(source.name);
    } else if (value !== source.name) {
      updateSource(source.id, { name: value });
    }
  };

  const commitDir = (text: string) => {
    const value = cleanDir(text);
    setMangaDir(value);
    if (value !== (source.options?.mangaDir ?? 'manga')) {
      updateSource(source.id, { options: { ...source.options, mangaDir: value } });
    }
  };

  // Rời màn khi ô nhập còn focus thì onEndEditing có thể không chạy — lưu nốt ở đây.
  const allowDir = engine.allowCustomSites;
  useEffect(
    () => () => {
      const { id, name: lastName, mangaDir: lastDir } = pending.current;
      const store = useSources.getState();
      const latest = store.sources.find(s => s.id === id);
      if (!latest) {
        return;
      }
      const patch: Partial<SourceConfig> = {};
      if (lastName.trim() && lastName.trim() !== latest.name) {
        patch.name = lastName.trim();
      }
      const dir = cleanDir(lastDir);
      if (allowDir && dir !== (latest.options?.mangaDir ?? 'manga')) {
        patch.options = { ...latest.options, mangaDir: dir };
      }
      if (Object.keys(patch).length) {
        store.updateSource(id, patch);
      }
    },
    [allowDir],
  );

  const remove = async () => {
    const ok = await confirm(
      `Xoá nguồn ${source.name}?`,
      'Truyện đã bookmark và chương đã tải của nguồn này vẫn được giữ, nhưng sẽ không cập nhật được nữa.',
      { confirmText: 'Xoá', destructive: true },
    );
    if (!ok) {
      return;
    }
    // Rời màn trước để không nhấp nháy trạng thái "không tìm thấy nguồn".
    navigation.goBack();
    removeSource(source.id);
    toast(`Đã xoá ${source.name}`);
  };

  const chapterLang = source.options?.chapterLang ?? source.lang;

  return (
    <Screen>
      <Header title={source.name} subtitle="Cài đặt nguồn" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: c.surface }]}>
          <Favicon url={source.baseUrl} label={source.name} size={56} tile />
          <View style={styles.flex}>
            <Text numberOfLines={1} style={[font.heading, { color: c.text }]}>
              {source.name}
            </Text>
            <Text numberOfLines={1} style={[font.caption, { color: c.muted }]}>
              {displayUrl(source.baseUrl)}
            </Text>
            <Text style={[font.caption, { color: c.accent }]}>
              Addon {engine.label}
              {source.builtin ? ' · có sẵn' : ''}
            </Text>
          </View>
        </View>

        <Section title="Thông tin">
          <View style={styles.fields}>
            <FieldLabel>Tên hiển thị</FieldLabel>
            <TextField
              value={name}
              onChangeText={setName}
              onEndEditing={e => commitName(e.nativeEvent.text)}
              placeholder={source.id}
              returnKeyType="done"
            />
            {engine.contents.length > 1 && (
              <>
                <FieldLabel>Loại nội dung</FieldLabel>
                <Segmented
                  options={CONTENT_OPTIONS}
                  value={source.content}
                  onChange={content => updateSource(source.id, { content })}
                />
              </>
            )}
          </View>
          <ListItem
            icon={Languages}
            title="Ngôn ngữ của site"
            subtitle={languageName(source.lang)}
            chevron
            onPress={() => openLang('site')}
          />
          {source.engine === 'mangadex' && (
            <>
              <Divider inset={52} />
              <ListItem
                icon={BookOpen}
                title="Ngôn ngữ chương"
                subtitle={`Chỉ lấy truyện và chương bản ${languageName(chapterLang)}`}
                chevron
                onPress={() => openLang('chapter')}
              />
            </>
          )}
        </Section>

        <Section>
          <SwitchRow
            icon={Power}
            title="Bật nguồn"
            subtitle="Nguồn tắt sẽ không có trong tìm kiếm và không kiểm tra chương mới."
            value={source.enabled}
            onValueChange={enabled => updateSource(source.id, { enabled })}
          />
          <Divider inset={52} />
          <SwitchRow
            icon={Eye}
            title="Nội dung 18+"
            subtitle="Nguồn 18+ chỉ hiện khi đã bật nội dung người lớn trong Cài đặt."
            value={source.nsfw}
            onValueChange={nsfw => updateSource(source.id, { nsfw })}
          />
        </Section>

        {engine.allowCustomSites && (
          <Section
            title="Danh sách truyện"
            footer={`Đường dẫn trang danh sách của theme, ví dụ "manga", "series", "comics". Hiện tải từ ${displayUrl(source.baseUrl)}/${source.options?.mangaDir ?? 'manga'}/`}
          >
            <View style={styles.fields}>
              <FieldLabel>Thư mục danh sách</FieldLabel>
              <TextField
                icon={FolderOpen}
                value={mangaDir}
                onChangeText={setMangaDir}
                onEndEditing={e => commitDir(e.nativeEvent.text)}
                placeholder="manga"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
              />
            </View>
          </Section>
        )}

        <Section>
          <ListItem
            icon={BookOpen}
            title="Mở catalog"
            chevron
            onPress={() => navigation.navigate('Catalog', { sourceId: source.id })}
          />
          <Divider inset={52} />
          <ListItem
            icon={Globe}
            title="Mở trang chủ trên trình duyệt"
            subtitle={displayUrl(source.baseUrl)}
            onPress={() => openInBrowser(navigation, source.baseUrl, { newTab })}
          />
          <Divider inset={52} />
          <ListItem
            icon={Trash2}
            title="Xoá nguồn"
            subtitle={source.builtin ? 'Nguồn có sẵn, không thể xoá — hãy tắt nếu không dùng.' : undefined}
            destructive
            disabled={source.builtin}
            onPress={remove}
          />
        </Section>
      </ScrollView>

      <LanguageSheet
        visible={langOpen}
        onClose={() => setLangOpen(false)}
        value={langTarget === 'chapter' ? chapterLang : source.lang}
        title={langTarget === 'chapter' ? 'Ngôn ngữ chương' : 'Ngôn ngữ của site'}
        onSelect={code =>
          langTarget === 'chapter'
            ? updateSource(source.id, { options: { ...source.options, chapterLang: code } })
            : updateSource(source.id, { lang: code })
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  content: { paddingVertical: space.lg, gap: space.lg },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    marginHorizontal: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
  },
  fields: { paddingHorizontal: space.lg, paddingBottom: space.md },
});
