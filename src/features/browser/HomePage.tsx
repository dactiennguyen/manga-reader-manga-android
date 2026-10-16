import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppNavigation } from '../../app/routes';
import { BookOpen, VenetianMask } from '../../components/icons';
import { useSettings, type HomeWidget } from '../../store/useSettings';
import { font, radius, space, useTheme } from '../../theme';
import {
  BookmarksWidget,
  ContinueReadingWidget,
  MediaSitesWidget,
  QuickAccessWidget,
  WebBookmarksWidget,
} from './HomeWidgets';
import type { TourRegister } from './Tour';

export const HomePage = memo(function BrowserHome({
  incognito,
  onOpenUrl,
  registerTour,
  style,
}: {
  incognito: boolean;
  onOpenUrl: (url: string) => void;
  onFocusSearch?: () => void;
  registerTour: TourRegister;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const widgets = useSettings(s => s.homeWidgets);

  const renderWidget = (widget: HomeWidget) => {
    switch (widget.id) {
      case 'quickAccess':
        return <QuickAccessWidget key={widget.id} widget={widget} onOpenUrl={onOpenUrl} />;
      case 'continueReading':
        return <ContinueReadingWidget key={widget.id} widget={widget} />;
      case 'mediaSites':
        return <MediaSitesWidget key={widget.id} widget={widget} tourRef={registerTour('mediaSites')} />;
      case 'mangaBookmarks':
        return <BookmarksWidget key={widget.id} widget={widget} content="manga" />;
      case 'novelBookmarks':
        return <BookmarksWidget key={widget.id} widget={widget} content="novel" />;
      case 'webBookmarks':
        return <WebBookmarksWidget key={widget.id} widget={widget} onOpenUrl={onOpenUrl} />;
    }
  };

  return (
    <ScrollView
      style={[{ backgroundColor: c.bg }, style]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <View style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: incognito ? c.incognito : c.primaryContainer }]}>
            {incognito ? (
              <VenetianMask size={26} color={c.onIncognito} />
            ) : (
              <BookOpen size={26} color={c.onPrimaryContainer} />
            )}
          </View>
          <Text numberOfLines={1} style={[styles.appName, { color: c.text }]}>Manga Reader</Text>
        </View>
        {incognito && (
          <View style={[styles.notice, { backgroundColor: c.incognito }]}>
            <VenetianMask size={18} color={c.onIncognito} />
            <Text style={[font.caption, styles.flex, { color: c.onIncognito }]}>
              Bạn đang dùng tab ẩn danh — lịch sử duyệt web và từ khoá tìm kiếm sẽ không được lưu.
            </Text>
          </View>
        )}
      </View>

      {widgets.filter(w => w.enabled).map(renderWidget)}

      <Pressable
        onPress={() => navigation.navigate('CustomizeHomepage')}
        accessibilityRole="button"
        android_ripple={{ color: c.border }}
        style={({ pressed }) => [styles.customize, pressed && styles.pressed]}
      >
        <Text style={[font.label, { color: c.accent }]}>Tuỳ chỉnh trang chủ</Text>
      </Pressable>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  content: { paddingBottom: space.xl, gap: space.lg },
  hero: { paddingHorizontal: space.lg, paddingTop: space.xl, gap: space.lg },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  logo: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  appName: { flexShrink: 1, fontSize: 26, fontWeight: '700', letterSpacing: -0.3 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  customize: {
    alignSelf: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
});
