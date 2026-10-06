import * as RNFS from '@dr.pogodin/react-native-fs';
import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
  saveDocuments,
  types,
} from '@react-native-documents/picker';

import NativeFiles from '../../specs/NativeFiles';
import { uid } from './id';

export const ROOT_DIR = `${RNFS.DocumentDirectoryPath}/mangaka`;

export const DIRS = {
  images: `${ROOT_DIR}/images`,
  thumbs: `${ROOT_DIR}/thumbs`,
  exports: `${ROOT_DIR}/exports`,
  tmp: `${RNFS.CachesDirectoryPath}/mangaka-tmp`,
} as const;

export const MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  pdf: 'application/pdf',
  zip: 'application/zip',
  cbz: 'application/vnd.comicbook+zip',
  mangaka: 'application/octet-stream',
} as const;

let ready: Promise<void> | null = null;

export function ensureDirs(): Promise<void> {
  if (!ready) {
    ready = Promise.all(Object.values(DIRS).map(dir => RNFS.mkdir(dir))).then(() => {});
  }
  return ready;
}

export function fileUri(path: string): string {
  return /^[a-z]+:\/\//i.test(path) ? path : `file://${path}`;
}

export function stripFileScheme(uri: string): string {
  return decodeURIComponent(uri.replace(/^file:\/\//, ''));
}

export function extensionOf(name: string | null | undefined, fallback = 'jpg'): string {
  const match = /\.([a-z0-9]{2,5})$/i.exec(name ?? '');
  return match ? match[1].toLowerCase() : fallback;
}

function isCancel(error: unknown): boolean {
  return isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED;
}

export async function pickToCache(
  type: string | string[],
): Promise<{ path: string; name: string } | null> {
  try {
    const [picked] = await pick({ type });
    const name = picked.name ?? `file-${uid()}`;
    const [copy] = await keepLocalCopy({
      files: [{ uri: picked.uri, fileName: name }],
      destination: 'cachesDirectory',
    });
    if (copy.status !== 'success') {
      throw new Error(copy.copyError);
    }
    return { path: stripFileScheme(copy.localUri), name };
  } catch (error) {
    if (isCancel(error)) {
      return null;
    }
    throw error;
  }
}

export async function pickImage(): Promise<string | null> {
  const picked = await pickToCache(types.images);
  if (!picked) {
    return null;
  }
  await ensureDirs();
  const dest = `${DIRS.images}/${uid()}.${extensionOf(picked.name)}`;
  await RNFS.moveFile(picked.path, dest);
  return dest;
}

export async function copyIntoImages(sourcePath: string): Promise<string> {
  await ensureDirs();
  const dest = `${DIRS.images}/${uid()}.${extensionOf(sourcePath)}`;
  await RNFS.copyFile(sourcePath, dest);
  return dest;
}

export async function removeFile(path: string | undefined | null): Promise<void> {
  if (!path) {
    return;
  }
  try {
    if (await RNFS.exists(path)) {
      await RNFS.unlink(path);
    }
  } catch {}
}

export async function resetDir(dir: string): Promise<void> {
  await removeFile(dir);
  await RNFS.mkdir(dir);
}

export async function fileSize(path: string): Promise<number> {
  try {
    return Number((await RNFS.stat(path)).size) || 0;
  } catch {
    return 0;
  }
}

export async function dirSize(dir: string): Promise<number> {
  try {
    const entries = await RNFS.readDir(dir);
    const sizes = await Promise.all(
      entries.map(entry => (entry.isDirectory() ? dirSize(entry.path) : Promise.resolve(Number(entry.size) || 0))),
    );
    return sizes.reduce((sum, size) => sum + size, 0);
  } catch {
    return 0;
  }
}

export async function saveToDevice(path: string, fileName: string, mimeType: string): Promise<boolean> {
  try {
    const [result] = await saveDocuments({ sourceUris: [fileUri(path)], fileName, mimeType, copy: true });
    return !result.error;
  } catch (error) {
    if (isCancel(error)) {
      return false;
    }
    throw error;
  }
}

function native() {
  if (!NativeFiles) {
    throw new Error('File operations are not supported on this device.');
  }
  return NativeFiles;
}

export function shareFile(path: string, mimeType: string, title: string): Promise<void> {
  return native().shareFile(path, mimeType, title);
}

export function zipDir(sourceDir: string, outPath: string): Promise<void> {
  return native().zip(sourceDir, outPath);
}

export function unzipTo(zipPath: string, destDir: string): Promise<void> {
  return native().unzip(zipPath, destDir);
}

export function imagesToPdf(imagePaths: string[], outPath: string, spread: boolean, rtl: boolean): Promise<void> {
  return native().imagesToPdf(imagePaths, outPath, spread, rtl);
}

export { RNFS, types as pickerTypes };
