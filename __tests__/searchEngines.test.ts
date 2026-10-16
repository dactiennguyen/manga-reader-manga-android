import { buildSearchUrl, resolveInput } from '../src/features/browser/searchEngines';
import { parseBackup } from '../src/features/settings/backup';

const param = (url: string, name: string) => new URL(url).searchParams.get(name);

describe('tìm kiếm an toàn theo từng công cụ', () => {
  test('Google: lọc → safe=active, vừa phải → bỏ tham số, tắt → safe=off', () => {
    expect(param(buildSearchUrl('google', 'one piece', 'strict'), 'safe')).toBe('active');
    expect(param(buildSearchUrl('google', 'one piece', 'moderate'), 'safe')).toBeNull();
    expect(param(buildSearchUrl('google', 'one piece', 'off'), 'safe')).toBe('off');
    expect(param(buildSearchUrl('google', 'one piece', 'off'), 'q')).toBe('one piece');
  });

  test('Bing, DuckDuckGo, Yahoo, Yandex dùng tham số riêng cho cả ba mức', () => {
    expect(
      ['strict', 'moderate', 'off'].map(level => param(buildSearchUrl('bing', 'x', level as never), 'adlt')),
    ).toEqual(['strict', 'moderate', 'off']);
    expect(
      ['strict', 'moderate', 'off'].map(level => param(buildSearchUrl('duckduckgo', 'x', level as never), 'kp')),
    ).toEqual(['1', '-1', '-2']);
    expect(
      ['strict', 'moderate', 'off'].map(level => param(buildSearchUrl('yahoo', 'x', level as never), 'vm')),
    ).toEqual(['r', 'i', 'p']);
    expect(
      ['strict', 'moderate', 'off'].map(level => param(buildSearchUrl('yandex', 'x', level as never), 'family')),
    ).toEqual(['yes', null, 'no']);
  });

  test('địa chỉ web được mở thẳng, không qua công cụ tìm kiếm', () => {
    expect(resolveInput('mangadex.org', 'google', 'strict')).toBe('https://mangadex.org');
  });
});

describe('khôi phục cài đặt từ bản sao lưu cũ', () => {
  const backup = (settings: object) => JSON.stringify({ app: 'manga-reader', version: 1, createdAt: 1, settings });

  test('safeSearch kiểu boolean được đổi sang mức mới', () => {
    expect(parseBackup(backup({ safeSearch: true })).settings?.safeSearch).toBe('strict');
    expect(parseBackup(backup({ safeSearch: false })).settings?.safeSearch).toBe('off');
    expect(parseBackup(backup({ safeSearch: 'moderate' })).settings?.safeSearch).toBe('moderate');
  });

  test('bỏ giá trị không hợp lệ và làm tròn số mục widget', () => {
    const settings = parseBackup(
      backup({
        safeSearch: 'yes',
        startPage: 'nowhere',
        appLinks: 'allow',
        homeWidgets: [
          { id: 'quickAccess', enabled: true, limit: 6 },
          { id: 'mediaSites', enabled: true },
        ],
      }),
    ).settings;
    expect(settings?.safeSearch).toBeUndefined();
    expect(settings?.startPage).toBeUndefined();
    expect(settings?.appLinks).toBe('allow');
    expect(settings?.homeWidgets?.map(w => w.limit)).toEqual([10, 5]);
  });
});
