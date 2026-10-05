import { addonInfos } from '../src/addons/registry';
import { getEngine } from '../src/sources';
import {
  builtinSources,
  CATALOG_NOTES,
  catalogSource,
  catalogSourceForUrl,
  catalogSources,
} from '../src/sources/catalog';
import { findSourceForUrl, getSource, useSources } from '../src/store/useSources';

const sites = () =>
  addonInfos().flatMap(info =>
    Object.entries(info.siteInfo ?? {}).map(([id, site]) => ({ ...site, id, engine: info.uid, info })),
  );

const verified = () => sites().find(site => !site.note && site.engine === 'madara')!;

describe('danh mục site (siteInfo của addon)', () => {
  beforeEach(() => {
    useSources.setState({ sources: builtinSources() });
  });

  test('dữ liệu hợp lệ: id duy nhất, addon tồn tại, site thường thuộc addon thêm được site', () => {
    const all = sites();
    const ids = all.map(site => site.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const site of all) {
      expect(site.id).not.toMatch(/^www\.|\/|^ww38\./);
      expect(site.note === undefined || site.note in CATALOG_NOTES).toBe(true);
      expect(site.builtin || site.info.allowCustomSites).toBe(true);
      expect(getEngine(site.engine).id).toBe(site.engine);
    }
    expect(all.filter(site => !site.note && !site.builtin).length).toBeGreaterThan(50);
  });

  test('nguồn có sẵn của addon một-site được ghim từ đầu', () => {
    expect(builtinSources().map(s => s.id).sort()).toEqual(
      ['fanfox.net', 'mangadex.org', 'mangakatana.com', 'mangatown.com', 'weebcentral.com'].sort(),
    );
    expect(builtinSources().every(s => s.enabled && s.builtin)).toBe(true);
    expect(getSource('mangadex.org')?.options?.chapterLang).toBe('en');
  });

  test('site trong danh mục dùng được khi chưa ghim', () => {
    const site = verified();
    const source = getSource(site.id);
    expect(source).toMatchObject({ id: site.id, engine: site.engine, enabled: false });
    // Cùng một object mỗi lần gọi để an toàn khi làm deps của hook.
    expect(getSource(site.id)).toBe(source);
    expect(catalogSources()).toContain(source);
  });

  test('nhận diện URL của site trong danh mục, kể cả www và m.', () => {
    const site = verified();
    const base = catalogSource(site.id)!.baseUrl;
    expect(findSourceForUrl(`${base}/manga/abc/`)?.id).toBe(site.id);
    expect(catalogSourceForUrl(`https://www.${site.id}/x`)?.id).toBe(site.id);
    expect(catalogSourceForUrl(`https://m.${site.id}/x`)?.id).toBe(site.id);
    expect(findSourceForUrl('https://w.mangatown.com/manga/abc/')?.id).toBe('mangatown.com');
    expect(findSourceForUrl('https://example.org/manga/abc/')).toBeUndefined();
  });

  test('ghim hoặc chỉnh một site của danh mục thì lưu bản sao, bản lưu được ưu tiên', () => {
    const site = verified();
    useSources.getState().updateSource(site.id, { enabled: true, name: 'Tên mới' });
    const stored = useSources.getState().sources.find(s => s.id === site.id);
    expect(stored).toMatchObject({ enabled: true, name: 'Tên mới', engine: site.engine });
    expect(getSource(site.id)?.name).toBe('Tên mới');
    expect(findSourceForUrl(catalogSource(site.id)!.baseUrl)?.name).toBe('Tên mới');

    // Khôi phục: bỏ bản lưu, quay về danh mục.
    useSources.getState().removeSource(site.id);
    expect(getSource(site.id)).toBe(catalogSource(site.id));
  });

  test('cập nhật id không có trong danh mục lẫn danh sách thì không làm gì', () => {
    const before = useSources.getState().sources;
    useSources.getState().updateSource('khong-ton-tai.example', { enabled: true });
    expect(useSources.getState().sources).toBe(before);
  });
});
