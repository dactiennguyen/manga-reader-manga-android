import NativeScreen from '../../specs/NativeScreen';


export type OrientationLock = 'auto' | 'portrait' | 'landscape';

export function setOrientationLock(mode: OrientationLock): void {
  NativeScreen?.setOrientation(mode);
}

export function setSecureScreen(enabled: boolean): void {
  NativeScreen?.setSecure(enabled);
}

export const orientationSupported = !!NativeScreen;
