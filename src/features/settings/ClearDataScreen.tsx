import { CachesDirectoryPath, readDir, unlink, type ReadDirResItemT } from '@dr.pogodin/react-native-fs';
import CookieManager from '@preeternal/react-native-cookie-manager';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Eraser } from '../../components/icons';
import { Button, Checkbox, Divider, Header, Screen, Section, confirm, toast } from '../../components/ui';
import { errorMessage } from '../../lib/http';
import { clearDetailCache } from '../../sources/cache';
import { useDownloads } from '../../store/useDownloads';
import { useHistory } from '../../store/useHistory';
import { font, space, useTheme } from '../../theme';
import { removeDownloads } from '../downloads/downloader';
import { formatBytes, formatCount } from '../../lib/format';

type ItemId = 'web' | 'cookies' | 'cache' | 'reading' | 'searches' | 'downloads';

const ITEMS: { id: ItemId; title: string; description: string }[] = [
  { id: 'web', title: 'Lịch sử duyệt web', description: 'Các trang web đã mở trong trình duyệt.' },
  { id: 'cookies', title: 'Cookie & dữ liệu trang', description: 'Đăng xuất bạn khỏi hầu hết các trang.' },
  {
    id: 'cache',
    title: 'Ảnh & file đệm',
    description: 'Giải phóng dung lượng. Một số trang có thể tải chậm hơn ở lần sau.',
  },
  { id: 'reading', title: 'Lịch sử đọc truyện', description: 'Danh sách truyện đã đọc gần đây.' },
  { id: 'searches', title: 'Lịch sử tìm kiếm', description: 'Từ khoá đã tìm truyện và tìm trên web.' },
  {
    id: 'downloads',
    title: 'Toàn bộ chương đã tải',
    description: 'Xoá file chương đã tải và danh sách tải xuống.',
  },
];

async function folderSize(path: string, depth = 0): Promise<number> {
  let items: ReadDirResItemT[];
  try {
    items = await readDir(path);
  } catch {
    return 0;
  }
  let total = 0;
  for (const item of items) {
    if (item.isFile()) {
      total += Number(item.size) || 0;
    } else if (item.isDirectory() && depth < 4) {
      total += await folderSize(item.path, depth + 1);
    }
  }
  return total;
}

async function clearCacheFolder(): Promise<void> {
  const items = await readDir(CachesDirectoryPath).catch(() => [] as ReadDirResItemT[]);
  await Promise.all(items.map(item => unlink(item.path).catch(() => {})));
}

export function ClearDataScreen() {
  const { c } = useTheme();
  const webCount = useHistory(s => s.web.length);
  const readingCount = useHistory(s => s.reading.length);
  const searchCount = useHistory(s => s.searches.length + s.webSearches.length);
  const tasks = useDownloads(s => s.tasks);
  const [cacheSize, setCacheSize] = useState<number | null>(null);
  const [checked, setChecked] = useState<Record<ItemId, boolean>>({
    web: true,
    cookies: false,
    cache: true,
    reading: false,
    searches: false,
    downloads: false,
  });
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    let alive = true;
    folderSize(CachesDirectoryPath).then(size => alive && setCacheSize(size));
    return () => {
      alive = false;
    };
  }, []);

  const taskList = Object.values(tasks);
  const downloadBytes = taskList.reduce((sum, t) => sum + t.bytes, 0);

  const detail: Record<ItemId, string | undefined> = {
    web: `${formatCount(webCount)} mục`,
    cookies: undefined,
    cache: cacheSize === null ? 'Đang tính dung lượng…' : formatBytes(cacheSize),
    reading: `${formatCount(readingCount)} truyện`,
    searches: `${formatCount(searchCount)} từ khoá`,
    downloads: `${formatCount(taskList.length)} chương · ${formatBytes(downloadBytes)}`,
  };

  const selected = ITEMS.filter(item => checked[item.id]);

  const clear = async () => {
    const ok = await confirm(
      'Xoá dữ liệu đã chọn?',
      `${selected.map(item => `• ${item.title}`).join('\n')}\n\nKhông thể hoàn tác thao tác này.`,
      { confirmText: 'Xoá', destructive: true },
    );
    if (!ok) {
      return;
    }
    setClearing(true);
    const failures: string[] = [];
    const run = async (id: ItemId, task: () => unknown) => {
      if (!checked[id]) {
        return;
      }
      try {
        await task();
      } catch (error) {
        failures.push(`${ITEMS.find(i => i.id === id)?.title}: ${errorMessage(error)}`);
      }
    };
    const history = useHistory.getState();
    await run('web', () => history.clearWeb());
    await run('reading', () => history.clearReading());
    await run('searches', () => history.clearSearches());
    await run('cookies', async () => {
      await CookieManager.clearAll();
      await CookieManager.flush();
    });
    await run('cache', async () => {
      clearDetailCache();
      await clearCacheFolder();
      setCacheSize(await folderSize(CachesDirectoryPath));
    });
    await run('downloads', () => removeDownloads(Object.values(useDownloads.getState().tasks), true));
    setClearing(false);
    toast(failures.length ? `Một số mục chưa xoá được — ${failures.join('; ')}` : 'Đã xoá dữ liệu');
  };

  return (
    <Screen>
      <Header title="Xoá dữ liệu" />
      <ScrollView contentContainerStyle={styles.content}>
        <Section footer="Bookmark, tiến độ đọc, cài đặt và trang web đã lưu offline không bị ảnh hưởng.">
          {ITEMS.map((item, index) => (
            <View key={item.id}>
              {index > 0 && <Divider inset={space.lg + 34} />}
              <Pressable
                onPress={() => setChecked(current => ({ ...current, [item.id]: !current[item.id] }))}
                android_ripple={{ color: c.border }}
                style={styles.item}
              >
                <Checkbox
                  checked={checked[item.id]}
                  onChange={value => setChecked(current => ({ ...current, [item.id]: value }))}
                />
                <View style={styles.flex}>
                  <Text style={[font.body, { color: c.text }]}>{item.title}</Text>
                  <Text style={[font.caption, { color: c.muted }]}>{item.description}</Text>
                  {!!detail[item.id] && (
                    <Text style={[font.caption, styles.detail, { color: c.textSecondary }]}>
                      {detail[item.id]}
                    </Text>
                  )}
                </View>
              </Pressable>
            </View>
          ))}
        </Section>
        <Button
          title="Xoá dữ liệu"
          icon={Eraser}
          variant="danger"
          loading={clearing}
          disabled={!selected.length}
          onPress={clear}
          style={styles.button}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: space.lg, gap: space.xl },
  flex: { flex: 1 },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  detail: { marginTop: 2, fontWeight: '600' },
  button: { marginHorizontal: space.md },
});
