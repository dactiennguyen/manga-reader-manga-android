import { memo, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { AddonBar } from '../../components/AddressBarParts';
import {
  ArrowLeft,
  ArrowUpDown,
  ChevronRight,
  CircleHelp,
  Hand,
  Headphones,
  List,
  Minus,
  Pause,
  Play,
  Plus,
  SkipBack,
  SkipForward,
  Square,
  type LucideIcon,
} from '../../components/icons';
import type { OrientationLock } from '../../lib/screen';
import { useReaderSettings } from '../../store/useReaderSettings';
import { useSettings } from '../../store/useSettings';
import { font, radius, space } from '../../theme';
import {
  BrightnessSlider,
  ChromeButton,
  ChromeSlider,
  ProgressSlider,
  SideToolbar,
  useChromeAnimation,
} from '../reader/chromeParts';
import { OrientationButton } from '../reader/ReaderChrome';
import type { ValueStore } from '../reader/valueStore';
import {
  FONT_SIZE_RANGE,
  LINE_HEIGHT_PRESETS,
  NOVEL_FONTS,
  NOVEL_THEME_ORDER,
  NOVEL_THEMES,
  setNovelTheme,
  type NovelPalette,
  type NovelThemeId,
} from './novelThemes';
import type { TtsState } from './useTts';

export type NovelChromeActions = {
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (paragraph: number) => void;
  onOpenChapters: () => void;
  onOpenMenu: () => void;
  onOpenHelp: () => void;
  onOpenFonts: () => void;
  onToggleTapToScroll: () => void;
  onToggleAutoScroll: () => void;
  onReadAloud: () => void;
  onPauseTts: () => void;
  onResumeTts: () => void;
  onStopTts: () => void;
  onToggleOrientation: () => void;
};

type Props = {
  visible: boolean;
  chapterUrl: string;
  chapterName: string;
  palette: NovelPalette;
  themeId: NovelThemeId;
  positionStore: ValueStore<number>;
  paragraphCount: number;
  ready: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  tapToScroll: boolean;
  autoScrolling: boolean;
  ttsState: TtsState;
  ttsIndex: number | null;
  orientationLock?: OrientationLock;
  actions: NovelChromeActions;
};

const SPEED_STEP = 5;

function LinesGlyph({ count, color }: { count: number; color: string }) {
  return (
    <View style={styles.glyph}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={[styles.glyphLine, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

function OutlineButton({
  children,
  onPress,
  palette,
  selected,
  accessibilityLabel,
  wide,
}: {
  children: ReactNode;
  onPress: () => void;
  palette: NovelPalette;
  selected?: boolean;
  accessibilityLabel: string;
  wide?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [
        styles.outline,
        wide && styles.outlineWide,
        { borderColor: selected || wide ? palette.accent : palette.border },
        selected && { backgroundColor: palette.highlight },
        pressed && styles.pressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

function ReadingPanel({
  palette,
  themeId,
  positionStore,
  paragraphCount,
  hasPrev,
  hasNext,
  actions,
}: Pick<Props, 'palette' | 'themeId' | 'positionStore' | 'paragraphCount' | 'hasPrev' | 'hasNext' | 'actions'>) {
  const novel = useSettings(state => state.novel);
  const setNovel = useSettings(state => state.setNovel);
  const fontLabel = NOVEL_FONTS.find(option => option.value === novel.font)?.label ?? 'Hệ thống';
  const sliderColors = { color: palette.accent, trackColor: palette.border };
  const textColor = { color: palette.text };

  return (
    <View style={styles.panel}>
      <View style={styles.panelRow}>
        <ChromeButton
          icon={SkipBack}
          size={20}
          color={palette.text}
          disabled={!hasPrev}
          onPress={actions.onPrev}
          accessibilityLabel="Chương trước"
        />
        <ProgressSlider
          store={positionStore}
          total={paragraphCount}
          onSeek={actions.onSeek}
          textColor={palette.text}
          {...sliderColors}
        />
        <ChromeButton
          icon={SkipForward}
          size={20}
          color={palette.text}
          disabled={!hasNext}
          onPress={actions.onNext}
          accessibilityLabel="Chương sau"
        />
      </View>
      <View style={styles.inset}>
        <BrightnessSlider iconColor={palette.text} {...sliderColors} />
      </View>
      <View style={[styles.inset, styles.sizeRow]}>
        <Text style={[styles.sizeLabel, textColor]}>A-</Text>
        <ChromeSlider
          value={novel.fontSize}
          min={FONT_SIZE_RANGE.min}
          max={FONT_SIZE_RANGE.max}
          onChange={fontSize => {
            if (fontSize !== useSettings.getState().novel.fontSize) {
              setNovel({ fontSize });
            }
          }}
          style={styles.flex}
          {...sliderColors}
        />
        <Text style={[styles.sizeLabel, styles.sizeLarge, textColor]}>A+</Text>
      </View>
      <View style={[styles.inset, styles.buttons]}>
        <OutlineButton onPress={actions.onOpenFonts} palette={palette} accessibilityLabel="Phông chữ" wide>
          <Text numberOfLines={1} style={[font.label, styles.fontName, { color: palette.accent }]}>
            {fontLabel}
          </Text>
          <ChevronRight size={16} color={palette.accent} />
        </OutlineButton>
        {LINE_HEIGHT_PRESETS.map(preset => {
          const selected = Math.abs(novel.lineHeight - preset.value) < 0.05;
          return (
            <OutlineButton
              key={preset.value}
              onPress={() => setNovel({ lineHeight: preset.value })}
              palette={palette}
              selected={selected}
              accessibilityLabel={preset.label}
            >
              <LinesGlyph count={preset.lines} color={selected ? palette.accent : palette.text} />
            </OutlineButton>
          );
        })}
      </View>
      <View style={[styles.inset, styles.dots]}>
        {NOVEL_THEME_ORDER.map(id => {
          const theme = NOVEL_THEMES[id];
          const selected = id === themeId;
          return (
            <Pressable
              key={id}
              onPress={() => setNovelTheme(id)}
              hitSlop={4}
              accessibilityRole="radio"
              accessibilityLabel={`Màu ${theme.label}`}
              accessibilityState={{ selected }}
              style={[styles.dotRing, selected && { borderColor: palette.accent }]}
            >
              <View style={[styles.dot, { backgroundColor: theme.bg, borderColor: palette.border }]}>
                <View style={[styles.dotCenter, { backgroundColor: theme.text }]} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function FloatingBar({
  palette,
  bottom,
  title,
  subtitle,
  children,
}: {
  palette: NovelPalette;
  bottom: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <View style={[styles.floating, { bottom, backgroundColor: palette.bar, borderColor: palette.border }]}>
      <View style={styles.flex}>
        <Text style={[font.label, { color: palette.text }]}>{title}</Text>
        {!!subtitle && <Text style={[font.caption, { color: palette.muted }]}>{subtitle}</Text>}
      </View>
      {children}
    </View>
  );
}

function PillButton({
  icon: Icon,
  label,
  onPress,
  palette,
  primary,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  palette: NovelPalette;
  primary?: boolean;
}) {
  const fg = primary ? palette.bg : palette.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.pill,
        { borderColor: primary ? palette.accent : palette.border },
        primary && { backgroundColor: palette.accent },
        pressed && styles.pressed,
      ]}
    >
      <Icon size={16} color={fg} />
      <Text style={[font.label, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

function AutoScrollControls({ palette, onStop }: { palette: NovelPalette; onStop: () => void }) {
  const { speed, setSpeed } = useReaderSettings(
    useShallow(state => ({ speed: state.autoScrollSpeed, setSpeed: state.setAutoScrollSpeed })),
  );
  return (
    <>
      <ChromeButton
        icon={Minus}
        size={18}
        color={palette.text}
        onPress={() => setSpeed(speed - SPEED_STEP)}
        accessibilityLabel="Chậm hơn"
      />
      <Text style={[font.label, styles.speed, { color: palette.text }]}>{speed}</Text>
      <ChromeButton
        icon={Plus}
        size={18}
        color={palette.text}
        onPress={() => setSpeed(speed + SPEED_STEP)}
        accessibilityLabel="Nhanh hơn"
      />
      <PillButton icon={Square} label="Dừng" onPress={onStop} palette={palette} primary />
    </>
  );
}

export const NovelChrome = memo(function NovelChromeView({
  visible,
  chapterUrl,
  chapterName,
  palette,
  themeId,
  positionStore,
  paragraphCount,
  ready,
  hasPrev,
  hasNext,
  tapToScroll,
  autoScrolling,
  ttsState,
  ttsIndex,
  orientationLock,
  actions,
}: Props) {
  const insets = useSafeAreaInsets();
  const anim = useChromeAnimation(visible);
  const [panelHeight, setPanelHeight] = useState(0);

  const tone = (active: boolean) => (active ? palette.accent : palette.text);
  const floatingBottom = (visible && ready ? panelHeight : insets.bottom) + space.md;
  const ttsIcon = ttsState === 'playing' ? Pause : ttsState === 'paused' ? Play : Headphones;
  const onTts =
    ttsState === 'playing' ? actions.onPauseTts : ttsState === 'paused' ? actions.onResumeTts : actions.onReadAloud;

  return (
    <>
      <Animated.View pointerEvents={anim.pointerEvents} style={[styles.top, anim.top]}>
        <AddonBar url={chapterUrl} onMenu={actions.onOpenMenu} />
        <View style={[styles.titleRow, { backgroundColor: palette.bar, borderColor: palette.border }]}>
          <ChromeButton icon={ArrowLeft} color={palette.text} onPress={actions.onBack} accessibilityLabel="Quay lại" />
          <Text numberOfLines={1} style={[styles.title, { color: palette.text }]}>
            {chapterName}
          </Text>
          <ChromeButton
            icon={Hand}
            color={tone(tapToScroll)}
            onPress={actions.onToggleTapToScroll}
            accessibilityLabel={tapToScroll ? 'Tắt chạm để cuộn' : 'Bật chạm để cuộn'}
          />
          <ChromeButton
            icon={CircleHelp}
            color={palette.text}
            onPress={actions.onOpenHelp}
            accessibilityLabel="Vùng chạm và cử chỉ"
          />
        </View>
      </Animated.View>

      {ready && (
        <Animated.View pointerEvents={anim.pointerEvents} style={[styles.layer, anim.side]}>
          <SideToolbar background={palette.bar} borderColor={palette.border}>
            <ChromeButton
              icon={List}
              color={palette.text}
              onPress={actions.onOpenChapters}
              accessibilityLabel="Chọn chương"
            />
            <ChromeButton
              icon={ArrowUpDown}
              color={tone(autoScrolling)}
              onPress={actions.onToggleAutoScroll}
              accessibilityLabel={autoScrolling ? 'Dừng tự cuộn' : 'Tự cuộn'}
            />
            <ChromeButton
              icon={ttsIcon}
              color={tone(ttsState !== 'idle')}
              onPress={onTts}
              accessibilityLabel={
                ttsState === 'playing' ? 'Tạm dừng đọc to' : ttsState === 'paused' ? 'Đọc tiếp' : 'Đọc to'
              }
            />
            {orientationLock && (
              <OrientationButton lock={orientationLock} color={palette.text} onPress={actions.onToggleOrientation} />
            )}
          </SideToolbar>
        </Animated.View>
      )}

      {ready && (
        <Animated.View
          pointerEvents={anim.pointerEvents}
          onLayout={(event: LayoutChangeEvent) => setPanelHeight(event.nativeEvent.layout.height)}
          style={[
            styles.bottom,
            { backgroundColor: palette.bar, borderColor: palette.border, paddingBottom: insets.bottom + space.sm },
            anim.bottom,
          ]}
        >
          <ReadingPanel
            palette={palette}
            themeId={themeId}
            positionStore={positionStore}
            paragraphCount={paragraphCount}
            hasPrev={hasPrev}
            hasNext={hasNext}
            actions={actions}
          />
        </Animated.View>
      )}

      {ttsState !== 'idle' && (
        <FloatingBar
          palette={palette}
          bottom={floatingBottom}
          title={ttsState === 'playing' ? 'Đang đọc to' : 'Đã tạm dừng'}
          subtitle={ttsIndex !== null ? `Đoạn ${ttsIndex + 1}/${paragraphCount}` : undefined}
        >
          {ttsState === 'playing' ? (
            <PillButton icon={Pause} label="Tạm dừng" onPress={actions.onPauseTts} palette={palette} primary />
          ) : (
            <PillButton icon={Play} label="Tiếp tục" onPress={actions.onResumeTts} palette={palette} primary />
          )}
          <PillButton icon={Square} label="Dừng" onPress={actions.onStopTts} palette={palette} />
        </FloatingBar>
      )}

      {autoScrolling && ttsState === 'idle' && (
        <FloatingBar palette={palette} bottom={floatingBottom} title="Tự cuộn" subtitle="Tốc độ, px/giây">
          <AutoScrollControls palette={palette} onStop={actions.onToggleAutoScroll} />
        </FloatingBar>
      )}
    </>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { position: 'absolute', top: 0, left: 0, right: 0 },
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { flex: 1, fontSize: 16, fontWeight: '700', paddingHorizontal: space.xs },
  panel: { paddingTop: space.xs, gap: 2 },
  panelRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xs },
  inset: { paddingHorizontal: space.lg },
  sizeRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  sizeLabel: { fontSize: 13, fontWeight: '600', minWidth: 22 },
  sizeLarge: { fontSize: 15, textAlign: 'right' },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  outline: {
    flex: 1,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: radius.md,
  },
  outlineWide: { flex: 1.6, gap: 2, paddingHorizontal: space.sm },
  fontName: { flexShrink: 1 },
  glyph: { width: 20, height: 14, justifyContent: 'space-between' },
  glyphLine: { height: 2, borderRadius: 1 },
  dots: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.sm },
  dotRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCenter: { width: 10, height: 10, borderRadius: 5 },
  floating: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    paddingLeft: space.lg,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  speed: { minWidth: 30, textAlign: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  pressed: { opacity: 0.7 },
});
