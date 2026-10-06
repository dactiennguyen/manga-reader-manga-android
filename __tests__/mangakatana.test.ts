import { configureSources } from '../src/sources/runtime';
import type { SourceConfig } from '../src/sources/types';
import { sourceEngine } from './helpers/addons';
import { mockFetch, urlIs, urlStarts } from './helpers/mockFetch';

const mangakatana = sourceEngine('mangakatana');

const src: SourceConfig = {
  id: 'mangakatana.com',
  engine: 'mangakatana',
  name: 'MangaKatana',
  baseUrl: 'https://mangakatana.com',
  content: 'manga',
  lang: 'en',
  nsfw: false,
  enabled: true,
  addedAt: 0,
};

const MANGA_URL = 'https://mangakatana.com/manga/solo-hero.101';
const EXCLUDE = 'exclude=adult_erotica_loli_shota_sexual-violence';

const listItem = (slug: string, title: string, chapter: string) => `
<div class="item" data-genre=",14,2," data-id="1">
  <div class="media"><div class="wrap_img"><a href="https://mangakatana.com/manga/${slug}">
    <picture><source srcset="https://mangakatana.com/imgs/cover/${slug}.webp" type="image/webp"><img src="https://mangakatana.com/imgs/cover/${slug}.jpg" alt="[Cover]"></picture>
  </a></div><div class="status ongoing">Ongoing</div></div>
  <div class="text">
    <h3 class="title"><a href="https://mangakatana.com/manga/${slug}" target="_blank">${title}</a><span> - Update chapter 12</span></h3>
    <div class="chapters"><div class="uk-grid">
      <div class="chapter"><a href="https://mangakatana.com/manga/${slug}/c12">${chapter}</a></div><div class="update_time">Oct-05-2026</div>
      <div class="chapter"><a href="https://mangakatana.com/manga/${slug}/c11">Chapter 11</a></div><div class="update_time">Oct-04-2026</div>
    </div></div>
  </div>
</div>`;

const PAGER_NEXT = `<ul class="uk-pagination"><li class="uk-active"><span class="page-numbers current">1</span></li><li><a class="next page-numbers" href="https://mangakatana.com/manga/page/2?order=latest">&gt;</a></li></ul>`;

const LIST_PAGE = `
<div id="book_list">${listItem('solo-hero.101', 'Solo Hero', 'Chapter 12: The End')}${listItem(
  'second.202',
  'Second Story',
  'Chapter 3',
)}</div>
${PAGER_NEXT}
<div id="genre_side" class="widget"><div class="widget-title"><span>Genres</span></div><a href="https://mangakatana.com/genre/action">Action</a> <span>(6430)</span></div>`;

const DETAIL_PAGE = `
<html><head><meta property="og:url" content="${MANGA_URL}"/><meta property="og:title" content="Solo Hero"/></head><body>
<div id="single_book">
  <div class="cover"><picture><source srcset="https://mangakatana.com/imgs/cover/solo.avif" type="image/avif"><img src="https://mangakatana.com/imgs/cover/solo.jpg" alt="[Cover]"></picture></div>
  <div class="info">
    <h1 class="heading">Solo Hero</h1>
    <ul class="meta d-table">
      <li class="d-row-small"><div class="label">Alt name(s):</div><div class="value"><div class="alt_name">Hero Solo ; 솔로 히어로</div></div></li>
      <li class="d-row-small"><div class="label">Author(s) / Artist(s):</div><div class="value authors"><a class="author" href="https://mangakatana.com/author/kim.9">Kim</a></div></li>
      <li class="d-row-small"><div class="label">Genres:</div><div class="value"><div class="genres"><a href="https://mangakatana.com/genre/action">Action</a><a href="https://mangakatana.com/genre/adult">Adult</a></div></div></li>
      <li class="d-row-small"><div class="label">Status:</div><div class="value status ongoing">Ongoing</div></li>
      <li class="d-row-small"><div class="label">Latest chapter(s):</div><div class="value new_chap">Chapter 12</div></li>
    </ul>
  </div>
  <div class="summary"><div class="label">Description</div><p>First line.</p><p>Second line.</p></div>
  <div class="chapters"><table class="uk-table"><tbody>
    <tr data-jump="0"><td><div class="chapter"><a href="${MANGA_URL}/c12">Chapter 12: The End</a></div></td><td><div class="update_time">Oct-03-2026</div></td></tr>
    <tr data-jump="0"><td><div class="chapter"><a href="${MANGA_URL}/c11.5">Extra Story</a></div></td><td><div class="update_time">Jan-19-2025</div></td></tr>
    <tr data-jump="c1"><td><div class="chapter"><a href="${MANGA_URL}/v1c1">Vol.1 Chapter 1</a></div></td><td><div class="update_time">Sep-11-2020</div></td></tr>
  </tbody></table></div>
</div>
<div class="widget"><div class="widget-title"><span>More from author / artist</span></div><div class="widget-body">
  <div class="item"><div class="wrap_img"><a href="https://mangakatana.com/manga/by-kim.303"><img data-src="https://mangakatana.com/imgs/cover/k.webp" alt="[Cover]"/></a></div><h3 class="title"><a href="https://mangakatana.com/manga/by-kim.303">By Kim</a></h3></div>
</div></div>
<div class="widget"><div class="widget-title"><span>Similar Series</span></div><div class="widget-body">
  <div class="item"><div class="d-cell media"><div class="wrap_img"><a href="https://mangakatana.com/manga/other.404"><img data-src="https://mangakatana.com/imgs/cover/o.webp" alt="[Cover]"/></a></div></div>
    <div class="d-cell text"><h3 class="title"><a href="https://mangakatana.com/manga/other.404">Other</a></h3><div class="chapter"><a href="https://mangakatana.com/manga/other.404/c5">Chapter 5</a></div></div></div>
  <div class="item"><h3 class="title"><a href="${MANGA_URL}">Solo Hero</a></h3></div>
</div></div>
</body></html>`;

const wraps = (n: number) =>
  Array.from(
    { length: n },
    (_, i) => `<div id="page${i + 1}" class="wrap_img uk-width-1-1" data-pages="${n}"><img data-src="#" alt=""/></div>`,
  ).join('');

const CHAPTER_PAGE = `
<ul class="uk-breadcrumb"><li><a href="http://mangakatana.com"><span>Home</span></a></li><li><a href="${MANGA_URL}" title="Solo Hero"><span>Solo Hero</span></a></li><li class="uk-active uk-visible-large"><span>Chapter 12: The End</span></li></ul>
<div id="imgs" data-alt="Solo Hero - Chapter 12: The End">${wraps(3)}</div>
<script>
  var ytaw=['https://i1.mangakatana.com/token/decoy/0.jpg',];
  var thzq=['https://i1.mangakatana.com/token/aa/0.jpg','https://i1.mangakatana.com/token/bb/1.jpg','https://i1.mangakatana.com/token/cc/2.jpg',];function kxatz(){for(i=thzq.length-1;i>=0;i--){var obj=$('#imgs .wrap_img:eq('+i+') img');obj.attr('data-src', thzq[i]);}}
</script>
<script>var item_url = '${MANGA_URL}'; var cds = ["1100x1580","1100x1580","1100x1580"];</script>`;

describe('mangakatana engine', () => {
  beforeEach(() => configureSources({ allowNsfw: false }));
  afterEach(() => jest.useRealTimers());

  test('list dùng bộ lọc /manga/page/N, loại thể loại 18+ khi chưa cho phép', async () => {
    const { calls } = mockFetch([{ match: urlStarts('https://mangakatana.com/manga/page/'), body: LIST_PAGE }]);
    const page = await mangakatana.list(src, 'new', 2);
    expect(calls[0].url).toBe(`https://mangakatana.com/manga/page/2?filter=1&chapters=1&order=new&${EXCLUDE}`);
    expect(page.hasNext).toBe(true);
    expect(page.items).toEqual([
      {
        url: 'https://mangakatana.com/manga/solo-hero.101',
        title: 'Solo Hero',
        cover: 'https://mangakatana.com/imgs/cover/solo-hero.101.jpg',
        subtitle: 'Chapter 12: The End',
      },
      {
        url: 'https://mangakatana.com/manga/second.202',
        title: 'Second Story',
        cover: 'https://mangakatana.com/imgs/cover/second.202.jpg',
        subtitle: 'Chapter 3',
      },
    ]);

    configureSources({ allowNsfw: true });
    await mangakatana.list(src, 'az', 1);
    expect(calls[1].url).toBe('https://mangakatana.com/manga/page/1?filter=1&chapters=1&order=az');
  });

  test('list trang cuối không có nút next; vượt trang cuối (404) trả rỗng', async () => {
    mockFetch([
      { match: urlStarts('https://mangakatana.com/manga/page/5?'), body: LIST_PAGE.replace(PAGER_NEXT, '') },
      { match: urlStarts('https://mangakatana.com/manga/page/6?'), status: 404, body: '<title>404</title>' },
    ]);
    expect((await mangakatana.list(src, 'latest', 5)).hasNext).toBe(false);
    expect(await mangakatana.list(src, 'latest', 6)).toEqual({ items: [], hasNext: false });
  });

  test('list "Phổ biến" lấy khối Hot Manga ở trang chủ, chỉ một trang', async () => {
    const { calls } = mockFetch([
      {
        match: urlIs('https://mangakatana.com/'),
        body: `<div id="hot_book" class="widget"><div class="widget-body">
          <div class="item"><div class="wrap_img"><a href="https://mangakatana.com/manga/hot.1"><img data-src="https://mangakatana.com/imgs/cover/h.webp" alt="[Cover]"/></a></div>
          <h3 class="title"><a href="https://mangakatana.com/manga/hot.1">Hot One</a></h3><div class="chapter"><a href="https://mangakatana.com/manga/hot.1/c48">Chapter 48</a></div></div>
        </div></div>`,
      },
    ]);
    expect(await mangakatana.list(src, 'popular', 1)).toEqual({
      items: [
        {
          url: 'https://mangakatana.com/manga/hot.1',
          title: 'Hot One',
          cover: 'https://mangakatana.com/imgs/cover/h.webp',
          subtitle: 'Chapter 48',
        },
      ],
      hasNext: false,
    });
    expect(await mangakatana.list(src, 'popular', 2)).toEqual({ items: [], hasNext: false });
    expect(calls).toHaveLength(1);
  });

  test('search: nhiều kết quả, một kết quả (chuyển thẳng tới truyện), không có (404)', async () => {
    const { calls } = mockFetch([
      { match: url => url.includes('search=solo%20hero'), body: DETAIL_PAGE },
      { match: url => url.includes('search=zzz'), status: 404, body: '<title>404</title>' },
      { match: urlStarts('https://mangakatana.com/page/'), body: LIST_PAGE },
    ]);
    const many = await mangakatana.search(src, 'one', 2);
    expect(calls[0].url).toBe('https://mangakatana.com/page/2?search=one&search_by=m_name');
    expect(many.items).toHaveLength(2);
    expect(many.hasNext).toBe(true);

    expect(await mangakatana.search(src, 'solo hero', 1)).toEqual({
      items: [
        {
          url: MANGA_URL,
          title: 'Solo Hero',
          cover: 'https://mangakatana.com/imgs/cover/solo.jpg',
          subtitle: 'Chapter 12',
        },
      ],
      hasNext: false,
    });
    expect(await mangakatana.search(src, 'zzz', 1)).toEqual({ items: [], hasNext: false });
  });

  test('genres lấy từ /genres; byGenre lọc include + sort', async () => {
    const { calls } = mockFetch([
      {
        match: urlIs('https://mangakatana.com/genres'),
        body: `<a href="https://mangakatana.com/genre/slice-of-life">Slice of Life</a>
          <a href="https://mangakatana.com/genre/action">Action</a> <span>(6430)</span>
          <a href="https://mangakatana.com/genre/action">Action</a>`,
      },
      { match: urlStarts('https://mangakatana.com/manga/page/'), body: LIST_PAGE },
    ]);
    const genres = await mangakatana.genres(src);
    expect(genres).toEqual([
      { id: 'action', name: 'Action' },
      { id: 'slice-of-life', name: 'Slice of Life' },
    ]);
    await mangakatana.byGenre(src, genres[0], 'az', 3);
    expect(calls[1].url).toBe(
      `https://mangakatana.com/manga/page/3?filter=1&include=action&chapters=1&order=az&${EXCLUDE}`,
    );
    await mangakatana.byGenre(src, { id: 'adult', name: 'Adult' }, 'popular', 1);
    expect(calls[2].url).toBe(
      'https://mangakatana.com/manga/page/1?filter=1&include=adult&chapters=1&order=latest&exclude=erotica_loli_shota_sexual-violence',
    );
  });

  test('detail đọc thông tin, toàn bộ chương và truyện tương tự', async () => {
    mockFetch([{ match: urlIs(MANGA_URL), body: DETAIL_PAGE }]);
    const detail = await mangakatana.detail(src, MANGA_URL);
    expect(detail).toMatchObject({
      url: MANGA_URL,
      title: 'Solo Hero',
      altTitles: ['Hero Solo', '솔로 히어로'],
      cover: 'https://mangakatana.com/imgs/cover/solo.jpg',
      description: 'First line.\n\nSecond line.',
      status: 'Ongoing',
      authors: ['Kim'],
      genres: [
        { id: 'action', name: 'Action' },
        { id: 'adult', name: 'Adult' },
      ],
      nsfw: true,
    });
    expect(detail.chapters).toEqual([
      {
        url: `${MANGA_URL}/c12`,
        name: 'Chapter 12: The End',
        date: 'Oct-03-2026',
        time: new Date(2026, 9, 3).getTime(),
        number: 12,
      },
      {
        url: `${MANGA_URL}/c11.5`,
        name: 'Extra Story',
        date: 'Jan-19-2025',
        time: new Date(2025, 0, 19).getTime(),
        number: 11.5,
      },
      expect.objectContaining({ url: `${MANGA_URL}/v1c1`, number: 1 }),
    ]);
    expect(detail.similar).toEqual([
      {
        url: 'https://mangakatana.com/manga/other.404',
        title: 'Other',
        cover: 'https://mangakatana.com/imgs/cover/o.webp',
        subtitle: 'Chapter 5',
      },
    ]);
  });

  test('detail thử lại khi máy chủ trả body rỗng', async () => {
    jest.useFakeTimers();
    let hits = 0;
    const { calls } = mockFetch([
      { match: url => url === MANGA_URL && hits++ === 0, body: '' },
      { match: urlIs(MANGA_URL), body: DETAIL_PAGE },
    ]);
    const pending = mangakatana.detail(src, MANGA_URL);
    await jest.advanceTimersByTimeAsync(1500);
    expect((await pending).title).toBe('Solo Hero');
    expect(calls).toHaveLength(2);
  });

  test('chapter chọn đúng mảng ảnh thật, bỏ mảng mồi nhử', async () => {
    const chapterUrl = `${MANGA_URL}/c12`;
    const { calls } = mockFetch([{ match: urlIs(chapterUrl), body: CHAPTER_PAGE }]);
    const content = await mangakatana.chapter(src, chapterUrl);
    expect((calls[0].init?.headers as Record<string, string>).Referer).toBe(MANGA_URL);
    const headers = { Referer: 'https://mangakatana.com/' };
    expect(content).toEqual({
      kind: 'images',
      title: 'Chapter 12: The End',
      pages: [
        { uri: 'https://i1.mangakatana.com/token/aa/0.jpg', headers },
        { uri: 'https://i1.mangakatana.com/token/bb/1.jpg', headers },
        { uri: 'https://i1.mangakatana.com/token/cc/2.jpg', headers },
      ],
    });
  });

  test('chapter đổi tên biến: chọn mảng có số phần tử khớp số trang', async () => {
    const chapterUrl = `${MANGA_URL}/c12`;
    const html = `<div id="imgs">${wraps(2)}</div><script>
      var qq=['https://i1.mangakatana.com/x/0.jpg','https://i1.mangakatana.com/x/1.jpg','https://i1.mangakatana.com/x/2.jpg'];
      var rr=["https://i1.mangakatana.com/real/0.jpg","https://i1.mangakatana.com/real/1.jpg"];
    </script>`;
    mockFetch([{ match: urlIs(chapterUrl), body: html }]);
    const content = await mangakatana.chapter(src, chapterUrl);
    expect(content.kind === 'images' && content.pages.map(p => p.uri)).toEqual([
      'https://i1.mangakatana.com/real/0.jpg',
      'https://i1.mangakatana.com/real/1.jpg',
    ]);
  });

  test('chapter không có ảnh thì báo lỗi', async () => {
    mockFetch([{ match: urlStarts(MANGA_URL), body: '<div id="imgs"></div><script>var a = 1;</script>' }]);
    await expect(mangakatana.chapter(src, `${MANGA_URL}/c12`)).rejects.toThrow('Không tìm thấy ảnh');
  });

  test('classifyUrl và resolveMangaUrl', async () => {
    expect(mangakatana.classifyUrl(src, 'https://mangakatana.com/')).toBe('list');
    expect(mangakatana.classifyUrl(src, 'https://mangakatana.com/manga')).toBe('list');
    expect(mangakatana.classifyUrl(src, 'https://mangakatana.com/manga/page/2?order=latest&filter=1')).toBe('list');
    expect(mangakatana.classifyUrl(src, 'https://mangakatana.com/latest/page/3')).toBe('list');
    expect(mangakatana.classifyUrl(src, 'https://mangakatana.com/genre/action')).toBe('list');
    expect(mangakatana.classifyUrl(src, 'https://mangakatana.com/page/2?search=one&search_by=m_name')).toBe('list');
    expect(mangakatana.classifyUrl(src, MANGA_URL)).toBe('detail');
    expect(mangakatana.classifyUrl(src, `${MANGA_URL}/c56`)).toBe('chapter');
    expect(mangakatana.classifyUrl(src, `${MANGA_URL}/v1c3`)).toBe('chapter');
    expect(mangakatana.classifyUrl(src, `${MANGA_URL}/download`)).toBeNull();
    expect(mangakatana.classifyUrl(src, 'https://mangakatana.com/manga/no-id-here')).toBeNull();
    expect(mangakatana.classifyUrl(src, 'https://mangakatana.com/profile')).toBeNull();

    const { calls } = mockFetch([]);
    expect(await mangakatana.resolveMangaUrl(src, `${MANGA_URL}/c56`)).toBe(MANGA_URL);
    expect(calls).toHaveLength(0);
    expect(await mangakatana.resolveMangaUrl(src, 'https://mangakatana.com/read?id=1', CHAPTER_PAGE)).toBe(MANGA_URL);
  });
});
