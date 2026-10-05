import { useRoute, type RouteProp } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, Text, View } from 'react-native';

import { openInBrowser, useAppNavigation, type RootStackParamList } from '../../app/routes';
import { ErrorView } from '../../components/ErrorView';
import { Cover } from '../../components/MangaCard';
import {
  BookOpen,
  CircleCheck,
  Globe,
  Info,
  Languages,
  ListChecks,
  Save,
  Settings,
  TriangleAlert,
} from '../../components/icons';
import {
  Button,
  Checkbox,
  FieldLabel,
  ListItem,
  Radio,
  Header,
  Screen,
  Section,
  Segmented,
  TextField,
  toast,
} from '../../components/ui';
import { ensureScheme, getHost, getOrigin, looksLikeUrl } from '../../lib/url';
import { getEngine, languageName, useEngineSummaries } from '../../sources';
import type { ContentType, EngineId, MangaItem, SourceConfig } from '../../sources/types';
import { getSource, useSources } from '../../store/useSources';
import { font, radius, space, useTheme } from '../../theme';
import { useRequestToken } from '../catalog/useRequestToken';
import { LanguageSheet } from './LanguageSheet';
import { probeSite, type SiteProbe } from './siteProbe';
import { Favicon } from '../../components/Favicon';


const CONTENT_OPTIONS: { value: ContentType; label: string }[] = [
  { value: 'manga', label: 'Truyện tranh' },
  { value: 'novel', label: 'Tiểu thuyết' },
];

type SiteForm = Omit<SiteProbe, 'engine'> & { engine: EngineId | null };

type TestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; items: MangaItem[] }
  | { status: 'error'; error: unknown };

/** Bỏ "/" thừa ở hai đầu; để trống thì dùng "manga" như theme mặc định. */
function cleanDir(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, '') || 'manga';
}

/** Loại nội dung phải nằm trong các loại engine hỗ trợ. */
function fitContent(engine: EngineId | null, content: ContentType): ContentType {
  if (!engine) {
    return content;
  }
  const contents = getEngine(engine).contents;
  return contents.includes(content) ? content : contents[0];
}

function toSource(form: SiteForm & { engine: EngineId }): SourceConfig {
  return {
    id: form.host,
    engine: form.engine,
    name: form.name.trim() || form.host,
    baseUrl: form.baseUrl,
    content: fitContent(form.engine, form.content),
    lang: form.lang,
    nsfw: form.nsfw,
    enabled: true,
    addedAt: Date.now(),
    options: { mangaDir: cleanDir(form.mangaDir) },
  };
}

/** "Add supported site": thêm domain dùng theme Madara/MangaThemesia. */
export function AddSiteScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'AddSite'>>();
  const initialUrl = route.params?.url;
  const preferredEngine = route.params?.engine;
  const navigation = useAppNavigation();
  const { c } = useTheme();
  const customEngines = useEngineSummaries().filter(e => e.allowCustomSites);
  const addSource = useSources(s => s.addSource);

  const [input, setInput] = useState(initialUrl ?? '');
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<unknown>();
  const [existing, setExisting] = useState<SourceConfig>();
  const [detected, setDetected] = useState<EngineId | null>(null);
  const [form, setForm] = useState<SiteForm>();
  const [test, setTest] = useState<TestState>({ status: 'idle' });
  const [langOpen, setLangOpen] = useState(false);
  const probeToken = useRequestToken();
  const testToken = useRequestToken();
  const autoChecked = useRef(false);

  const resetResult = useCallback(() => {
    setForm(undefined);
    setExisting(undefined);
    setCheckError(undefined);
    setDetected(null);
    setTest({ status: 'idle' });
    testToken.invalidate();
  }, [testToken]);

  const check = useCallback(
    async (raw: string) => {
      const value = raw.trim();
      Keyboard.dismiss();
      resetResult();
      if (!looksLikeUrl(value)) {
        probeToken.invalidate();
        setChecking(false);
        setCheckError(new Error('Nhập địa chỉ site hợp lệ, ví dụ: example.com'));
        return;
      }
      const t = probeToken.next();
      const found = getSource(getHost(ensureScheme(value)));
      if (found) {
        setChecking(false);
        setExisting(found);
        return;
      }
      setChecking(true);
      try {
        const probe = await probeSite(value);
        if (!probeToken.isCurrent(t)) {
          return;
        }
        const duplicate = getSource(probe.host);
        if (duplicate) {
          setExisting(duplicate);
          return;
        }
        const engine = probe.engine ?? preferredEngine ?? null;
        setDetected(probe.engine);
        setForm({ ...probe, engine, content: fitContent(engine, probe.content) });
      } catch (error) {
        if (probeToken.isCurrent(t)) {
          setCheckError(error);
        }
      } finally {
        if (probeToken.isCurrent(t)) {
          setChecking(false);
        }
      }
    },
    [preferredEngine, probeToken, resetResult],
  );

  // Mở từ trình duyệt ("thêm site này") thì kiểm tra luôn.
  useEffect(() => {
    if (!initialUrl || autoChecked.current) {
      return;
    }
    autoChecked.current = true;
    check(initialUrl);
    return () => {
      autoChecked.current = false;
    };
  }, [initialUrl, check]);

  /** Không tải được trang chủ (Cloudflare…) vẫn cho tự thiết lập. */
  const setupManually = () => {
    const baseUrl = getOrigin(ensureScheme(input.trim()));
    const host = getHost(baseUrl);
    if (!host) {
      return;
    }
    setCheckError(undefined);
    const label = host.split('.')[0] ?? host;
    setForm({
      baseUrl,
      host,
      engine: preferredEngine ?? null,
      name: label.charAt(0).toUpperCase() + label.slice(1),
      mangaDir: 'manga',
      lang: 'en',
      nsfw: false,
      content: fitContent(preferredEngine ?? null, 'manga'),
    });
  };

  const updateForm = (patch: Partial<SiteForm>) => {
    setForm(prev => {
      if (!prev) {
        return prev;
      }
      const next = { ...prev, ...patch };
      next.content = fitContent(next.engine, next.content);
      return next;
    });
    // Đổi theme/thư mục/loại thì kết quả thử cũ không còn đúng.
    if ('engine' in patch || 'mangaDir' in patch || 'content' in patch) {
      testToken.invalidate();
      setTest({ status: 'idle' });
    }
  };

  const runTest = async () => {
    if (!form?.engine) {
      return;
    }
    const src = toSource({ ...form, engine: form.engine });
    const t = testToken.next();
    setTest({ status: 'loading' });
    try {
      const page = await getEngine(src.engine).list(src, 'latest', 1);
      if (testToken.isCurrent(t)) {
        setTest({ status: 'done', items: page.items });
      }
    } catch (error) {
      if (testToken.isCurrent(t)) {
        setTest({ status: 'error', error });
      }
    }
  };

  const save = () => {
    if (!form?.engine) {
      toast('Chọn theme (addon) cho site trước.');
      return;
    }
    const duplicate = getSource(form.host);
    if (duplicate) {
      setExisting(duplicate);
      toast('Site này đã có trong danh sách.');
      return;
    }
    const source = toSource({ ...form, engine: form.engine });
    addSource(source);
    toast(`Đã thêm ${source.name}`);
    navigation.replace('Catalog', { sourceId: source.id });
  };

  const engine = form?.engine ? getEngine(form.engine) : undefined;
  const headers = useMemo(
    () => (form?.engine ? getEngine(form.engine).imageHeaders(toSource({ ...form, engine: form.engine })) : undefined),
    [form],
  );

  return (
    <Screen>
      <Header title="Thêm site được hỗ trợ" subtitle={customEngines.map(e => e.label).join(' · ')} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.block}>
          <FieldLabel>Địa chỉ site</FieldLabel>
          <TextField
            icon={Globe}
            value={input}
            onChangeText={setInput}
            onClear={() => setInput('')}
            placeholder="Nhập địa chỉ site, ví dụ: example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            autoFocus={!initialUrl}
            onSubmitEditing={() => check(input)}
          />
          <Button
            title="Kiểm tra"
            icon={ListChecks}
            loading={checking}
            disabled={!input.trim()}
            onPress={() => check(input)}
            style={styles.checkButton}
          />
        </View>

        {!form && !existing && !checkError && !checking && (
          <View style={[styles.tip, { backgroundColor: c.surface }]}>
            <Info size={20} color={c.accent} />
            <Text style={[font.body, styles.flex, { color: c.textSecondary }]}>
              App sẽ tải trang chủ để nhận diện theme WordPress (Madara hoặc MangaThemesia), tên site, ngôn ngữ và
              thư mục danh sách truyện. Site dùng đúng theme thì đọc được bằng giao diện native.
            </Text>
          </View>
        )}

        {checking && (
          <Text style={[font.body, styles.center, { color: c.muted }]}>Đang tải trang chủ và nhận diện theme…</Text>
        )}

        {!!checkError && (
          <View style={[styles.card, { backgroundColor: c.surface }]}>
            <ErrorView error={checkError} onRetry={() => check(input)} style={styles.inline} />
            {looksLikeUrl(input.trim()) && (
              <Button title="Vẫn thiết lập thủ công" variant="ghost" small onPress={setupManually} style={styles.manual} />
            )}
          </View>
        )}

        {existing && (
          <View style={[styles.card, styles.existing, { backgroundColor: c.surface }]}>
            <View style={styles.row}>
              <Favicon url={existing.baseUrl} label={existing.name} size={40} tile />
              <View style={styles.flex}>
                <Text style={[font.label, { color: c.text }]}>Site đã có trong danh sách</Text>
                <Text style={[font.caption, { color: c.muted }]}>
                  {existing.name} · {existing.id}
                </Text>
              </View>
            </View>
            <View style={styles.actions}>
              <Button
                title="Cài đặt nguồn"
                icon={Settings}
                variant="secondary"
                small
                onPress={() => navigation.navigate('SourceSettings', { sourceId: existing.id })}
              />
              <Button
                title="Mở catalog"
                icon={BookOpen}
                small
                onPress={() => navigation.navigate('Catalog', { sourceId: existing.id })}
              />
            </View>
          </View>
        )}

        {form && (
          <>
            <View style={[styles.card, styles.detected, { backgroundColor: c.surface }]}>
              <Favicon url={form.baseUrl} label={form.name} size={44} tile />
              <View style={styles.flex}>
                <Text numberOfLines={1} style={[font.label, { color: c.text }]}>
                  {form.host}
                </Text>
                <View style={styles.row}>
                  {detected ? (
                    <CircleCheck size={14} color={c.success} />
                  ) : (
                    <TriangleAlert size={14} color={c.warning} />
                  )}
                  <Text style={[font.caption, styles.flex, { color: detected ? c.success : c.warning }]}>
                    {detected
                      ? `Nhận diện được theme ${getEngine(detected).label}`
                      : 'Không nhận diện được theme — chọn thủ công'}
                  </Text>
                </View>
              </View>
            </View>

            <Section title="Theme (addon)" footer={engine?.description}>
              {customEngines.map(e => (
                <Radio
                  key={e.id}
                  selected={form.engine === e.id}
                  label={e.label}
                  description={e.id === detected ? 'Nhận diện tự động' : undefined}
                  onPress={() => updateForm({ engine: e.id })}
                />
              ))}
            </Section>

            <Section title="Thông tin site">
              <View style={styles.fields}>
                <FieldLabel>Tên site</FieldLabel>
                <TextField value={form.name} onChangeText={name => updateForm({ name })} placeholder={form.host} />
                {engine && engine.contents.length > 1 && (
                  <>
                    <FieldLabel>Loại nội dung</FieldLabel>
                    <Segmented
                      options={CONTENT_OPTIONS}
                      value={form.content}
                      onChange={content => updateForm({ content })}
                    />
                  </>
                )}
                <FieldLabel>Thư mục danh sách truyện</FieldLabel>
                <TextField
                  value={form.mangaDir}
                  onChangeText={mangaDir => updateForm({ mangaDir })}
                  placeholder="manga"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={[font.caption, styles.hint, { color: c.muted }]}>
                  Danh sách sẽ tải từ {form.host}/{cleanDir(form.mangaDir)}/
                </Text>
              </View>
              <ListItem
                icon={Languages}
                title="Ngôn ngữ"
                subtitle={languageName(form.lang)}
                chevron
                onPress={() => setLangOpen(true)}
              />
              <View style={styles.checkbox}>
                <Checkbox checked={form.nsfw} onChange={nsfw => updateForm({ nsfw })} label="Site có nội dung 18+" />
              </View>
            </Section>

            <Section
              title="Thử tải danh sách"
              footer="Nên thử trước khi lưu để chắc addon đọc được site này."
            >
              <View style={styles.testBox}>
                <Button
                  title="Thử tải danh sách"
                  icon={ListChecks}
                  variant="secondary"
                  loading={test.status === 'loading'}
                  disabled={!form.engine}
                  onPress={runTest}
                />
                {test.status === 'done' &&
                  (test.items.length ? (
                    <>
                      <Text style={[font.label, { color: c.success }]}>
                        Đọc được {test.items.length} truyện ở trang đầu
                      </Text>
                      <View style={styles.samples}>
                        {test.items.slice(0, 4).map(item => (
                          <View key={item.url} style={styles.sample}>
                            <Cover uri={item.cover} headers={headers} blur={form.nsfw} />
                            <Text numberOfLines={2} style={[font.caption, { color: c.textSecondary }]}>
                              {item.title}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </>
                  ) : (
                    <Text style={[font.body, { color: c.warning }]}>
                      Không tìm thấy truyện nào. Kiểm tra lại theme hoặc thư mục danh sách.
                    </Text>
                  ))}
                {test.status === 'error' && (
                  <ErrorView error={test.error} onRetry={runTest} style={styles.inline} />
                )}
              </View>
            </Section>
          </>
        )}
      </ScrollView>

      {form && (
        <View style={[styles.footer, { backgroundColor: c.surface, borderTopColor: c.border }]}>
          <Button
            title="Mở trang"
            icon={Globe}
            variant="secondary"
            onPress={() => openInBrowser(navigation, form.baseUrl)}
          />
          <Button title="Lưu" icon={Save} disabled={!form.engine} onPress={save} style={styles.flex} />
        </View>
      )}

      {form && (
        <LanguageSheet
          visible={langOpen}
          onClose={() => setLangOpen(false)}
          value={form.lang}
          onSelect={lang => updateForm({ lang })}
          title="Ngôn ngữ của site"
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center', paddingHorizontal: space.xl },
  content: { paddingBottom: space.xl, gap: space.lg },
  block: { paddingHorizontal: space.lg },
  checkButton: { marginTop: space.md },
  tip: {
    flexDirection: 'row',
    gap: space.md,
    marginHorizontal: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
  },
  card: { marginHorizontal: space.md, borderRadius: radius.lg, overflow: 'hidden' },
  inline: { flex: 0, paddingVertical: space.lg },
  manual: { alignSelf: 'center', marginBottom: space.lg },
  existing: { padding: space.lg, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'flex-end' },
  detected: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  fields: { paddingHorizontal: space.lg, paddingBottom: space.sm },
  hint: { marginTop: 6 },
  checkbox: { paddingHorizontal: space.lg, paddingVertical: space.xs },
  testBox: { padding: space.lg, gap: space.md },
  samples: { flexDirection: 'row', gap: space.sm },
  sample: { flex: 1, gap: 4 },
  footer: {
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
