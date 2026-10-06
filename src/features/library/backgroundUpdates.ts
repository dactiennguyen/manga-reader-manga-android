import { PermissionsAndroid, Platform } from 'react-native';

import NativeLibraryTasks from '../../../specs/NativeLibraryTasks';
import { setWebUserAgent } from '../../lib/http';
import { configureSources } from '../../sources/runtime';
import { useBrowser } from '../../store/useBrowser';
import { useLibrary } from '../../store/useLibrary';
import { useSettings } from '../../store/useSettings';
import { checkLibraryUpdates, type UpdateCheckResult } from './updates';


export const BACKGROUND_TASK = 'CheckLibraryUpdates';
const INTERVAL_HOURS = 6;
const NOTIFICATION_ID = 1001;

export const backgroundUpdatesSupported = !!NativeLibraryTasks;

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
