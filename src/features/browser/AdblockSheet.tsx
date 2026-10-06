import { StyleSheet, Text, View } from 'react-native';

import { Sheet } from '../../components/Sheet';
import { Settings, ShieldCheck } from '../../components/icons';
import { Divider, ListItem, SwitchRow } from '../../components/ui';
import { totalsLast30Days, useAdblock } from '../../store/useAdblock';
import { font, radius, space, useTheme } from '../../theme';
import type { BlockStats } from './BrowserWebView';

export function AdblockSheet({
  visible,
  onClose,
  stats,
  globalEnabled,
  tabEnabled,
  onToggleTab,
  onOpenSettings,
}: {
  visible: boolean;
  onClose: () => void;
  stats: BlockStats;
  globalEnabled: boolean;
  tabEnabled: boolean;
  onToggleTab: (enabled: boolean) => void;
  onOpenSettings: () => void;
}) {
  const { c } = useTheme();
  const daily = useAdblock(s => s.daily);
  const total = totalsLast30Days(daily);
  const active = globalEnabled && tabEnabled;

  return (
    <Sheet visible={visible} onClose={onClose} title="Chặn quảng cáo">
      <View style={styles.body}>
        <Text style={[font.overline, { color: c.muted }]}>Quảng cáo & tracker đã chặn trên trang này</Text>
        <View style={styles.tiles}>
          <StatTile label="Quảng cáo" value={active ? stats.ads : 0} />
          <StatTile label="Tracker" value={active ? stats.trackers : 0} />
        </View>
        <View style={[styles.total, { backgroundColor: c.primaryContainer }]}>
          <ShieldCheck size={22} color={c.onPrimaryContainer} />
          <View style={styles.flex}>
            <Text style={[font.caption, { color: c.onPrimaryContainer }]}>Tổng đã chặn 30 ngày qua</Text>
            <Text style={[font.label, { color: c.onPrimaryContainer }]}>
              {`${total.ads} quảng cáo · ${total.trackers} tracker`}
            </Text>
          </View>
        </View>
      </View>
      <Divider />
      {globalEnabled ? (
        <SwitchRow
          title="Chặn quảng cáo trên tab này"
          subtitle="Bạn có thể tắt chặn quảng cáo cho tab này nếu trang hiển thị không đúng."
          value={tabEnabled}
          onValueChange={onToggleTab}
        />
      ) : (
        <ListItem title="Chặn quảng cáo đang tắt" subtitle="Bật lại trong cài đặt chặn quảng cáo để dùng tính năng này." />
      )}
      <ListItem icon={Settings} title="Cài đặt chặn quảng cáo" chevron onPress={onOpenSettings} />
    </Sheet>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  const { c } = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: c.surfaceAlt }]}>
      <Text style={[styles.tileValue, { color: c.accent }]}>{value}</Text>
      <Text style={[font.caption, { color: c.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.md },
  tiles: { flexDirection: 'row', gap: space.md },
  tile: { flex: 1, borderRadius: radius.lg, paddingVertical: space.md, paddingHorizontal: space.lg, gap: 2 },
  tileValue: { fontSize: 28, fontWeight: '800' },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderRadius: radius.lg,
    padding: space.md,
  },
});
