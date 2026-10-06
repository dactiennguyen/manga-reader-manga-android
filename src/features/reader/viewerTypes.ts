import type { ReactElement, Ref } from 'react';
import type { GestureResponderEvent } from 'react-native';

import type { Page } from '../../sources/types';

export type ViewerHandle = {
  goToPage: (page: number) => void;
  step: (direction: 1 | -1) => boolean;
};

export type ViewerProps = {
  ref?: Ref<ViewerHandle>;
  pages: readonly Page[];
  getInitialPage: () => number;
  width: number;
  height: number;
  highRes: boolean;
  preloadPages: number;
  footer: ReactElement;
  onPageChange: (page: number) => void;
  onEndVisible: (visible: boolean) => void;
  onTap: (event: GestureResponderEvent) => void;
  onLongPressPage?: (index: number) => void;
  onVerify?: () => void;
};
