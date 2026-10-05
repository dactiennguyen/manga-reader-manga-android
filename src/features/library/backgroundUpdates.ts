import { PermissionsAndroid, Platform } from 'react-native';

import NativeLibraryTasks from '../../../specs/NativeLibraryTasks';
import { setWebUserAgent } from '../../lib/http';
import { configureSources } from '../../sources/runtime';
import { useBrowser } from '../../store/useBrowser';
import { useLibrary } from '../../store/useLibrary';
import { useSettings } from '../../store/useSettings';
import { checkLibraryUpdates, type UpdateCheckResult } from './updates';

/**
 * "Notify bookmarked manga or novel updates": WorkManager định kỳ gọi task JS
 * CheckLibraryUpdates (đăng ký ở index.js), task kiểm tra chương mới bằng
 * engine như khi mở app rồi đăng thông báo. Chỉ có trên Android.
 */

export const BACKGROUND_TASK = 'CheckLibraryUpdates';
const INTERVAL_HOURS = 6;
const NOTIFICATION_ID = 1001;

export const backgroundUpdatesSupported = !!NativeLibraryTasks;

/** Bật/tắt lịch kiểm tra nền theo cài đặt. */
export function applyUpdateSchedule(enabled: boolean): void {
  if (!NativeLibraryTasks) {
    return;
  }
  if (enabled) {
    NativeLibraryTasks.scheduleUpdateCheck(INTERVAL_HOURS);
  } else {
    NativeLibraryTasks.cancelUpdateCheck();
  }
}

/** Android 13+ phải xin quyền thông báo lúc chạy. Trả false nếu bị từ chối. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 33) {
    return true;
  }
  const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
  if (await PermissionsAndroid.check(permission)) {
    return true;
  }
  return (await PermissionsAndroid.request(permission)) === PermissionsAndroid.RESULTS.GRANTED;
}

export function notificationText(result: UpdateCheckResult): { title: string; text: string } {
  const shown = result.titles.slice(0, 3).join(', ');
  const more = result.titles.length > 3 ? ` và ${result.titles.length - 3} truyện khác` : '';
  return {
    title: `${result.newChapters} chương mới từ ${result.updated} truyện`,
    text: `${shown}${more}`,
  };
}

/** Task chạy ở nền (app có thể đang tắt): dựng lại cấu hình engine rồi kiểm tra. */
export async function runBackgroundUpdateCheck(): Promise<void> {
  const settings = useSettings.getState();
  if (!settings.notifyUpdates || !Object.keys(useLibrary.getState().bookmarks).length) {
    return;
  }
  configureSources({ allowNsfw: settings.showNsfw && settings.ageConfirmed });
  setWebUserAgent(useBrowser.getState().userAgent);
  const result = await checkLibraryUpdates();
  if (result?.updated) {
    const { title, text } = notificationText(result);
    NativeLibraryTasks?.showNotification(NOTIFICATION_ID, title, text);
  }
}
