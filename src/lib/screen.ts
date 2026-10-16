import NativeScreen from '../../specs/NativeScreen';


export type OrientationLock = 'auto' | 'portrait' | 'landscape';

export function setOrientationLock(mode: OrientationLock): void {
  NativeScreen?.setOrientation(mode);
}

export function setSecureScreen(enabled: boolean): void {
  NativeScreen?.setSecure(enabled);
}

export const orientationSupported = !!NativeScreen;

export type BatteryState = { level: number; charging: boolean };

export function getBatteryState(): BatteryState | undefined {
  try {
    const level = NativeScreen?.getBatteryLevel?.();
    if (typeof level !== 'number' || level < 0) {
      return undefined;
    }
    return { level: Math.round(level), charging: !!NativeScreen?.isCharging?.() };
  } catch {
    return undefined;
  }
}
