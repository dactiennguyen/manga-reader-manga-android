import type { Cheerio, CheerioAPI } from 'cheerio/slim';
import type { AnyNode } from 'domhandler';

import { decodeBase64 } from '../../lib/base64';
import { getText } from '../../lib/http';
import { getQueryParam, pathSegments, resolveUrl, withQuery } from '../../lib/url';
import {
  cleanText,
  imageSrc,
  parseChapterNumber,
  parseDate,
  parseHtml,
  textOf,
  uniqBy,
} from '../html';
import type { Engine, Genre, ListPage, ListSort, MangaDetail, MangaItem, SourceConfig } from '../types';

/**
 * Theme "MangaThemesia" (themesia/mangareader WordPress theme). Ảnh chương
 * thường không nằm trong HTML mà trong lời gọi ts_reader.run({...}).
 */

const ORDER: Record<ListSort, string> = {
  latest: 'update',
  popular: 'popular',
  new: 'latest',
  rating: 'rating',
  az: 'title',
};

const dirOf = (src: SourceConfig) => src.options?.mangaDir || 'manga';

const NSFW_GENRES = /adult|mature|smut|hentai|ecchi|18\+|erotic/i;

/** Giá trị trống site hay điền vào ô tác giả. */
const PLACEHOLDER = /^(-+|n\/?a|none|unknown|updating|đang cập nhật)$/i;

function parseListing($: CheerioAPI, base: string, scope?: string): ListPage {
  const root = scope ? $(scope) : $.root();
  const items: MangaItem[] = [];
  root.find('.listupd .bs .bsx, .listupd .utao .uta, .listupd .bsx, .listo .bs .bsx').each((_, el) => {
    const $el = $(el);
    const $a = $el.find('a').first();
    const href = $a.attr('href');
    if (!href) {
      return;
    }
    const title =
      textOf($el.find('.tt, h4, h3')) || cleanText($a.attr('title')) || textOf($el.find('a[title]'));
    if (!title) {
      return;
    }
    items.push({
      url: resolveUrl(href, base),
      title,
      cover: imageSrc($el.find('img'), base),
      subtitle: textOf($el.find('.epxs, .luf ul li a, .adds .epxs')) || undefined,
    });
  });
  const hasNext =
    $('.hpage a.r, .pagination a.next, a.next.page-numbers, .hpage .r').length > 0 ||
    (!$('.hpage, .pagination').length && items.length >= 20);
  return { items: uniqBy(items, i => i.url), hasNext };
}

function readerImages(html: string): string[] {
  const scripts = [html];
  // Một số site nhúng script dạng data:text/javascript;base64,...
  for (const match of html.matchAll(/src="data:text\/javascript;base64,([^"]+)"/g)) {
    scripts.push(decodeBase64(match[1]));
  }
  for (const script of scripts) {
    const call = script.match(/ts_reader\.run\((\{[\s\S]*?\})\);/);
    if (!call) {
      continue;
    }
    try {
      const data = JSON.parse(call[1]) as { sources?: { images?: string[] }[] };
      const source = data.sources?.find(s => s.images?.length);
      if (source?.images) {
        return source.images;
      }
    } catch {
      // Thử script khác.
    }
  }
  return [];
}

function statusOf($: CheerioAPI): string | undefined {
  const fromImptdt = $('.imptdt, .tsinfo .imptdt')
    .toArray()
    .find(el => /status|estado|statut|durum|trạng thái/i.test($(el).text()));
  if (fromImptdt) {
    return textOf($(fromImptdt).find('i, a')) || undefined;
  }
  const row = $('.infotable tr, .seriestucontent table tr')
    .toArray()
    .find(el => /status|estado/i.test($(el).find('td').first().text()));
  return row ? textOf($(row).find('td').last()) || undefined : undefined;
}

function authorsOf($: CheerioAPI): string[] {
  const values: string[] = [];
  $('.imptdt, .fmed, .infotable tr').each((_, el) => {
    const text = cleanText($(el).text());
    if (/author|artist|autor|tác giả|yazar/i.test(text)) {
      const value = textOf($(el).find('i, span, td:last-child, a'));
      if (value && !PLACEHOLDER.test(value)) {
        values.push(...value.split(/,\s*/));
      }
    }
  });
  return uniqBy(values.filter(Boolean), v => v);
}

export const themesia: Engine = {
  id: 'themesia',
  label: 'MangaThemesia',
  description:
    'Site WordPress dùng theme MangaThemesia (giao diện "mangareader"). Phổ biến với nhóm dịch manhwa.',
  contents: ['manga'],
  allowCustomSites: true,
  sorts: [
    { id: 'latest', label: 'Mới cập nhật' },
    { id: 'popular', label: 'Phổ biến' },
    { id: 'new', label: 'Truyện mới' },
    { id: 'az', label: 'A-Z' },
  ],

  async list(src, sort, page) {
    const url = withQuery(`${src.baseUrl}/${dirOf(src)}/`, { page, order: ORDER[sort] });
    return parseListing(parseHtml(await getText(url)), src.baseUrl);
  },

  async search(src, query, page) {
    const url = withQuery(`${src.baseUrl}/${page > 1 ? `page/${page}/` : ''}`, { s: query });
    return parseListing(parseHtml(await getText(url)), src.baseUrl);
  },

  async genres(src) {
    const $ = parseHtml(await getText(`${src.baseUrl}/${dirOf(src)}/`));
    const genres: Genre[] = $('ul.genrez li, .dropdown-menu.c4 li')
      .toArray()
      .map(el => ({
        id: $(el).find('input').attr('value') ?? '',
        name: cleanText($(el).find('label').text()),
      }))
      .filter(g => g.id && g.name);
    return uniqBy(genres, g => g.id);
  },

  async byGenre(src, genre, sort, page) {
    // Bộ lọc dùng id số của checkbox; thể loại lấy từ trang truyện chỉ có
    // slug trong link /genres/<slug>/ nên đi theo trang thể loại.
    const url = /^\d+$/.test(genre.id)
      ? withQuery(`${src.baseUrl}/${dirOf(src)}/`, { page, 'genre[]': genre.id, order: ORDER[sort] })
      : `${src.baseUrl}/genres/${encodeURIComponent(genre.id)}/${page > 1 ? `page/${page}/` : ''}`;
    return parseListing(parseHtml(await getText(url)), src.baseUrl);
  },

  async detail(src, url) {
    const $ = parseHtml(await getText(url));
    const base = src.baseUrl;
    // Trang có thể chứa cả .mgen lẫn .seriestugenre → khử trùng.
    const genres = uniqBy(
      $('.mgen a, .seriestugenre a, .wd-full .mgen a')
        .toArray()
        .map(el => {
          const segments = pathSegments($(el).attr('href') ?? '');
          return { id: segments[segments.length - 1] ?? '', name: cleanText($(el).text()) };
        })
        .filter(g => g.name),
      g => g.id || g.name,
    );
    const $desc = $('.entry-content[itemprop="description"], .synp .entry-content, .desc, .entry-content').first();
    $desc.find('script, style, .addtoany_share_save_container').remove();
    const paragraphs = $desc
      .find('p')
      .toArray()
      .map(p => cleanText($(p).text()))
      .filter(Boolean);
    const alt = textOf($('.alternative, .seriestualt, .wd-full:contains("Alternative") span'));
    const rating = parseFloat(textOf($('.num[itemprop="ratingValue"], .rating .num, .rating-prc .num')));

    const chapters = $('#chapterlist li, .eplister li, .cl li')
      .toArray()
      .map(el => {
        const $el = $(el);
        const $a = $el.find('a').first();
        const name =
          textOf($el.find('.chapternum, .lchx, .epl-title')) || cleanText($a.text());
        const date = textOf($el.find('.chapterdate, .epl-date, .dt')) || undefined;
        return {
          url: resolveUrl($a.attr('href'), base),
          name,
          date,
          time: parseDate(date),
          number: parseChapterNumber(name) ?? (Number($el.attr('data-num')) || undefined),
        };
      })
      .filter(ch => ch.url && ch.name);

    return {
      url,
      title: textOf($('h1.entry-title, .seriestuheader h1')) || cleanText($('meta[property="og:title"]').attr('content')),
      altTitles: alt ? alt.split(/[;,/]\s*/).filter(Boolean) : undefined,
      cover:
        imageSrc($('.thumb img, .infomanga img, .seriestucontl .thumb img, .bigcontent img'), base) ||
        $('meta[property="og:image"]').attr('content'),
      description: (paragraphs.length ? paragraphs.join('\n\n') : cleanText($desc.text())) || undefined,
      status: statusOf($),
      authors: authorsOf($),
      genres,
      // Theme chấm thang 10, app dùng thang 5.
      rating: Number.isFinite(rating) ? Math.round(rating * 10) / 20 : undefined,
      chapters: uniqBy(chapters, ch => ch.url),
      similar: parseListing($, base, '.bixbox')
        .items.filter(item => item.url !== url)
        .slice(0, 12),
      nsfw: genres.some(g => NSFW_GENRES.test(g.name)),
    } satisfies MangaDetail;
  },

  async chapter(src, url) {
    const html = await getText(url, { referer: `${src.baseUrl}/` });
    const $ = parseHtml(html);
    let pages = readerImages(html);
    if (!pages.length) {
      const $reader = $('#readerarea');
      // Một số site để ảnh trong <noscript> để chống bot.
      const noscript = $reader.find('noscript').text();
      const $scope: Cheerio<AnyNode> = noscript ? parseHtml(noscript).root() : $reader;
      pages = $scope
        .find('img')
        .toArray()
        .map(el => imageSrc($(el), src.baseUrl) ?? '')
        .filter(uri => uri && !uri.startsWith('data:'));
    }
    if (!pages.length) {
      throw new Error('Không tìm thấy ảnh trong chương này.');
    }
    const headers = themesia.imageHeaders(src);
    return {
      kind: 'images',
      title: textOf($('h1.entry-title')) || undefined,
      pages: uniqBy(
        pages.map(u => resolveUrl(u.trim(), src.baseUrl)),
        u => u,
      ).map(uri => ({ uri, headers })),
    };
  },

  classifyUrl(src, url, html) {
    if (getQueryParam(url, 's') !== undefined) {
      return 'list';
    }
    const segments = pathSegments(url);
    if (!segments.length || segments[0] === 'genres' || segments[0] === 'page') {
      return 'list';
    }
    if (segments[0] === dirOf(src)) {
      return segments.length === 1 ? 'list' : 'detail';
    }
    if (html) {
      if (html.includes('id="readerarea"') || html.includes('ts_reader.run')) {
        return 'chapter';
      }
      if (html.includes('id="chapterlist"') || html.includes('class="eplister"')) {
        return 'detail';
      }
      if (html.includes('class="listupd"')) {
        return 'list';
      }
    }
    // Không có HTML: đoán theo slug chương thường gặp.
    return /(chapter|chap|ch|episode|ep|capitulo|bolum|chuong)[-_]?\d/i.test(segments[segments.length - 1])
      ? 'chapter'
      : null;
  },

  async resolveMangaUrl(src, chapterUrl, html) {
    const $ = parseHtml(html ?? (await getText(chapterUrl)));
    // Link "All chapters are in …" ngay dưới tiêu đề chương.
    const href =
      $('.allc a, .headpost .allc a').first().attr('href') ||
      $('.breadcrumb li:nth-child(2) a, ol[itemtype*="BreadcrumbList"] li:nth-child(2) a').first().attr('href');
    return href ? resolveUrl(href, src.baseUrl) : undefined;
  },

  detect(html) {
    return /ts_reader\.run|\/themes\/mangareader|themesia|class="bsx"|class="listupd"/i.test(html);
  },

  imageHeaders(src) {
    return { Referer: `${src.baseUrl}/` };
  },
};
