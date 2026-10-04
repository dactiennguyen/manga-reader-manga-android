import {
  ArrowLeft,
  BookOpen,
  Globe,
  Lock,
  Puzzle,
  Search,
  ShieldCheck,
  ShieldOff,
  X,
} from 'lucide-react-native';
import { useImperativeHandle, useRef, type Ref } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputInstance,
} from 'react-native';

import { IconButton } from '../../components/ui';
import { displayUrl } from '../../lib/url';
import type { SearchCategory } from '../../store/useSettings';
import { radius, space, useTheme } from '../../theme';
import { withAlpha } from './hooks';
import type { SearchEngine } from './searchEngines';
import type { TourRegister } from './Tour';

export type AddressBarHandle = { focus: () => void; blur: () => void };

/** Trạng thái nút "Chạy addon": site đã thêm, hay nhận diện được theme nhưng chưa thêm. */
export type AddonState = 'source' | 'detected' | null;

export const ADDRESS_PLACEHOLDER = 'Tìm kiếm hoặc nhập địa chỉ web';

export function AddressBar({
  url,
  incognito,
  engine,
  category,
  editing,
  query,
  onChangeQuery,
  onFocus,
  onBlur,
  onSubmit,
  onEnginePress,
  addon,
  addonBusy,
  onRunAddon,
  shield,
  onShieldPress,
  registerTour,
  ref,
}: {
  /** URL trang đang xem, rỗng khi ở trang chủ. */
  url: string;
  incognito: boolean;
  engine: SearchEngine;
  category: SearchCategory;
  editing: boolean;
  query: string;
  onChangeQuery: (text: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onSubmit: () => void;
  onEnginePress: () => void;
  addon: AddonState;
  addonBusy: boolean;
  onRunAddon: () => void;
  /** Khiên chặn quảng cáo (null khi không xem trang web). */
  shield: { active: boolean; count: number } | null;
  onShieldPress: () => void;
  registerTour: TourRegister;
  ref?: Ref<AddressBarHandle>;
}) {
  const { c } = useTheme();
  const inputRef = useRef<TextInputInstance>(null);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
    }),
    [],
  );

  const fg = incognito ? c.onIncognito : c.text;
  const muted = incognito ? withAlpha(c.onIncognito, 0.65) : c.muted;
  const barBg = incognito ? c.incognito : c.surface;
  const pillBg = incognito ? withAlpha(c.onIncognito, 0.12) : c.surfaceAlt;
  const LeadIcon = !url ? Search : /^https:/i.test(url) ? Lock : Globe;
  const AddonIcon = addon === 'detected' ? Puzzle : BookOpen;

  return (
    <View style={[styles.bar, { backgroundColor: barBg, borderBottomColor: incognito ? barBg : c.border }]}>
      {editing ? (
        <IconButton
          icon={ArrowLeft}
          color={fg}
          onPress={() => inputRef.current?.blur()}
          accessibilityLabel="Đóng thanh tìm kiếm"
        />
      ) : (
        <View ref={registerTour('engine')} collapsable={false}>
          <Pressable
            onPress={onEnginePress}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Công cụ tìm kiếm: ${engine.name}`}
            style={({ pressed }) => [
              styles.engine,
              { backgroundColor: incognito ? pillBg : c.accentSoft, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.engineGlyph, { color: incognito ? fg : c.accent }]}>{engine.glyph}</Text>
          </Pressable>
        </View>
      )}

      <View style={[styles.pill, { backgroundColor: pillBg }]}>
        {!editing && <LeadIcon size={15} color={muted} />}
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
            selectionColor={c.accent}
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
                {url ? displayUrl(url) : ADDRESS_PLACEHOLDER}
              </Text>
            </View>
          )}
        </View>
        {editing && !!query && (
          <Pressable onPress={() => onChangeQuery('')} hitSlop={8} accessibilityLabel="Xoá chữ">
            <X size={18} color={muted} />
          </Pressable>
        )}
        {!editing && shield && (
          <Pressable
            onPress={onShieldPress}
            hitSlop={8}
            accessibilityLabel="Chặn quảng cáo"
            style={styles.shield}
          >
            {shield.active ? <ShieldCheck size={17} color={c.accent} /> : <ShieldOff size={17} color={muted} />}
            {shield.active && shield.count > 0 && (
              <Text style={[styles.shieldCount, { color: c.accent }]}>{shield.count}</Text>
            )}
          </Pressable>
        )}
      </View>

      {!editing && addon && (
        <View ref={registerTour('addon')} collapsable={false}>
          <Pressable
            onPress={onRunAddon}
            disabled={addonBusy}
            accessibilityRole="button"
            accessibilityLabel={addon === 'detected' ? 'Thêm site được hỗ trợ' : 'Chạy addon'}
            style={({ pressed }) => [styles.addon, { backgroundColor: c.accent, opacity: pressed ? 0.8 : 1 }]}
          >
            {addonBusy ? (
              <ActivityIndicator size="small" color={c.onAccent} />
            ) : (
              <AddonIcon size={19} color={c.onAccent} strokeWidth={2.2} />
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  engine: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  engineGlyph: { fontSize: 16, fontWeight: '800' },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 42,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
  },
  inputWrap: { flex: 1, justifyContent: 'center' },
  input: { fontSize: 15, paddingVertical: 0, height: 40 },
  invisible: { opacity: 0 },
  display: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center' },
  displayText: { fontSize: 15 },
  shield: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 2 },
  shieldCount: { fontSize: 11, fontWeight: '800' },
  addon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
});
