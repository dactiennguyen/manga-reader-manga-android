import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppNavigation } from '../../app/routes';
import { BookOpen, Search, SlidersHorizontal, VenetianMask } from '../../components/icons';
import { Button } from '../../components/ui';
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

/** Trang chủ của trình duyệt: logo, ô tìm kiếm + các widget theo "Tuỳ chỉnh trang chủ". */
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
  const category = useSettings(s => s.searchCategory);

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
          <View style={[styles.logo, { backgroundColor: incognito ? c.incognito : c.primaryContainer }]}>
            {incognito ? (
              <VenetianMask size={26} color={c.onIncognito} />
            ) : (
              <BookOpen size={26} color={c.onPrimaryContainer} />
            )}
          </View>
          <Text style={[styles.appName, { color: c.text }]}>Manga Reader</Text>
        </View>
        {incognito && (
          <View style={[styles.notice, { backgroundColor: c.incognito }]}>
            <VenetianMask size={18} color={c.onIncognito} />
            <Text style={[font.caption, styles.flex, { color: c.onIncognito }]}>
              Bạn đang dùng tab ẩn danh — lịch sử duyệt web và từ khoá tìm kiếm sẽ không được lưu.
            </Text>
          </View>
        )}
        <Pressable
          onPress={onFocusSearch}
          accessibilityRole="search"
          android_ripple={{ color: c.border }}
          style={({ pressed }) => [styles.search, { backgroundColor: c.surfaceAlt, opacity: pressed ? 0.85 : 1 }]}
        >
          <Search size={20} color={c.textSecondary} />
          <Text numberOfLines={1} style={[font.body, styles.flex, { color: c.muted }]}>
            {category === 'manga' ? 'Tìm truyện trên các nguồn đã thêm' : ADDRESS_PLACEHOLDER}
          </Text>
        </Pressable>
      </View>

      {widgets.filter(w => w.enabled).map(renderWidget)}

      <Button
        title="Tuỳ chỉnh trang chủ"
        icon={SlidersHorizontal}
        variant="ghost"
        small
        onPress={() => navigation.navigate('CustomizeHomepage')}
        style={styles.customize}
      />
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: space.xl, gap: space.xl },
  hero: { paddingHorizontal: space.lg, paddingTop: space.xl + space.md, gap: space.lg },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md },
  logo: { width: 48, height: 48, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  appName: { fontSize: 28, fontWeight: '700', letterSpacing: -0.3 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    height: 56,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg + 2,
    overflow: 'hidden',
  },
  customize: { alignSelf: 'center' },
});
