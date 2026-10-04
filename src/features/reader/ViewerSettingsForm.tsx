import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Divider, ListItem, Section, Segmented, Slider, Stepper, SwitchRow } from '../../components/ui';
import { useReaderSettings, type ViewerPrefs } from '../../store/useReaderSettings';
import { useSettings } from '../../store/useSettings';
import { font, space, useTheme } from '../../theme';
import {
  DIRECTION_OPTIONS,
  TAP_ZONE_HINTS,
  TAP_ZONE_OPTIONS,
  VIEW_MODE_HINTS,
  VIEW_MODE_OPTIONS,
} from './viewerPrefs';

type Props = {
  /** Chế độ xem/hướng/khoảng cách đang áp dụng (mặc định chung hoặc riêng truyện). */
  prefs: ViewerPrefs;
  onPrefsChange: (patch: Partial<ViewerPrefs>) => void;
};

/**
 * Nội dung "Viewer settings" (ViewerSettingDialog), dùng cả trong sheet của
 * reader lẫn màn cài đặt mặc định. Các tuỳ chọn ngoài ViewerPrefs luôn là
 * cài đặt chung.
 */
export function ViewerSettingsForm({ prefs, onPrefsChange }: Props) {
  const { c } = useTheme();
  const s = useReaderSettings(
    useShallow(state => ({
      autoScroll: state.autoScroll,
      autoScrollSpeed: state.autoScrollSpeed,
      tapToScroll: state.tapToScroll,
      tapZone: state.tapZone,
      highResImages: state.highResImages,
      preloadPages: state.preloadPages,
      nextChapterDelay: state.nextChapterDelay,
      immersive: state.immersive,
      keepScreenOn: state.keepScreenOn,
    })),
  );
  const set = useReaderSettings(state => state.set);
  const setAutoScrollSpeed = useReaderSettings(state => state.setAutoScrollSpeed);
  const setPreloadPages = useReaderSettings(state => state.setPreloadPages);
  const setNextChapterDelay = useReaderSettings(state => state.setNextChapterDelay);
  const longPressMenu = useSettings(state => !state.disableLongPressMenu);
  const setAppSettings = useSettings(state => state.set);
  const [speedPreview, setSpeedPreview] = useState<number | null>(null);

  const vertical = prefs.viewMode === 'vertical';
  const caption = [font.caption, { color: c.muted }];
  const label = [font.body, { color: c.text }];

  return (
    <View style={styles.root}>
      <Section title="Chế độ xem">
        <View style={styles.block}>
          <Segmented options={VIEW_MODE_OPTIONS} value={prefs.viewMode} onChange={viewMode => onPrefsChange({ viewMode })} />
          <Text style={caption}>{VIEW_MODE_HINTS[prefs.viewMode]}</Text>
        </View>
        <Divider />
        <View style={styles.block}>
          <Text style={label}>Hướng đọc</Text>
          <Segmented
            options={DIRECTION_OPTIONS}
            value={prefs.direction}
            onChange={direction => onPrefsChange({ direction })}
            disabled={vertical}
          />
          <Text style={caption}>
            {vertical
              ? 'Chỉ áp dụng khi lật trang.'
              : 'Phải → trái dành cho manga Nhật: vuốt sang phải để sang trang.'}
          </Text>
        </View>
        <Divider />
        <SwitchRow
          title="Khoảng cách giữa các trang"
          subtitle="Chèn vạch ngăn giữa các ảnh ở chế độ dọc"
          value={prefs.pageGap}
          onValueChange={pageGap => onPrefsChange({ pageGap })}
        />
      </Section>

      <Section title="Cuộn và chạm">
        <SwitchRow
          title="Tự cuộn"
          subtitle="Tự động cuộn khi mở chương ở chế độ dọc"
          value={s.autoScroll}
          onValueChange={autoScroll => set({ autoScroll })}
        />
        <View style={styles.block}>
          <View style={styles.labelRow}>
            <Text style={[label, styles.flex]}>Tốc độ tự cuộn (chỉ chế độ dọc)</Text>
            <Text style={[font.label, { color: c.accent }]}>{speedPreview ?? s.autoScrollSpeed} px/giây</Text>
          </View>
          <Slider
            value={s.autoScrollSpeed}
            min={10}
            max={400}
            step={5}
            onChange={setSpeedPreview}
            onComplete={value => {
              setSpeedPreview(null);
              setAutoScrollSpeed(value);
            }}
          />
        </View>
        <Divider />
        <SwitchRow
          title="Chạm để cuộn"
          subtitle="Chạm cạnh màn hình để cuộn hoặc lật trang, chạm giữa để hiện thanh điều khiển"
          value={s.tapToScroll}
          onValueChange={tapToScroll => set({ tapToScroll })}
        />
        <View style={styles.block}>
          <Text style={label}>Vùng chạm</Text>
          <Segmented
            options={TAP_ZONE_OPTIONS}
            value={s.tapZone}
            onChange={tapZone => set({ tapZone })}
            disabled={!s.tapToScroll}
          />
          <Text style={caption}>{TAP_ZONE_HINTS[s.tapToScroll ? s.tapZone : 'off']}</Text>
        </View>
      </Section>

      <Section title="Ảnh và tải trước">
        <SwitchRow
          title="Ảnh độ phân giải cao"
          subtitle="Hiển thị ảnh gốc, nét hơn nhưng tốn bộ nhớ. Tắt nếu ảnh dài bị trắng hoặc lỗi."
          value={s.highResImages}
          onValueChange={highResImages => set({ highResImages })}
        />
        <Divider />
        <ListItem
          title="Số trang tải trước"
          subtitle="Tải sẵn ảnh các trang sắp đọc"
          right={<Stepper value={s.preloadPages} min={0} max={10} onChange={setPreloadPages} />}
        />
        <Divider />
        <ListItem
          title="Chờ sang chương sau"
          subtitle="Đọc hết chương thì đếm ngược rồi tự mở chương sau"
          right={
            <Stepper
              value={s.nextChapterDelay}
              min={0}
              max={10}
              onChange={setNextChapterDelay}
              format={value => (value === 0 ? 'Tắt' : `${value} giây`)}
            />
          }
        />
      </Section>

      <Section title="Màn hình">
        <SwitchRow
          title="Chế độ toàn màn hình"
          subtitle="Ẩn thanh trạng thái và thanh điều khiển khi đọc"
          value={s.immersive}
          onValueChange={immersive => set({ immersive })}
        />
        <Divider />
        <SwitchRow
          title="Giữ màn hình sáng"
          subtitle="Không tự tắt màn hình khi đang đọc"
          value={s.keepScreenOn}
          onValueChange={keepScreenOn => set({ keepScreenOn })}
        />
        <Divider />
        <SwitchRow
          title="Menu khi nhấn giữ ảnh"
          subtitle="Sao chép, chia sẻ, mở hoặc tải lại ảnh"
          value={longPressMenu}
          onValueChange={value => setAppSettings({ disableLongPressMenu: !value })}
        />
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.lg, paddingBottom: space.lg },
  block: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
});
