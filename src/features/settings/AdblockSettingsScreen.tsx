import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Dialog } from '../../components/Sheet';
import { Ban, Clock, CloudDownload, EyeOff, Link, List, RotateCcw, ShieldBan } from '../../components/icons';
import {
  Button,
  Divider,
  FieldLabel,
  Header,
  ListItem,
  Screen,
  Section,
  SwitchRow,
  TextField,
  confirm,
  toast,
} from '../../components/ui';
import { builtinListSize, updateBlockLists } from '../../lib/adblock';
import { errorMessage } from '../../lib/http';
import { addDays, dayKey, dayKeyToDate, formatDate, formatRelative } from '../../lib/time';
import { looksLikeUrl } from '../../lib/url';
import {
  DEFAULT_ADS_LIST_URL,
  DEFAULT_TRACKERS_LIST_URL,
  totalsLast30Days,
  useAdblock,
} from '../../store/useAdblock';
import { useSettings } from '../../store/useSettings';
import { font, radius, space, useTheme } from '../../theme';
import { formatCount } from '../../lib/format';
import { BarChart, useChartColors, type BarDatum } from '../stats/StatsCharts';

type ListKind = 'ads' | 'trackers';

const LIST_META: Record<ListKind, { title: string; defaultUrl: string }> = {
  ads: { title: 'URL danh sách quảng cáo', defaultUrl: DEFAULT_ADS_LIST_URL },
  trackers: { title: 'URL danh sách tracker', defaultUrl: DEFAULT_TRACKERS_LIST_URL },
};

export function AdblockSettingsScreen() {
  const { c } = useTheme();
  const settings = useSettings(
    useShallow(s => ({
      adblock: s.adblock,
      trackingProtection: s.trackingProtection,
      blockPopups: s.blockPopups,
      set: s.set,
    })),
  );
  const adblock = useAdblock(
    useShallow(s => ({
      daily: s.daily,
      adsListUrl: s.adsListUrl,
      trackersListUrl: s.trackersListUrl,
      adsCount: s.adsCount,
      trackersCount: s.trackersCount,
      updatedAt: s.updatedAt,
      setListUrls: s.setListUrls,
      resetStats: s.resetStats,
    })),
  );
  const [updating, setUpdating] = useState(false);
  const [editing, setEditing] = useState<ListKind | null>(null);
  const [draft, setDraft] = useState('');

  const totals = useMemo(() => totalsLast30Days(adblock.daily), [adblock.daily]);
  const builtin = useMemo(() => builtinListSize(), []);

  const update = async () => {
    setUpdating(true);
    try {
      const counts = await updateBlockLists();
      toast(
        `Đã cập nhật: ${formatCount(counts.ads)} domain quảng cáo, ${formatCount(counts.trackers)} domain tracker`,
      );
    } catch (error) {
      toast(`Cập nhật thất bại: ${errorMessage(error)}`);
    } finally {
      setUpdating(false);
    }
  };

  const openEditor = (kind: ListKind) => {
    setDraft(kind === 'ads' ? adblock.adsListUrl : adblock.trackersListUrl);
    setEditing(kind);
  };

  const saveUrl = () => {
    if (!editing) {
      return;
    }
    const url = draft.trim();
    if (!/^https?:\/\//i.test(url) || !looksLikeUrl(url)) {
      toast('URL không hợp lệ, cần bắt đầu bằng http:// hoặc https://');
      return;
    }
    adblock.setListUrls(editing === 'ads' ? { adsListUrl: url } : { trackersListUrl: url });
    setEditing(null);
    toast('Đã lưu URL. Bấm “Cập nhật danh sách” để tải bản mới.');
  };

  const resetStats = async () => {
    const ok = await confirm('Đặt lại thống kê', 'Số quảng cáo và tracker đã chặn sẽ về 0.', {
      confirmText: 'Đặt lại',
      destructive: true,
    });
    if (ok) {
      adblock.resetStats();
      toast('Đã đặt lại thống kê chặn');
    }
  };

  const downloaded = adblock.adsCount + adblock.trackersCount > 0;

  return (
    <Screen>
      <Header title="Chặn quảng cáo" />
      <ScrollView contentContainerStyle={styles.content}>
        <Section>
          <SwitchRow
            title="Bật chặn quảng cáo"
            subtitle="Chặn điều hướng, popup và khung quảng cáo"
            icon={ShieldBan}
            value={settings.adblock}
            onValueChange={value => settings.set({ adblock: value })}
          />
          <Divider inset={52} />
          <SwitchRow
            title="Chống theo dõi"
            subtitle="Chặn tracker và script thống kê của bên thứ ba"
            icon={EyeOff}
            value={settings.trackingProtection}
            onValueChange={value => settings.set({ trackingProtection: value })}
          />
          <Divider inset={52} />
          <SwitchRow
            title="Chặn popup"
            subtitle="Chặn trang tự mở cửa sổ hoặc tab mới"
            icon={Ban}
            value={settings.blockPopups}
            onValueChange={value => settings.set({ blockPopups: value })}
          />
        </Section>

        <Section title="Đã chặn trong 30 ngày qua">
          <View style={styles.statsCard}>
            <View style={styles.tiles}>
              <View style={[styles.tile, { backgroundColor: c.surfaceAlt }]}>
                <Text style={[font.caption, { color: c.muted }]}>Quảng cáo</Text>
                <Text style={[styles.tileValue, { color: c.text }]}>{formatCount(totals.ads)}</Text>
              </View>
              <View style={[styles.tile, { backgroundColor: c.surfaceAlt }]}>
                <Text style={[font.caption, { color: c.muted }]}>Tracker</Text>
                <Text style={[styles.tileValue, { color: c.text }]}>{formatCount(totals.trackers)}</Text>
              </View>
            </View>
            <BlockChart daily={adblock.daily} totals={totals} />
          </View>
        </Section>

        <Section
          title="Danh sách chặn"
          footer="Danh sách có sẵn luôn được dùng. Danh sách tải về bổ sung thêm domain từ máy chủ cộng đồng."
        >
          <ListItem
            title="Danh sách có sẵn"
            subtitle={`${formatCount(builtin.ads)} domain quảng cáo · ${formatCount(builtin.trackers)} domain tracker`}
            icon={List}
          />
          <Divider inset={52} />
          <ListItem
            title="Danh sách đã tải"
            subtitle={
              downloaded
                ? `${formatCount(adblock.adsCount)} domain quảng cáo · ${formatCount(adblock.trackersCount)} domain tracker`
                : 'Chưa tải danh sách đầy đủ'
            }
            icon={CloudDownload}
          />
          <Divider inset={52} />
          <ListItem
            title="Cập nhật lần cuối"
            subtitle={
              adblock.updatedAt
                ? `${formatDate(adblock.updatedAt)} (${formatRelative(adblock.updatedAt)})`
                : 'Chưa cập nhật'
            }
            icon={Clock}
          />
          <View style={styles.buttonRow}>
            <Button
              title={updating ? 'Đang cập nhật…' : 'Cập nhật danh sách'}
              icon={CloudDownload}
              loading={updating}
              onPress={update}
            />
          </View>
        </Section>

        <Section title="Nguồn danh sách">
          <ListItem
            title={LIST_META.ads.title}
            subtitle={adblock.adsListUrl}
            icon={Link}
            chevron
            onPress={() => openEditor('ads')}
          />
          <Divider inset={52} />
          <ListItem
            title={LIST_META.trackers.title}
            subtitle={adblock.trackersListUrl}
            icon={Link}
            chevron
            onPress={() => openEditor('trackers')}
          />
        </Section>

        <Section>
          <ListItem title="Đặt lại thống kê" icon={RotateCcw} destructive onPress={resetStats} />
        </Section>

        <Text style={[font.caption, styles.note, { color: c.muted }]}>
          Cách hoạt động: app chặn điều hướng và popup tới domain quảng cáo, gỡ khung quảng cáo
          (iframe, script, ảnh) của các domain trong danh sách và ẩn vùng quảng cáo phổ biến bằng
          CSS. WebView không cho phép chặn mọi request con ở tầng mạng, nên một số quảng cáo vẫn có
          thể tải về trước khi bị gỡ. Nếu trang hiển thị lỗi, hãy tắt chặn quảng cáo cho riêng tab
          đó từ menu trình duyệt.
        </Text>
      </ScrollView>

      <Dialog
        visible={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? LIST_META[editing].title : undefined}
        message="Mỗi dòng của file là một domain, hỗ trợ cả định dạng hosts (0.0.0.0 domain)."
        actions={[
          {
            label: 'Khôi phục mặc định',
            variant: 'ghost',
            onPress: () => {
              if (editing) {
                setDraft(LIST_META[editing].defaultUrl);
              }
            },
          },
          { label: 'Huỷ', onPress: () => setEditing(null) },
          { label: 'Lưu', variant: 'primary', onPress: saveUrl, disabled: !draft.trim() },
        ]}
      >
        <FieldLabel>URL</FieldLabel>
        <TextField
          value={draft}
          onChangeText={setDraft}
          onClear={() => setDraft('')}
          placeholder="https://…"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          multiline
        />
      </Dialog>
    </Screen>
  );
}

/** Cột chồng quảng cáo + tracker theo ngày trong 30 ngày. */
function BlockChart({
  daily,
  totals,
}: {
  daily: Record<string, { ads: number; trackers: number }>;
  totals: { ads: number; trackers: number };
}) {
  const { primary, secondary } = useChartColors();
  const series = useMemo(
    () => [
      { name: 'Quảng cáo', color: primary },
      { name: 'Tracker', color: secondary },
    ],
    [primary, secondary],
  );
  const data = useMemo<BarDatum[]>(() => {
    const today = dayKey();
    return Array.from({ length: 30 }, (_, i) => {
      const key = addDays(today, i - 29);
      const day = daily[key] ?? { ads: 0, trackers: 0 };
      const [, m, d] = key.split('-');
      return {
        key,
        // Nhãn mỗi 7 ngày tính lùi từ hôm nay để không chồng nhau.
        axisLabel: (29 - i) % 7 === 0 ? `${d}/${m}` : '',
        values: [day.ads, day.trackers],
        a11yLabel: `${formatDate(dayKeyToDate(key).getTime())}: ${day.ads} quảng cáo, ${day.trackers} tracker`,
      };
    });
  }, [daily]);

  const readout = (selected: BarDatum | undefined) => {
    if (selected) {
      const [ads, trackers] = selected.values;
      return `${formatDate(dayKeyToDate(selected.key).getTime())}: ${formatCount(ads)} quảng cáo · ${formatCount(trackers)} tracker`;
    }
    return totals.ads + totals.trackers
      ? 'Chạm vào cột để xem số đã chặn trong ngày.'
      : 'Chưa chặn mục nào trong 30 ngày qua.';
  };

  return <BarChart data={data} series={series} height={110} readout={readout} formatTick={formatCount} />;
}

const styles = StyleSheet.create({
  content: { paddingVertical: space.lg, gap: space.xl },
  statsCard: { padding: space.lg, gap: space.lg },
  tiles: { flexDirection: 'row', gap: space.sm },
  tile: { flex: 1, borderRadius: radius.md, padding: space.md, gap: 2 },
  tileValue: { fontSize: 22, fontWeight: '700' },
  buttonRow: { padding: space.lg, paddingTop: space.sm },
  note: { paddingHorizontal: space.lg + 2, lineHeight: 18 },
});
