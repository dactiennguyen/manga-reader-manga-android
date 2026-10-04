import type { AppNavigation } from '../../app/routes';
import { toast } from '../../components/ui';
import { errorMessage, handOffHtml } from '../../lib/http';
import { getOrigin } from '../../lib/url';
import { detectEngine, getEngine, type UrlKind } from '../../sources';
import { findSourceForUrl } from '../../store/useSources';

export const UNSUPPORTED_MESSAGE = 'Trang này không được addon hỗ trợ';

/**
 * "Chạy addon" trên trang đang xem: chuyển HTML lấy từ WebView cho engine
 * (khỏi tải lại — vượt được Cloudflare) rồi mở màn native tương ứng.
 *
 * `auto`: chạy tự động sau khi tải trang — chỉ mở trang truyện/chương, không
 * báo lỗi và không gợi ý thêm site.
 */
export async function runAddonOnPage(
  navigation: AppNavigation,
  url: string,
  html: string,
  auto = false,
): Promise<void> {
  const source = findSourceForUrl(url);
  if (!source) {
    if (auto) {
      return;
    }
    const engine = detectEngine(html);
    if (engine) {
      navigation.navigate('AddSite', { url: getOrigin(url), engine });
    } else {
      toast(UNSUPPORTED_MESSAGE);
    }
    return;
  }

  const engine = getEngine(source.engine);
  let kind: UrlKind | null = null;
  try {
    kind = engine.classifyUrl(source, url, html);
  } catch {
    kind = null;
  }
  if (auto && kind !== 'detail' && kind !== 'chapter') {
    return;
  }
  if (kind) {
    handOffHtml(url, html);
  }

  switch (kind) {
    case 'detail':
      navigation.navigate('MangaDetail', { sourceId: source.id, url });
      return;
    case 'list':
      navigation.navigate('Catalog', { sourceId: source.id });
      return;
    case 'chapter': {
      let mangaUrl: string | undefined;
      try {
        mangaUrl = await engine.resolveMangaUrl(source, url, html);
      } catch (error) {
        if (!auto) {
          toast(`Không đọc được chương: ${errorMessage(error)}`);
        }
        return;
      }
      if (!mangaUrl) {
        if (!auto) {
          toast('Không xác định được truyện của chương này');
        }
        return;
      }
      const params = { sourceId: source.id, mangaUrl, chapterUrl: url };
      if (source.content === 'novel') {
        navigation.navigate('NovelReader', params);
      } else {
        navigation.navigate('Reader', params);
      }
      return;
    }
    default:
      if (!auto) {
        toast(UNSUPPORTED_MESSAGE);
      }
  }
}
