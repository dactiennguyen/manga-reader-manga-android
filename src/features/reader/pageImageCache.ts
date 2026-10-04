import { useEffect } from 'react';
import { Image } from 'react-native';

import type { Page } from '../../sources/types';

/**
 * Bộ nhớ phụ cho ảnh trang (mangaPagePreloader): tỉ lệ cao/rộng đã biết để
 * khung ảnh ở chế độ dọc không nhảy khi cuộn lại, tải trước trang kế, và tín
 * hiệu "tải lại ảnh" từ menu nhấn giữ.
 */

const MAX_RATIOS = 3000;
const MAX_PREFETCHED = 500;

const ratios = new Map<string, number>();
const prefetched = new Set<string>();
const measuring = new Set<string>();
type ReloadListener = (failedOnly: boolean) => void;
const reloadListeners = new Map<string, Set<ReloadListener>>();

export function getPageRatio(uri: string): number | undefined {
  return ratios.get(uri);
}

export function rememberPageRatio(uri: string, ratio: number): void {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return;
  }
  ratios.delete(uri);
  ratios.set(uri, ratio);
  if (ratios.size > MAX_RATIOS) {
    const oldest = ratios.keys().next().value;
    if (oldest !== undefined) {
      ratios.delete(oldest);
    }
  }
}

function hasHeaders(page: Page): boolean {
  return !!page.headers && Object.keys(page.headers).length > 0;
}

/**
 * Tải trước `count` trang từ `from`. Image.prefetch không gửi được header nên
 * bỏ qua ảnh cần Referer; riêng chế độ dọc thì đo kích thước kèm header — vừa
 * biết trước chiều cao khung, vừa nạp sẵn ảnh vào cache.
 */
export function preloadPages(pages: readonly Page[], from: number, count: number, measure: boolean): void {
  const end = Math.min(pages.length, from + count);
  for (let i = Math.max(0, from); i < end; i++) {
    const page = pages[i];
    if (page.uri.startsWith('file://')) {
      continue;
    }
    if (!hasHeaders(page)) {
      if (prefetched.has(page.uri)) {
        continue;
      }
      prefetched.add(page.uri);
      if (prefetched.size > MAX_PREFETCHED) {
        prefetched.clear();
      }
      Image.prefetch(page.uri).catch(() => prefetched.delete(page.uri));
    } else if (measure && page.headers && !ratios.has(page.uri) && !measuring.has(page.uri)) {
      const { uri } = page;
      measuring.add(uri);
      Image.getSizeWithHeaders(uri, page.headers)
        .then(size => rememberPageRatio(uri, size.height / size.width))
        .catch(() => {})
        .finally(() => measuring.delete(uri));
    }
  }
}

/** "Tải lại ảnh" từ menu nhấn giữ: tải lại kể cả khi ảnh đang hiển thị bình thường. */
export function requestPageReload(uri: string): void {
  reloadListeners.get(uri)?.forEach(listener => listener(false));
}

/** Sau khi xác minh chống bot: thử lại mọi ảnh đang lỗi trên màn. */
export function retryFailedPages(): void {
  reloadListeners.forEach(listeners => listeners.forEach(listener => listener(true)));
}

export function usePageReload(uri: string, onReload: ReloadListener): void {
  useEffect(() => {
    const listeners = reloadListeners.get(uri) ?? new Set<ReloadListener>();
    reloadListeners.set(uri, listeners);
    listeners.add(onReload);
    return () => {
      listeners.delete(onReload);
      if (!listeners.size) {
        reloadListeners.delete(uri);
      }
    };
  }, [uri, onReload]);
}
