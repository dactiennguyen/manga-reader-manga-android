import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/** Điều khiển cửa sổ của Activity: khoá xoay màn hình và chặn chụp màn hình. */
export interface Spec extends TurboModule {
  /** 'auto' (theo cảm biến/cài đặt máy) | 'portrait' | 'landscape'. */
  setOrientation(mode: string): void;
  /** Bật FLAG_SECURE: chặn chụp/quay màn hình và ẩn nội dung ở màn đa nhiệm. */
  setSecure(enabled: boolean): void;
}

// get (không phải getEnforcing): iOS chưa có bản cài đặt, khi đó trả null.
export default TurboModuleRegistry.get<Spec>('NativeScreen');
