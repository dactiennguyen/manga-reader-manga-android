import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Favicon } from '../../components/Favicon';
import { Sheet } from '../../components/Sheet';
import { CodeXml, Cookie, Lock, Puzzle, Unlock } from '../../components/icons';
import { Divider, ListItem } from '../../components/ui';
import { getHost } from '../../lib/url';
import { font, space, useTheme } from '../../theme';
import { AdblockPanel, type AdblockPanelProps } from './AdblockSheet';
import type { AddonState } from './AddressBar';

export type Connection = 'secure' | 'insecure' | null;

export function connectionOf(url: string): Connection {
  return /^https:/i.test(url) ? 'secure' : /^http:/i.test(url) ? 'insecure' : null;
}

export function SiteInfoSheet({
  visible,
  onClose,
  url,
  title,
  addon,
  addonBusy,
  sourceName,
  onRunAddon,
  onShowSites,
  onViewSource,
  onClearSiteData,
  adblock,
}: {
  visible: boolean;
  onClose: () => void;
  url: string;
  title: string;
  addon: AddonState;
  addonBusy: boolean;
  sourceName?: string;
  onRunAddon: () => void;
  onShowSites: () => void;
  onViewSource: () => void;
  onClearSiteData: () => void;
  adblock: AdblockPanelProps;
}) {
  const { c } = useTheme();
  const host = getHost(url);
  const connection = connectionOf(url);

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Favicon url={url} label={title || host} size={32} />
        <View style={styles.flex}>
          <Text numberOfLines={2} style={[font.heading, { color: c.text }]}>
            {title || host || url}
          </Text>
          <Text numberOfLines={2} style={[font.caption, { color: c.muted }]}>
            {url}
          </Text>
        </View>
      </View>
      <Divider />
      {addon === 'source' && (
        <ListItem
          icon={Puzzle}
          iconColor={c.addon}
          title="Chạy addon"
          subtitle={`Đọc trang bằng giao diện đọc truyện của app${sourceName ? ` · ${sourceName}` : ''}`}
          disabled={addonBusy}
          right={addonBusy ? <ActivityIndicator size="small" color={c.addon} /> : undefined}
          onPress={onRunAddon}
        />
      )}
      {addon === 'detected' && (
        <ListItem
          icon={Puzzle}
          iconColor={c.addon}
          title="Thêm site được hỗ trợ"
          subtitle="Addon đọc được giao diện của trang này, thêm site để đọc truyện bằng app."
          onPress={onRunAddon}
        />
      )}
      {!addon && (
        <ListItem
          icon={Puzzle}
          title="Trang này không có addon"
          subtitle="Xem các site được hỗ trợ"
          chevron
          onPress={onShowSites}
        />
      )}
      {connection === 'secure' && (
        <ListItem
          icon={Lock}
          iconColor={c.success}
          title="Kết nối an toàn"
          subtitle="Dữ liệu gửi tới trang này được mã hoá."
        />
      )}
      {connection === 'insecure' && (
        <ListItem
          icon={Unlock}
          iconColor={c.warning}
          title="Kết nối không an toàn"
          subtitle="Không nên nhập mật khẩu hay thông tin thanh toán trên trang này."
        />
      )}
      <ListItem icon={CodeXml} title="Xem mã nguồn" onPress={onViewSource} />
      <Divider />
      <AdblockPanel {...adblock} compact />
      <Divider />
      <ListItem
        icon={Cookie}
        title="Xoá cookie & dữ liệu trang"
        subtitle={host ? `Cookie và dữ liệu trang của ${host}` : undefined}
        onPress={onClearSiteData}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md + 2,
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
    paddingBottom: space.md,
  },
});
