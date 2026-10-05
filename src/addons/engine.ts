import type { Engine, SourceConfig } from '../sources/types';
import type { AddonInfo, AddonModule, ListParams, Widget, WidgetOf } from './types';

/**
 * Bọc một addon (getURL / fetch / run / get / match) thành `Engine` — giao
 * diện các màn của app dùng. Màn hình không biết addon chạy từ bản có sẵn hay
 * bản tải về.
 */
export function addonEngine(info: AddonInfo, addon: AddonModule): Engine {
  const expect = <K extends Widget['widget']>(result: Widget, kind: K): WidgetOf<K> => {
    if (!result || result.widget !== kind) {
      throw new Error(`Addon ${info.label} trả về "${result?.widget}", cần "${kind}".`);
    }
    return result as WidgetOf<K>;
  };

  const list = async (site: SourceConfig, params: ListParams) => {
    const url = await addon.getURL({ site, params });
    const result = expect(await addon.fetch({ site, url, method: 'list', params }), 'cataloglist');
    return { items: result.list, hasNext: result.hasNext };
  };

  return {
    id: info.uid,
    label: info.label,
    description: info.desc,
    version: info.version,
    contents: info.content,
    sorts: info.sorts,
    allowCustomSites: info.allowCustomSites,
    itemLinkSelector: info.itemLinkSelector,

    list: (site, sort, page) => list(site, { method: 'list', sort, page }),
    search: (site, query, page) => list(site, { method: 'search', query, page }),
    byGenre: (site, genre, sort, page) => list(site, { method: 'genre', genre, sort, page }),
    listUrl: (site, params) => addon.getURL({ site, params }),
    genres: async site => expect(await addon.get({ site, method: 'genre' }), 'genre').genres,
    detail: async (site, url) => expect(await addon.fetch({ site, url, method: 'detail' }), 'catalogdetail').detail,
    chapter: async (site, url) => expect(await addon.fetch({ site, url, method: 'chapter' }), 'catalogchapter').chapter,
    classifyUrl: (site, url, html) => addon.match({ site, url, html }),
    resolveMangaUrl: async (site, chapterUrl, html) =>
      expect(await addon.get({ site, method: 'manga', url: chapterUrl, html }), 'manga').url,
    detect: addon.detect ? html => !!addon.detect?.(html) : undefined,
    imageHeaders: site => addon.imageHeaders?.(site) ?? { Referer: `${site.baseUrl}/` },
  };
}
