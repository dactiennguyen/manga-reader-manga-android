import { BookOpen, Search, SlidersHorizontal, VenetianMask } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppNavigation } from '../../app/routes';
import { useSettings, type HomeWidget } from '../../store/useSettings';
import { font, radius, space, useTheme } from '../../theme';
import { ADDRESS_PLACEHOLDER } from './AddressBar';
import {
  BookmarksWidget,
  ContinueReadingWidget,
  MediaSitesWidget,
  QuickAccessWidget,
  WebBookmarksWidget,
} from './HomeWidgets';
import type { TourRegister } from './Tour';

/** Trang chủ của trình duyệt: ô tìm kiếm + các widget theo "Tuỳ chỉnh trang chủ". */
export const HomePage = memo(function BrowserHome({
  incognito,
  onOpenUrl,
  onFocusSearch,
  registerTour,
  style,
}: {
  incognito: boolean;
  onOpenUrl: (url: string) => void;
  onFocusSearch: () => void;
  registerTour: TourRegister;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const widgets = useSettings(s => s.homeWidgets);

  const renderWidget = (widget: HomeWidget) => {
    switch (widget.id) {
      case 'quickAccess':
        return <QuickAccessWidget key={widget.id} limit={widget.limit} onOpenUrl={onOpenUrl} />;
      case 'continueReading':
        return <ContinueReadingWidget key={widget.id} limit={widget.limit} />;
      case 'mediaSites':
        return <MediaSitesWidget key={widget.id} limit={widget.limit} tourRef={registerTour('mediaSites')} />;
      case 'mangaBookmarks':
        return <BookmarksWidget key={widget.id} content="manga" limit={widget.limit} />;
      case 'novelBookmarks':
        return <BookmarksWidget key={widget.id} content="novel" limit={widget.limit} />;
      case 'webBookmarks':
        return <WebBookmarksWidget key={widget.id} limit={widget.limit} onOpenUrl={onOpenUrl} />;
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
          <View style={[styles.logo, { backgroundColor: incognito ? c.incognito : c.accent }]}>
            {incognito ? (
              <VenetianMask size={22} color={c.onIncognito} />
            ) : (
              <BookOpen size={22} color={c.onAccent} />
            )}
          </View>
          <Text style={[styles.appName, { color: c.text }]}>Manga Reader</Text>
        </View>
        {incognito && (
          <Text style={[font.caption, styles.center, { color: c.muted }]}>
            Bạn đang dùng tab ẩn danh — lịch sử duyệt web và từ khoá tìm kiếm sẽ không được lưu.
          </Text>
        )}
        <Pressable
          onPress={onFocusSearch}
          accessibilityRole="search"
          style={({ pressed }) => [
            styles.search,
            { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Search size={20} color={c.muted} />
          <Text numberOfLines={1} style={[font.body, styles.flex, { color: c.muted }]}>
            {ADDRESS_PLACEHOLDER}
          </Text>
        </Pressable>
      </View>

      {widgets.filter(w => w.enabled).map(renderWidget)}

      <Pressable
        onPress={() => navigation.navigate('CustomizeHomepage')}
        hitSlop={8}
        style={({ pressed }) => [styles.customize, pressed && styles.pressed]}
      >
        <SlidersHorizontal size={16} color={c.accent} />
        <Text style={[font.label, { color: c.accent }]}>Tuỳ chỉnh trang chủ</Text>
      </Pressable>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  pressed: { opacity: 0.6 },
  content: { paddingBottom: space.xl, gap: space.xl },
  hero: { paddingHorizontal: space.lg, paddingTop: space.xl + space.sm, gap: space.lg },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md },
  logo: { width: 42, height: 42, borderRadius: radius.md + 2, alignItems: 'center', justifyContent: 'center' },
  appName: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    height: 52,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: space.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  customize: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    alignSelf: 'center',
    paddingVertical: space.sm,
  },
});
