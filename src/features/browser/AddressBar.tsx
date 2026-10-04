import { useImperativeHandle, useRef, type Ref } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PuzzleButton, TabCountButton } from '../../components/AddressBarParts';
import { ArrowLeft, EllipsisVertical, ScanQrCode, ShieldCheck, ShieldOff, X } from '../../components/icons';
import { IconButton } from '../../components/ui';
import type { SearchCategory } from '../../store/useSettings';
import { radius, space, useTheme } from '../../theme';
import { withAlpha } from './hooks';
import type { TourRegister } from './Tour';

export type AddressBarHandle = { focus: () => void; blur: () => void };

/** Trạng thái mảnh ghép: site đã thêm, hay nhận diện được theme nhưng chưa thêm. */
export type AddonState = 'source' | 'detected' | null;

export const ADDRESS_PLACEHOLDER = 'Tìm kiếm hoặc nhập địa chỉ web';

/** URL hiện trong ô khi không gõ: giữ cả scheme như app gốc, bỏ "/" thừa của trang gốc. */
function shownUrl(url: string): string {
  return url.replace(/^(https?:\/\/[^/?#]+)\/$/i, '$1');
}

/**
 * Thanh địa chỉ theo app gốc, phủ cả vùng thanh trạng thái:
 * [mảnh ghép] [ô URL … khiên, QR] [số tab] [⋮]
 */
export function AddressBar({
  url,
  incognito,
  category,
  editing,
  query,
  onChangeQuery,
  onFocus,
  onBlur,
  onSubmit,
  addon,
  addonBusy,
  onAddonPress,
  shield,
  onShieldPress,
  onQrPress,
  tabCount,
  onTabsPress,
  onNewTab,
  onMenuPress,
  registerTour,
  ref,
}: {
  /** URL trang đang xem, rỗng khi ở trang chủ. */
  url: string;
  incognito: boolean;
  category: SearchCategory;
  editing: boolean;
  query: string;
  onChangeQuery: (text: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onSubmit: () => void;
  addon: AddonState;
  addonBusy: boolean;
  onAddonPress: () => void;
  /** Khiên chặn quảng cáo (null khi không xem trang web). */
  shield: { active: boolean; count: number } | null;
  onShieldPress: () => void;
  onQrPress: () => void;
  tabCount: number;
  onTabsPress: () => void;
  onNewTab: () => void;
  onMenuPress: () => void;
  registerTour: TourRegister;
  ref?: Ref<AddressBarHandle>;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInputInstance>(null);

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

  return (
    <View style={{ paddingTop: insets.top, backgroundColor: bg }}>
      <View style={styles.bar}>
        {editing ? (
          <IconButton
            icon={ArrowLeft}
            color={fg}
            onPress={() => inputRef.current?.blur()}
            accessibilityLabel="Đóng thanh tìm kiếm"
          />
        ) : (
          <View>
            <PuzzleButton
              ref={registerTour('addon')}
              active={!!addon}
              busy={addonBusy}
              onPress={onAddonPress}
              accessibilityLabel={
                addon === 'source' ? 'Chạy addon' : addon === 'detected' ? 'Thêm site được hỗ trợ' : 'Site được hỗ trợ'
              }
            />
            {/* Theme được hỗ trợ nhưng chưa thêm site: chấm báo bấm để thêm. */}
            {addon === 'detected' && !addonBusy && (
              <View pointerEvents="none" style={[styles.dot, { backgroundColor: c.accent, borderColor: bg }]} />
            )}
          </View>
        )}

        <View
          ref={registerTour('address')}
          collapsable={false}
          style={[styles.field, editing && styles.fieldEditing, { backgroundColor: fieldBg }]}
        >
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
          {/* Khiên chỉ là icon cho gọn để URL hiện đủ như app gốc; số đã chặn xem trong menu/sheet. */}
          {!editing && shield && (
            <Pressable
              onPress={onShieldPress}
              hitSlop={8}
              accessibilityLabel={
                shield.active ? `Chặn quảng cáo: đã chặn ${shield.count}` : 'Chặn quảng cáo đang tắt cho trang này'
              }
              style={styles.shield}
            >
              {shield.active ? (
                <ShieldCheck size={16} color={incognito ? fg : c.accent} />
              ) : (
                <ShieldOff size={16} color={muted} />
              )}
            </Pressable>
          )}
          {!editing && (
            <IconButton
              icon={ScanQrCode}
              size={20}
              color={fg}
              onPress={onQrPress}
              accessibilityLabel="Quét mã QR"
              style={styles.qr}
            />
          )}
        </View>

        {!editing && (
          <>
            <TabCountButton
              ref={registerTour('tabs')}
              count={tabCount}
              incognito={incognito}
              onPress={onTabsPress}
              onLongPress={onNewTab}
            />
            <View ref={registerTour('menu')} collapsable={false}>
              <IconButton icon={EllipsisVertical} color={fg} onPress={onMenuPress} accessibilityLabel="Menu" />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

// Kích thước khớp AddonBar để chuyển qua lại giữa trang web và màn addon không bị giật.
const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    height: 60,
  },
  dot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: radius.md,
    paddingLeft: space.md,
  },
  fieldEditing: { paddingRight: space.md, gap: space.sm },
  inputWrap: { flex: 1, justifyContent: 'center' },
  input: { fontSize: 15, paddingVertical: 0, height: 40 },
  invisible: { opacity: 0 },
  display: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center' },
  displayText: { fontSize: 15 },
  shield: { paddingLeft: space.sm },
  qr: { width: 40, height: 40 },
});
