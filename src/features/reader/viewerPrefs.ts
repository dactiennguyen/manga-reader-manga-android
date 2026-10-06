import {
  resolveViewerPrefs,
  useReaderSettings,
  type ReadingDirection,
  type TapZone,
  type ViewerPrefs,
  type ViewMode,
} from '../../store/useReaderSettings';

export const VIEW_MODE_OPTIONS: readonly { value: ViewMode; label: string }[] = [
  { value: 'vertical', label: 'Dọc' },
  { value: 'horizontal', label: 'Ngang' },
  { value: 'single', label: 'Đơn' },
  { value: 'double', label: 'Đôi' },
];

export const VIEW_MODE_NAMES: Record<ViewMode, string> = {
  vertical: 'Cuộn dọc (webtoon)',
  horizontal: 'Lật trang ngang',
  single: 'Lật trang dọc',
  double: 'Hai trang một màn',
};

export const VIEW_MODE_HINTS: Record<ViewMode, string> = {
  vertical: 'Cuộn liên tục từ trên xuống, hợp với webtoon và manhwa.',
  horizontal: 'Vuốt ngang để lật từng trang.',
  single: 'Vuốt lên/xuống để lật từng trang.',
  double: 'Hai trang cạnh nhau như sách mở, hợp khi xoay ngang máy.',
};

export const DIRECTION_OPTIONS: readonly { value: ReadingDirection; label: string }[] = [
  { value: 'ltr', label: 'Trái → phải' },
  { value: 'rtl', label: 'Phải → trái' },
];

export const TAP_ZONE_OPTIONS: readonly { value: TapZone; label: string }[] = [
  { value: 'edges', label: 'Các cạnh' },
  { value: 'leftRight', label: 'Trái/phải' },
  { value: 'topBottom', label: 'Trên/dưới' },
];

export const TAP_ZONE_HINTS: Record<TapZone, string> = {
  edges: 'Chạm cạnh trái hoặc trên để lùi, cạnh phải hoặc dưới để tiến.',
  leftRight: 'Chạm một phần ba bên trái để lùi, bên phải để tiến.',
  topBottom: 'Chạm một phần ba phía trên để lùi, phía dưới để tiến.',
  off: 'Chạm chỉ để hiện/ẩn thanh điều khiển.',
};

const MODE_ORDER: ViewMode[] = ['vertical', 'horizontal', 'single', 'double'];

export function nextViewMode(mode: ViewMode): ViewMode {
  return MODE_ORDER[(MODE_ORDER.indexOf(mode) + 1) % MODE_ORDER.length];
}

function pickPrefs(prefs: ViewerPrefs): ViewerPrefs {
  return { viewMode: prefs.viewMode, direction: prefs.direction, pageGap: prefs.pageGap };
}

export function updateViewerPrefs(mangaKey: string, patch: Partial<ViewerPrefs>): void {
  const state = useReaderSettings.getState();
  const current = resolveViewerPrefs(state, mangaKey);
  const next = { ...pickPrefs(current), ...patch };
  if (current.overridden) {
    state.setViewerPrefs(next, mangaKey);
  } else {
    state.setViewerPrefs(next);
  }
}

export function setApplyToAll(mangaKey: string, applyAll: boolean): void {
  const state = useReaderSettings.getState();
  const current = resolveViewerPrefs(state, mangaKey);
  if (applyAll) {
    state.setViewerPrefs(pickPrefs(current));
    if (current.overridden) {
      state.clearOverride(mangaKey);
    }
  } else {
    state.setViewerPrefs(pickPrefs(current), mangaKey);
  }
}
