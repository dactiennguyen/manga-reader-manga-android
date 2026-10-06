import { DownloadDirectoryPath, downloadFile, exists, scanFile, stopDownload, unlink, writeFile } from '@dr.pogodin/react-native-fs';

import { getUserAgent } from '../../lib/http';
import { uid } from '../../lib/id';
import { getPath } from '../../lib/url';
import { useFiles, type FileDownload, type FileKind } from '../../store/useFiles';


const KIND_BY_EXT: [RegExp, FileKind][] = [
  [/\.(jpe?g|png|webp|gif|avif|bmp|svg|heic)$/i, 'image'],
  [/\.(mp4|m4v|webm|mov|mkv|3gp)$/i, 'video'],
  [/\.(mp3|m4a|aac|ogg|oga|opus|wav|flac)$/i, 'audio'],
];

const DEFAULT_EXT: Record<FileKind, string> = { image: 'jpg', video: 'mp4', audio: 'mp3', file: 'bin' };

export function kindOfName(name: string): FileKind {
  return KIND_BY_EXT.find(([re]) => re.test(name))?.[1] ?? 'file';
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function fileNameFromUrl(url: string, kind?: FileKind): string {
  const last = safeDecode(getPath(url).split('/').filter(Boolean).pop() ?? '');
  let name = last.replace(/[^\p{L}\p{N}._-]+/gu, '_').replace(/^_+|_+$/g, '').slice(-100);
  if (!name) {
    name = `${kind ?? 'file'}_${Date.now()}`;
  }
  if (!/\.[a-z0-9]{2,5}$/i.test(name)) {
    name = `${name}.${DEFAULT_EXT[kind ?? 'file']}`;
  }
  return name;
}

async function uniquePath(name: string): Promise<string> {
  const path = `${DownloadDirectoryPath}/${name}`;
  if (!(await exists(path))) {
    return path;
  }
  const dot = name.lastIndexOf('.');
  return `${DownloadDirectoryPath}/${name.slice(0, dot)}_${Date.now()}${name.slice(dot)}`;
}

const jobs = new Map<string, number>();

export async function startFileDownload(
  url: string,
  options: { pageUrl?: string; kind?: FileKind; name?: string } = {},
): Promise<string> {
  const store = useFiles.getState();
  const dataUri = /^data:([\w.+-]+\/[\w.+-]+);base64,(.*)$/i.exec(url);
  if (dataUri) {
    const kind = options.kind ?? (dataUri[1].startsWith('image/') ? 'image' : 'file');
    const ext = dataUri[1].split('/')[1].replace('jpeg', 'jpg').replace(/\+.*$/, '');
    const path = await uniquePath(options.name ?? `${kind}_${Date.now()}.${ext}`);
    await writeFile(path, dataUri[2], 'base64');
    await scanFile(path).catch(() => null);
    const id = uid();
    const size = Math.floor((dataUri[2].length * 3) / 4);
    store.add({
      id,
      url: '',
      pageUrl: options.pageUrl,
      name: path.split('/').pop() ?? 'file',
      path,
      kind,
      status: 'done',
      bytes: size,
      total: size,
      createdAt: Date.now(),
    });
    return id;
  }
  if (!/^https?:/i.test(url)) {
    throw new Error('Không tải được tệp này.');
  }

  const name = options.name ?? fileNameFromUrl(url, options.kind);
  const kind = options.kind ?? kindOfName(name);
  const path = await uniquePath(name);
  const id = uid();
  store.add({
    id,
    url,
    pageUrl: options.pageUrl,
    name: path.split('/').pop() ?? name,
    path,
    kind,
    status: 'downloading',
    bytes: 0,
    total: 0,
    createdAt: Date.now(),
  });
  run(id);
  return id;
}

function run(id: string): void {
  const file = useFiles.getState().files.find(f => f.id === id);
  if (!file) {
    return;
  }
  const update = (patch: Partial<FileDownload>) => useFiles.getState().update(id, patch);
  const { jobId, promise } = downloadFile({
    fromUrl: file.url,
    toFile: file.path,
    headers: {
      'User-Agent': getUserAgent(),
      ...(file.pageUrl ? { Referer: file.pageUrl } : {}),
    },
    connectionTimeout: 20000,
    readTimeout: 60000,
    progressInterval: 500,
    begin: res => update({ total: res.contentLength > 0 ? res.contentLength : 0 }),
    progress: res => update({ bytes: res.bytesWritten, total: res.contentLength > 0 ? res.contentLength : 0 }),
  });
  jobs.set(id, jobId);
  promise
    .then(async result => {
      jobs.delete(id);
      if (result.statusCode < 200 || result.statusCode >= 300) {
        await unlink(file.path).catch(() => null);
        update({ status: 'error', error: `Máy chủ trả lỗi ${result.statusCode}.` });
        return;
      }
      await scanFile(file.path).catch(() => null);
      update({ status: 'done', bytes: result.bytesWritten, total: result.bytesWritten });
    })
    .catch(error => {
      jobs.delete(id);
      if (useFiles.getState().files.some(f => f.id === id)) {
        update({ status: 'error', error: error instanceof Error ? error.message : String(error) });
      }
    });
}

export function retryFileDownload(id: string): void {
  useFiles.getState().update(id, { status: 'downloading', bytes: 0, error: undefined });
  run(id);
}

export async function removeFileDownloads(ids: string[], deleteFiles: boolean): Promise<void> {
  const files = useFiles.getState().files.filter(f => ids.includes(f.id));
  useFiles.getState().remove(ids);
  for (const file of files) {
    const jobId = jobs.get(file.id);
    if (jobId !== undefined) {
      stopDownload(jobId);
      jobs.delete(file.id);
    }
    if (deleteFiles || file.status !== 'done') {
      await unlink(file.path).catch(() => null);
    }
  }
}
