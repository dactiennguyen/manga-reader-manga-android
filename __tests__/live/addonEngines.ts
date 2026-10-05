import type { ContentType } from '../../src/sources/types';

/** Addon của app gốc → engine tương ứng bên mình. */
export const ADDON_ENGINES: Record<string, { engine: string; content: ContentType; mangaDir?: string }> = {
  madara: { engine: 'madara', content: 'manga' },
  madara_novel: { engine: 'madara', content: 'novel', mangaDir: 'novel' },
  themesia: { engine: 'themesia', content: 'manga' },
  mangadex: { engine: 'mangadex', content: 'manga' },
  fanfox: { engine: 'fanfox', content: 'manga' },
  mangakatana: { engine: 'mangakatana', content: 'manga' },
  madtheme: { engine: 'madtheme', content: 'manga' },
  mangabox: { engine: 'mangabox', content: 'manga' },
  html_novel: { engine: 'novelfull', content: 'novel' },
  html_manga: { engine: '', content: 'manga' },
};

/** html_manga là addon gom nhiều site khác nhau — mỗi site một engine riêng. */
const HTML_MANGA: Record<string, string> = {
  'mangatown.com': 'mangatown',
  'weebcentral.com': 'weebcentral',
};

export function engineForAddon(addon: string, host: string): string | undefined {
  if (addon === 'html_manga') {
    const key = Object.keys(HTML_MANGA).find(k => host.endsWith(k));
    return key ? HTML_MANGA[key] : undefined;
  }
  return ADDON_ENGINES[addon]?.engine;
}
