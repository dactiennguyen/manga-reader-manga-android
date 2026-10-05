import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * Việc nền của thư viện (workmanager của app gốc): định kỳ chạy task JS
 * "CheckLibraryUpdates" để kiểm tra chương mới, và đăng thông báo.
 */
export interface Spec extends TurboModule {
  /** Lên lịch kiểm tra định kỳ (WorkManager, chỉ khi có mạng). Gọi lại thì thay lịch cũ. */
  scheduleUpdateCheck(intervalHours: number): void;
  cancelUpdateCheck(): void;
  /** Chạy kiểm tra một lần ngay (qua WorkManager, như khi chạy nền thật). */
  runUpdateCheckNow(): void;
  /** Thông báo "chương mới"; bấm vào mở app. */
  showNotification(id: number, title: string, text: string): void;
}

export default TurboModuleRegistry.get<Spec>('NativeLibraryTasks');
