/**
 * Manga Reader
 *
 * Màn tạm để kiểm tra Zustand store đã chạy. Sẽ thay bằng
 * browser + reader thật theo spec ở docs/cookie-manga-features.md.
 *
 * @format
 */

import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  useIsDirectionRelevant,
  useReaderSettings,
  type ReadingDirection,
  type ViewMode,
} from './src/store/useReaderSettings';

const VIEW_MODES: ViewMode[] = ['vertical', 'horizontal', 'single', 'double'];
const DIRECTIONS: ReadingDirection[] = ['ltr', 'rtl'];

function App() {
  const isDark = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SettingsScreen isDark={isDark} />
    </SafeAreaProvider>
  );
}

function SettingsScreen({ isDark }: { isDark: boolean }) {
  const insets = useSafeAreaInsets();
  const c = isDark ? dark : light;

  // Lấy từng field qua selector để chỉ re-render phần cần thiết.
  const viewMode = useReaderSettings(s => s.viewMode);
  const direction = useReaderSettings(s => s.direction);
  const autoScroll = useReaderSettings(s => s.autoScroll);
  const autoScrollSpeed = useReaderSettings(s => s.autoScrollSpeed);
  const tapToScroll = useReaderSettings(s => s.tapToScroll);
  const splitLongImages = useReaderSettings(s => s.splitLongImages);
  const preloadPages = useReaderSettings(s => s.preloadPages);
  const directionRelevant = useIsDirectionRelevant();

  const setViewMode = useReaderSettings(s => s.setViewMode);
  const setDirection = useReaderSettings(s => s.setDirection);
  const toggleAutoScroll = useReaderSettings(s => s.toggleAutoScroll);
  const setAutoScrollSpeed = useReaderSettings(s => s.setAutoScrollSpeed);
  const toggleTapToScroll = useReaderSettings(s => s.toggleTapToScroll);
  const toggleSplitLongImages = useReaderSettings(s => s.toggleSplitLongImages);
  const setPreloadPages = useReaderSettings(s => s.setPreloadPages);
  const reset = useReaderSettings(s => s.reset);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: c.bg }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
      ]}
    >
      <Text style={[styles.title, { color: c.text }]}>Manga Reader</Text>
      <Text style={[styles.subtitle, { color: c.muted }]}>
        React Native 0.87 · TypeScript · Zustand
      </Text>

      <Section title="Chế độ xem" color={c}>
        <Segmented
          options={VIEW_MODES}
          value={viewMode}
          onChange={setViewMode}
          color={c}
        />
      </Section>

      <Section title="Hướng đọc (chỉ chế độ ngang)" color={c}>
        <Segmented
          options={DIRECTIONS}
          value={direction}
          onChange={setDirection}
          color={c}
          disabled={!directionRelevant}
        />
      </Section>

      <Section title="Cuộn" color={c}>
        <Row label="Tự cuộn" color={c}>
          <Switch value={autoScroll} onValueChange={toggleAutoScroll} />
        </Row>
        <Row label={`Tốc độ: ${autoScrollSpeed} px/s`} color={c}>
          <Stepper
            onDecrease={() => setAutoScrollSpeed(autoScrollSpeed - 10)}
            onIncrease={() => setAutoScrollSpeed(autoScrollSpeed + 10)}
            color={c}
          />
        </Row>
        <Row label="Tap để cuộn" color={c}>
          <Switch value={tapToScroll} onValueChange={toggleTapToScroll} />
        </Row>
      </Section>

      <Section title="Ảnh" color={c}>
        <Row label="Cắt ảnh webtoon dài" color={c}>
          <Switch
            value={splitLongImages}
            onValueChange={toggleSplitLongImages}
          />
        </Row>
        <Row label={`Tải trước: ${preloadPages} trang`} color={c}>
          <Stepper
            onDecrease={() => setPreloadPages(preloadPages - 1)}
            onIncrease={() => setPreloadPages(preloadPages + 1)}
            color={c}
          />
        </Row>
      </Section>

      <Pressable
        onPress={reset}
        style={({ pressed }) => [
          styles.resetBtn,
          { borderColor: c.border, opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Text style={[styles.resetText, { color: c.muted }]}>
          Đặt lại mặc định
        </Text>
      </Pressable>
    </ScrollView>
  );
}

type Palette = typeof light;

function Section({
  title,
  color,
  children,
}: {
  title: string;
  color: Palette;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: color.muted }]}>{title}</Text>
      <View style={[styles.card, { backgroundColor: color.card }]}>
        {children}
      </View>
    </View>
  );
}

function Row({
  label,
  color,
  children,
}: {
  label: string;
  color: Palette;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: color.text }]}>{label}</Text>
      {children}
    </View>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  color,
  disabled,
}: {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  color: Palette;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.segmented, disabled && styles.disabled]}>
      {options.map(option => {
        const active = option === value;
        return (
          <Pressable
            key={option}
            disabled={disabled}
            onPress={() => onChange(option)}
            style={[
              styles.segment,
              { borderColor: color.border },
              active && { backgroundColor: color.accent },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                { color: active ? color.onAccent : color.text },
              ]}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Stepper({
  onDecrease,
  onIncrease,
  color,
}: {
  onDecrease: () => void;
  onIncrease: () => void;
  color: Palette;
}) {
  return (
    <View style={styles.stepper}>
      {(
        [
          ['−', onDecrease],
          ['+', onIncrease],
        ] as const
      ).map(([glyph, handler]) => (
        <Pressable
          key={glyph}
          onPress={handler}
          style={({ pressed }) => [
            styles.stepBtn,
            { borderColor: color.border, opacity: pressed ? 0.5 : 1 },
          ]}
        >
          <Text style={[styles.stepGlyph, { color: color.text }]}>{glyph}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const light = {
  bg: '#f6f6f8',
  card: '#ffffff',
  text: '#16181d',
  muted: '#6b7280',
  border: '#d8dae0',
  accent: '#2f6df6',
  onAccent: '#ffffff',
};

const dark: Palette = {
  bg: '#0f1115',
  card: '#1a1d24',
  text: '#eceef3',
  muted: '#9aa1ae',
  border: '#2d323c',
  accent: '#4d84ff',
  onAccent: '#0f1115',
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 20 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: -14 },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  card: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    gap: 12,
  },
  rowLabel: { fontSize: 15, flexShrink: 1 },
  segmented: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 10 },
  disabled: { opacity: 0.4 },
  segment: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segmentText: { fontSize: 14, fontWeight: '600' },
  stepper: { flexDirection: 'row', gap: 8 },
  stepBtn: {
    width: 40,
    height: 36,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepGlyph: { fontSize: 18, fontWeight: '600' },
  resetBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  resetText: { fontSize: 14, fontWeight: '600' },
});

export default App;
