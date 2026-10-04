import type { CheerioAPI } from 'cheerio/slim';

import { getText, request } from '../../lib/http';
import { getQueryParam, pathSegments, resolveUrl, trimTrailingSlash, withQuery } from '../../lib/url';
import {
  cleanText,
  imageSrc,
  paragraphsOf,
  parseChapterNumber,
  parseDate,
  parseHtml,
  textOf,
  uniqBy,
} from '../html';
import type {
  Chapter,
  ChapterContent,
  Engine,
  Genre,
  ListPage,
  ListSort,
  MangaDetail,
  MangaItem,
  SourceConfig,
} from '../types';

/**
 * Theme WordPress "Madara" (plugin WP-Manga). Chiếm ~2/3 số site chạy được
 * trong bài test của docs, cả manga lẫn novel.
 */

const ORDER_BY: Record<ListSort, string> = {
  latest: 'latest',
  popular: 'views',
  new: 'new-manga',
  rating: 'rating',
  az: 'alphabet',
};

const dirOf = (src: SourceConfig) => src.options?.mangaDir || 'manga';

const pagePath = (page: number) => (page > 1 ? `page/${page}/` : '');

const NSFW_GENRES = /adult|mature|smut|hentai|ecchi|18\+|erotic/i;

function parseListing($: CheerioAPI, base: string): ListPage {
  const items: MangaItem[] = [];
  $(
    'div.page-item-detail, div.c-tabs-item__content, div.manga__item, div.manga-item, .page-listing-item .col-6',
  ).each((_, el) => {
    const $el = $(el);
    const $a = $el
      .find('.post-title a, .manga-title a, h3 a, h4 a, h5 a, .item-summary a')
      .first();
    const href = $a.attr('href');
    if (!href) {
      return;
    }
    const title = cleanText($a.text()) || cleanText($a.attr('title'));
    if (!title) {
      return;
    }
    items.push({
      url: resolveUrl(href, base),
      title,
      cover: imageSrc($el.find('.item-thumb img, .tab-thumb img, .manga__thumb img, img'), base),
      subtitle:
        textOf($el.find('.chapter-item .chapter a, .latest-chap .chapter a, span.chapter a, .list-chapter .chapter a')) ||
        undefined,
    });
  });

  const explicitNext = $(
    '.nav-previous a, .nav-links a.next, a.nextpostslink, .wp-pagenavi a.nextpostslink, a.next.page-numbers, .navigation-ajax #navigation-ajax',
  ).length;
  const hasPager = $('.wp-pagenavi, .nav-links, .navigation-ajax, .nav-previous').length > 0;
  return {
    items: uniqBy(items, item => item.url),
    hasNext: hasPager ? explicitNext > 0 : items.length >= 10,
  };
}

function parseChapters($: CheerioAPI, base: string): Chapter[] {
  return uniqBy(
    $('li.wp-manga-chapter')
      .toArray()
      .map(el => {
        const $el = $(el);
        const $a = $el.find('a').not('.c-new-tag').first();
        const name = cleanText($a.text());
        // Chương mới có nhãn "new" kèm ngày thật trong title của thẻ a.
        const date =
          textOf($el.find('.chapter-release-date i')) ||
          cleanText($el.find('.chapter-release-date a, a.c-new-tag').attr('title')) ||
          textOf($el.find('.chapter-release-date'));
        return {
          url: resolveUrl($a.attr('href'), base),
          name,
          date: date || undefined,
          time: parseDate(date),
          number: parseChapterNumber(name),
        };
      })
      .filter(ch => ch.url && ch.name),
    ch => ch.url,
  );
}

async function fetchChapters(
  src: SourceConfig,
  url: string,
  $: CheerioAPI,
): Promise<Chapter[]> {
  const inline = parseChapters($, src.baseUrl);
  if (inline.length) {
    return inline;
  }

  // Madara mới: POST {manga-url}/ajax/chapters/
  try {
    const html = await getText(`${trimTrailingSlash(url)}/ajax/chapters/`, {
      method: 'POST',
      body: '',
      ajax: true,
      referer: url,
    });
    const chapters = parseChapters(parseHtml(html), src.baseUrl);
    if (chapters.length) {
      return chapters;
    }
  } catch {
    // Rơi xuống cách cũ bên dưới.
  }

  // Madara cũ: admin-ajax.php?action=manga_get_chapters&manga=<id>
  const mangaId =
    $('#manga-chapters-holder').attr('data-id') ||
    $('.rating-post-id').attr('value') ||
    $('#wp-manga-current-chap').attr('data-id') ||
    $('input[name="wp-manga-id"]').attr('value');
  if (!mangaId) {
    return [];
  }
  const html = await getText(`${src.baseUrl}/wp-admin/admin-ajax.php`, {
    form: { action: 'manga_get_chapters', manga: mangaId },
    ajax: true,
    referer: url,
  });
  return parseChapters(parseHtml(html), src.baseUrl);
}

function infoRows($: CheerioAPI): Map<string, string> {
  const rows = new Map<string, string>();
  $('.post-content_item, .post-status .post-content_item').each((_, el) => {
    const heading = cleanText($(el).find('.summary-heading').text()).toLowerCase();
    const value = cleanText($(el).find('.summary-content').text());
    if (heading && value) {
      rows.set(heading, value);
    }
  });
  return rows;
}

function findRow(rows: Map<string, string>, pattern: RegExp): string | undefined {
  for (const [heading, value] of rows) {
    if (pattern.test(heading)) {
      return value;
    }
  }
  return undefined;
}

function genreSlug(href: string | undefined): string {
  const segments = pathSegments(href ?? '');
  const idx = segments.indexOf('manga-genre');
  return idx >= 0 ? segments[idx + 1] ?? '' : segments[segments.length - 1] ?? '';
}

export const madara: Engine = {
  id: 'madara',
  label: 'Madara',
  description:
    'Site WordPress dùng theme Madara (plugin WP-Manga). Chiếm phần lớn site truyện tranh và novel dịch.',
  contents: ['manga', 'novel'],
  allowCustomSites: true,
  sorts: [
    { id: 'latest', label: 'Mới cập nhật' },
    { id: 'popular', label: 'Xem nhiều' },
    { id: 'new', label: 'Truyện mới' },
    { id: 'rating', label: 'Đánh giá' },
    { id: 'az', label: 'A-Z' },
  ],

  async list(src, sort, page) {
    const url = withQuery(`${src.baseUrl}/${dirOf(src)}/${pagePath(page)}`, {
      m_orderby: ORDER_BY[sort],
    });
    return parseListing(parseHtml(await getText(url)), src.baseUrl);
  },

  async search(src, query, page) {
    const url = withQuery(`${src.baseUrl}/${pagePath(page)}`, {
      s: query,
      post_type: 'wp-manga',
    });
    return parseListing(parseHtml(await getText(url)), src.baseUrl);
  },

  async genres(src) {
    const $ = parseHtml(
      await getText(withQuery(`${src.baseUrl}/`, { s: '', post_type: 'wp-manga' })),
    );
    let genres: Genre[] = $('.checkbox-group .checkbox, .genres-filter .checkbox')
      .toArray()
      .map(el => ({
        id: $(el).find('input').attr('value') ?? '',
        name: cleanText($(el).find('label').text()),
      }));
    if (!genres.length) {
      genres = $('a[href*="/manga-genre/"]')
        .toArray()
        .map(el => ({
          id: genreSlug($(el).attr('href')),
          name: cleanText($(el).text()).replace(/\s*\(\d+\)$/, ''),
        }));
    }
    return uniqBy(
      genres.filter(g => g.id && g.name),
      g => g.id,
    ).sort((a, b) => a.name.localeCompare(b.name));
  },

  async byGenre(src, genre, sort, page) {
    const url = withQuery(`${src.baseUrl}/manga-genre/${genre.id}/${pagePath(page)}`, {
      m_orderby: ORDER_BY[sort],
    });
    return parseListing(parseHtml(await getText(url)), src.baseUrl);
  },

  async detail(src, url) {
    const $ = parseHtml(await getText(url));
    const base = src.baseUrl;
    const $title = $('.post-title h1, .post-title h3, .post-title h2, #manga-title h1').first();
    $title.find('span').remove();
    const rows = infoRows($);
    const genres = $('.genres-content a')
      .toArray()
      .map(el => ({ id: genreSlug($(el).attr('href')), name: cleanText($(el).text()) }))
      .filter(g => g.name);
    const descriptionEl = $(
      '.description-summary .summary__content, .summary__content, .manga-excerpt, .manga-summary, .description-summary',
    ).first();
    const description = descriptionEl.find('p').length
      ? descriptionEl
          .find('p')
          .toArray()
          .map(p => cleanText($(p).text()))
          .filter(Boolean)
          .join('\n\n')
      : cleanText(descriptionEl.text());
    const rating = parseFloat(textOf($('#averagerate, .post-total-rating .score, .score')));
    const alt = findRow(rows, /alt|other name|tên khác|alternativ|otros nombres/);

    return {
      url,
      title: cleanText($title.text()) || cleanText($('meta[property="og:title"]').attr('content')),
      altTitles: alt ? alt.split(/[;,/]\s*/).filter(Boolean) : undefined,
      cover:
        imageSrc($('.summary_image img'), base) ||
        $('meta[property="og:image"]').attr('content'),
      description: description || undefined,
      status: findRow(rows, /status|trạng thái|estado|statut|durum/),
      authors: uniqBy(
        $('.author-content a, .artist-content a')
          .toArray()
          .map(el => cleanText($(el).text()))
          .filter(Boolean),
        a => a,
      ),
      genres,
      rating: Number.isFinite(rating) ? rating : undefined,
      views: findRow(rows, /rank|views|lượt xem/),
      chapters: await fetchChapters(src, url, $),
      similar: $('.related-reading-wrap, .related-manga .related-reading-content')
        .toArray()
        .map(el => {
          const $a = $(el).find('h5 a, .widget-title a, a').last();
          return {
            url: resolveUrl($a.attr('href'), base),
            title: cleanText($a.text()),
            cover: imageSrc($(el).find('img'), base),
          };
        })
        .filter(item => item.url && item.title),
      nsfw:
        $('.manga-title-badges.adult').length > 0 ||
        genres.some(g => NSFW_GENRES.test(g.name)),
    } satisfies MangaDetail;
  },

  async chapter(src, url): Promise<ChapterContent> {
    const pageUrl = getQueryParam(url, 'style') ? url : withQuery(url, { style: 'list' });
    const { text: html } = await request(pageUrl, { referer: `${src.baseUrl}/` });
    const $ = parseHtml(html);
    const title =
      textOf($('#chapter-heading, .wp-manga-chapter-heading, ol.breadcrumb li.active')) || undefined;

    const $text = $('.reading-content .text-left, .reading-content .text-right, .reading-content .entry-content_wrap');
    if (src.content === 'novel' || ($text.length && !$('.reading-content img').length)) {
      const paragraphs = paragraphsOf($, $text.length ? $text.first() : $('.reading-content').first());
      if (paragraphs.length) {
        return { kind: 'text', title, paragraphs };
      }
    }

    let pages = $('.reading-content .page-break img, .reading-content img.wp-manga-chapter-img, .reading-content img, li.blocks-gallery-item img')
      .toArray()
      .map(el => imageSrc($(el), src.baseUrl))
      .filter((uri): uri is string => !!uri && !uri.startsWith('data:'));

    if (!pages.length) {
      const preloaded = html.match(/chapter_preloaded_images\s*=\s*(\[[\s\S]*?\])/);
      if (preloaded) {
        try {
          pages = (JSON.parse(preloaded[1]) as string[]).map(u => resolveUrl(u, src.baseUrl));
        } catch {
          // Bỏ qua, báo lỗi bên dưới.
        }
      }
    }
    if (!pages.length) {
      if (/chapter_data|wpmangaprotectornonce/.test(html)) {
        throw new Error('Chương này bị site mã hoá ảnh. Hãy mở trên web để đọc.');
      }
      throw new Error('Không tìm thấy ảnh trong chương này.');
    }
    const headers = madara.imageHeaders(src);
    return { kind: 'images', title, pages: uniqBy(pages, u => u).map(uri => ({ uri, headers })) };
  },

  classifyUrl(src, url, html) {
    if (getQueryParam(url, 's') !== undefined) {
      return 'list';
    }
    const segments = pathSegments(url);
    if (!segments.length || segments[0] === 'manga-genre' || segments[0] === 'page') {
      return 'list';
    }
    if (segments[0] === dirOf(src)) {
      if (segments.length === 1 || segments[1] === 'page') {
        return 'list';
      }
      return segments.length === 2 ? 'detail' : 'chapter';
    }
    if (html) {
      if (html.includes('reading-content')) {
        return 'chapter';
      }
      if (html.includes('summary_image') || html.includes('manga-chapters-holder')) {
        return 'detail';
      }
      if (html.includes('page-item-detail')) {
        return 'list';
      }
    }
    return null;
  },

  async resolveMangaUrl(src, chapterUrl, html) {
    const segments = pathSegments(chapterUrl);
    const dir = dirOf(src);
    if (segments[0] === dir && segments.length >= 3) {
      return `${src.baseUrl}/${dir}/${encodeURIComponent(segments[1])}/`;
    }
    const $ = parseHtml(html ?? (await getText(chapterUrl)));
    const crumbs = $('.breadcrumb li a, ol.breadcrumb a').toArray();
    const href = crumbs.length >= 2 ? $(crumbs[crumbs.length - 1]).attr('href') : undefined;
    return href ? resolveUrl(href, src.baseUrl) : undefined;
  },

  detect(html) {
    return /\/themes\/madara|madara-core|wp-manga-chapter|manga_get_chapters|class="[^"]*wp-manga/i.test(html);
  },

  imageHeaders(src) {
    return { Referer: `${src.baseUrl}/` };
  },
};
