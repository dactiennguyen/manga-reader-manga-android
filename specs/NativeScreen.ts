import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  setOrientation(mode: string): void;
  setSecure(enabled: boolean): void;
  getBatteryLevel(): number;
  isCharging(): boolean;
}

export default TurboModuleRegistry.get<Spec>('NativeScreen');
