import { useCallback, useEffect, useRef, useState } from 'react';

import { toast } from '../../components/ui';
import { errorMessage } from '../../lib/http';
import type { ListPage, MangaItem } from '../../sources/types';
import { useRequestToken } from './useRequestToken';

export type PagedStatus = 'idle' | 'loading' | 'ready' | 'error';

type PagedState = {
  items: MangaItem[];
  page: number;
  hasNext: boolean;
  status: PagedStatus;
  error?: unknown;
  refreshing: boolean;
  loadingMore: boolean;
  moreError?: unknown;
};

const INITIAL: PagedState = {
  items: [],
  page: 0,
  hasNext: false,
  status: 'idle',
  refreshing: false,
  loadingMore: false,
};

function uniqueByUrl(items: MangaItem[], seen = new Set<string>()): MangaItem[] {
  return items.filter(item => {
    if (seen.has(item.url)) {
      return false;
    }
    seen.add(item.url);
    return true;
  });
}

/**
 * Danh sách truyện phân trang vô hạn. Khi `key` đổi (nguồn, sắp xếp, thể
 * loại, từ khoá) thì tải lại từ trang 1 và bỏ mọi kết quả của key cũ;
 * `key` null nghĩa là chưa cần tải.
 */
export function usePagedList(key: string | null, fetchPage: (page: number) => Promise<ListPage>) {
  const [state, setState] = useState<PagedState>(INITIAL);
  const token = useRequestToken();
  const fetchRef = useRef(fetchPage);
  const stateRef = useRef(state);
  const busy = useRef(false);

  // Khai báo trước effect tải để luôn dùng hàm fetch mới nhất.
  useEffect(() => {
    fetchRef.current = fetchPage;
    stateRef.current = state;
  });

  const load = useCallback(
    (mode: 'reset' | 'refresh') => {
      const t = token.next();
      busy.current = false;
      // Làm mới khi đã có dữ liệu thì giữ danh sách cũ, lỗi chỉ báo toast.
      const keepItems = mode === 'refresh' && stateRef.current.status === 'ready';
      setState(prev =>
        keepItems ? { ...prev, refreshing: true, moreError: undefined } : { ...INITIAL, status: 'loading' },
      );
      fetchRef.current(1).then(
        res => {
          if (!token.isCurrent(t)) {
            return;
          }
          const items = uniqueByUrl(res.items);
          setState({ ...INITIAL, status: 'ready', items, page: 1, hasNext: res.hasNext && items.length > 0 });
        },
        error => {
          if (!token.isCurrent(t)) {
            return;
          }
          if (keepItems) {
            setState(prev => ({ ...prev, refreshing: false }));
            toast(errorMessage(error));
          } else {
            setState({ ...INITIAL, status: 'error', error });
          }
        },
      );
    },
    [token],
  );

  useEffect(() => {
    if (key === null) {
      token.invalidate();
      busy.current = false;
      setState(INITIAL);
      return;
    }
    load('reset');
  }, [key, load, token]);

  const fetchMore = useCallback(
    (force: boolean) => {
      const s = stateRef.current;
      if (busy.current || s.status !== 'ready' || !s.hasNext || s.refreshing || (s.moreError && !force)) {
        return;
      }
      busy.current = true;
      const t = token.current();
      const page = s.page + 1;
      setState(prev => ({ ...prev, loadingMore: true, moreError: undefined }));
      fetchRef.current(page).then(
        res => {
          if (!token.isCurrent(t)) {
            return;
          }
          busy.current = false;
          setState(prev => {
            const fresh = uniqueByUrl(res.items, new Set(prev.items.map(i => i.url)));
            return {
              ...prev,
              items: fresh.length ? [...prev.items, ...fresh] : prev.items,
              page,
              // Trang sau toàn truyện trùng = site lặp trang cuối, dừng để khỏi gọi mãi.
              hasNext: res.hasNext && fresh.length > 0,
              loadingMore: false,
            };
          });
        },
        error => {
          if (!token.isCurrent(t)) {
            return;
          }
          busy.current = false;
          setState(prev => ({ ...prev, loadingMore: false, moreError: error }));
        },
      );
    },
    [token],
  );

  const reload = useCallback(() => load('reset'), [load]);
  const refresh = useCallback(() => load('refresh'), [load]);
  const loadMore = useCallback(() => fetchMore(false), [fetchMore]);
  const retryMore = useCallback(() => fetchMore(true), [fetchMore]);

  return { ...state, reload, refresh, loadMore, retryMore };
}
