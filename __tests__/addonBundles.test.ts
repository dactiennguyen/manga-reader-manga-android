import { BUILTIN_ADDONS } from '../src/addons/builtin.generated';
import { addonEngine } from '../src/addons/engine';
import { evaluateAddon, isCompatible } from '../src/addons/registry';
import type { SourceConfig } from '../src/sources/types';
import { mockFetch, urlStarts } from './helpers/mockFetch';


const site = (engine: string, baseUrl: string): SourceConfig => ({
  id: baseUrl.replace(/^https?:\/\//, ''),
  engine,
  name: 'Test',
  baseUrl,
  content: 'manga',
  lang: 'en',
  nsfw: false,
  enabled: true,
  addedAt: 0,
});

describe('bản build của addon', () => {
  test.each(BUILTIN_ADDONS.map(pkg => [pkg.info.uid, pkg] as const))('%s nạp được và đủ hàm', (_uid, pkg) => {
    expect(isCompatible(pkg.info)).toBe(true);
    const mod = evaluateAddon(pkg);
    for (const name of ['getURL', 'fetch', 'run', 'get', 'match'] as const) {
      expect(typeof mod[name]).toBe('function');
    }
    expect(pkg.code).not.toMatch(/\brequire\(/);
    const engine = addonEngine(pkg.info, mod);
    expect(engine.id).toBe(pkg.info.uid);
    expect(() => engine.classifyUrl(site(pkg.info.uid, 'https://example.org'), 'https://example.org/abc/')).not.toThrow();
  });

  test('madara bản build đọc được danh sách', async () => {
    const pkg = BUILTIN_ADDONS.find(p => p.info.uid === 'madara')!;
    const engine = addonEngine(pkg.info, evaluateAddon(pkg));
    mockFetch([
      {
        match: urlStarts('https://madara.test/manga/'),
        body: `<div class="page-item-detail"><div class="item-thumb"><a href="/manga/a/"><img src="/a.jpg"></a></div>
          <div class="post-title"><h3><a href="https://madara.test/manga/a/">Truyện A</a></h3></div></div>
          <div class="nav-previous"><a href="/manga/page/2/">Older</a></div>`,
      },
    ]);
    const page = await engine.list(site('madara', 'https://madara.test'), 'latest', 1);
    expect(page).toEqual({
      items: [{ url: 'https://madara.test/manga/a/', title: 'Truyện A', cover: 'https://madara.test/a.jpg', subtitle: undefined }],
      hasNext: true,
    });
    expect(await engine.listUrl!(site('madara', 'https://madara.test'), { method: 'search', query: 'x y', page: 2 })).toBe(
      'https://madara.test/page/2/?s=x%20y&post_type=wp-manga',
    );
  });
});
