import {
  AppWindow,
  BarChart3,
  BookOpen,
  Ban,
  CircleHelp,
  Download,
  Eraser,
  EyeOff,
  Globe,
  House,
  Info,
  LayoutGrid,
  MousePointerClick,
  Palette,
  PanelTop,
  Puzzle,
  RefreshCw,
  Rocket,
  Search,
  ShieldAlert,
  ShieldBan,
  ShieldCheck,
  SquareArrowOutUpRight,
  Timer,
  Type,
  DatabaseBackup,
  Zap,
} from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { useAppNavigation } from '../../app/routes';
import { Divider, Header, ListItem, Screen, Section, SwitchRow, toast } from '../../components/ui';
import { useAllowNsfw, useSettings, type AppSettings, type SearchEngineId } from '../../store/useSettings';
import { font, space, useTheme } from '../../theme';
import packageJson from '../../../package.json';
import { AdultContentDialog } from './AdultContentDialog';
import { SelectRow, type Option } from './OptionSheet';

const THEME_OPTIONS: Option<AppSettings['themeMode']>[] = [
  { value: 'system', label: 'Theo hệ thống' },
  { value: 'light', label: 'Sáng' },
  { value: 'dark', label: 'Tối' },
];

const START_PAGE_OPTIONS: Option<AppSettings['startPage']>[] = [
  { value: 'home', label: 'Trang chủ', description: 'Mở trang chủ của app với các widget' },
  { value: 'lastTab', label: 'Tab gần nhất', description: 'Mở lại trang đang xem lần trước' },
];

const SEARCH_ENGINE_OPTIONS: Option<SearchEngineId>[] = [
  { value: 'google', label: 'Google' },
  { value: 'bing', label: 'Bing' },
  { value: 'duckduckgo', label: 'DuckDuckGo' },
  { value: 'yahoo', label: 'Yahoo' },
  { value: 'yandex', label: 'Yandex' },
];

const SEARCH_CATEGORY_OPTIONS: Option<AppSettings['searchCategory']>[] = [
  { value: 'web', label: 'Web', description: 'Tìm bằng công cụ tìm kiếm' },
  { value: 'manga', label: 'Truyện', description: 'Tìm truyện trong các nguồn đang bật' },
];

const AUTO_CLOSE_OPTIONS: Option<AppSettings['autoCloseTabs']>[] = [
  { value: 'never', label: 'Không bao giờ' },
  { value: 'day', label: 'Sau 1 ngày' },
  { value: 'week', label: 'Sau 1 tuần' },
  { value: 'month', label: 'Sau 1 tháng' },
];

const APP_LINK_OPTIONS: Option<AppSettings['appLinks']>[] = [
  { value: 'ask', label: 'Luôn hỏi' },
  { value: 'allow', label: 'Luôn cho phép' },
  { value: 'block', label: 'Luôn chặn' },
];

const LAYOUT_OPTIONS: Option<AppSettings['libraryLayout']>[] = [
  { value: 'grid', label: 'Lưới' },
  { value: 'list', label: 'Danh sách' },
];

export function SettingsScreen() {
  const navigation = useAppNavigation();
  const { c } = useTheme();
  const s = useSettings(
    useShallow(state => ({
      themeMode: state.themeMode,
      startPage: state.startPage,
      hideStatusBar: state.hideStatusBar,
      searchEngine: state.searchEngine,
      searchCategory: state.searchCategory,
      safeSearch: state.safeSearch,
      autoCloseTabs: state.autoCloseTabs,
      blockPopups: state.blockPopups,
      appLinks: state.appLinks,
      disableLongPressMenu: state.disableLongPressMenu,
      openNativeLinksInNewTab: state.openNativeLinksInNewTab,
      autoRunAddon: state.autoRunAddon,
      adblock: state.adblock,
      trackingProtection: state.trackingProtection,
      preventCapture: state.preventCapture,
      libraryLayout: state.libraryLayout,
      checkUpdatesOnLaunch: state.checkUpdatesOnLaunch,
      ageConfirmed: state.ageConfirmed,
      set: state.set,
    })),
  );
  const allowNsfw = useAllowNsfw();
  const [ageDialog, setAgeDialog] = useState(false);
  const set = s.set;

  const toggleNsfw = (value: boolean) => {
    if (value && !s.ageConfirmed) {
      setAgeDialog(true);
      return;
    }
    set({ showNsfw: value });
  };

  return (
    <Screen>
      <Header title="Cài đặt" />
      <ScrollView contentContainerStyle={styles.content}>
        <Section title="Chung">
          <SelectRow
            title="Giao diện"
            sheetTitle="Chọn giao diện"
            icon={Palette}
            options={THEME_OPTIONS}
            value={s.themeMode}
            onChange={themeMode => set({ themeMode })}
          />
          <Divider inset={52} />
          <SelectRow
            title="Trang mở khi khởi động"
            sheetTitle="Chọn trang mở khi khởi động"
            icon={Rocket}
            options={START_PAGE_OPTIONS}
            value={s.startPage}
            onChange={startPage => set({ startPage })}
          />
          <Divider inset={52} />
          <SwitchRow
            title="Ẩn thanh trạng thái"
            icon={PanelTop}
            value={s.hideStatusBar}
            onValueChange={hideStatusBar => set({ hideStatusBar })}
          />
        </Section>

        <Section title="Trình duyệt">
          <SelectRow
            title="Công cụ tìm kiếm mặc định"
            sheetTitle="Chọn công cụ tìm kiếm"
            icon={Search}
            options={SEARCH_ENGINE_OPTIONS}
            value={s.searchEngine}
            onChange={searchEngine => set({ searchEngine })}
          />
          <Divider inset={52} />
          <SelectRow
            title="Hạng mục tìm kiếm mặc định"
            sheetTitle="Chọn hạng mục tìm kiếm mặc định"
            icon={Globe}
            options={SEARCH_CATEGORY_OPTIONS}
            value={s.searchCategory}
            onChange={searchCategory => set({ searchCategory })}
          />
          <Divider inset={52} />
          <SwitchRow
            title="Tìm kiếm an toàn"
            subtitle="Làm mờ/ẩn kết quả nhạy cảm của công cụ tìm kiếm"
            icon={ShieldCheck}
            value={s.safeSearch}
            onValueChange={safeSearch => set({ safeSearch })}
          />
          <Divider inset={52} />
          <ListItem
            title="Tuỳ chỉnh trang chủ"
            subtitle="Widget, thứ tự và lối tắt truy cập nhanh"
            icon={House}
            chevron
            onPress={() => navigation.navigate('CustomizeHomepage')}
          />
          <Divider inset={52} />
          <SelectRow
            title="Tự đóng tab"
            sheetTitle="Tự đóng tab không dùng"
            sheetSubtitle="Tab không mở lại trong khoảng thời gian này sẽ được đóng khi khởi động"
            icon={Timer}
            options={AUTO_CLOSE_OPTIONS}
            value={s.autoCloseTabs}
            onChange={autoCloseTabs => set({ autoCloseTabs })}
          />
          <Divider inset={52} />
          <SwitchRow
            title="Chặn popup"
            subtitle="Chặn trang tự mở cửa sổ mới"
            icon={Ban}
            value={s.blockPopups}
            onValueChange={blockPopups => set({ blockPopups })}
          />
          <Divider inset={52} />
          <SelectRow
            title="Mở ứng dụng khác từ trang web"
            sheetTitle="Cho phép trang web mở ứng dụng khác"
            icon={SquareArrowOutUpRight}
            options={APP_LINK_OPTIONS}
            value={s.appLinks}
            onChange={appLinks => set({ appLinks })}
          />
          <Divider inset={52} />
          <SwitchRow
            title="Tắt menu nhấn giữ"
            subtitle="Không hiện menu khi nhấn giữ liên kết hoặc ảnh"
            icon={MousePointerClick}
            value={s.disableLongPressMenu}
            onValueChange={disableLongPressMenu => set({ disableLongPressMenu })}
          />
          <Divider inset={52} />
          <SwitchRow
            title="Mở link từ màn native trong tab mới"
            subtitle="Ví dụ nút “Xem trang gốc” ở chi tiết truyện"
            icon={AppWindow}
            value={s.openNativeLinksInNewTab}
            onValueChange={openNativeLinksInNewTab => set({ openNativeLinksInNewTab })}
          />
          <Divider inset={52} />
          <SwitchRow
            title="Tự chạy addon trên site đã thêm"
            subtitle="Mở site truyện đã thêm là chuyển sang giao diện native khi trang hỗ trợ"
            icon={Zap}
            value={s.autoRunAddon}
            onValueChange={autoRunAddon => set({ autoRunAddon })}
          />
        </Section>

        <Section
          title="Quyền riêng tư & bảo mật"
          footer="Chống chụp màn hình: cần bản build có hỗ trợ native để có hiệu lực."
        >
          <ListItem
            title="Chặn quảng cáo"
            subtitle={s.adblock ? 'Đang bật' : 'Đang tắt'}
            icon={ShieldBan}
            chevron
            onPress={() => navigation.navigate('AdblockSettings')}
          />
          <Divider inset={52} />
          <SwitchRow
            title="Chống theo dõi"
            subtitle="Chặn tracker và script thống kê của bên thứ ba"
            icon={EyeOff}
            value={s.trackingProtection}
            onValueChange={trackingProtection => set({ trackingProtection })}
          />
          <Divider inset={52} />
          <ListItem
            title="Xoá dữ liệu duyệt web"
            subtitle="Lịch sử, cookie, bộ nhớ đệm…"
            icon={Eraser}
            chevron
            onPress={() => navigation.navigate('ClearData')}
          />
          <Divider inset={52} />
          <SwitchRow
            title="Chống chụp màn hình"
            subtitle="Chặn chụp và quay màn hình trong app"
            icon={ShieldAlert}
            value={s.preventCapture}
            onValueChange={preventCapture => set({ preventCapture })}
          />
        </Section>

        <Section title="Đọc truyện">
          <ListItem
            title="Cài đặt trình xem"
            subtitle="Chế độ xem, hướng đọc, tự cuộn, tải trước"
            icon={BookOpen}
            chevron
            onPress={() => navigation.navigate('ViewerSettings')}
          />
          <Divider inset={52} />
          <ListItem
            title="Cài đặt đọc tiểu thuyết"
            subtitle="Phông chữ, cỡ chữ, màu nền, đọc thành tiếng"
            icon={Type}
            chevron
            onPress={() => navigation.navigate('NovelSettings')}
          />
          <Divider inset={52} />
          <SelectRow
            title="Bố cục thư viện mặc định"
            icon={LayoutGrid}
            options={LAYOUT_OPTIONS}
            value={s.libraryLayout}
            onChange={libraryLayout => set({ libraryLayout })}
          />
          <Divider inset={52} />
          <SwitchRow
            title="Tự kiểm tra chương mới khi mở app"
            subtitle="Kiểm tra truyện đã bookmark, tối đa mỗi 6 giờ một lần"
            icon={RefreshCw}
            value={s.checkUpdatesOnLaunch}
            onValueChange={checkUpdatesOnLaunch => set({ checkUpdatesOnLaunch })}
          />
        </Section>

        <Section
          title="Nội dung người lớn"
          footer="Khi tắt, nguồn 18+ bị ẩn và ảnh bìa truyện 18+ được làm mờ."
        >
          <SwitchRow
            title="Hiện nội dung 18+"
            subtitle={s.ageConfirmed ? 'Đã xác nhận đủ 18 tuổi' : 'Cần xác nhận đủ 18 tuổi'}
            icon={ShieldAlert}
            value={allowNsfw}
            onValueChange={toggleNsfw}
          />
        </Section>

        <Section title="Dữ liệu">
          <ListItem
            title="Sao lưu & khôi phục"
            subtitle="Bookmark, lịch sử, cài đặt"
            icon={DatabaseBackup}
            chevron
            onPress={() => navigation.navigate('BackupRestore')}
          />
          <Divider inset={52} />
          <ListItem
            title="Thống kê đọc"
            icon={BarChart3}
            chevron
            onPress={() => navigation.navigate('ReadingStats')}
          />
          <Divider inset={52} />
          <ListItem
            title="Tải xuống"
            icon={Download}
            chevron
            onPress={() => navigation.navigate('Downloads')}
          />
          <Divider inset={52} />
          <ListItem
            title="Addon & nguồn"
            icon={Puzzle}
            chevron
            onPress={() => navigation.navigate('Addons')}
          />
        </Section>

        <Section title="Khác">
          <ListItem
            title="Xem lại hướng dẫn"
            icon={CircleHelp}
            onPress={() => {
              set({ tourDone: false });
              toast('Hướng dẫn sẽ hiện lại ở trang chủ');
            }}
          />
          <Divider inset={52} />
          <ListItem title="Giới thiệu" icon={Info} chevron onPress={() => navigation.navigate('About')} />
        </Section>

        <Text style={[font.caption, styles.version, { color: c.muted }]}>
          Manga Reader {packageJson.version}
        </Text>
      </ScrollView>

      <AdultContentDialog visible={ageDialog} onClose={() => setAgeDialog(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: space.lg, gap: space.xl },
  version: { textAlign: 'center' },
});
