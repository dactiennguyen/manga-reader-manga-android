import { memo, useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddonBar } from '../../components/AddressBarParts';
import {
  ArrowLeftRight,
  ArrowUpDown,
  CircleHelp,
  Hand,
  LayoutGrid,
  List,
  Maximize2,
  Minimize2,
  PanelBottom,
  Pause,
  Play,
  ScreenLockLandscape,
  ScreenLockPortrait,
  ScreenRotation,
  SkipBack,
  SkipForward,
  Sun,
} from '../../components/icons';
import type { OrientationLock } from '../../lib/screen';
import type { ViewMode } from '../../store/useReaderSettings';
import { space } from '../../theme';
import {
  BrightnessSlider,
  CHROME_ACCENT,
  CHROME_BAR,
  CHROME_FG,
  CHROME_SCRIM,
  ChromeButton,
  ProgressSlider,
  SideToolbar,
  useChromeAnimation,
} from './chromeParts';
import type { ValueStore } from './valueStore';

export type ReaderChromeActions = {
  onPrev: () => void;
  onNext: () => void;
  onSeek: (page: number) => void;
  onOpenChapters: () => void;
  onOpenSettings: () => void;
  onOpenMenu: () => void;
  onOpenModes: () => void;
  onOpenHelp: () => void;
  onToggleTapToScroll: () => void;
  onToggleDirection: () => void;
  onToggleGap: () => void;
  onToggleAutoScroll: () => void;
  onToggleImmersive: () => void;
  onToggleOrientation: () => void;
};

type Props = {
  visible: boolean;
  chapterUrl: string;
  chapterName: string;
  pageStore: ValueStore<number>;
  total: number;
  viewMode: ViewMode;
  rtl: boolean;
  pageGap: boolean;
  autoPlaying: boolean;
  immersive: boolean;
  tapToScroll: boolean;
  orientationLock?: OrientationLock;
  hasPrev: boolean;
  hasNext: boolean;
  actions: ReaderChromeActions;
};

const on = (active: boolean) => (active ? CHROME_ACCENT : CHROME_FG);

export const ReaderChrome = memo(function ReaderChromeView({
  visible,
  chapterUrl,
  chapterName,
  pageStore,
  total,
  viewMode,
  rtl,
  pageGap,
  autoPlaying,
  immersive,
  tapToScroll,
  orientationLock,
  hasPrev,
  hasNext,
  actions,
}: Props) {
  const insets = useSafeAreaInsets();
  const anim = useChromeAnimation(visible);
  const [brightness, setBrightness] = useState(false);

  useEffect(() => {
    if (!visible) {
      setBrightness(false);
    }
  }, [visible]);

  const vertical = viewMode === 'vertical';
  const horizontalAxis = viewMode === 'horizontal' || viewMode === 'double';

  return (
    <>
      <Animated.View pointerEvents={anim.pointerEvents} style={[styles.top, anim.top]}>
        <AddonBar url={chapterUrl} onMenu={actions.onOpenMenu} />
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.title}>
            {chapterName}
          </Text>
          <ChromeButton
            icon={Hand}
            color={on(tapToScroll)}
            onPress={actions.onToggleTapToScroll}
            accessibilityLabel={tapToScroll ? 'Tắt chạm để cuộn' : 'Bật chạm để cuộn'}
          />
          <ChromeButton icon={CircleHelp} onPress={actions.onOpenHelp} accessibilityLabel="Vùng chạm và cử chỉ" />
        </View>
      </Animated.View>

      {total > 0 && (
        <Animated.View pointerEvents={anim.pointerEvents} style={[styles.layer, anim.side]}>
          <SideToolbar>
            <ChromeButton icon={LayoutGrid} onPress={actions.onOpenModes} accessibilityLabel="Chế độ xem" />
            {vertical ? (
              <ChromeButton
                icon={ArrowUpDown}
                color={on(pageGap)}
                onPress={actions.onToggleGap}
                accessibilityLabel={pageGap ? 'Bỏ khoảng cách giữa trang' : 'Thêm khoảng cách giữa trang'}
              />
            ) : (
              <ChromeButton
                icon={horizontalAxis ? ArrowLeftRight : ArrowUpDown}
                color={on(horizontalAxis && rtl)}
                disabled={!horizontalAxis}
                onPress={actions.onToggleDirection}
                accessibilityLabel={rtl ? 'Đọc từ trái sang phải' : 'Đọc từ phải sang trái'}
              />
            )}
            {vertical ? (
              <ChromeButton
                icon={autoPlaying ? Pause : Play}
                color={on(autoPlaying)}
                onPress={actions.onToggleAutoScroll}
                accessibilityLabel={autoPlaying ? 'Dừng tự cuộn' : 'Tự cuộn'}
              />
            ) : (
              <ChromeButton
                icon={immersive ? Minimize2 : Maximize2}
                color={on(immersive)}
                onPress={actions.onToggleImmersive}
                accessibilityLabel={immersive ? 'Tắt toàn màn hình' : 'Toàn màn hình'}
              />
            )}
            {orientationLock && (
              <OrientationButton lock={orientationLock} color={CHROME_FG} onPress={actions.onToggleOrientation} />
            )}
          </SideToolbar>
        </Animated.View>
      )}

      <Animated.View pointerEvents={anim.pointerEvents} style={[styles.bottom, anim.bottom]}>
        {brightness && (
          <View style={[styles.scrimRow, styles.brightness]}>
            <BrightnessSlider />
          </View>
        )}
        {total > 0 && (
          <View style={styles.scrimRow}>
            <ChromeButton
              icon={SkipBack}
              size={20}
              disabled={!hasPrev}
              onPress={actions.onPrev}
              accessibilityLabel="Chương trước"
            />
            <ProgressSlider store={pageStore} total={total} onSeek={actions.onSeek} />
            <ChromeButton
              icon={SkipForward}
              size={20}
              disabled={!hasNext}
              onPress={actions.onNext}
              accessibilityLabel="Chương sau"
            />
          </View>
        )}
        <View style={[styles.toolbar, { paddingBottom: insets.bottom }]}>
          <ChromeButton icon={List} onPress={actions.onOpenChapters} accessibilityLabel="Chọn chương" />
          <ChromeButton icon={PanelBottom} onPress={actions.onOpenSettings} accessibilityLabel="Cài đặt trình xem" />
          <ChromeButton
            icon={Sun}
            color={on(brightness)}
            onPress={() => setBrightness(value => !value)}
            accessibilityLabel="Độ sáng"
          />
        </View>
      </Animated.View>
    </>
  );
});

const ORIENTATION_ICONS = {
  auto: ScreenRotation,
  portrait: ScreenLockPortrait,
  landscape: ScreenLockLandscape,
} as const;

export function OrientationButton({
  lock,
  color,
  onPress,
}: {
  lock: OrientationLock;
  color: string;
  onPress: () => void;
}) {
  return (
    <ChromeButton
      icon={ORIENTATION_ICONS[lock]}
      color={lock === 'auto' ? color : CHROME_ACCENT}
      onPress={onPress}
      accessibilityLabel={lock === 'auto' ? 'Khoá xoay màn hình' : 'Bỏ khoá xoay màn hình'}
    />
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 0, right: 0 },
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingLeft: space.lg,
    paddingRight: space.xs,
    backgroundColor: CHROME_SCRIM,
  },
  title: { flex: 1, color: CHROME_FG, fontSize: 16, fontWeight: '500', paddingRight: space.sm },
  scrimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: space.xs,
    backgroundColor: CHROME_SCRIM,
  },
  brightness: { paddingHorizontal: space.lg },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    minHeight: 52,
    backgroundColor: CHROME_BAR,
  },
});
