import { Vibration } from 'react-native';

import { useSettings } from '../store/useSettings';

export function haptic(duration = 8): void {
  if (useSettings.getState().haptics) {
    Vibration.vibrate(duration);
  }
}
