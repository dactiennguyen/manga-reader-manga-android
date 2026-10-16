import { useCallback, useImperativeHandle, useRef, useState, type Ref } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabCountButton } from '../../components/AddressBarParts';
import { Favicon } from '../../components/Favicon';
import {
  ArrowLeft,
  ArrowRight,
  BookmarkCheck,
  BookmarkPlus,
  Check,
  ChevronDown,
  Lock,
  Menu,
  Puzzle,
  RotateCw,
  SlidersHorizontal,
  Unlock,
  X,
} from '../../components/icons';
import { IconButton } from '../../components/ui';
import type { SearchCategory, SearchEngineId } from '../../store/useSettings';
import { radius, space, useTheme } from '../../theme';
import { withAlpha } from './hooks';
import { getSearchEngine } from './searchEngines';
import { connectionOf } from './SiteInfoSheet';
import type { TourRegister, ViewRef } from './Tour';

export type AddressBarHandle = { focus: () => void; blur: () => void };

export type AddonState = 'source' | 'detected' | null;

export const ADDRESS_PLACEHOLDER = 'Tìm kiếm hoặc nhập địa chỉ web';

const ENGINE_HOMES: { id: SearchEngineId; url: string }[] = [
  { id: 'google', url: 'https://www.google.com/' },
  { id: 'bing', url: 'https://www.bing.com/' },
  { id: 'yahoo', url: 'https://www.yahoo.com/' },
  { id: 'duckduckgo', url: 'https://duckduckgo.com/' },
  { id: 'yandex', url: 'https://yandex.com/' },
];

const engineHome = (id: SearchEngineId) => (ENGINE_HOMES.find(e => e.id === id) ?? ENGINE_HOMES[0]).url;

export type WideControls = {
  canBack: boolean;
  canForward: boolean;
  loading: boolean;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  bookmarked: boolean | null;
  onBookmarkPress: () => void;
};

function shownUrl(url: string): string {
  return url.replace(/^(https?:\/\/[^/?#]+)\/$/i, '$1');
}

export function AddressBar({
  url,
  incognito,
  category,
  engine,
  onChangeEngine,
  editing,
  query,
  onChangeQuery,
  onFocus,
  onBlur,
  onSubmit,
  addon,
  addonBusy,
  site,
  onSitePress,
  tabCount,
  onTabsPress,
  onNewTab,
  onMenuPress,
  registerTour,
  wide,
  ref,
}: {
  url: string;
  incognito: boolean;
  category: SearchCategory;
  engine: SearchEngineId;
  onChangeEngine: (engine: SearchEngineId) => void;
  editing: boolean;
  query: string;
  onChangeQuery: (text: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onSubmit: () => void;
  addon: AddonState;
  addonBusy: boolean;
  site: { adblock: boolean; blocked: number } | null;
  onSitePress: () => void;
  tabCount: number;
  onTabsPress: () => void;
  onNewTab: () => void;
  onMenuPress: () => void;
  registerTour: TourRegister;
  wide?: WideControls;
  ref?: Ref<AddressBarHandle>;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInputInstance>(null);
  const leadingRef = useRef<ViewRef | null>(null);
  const [engineMenu, setEngineMenu] = useState<{ top: number; left: number } | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
    }),
    [],
  );

  const bg = incognito ? c.incognito : c.appBar;
  const fg = incognito ? c.onIncognito : c.onAppBar;
  const muted = withAlpha(fg, 0.6);
  const fieldBg = incognito ? withAlpha(c.onIncognito, 0.12) : c.appBarField;
  const connection = connectionOf(url);
  const blocked = site?.adblock ? site.blocked : 0;
  const showSite = !editing && !!site;

  const setLeadingRef = useCallback(
    (node: ViewRef | null) => {
      leadingRef.current = node;
      registerTour('addon')(node);
    },
    [registerTour],
  );

  const openEngineMenu = () => {
    leadingRef.current?.measureInWindow((x, y, _width, height) => setEngineMenu({ top: y + height + 6, left: x }));
  };

  const pickEngine = (id: SearchEngineId) => {
    setEngineMenu(null);
    if (id !== engine) {
      onChangeEngine(id);
    }
  };

  const siteLabel = [
    'Thông tin trang',
    addon === 'source' ? 'trang được addon hỗ trợ' : addon === 'detected' ? 'có thể thêm site được hỗ trợ' : '',
    blocked ? `đã chặn ${blocked} quảng cáo và tracker` : '',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View style={{ paddingTop: insets.top, backgroundColor: bg }}>
      <View style={styles.bar}>
        {!editing && (
          <View style={styles.leading}>
            <View ref={registerTour('menu')} collapsable={false}>
              <IconButton icon={Menu} color={fg} onPress={onMenuPress} accessibilityLabel="Menu" />
            </View>
            {wide && (
              <>
                <IconButton
                  icon={ArrowLeft}
                  color={wide.canBack ? fg : muted}
                  disabled={!wide.canBack}
                  onPress={wide.onBack}
                  accessibilityLabel="Quay lại"
                />
                <IconButton
                  icon={ArrowRight}
                  color={wide.canForward ? fg : muted}
                  disabled={!wide.canForward}
                  onPress={wide.onForward}
                  accessibilityLabel="Tiến"
                />
                <IconButton
                  icon={wide.loading ? X : RotateCw}
                  color={fg}
                  onPress={wide.onReload}
                  accessibilityLabel={wide.loading ? 'Dừng tải' : 'Tải lại'}
                />
              </>
            )}
          </View>
        )}

        <View
          ref={registerTour('address')}
          collapsable={false}
          style={[styles.field, editing && styles.fieldEditing, { backgroundColor: fieldBg }]}
        >
          <View ref={setLeadingRef} collapsable={false}>
            {showSite ? (
              <Pressable
                onPress={onSitePress}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={siteLabel}
                android_ripple={{ color: c.border, borderless: true, radius: 20 }}
                style={[styles.leadingIcon, addon === 'source' && { backgroundColor: withAlpha(c.addon, 0.16) }]}
              >
                {addonBusy ? (
                  <ActivityIndicator size="small" color={c.addon} />
                ) : (
                  <SlidersHorizontal size={20} color={addon === 'source' ? c.addon : fg} />
                )}
                {addon === 'source' && !addonBusy && (
                  <View pointerEvents="none" style={[styles.puzzleBadge, { backgroundColor: c.addon, borderColor: bg }]}>
                    <Puzzle size={9} color="#FFFFFF" />
                  </View>
                )}
                {addon === 'detected' && (
                  <View pointerEvents="none" style={[styles.dot, { backgroundColor: c.accent, borderColor: bg }]} />
                )}
                {blocked > 0 && (
                  <View
                    pointerEvents="none"
                    style={[styles.badge, { backgroundColor: incognito ? c.onIncognito : c.accent }]}
                  >
                    <Text style={[styles.badgeText, { color: incognito ? c.incognito : c.onAccent }]}>
                      {blocked > 99 ? '99+' : blocked}
                    </Text>
                  </View>
                )}
              </Pressable>
            ) : (
              <Pressable
                onPress={openEngineMenu}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={`Công cụ tìm kiếm: ${getSearchEngine(engine).name}`}
                android_ripple={{ color: c.border, borderless: true, radius: 22 }}
                style={styles.engine}
              >
                <Favicon url={engineHome(engine)} label={getSearchEngine(engine).name} size={20} />
                <ChevronDown size={14} color={muted} />
              </Pressable>
            )}
          </View>
          <View style={styles.inputWrap}>
            <TextInput
              ref={inputRef}
              value={editing ? query : url}
              onChangeText={onChangeQuery}
              onFocus={onFocus}
              onBlur={onBlur}
              onSubmitEditing={onSubmit}
              placeholder={category === 'manga' ? 'Tìm truyện trên các nguồn đã thêm' : ADDRESS_PLACEHOLDER}
              placeholderTextColor={muted}
              selectionColor={incognito ? c.onIncognito : c.accent}
              selectTextOnFocus
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType={category === 'manga' ? 'search' : 'go'}
              numberOfLines={1}
              style={[styles.input, { color: fg }, !editing && styles.invisible]}
            />
            {!editing && (
              <View pointerEvents="none" style={styles.display}>
                {connection === 'secure' && <Lock size={13} color={muted} />}
                {connection === 'insecure' && <Unlock size={13} color={incognito ? fg : c.warning} />}
                <Text numberOfLines={1} style={[styles.displayText, { color: url ? fg : muted }]}>
                  {url ? shownUrl(url) : ADDRESS_PLACEHOLDER}
                </Text>
              </View>
            )}
          </View>
          {editing && !!query && (
            <Pressable onPress={() => onChangeQuery('')} hitSlop={8} accessibilityLabel="Xoá chữ">
              <X size={18} color={muted} />
            </Pressable>
          )}
        </View>

        {!editing && (
          <>
            {wide && wide.bookmarked !== null && (
              <IconButton
                icon={wide.bookmarked ? BookmarkCheck : BookmarkPlus}
                color={wide.bookmarked && !incognito ? c.accent : fg}
                onPress={wide.onBookmarkPress}
                accessibilityLabel={wide.bookmarked ? 'Sửa bookmark' : 'Bookmark trang này'}
              />
            )}
            <TabCountButton
              ref={registerTour('tabs')}
              count={tabCount}
              incognito={incognito}
              onPress={onTabsPress}
              onLongPress={onNewTab}
            />
          </>
        )}
      </View>

      <Modal
        visible={!!engineMenu}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setEngineMenu(null)}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setEngineMenu(null)} />
        {engineMenu && (
          <View style={[styles.menu, { top: engineMenu.top, left: engineMenu.left, backgroundColor: c.elevated }]}>
            {ENGINE_HOMES.map(item => {
              const selected = item.id === engine;
              const name = getSearchEngine(item.id).name;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => pickEngine(item.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  android_ripple={{ color: c.border }}
                  style={[styles.menuItem, selected && { backgroundColor: c.accentSoft }]}
                >
                  <Favicon url={item.url} label={name} size={22} />
                  <Text style={[styles.menuLabel, { color: c.text }]}>{name}</Text>
                  {selected && <Check size={18} color={c.accent} />}
                </Pressable>
              );
            })}
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.xs,
    height: 60,
  },
  leading: { flexDirection: 'row', alignItems: 'center' },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: radius.pill,
    paddingLeft: space.xs,
    paddingRight: space.md,
  },
  fieldEditing: { marginHorizontal: space.xs, gap: space.sm },
  leadingIcon: {
    width: 40,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  engine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 36,
    paddingLeft: space.sm + 2,
    paddingRight: space.xs,
  },
  puzzleBadge: {
    position: 'absolute',
    right: 2,
    bottom: 0,
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    right: 4,
    bottom: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 9, fontWeight: '800' },
  inputWrap: { flex: 1, justifyContent: 'center', marginLeft: space.xs },
  input: { fontSize: 15, paddingVertical: 0, height: 40 },
  invisible: { opacity: 0 },
  display: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  displayText: { flexShrink: 1, fontSize: 15 },
  menu: {
    position: 'absolute',
    minWidth: 210,
    paddingVertical: space.sm,
    borderRadius: radius.sm,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md + 2,
    minHeight: 48,
    paddingHorizontal: space.lg,
  },
  menuLabel: { flex: 1, fontSize: 15 },
});
