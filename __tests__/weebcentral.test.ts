import { configureSources } from '../src/sources/runtime';
import type { SourceConfig } from '../src/sources/types';
import { sourceEngine } from './helpers/addons';
import { mockFetch, urlIs, urlStarts } from './helpers/mockFetch';

const weebcentral = sourceEngine('weebcentral');

const src: SourceConfig = {
  id: 'weebcentral.com',
  engine: 'weebcentral',
  name: 'Weeb Central',
  baseUrl: 'https://weebcentral.com',
  content: 'manga',
  lang: 'en',
  nsfw: false,
  enabled: true,
  addedAt: 0,
};

const SID = '01J76XYGA6JJRSAZTFZGDSX1AW';
const SERIES_URL = `https://weebcentral.com/series/${SID}/Solo-Hero`;
const cid = (n: number) => `01CHAPTER${String(n).padStart(17, '0')}`;

const card = (id: string, title: string, type: string, status: string) => `
<article class="bg-base-300 flex gap-4 p-4">
  <section>
    <a href="https://weebcentral.com/series/${id}/slug">
      <article class="hidden lg:block"><picture>
        <source srcset="https://temp.compsci88.com/cover/normal/${id}.webp">
        <img src="https://temp.compsci88.com/cover/fallback/${id}.jpg" alt="${title} cover">
      </picture></article>
    </a>
  </section>
  <section>
    <div><span class="tooltip" data-tip="${title}"><a href="https://weebcentral.com/series/${id}/slug" class="line-clamp-1 link link-hover">${title}</a></span></div>
    <div><strong>Status:</strong> <span>${status}</span></div>
    <div><strong>Type:</strong> <span>${type}</span></div>
    <div><strong>Author(s): </strong><span><a href="https://weebcentral.com/search?author=Kim" class="link">Kim</a></span></div>
  </section>
</article>`;

const LIST_PAGE = `
${card('01J76XY7E9FNDZ1DBBM6PBJPFK', 'One Piece', 'Manga', 'Ongoing')}
${card('01J76XY7EF75DJNQCV04HTPDZK', 'Berserk', 'Manga', 'Hiatus')}
<button hx-get="/search/data?limit=32&amp;offset=64&amp;sort=Popularity" hx-swap="outerHTML"><span>View More Results...</span></button>`;

const chapterRow = (id: string, name: string, iso: string) => `
<div class="flex items-center">
  <a href="/chapters/${id}" class="flex-1 flex items-center p-2">
    <span class="me-2"><img src="/static/images/chapter-badge.svg" alt=""></span>
    <span class="grow flex items-center gap-2">
      <span class="">${name}</span>
      <span x-show="new_chapter"><img src="/static/images/new-chapter.svg" alt=""></span>
    </span>
    <time class="text-datetime opacity-50" datetime="${iso}">${iso}</time>
  </a>
</div>`;

const DETAIL_PAGE = `
<html><head><title>Solo Hero | Weeb Central</title></head><body>
<main>
  <section x-data="{ show_detail: false, subscriptions: 3149, last_read_chapter: '' }">
    <section>
      <h1 class="md:hidden">Solo Hero</h1>
      <picture><source srcset="https://temp.compsci88.com/cover/normal/${SID}.webp"><img src="https://temp.compsci88.com/cover/fallback/${SID}.jpg" alt="Solo Hero cover"></picture>
      <ul>
        <li><strong>Author(s): </strong><span><a href="/search?author=Kim">Kim</a>,</span><span><a href="/search?author=Lee">Lee</a></span></li>
        <li><strong>Tags(s): </strong><span><a href="/search?included_tag=Action">Action</a>,</span><span><a href="/search?included_tag=Adult">Adult</a></span></li>
        <li><strong>Status: </strong><a href="/search?included_status=Ongoing">Ongoing</a></li>
        <li><strong>Adult Content: </strong><a href="/search?adult=True">Yes</a></li>
      </ul>
    </section>
    <section>
      <h1 class="hidden md:block">Solo Hero</h1>
      <ul>
        <li><strong>Description</strong><p class="whitespace-pre-wrap">Line one.
Line two.</p></li>
        <li><strong>Related Series(s)</strong><ul>
          <li><a href="https://weebcentral.com/series/01J76XY8NPW1EH8SFZEXX8ZCRT">Solo Hero Side Story</a> <span>(Spin-Off)</span></li>
        </ul></li>
      </ul>
      <div id="chapter-list">
        ${chapterRow(cid(3), 'Chapter 3', '2026-10-03T18:55:36.763Z')}
        <button hx-get="https://weebcentral.com/series/${SID}/full-chapter-list" hx-target="#chapter-list">Show All Chapters</button>
        ${chapterRow(cid(1), 'Chapter 1', '2024-09-07T17:04:15.717Z')}
      </div>
    </section>
  </section>
  <section>
    <h2><strong>Recommendations</strong></h2>
    <ul class="glide__slides">
      <li class="glide__slide"><a href="https://weebcentral.com/series/01J76XYBHK1X5A9D8J2SRS2XMF/Rokka"><picture><img src="https://temp.compsci88.com/cover/fallback/R.jpg" alt="Rokka cover"></picture><div class="truncate">Rokka</div></a></li>
      <li class="glide__slide"><a href="${SERIES_URL}"><div class="truncate">Solo Hero</div></a></li>
    </ul>
  </section>
</main>
</body></html>`;

const FULL_LIST = [
  chapterRow(cid(3), 'Chapter 3', '2026-10-03T18:55:36.763Z'),
  chapterRow(cid(2), 'Chapter 2.5', '2025-01-02T03:04:05.000Z'),
  chapterRow(cid(1), 'Chapter 1', '2024-09-07T17:04:15.717Z'),
].join('\n');

const IMAGES = `
<section id="chapter-images" hx-get="https://weebcentral.com/chapters/${cid(3)}/images">
  <img src="https://scans.lastation.us/manga/Solo-Hero/0003-001.png" alt="Page 1" onerror="this.src='/static/images/broken_image.jpg'" />
  <img src="https://scans.lastation.us/manga/Solo-Hero/0003-002.png" alt="Page 2" />
</section>`;

const CHAPTER_PAGE = `
<html><head><title>Chapter 3 | Solo Hero | Weeb Central</title></head><body>
<main>
  <section id="nav-top"><a class="btn" href="${SERIES_URL}"><span>Solo Hero</span></a>
    <button hx-get="https://weebcentral.com/series/${SID}/chapter-select?current_chapter=${cid(3)}">Chapter 3</button>
  </section>
  <section id="chapter-images"></section>
</main></body></html>`;

const date = (iso: string) => new Date(Date.parse(iso)).toLocaleDateString('vi-VN');

describe('weebcentral engine', () => {
  beforeEach(() => configureSources({ allowNsfw: false }));

  test('list dựng URL /search/data theo sort + offset và parse thẻ truyện', async () => {
    const { calls } = mockFetch([{ match: urlStarts('https://weebcentral.com/search/data?'), body: LIST_PAGE }]);
    const page = await weebcentral.list(src, 'popular', 3);
    expect(calls[0].url).toBe(
      'https://weebcentral.com/search/data?limit=32&offset=64&official=Any&adult=False&display_mode=Full%20Display&sort=Popularity&order=Descending',
    );
    expect(page.hasNext).toBe(true);
    expect(page.items).toEqual([
      {
        url: 'https://weebcentral.com/series/01J76XY7E9FNDZ1DBBM6PBJPFK/slug',
        title: 'One Piece',
        cover: 'https://temp.compsci88.com/cover/fallback/01J76XY7E9FNDZ1DBBM6PBJPFK.jpg',
        subtitle: 'Manga · Ongoing',
      },
      {
        url: 'https://weebcentral.com/series/01J76XY7EF75DJNQCV04HTPDZK/slug',
        title: 'Berserk',
        cover: 'https://temp.compsci88.com/cover/fallback/01J76XY7EF75DJNQCV04HTPDZK.jpg',
        subtitle: 'Manga · Hiatus',
      },
    ]);

    configureSources({ allowNsfw: true });
    await weebcentral.list(src, 'az', 1);
    expect(calls[1].url).toContain('offset=0&official=Any&adult=Any&');
    expect(calls[1].url).toContain('sort=Alphabet&order=Ascending');
  });

  test('search dùng Best Match; hết kết quả thì hasNext=false', async () => {
    const { calls } = mockFetch([
      {
        match: urlStarts('https://weebcentral.com/search/data?'),
        body: card('01J76XY7E9FNDZ1DBBM6PBJPFK', 'One Piece', 'Manga', 'Ongoing'),
      },
    ]);
    const page = await weebcentral.search(src, ' one piece ', 1);
    expect(calls[0].url).toContain('text=one%20piece&sort=Best%20Match&order=Descending');
    expect(page.items.map(i => i.title)).toEqual(['One Piece']);
    expect(page.hasNext).toBe(false);
  });

  test('genres lấy từ bộ lọc tag của /search; byGenre gửi included_tag', async () => {
    const { calls } = mockFetch([
      {
        match: urlIs('https://weebcentral.com/search'),
        body: `<input type="checkbox" id="tag-Slice of Life" value="0"><input type="hidden" id="tag-Slice of Life-value" value="Slice of Life">
          <input type="checkbox" id="tag-Action" value="0"><input type="hidden" id="tag-Action-value" value="Action">`,
      },
      { match: urlStarts('https://weebcentral.com/search/data?'), body: LIST_PAGE },
    ]);
    const genres = await weebcentral.genres(src);
    expect(genres).toEqual([
      { id: 'Action', name: 'Action' },
      { id: 'Slice of Life', name: 'Slice of Life' },
    ]);
    const page = await weebcentral.byGenre(src, genres[1], 'new', 2);
    expect(calls[1].url).toContain('offset=32');
    expect(calls[1].url).toContain('sort=Recently%20Added&order=Descending&included_tag=Slice%20of%20Life');
    expect(page.items).toHaveLength(2);
  });

  test('detail đọc thông tin và lấy đủ chương từ full-chapter-list', async () => {
    const { calls } = mockFetch([
      { match: urlIs(SERIES_URL), body: DETAIL_PAGE },
      { match: urlIs(`https://weebcentral.com/series/${SID}/full-chapter-list`), body: FULL_LIST },
    ]);
    const detail = await weebcentral.detail(src, SERIES_URL);
    expect(calls.map(c => c.url).sort()).toEqual([
      SERIES_URL,
      `https://weebcentral.com/series/${SID}/full-chapter-list`,
    ]);
    expect(detail).toMatchObject({
      title: 'Solo Hero',
      cover: `https://temp.compsci88.com/cover/fallback/${SID}.jpg`,
      description: 'Line one.\nLine two.',
      status: 'Ongoing',
      authors: ['Kim', 'Lee'],
      genres: [
        { id: 'Action', name: 'Action' },
        { id: 'Adult', name: 'Adult' },
      ],
      views: `${(3149).toLocaleString('vi-VN')} theo dõi`,
      nsfw: true,
    });
    expect(detail.chapters).toEqual([
      {
        url: `https://weebcentral.com/chapters/${cid(3)}`,
        name: 'Chapter 3',
        date: date('2026-10-03T18:55:36.763Z'),
        time: Date.parse('2026-10-03T18:55:36.763Z'),
        number: 3,
      },
      {
        url: `https://weebcentral.com/chapters/${cid(2)}`,
        name: 'Chapter 2.5',
        date: date('2025-01-02T03:04:05.000Z'),
        time: Date.parse('2025-01-02T03:04:05.000Z'),
        number: 2.5,
      },
      expect.objectContaining({ name: 'Chapter 1', number: 1 }),
    ]);
    // Truyện liên quan trước, gợi ý sau; bỏ chính truyện đang xem.
    expect(detail.similar).toEqual([
      {
        url: 'https://weebcentral.com/series/01J76XY8NPW1EH8SFZEXX8ZCRT',
        title: 'Solo Hero Side Story',
        subtitle: 'Spin-Off',
      },
      {
        url: 'https://weebcentral.com/series/01J76XYBHK1X5A9D8J2SRS2XMF/Rokka',
        title: 'Rokka',
        cover: 'https://temp.compsci88.com/cover/fallback/R.jpg',
      },
    ]);
  });

  test('detail dùng danh sách chương trên trang khi full-chapter-list lỗi', async () => {
    mockFetch([{ match: urlIs(SERIES_URL), body: DETAIL_PAGE }]);
    const detail = await weebcentral.detail(src, SERIES_URL);
    expect(detail.chapters.map(c => c.name)).toEqual(['Chapter 3', 'Chapter 1']);
  });

  test('chapter lấy ảnh từ endpoint images và tên chương từ <title>', async () => {
    const chapterUrl = `https://weebcentral.com/chapters/${cid(3)}`;
    const { calls } = mockFetch([
      { match: urlStarts(`${chapterUrl}/images?`), body: IMAGES },
      { match: urlIs(chapterUrl), body: CHAPTER_PAGE },
    ]);
    const content = await weebcentral.chapter(src, chapterUrl);
    expect(calls.map(c => c.url)).toContain(
      `${chapterUrl}/images?is_prev=False&current_page=1&reading_style=long_strip`,
    );
    const headers = { Referer: 'https://weebcentral.com/' };
    expect(content).toEqual({
      kind: 'images',
      title: 'Chapter 3',
      pages: [
        { uri: 'https://scans.lastation.us/manga/Solo-Hero/0003-001.png', headers },
        { uri: 'https://scans.lastation.us/manga/Solo-Hero/0003-002.png', headers },
      ],
    });
  });

  test('chapter đã bị thay (trang HTML về /404) vẫn đọc được ảnh', async () => {
    const chapterUrl = `https://weebcentral.com/chapters/${cid(9)}`;
    mockFetch([
      { match: urlStarts(`${chapterUrl}/images?`), body: IMAGES },
      { match: urlIs(chapterUrl), body: '<html><head><title>404</title></head></html>' },
    ]);
    const content = await weebcentral.chapter(src, chapterUrl);
    expect(content.kind === 'images' && content.pages).toHaveLength(2);
    expect(content.title).toBeUndefined();
  });

  test('chapter không có ảnh thì báo lỗi', async () => {
    mockFetch([
      { match: urlStarts('https://weebcentral.com/chapters/'), body: '<section id="chapter-images"></section>' },
    ]);
    await expect(weebcentral.chapter(src, `https://weebcentral.com/chapters/${cid(3)}`)).rejects.toThrow(
      'Không tìm thấy ảnh',
    );
  });

  test('classifyUrl và resolveMangaUrl', async () => {
    expect(weebcentral.classifyUrl(src, 'https://weebcentral.com/')).toBe('list');
    expect(weebcentral.classifyUrl(src, 'https://weebcentral.com/search?text=one')).toBe('list');
    expect(weebcentral.classifyUrl(src, 'https://weebcentral.com/hot-updates')).toBe('list');
    expect(weebcentral.classifyUrl(src, SERIES_URL)).toBe('detail');
    expect(weebcentral.classifyUrl(src, `https://weebcentral.com/series/${SID}`)).toBe('detail');
    expect(weebcentral.classifyUrl(src, `https://weebcentral.com/chapters/${cid(3)}?is_prev=True`)).toBe('chapter');
    expect(weebcentral.classifyUrl(src, 'https://weebcentral.com/series/not-an-id')).toBeNull();
    expect(weebcentral.classifyUrl(src, 'https://weebcentral.com/faq')).toBeNull();

    // Có HTML từ WebView thì không cần tải lại.
    expect(await weebcentral.resolveMangaUrl(src, `https://weebcentral.com/chapters/${cid(3)}`, CHAPTER_PAGE)).toBe(
      SERIES_URL,
    );
    const { calls } = mockFetch([{ match: urlIs(`https://weebcentral.com/chapters/${cid(3)}`), body: CHAPTER_PAGE }]);
    expect(await weebcentral.resolveMangaUrl(src, `https://weebcentral.com/chapters/${cid(3)}`)).toBe(SERIES_URL);
    expect(calls).toHaveLength(1);
    // Mất link tên truyện: lấy id từ endpoint chọn chương.
    const bare = CHAPTER_PAGE.replace(`href="${SERIES_URL}"`, 'href="#"');
    expect(await weebcentral.resolveMangaUrl(src, `https://weebcentral.com/chapters/${cid(3)}`, bare)).toBe(
      `https://weebcentral.com/series/${SID}`,
    );
  });
});
