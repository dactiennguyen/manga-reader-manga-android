import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  scheduleUpdateCheck(intervalHours: number): void;
  cancelUpdateCheck(): void;
  runUpdateCheckNow(): void;
  showNotification(id: number, title: string, text: string): void;
}

export default TurboModuleRegistry.get<Spec>('NativeLibraryTasks');
