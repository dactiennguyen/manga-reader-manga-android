import type { ReactElement, Ref } from 'react';
import type { GestureResponderEvent } from 'react-native';

import type { Page } from '../../sources/types';

export type ViewerHandle = {
  goToPage: (page: number) => void;
  /** Cuộn/lật một nấc theo chạm; trả về false nếu đã ở đầu/cuối chương. */
  step: (direction: 1 | -1) => boolean;
};

/** Props chung của các viewer. Mọi callback phải ổn định (useCallback). */
export type ViewerProps = {
  ref?: Ref<ViewerHandle>;
  pages: readonly Page[];
  /** Gọi một lần lúc viewer mount để lấy trang mở đầu. */
  getInitialPage: () => number;
  /** Kích thước khung đọc. */
  width: number;
  height: number;
  highRes: boolean;
  preloadPages: number;
  /** Khối "Hết chương". */
  footer: ReactElement;
  onPageChange: (page: number) => void;
  onEndVisible: (visible: boolean) => void;
  onTap: (event: GestureResponderEvent) => void;
  onLongPressPage?: (index: number) => void;
  /** Ảnh lỗi: mở màn xác minh chống bot (bỏ trống với chương đã tải offline). */
  onVerify?: () => void;
};
