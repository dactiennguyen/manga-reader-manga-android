import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { EngineId, Genre } from '../sources/types';
import { useBrowser } from '../store/useBrowser';

/**
 * Toàn bộ màn của app. App gốc lấy trình duyệt làm màn gốc, mọi màn native
 * (catalog, chi tiết, reader…) đẩy chồng lên trên — ở đây giữ y cấu trúc đó.
 */
export type RootStackParamList = {
  Browser: undefined;
  /** Danh sách tab (thường + ẩn danh). */
  Tabs: undefined;
  /** "Bookmarks": truyện (Manga/Novel), trang web, site truyện. */
  Bookmarks: { tab?: 'media' | 'web' | 'sites' } | undefined;
  /** Lịch sử đọc truyện + lịch sử duyệt web. */
  History: { tab?: 'reading' | 'web' } | undefined;
  /** Chương đã tải + trang web đã lưu. */
  Downloads: { tab?: 'chapters' | 'pages' | 'files' } | undefined;
  /** "Supported sites": danh mục site của các addon. */
  Addons: undefined;
  /** "Add-ons" (AddOnPage của app gốc): addon đang cài, phiên bản, cập nhật từ kho. */
  AddonManager: undefined;
  /** "Add supported site": thêm domain dùng cùng theme. */
  AddSite: { url?: string; engine?: EngineId } | undefined;
  SourceSettings: { sourceId: string };
  /** Trang chủ catalog của một site: mới cập nhật/phổ biến, tìm kiếm, thể loại. */
  Catalog: { sourceId: string; query?: string; genre?: Genre };
  /** "Manga Search": tìm truyện trên mọi nguồn đang bật. */
  MangaSearch: { query?: string } | undefined;
  MangaDetail: { sourceId: string; url: string; title?: string; cover?: string };
  Reader: { sourceId: string; mangaUrl: string; chapterUrl: string; page?: number };
  NovelReader: { sourceId: string; mangaUrl: string; chapterUrl: string; paragraph?: number };
  ReadingStats: undefined;
  Settings: undefined;
  /** Cài đặt viewer mặc định. */
  ViewerSettings: undefined;
  NovelSettings: undefined;
  AdblockSettings: undefined;
  CustomizeHomepage: undefined;
  BackupRestore: undefined;
  ClearData: undefined;
  About: undefined;
  ViewSource: { url: string };
  /** Xem trang web đã lưu offline. */
  SavedPage: { id: string };
  QRScanner: undefined;
  /** WebView nhỏ để vượt trang chống bot rồi quay lại màn đang lỗi. */
  Verify: { url: string };
};

export type AppNavigation = NativeStackNavigationProp<RootStackParamList>;

export function useAppNavigation(): AppNavigation {
  return useNavigation<AppNavigation>();
}

/**
 * Mở URL trong trình duyệt của app rồi quay về màn trình duyệt
 * ("View original web page"…). Trình duyệt luôn là màn gốc nên dùng popTo
 * để không chồng thêm một WebView nữa.
 */
export function openInBrowser(
  navigation: AppNavigation,
  url: string,
  options: { newTab?: boolean } = {},
): void {
  useBrowser.getState().openUrl(url, { newTab: options.newTab ?? true });
  navigation.popTo('Browser');
}
