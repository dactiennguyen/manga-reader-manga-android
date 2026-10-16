import { CachesDirectoryPath } from '@dr.pogodin/react-native-fs';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { useAppNavigation } from '../../app/routes';
import {
  ALargeSmall,
  AppWindow,
  ArrowLeftRight,
  Ban,
  Bell,
  BookmarkPlus,
  BookOpen,
  CircleHelp,
  Contrast,
  DatabaseBackup,
  Download,
  Eraser,
  EyeOff,
  Flame,
  GalleryVertical,
  Globe,
  House,
  Image,
  Info,
  LayoutGrid,
  MousePointerClick,
  Palette,
  PanelTop,
  Puzzle,
  RefreshCw,
  Rocket,
  ScreenShareOff,
  Search,
  SeparatorHorizontal,
  Settings2,
  ShieldAlert,
  ShieldBan,
  ShieldCheck,
  Smartphone,
  SquareArrowOutUpRight,
  Timer,
  Type,
  Zap,
} from '../../components/icons';
import { Divider, Header, ListItem, Screen, Section, Stepper, SwitchRow, toast } from '../../components/ui';
import { formatBytes } from '../../lib/format';
import { useReaderSettings, type ViewMode } from '../../store/useReaderSettings';
import {
  useAllowNsfw,
  useSettings,
  type AppSettings,
  type SafeSearch,
  type SearchEngineId,
} from '../../store/useSettings';
import { font, space, useTheme } from '../../theme';
import packageJson from '../../../package.json';
import { backgroundUpdatesSupported, ensureNotificationPermission } from '../library/backgroundUpdates';
import {
  FONT_SIZE_RANGE,
  NOVEL_FONTS,
  NOVEL_THEME_ORDER,
  NOVEL_THEMES,
  setNovelTheme,
  useNovelTheme,
  type NovelThemeId,
} from '../novel/novelThemes';
import { DIRECTION_OPTIONS, VIEW_MODE_HINTS, VIEW_MODE_NAMES, VIEW_MODE_OPTIONS } from '../reader/viewerPrefs';
import { StatsSummaryCard } from '../stats/StatsSummaryCard';
import { AdultContentDialog } from './AdultContentDialog';
import { folderSize } from './ClearDataScreen';
import { SelectRow, type Option } from './OptionSheet';
import { StartPageDialog } from './StartPageDialog';

const THEME_OPTIONS: Option<AppSettings['themeMode']>[] = [
  { value: 'system', label: 'Theo hệ thống' },
  { value: 'light', label: 'Sáng' },
  { value: 'dark', label: 'Tối' },
];

const START_PAGE_OPTIONS: Option<AppSettings['startPage']>[] = [
  { value: 'home', label: 'Trang chủ', description: 'Mở trang chủ của app với các widget' },
  { value: 'lastTab', label: 'Tab gần nhất', description: 'Mở lại trang đang xem lần trước' },
  { value: 'custom', label: 'Trang tuỳ chọn', description: 'Mở một trang web do bạn chọn' },
];

const SEARCH_ENGINE_OPTIONS: Option<SearchEngineId>[] = [
  { value: 'google', label: 'Google' },
  { value: 'bing', label: 'Bing' },
  { value: 'duckduckgo', label: 'DuckDuckGo' },
  { value: 'yahoo', label: 'Yahoo' },
  { value: 'yandex', label: 'Yandex' },
];

const SAFE_SEARCH_OPTIONS: Option<SafeSearch>[] = [
  { value: 'strict', label: 'Lọc nội dung nhạy cảm', description: 'Ẩn kết quả nhạy cảm khỏi trang tìm kiếm' },
  {
    value: 'moderate',
    label: 'Mức vừa phải',
    description: 'Làm mờ kết quả nhạy cảm theo mặc định của công cụ tìm kiếm',
  },
  { value: 'off', label: 'Hiện tất cả', description: 'Không lọc kết quả tìm kiếm' },
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

const VIEW_MODE_SELECT: Option<ViewMode>[] = VIEW_MODE_OPTIONS.map(o => ({
  value: o.value,
  label: VIEW_MODE_NAMES[o.value],
  description: VIEW_MODE_HINTS[o.value],
}));

const NOVEL_THEME_SELECT: Option<NovelThemeId>[] = NOVEL_THEME_ORDER.map(id => ({
  value: id,
  label: NOVEL_THEMES[id].label,
}));

export function SettingsScreen() {
  const navigation = useAppNavigation();
  const { c } = useTheme();
  const s = useSettings(
    useShallow(state => ({
      themeMode: state.themeMode,
      startPage: state.startPage,
      startPageUrl: state.startPageUrl,
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
      promptBookmark: state.promptBookmark,
      streakPopup: state.streakPopup,
      notifyUpdates: state.notifyUpdates,
      ageConfirmed: state.ageConfirmed,
      novel: state.novel,
      set: state.set,
      setNovel: state.setNovel,
    })),
  );
  const viewer = useReaderSettings(
    useShallow(state => ({
      viewMode: state.viewMode,
      direction: state.direction,
      pageGap: state.pageGap,
      highResImages: state.highResImages,
      set: state.set,
    })),
  );
  const novelTheme = useNovelTheme().id;
  const allowNsfw = useAllowNsfw();
  const [ageDialog, setAgeDialog] = useState(false);
  const [startPageDialog, setStartPageDialog] = useState(false);
  const [cacheSize, setCacheSize] = useState<number | null>(null);
  const set = s.set;

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      folderSize(CachesDirectoryPath).then(size => alive && setCacheSize(size));
      return () => {
        alive = false;
      };
    }, []),
  );

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
        <StatsSummaryCard onPress={() => navigation.navigate('ReadingStats')} />

        <Section title="Chung">
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
          <SelectRow
            title="Tìm kiếm an toàn"
            sheetTitle="Chọn mức tìm kiếm an toàn"
            sheetSubtitle="Áp dụng cho kết quả của công cụ tìm kiếm mặc định"
            icon={ShieldCheck}
            options={SAFE_SEARCH_OPTIONS}
            value={s.safeSearch}
            onChange={safeSearch => set({ safeSearch })}
          />
          <Divider inset={52} />
          <SelectRow
            title="Trang mở khi khởi động"
            subtitle={s.startPage === 'custom' && s.startPageUrl ? s.startPageUrl : undefined}
            sheetTitle="Chọn trang mở khi khởi động"
            icon={Rocket}
            options={START_PAGE_OPTIONS}
            value={s.startPage}
            onChange={startPage => (startPage === 'custom' ? setStartPageDialog(true) : set({ startPage }))}
            onReselect={startPage => startPage === 'custom' && setStartPageDialog(true)}
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
            title="Mở ứng dụng khác từ trang web"
            sheetTitle="Cho phép trang web mở ứng dụng khác"
            icon={SquareArrowOutUpRight}
            options={APP_LINK_OPTIONS}
            value={s.appLinks}
            onChange={appLinks => set({ appLinks })}
          />
          <Divider inset={52} />
          <SwitchRow
            title="Mở link từ màn native trong tab mới"
            subtitle="Ví dụ nút “Xem trang gốc” ở chi tiết truyện"
            icon={AppWindow}
            value={s.openNativeLinksInNewTab}
            onValueChange={openNativeLinksInNewTab => set({ openNativeLinksInNewTab })}
          />
        </Section>

        <Section
          title="Quyền riêng tư & bảo mật"
          footer="Chống chụp màn hình: cần bản build có hỗ trợ native để có hiệu lực. Khi tắt nội dung 18+, nguồn 18+ bị ẩn và ảnh bìa truyện 18+ được làm mờ."
        >
          <ListItem
            title="Xoá dữ liệu duyệt web"
            subtitle={
              cacheSize === null
                ? 'Lịch sử, cookie, bộ nhớ đệm…'
                : `Bộ nhớ đệm ${formatBytes(cacheSize)} · lịch sử, cookie…`
            }
            icon={Eraser}
            chevron
            onPress={() => navigation.navigate('ClearData')}
          />
          <Divider inset={52} />
          <ListItem
            title="Sao lưu & khôi phục"
            subtitle="Bookmark, lịch sử, cài đặt"
            icon={DatabaseBackup}
            chevron
            onPress={() => navigation.navigate('BackupRestore')}
          />
          <Divider inset={52} />
          <SwitchRow
            title="Chống chụp màn hình"
            subtitle="Chặn chụp và quay màn hình trong app"
            icon={ScreenShareOff}
            value={s.preventCapture}
            onValueChange={preventCapture => set({ preventCapture })}
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
          <SwitchRow
            title="Hiện nội dung 18+"
            subtitle={s.ageConfirmed ? 'Đã xác nhận đủ 18 tuổi' : 'Cần xác nhận đủ 18 tuổi'}
            icon={ShieldAlert}
            value={allowNsfw}
            onValueChange={toggleNsfw}
          />
        </Section>

        <Section title="Chặn quảng cáo">
          <ListItem
            title="Chặn quảng cáo"
            subtitle={s.adblock ? 'Đang bật' : 'Đang tắt'}
            icon={ShieldBan}
            chevron
            onPress={() => navigation.navigate('AdblockSettings')}
          />
          <Divider inset={52} />
          <SwitchRow
            title="Chặn popup"
            subtitle="Chặn trang tự mở cửa sổ mới"
            icon={Ban}
            value={s.blockPopups}
            onValueChange={blockPopups => set({ blockPopups })}
          />
        </Section>

        <Section title="Trình xem truyện">
          <SelectRow
            title="Bố cục thư viện mặc định"
            icon={LayoutGrid}
            options={LAYOUT_OPTIONS}
            value={s.libraryLayout}
            onChange={libraryLayout => set({ libraryLayout })}
          />
          <Divider inset={52} />
          <SelectRow
            title="Chế độ xem mặc định"
            icon={GalleryVertical}
            options={VIEW_MODE_SELECT}
            value={viewer.viewMode}
            onChange={viewMode => viewer.set({ viewMode })}
          />
          <Divider inset={52} />
          <SelectRow
            title="Hướng đọc khi lật trang"
            sheetSubtitle="Phải → trái dành cho manga Nhật: vuốt sang phải để sang trang."
            icon={ArrowLeftRight}
            options={DIRECTION_OPTIONS}
            value={viewer.direction}
            onChange={direction => viewer.set({ direction })}
          />
          <Divider inset={52} />
          <SwitchRow
            title="Khoảng cách giữa các trang"
            subtitle="Chèn vạch ngăn giữa các ảnh ở chế độ dọc"
            icon={SeparatorHorizontal}
            value={viewer.pageGap}
            onValueChange={pageGap => viewer.set({ pageGap })}
          />
          <Divider inset={52} />
          <SwitchRow
            title="Ẩn thanh trạng thái"
            subtitle="Áp dụng cho cả trình duyệt và khi đọc truyện"
            icon={PanelTop}
            value={s.hideStatusBar}
            onValueChange={hideStatusBar => set({ hideStatusBar })}
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
            title="Ảnh độ phân giải cao"
            subtitle="Hiển thị ảnh gốc, nét hơn nhưng tốn bộ nhớ"
            icon={Image}
            value={viewer.highResImages}
            onValueChange={highResImages => viewer.set({ highResImages })}
          />
          <Divider inset={52} />
          <ListItem
            title="Cài đặt trình xem"
            subtitle="Tự cuộn, vùng chạm, tải trước, màn hình"
            icon={BookOpen}
            chevron
            onPress={() => navigation.navigate('ViewerSettings')}
          />
          <Divider inset={52} />
          <SwitchRow
            title="Tự kiểm tra chương mới khi mở app"
            subtitle="Kiểm tra truyện đã bookmark, tối đa mỗi 6 giờ một lần"
            icon={RefreshCw}
            value={s.checkUpdatesOnLaunch}
            onValueChange={checkUpdatesOnLaunch => set({ checkUpdatesOnLaunch })}
          />
          {backgroundUpdatesSupported && (
            <>
              <Divider inset={52} />
              <SwitchRow
                title="Thông báo chương mới"
                subtitle="Kiểm tra truyện đã bookmark ở nền khoảng 6 giờ một lần và báo khi có chương mới"
                icon={Bell}
                value={s.notifyUpdates}
                onValueChange={async notifyUpdates => {
                  if (notifyUpdates && !(await ensureNotificationPermission())) {
                    toast('Cần cho phép thông báo trong cài đặt máy để nhận tin chương mới');
                    return;
                  }
                  set({ notifyUpdates });
                }}
              />
            </>
          )}
          <Divider inset={52} />
          <SwitchRow
            title="Gợi ý bookmark khi đọc"
            subtitle="Đọc vài chương của truyện chưa bookmark thì hỏi có muốn bookmark không"
            icon={BookmarkPlus}
            value={s.promptBookmark}
            onValueChange={promptBookmark => set({ promptBookmark })}
          />
          <Divider inset={52} />
          <SwitchRow
            title="Thông báo chuỗi ngày đọc"
            subtitle="Chúc mừng chuỗi ngày đọc khi rời trình đọc, mỗi ngày một lần"
            icon={Flame}
            value={s.streakPopup}
            onValueChange={streakPopup => set({ streakPopup })}
          />
          <Divider inset={52} />
          <SwitchRow
            title="Tự chạy addon trên site đã thêm"
            subtitle="Mở site truyện đã thêm là chuyển sang giao diện native khi trang hỗ trợ"
            icon={Zap}
            value={s.autoRunAddon}
            onValueChange={autoRunAddon => set({ autoRunAddon })}
          />
          <Divider inset={52} />
          <ListItem
            title="Add-ons"
            subtitle="Phiên bản addon, cập nhật từ kho addon"
            icon={Puzzle}
            chevron
            onPress={() => navigation.navigate('AddonManager')}
          />
          <Divider inset={52} />
          <ListItem title="Site được hỗ trợ" icon={Globe} chevron onPress={() => navigation.navigate('Addons')} />
          <Divider inset={52} />
          <ListItem title="Tải xuống" icon={Download} chevron onPress={() => navigation.navigate('Downloads')} />
        </Section>

        <Section title="Đọc tiểu thuyết">
          <SelectRow
            title="Phông chữ mặc định"
            icon={Type}
            options={NOVEL_FONTS}
            value={s.novel.font}
            onChange={fontName => s.setNovel({ font: fontName })}
          />
          <Divider inset={52} />
          <ListItem
            title="Cỡ chữ mặc định"
            icon={ALargeSmall}
            right={
              <Stepper
                value={s.novel.fontSize}
                min={FONT_SIZE_RANGE.min}
                max={FONT_SIZE_RANGE.max}
                onChange={fontSize => s.setNovel({ fontSize })}
              />
            }
          />
          <Divider inset={52} />
          <SelectRow
            title="Màu nền mặc định"
            icon={Contrast}
            options={NOVEL_THEME_SELECT}
            value={novelTheme}
            onChange={setNovelTheme}
          />
          <Divider inset={52} />
          <ListItem
            title="Cài đặt đọc tiểu thuyết"
            subtitle="Giãn dòng, đọc thành tiếng"
            icon={Settings2}
            chevron
            onPress={() => navigation.navigate('NovelSettings')}
          />
        </Section>

        <Section title="Giới thiệu">
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
          <Divider inset={52} />
          <ListItem
            title="Phiên bản"
            icon={Smartphone}
            right={<Text style={[font.caption, { color: c.muted }]}>Manga Reader {packageJson.version}</Text>}
          />
        </Section>
      </ScrollView>

      <AdultContentDialog visible={ageDialog} onClose={() => setAgeDialog(false)} />
      <StartPageDialog
        visible={startPageDialog}
        url={s.startPageUrl}
        onClose={() => setStartPageDialog(false)}
        onSave={startPageUrl => set({ startPage: 'custom', startPageUrl })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: space.lg, gap: space.xl },
});
