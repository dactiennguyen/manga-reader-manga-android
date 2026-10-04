import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { CircleAlert, Download, FileUp, Upload } from '../../components/icons';
import { Button, Checkbox, Header, Screen, Section, confirm, toast } from '../../components/ui';
import { errorMessage } from '../../lib/http';
import { formatDate, formatTime } from '../../lib/time';
import { font, radius, space, useTheme } from '../../theme';
import { formatCount } from '../../lib/format';
import {
  applyBackup,
  exportBackupFile,
  pickBackupFile,
  summarizeBackup,
  type BackupData,
  type RestoreOptions,
} from './backup';

const BACKED_UP = [
  'Truyện đã bookmark, nhóm bookmark và tiến độ đọc',
  'Lịch sử đọc truyện, lịch sử duyệt web và lịch sử tìm kiếm',
  'Site truyện bạn đã thêm vào addon',
  'Trang web đã đánh dấu và lối tắt truy cập nhanh',
  'Cài đặt app, cài đặt trình xem và đọc tiểu thuyết',
  'Thống kê đọc và chuỗi ngày đọc',
];

const NOT_BACKED_UP = 'Không gồm: tab đang mở, chương đã tải và trang web đã lưu offline.';

export function BackupRestoreScreen() {
  const { c } = useTheme();
  const [exporting, setExporting] = useState(false);
  const [picking, setPicking] = useState(false);
  const [pending, setPending] = useState<{ data: BackupData; fileName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<RestoreOptions>({
    clearExisting: false,
    overwriteSettings: false,
    overwriteStats: false,
  });
  const [restoring, setRestoring] = useState(false);

  const backup = async () => {
    setExporting(true);
    try {
      if (await exportBackupFile()) {
        toast('Đã sao lưu dữ liệu');
      }
    } catch (e) {
      toast(`Sao lưu thất bại: ${errorMessage(e)}`);
    } finally {
      setExporting(false);
    }
  };

  const chooseFile = async () => {
    setPicking(true);
    setError(null);
    try {
      const result = await pickBackupFile();
      if (result) {
        setPending(result);
        setOptions({ clearExisting: false, overwriteSettings: false, overwriteStats: false });
      }
    } catch (e) {
      setPending(null);
      setError(errorMessage(e));
    } finally {
      setPicking(false);
    }
  };

  const restore = async () => {
    if (!pending) {
      return;
    }
    if (options.clearExisting) {
      const ok = await confirm(
        'Xoá dữ liệu hiện có?',
        'Bookmark, lịch sử, tiến độ đọc, site đã thêm và lối tắt hiện tại sẽ bị thay bằng dữ liệu trong bản sao lưu.',
        { confirmText: 'Xoá và khôi phục', destructive: true },
      );
      if (!ok) {
        return;
      }
    }
    setRestoring(true);
    try {
      applyBackup(pending.data, options);
      setPending(null);
      toast('Khôi phục dữ liệu thành công');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setRestoring(false);
    }
  };

  const summary = pending ? summarizeBackup(pending.data) : null;
  const toggle = (key: keyof RestoreOptions) => (value: boolean) =>
    setOptions(current => ({ ...current, [key]: value }));

  return (
    <Screen>
      <Header title="Sao lưu & khôi phục" />
      <ScrollView contentContainerStyle={styles.content}>
        <Section title="Sao lưu dữ liệu" footer={NOT_BACKED_UP}>
          <View style={styles.card}>
            <Text style={[font.label, { color: c.text }]}>Những gì được sao lưu?</Text>
            {BACKED_UP.map(item => (
              <View key={item} style={styles.bullet}>
                <View style={[styles.dot, { backgroundColor: c.accent }]} />
                <Text style={[font.body, styles.flex, { color: c.textSecondary }]}>{item}</Text>
              </View>
            ))}
            <Text style={[font.caption, { color: c.muted }]}>
              Dữ liệu được xuất thành một file JSON. Bạn chọn nơi lưu (bộ nhớ máy, Google Drive…) ở bước
              tiếp theo.
            </Text>
            <Button title="Tạo file sao lưu" icon={Download} loading={exporting} onPress={backup} />
          </View>
        </Section>

        <Section title="Khôi phục dữ liệu">
          <View style={styles.card}>
            <Text style={[font.body, { color: c.textSecondary }]}>
              Chọn file sao lưu (.json) đã tạo từ app này để nhập lại dữ liệu.
            </Text>
            <Button
              title={pending ? 'Chọn file khác' : 'Chọn file sao lưu'}
              icon={FileUp}
              variant={pending ? 'secondary' : 'primary'}
              loading={picking}
              onPress={chooseFile}
            />
            {!!error && (
              <View style={[styles.error, { backgroundColor: c.dangerSoft }]}>
                <CircleAlert size={18} color={c.danger} />
                <Text style={[font.body, styles.flex, { color: c.danger }]}>{error}</Text>
              </View>
            )}
          </View>
        </Section>

        {pending && summary && (
          <Section title="Nội dung bản sao lưu">
            <View style={styles.card}>
              <Text style={[font.label, { color: c.text }]} numberOfLines={1}>
                {pending.fileName}
              </Text>
              {summary.createdAt > 0 && (
                <Text style={[font.caption, { color: c.muted }]}>
                  Tạo lúc {formatTime(summary.createdAt)}, {formatDate(summary.createdAt, true)}
                </Text>
              )}
              <View style={styles.grid}>
                <SummaryItem label="Bookmark" value={summary.bookmarks} />
                <SummaryItem label="Nhóm" value={summary.groups} />
                <SummaryItem label="Tiến độ đọc" value={summary.progress} />
                <SummaryItem label="Lịch sử đọc" value={summary.reading} />
                <SummaryItem label="Lịch sử web" value={summary.web} />
                <SummaryItem label="Tìm kiếm" value={summary.searches} />
                <SummaryItem label="Site đã thêm" value={summary.sources} />
                <SummaryItem label="Trang đánh dấu" value={summary.webBookmarks} />
                <SummaryItem label="Lối tắt" value={summary.quickAccess} />
              </View>
              <Text style={[font.caption, { color: c.muted }]}>
                {summary.hasSettings ? 'Có cài đặt app' : 'Không có cài đặt app'} ·{' '}
                {summary.hasStats ? 'có thống kê đọc' : 'không có thống kê đọc'}
              </Text>

              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <Checkbox
                checked={options.clearExisting}
                onChange={toggle('clearExisting')}
                label="Xoá dữ liệu hiện có trước khi khôi phục"
              />
              <Checkbox
                checked={options.overwriteSettings}
                onChange={toggle('overwriteSettings')}
                label="Ghi đè cài đặt hiện tại"
              />
              <Checkbox
                checked={options.overwriteStats}
                onChange={toggle('overwriteStats')}
                label="Ghi đè thống kê đọc"
              />
              <Text style={[font.caption, { color: c.muted }]}>
                {options.clearExisting
                  ? 'Bookmark, lịch sử và tiến độ đọc trên máy sẽ được thay hoàn toàn.'
                  : 'Dữ liệu sẽ được gộp: mục đã có trên máy được giữ, mục mới từ bản sao lưu được thêm vào.'}{' '}
                {options.overwriteStats
                  ? 'Thống kê đọc sẽ lấy theo bản sao lưu.'
                  : 'Thống kê đọc lấy giá trị lớn hơn theo từng ngày.'}
              </Text>

              <View style={styles.actions}>
                <Button title="Huỷ" variant="secondary" onPress={() => setPending(null)} style={styles.flex} />
                <Button
                  title="Khôi phục"
                  icon={Upload}
                  loading={restoring}
                  onPress={restore}
                  style={styles.flex}
                />
              </View>
            </View>
          </Section>
        )}
      </ScrollView>
    </Screen>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  const { c } = useTheme();
  return (
    <View style={[styles.summaryItem, { backgroundColor: c.surfaceAlt }]}>
      <Text style={[font.heading, { color: value ? c.text : c.muted }]}>{formatCount(value)}</Text>
      <Text style={[font.caption, { color: c.muted }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: space.lg, gap: space.xl },
  flex: { flex: 1 },
  card: { padding: space.lg, gap: space.md },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  error: { flexDirection: 'row', gap: space.sm, padding: space.md, borderRadius: radius.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  summaryItem: { flexBasis: '30%', flexGrow: 1, borderRadius: radius.md, padding: space.sm, gap: 2 },
  divider: { height: StyleSheet.hairlineWidth },
  actions: { flexDirection: 'row', gap: space.sm },
});
