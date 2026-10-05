#!/usr/bin/env node
/* eslint-env node */
/**
 * Biên dịch addon: addons/<uid>/{info.json, main.ts} → một đoạn JS độc lập.
 *
 * Kết quả:
 *   src/addons/builtin.generated.ts   addon có sẵn trong app
 *   dist/addons/<uid>.json            gói { info, code } để đăng lên kho addon
 *   dist/addons/manifest.json         danh sách gói (version, sha256) cho app kiểm tra cập nhật
 *
 * Code addon chỉ được import từ src/addons/sdk.ts (lúc chạy là tham số
 * `__sdk`), còn lại chỉ được `import type`. Biên dịch bằng đúng preset Babel
 * của React Native với profile Hermes, nên chạy được khi app nạp bằng
 * `new Function` trên Hermes.
 *
 *   npm run addons                 build
 *   npm run addons -- --check      chỉ kiểm tra bản build có khớp mã nguồn không
 *   npm run addons -- --uid madara chỉ biên dịch thử một addon, không ghi file
 */
const babel = require('@babel/core');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ADDONS_DIR = path.join(ROOT, 'addons');
const SDK_FILE = path.join(ROOT, 'src/addons/sdk');
const GENERATED = path.join(ROOT, 'src/addons/builtin.generated.ts');
const DIST = path.join(ROOT, 'dist/addons');

const SDK_VERSION = Number(
  fs.readFileSync(`${SDK_FILE}.ts`, 'utf8').match(/export const SDK_VERSION = (\d+)/)[1],
);

const sha256 = text => crypto.createHash('sha256').update(text, 'utf8').digest('hex');

/** Thay `import { a, b as c } from '…/sdk'` bằng `const { a, b: c } = __sdk;`. */
function sdkImports(file) {
  return ({ types: t }) => ({
    visitor: {
      ImportDeclaration(p) {
        const { node } = p;
        const source = node.source.value;
        const typeOnly =
          node.importKind === 'type' || (node.specifiers.length > 0 && node.specifiers.every(s => s.importKind === 'type'));
        const resolved = source.startsWith('.') ? path.resolve(path.dirname(file), source) : source;
        if (typeOnly) {
          p.remove();
          return;
        }
        if (resolved !== SDK_FILE) {
          throw p.buildCodeFrameError(
            `Addon chỉ được import từ SDK (src/addons/sdk.ts), không được import "${source}". Kiểu dữ liệu thì dùng "import type".`,
          );
        }
        const props = node.specifiers
          .filter(s => s.importKind !== 'type')
          .map(s => {
            if (s.type !== 'ImportSpecifier') {
              throw p.buildCodeFrameError('Chỉ import theo tên từ SDK, ví dụ import { getText } from …');
            }
            const imported = s.imported.name ?? s.imported.value;
            return t.objectProperty(t.identifier(imported), t.identifier(s.local.name), false, imported === s.local.name);
          });
        p.replaceWith(
          t.variableDeclaration('const', [t.variableDeclarator(t.objectPattern(props), t.identifier('__sdk'))]),
        );
      },
    },
  });
}

function compile(file) {
  const source = fs.readFileSync(file, 'utf8');
  const { code } = babel.transformSync(source, {
    filename: file,
    babelrc: false,
    configFile: false,
    comments: false,
    compact: false,
    sourceType: 'module',
    plugins: [sdkImports(file)],
    presets: [
      [
        require.resolve('@react-native/babel-preset'),
        {
          dev: false,
          enableBabelRuntime: false,
          unstable_transformProfile: 'hermes-stable',
          disableStaticViewConfigsCodegen: true,
        },
      ],
    ],
  });
  // Thân hàm `new Function('__sdk', code)`: trả về các export của addon.
  return `var exports = {};\nvar module = { exports: exports };\n${code}\nreturn module.exports;\n`;
}

function readAddon(uid) {
  const dir = path.join(ADDONS_DIR, uid);
  const infoText = fs.readFileSync(path.join(dir, 'info.json'), 'utf8');
  const mainText = fs.readFileSync(path.join(dir, 'main.ts'), 'utf8');
  const info = JSON.parse(infoText);
  if (info.uid !== uid) {
    throw new Error(`addons/${uid}/info.json: uid "${info.uid}" phải trùng tên thư mục`);
  }
  for (const key of ['label', 'desc', 'version', 'content', 'sorts']) {
    if (info[key] === undefined) {
      throw new Error(`addons/${uid}/info.json thiếu "${key}"`);
    }
  }
  info.sdk = info.sdk ?? 1;
  info.type = info.type ?? 'catalog';
  info.allowCustomSites = !!info.allowCustomSites;
  if (info.sdk > SDK_VERSION) {
    throw new Error(`addons/${uid} cần SDK ${info.sdk}, SDK hiện tại là ${SDK_VERSION}`);
  }
  // Mã băm nguồn: test so với bản build để phát hiện quên chạy `npm run addons`.
  const sourceHash = sha256(`${SDK_VERSION}\n${infoText}\n${mainText}`);
  return { uid, dir, info, sourceHash };
}

function addonUids() {
  return fs
    .readdirSync(ADDONS_DIR)
    .filter(name => fs.existsSync(path.join(ADDONS_DIR, name, 'main.ts')))
    .sort();
}

function main() {
  const check = process.argv.includes('--check');
  const only = process.argv.includes('--uid') ? process.argv[process.argv.indexOf('--uid') + 1] : undefined;
  if (only) {
    const addon = readAddon(only);
    const code = compile(path.join(addon.dir, 'main.ts'));
    // Chạy thử phần khai báo (không gọi hàm nào) để bắt lỗi cú pháp sau biên dịch.
    // eslint-disable-next-line no-new-func
    new Function('__sdk', code)(new Proxy({}, { get: () => () => undefined }));
    console.log(`addons/${only}: biên dịch được (${Math.round(code.length / 1024)} KB), chưa ghi file.`);
    return;
  }
  const addons = addonUids().map(readAddon);

  if (check) {
    const generated = fs.existsSync(GENERATED) ? fs.readFileSync(GENERATED, 'utf8') : '';
    const stale = addons.filter(a => !generated.includes(a.sourceHash)).map(a => a.uid);
    if (stale.length) {
      console.error(`Addon chưa build lại: ${stale.join(', ')} — chạy "npm run addons".`);
      process.exit(1);
    }
    console.log(`${addons.length} addon khớp mã nguồn.`);
    return;
  }

  const packages = addons.map(a => ({ ...a, code: compile(path.join(a.dir, 'main.ts')) }));

  const lines = [
    '// Sinh bởi scripts/build-addons.js — đừng sửa tay. Sửa addons/<uid>/ rồi chạy `npm run addons`.',
    "import type { AddonPackage } from './types';",
    '',
    '/** Addon có sẵn trong app. `sourceHash` để test phát hiện bản build cũ. */',
    'export const BUILTIN_ADDONS: (AddonPackage & { sourceHash: string })[] = [',
  ];
  for (const p of packages) {
    lines.push(
      `  { info: ${JSON.stringify(p.info)}, sourceHash: ${JSON.stringify(p.sourceHash)}, code: ${JSON.stringify(p.code)} },`,
    );
  }
  lines.push('];', '');
  fs.writeFileSync(GENERATED, lines.join('\n'));

  fs.mkdirSync(DIST, { recursive: true });
  const manifest = { sdk: SDK_VERSION, generatedAt: new Date().toISOString(), addons: [] };
  for (const p of packages) {
    const file = `${p.uid}.json`;
    const text = JSON.stringify({ info: p.info, code: p.code });
    fs.writeFileSync(path.join(DIST, file), text);
    manifest.addons.push({
      uid: p.uid,
      label: p.info.label,
      version: p.info.version,
      sdk: p.info.sdk,
      file,
      size: Buffer.byteLength(text, 'utf8'),
      sha256: sha256(text),
    });
  }
  fs.writeFileSync(path.join(DIST, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  const total = packages.reduce((n, p) => n + p.code.length, 0);
  console.log(
    `${packages.length} addon (${Math.round(total / 1024)} KB) → ${path.relative(ROOT, GENERATED)}, ${path.relative(ROOT, DIST)}/`,
  );
}

main();
