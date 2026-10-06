import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { addonEntries, uninstallAddon, useAddonRevision, type AddonEntry } from '../../addons/registry';
import { SDK_VERSION } from '../../addons/sdk';
import { ADDON_CHECK_KEY, checkAddonUpdates, type UpdateReport } from '../../addons/updater';
import { useAppNavigation } from '../../app/routes';
import { Link, Puzzle, RefreshCw, RotateCcw } from '../../components/icons';
import {
  Button,
  confirm,
  Divider,
  FieldLabel,
  Header,
  IconButton,
  Screen,
  Section,
  SwitchRow,
  TextField,
  toast,
} from '../../components/ui';
import { errorMessage } from '../../lib/http';
import { storage } from '../../lib/storage';
import { formatRelative } from '../../lib/time';
import { useSettings } from '../../store/useSettings';
import { font, radius, space, useTheme } from '../../theme';

const CONTENT_NAME = { manga: 'truyện tranh', novel: 'tiểu thuyết' } as const;

export function describeReport(report: UpdateReport): string {
  const parts: string[] = [];
  if (report.installed.length) {
    parts.push(`Đã cập nhật ${report.installed.map(a => `${a.label} v${a.version}`).join(', ')}`);
  }
  if (report.needsAppUpdate.length) {
    parts.push(`Cần bản app mới hơn cho ${report.needsAppUpdate.join(', ')}`);
  }
  if (report.errors.length) {
    parts.push(`Lỗi: ${report.errors.join('; ')}`);
  }
  return parts.join('. ') || 'Mọi addon đều đã là bản mới nhất';
}

export function AddonManagerScreen() {
  const navigation = useAppNavigation();
  const { c } = useTheme();
  useAddonRevision(state => state.revision);
  const entries = addonEntries();
  const repoUrl = useSettings(s => s.addonRepoUrl);
  const autoUpdate = useSettings(s => s.autoUpdateAddons);
  const set = useSettings(s => s.set);
  const [draft, setDraft] = useState(repoUrl);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const lastCheck = storage.getNumber(ADDON_CHECK_KEY);

  const commitUrl = (text: string) => {
    const value = text.trim();
    if (value !== repoUrl) {
      set({ addonRepoUrl: value });
    }
  };

  const check = async () => {
    const url = draft.trim();
    commitUrl(url);
    if (!/^https?:\/\//i.test(url)) {
      toast('Nhập URL manifest.json của kho addon');
      return;
    }
    setChecking(true);
    setResult(null);
    try {
      const report = await checkAddonUpdates(url);
      storage.set(ADDON_CHECK_KEY, Date.now());
      setResult(describeReport(report));
    } catch (error) {
      setResult(`Không kiểm tra được: ${errorMessage(error)}`);
    } finally {
      setChecking(false);
    }
  };

  const restore = async (entry: AddonEntry) => {
    const ok = await confirm(
      `Gỡ bản cập nhật của ${entry.info.label}?`,
      `Addon sẽ quay về bản có sẵn trong app (v${entry.builtinVersion}).`,
      { confirmText: 'Gỡ' },
    );
    if (ok) {
      uninstallAddon(entry.info.uid);
      toast(`${entry.info.label}: đã về bản có sẵn`);
    }
  };

  return (
    <Screen>
      <Header title="Quản lý addon" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Section title={`Addon (${entries.length})`}>
          {entries.map((entry, index) => {
            const sites = Object.keys(entry.info.siteInfo ?? {}).length;
            const content = entry.info.content.map(k => CONTENT_NAME[k]).join(', ');
            return (
              <View key={entry.info.uid}>
                {index > 0 && <Divider inset={68} />}
                <View style={styles.row}>
                  <View style={[styles.icon, { backgroundColor: c.surfaceAlt }]}>
                    <Puzzle size={24} color={c.addon} />
                  </View>
                  <View style={styles.body}>
                    <View style={styles.titleRow}>
                      <Text numberOfLines={1} style={[font.body, styles.title, { color: c.text }]}>
                        {entry.info.label}
                      </Text>
                      <View
                        style={[styles.badge, { backgroundColor: entry.origin === 'update' ? c.accentSoft : c.surfaceAlt }]}
                      >
                        <Text style={[styles.badgeText, { color: entry.origin === 'update' ? c.accent : c.muted }]}>
                          v{entry.info.version}
                          {entry.origin === 'update' ? ' · từ kho' : ''}
                        </Text>
                      </View>
                    </View>
                    <Text numberOfLines={2} style={[font.caption, { color: c.textSecondary }]}>
                      {entry.info.desc}
                    </Text>
                    <Text style={[font.caption, { color: c.muted }]}>
                      {content}
                      {sites ? ` · ${sites} site` : ''}
                      {entry.info.allowCustomSites ? ' · thêm được site khác' : ''}
                    </Text>
                  </View>
                  {entry.origin === 'update' && entry.builtinVersion !== undefined && (
                    <IconButton
                      icon={RotateCcw}
                      size={20}
                      color={c.muted}
                      onPress={() => restore(entry)}
                      accessibilityLabel={`Gỡ bản cập nhật của ${entry.info.label}`}
                    />
                  )}
                </View>
              </View>
            );
          })}
        </Section>

        <Section
          title="Kho addon"
          footer={`Kho addon là thư mục tĩnh chứa manifest.json và các gói addon (tạo bằng "npm run addons", thư mục dist/addons). App chỉ cài bản có version mới hơn, đúng mã sha256 và chạy thử được; addon cần SDK mới hơn ${SDK_VERSION} thì phải cập nhật app.`}
        >
          <View style={styles.fields}>
            <FieldLabel>URL manifest</FieldLabel>
            <TextField
              icon={Link}
              value={draft}
              onChangeText={setDraft}
              onEndEditing={e => commitUrl(e.nativeEvent.text)}
              placeholder="https://…/addons/manifest.json"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
            />
            <Button title="Kiểm tra cập nhật" icon={RefreshCw} loading={checking} onPress={check} />
            {!!result && <Text style={[font.caption, { color: c.textSecondary }]}>{result}</Text>}
            {!result && !!lastCheck && (
              <Text style={[font.caption, { color: c.muted }]}>Kiểm tra lần cuối {formatRelative(lastCheck)}</Text>
            )}
          </View>
          <Divider inset={52} />
          <SwitchRow
            icon={RefreshCw}
            title="Tự cập nhật addon"
            subtitle="Kiểm tra kho addon mỗi ngày khi mở app"
            value={autoUpdate}
            onValueChange={autoUpdateAddons => set({ autoUpdateAddons })}
          />
        </Section>

        <Button
          title="Site được hỗ trợ"
          icon={Puzzle}
          variant="ghost"
          onPress={() => navigation.navigate('Addons')}
          style={styles.sites}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { flexShrink: 1, fontWeight: '600' },
  badge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.sm },
  badgeText: { fontSize: 11, fontWeight: '700' },
  fields: { gap: space.sm, padding: space.lg },
  sites: { alignSelf: 'center', marginTop: space.md },
});
