import { CachesDirectoryPath, readFile, unlink, writeFile } from '@dr.pogodin/react-native-fs';
import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
  saveDocuments,
  types,
  type DocumentPickerResponse,
} from '@react-native-documents/picker';

import { dayKey } from '../../lib/time';
import { hasEngine } from '../../sources';
import type { SourceConfig } from '../../sources/types';
import { clearAllProgress, exportProgress, getProgress, importProgress, type MangaProgress } from '../../store/progress';
import { useBrowser, type QuickAccessItem, type WebBookmark } from '../../store/useBrowser';
import { useHistory, type ReadingEntry, type WebEntry } from '../../store/useHistory';
import { useLibrary, type Bookmark } from '../../store/useLibrary';
import { DEFAULT_READER_SETTINGS, useReaderSettings, type ReaderSettings } from '../../store/useReaderSettings';
import {
  DEFAULT_HOME_WIDGETS,
  DEFAULT_NOVEL_SETTINGS,
  DEFAULT_SETTINGS,
  useSettings,
  type AppSettings,
  type HomeWidget,
} from '../../store/useSettings';
import { useSources } from '../../store/useSources';
import { useStats, type DailyStats, type StatsData } from '../../store/useStats';
import { refreshUnread } from '../library/updates';

/**
 * Sao lưu & khôi phục (BackupRestoreDialog). App gốc xuất ZIP; ở đây một file
 * JSON là đủ vì dữ liệu chỉ gồm cấu hình và danh sách, không có ảnh.
 */

export const BACKUP_APP = 'manga-reader';
export const BACKUP_VERSION = 1;

export type BackupData = {
  app: string;
  version: number;
  createdAt: number;
  settings?: Partial<AppSettings>;
  readerSettings?: Partial<ReaderSettings>;
  sources?: SourceConfig[];
  library?: { bookmarks: Record<string, Bookmark>; groups: string[] };
  progress?: Record<string, MangaProgress>;
  history?: { reading: ReadingEntry[]; web: WebEntry[]; searches: string[]; webSearches: string[] };
  browser?: { quickAccess: QuickAccessItem[]; webBookmarks: WebBookmark[] };
  stats?: StatsData;
};

export type BackupSummary = {
  createdAt: number;
  bookmarks: number;
  groups: number;
  progress: number;
  reading: number;
  web: number;
  searches: number;
  sources: number;
  quickAccess: number;
  webBookmarks: number;
  hasSettings: boolean;
  hasStats: boolean;
};

export type RestoreOptions = {
  /** Xoá bookmark, lịch sử, tiến độ, nguồn tự thêm… trước khi nhập. */
  clearExisting: boolean;
  overwriteSettings: boolean;
  overwriteStats: boolean;
};

const MAX_READING = 500;
const MAX_WEB = 1500;
const MAX_SEARCHES = 20;

// ─── Tạo bản sao lưu ────────────────────────────────────────────────────────

/** Chỉ lấy các khoá dữ liệu (bỏ hàm action của store). */
function pickKeys<T extends object>(state: object, template: T): Partial<T> {
  const out: Record<string, unknown> = {};
  const source = state as Record<string, unknown>;
  for (const key of Object.keys(template)) {
    if (source[key] !== undefined) {
      out[key] = source[key];
    }
  }
  return out as Partial<T>;
}

/** Như pickKeys nhưng chỉ nhận giá trị cùng kiểu với mặc định (file có thể bị sửa tay). */
function pickTyped<T extends object>(raw: Json, template: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, fallback] of Object.entries(template)) {
    const value = raw[key];
    if (value === undefined) {
      continue;
    }
    const sameKind = Array.isArray(fallback)
      ? Array.isArray(value)
      : typeof value === typeof fallback && !Array.isArray(value);
    if (sameKind) {
      out[key] = value;
    }
  }
  return out as Partial<T>;
}

export function createBackup(): BackupData {
  const library = useLibrary.getState();
  const history = useHistory.getState();
  const browser = useBrowser.getState();
  const stats = useStats.getState();
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    createdAt: Date.now(),
    settings: pickKeys(useSettings.getState(), DEFAULT_SETTINGS),
    readerSettings: pickKeys(useReaderSettings.getState(), DEFAULT_READER_SETTINGS),
    sources: useSources.getState().sources.filter(s => !s.builtin),
    library: { bookmarks: library.bookmarks, groups: library.groups },
    progress: exportProgress(),
    history: {
      reading: history.reading,
      web: history.web,
      searches: history.searches,
      webSearches: history.webSearches,
    },
    browser: { quickAccess: browser.quickAccess, webBookmarks: browser.webBookmarks },
    stats: {
      daily: stats.daily,
      totalSeconds: stats.totalSeconds,
      totalChapters: stats.totalChapters,
      totalSessions: stats.totalSessions,
      longestSession: stats.longestSession,
    },
  };
}

export function backupFileName(time = Date.now()): string {
  return `backup_${dayKey(time).replace(/-/g, '')}.json`;
}

/**
 * Ghi file sao lưu vào cache rồi mở hộp thoại "Lưu thành" để người dùng chọn
 * nơi lưu. Trả về false nếu người dùng huỷ.
 */
export async function exportBackupFile(): Promise<boolean> {
  const fileName = backupFileName();
  const path = `${CachesDirectoryPath}/${fileName}`;
  await writeFile(path, JSON.stringify(createBackup()), 'utf8');
  try {
    const [result] = await saveDocuments({
      sourceUris: [`file://${path}`],
      mimeType: 'application/json',
      fileName,
      copy: true,
    });
    if (result.error) {
      throw new Error(result.error);
    }
    return true;
  } catch (error) {
    if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
      return false;
    }
    throw error;
  } finally {
    unlink(path).catch(() => {});
  }
}

// ─── Đọc & kiểm tra ─────────────────────────────────────────────────────────

/** Mở trình chọn file và đọc bản sao lưu; null nếu người dùng huỷ. */
export async function pickBackupFile(): Promise<{ data: BackupData; fileName: string } | null> {
  let picked: DocumentPickerResponse;
  try {
    [picked] = await pick({ type: [types.json, types.allFiles] });
  } catch (error) {
    if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
      return null;
    }
    throw error;
  }
  const fileName = picked.name ?? 'backup.json';
  const [copy] = await keepLocalCopy({
    files: [{ uri: picked.uri, fileName }],
    destination: 'cachesDirectory',
  });
  if (copy.status === 'error') {
    throw new Error(`Không đọc được file: ${copy.copyError}`);
  }
  try {
    const text = await readFile(copy.localUri, 'utf8');
    return { data: parseBackup(text), fileName };
  } finally {
    unlink(decodeURI(copy.localUri.replace(/^file:\/\//, ''))).catch(() => {});
  }
}

type Json = Record<string, unknown>;

const isRecord = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isContent = (value: unknown) => value === 'manga' || value === 'novel';

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(isString) : [];
}

function validBookmark(value: unknown): value is Bookmark {
  return (
    isRecord(value) &&
    isString(value.key) &&
    isString(value.sourceId) &&
    isString(value.url) &&
    isString(value.title) &&
    isContent(value.content)
  );
}

function validSource(value: unknown): value is SourceConfig {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.name) &&
    isString(value.baseUrl) &&
    isString(value.engine) &&
    hasEngine(value.engine) &&
    isContent(value.content)
  );
}

function validReading(value: unknown): value is ReadingEntry {
  return (
    isRecord(value) &&
    isString(value.key) &&
    isString(value.sourceId) &&
    isString(value.mangaUrl) &&
    isString(value.chapterUrl) &&
    isNumber(value.at)
  );
}

function validWeb(value: unknown): value is WebEntry {
  return isRecord(value) && isString(value.url) && isNumber(value.at);
}

function validLink(value: unknown): value is { id: string; title: string; url: string } {
  return isRecord(value) && isString(value.id) && isString(value.title) && isString(value.url);
}

function validProgress(value: unknown): value is MangaProgress {
  return isRecord(value) && isRecord(value.read);
}

function validDaily(value: unknown): value is DailyStats {
  return isRecord(value) && isNumber(value.seconds) && isNumber(value.chapters) && isNumber(value.sessions);
}

/** Kiểm tra và làm sạch nội dung file; ném lỗi tiếng Việt rõ ràng nếu sai. */
export function parseBackup(text: string): BackupData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('File không phải JSON hợp lệ.');
  }
  if (!isRecord(raw) || raw.app !== BACKUP_APP) {
    throw new Error('File này không phải bản sao lưu của Manga Reader.');
  }
  if (!isNumber(raw.version) || raw.version < 1) {
    throw new Error('Bản sao lưu thiếu thông tin phiên bản.');
  }
  if (raw.version > BACKUP_VERSION) {
    throw new Error('Bản sao lưu được tạo từ phiên bản app mới hơn. Hãy cập nhật app rồi thử lại.');
  }

  const data: BackupData = {
    app: BACKUP_APP,
    version: raw.version,
    createdAt: isNumber(raw.createdAt) ? raw.createdAt : 0,
  };

  if (isRecord(raw.settings)) {
    data.settings = pickTyped(raw.settings, DEFAULT_SETTINGS);
  }
  if (isRecord(raw.readerSettings)) {
    data.readerSettings = pickTyped(raw.readerSettings, DEFAULT_READER_SETTINGS);
  }
  if (Array.isArray(raw.sources)) {
    data.sources = raw.sources.filter(validSource).map(s => ({ ...s, builtin: false }));
  }
  if (isRecord(raw.library)) {
    const bookmarks: Record<string, Bookmark> = {};
    if (isRecord(raw.library.bookmarks)) {
      for (const value of Object.values(raw.library.bookmarks)) {
        if (validBookmark(value)) {
          bookmarks[value.key] = {
            ...value,
            group: isString(value.group) ? value.group : '',
            addedAt: isNumber(value.addedAt) ? value.addedAt : Date.now(),
          };
        }
      }
    }
    data.library = { bookmarks, groups: stringList(raw.library.groups) };
  }
  if (isRecord(raw.progress)) {
    const progress: Record<string, MangaProgress> = {};
    for (const [key, value] of Object.entries(raw.progress)) {
      if (validProgress(value)) {
        progress[key] = value;
      }
    }
    data.progress = progress;
  }
  if (isRecord(raw.history)) {
    data.history = {
      reading: Array.isArray(raw.history.reading) ? raw.history.reading.filter(validReading) : [],
      web: Array.isArray(raw.history.web) ? raw.history.web.filter(validWeb) : [],
      searches: stringList(raw.history.searches),
      webSearches: stringList(raw.history.webSearches),
    };
  }
  if (isRecord(raw.browser)) {
    data.browser = {
      quickAccess: Array.isArray(raw.browser.quickAccess) ? raw.browser.quickAccess.filter(validLink) : [],
      webBookmarks: Array.isArray(raw.browser.webBookmarks)
        ? raw.browser.webBookmarks.filter(validLink).map(b => ({
            ...b,
            addedAt: isNumber((b as Json).addedAt) ? ((b as Json).addedAt as number) : Date.now(),
          }))
        : [],
    };
  }
  if (isRecord(raw.stats)) {
    const daily: Record<string, DailyStats> = {};
    if (isRecord(raw.stats.daily)) {
      for (const [key, value] of Object.entries(raw.stats.daily)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(key) && validDaily(value)) {
          daily[key] = value;
        }
      }
    }
    const num = (value: unknown) => (isNumber(value) ? value : 0);
    data.stats = {
      daily,
      totalSeconds: num(raw.stats.totalSeconds),
      totalChapters: num(raw.stats.totalChapters),
      totalSessions: num(raw.stats.totalSessions),
      longestSession: num(raw.stats.longestSession),
    };
  }
  return data;
}

export function summarizeBackup(data: BackupData): BackupSummary {
  return {
    createdAt: data.createdAt,
    bookmarks: Object.keys(data.library?.bookmarks ?? {}).length,
    groups: data.library?.groups.length ?? 0,
    progress: Object.keys(data.progress ?? {}).length,
    reading: data.history?.reading.length ?? 0,
    web: data.history?.web.length ?? 0,
    searches: (data.history?.searches.length ?? 0) + (data.history?.webSearches.length ?? 0),
    sources: data.sources?.length ?? 0,
    quickAccess: data.browser?.quickAccess.length ?? 0,
    webBookmarks: data.browser?.webBookmarks.length ?? 0,
    hasSettings: !!data.settings && Object.keys(data.settings).length > 0,
    hasStats: !!data.stats && (data.stats.totalSessions > 0 || Object.keys(data.stats.daily).length > 0),
  };
}

// ─── Áp dụng ────────────────────────────────────────────────────────────────

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const k = key(item);
    if (seen.has(k)) {
      return false;
    }
    seen.add(k);
    return true;
  });
}

/** Gộp tiến độ: hợp các chương đã đọc, giữ vị trí đọc mới hơn. */
function mergeProgress(current: MangaProgress, incoming: MangaProgress): MangaProgress {
  const last =
    current.last && incoming.last
      ? current.last.at >= incoming.last.at
        ? current.last
        : incoming.last
      : current.last ?? incoming.last;
  return { read: { ...incoming.read, ...current.read }, last };
}

/**
 * Gộp thống kê lấy giá trị lớn hơn theo từng ngày thay vì cộng dồn, để khôi
 * phục cùng một bản sao lưu nhiều lần không làm số liệu bị nhân đôi.
 */
function mergeStats(current: StatsData, incoming: StatsData): StatsData {
  const daily: Record<string, DailyStats> = { ...incoming.daily };
  for (const [key, day] of Object.entries(current.daily)) {
    const other = daily[key];
    daily[key] = other
      ? {
          seconds: Math.max(day.seconds, other.seconds),
          chapters: Math.max(day.chapters, other.chapters),
          sessions: Math.max(day.sessions, other.sessions),
        }
      : day;
  }
  return {
    daily,
    totalSeconds: Math.max(current.totalSeconds, incoming.totalSeconds),
    totalChapters: Math.max(current.totalChapters, incoming.totalChapters),
    totalSessions: Math.max(current.totalSessions, incoming.totalSessions),
    longestSession: Math.max(current.longestSession, incoming.longestSession),
  };
}

export function applyBackup(data: BackupData, options: RestoreOptions): void {
  const { clearExisting } = options;

  if (data.settings && options.overwriteSettings) {
    const saved = data.settings;
    // Widget lạ bị bỏ, widget mới (bản sao lưu cũ chưa có) thêm vào cuối.
    const widgets = (saved.homeWidgets ?? DEFAULT_HOME_WIDGETS).filter(
      (w: HomeWidget) => isRecord(w) && DEFAULT_HOME_WIDGETS.some(d => d.id === w.id),
    );
    const missing = DEFAULT_HOME_WIDGETS.filter(d => !widgets.some(w => w.id === d.id));
    useSettings.getState().set({
      ...DEFAULT_SETTINGS,
      ...saved,
      homeWidgets: [...widgets, ...missing],
      novel: { ...DEFAULT_NOVEL_SETTINGS, ...(isRecord(saved.novel) ? saved.novel : {}) },
    });
  }
  if (data.readerSettings && options.overwriteSettings) {
    useReaderSettings.setState({ ...DEFAULT_READER_SETTINGS, ...data.readerSettings });
  }

  if (data.sources) {
    const incoming = data.sources;
    useSources.setState(state => {
      const kept = clearExisting ? state.sources.filter(s => s.builtin) : state.sources;
      const ids = new Set(kept.map(s => s.id));
      return { sources: [...kept, ...incoming.filter(s => !ids.has(s.id))] };
    });
  }

  if (data.library) {
    const { bookmarks, groups } = data.library;
    useLibrary.setState(state =>
      clearExisting
        ? { bookmarks, groups: uniqueBy(groups, g => g) }
        : {
            // Gộp: bookmark đang có trên máy được ưu tiên giữ nguyên.
            bookmarks: { ...bookmarks, ...state.bookmarks },
            groups: uniqueBy([...state.groups, ...groups], g => g),
          },
    );
  }

  if (clearExisting && data.progress) {
    clearAllProgress();
  }
  if (data.progress) {
    const merged: Record<string, MangaProgress> = {};
    for (const [key, incoming] of Object.entries(data.progress)) {
      merged[key] = clearExisting ? incoming : mergeProgress(getProgress(key), incoming);
    }
    importProgress(merged);
  }

  if (data.history) {
    const incoming = data.history;
    useHistory.setState(state => {
      if (clearExisting) {
        return {
          reading: incoming.reading.slice(0, MAX_READING),
          web: incoming.web.slice(0, MAX_WEB),
          searches: incoming.searches.slice(0, MAX_SEARCHES),
          webSearches: incoming.webSearches.slice(0, MAX_SEARCHES),
        };
      }
      const reading = uniqueBy(
        [...state.reading, ...incoming.reading].sort((a, b) => b.at - a.at),
        e => e.key,
      ).slice(0, MAX_READING);
      const web = uniqueBy(
        [...state.web, ...incoming.web].sort((a, b) => b.at - a.at),
        e => `${e.at}|${e.url}`,
      ).slice(0, MAX_WEB);
      const searches = uniqueBy([...state.searches, ...incoming.searches], q => q.toLowerCase()).slice(
        0,
        MAX_SEARCHES,
      );
      const webSearches = uniqueBy([...state.webSearches, ...incoming.webSearches], q =>
        q.toLowerCase(),
      ).slice(0, MAX_SEARCHES);
      return { reading, web, searches, webSearches };
    });
  }

  if (data.browser) {
    const incoming = data.browser;
    useBrowser.setState(state => ({
      quickAccess: clearExisting
        ? incoming.quickAccess
        : uniqueBy([...state.quickAccess, ...incoming.quickAccess], q => q.url),
      webBookmarks: clearExisting
        ? incoming.webBookmarks
        : uniqueBy([...state.webBookmarks, ...incoming.webBookmarks], b => b.url),
    }));
  }

  if (data.stats) {
    const current = useStats.getState();
    const next = options.overwriteStats ? data.stats : mergeStats(current, data.stats);
    current.importStats(next);
  }

  // Số chương chưa đọc phụ thuộc tiến độ vừa nhập.
  for (const key of Object.keys(useLibrary.getState().bookmarks)) {
    refreshUnread(key);
  }
}
