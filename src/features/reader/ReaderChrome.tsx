import { memo, useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpDown,
  Bookmark,
  CircleChevronDown,
  Download,
  GalleryThumbnails,
  Hand,
  List,
  Pause,
  Play,
  ScreenLockLandscape,
  ScreenLockPortrait,
  ScreenRotation,
  Settings,
  SplitScreen,
  Square,
  Sun,
} from '../../components/icons';
import type { OrientationLock } from '../../lib/screen';
import type { DownloadStatus } from '../../store/useDownloads';
import { useReaderSettings, type ViewMode } from '../../store/useReaderSettings';
import { radius, space } from '../../theme';
import {
  BrightnessSlider,
  CHROME_ACCENT,
  CHROME_FG,
  CHROME_SCRIM,
  ChromeButton,
  ChromeSlider,
  ProgressSlider,
  SIDE_TOOLBAR_WIDTH,
  SideToolbar,
  useChromeAnimation,
} from './chromeParts';
import type { ValueStore } from './valueStore';

export type ReaderChromeActions = {
  onBack: () => void;
  onSeek: (page: number) => void;
  onOpenChapters: () => void;
  onOpenOverview: () => void;
  onOpenMenu: () => void;
  onOpenModes: () => void;
  onBookmark: () => void;
  onDownload: () => void;
  onToggleTapToScroll: () => void;
  onToggleViewMode: () => void;
  onToggleDirection: () => void;
  onToggleGap: () => void;
  onToggleAutoScroll: () => void;
  onToggleOrientation: () => void;
};

type Props = {
  visible: boolean;
  chapterName: string;
  pageStore: ValueStore<number>;
  total: number;
  viewMode: ViewMode;
  rtl: boolean;
  pageGap: boolean;
  autoPlaying: boolean;
  tapToScroll: boolean;
  bookmarked: boolean;
  downloadStatus?: DownloadStatus;
  orientationLock?: OrientationLock;
  actions: ReaderChromeActions;
};

const on = (active: boolean) => (active ? CHROME_ACCENT : CHROME_FG);

const DOWNLOAD_LABEL: Record<DownloadStatus, string> = {
  queued: 'Chương đang chờ tải',
  downloading: 'Đang tải chương',
  paused: 'Đã tạm dừng tải chương',
  done: 'Đã tải chương',
  error: 'Tải chương lỗi, bấm để thử lại',
};

export const ReaderChrome = memo(function ReaderChromeView({
  visible,
  chapterName,
  pageStore,
  total,
  viewMode,
  rtl,
  pageGap,
  autoPlaying,
  tapToScroll,
  bookmarked,
  downloadStatus,
  orientationLock,
  actions,
}: Props) {
  const insets = useSafeAreaInsets();
  const anim = useChromeAnimation(visible);
  const [brightness, setBrightness] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);

  useEffect(() => {
    if (!visible) {
      setBrightness(false);
      setSpeedOpen(false);
    }
  }, [visible]);

  const vertical = viewMode === 'vertical';
  const horizontalAxis = viewMode === 'horizontal' || viewMode === 'double';

  return (
    <>
      <Animated.View pointerEvents={anim.pointerEvents} style={[styles.top, { paddingTop: insets.top }, anim.top]}>
        <View style={styles.topRow}>
          <ChromeButton icon={ArrowLeft} onPress={actions.onBack} accessibilityLabel="Quay lại" />
          <Text numberOfLines={1} style={styles.title}>
            {chapterName}
          </Text>
          <ChromeButton
            icon={Bookmark}
            color={on(bookmarked)}
            filled={bookmarked}
            onPress={actions.onBookmark}
            accessibilityLabel={bookmarked ? 'Đã lưu bookmark' : 'Thêm vào bookmark'}
          />
          <ChromeButton
            icon={Hand}
            color={on(tapToScroll)}
            onPress={actions.onToggleTapToScroll}
            accessibilityLabel={tapToScroll ? 'Tắt chạm để cuộn' : 'Bật chạm để cuộn'}
          />
          <ChromeButton
            icon={CircleChevronDown}
            color={on(autoPlaying || speedOpen)}
            onPress={() => setSpeedOpen(value => !value)}
            accessibilityLabel="Tự cuộn"
          />
          <ChromeButton icon={Settings} onPress={actions.onOpenMenu} accessibilityLabel="Cài đặt đọc" />
        </View>
      </Animated.View>

      {total > 0 && (
        <Animated.View pointerEvents={anim.pointerEvents} style={[styles.layer, anim.side]}>
          <SideToolbar>
            <ChromeButton icon={GalleryThumbnails} onPress={actions.onOpenOverview} accessibilityLabel="Tổng quan trang" />
            <ChromeButton
              icon={vertical ? ArrowUpDown : ArrowLeftRight}
              onPress={actions.onToggleViewMode}
              onLongPress={actions.onOpenModes}
              accessibilityLabel={vertical ? 'Chuyển sang lật trang ngang' : 'Chuyển sang cuộn dọc'}
            />
            {orientationLock && (
              <OrientationButton lock={orientationLock} color={CHROME_FG} onPress={actions.onToggleOrientation} />
            )}
          </SideToolbar>
        </Animated.View>
      )}

      {speedOpen && visible && (
        <View pointerEvents="box-none" style={styles.center}>
          <AutoScrollCard playing={autoPlaying} enabled={vertical} onToggle={actions.onToggleAutoScroll} />
        </View>
      )}

      <Animated.View pointerEvents={anim.pointerEvents} style={[styles.bottom, anim.bottom]}>
        {brightness && (
          <View style={[styles.sliderRow, styles.inset]}>
            <BrightnessSlider />
          </View>
        )}
        {total > 0 && (
          <View style={[styles.sliderRow, styles.inset]}>
            <ProgressSlider store={pageStore} total={total} onSeek={actions.onSeek} />
          </View>
        )}
        <View style={[styles.toolbar, { paddingBottom: insets.bottom }]}>
          <ChromeButton icon={List} onPress={actions.onOpenChapters} accessibilityLabel="Chọn chương" />
          <ChromeButton
            icon={Download}
            color={on(downloadStatus === 'done')}
            onPress={actions.onDownload}
            accessibilityLabel={downloadStatus ? DOWNLOAD_LABEL[downloadStatus] : 'Tải chương này'}
          />
          {vertical ? (
            <ChromeButton
              icon={pageGap ? SplitScreen : Square}
              onPress={actions.onToggleGap}
              accessibilityLabel={pageGap ? 'Bỏ khoảng cách giữa trang' : 'Thêm khoảng cách giữa trang'}
            />
          ) : (
            <ChromeButton
              icon={ArrowLeftRight}
              color={on(horizontalAxis && rtl)}
              disabled={!horizontalAxis}
              onPress={actions.onToggleDirection}
              accessibilityLabel={rtl ? 'Đọc từ trái sang phải' : 'Đọc từ phải sang trái'}
            />
          )}
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

function AutoScrollCard({ playing, enabled, onToggle }: { playing: boolean; enabled: boolean; onToggle: () => void }) {
  const { speed, setSpeed } = useReaderSettings(
    useShallow(state => ({ speed: state.autoScrollSpeed, setSpeed: state.setAutoScrollSpeed })),
  );
  const [preview, setPreview] = useState<number | null>(null);
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Tốc độ tự cuộn (chỉ chế độ dọc)</Text>
      <View style={styles.cardRow}>
        <ChromeSlider
          value={speed}
          min={10}
          max={400}
          step={5}
          disabled={!enabled}
          onChange={setPreview}
          onComplete={value => {
            setPreview(null);
            setSpeed(value);
          }}
          style={styles.flex}
        />
        <Text style={styles.cardValue}>{preview ?? speed} px/giây</Text>
        <ChromeButton
          icon={playing ? Pause : Play}
          color={on(playing)}
          disabled={!enabled}
          onPress={onToggle}
          accessibilityLabel={playing ? 'Dừng tự cuộn' : 'Bắt đầu tự cuộn'}
        />
      </View>
      {!enabled && <Text style={styles.cardNote}>Chuyển sang chế độ cuộn dọc để dùng tự cuộn.</Text>}
    </View>
  );
}

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
  flex: { flex: 1 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: CHROME_SCRIM },
  topRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: space.xs },
  title: { flex: 1, color: CHROME_FG, fontSize: 17, fontWeight: '500', paddingHorizontal: space.xs },
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingLeft: space.xl,
    paddingRight: SIDE_TOOLBAR_WIDTH + space.sm,
  },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: CHROME_SCRIM },
  sliderRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  inset: { paddingHorizontal: space.lg },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    minHeight: 52,
  },
  card: {
    borderRadius: radius.lg,
    paddingLeft: space.lg,
    paddingRight: space.xs,
    paddingVertical: space.md,
    gap: space.xs,
    backgroundColor: 'rgba(28,28,28,0.94)',
  },
  cardTitle: { color: CHROME_FG, fontSize: 15 },
  cardValue: { color: 'rgba(255,255,255,0.7)', fontSize: 12, minWidth: 64, textAlign: 'right' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  cardNote: { color: 'rgba(255,255,255,0.65)', fontSize: 12, paddingRight: space.md },
});
