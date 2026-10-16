import { useRoute, type RouteProp } from '@react-navigation/native';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { addonEntries, uninstallAddon, useAddonRevision } from '../../addons/registry';
import { useAppNavigation, type RootStackParamList } from '../../app/routes';
import {
  ChevronDown,
  ChevronUp,
  CircleCheck,
  FileText,
  Globe,
  Info,
  Plus,
  Puzzle,
  RotateCcw,
  Zap,
} from '../../components/icons';
import { confirm, Divider, EmptyState, Header, ListItem, Screen, Section, SwitchRow, toast } from '../../components/ui';
import { catalogSources } from '../../sources/catalog';
import { useSettings } from '../../store/useSettings';
import { useSources } from '../../store/useSources';
import { font, space, useTheme } from '../../theme';
import { AddonIcon } from './AddonManagerScreen';

const CONTENT_NAME = { manga: 'Truyện tranh', novel: 'Tiểu thuyết' } as const;

export function AddonDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'AddonDetail'>>();
  const { uid } = route.params;
  const navigation = useAppNavigation();
  const { c } = useTheme();
  useAddonRevision(state => state.revision);
  const stored = useSources(s => s.sources);
  const autoRun = useSettings(s => s.autoRunAddon);
  const set = useSettings(s => s.set);
  const [expanded, setExpanded] = useState(false);
  const entry = addonEntries().find(e => e.info.uid === uid);

  if (!entry) {
    return (
      <Screen>
        <Header title="Add-ons" />
        <EmptyState icon={Puzzle} title="Không tìm thấy addon" message="Addon này không còn trong app." />
      </Screen>
    );
  }

  const { info } = entry;
  const siteIds = new Set(
    catalogSources()
      .filter(s => s.engine === uid)
      .map(s => s.id),
  );
  for (const s of stored) {
    if (s.engine === uid) {
      siteIds.add(s.id);
    }
  }
  const canRestore = entry.origin === 'update' && entry.builtinVersion !== undefined;

  const restore = async () => {
    const ok = await confirm(
      `Gỡ bản cập nhật của ${info.label}?`,
      `Addon sẽ quay về bản có sẵn trong app (v${entry.builtinVersion}).`,
      { confirmText: 'Gỡ' },
    );
    if (ok) {
      uninstallAddon(uid);
      toast(`${info.label}: đã về bản có sẵn`);
    }
  };

  return (
    <Screen>
      <Header title={info.label} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <AddonIcon size={56} />
          <View style={styles.flex}>
            <View style={styles.titleRow}>
              <Text numberOfLines={1} style={[font.title, styles.title, { color: c.text }]}>
                {info.label}
              </Text>
              <CircleCheck size={18} color={c.addon} fill={c.addon} accessibilityLabel="Đang bật" />
            </View>
            <Text style={[font.caption, { color: c.muted }]}>
              {info.content.map(k => CONTENT_NAME[k]).join(', ')}
              {info.allowCustomSites ? ' · thêm được site khác' : ''}
            </Text>
          </View>
        </View>

        <Section>
          <SwitchRow
            title="Tự chạy addon"
            subtitle="Áp dụng cho mọi addon: mở site truyện đã thêm là chuyển sang giao diện native khi trang hỗ trợ"
            icon={Zap}
            value={autoRun}
            onValueChange={autoRunAddon => set({ autoRunAddon })}
          />
          <Divider inset={52} />
          <ListItem
            title="Mô tả"
            subtitle={expanded ? undefined : info.desc}
            icon={FileText}
            right={expanded ? <ChevronUp size={20} color={c.muted} /> : <ChevronDown size={20} color={c.muted} />}
            onPress={() => setExpanded(value => !value)}
          />
          {expanded && <Text style={[font.body, styles.desc, { color: c.textSecondary }]}>{info.desc}</Text>}
          <Divider inset={52} />
          <ListItem
            title="Site được hỗ trợ"
            subtitle={`${siteIds.size} site`}
            icon={Globe}
            chevron
            onPress={() => navigation.navigate('Addons', { engine: uid })}
          />
          {info.allowCustomSites && (
            <>
              <Divider inset={52} />
              <ListItem
                title="Thêm site dùng addon này"
                icon={Plus}
                chevron
                onPress={() => navigation.navigate('AddSite', { engine: uid })}
              />
            </>
          )}
          <Divider inset={52} />
          <ListItem
            title={`Phiên bản v${info.version}`}
            subtitle={entry.origin === 'update' ? 'Bản cập nhật từ kho addon' : 'Bản có sẵn trong app'}
            icon={Info}
          />
          {canRestore && (
            <>
              <Divider inset={52} />
              <ListItem
                title="Gỡ bản cập nhật"
                subtitle={`Quay về bản có sẵn trong app (v${entry.builtinVersion})`}
                icon={RotateCcw}
                onPress={restore}
              />
            </>
          )}
        </Section>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingVertical: space.lg, gap: space.lg },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingHorizontal: space.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { flexShrink: 1 },
  desc: { paddingLeft: 50, paddingRight: space.lg, paddingBottom: space.lg, lineHeight: 22 },
});
