import { parseBackup } from '../src/features/settings/backup';
import { classifyHost, classifyUrl } from '../src/lib/adblock';
import { storage } from '../src/lib/storage';
import { addDays, dayKey } from '../src/lib/time';
import { getProgress, markChaptersRead, setLastRead } from '../src/store/progress';
import { useBrowser } from '../src/store/useBrowser';
import { useSettings } from '../src/store/useSettings';
import { sortBookmarks, useLibrary, type Bookmark } from '../src/store/useLibrary';
import { computeStreak, lastDays, type DailyStats } from '../src/store/useStats';

const day = (seconds: number, chapters = 0): DailyStats => ({ seconds, chapters, sessions: 1 });

describe('computeStreak', () => {
  const today = dayKey();

  test('chuỗi hiện tại tính cả khi hôm nay chưa đọc nhưng hôm qua có', () => {
    const daily = {
      [addDays(today, -1)]: day(600),
      [addDays(today, -2)]: day(0, 1),
      [addDays(today, -3)]: day(300),
      [addDays(today, -5)]: day(900),
    };
    expect(computeStreak(daily)).toEqual({ current: 3, best: 3, readToday: false });
  });

  test('ngày đọc dưới 1 phút và không có chương không tính', () => {
    const daily = {
      [today]: day(30),
      [addDays(today, -1)]: day(120),
    };
    expect(computeStreak(daily).current).toBe(1);
    expect(computeStreak(daily).readToday).toBe(false);
  });

  test('chuỗi dài nhất lấy từ quá khứ', () => {
    const daily: Record<string, DailyStats> = {};
    for (let i = 10; i < 15; i++) {
      daily[addDays(today, -i)] = day(600);
    }
    daily[today] = day(600);
    expect(computeStreak(daily)).toEqual({ current: 1, best: 5, readToday: true });
  });

  test('lastDays điền ngày trống bằng 0, cũ trước', () => {
    const days = lastDays({ [today]: day(60) }, 3);
    expect(days.map(d => d.key)).toEqual([addDays(today, -2), addDays(today, -1), today]);
    expect(days[0].stats.seconds).toBe(0);
    expect(days[2].stats.seconds).toBe(60);
  });
});

describe('useBrowser', () => {
  beforeEach(() => {
    const state = useBrowser.getState();
    state.closeAllTabs(false);
    state.closeAllTabs(true);
  });

  test('openUrl mở trong tab hiện tại, tăng seq để tải lại', () => {
    const state = useBrowser.getState();
    const id = state.activeTabId;
    state.openUrl('https://a.com/');
    state.openUrl('https://a.com/');
    const tab = useBrowser.getState().tabs.find(t => t.id === id)!;
    expect(tab.request).toEqual({ url: 'https://a.com/', seq: 2 });
    expect(tab.showHome).toBe(false);
  });

  test('đóng tab đang mở chuyển sang tab cùng loại, đóng tab cuối thì tạo tab mới', () => {
    const state = useBrowser.getState();
    const first = state.activeTabId;
    const incognito = state.newTab('https://x.com', { incognito: true });
    const second = useBrowser.getState().newTab('https://b.com');
    useBrowser.getState().closeTab(second);
    expect(useBrowser.getState().activeTabId).toBe(first);
    useBrowser.getState().closeTab(incognito);
    useBrowser.getState().closeTab(first);
    const { tabs, activeTabId } = useBrowser.getState();
    expect(tabs).toHaveLength(1);
    expect(tabs[0].id).toBe(activeTabId);
    expect(tabs[0].showHome).toBe(true);
  });

  test('mở URL thường từ tab ẩn danh thì tạo tab mới', () => {
    const state = useBrowser.getState();
    state.newTab('', { incognito: true });
    useBrowser.getState().openUrl('https://c.com');
    const active = useBrowser.getState().tabs.find(t => t.id === useBrowser.getState().activeTabId)!;
    expect(active.incognito).toBe(false);
    expect(active.url).toBe('https://c.com');
  });
});

describe('adblock', () => {
  test('khớp domain và domain cha, tôn trọng tắt chống theo dõi', () => {
    expect(classifyHost('pagead2.googlesyndication.com')).toBe('ad');
    expect(classifyUrl('https://www.google-analytics.com/analytics.js')).toBe('tracker');
    expect(classifyUrl('https://www.google-analytics.com/analytics.js', false)).toBeNull();
    expect(classifyUrl('https://mangadex.org/')).toBeNull();
  });
});

describe('progress', () => {
  test('đánh dấu đã đọc/chưa đọc và lưu vị trí', () => {
    const key = 'test|a.com/manga/x';
    markChaptersRead(key, ['c1', 'c2']);
    markChaptersRead(key, ['c1'], false);
    setLastRead(key, { chapterUrl: 'c2', chapterName: 'Chương 2', page: 5 });
    const progress = getProgress(key);
    expect(Object.keys(progress.read)).toEqual(['c2']);
    expect(progress.last).toMatchObject({ chapterUrl: 'c2', page: 5 });
  });
});

describe('sortBookmarks', () => {
  const make = (patch: Partial<Bookmark>): Bookmark => ({
    key: patch.title ?? 'k',
    sourceId: 's',
    url: 'u',
    title: 'T',
    content: 'manga',
    groups: [],
    addedAt: 0,
    ...patch,
  });

  test('mới cập nhật: truyện có chương mới lên đầu', () => {
    const list = [
      make({ title: 'A', addedAt: 3 }),
      make({ title: 'B', addedAt: 1, newChapters: 2, updatedAt: 2 }),
      make({ title: 'C', addedAt: 2, updatedAt: 5 }),
    ];
    expect(sortBookmarks(list, 'updated').map(b => b.title)).toEqual(['B', 'C', 'A']);
    expect(sortBookmarks(list, 'title').map(b => b.title)).toEqual(['A', 'B', 'C']);
  });
});

describe('nhóm bookmark', () => {
  const add = (key: string, groups?: string[]) =>
    useLibrary.getState().addBookmark({ key, sourceId: 's', url: key, title: key, content: 'manga', groups });
  const groupsOf = (key: string) => useLibrary.getState().bookmarks[key].groups;

  beforeEach(() => useLibrary.getState().clear());

  test('migrate từ v1: group chuỗi thành mảng groups', async () => {
    const old = (key: string, group: string) => ({ key, sourceId: 's', url: key, content: 'manga', group, addedAt: 1 });
    storage.set(
      'library',
      JSON.stringify({
        state: { bookmarks: { a: old('a', 'Action'), b: old('b', '') }, groups: ['Action'], sort: 'title' },
        version: 1,
      }),
    );
    await useLibrary.persist.rehydrate();
    const { bookmarks, groups, sort } = useLibrary.getState();
    expect(bookmarks.a.groups).toEqual(['Action']);
    expect(bookmarks.b.groups).toEqual([]);
    expect('group' in bookmarks.a).toBe(false);
    expect(groups).toEqual(['Action']);
    expect(sort).toBe('title');
  });

  test('migrate từ v1: nhóm chỉ có trên bookmark vẫn được thêm vào danh sách nhóm', async () => {
    storage.set(
      'library',
      JSON.stringify({
        state: {
          bookmarks: { a: { key: 'a', sourceId: 's', url: 'a', content: 'manga', group: 'Lạc', addedAt: 1 } },
          groups: [],
        },
        version: 1,
      }),
    );
    await useLibrary.persist.rehydrate();
    expect(useLibrary.getState().groups).toEqual(['Lạc']);
  });

  test('addBookmark thêm nhóm mới vào danh sách, thêm lại không mất nhóm cũ', () => {
    add('a', ['Later', 'Action', 'Later']);
    expect(useLibrary.getState().groups).toEqual(['Later', 'Action']);
    expect(groupsOf('a')).toEqual(['Later', 'Action']);
    add('a');
    expect(groupsOf('a')).toEqual(['Later', 'Action']);
    add('a', []);
    expect(groupsOf('a')).toEqual([]);
  });

  test('setBookmarkGroups chỉ thêm/bỏ các nhóm được chỉ định cho nhiều truyện', () => {
    useLibrary.getState().addGroup('Action');
    useLibrary.getState().addGroup('Later');
    add('a', ['Action']);
    add('b', ['Later']);
    add('c');
    useLibrary.getState().setBookmarkGroups(['a', 'b', 'c'], { add: ['Mới', 'Later'], remove: ['Action'] });
    expect(groupsOf('a')).toEqual(['Later', 'Mới']);
    expect(groupsOf('b')).toEqual(['Later', 'Mới']);
    expect(groupsOf('c')).toEqual(['Later', 'Mới']);
    expect(useLibrary.getState().groups).toEqual(['Action', 'Later', 'Mới']);
    useLibrary.getState().setGroupsFor('a', ['Action']);
    expect(groupsOf('a')).toEqual(['Action']);
  });

  test('đổi tên và xoá nhóm cập nhật mọi truyện', () => {
    add('a', ['Action', 'Later']);
    add('b', ['Later']);
    useLibrary.getState().renameGroup('Later', 'Đọc sau');
    expect(groupsOf('a')).toEqual(['Action', 'Đọc sau']);
    expect(groupsOf('b')).toEqual(['Đọc sau']);
    useLibrary.getState().removeGroup('Đọc sau');
    expect(groupsOf('a')).toEqual(['Action']);
    expect(groupsOf('b')).toEqual([]);
    expect(useLibrary.getState().groups).toEqual(['Action']);
  });

  test('khôi phục bản sao lưu cũ (group) và mới (groups)', () => {
    const item = (key: string, extra: object) => ({ key, sourceId: 's', url: key, title: key, ...extra });
    const data = parseBackup(
      JSON.stringify({
        app: 'manga-reader',
        version: 1,
        library: {
          bookmarks: {
            a: item('a', { content: 'manga', group: 'Action' }),
            b: item('b', { content: 'manga', group: '' }),
            c: item('c', { content: 'novel', groups: ['Later', 'Action', 3] }),
          },
          groups: ['Action'],
        },
      }),
    );
    expect(data.library?.bookmarks.a.groups).toEqual(['Action']);
    expect(data.library?.bookmarks.b.groups).toEqual([]);
    expect(data.library?.bookmarks.c.groups).toEqual(['Later', 'Action']);
    expect(data.library?.bookmarks.a).not.toHaveProperty('group');
    expect(data.library?.groups).toEqual(['Action', 'Later']);
  });
});

describe('migrate cài đặt', () => {
  afterEach(() => useSettings.getState().reset());

  test('từ v1: safeSearch boolean thành mức, số mục widget làm tròn lên 5/10/15/20', async () => {
    storage.set(
      'settings',
      JSON.stringify({
        state: {
          safeSearch: true,
          searchEngine: 'bing',
          homeWidgets: [
            { id: 'quickAccess', enabled: true, limit: 8 },
            { id: 'continueReading', enabled: false, limit: 3 },
            { id: 'mediaSites', enabled: true, limit: 40 },
          ],
        },
        version: 1,
      }),
    );
    await useSettings.persist.rehydrate();
    const { safeSearch, searchEngine, homeWidgets } = useSettings.getState();
    expect(safeSearch).toBe('strict');
    expect(searchEngine).toBe('bing');
    expect(homeWidgets.slice(0, 3).map(w => w.limit)).toEqual([10, 5, 20]);
    expect(homeWidgets).toHaveLength(6);
    expect(homeWidgets[1].enabled).toBe(false);
  });
});
