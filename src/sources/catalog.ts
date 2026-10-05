import { addonInfos, useAddonRevision } from '../addons/registry';
import type { AddonSiteInfo } from '../addons/types';
import { getHost, stripWww } from '../lib/url';
import type { SourceConfig } from './types';

/**
 * Danh mục "Supported sites": gộp `siteInfo` của mọi addon đang dùng (như
 * info.json của app gốc). siteInfo sinh bằng scripts/gen-catalog.py từ kết quả
 * test thật — chỉ gồm site chạy được, cộng site còn sống nhưng không kiểm
 * được từ máy test (Cloudflare, nhà mạng chặn) có kèm ghi chú.
 *
 * Site trong danh mục dùng được ngay; người dùng chỉ cần "ghim" (ô chọn) để
 * nó hiện ở trang chủ và Bookmark › Site truyện. Chỉnh cài đặt một site sẽ lưu
 * bản sao vào useSources, bản đó được ưu tiên hơn danh mục.
 */

export type CatalogNote = NonNullable<AddonSiteInfo['note']>;

export type CatalogSite = AddonSiteInfo & { id: string; engine: string };

export const CATALOG_NOTES: Record<CatalogNote, string> = {
  cloudflare: 'Có thể cần xác minh Cloudflare trong trình duyệt',
  blocked: 'Có thể bị nhà mạng chặn, thử dùng DNS/VPN',
};

type Index = {
  revision: number;
  sites: CatalogSite[];
  byId: Map<string, CatalogSite>;
  byHost: Map<string, CatalogSite>;
  /** Mỗi id luôn trả về cùng một object (an toàn khi dùng trong deps của hook). */
  configs: Map<string, SourceConfig>;
};

let index: Index | null = null;

function currentIndex(): Index {
  const { revision } = useAddonRevision.getState();
  if (index?.revision === revision) {
    return index;
  }
  const sites: CatalogSite[] = [];
  for (const info of addonInfos()) {
    for (const [id, site] of Object.entries(info.siteInfo ?? {})) {
      sites.push({ ...site, id, engine: info.uid });
    }
  }
  sites.sort((a, b) => a.title.localeCompare(b.title));
  const byId = new Map(sites.map(site => [site.id, site]));
  const byHost = new Map<string, CatalogSite>();
  for (const site of sites) {
    byHost.set(site.id, site);
    if (site.url) {
      byHost.set(getHost(site.url), site);
    }
  }
  index = { revision, sites, byId, byHost, configs: new Map() };
  return index;
}

function toConfig(site: CatalogSite): SourceConfig {
  const { configs } = currentIndex();
  let config = configs.get(site.id);
  if (!config) {
    config = {
      id: site.id,
      engine: site.engine,
      name: site.title,
      baseUrl: site.url ?? `https://${site.id}`,
      content: site.content ?? 'manga',
      lang: site.lang,
      nsfw: !!site.nsfw,
      // Site có sẵn của addon một-site được ghim từ đầu.
      enabled: !!site.builtin,
      builtin: site.builtin || undefined,
      addedAt: 0,
      options: site.mangaDir || site.chapterLang ? { mangaDir: site.mangaDir, chapterLang: site.chapterLang } : undefined,
    };
    configs.set(site.id, config);
  }
  return config;
}

export function catalogSite(id: string): CatalogSite | undefined {
  return currentIndex().byId.get(id);
}

export function catalogSource(id: string): SourceConfig | undefined {
  const site = currentIndex().byId.get(id);
  return site ? toConfig(site) : undefined;
}

/** Site trong danh mục ứng với URL (bỏ qua www và subdomain m./w.). */
export function catalogSourceForUrl(url: string): SourceConfig | undefined {
  const host = getHost(url);
  const { byHost } = currentIndex();
  const site = byHost.get(host) ?? byHost.get(stripWww(host.replace(/^[mw]\./, '')));
  return site ? toConfig(site) : undefined;
}

export function catalogSources(): SourceConfig[] {
  return currentIndex().sites.map(toConfig);
}

/** Nguồn có sẵn, ghim từ đầu (site của addon chỉ dành cho một site: MangaDex, Manga Fox…). */
export function builtinSources(): SourceConfig[] {
  return currentIndex()
    .sites.filter(site => site.builtin)
    .map(toConfig);
}
