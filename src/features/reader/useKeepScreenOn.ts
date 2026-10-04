import { useIsFocused } from '@react-navigation/native';
import { activateKeepAwake, deactivateKeepAwake } from '@sayem314/react-native-keep-awake';
import { useEffect } from 'react';

/** Giữ màn hình sáng khi màn đọc đang hiển thị. */
export function useKeepScreenOn(enabled: boolean): void {
  const focused = useIsFocused();
  useEffect(() => {
    if (!enabled || !focused) {
      return;
    }
    activateKeepAwake();
    return () => deactivateKeepAwake();
  }, [enabled, focused]);
}
