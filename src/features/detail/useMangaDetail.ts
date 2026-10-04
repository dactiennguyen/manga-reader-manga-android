import { useCallback, useEffect, useRef, useState } from 'react';

import { toast } from '../../components/ui';
import { errorMessage, isChallengeError } from '../../lib/http';
import { fetchDetail, getCachedDetail } from '../../sources/cache';
import type { MangaDetail } from '../../sources/types';
import { getSource } from '../../store/useSources';
import { useRequestToken } from '../catalog/useRequestToken';
import { syncBookmarkWithDetail } from '../library/updates';

/**
 * Chi tiết truyện: hiện ngay bản cache (nếu có) rồi tải bản mới. Lỗi khi đã
 * có dữ liệu thì chỉ báo toast; chưa có gì thì trả lỗi để hiện màn lỗi.
 */
export function useMangaDetail(sourceId: string, url: string, key: string, enabled: boolean) {
  const [detail, setDetail] = useState<MangaDetail | undefined>(() => getCachedDetail(key));
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const token = useRequestToken();
  const hasDetail = useRef(!!detail);

  useEffect(() => {
    hasDetail.current = !!detail;
  }, [detail]);

  const load = useCallback(
    (mode: 'initial' | 'refresh') => {
      const source = getSource(sourceId);
      if (!source) {
        return;
      }
      const t = token.next();
      setError(undefined);
      if (mode === 'refresh') {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      fetchDetail(source, url).then(
        result => {
          if (!token.isCurrent(t)) {
            return;
          }
          setDetail(result);
          setLoading(false);
          setRefreshing(false);
          // Đang xem trang chi tiết nên xoá luôn badge chương mới của bookmark.
          syncBookmarkWithDetail(key, result, { seen: true });
        },
        e => {
          if (!token.isCurrent(t)) {
            return;
          }
          setLoading(false);
          setRefreshing(false);
          if (hasDetail.current) {
            toast(
              isChallengeError(e)
                ? 'Không làm mới được: site cần xác minh trên trình duyệt.'
                : `Không làm mới được: ${errorMessage(e)}`,
            );
          } else {
            setError(e);
          }
        },
      );
    },
    [sourceId, url, key, token],
  );

  useEffect(() => {
    if (enabled) {
      load('initial');
    }
  }, [enabled, load]);

  const refresh = useCallback(() => load('refresh'), [load]);
  const retry = useCallback(() => load('initial'), [load]);

  return { detail, error, loading, refreshing, refresh, retry };
}
