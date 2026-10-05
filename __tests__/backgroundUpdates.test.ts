import NativeLibraryTasks from '../specs/NativeLibraryTasks';
import {
  applyUpdateSchedule,
  notificationText,
  runBackgroundUpdateCheck,
} from '../src/features/library/backgroundUpdates';
import { fetchDetail, getCachedChapters } from '../src/sources/cache';
import { mangaKey } from '../src/sources';
import { useLibrary } from '../src/store/useLibrary';
import { useSettings } from '../src/store/useSettings';

jest.mock('../specs/NativeLibraryTasks', () => ({
  __esModule: true,
  default: {
    scheduleUpdateCheck: jest.fn(),
    cancelUpdateCheck: jest.fn(),
    runUpdateCheckNow: jest.fn(),
    showNotification: jest.fn(),
  },
}));

jest.mock('../src/sources/cache', () => ({
  ...jest.requireActual('../src/sources/cache'),
  getCachedChapters: jest.fn(),
  fetchDetail: jest.fn(),
}));

const native = NativeLibraryTasks as jest.Mocked<NonNullable<typeof NativeLibraryTasks>>;
const URL = 'https://mangadex.org/title/11111111-2222-3333-4444-555555555555';
const KEY = mangaKey('mangadex.org', URL);
const chapter = (n: number) => ({ url: `https://mangadex.org/chapter/c${n}`, name: `Ch. ${n}` });

describe('kiểm tra chương mới ở nền', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSettings.setState({ notifyUpdates: true });
    useLibrary.setState({
      bookmarks: {
        [KEY]: { key: KEY, sourceId: 'mangadex.org', url: URL, title: 'Truyện A', content: 'manga', group: '', addedAt: 1 },
      },
    });
    (getCachedChapters as jest.Mock).mockReturnValue([chapter(1)]);
    (fetchDetail as jest.Mock).mockResolvedValue({ url: URL, title: 'Truyện A', chapters: [chapter(2), chapter(1)] });
  });

  test('có chương mới thì đăng thông báo', async () => {
    await runBackgroundUpdateCheck();
    expect(native.showNotification).toHaveBeenCalledWith(1001, '1 chương mới từ 1 truyện', 'Truyện A');
    expect(useLibrary.getState().bookmarks[KEY].newChapters).toBe(1);
  });

  test('không có chương mới thì im lặng', async () => {
    (fetchDetail as jest.Mock).mockResolvedValue({ url: URL, title: 'Truyện A', chapters: [chapter(1)] });
    await runBackgroundUpdateCheck();
    expect(native.showNotification).not.toHaveBeenCalled();
  });

  test('tắt thông báo thì không tải gì', async () => {
    useSettings.setState({ notifyUpdates: false });
    await runBackgroundUpdateCheck();
    expect(fetchDetail).not.toHaveBeenCalled();
  });

  test('nội dung thông báo gọn khi nhiều truyện', () => {
    expect(
      notificationText({ updated: 5, failed: 0, newChapters: 9, titles: ['A', 'B', 'C', 'D', 'E'] }),
    ).toEqual({ title: '9 chương mới từ 5 truyện', text: 'A, B, C và 2 truyện khác' });
  });

  test('bật/tắt lịch WorkManager theo cài đặt', () => {
    applyUpdateSchedule(true);
    expect(native.scheduleUpdateCheck).toHaveBeenCalledWith(6);
    applyUpdateSchedule(false);
    expect(native.cancelUpdateCheck).toHaveBeenCalled();
  });
});
