import {
  DocumentDirectoryPath,
  downloadFile,
  exists,
  mkdir,
  readFile,
  stat,
  stopDownload,
  unlink,
  writeFile,
} from '@dr.pogodin/react-native-fs';

import { hashString } from '../../lib/id';
import { errorMessage, getUserAgent } from '../../lib/http';
import { getEngine } from '../../sources';
import type { ChapterContent } from '../../sources/types';
import { downloadId, useDownloads, type DownloadTask } from '../../store/useDownloads';
import { getSource } from '../../store/useSources';

/**
 * Bộ tải chương chạy nền trong phiên app (chapterDownloader).
 * Tải lần lượt từng chương, mỗi chương 3 ảnh song song; tạm dừng thì huỷ
 * ảnh đang tải, tiếp tục thì bỏ qua ảnh đã có.
 */

const ROOT = `${DocumentDirectoryPath}/downloads`;
const PARALLEL_IMAGES = 3;

type StoredChapter =
  | { kind: 'images'; title?: string; files: string[] }
  | { kind: 'text'; title?: string; paragraphs: string[] };

export function mangaDir(mangaKey: string): string {
  return `${ROOT}/${hashString(mangaKey)}`;
}

export function chapterDir(task: Pick<DownloadTask, 'mangaKey' | 'id'>): string {
  return `${mangaDir(task.mangaKey)}/${task.id}`;
}

function extensionOf(url: string): string {
  return url.match(/\.(jpe?g|png|webp|gif|avif)(?:[?#]|$)/i)?.[1].toLowerCase() ?? 'jpg';
}

const activeJobs = new Map<string, Set<number>>();
let running = false;
let started = false;

function isCancelled(id: string): boolean {
  return useDownloads.getState().tasks[id]?.status !== 'downloading';
}

async function downloadTask(task: DownloadTask): Promise<void> {
  const { update } = useDownloads.getState();
  const source = getSource(task.sourceId);
  if (!source) {
    update(task.id, { status: 'error', error: 'Nguồn của truyện này đã bị xoá.' });
    return;
  }
  const dir = chapterDir(task);
  await mkdir(dir);

  const content = await getEngine(source.engine).chapter(source, task.chapterUrl);
  if (isCancelled(task.id)) {
    return;
  }

  if (content.kind === 'text') {
    const stored: StoredChapter = { kind: 'text', title: content.title, paragraphs: content.paragraphs };
    const json = JSON.stringify(stored);
    await writeFile(`${dir}/content.json`, json, 'utf8');
    update(task.id, {
      status: 'done',
      done: 1,
      total: 1,
      bytes: json.length,
      finishedAt: Date.now(),
    });
    return;
  }

  const files = content.pages.map((page, i) => `${String(i + 1).padStart(3, '0')}.${extensionOf(page.uri)}`);
  update(task.id, { total: files.length });
  let done = 0;
  let bytes = 0;
  const jobs = new Set<number>();
  activeJobs.set(task.id, jobs);

  const queue = content.pages.map((page, i) => ({ page, file: `${dir}/${files[i]}` }));
  const worker = async () => {
    while (queue.length && !isCancelled(task.id)) {
      const { page, file } = queue.shift()!;
      if (!(await exists(file))) {
        const job = downloadFile({
          fromUrl: page.uri,
          toFile: file,
          headers: { 'User-Agent': getUserAgent(), ...page.headers },
          connectionTimeout: 20000,
          readTimeout: 30000,
        });
        jobs.add(job.jobId);
        try {
          const result = await job.promise;
          if (result.statusCode >= 400) {
            await unlink(file).catch(() => {});
            throw new Error(`Ảnh trả lỗi ${result.statusCode}`);
          }
          bytes += result.bytesWritten;
        } finally {
          jobs.delete(job.jobId);
        }
      } else {
        bytes += (await stat(file)).size;
      }
      done++;
      update(task.id, { done, bytes });
    }
  };

  try {
    await Promise.all(Array.from({ length: PARALLEL_IMAGES }, worker));
  } finally {
    activeJobs.delete(task.id);
  }
  if (isCancelled(task.id)) {
    return;
  }
  const stored: StoredChapter = { kind: 'images', title: content.title, files };
  await writeFile(`${dir}/content.json`, JSON.stringify(stored), 'utf8');
  update(task.id, { status: 'done', done: files.length, bytes, finishedAt: Date.now() });
}

function nextQueued(): DownloadTask | undefined {
  return Object.values(useDownloads.getState().tasks)
    .filter(t => t.status === 'queued')
    .sort((a, b) => a.createdAt - b.createdAt)[0];
}

async function pump(): Promise<void> {
  if (running) {
    return;
  }
  running = true;
  try {
    for (let task = nextQueued(); task; task = nextQueued()) {
      useDownloads.getState().update(task.id, { status: 'downloading', error: undefined });
      try {
        await downloadTask(task);
      } catch (error) {
        if (!isCancelled(task.id)) {
          useDownloads.getState().update(task.id, { status: 'error', error: errorMessage(error) });
        }
      }
    }
  } finally {
    running = false;
  }
}

/** Gọi một lần khi app khởi động. */
export function startDownloader(): void {
  if (started) {
    return;
  }
  started = true;
  useDownloads.subscribe((state, previous) => {
    // Huỷ ảnh đang tải của chương vừa bị tạm dừng/xoá.
    for (const [id, jobs] of activeJobs) {
      if (state.tasks[id]?.status !== 'downloading' && previous.tasks[id]) {
        jobs.forEach(jobId => stopDownload(jobId));
      }
    }
    if (Object.values(state.tasks).some(t => t.status === 'queued')) {
      pump();
    }
  });
  pump();
}

export async function deleteTaskFiles(task: Pick<DownloadTask, 'mangaKey' | 'id'>): Promise<void> {
  const dir = chapterDir(task);
  if (await exists(dir)) {
    await unlink(dir);
  }
}

/** Xoá task khỏi danh sách, tuỳ chọn xoá luôn file đã tải. */
export async function removeDownloads(tasks: DownloadTask[], deleteFiles: boolean): Promise<void> {
  useDownloads.getState().remove(tasks.map(t => t.id));
  if (deleteFiles) {
    await Promise.all(tasks.map(t => deleteTaskFiles(t).catch(() => {})));
  }
}

/** Đọc chương đã tải; null nếu chưa tải xong. */
export async function loadOfflineChapter(
  mangaKey: string,
  chapterUrl: string,
): Promise<ChapterContent | null> {
  const task = useDownloads.getState().tasks[downloadId(mangaKey, chapterUrl)];
  if (!task || task.status !== 'done') {
    return null;
  }
  const dir = chapterDir(task);
  try {
    const stored = JSON.parse(await readFile(`${dir}/content.json`, 'utf8')) as StoredChapter;
    if (stored.kind === 'text') {
      return { kind: 'text', title: stored.title, paragraphs: stored.paragraphs };
    }
    return {
      kind: 'images',
      title: stored.title,
      pages: stored.files.map(file => ({ uri: `file://${dir}/${file}` })),
    };
  } catch {
    return null;
  }
}
