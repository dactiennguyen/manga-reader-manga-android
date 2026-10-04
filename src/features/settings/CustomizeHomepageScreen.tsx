import {
  BookOpen,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Globe,
  History,
  Pencil,
  Plus,
  RotateCcw,
  ScrollText,
  Trash2,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Dialog } from '../../components/Sheet';
import {
  Button,
  Divider,
  FieldLabel,
  Header,
  IconButton,
  ListItem,
  Screen,
  Section,
  Stepper,
  TextField,
  confirm,
  toast,
} from '../../components/ui';
import { displayUrl, ensureScheme, looksLikeUrl } from '../../lib/url';
import { useBrowser, type QuickAccessItem } from '../../store/useBrowser';
import { useSettings, type HomeWidget, type HomeWidgetId } from '../../store/useSettings';
import { font, space, useTheme } from '../../theme';
import { Favicon } from '../../components/Favicon';

const WIDGET_INFO: Record<HomeWidgetId, { title: string; icon: LucideIcon }> = {
  quickAccess: { title: 'Truy cập nhanh', icon: Zap },
  continueReading: { title: 'Đọc tiếp', icon: History },
  mediaSites: { title: 'Site truyện đã lưu', icon: Globe },
  mangaBookmarks: { title: 'Truyện tranh đã lưu', icon: BookOpen },
  novelBookmarks: { title: 'Tiểu thuyết đã lưu', icon: ScrollText },
  webBookmarks: { title: 'Trang web đã đánh dấu', icon: Bookmark },
};

const MIN_ITEMS = 1;
const MAX_ITEMS = 20;

export function CustomizeHomepageScreen() {
  const { c } = useTheme();
  const { homeWidgets, updateHomeWidget, moveHomeWidget, resetHomeWidgets } = useSettings(
    useShallow(s => ({
      homeWidgets: s.homeWidgets,
      updateHomeWidget: s.updateHomeWidget,
      moveHomeWidget: s.moveHomeWidget,
      resetHomeWidgets: s.resetHomeWidgets,
    })),
  );
  const { quickAccess, addQuickAccess, updateQuickAccess, removeQuickAccess, resetQuickAccess } = useBrowser(
    useShallow(s => ({
      quickAccess: s.quickAccess,
      addQuickAccess: s.addQuickAccess,
      updateQuickAccess: s.updateQuickAccess,
      removeQuickAccess: s.removeQuickAccess,
      resetQuickAccess: s.resetQuickAccess,
    })),
  );
  // null: đóng; { id: undefined }: thêm mới.
  const [editing, setEditing] = useState<{ id?: string } | null>(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');

  const resetWidgets = async () => {
    const ok = await confirm('Khôi phục mặc định', 'Thứ tự, trạng thái bật/tắt và số mục của widget sẽ về mặc định.', {
      confirmText: 'Khôi phục',
    });
    if (ok) {
      resetHomeWidgets();
      toast('Đã khôi phục widget mặc định');
    }
  };

  const resetShortcuts = async () => {
    const ok = await confirm('Khôi phục lối tắt mặc định', 'Các lối tắt bạn đã thêm hoặc sửa sẽ bị thay thế.', {
      confirmText: 'Khôi phục',
      destructive: true,
    });
    if (ok) {
      resetQuickAccess();
      toast('Đã khôi phục lối tắt mặc định');
    }
  };

  const openEditor = (item?: QuickAccessItem) => {
    setTitle(item?.title ?? '');
    setUrl(item?.url ?? '');
    setEditing({ id: item?.id });
  };

  const saveShortcut = () => {
    const name = title.trim();
    const target = url.trim();
    if (!name) {
      toast('Hãy nhập tên lối tắt');
      return;
    }
    if (!looksLikeUrl(target)) {
      toast('Địa chỉ trang web không hợp lệ');
      return;
    }
    const value = { title: name, url: ensureScheme(target) };
    if (editing?.id) {
      updateQuickAccess(editing.id, value);
    } else {
      addQuickAccess(value);
    }
    setEditing(null);
  };

  const removeShortcut = async (item: QuickAccessItem) => {
    const ok = await confirm('Xoá lối tắt', `Xoá “${item.title}” khỏi Truy cập nhanh?`, {
      confirmText: 'Xoá',
      destructive: true,
    });
    if (ok) {
      removeQuickAccess(item.id);
    }
  };

  return (
    <Screen>
      <Header title="Tuỳ chỉnh trang chủ" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Section
          title="Widget trang chủ"
          footer="Bật/tắt, sắp xếp và chọn số mục hiển thị cho từng widget."
        >
          {homeWidgets.map((widget, index) => (
            <View key={widget.id}>
              {index > 0 && <Divider />}
              <WidgetRow
                widget={widget}
                first={index === 0}
                last={index === homeWidgets.length - 1}
                onToggle={enabled => updateHomeWidget(widget.id, { enabled })}
                onLimit={limit => updateHomeWidget(widget.id, { limit })}
                onMove={delta => moveHomeWidget(widget.id, delta)}
              />
            </View>
          ))}
        </Section>
        <Button
          title="Khôi phục widget mặc định"
          icon={RotateCcw}
          variant="ghost"
          onPress={resetWidgets}
          style={styles.inlineButton}
        />

        <Section title="Truy cập nhanh" footer="Lối tắt hiện ở widget Truy cập nhanh trên trang chủ.">
          {quickAccess.length === 0 && (
            <Text style={[font.body, styles.emptyText, { color: c.muted }]}>Chưa có lối tắt nào.</Text>
          )}
          {quickAccess.map((item, index) => (
            <View key={item.id}>
              {index > 0 && <Divider inset={64} />}
              <ListItem
                title={item.title}
                subtitle={displayUrl(item.url)}
                left={<Favicon url={item.url} size={34} tile />}
                onPress={() => openEditor(item)}
                right={
                  <View style={styles.rowActions}>
                    <IconButton
                      icon={Pencil}
                      size={18}
                      color={c.muted}
                      onPress={() => openEditor(item)}
                      accessibilityLabel={`Sửa ${item.title}`}
                    />
                    <IconButton
                      icon={Trash2}
                      size={18}
                      color={c.muted}
                      onPress={() => removeShortcut(item)}
                      accessibilityLabel={`Xoá ${item.title}`}
                    />
                  </View>
                }
              />
            </View>
          ))}
          <Divider />
          <ListItem title="Thêm lối tắt" icon={Plus} iconColor={c.accent} onPress={() => openEditor()} />
        </Section>
        <Button
          title="Khôi phục lối tắt mặc định"
          icon={RotateCcw}
          variant="ghost"
          onPress={resetShortcuts}
          style={styles.inlineButton}
        />
      </ScrollView>

      <Dialog
        visible={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Sửa lối tắt' : 'Thêm lối tắt'}
        actions={[
          { label: 'Huỷ', onPress: () => setEditing(null) },
          { label: 'Lưu', variant: 'primary', onPress: saveShortcut, disabled: !title.trim() || !url.trim() },
        ]}
      >
        <View>
          <FieldLabel>Tên</FieldLabel>
          <TextField value={title} onChangeText={setTitle} placeholder="Ví dụ: MangaDex" autoFocus />
          <FieldLabel>Địa chỉ</FieldLabel>
          <TextField
            value={url}
            onChangeText={setUrl}
            placeholder="https://…"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            onSubmitEditing={saveShortcut}
          />
        </View>
      </Dialog>
    </Screen>
  );
}

function WidgetRow({
  widget,
  first,
  last,
  onToggle,
  onLimit,
  onMove,
}: {
  widget: HomeWidget;
  first: boolean;
  last: boolean;
  onToggle: (enabled: boolean) => void;
  onLimit: (limit: number) => void;
  onMove: (delta: -1 | 1) => void;
}) {
  const { c } = useTheme();
  const info = WIDGET_INFO[widget.id];
  const Icon = info.icon;
  return (
    <View style={styles.widget}>
      <View style={styles.widgetHead}>
        <Icon size={20} color={widget.enabled ? c.accent : c.muted} />
        <Text style={[font.body, styles.flex, { color: c.text }]} numberOfLines={1}>
          {info.title}
        </Text>
        <IconButton
          icon={ChevronUp}
          size={20}
          disabled={first}
          onPress={() => onMove(-1)}
          accessibilityLabel={`Đưa ${info.title} lên`}
        />
        <IconButton
          icon={ChevronDown}
          size={20}
          disabled={last}
          onPress={() => onMove(1)}
          accessibilityLabel={`Đưa ${info.title} xuống`}
        />
        <Switch
          value={widget.enabled}
          onValueChange={onToggle}
          trackColor={{ true: c.accent, false: c.border }}
          thumbColor={c.surface}
          accessibilityLabel={`Hiện ${info.title}`}
        />
      </View>
      <View style={[styles.widgetLimit, !widget.enabled && styles.dimmed]} pointerEvents={widget.enabled ? 'auto' : 'none'}>
        <Text style={[font.caption, styles.flex, { color: c.muted }]}>Số mục hiển thị</Text>
        <Stepper value={widget.limit} min={MIN_ITEMS} max={MAX_ITEMS} onChange={onLimit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: space.lg, gap: space.lg },
  flex: { flex: 1 },
  widget: { paddingHorizontal: space.lg, paddingVertical: space.sm, gap: space.xs },
  widgetHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  widgetLimit: { flexDirection: 'row', alignItems: 'center', paddingLeft: 28, paddingBottom: space.xs },
  dimmed: { opacity: 0.4 },
  rowActions: { flexDirection: 'row' },
  inlineButton: { alignSelf: 'center', marginTop: -space.xs },
  emptyText: { padding: space.lg },
});
