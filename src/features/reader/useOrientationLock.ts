import { useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect } from 'react';
import { Dimensions } from 'react-native';

import { toast } from '../../components/ui';
import { orientationSupported, setOrientationLock } from '../../lib/screen';
import { useReaderSettings } from '../../store/useReaderSettings';

/**
 * Nút khoá xoay của reader (manga và novel): khoá theo hướng đang cầm máy,
 * bấm lần nữa thì trả về tự xoay. Chỉ áp dụng khi màn reader đang hiện.
 */
export function useOrientationLock() {
  const lock = useReaderSettings(s => s.orientationLock);
  const focused = useIsFocused();

  useEffect(() => {
    if (!focused || lock === 'auto') {
      return;
    }
    setOrientationLock(lock);
    return () => setOrientationLock('auto');
  }, [focused, lock]);

  const toggle = useCallback(() => {
    const store = useReaderSettings.getState();
    if (store.orientationLock !== 'auto') {
      store.set({ orientationLock: 'auto' });
      toast('Màn hình tự xoay');
      return;
    }
    const { width, height } = Dimensions.get('window');
    const next = width > height ? 'landscape' : 'portrait';
    store.set({ orientationLock: next });
    toast(next === 'portrait' ? 'Đã khoá màn hình dọc' : 'Đã khoá màn hình ngang');
  }, []);

  return { lock, toggle, supported: orientationSupported };
}
