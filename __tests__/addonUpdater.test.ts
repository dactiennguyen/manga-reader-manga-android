import { BUILTIN_ADDONS } from '../src/addons/builtin.generated';
import { addonEntries, addonEngineFor, addonInfo, uninstallAddon } from '../src/addons/registry';
import { checkAddonUpdates } from '../src/addons/updater';
import type { AddonPackage } from '../src/addons/types';
import { sha256 } from '../src/lib/sha256';
import { mockFetch, urlIs } from './helpers/mockFetch';

const REPO = 'https://addons.test/repo/manifest.json';
const madara = BUILTIN_ADDONS.find(p => p.info.uid === 'madara')!;

function newerMadara(code = madara.code): { pkg: AddonPackage; text: string } {
  const pkg: AddonPackage = { info: { ...madara.info, version: madara.info.version + 1 }, code };
  return { pkg, text: JSON.stringify(pkg) };
}

function serve(text: string, entry: Record<string, unknown> = {}) {
  return mockFetch([
    {
      match: urlIs(REPO),
      body: {
        sdk: 1,
        addons: [{ uid: 'madara', version: madara.info.version + 1, sdk: 1, file: 'madara.json', sha256: sha256(text), ...entry }],
      },
    },
    { match: urlIs('https://addons.test/repo/madara.json'), body: text },
  ]);
}

describe('sha256', () => {
  test('khớp giá trị chuẩn, kể cả chữ có dấu và emoji', () => {
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256('Việt Nam 🙂 truyện tranh')).toBe('591b4a3e5a70e7a3c3fa344d359b08b54f5f70d40501dbf21958f3b4c5904cce');
    expect(sha256('a'.repeat(1000))).toBe('41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3');
  });
});

describe('cập nhật addon từ kho', () => {
  afterEach(() => uninstallAddon('madara'));

  test('cài bản mới hơn rồi gỡ thì quay về bản có sẵn', async () => {
    const { text } = newerMadara(`${madara.code}\nexports.updatedMarker = true;`);
    serve(text);
    const report = await checkAddonUpdates(REPO);
    expect(report).toEqual({
      installed: [{ uid: 'madara', label: madara.info.label, version: madara.info.version + 1 }],
      needsAppUpdate: [],
      errors: [],
    });
    expect(addonInfo('madara')?.version).toBe(madara.info.version + 1);
    expect(addonEntries().find(e => e.info.uid === 'madara')).toMatchObject({
      origin: 'update',
      builtinVersion: madara.info.version,
    });
    expect(addonEngineFor('madara')?.version).toBe(madara.info.version + 1);

    uninstallAddon('madara');
    expect(addonInfo('madara')?.version).toBe(madara.info.version);
    expect(addonEntries().find(e => e.info.uid === 'madara')?.origin).toBe('builtin');
  });

  test('bỏ qua khi kho không có bản mới hơn', async () => {
    const { text } = newerMadara();
    serve(text, { version: madara.info.version });
    expect((await checkAddonUpdates(REPO)).installed).toEqual([]);
  });

  test('từ chối gói sai sha256 hoặc code hỏng', async () => {
    const { text } = newerMadara();
    serve(text, { sha256: 'deadbeef' });
    let report = await checkAddonUpdates(REPO);
    expect(report.installed).toEqual([]);
    expect(report.errors[0]).toMatch(/sha256/);

    const broken = newerMadara('throw new Error("hỏng");');
    serve(broken.text);
    report = await checkAddonUpdates(REPO);
    expect(report.installed).toEqual([]);
    expect(report.errors[0]).toMatch(/hỏng/);
    expect(addonInfo('madara')?.version).toBe(madara.info.version);
  });

  test('addon cần SDK mới hơn thì báo cần cập nhật app', async () => {
    const { text } = newerMadara();
    serve(text, { sdk: 99 });
    expect(await checkAddonUpdates(REPO)).toEqual({ installed: [], needsAppUpdate: [madara.info.label], errors: [] });
  });
});
