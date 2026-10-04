import { getEngine } from '../../sources';
import type { Genre, SourceConfig } from '../../sources/types';

/**
 * Danh sách thể loại theo nguồn, giữ trong bộ nhớ suốt phiên app: thể loại
 * hầu như không đổi nên chỉ tải một lần cho mỗi nguồn.
 */

const cache = new Map<string, Genre[]>();
const inflight = new Map<string, Promise<Genre[]>>();

function cacheKey(src: SourceConfig): string {
  return `${src.id}|${src.engine}|${src.options?.mangaDir ?? ''}`;
}

export function getCachedGenres(src: SourceConfig): Genre[] | undefined {
  return cache.get(cacheKey(src));
}

export function loadGenres(src: SourceConfig): Promise<Genre[]> {
  const key = cacheKey(src);
  const hit = cache.get(key);
  if (hit) {
    return Promise.resolve(hit);
  }
  const running = inflight.get(key);
  if (running) {
    return running;
  }
  const task = getEngine(src.engine)
    .genres(src)
    .then(genres => {
      cache.set(key, genres);
      return genres;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, task);
  return task;
}
