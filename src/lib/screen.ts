import NativeScreen from '../../specs/NativeScreen';

/**
 * Khoá xoay và chặn chụp màn hình (TurboModule NativeScreen, chỉ có trên
 * Android). Nền tảng không có module thì các hàm không làm gì.
 */

export type OrientationLock = 'auto' | 'portrait' | 'landscape';

export function setOrientationLock(mode: OrientationLock): void {
  NativeScreen?.setOrientation(mode);
}

export function setSecureScreen(enabled: boolean): void {
  NativeScreen?.setSecure(enabled);
}

export const orientationSupported = !!NativeScreen;
