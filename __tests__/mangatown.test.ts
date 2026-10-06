import type { SourceConfig } from '../src/sources/types';
import { sourceEngine } from './helpers/addons';
import { mockFetch, urlIs, urlStarts } from './helpers/mockFetch';

const mangatown = sourceEngine('mangatown');

const src: SourceConfig = {
  id: 'mangatown.com',
  engine: 'mangatown',
  name: 'MangaTown',
  baseUrl: 'https://m.mangatown.com',
  content: 'manga',
  lang: 'en',
  nsfw: false,
  enabled: true,
  addedAt: 0,
};

const item = (slug: string, title: string, shown: string, latest: string) => `
<li><div class="post clearfix">
  <a rel="${title}" class="manga-cover" href="/manga/${slug}"><img src="https://fmcdn.mangahere.com/store/manga/1/${slug}.jpg?token=t&amp;ttl=1" onerror="this.src = '//static.mangatown.com/images/manga_cover.jpg'"></a>
  <a href="/manga/${slug}"><div class="post-info"><p class="title">${shown}</p><p>Shounen,Action</p><p>Views:125362</p></div></a>
  <a href="/manga/${slug}/c068" class="read-btn"><i class="book-icon iconfont"></i> ${latest}</a>
</div></li>`;

const LISTING = `
<ul class="post-list">
  ${item('the_dark_swordsman_returns', 'The Dark Swordsman Returns', 'The Dark Swordsman Ret...', 'C.068')}
  ${item('under_ninja', 'Under Ninja', 'Under Ninja', 'C.171')}
</ul>
<div class="page-nav"><a href="javascript:">PREV</a><select><option value="/directory/0-0-0-0-0-0/1.html" selected>1/9</option></select><a href="/directory/0-0-0-0-0-0/2.html?last_chapter_time.za">NEXT</a></div>`;

const LAST_PAGE = `
<ul class="post-list">${item('cook', 'Cook', 'Cook', 'C.1')}</ul>
<div class="page-nav"><a href="/directory/0-0-0-0-0-0/4.html">PREV</a><a href="javascript:">NEXT</a></div>`;

const DIRECTORY_FILTERS = `
<ul class="directory-sequence">
  <li><a href="/directory/0-0-0-0-0-0" class="select">All</a><a href="/directory/0-0-0-completed-0-0">Completed</a></li>
  <li><a href="/directory/josei-0-0-0-0-0">Josei</a><a href="/directory/shounen_ai-0-0-0-0-0">Shounen Ai</a></li>
  <li><a href="/directory/0-action-0-0-0-0">Action</a><a href="/directory/0-martial_arts-0-0-0-0">Martial Arts</a></li>
  <li><a href="/directory/0-0-0-0-a-0?last_chapter_time.za">A</a></li>
</ul>
<a href="/directory/?rating.za">Rating</a>`;

const DETAIL = `
<div class="manga-detail">
  <div class="manga-detail-top">
    <div class="title">Regression of the Yong Clan Heir</div>
    <div class="clearfix">
      <img src="https://fmcdn.mangahere.com/store/manga/46779/ocover.jpg?token=c&amp;ttl=1" class="detail-cover">
      <div class="detail-info">
        <p><span class="star-score"><i class="score-number">4<em>.5</em></i></span></p>
        <p><span>Author(s): </span><a href="/author/Gunju">Gunju</a></p>
        <p><span>Artist(s): </span><span class="mobile-none"><a href="/artist/Mukji">Mukji</a></span></p>
        <p><span>Status: </span> Ongoin</p>
        <p><span>Rank: </span>29877th</p>
      </div>
    </div>
  </div>
  <div class="detail-info-middle">
    <p><span>Alternative Name:</span> 天中龍門;천중용문 </p>
    <p><span>Genre(s):</span> <a href="/directory/0-drama-0-0-0-0/">Drama</a> <a href="/directory/0-smut-0-0-0-0/">Smut</a></p>
    <p><span>Demographic:</span> <a href="/directory/shounen-0-0-0-0-0/">Shounen</a></p>
    <p><span>Summary:</span><br><span id="hide">Yong Hwarin...<a class="btn-one">MORE</a></span>
      <span id="show" style="display: none;">Yong Hwarin travels back to the past.&nbsp;<a class="btn-one">HIDE</a></span></p>
  </div>
</div>
<ul class="detail-ch-list">
  <li><a href="/manga/regression_of_the_yong_clan_heir/c060/" name>C.60 <span class="update"></span> <span class="time">Yesterday Oct 04,2026</span></a></li>
  <li><a href="/manga/regression_of_the_yong_clan_heir/c059.5/" name="59.5">C.59.5 <span class="vol">Side Story</span> <span class="time">Oct 03,2026</span></a></li>
  <li><a href="/manga/regression_of_the_yong_clan_heir/c000/" name>C. <span class="time">Apr 01,2026</span></a></li>
</ul>`;

const WEBTOON_CHAPTER = `
<div class="title"><a href="/manga/regression_of_the_yong_clan_heir/c057/">Regression of the Yong Clan Heir 057.0 Page 1</a> / <a href="/manga/regression_of_the_yong_clan_heir/">Regression of the Yong Clan Heir Manga</a></div>
<div class="mangaread-img" id="viewer">
  <img src="//zjcdn.mangahere.org/store/manga/46779/057.0/compressed/d001.jpg" class="image">
  <img src="//zjcdn.mangahere.org/store/manga/46779/057.0/compressed/d002.jpg" class="image">
</div>`;

const PAGE_OPTIONS = [1, 2, 3, 4, 5]
  .map(n => `<option value="/manga/black_clover/c392/${n > 1 ? `${n}.html` : ''}">${n}</option>`)
  .join('');

const pagedChapter = (n: number) => `
<div class="title"><a href="/manga/black_clover/c392/">Black Clover 392.0 Page ${n}</a> / <a href="/manga/black_clover/">Black Clover Manga</a></div>
<select class="page-select" id="top_chapter_list"></select>
<div class="mangaread-img" id="viewer"><a href="/manga/black_clover/c392/${n + 1}.html"><img src="//zjcdn.mangahere.org/store/manga/17375/392.0/compressed/op_00${n}.jpg" id="image"></a></div>
<select>${PAGE_OPTIONS}</select><select class="index-page">${PAGE_OPTIONS}</select>`;

describe('mangatown engine', () => {
  test('list dựng URL thư mục theo thứ tự + trang, lấy tên đầy đủ từ rel', async () => {
    const { calls } = mockFetch([{ match: urlStarts('https://m.mangatown.com/directory/'), body: LISTING }]);
    const page = await mangatown.list(src, 'latest', 1);
    expect(calls[0].url).toBe('https://m.mangatown.com/directory/0-0-0-0-0-0/1.html?last_chapter_time.za');
    expect(page).toEqual({
      hasNext: true,
      items: [
        {
          url: 'https://m.mangatown.com/manga/the_dark_swordsman_returns',
          title: 'The Dark Swordsman Returns',
          cover: 'https://fmcdn.mangahere.com/store/manga/1/the_dark_swordsman_returns.jpg?token=t&ttl=1',
          subtitle: 'C.068',
        },
        {
          url: 'https://m.mangatown.com/manga/under_ninja',
          title: 'Under Ninja',
          cover: 'https://fmcdn.mangahere.com/store/manga/1/under_ninja.jpg?token=t&ttl=1',
          subtitle: 'C.171',
        },
      ],
    });

    await mangatown.list(src, 'popular', 2);
    await mangatown.list(src, 'rating', 3);
    await mangatown.list(src, 'az', 1);
    await mangatown.byGenre(src, { id: '0-martial_arts-0-0-0-0', name: 'Martial Arts' }, 'popular', 4);
    expect(calls.slice(1).map(c => c.url)).toEqual([
      'https://m.mangatown.com/directory/0-0-0-0-0-0/2.html?views.za',
      'https://m.mangatown.com/directory/0-0-0-0-0-0/3.html?rating.za',
      'https://m.mangatown.com/directory/0-0-0-0-0-0/1.html?name.az',
      'https://m.mangatown.com/directory/0-martial_arts-0-0-0-0/4.html?views.za',
    ]);
  });

  test('hasNext = false ở trang cuối (NEXT là javascript:)', async () => {
    mockFetch([{ match: urlStarts('https://m.mangatown.com/directory/'), body: LAST_PAGE }]);
    const page = await mangatown.byGenre(src, { id: '0-cooking-0-0-0-0', name: 'Cooking' }, 'latest', 5);
    expect(page.hasNext).toBe(false);
    expect(page.items).toHaveLength(1);
  });

  test('search: trang 1 là /search?name=, các trang sau là /search/<n>.htm', async () => {
    const { calls } = mockFetch([{ match: urlStarts('https://m.mangatown.com/search'), body: LISTING }]);
    const page = await mangatown.search(src, 'solo leveling', 1);
    await mangatown.search(src, 'solo leveling', 2);
    expect(page.items).toHaveLength(2);
    expect(calls.map(c => c.url)).toEqual([
      'https://m.mangatown.com/search?name=solo%20leveling',
      'https://m.mangatown.com/search/2.htm?name=solo%20leveling',
    ]);
  });

  test('genres gồm đối tượng + thể loại, bỏ lọc trạng thái/chữ cái', async () => {
    mockFetch([{ match: urlIs('https://m.mangatown.com/directory/'), body: DIRECTORY_FILTERS }]);
    expect(await mangatown.genres(src)).toEqual([
      { id: '0-action-0-0-0-0', name: 'Action' },
      { id: 'josei-0-0-0-0-0', name: 'Josei' },
      { id: '0-martial_arts-0-0-0-0', name: 'Martial Arts' },
      { id: 'shounen_ai-0-0-0-0-0', name: 'Shounen Ai' },
    ]);
  });

  test('detail đọc đủ thông tin, chương mới nhất trước', async () => {
    const { calls } = mockFetch([
      { match: urlIs('https://m.mangatown.com/manga/regression_of_the_yong_clan_heir'), body: DETAIL },
    ]);
    const detail = await mangatown.detail(src, 'https://www.mangatown.com/manga/regression_of_the_yong_clan_heir/');
    expect(calls).toHaveLength(1);
    expect(detail).toMatchObject({
      url: 'https://m.mangatown.com/manga/regression_of_the_yong_clan_heir',
      title: 'Regression of the Yong Clan Heir',
      altTitles: ['天中龍門', '천중용문'],
      cover: 'https://fmcdn.mangahere.com/store/manga/46779/ocover.jpg?token=c&ttl=1',
      description: 'Yong Hwarin travels back to the past.',
      status: 'Ongoing',
      authors: ['Gunju', 'Mukji'],
      genres: [
        { id: '0-drama-0-0-0-0', name: 'Drama' },
        { id: '0-smut-0-0-0-0', name: 'Smut' },
        { id: 'shounen-0-0-0-0-0', name: 'Shounen' },
      ],
      rating: 4.5,
      views: 'Hạng #29877',
      nsfw: true,
    });
    expect(detail.chapters).toEqual([
      {
        url: 'https://m.mangatown.com/manga/regression_of_the_yong_clan_heir/c060/',
        name: 'C.60',
        date: 'Yesterday Oct 04,2026',
        time: new Date(2026, 9, 4).getTime(),
        number: 60,
      },
      {
        url: 'https://m.mangatown.com/manga/regression_of_the_yong_clan_heir/c059.5/',
        name: 'C.59.5 - Side Story',
        date: 'Oct 03,2026',
        time: new Date(2026, 9, 3).getTime(),
        number: 59.5,
      },
      {
        url: 'https://m.mangatown.com/manga/regression_of_the_yong_clan_heir/c000/',
        name: 'C.0',
        date: 'Apr 01,2026',
        time: new Date(2026, 3, 1).getTime(),
        number: 0,
      },
    ]);
  });

  test('chapter kiểu webtoon: đủ ảnh trong một trang, kèm Referer', async () => {
    const { calls } = mockFetch([
      { match: urlIs('https://m.mangatown.com/manga/regression_of_the_yong_clan_heir/c057/'), body: WEBTOON_CHAPTER },
    ]);
    const content = await mangatown.chapter(src, 'https://m.mangatown.com/manga/regression_of_the_yong_clan_heir/c057');
    expect(calls).toHaveLength(1);
    const headers = { Referer: 'https://m.mangatown.com/' };
    expect(content).toEqual({
      kind: 'images',
      title: 'Regression of the Yong Clan Heir 057.0',
      pages: [
        { uri: 'https://zjcdn.mangahere.org/store/manga/46779/057.0/compressed/d001.jpg', headers },
        { uri: 'https://zjcdn.mangahere.org/store/manga/46779/057.0/compressed/d002.jpg', headers },
      ],
    });
  });

  test('chapter mỗi trang một ảnh: tải mọi trang, giữ đúng thứ tự', async () => {
    const { calls } = mockFetch([
      { match: urlIs('https://m.mangatown.com/manga/black_clover/c392/'), body: pagedChapter(1) },
      ...[2, 3, 4, 5].map(n => ({
        match: urlIs(`https://m.mangatown.com/manga/black_clover/c392/${n}.html`),
        body: pagedChapter(n),
      })),
    ]);
    const content = await mangatown.chapter(src, 'https://www.mangatown.com/manga/black_clover/c392/3.html');
    expect(content.kind === 'images' && content.pages.map(p => p.uri.replace(/^.*\//, ''))).toEqual([
      'op_001.jpg',
      'op_002.jpg',
      'op_003.jpg',
      'op_004.jpg',
      'op_005.jpg',
    ]);
    expect(content.title).toBe('Black Clover 392.0');
    expect(calls).toHaveLength(5);
  });

  test('chapter báo lỗi khi không có ảnh', async () => {
    mockFetch([{ match: urlStarts('https://m.mangatown.com/manga/'), body: '<div id="viewer"></div>' }]);
    await expect(mangatown.chapter(src, 'https://m.mangatown.com/manga/x/c001/')).rejects.toThrow(
      'Không tìm thấy ảnh',
    );
  });

  test('classifyUrl và resolveMangaUrl', async () => {
    const cases: [string, string | null][] = [
      ['https://m.mangatown.com/', 'list'],
      ['https://m.mangatown.com/directory/1.html?last_chapter_time.za', 'list'],
      ['https://m.mangatown.com/directory/0-action-0-0-0-0/2.html', 'list'],
      ['https://m.mangatown.com/latest/2.html', 'list'],
      ['https://m.mangatown.com/search?name=solo', 'list'],
      ['https://m.mangatown.com/manga/regression_of_the_yong_clan_heir', 'detail'],
      ['https://www.mangatown.com/manga/regression_of_the_yong_clan_heir/', 'detail'],
      ['https://m.mangatown.com/manga/regression_of_the_yong_clan_heir/c057/', 'chapter'],
      ['https://w.mangatown.com/manga/black_clover/c392/5.html', 'chapter'],
      ['https://m.mangatown.com/manga/some_manga/v01/c001/', 'chapter'],
      ['https://m.mangatown.com/comments/manga/black_clover', null],
    ];
    for (const [url, kind] of cases) {
      expect([url, mangatown.classifyUrl(src, url)]).toEqual([url, kind]);
    }
    expect(
      await mangatown.resolveMangaUrl(src, 'https://m.mangatown.com/manga/regression_of_the_yong_clan_heir/c057/'),
    ).toBe('https://m.mangatown.com/manga/regression_of_the_yong_clan_heir');
    expect(await mangatown.resolveMangaUrl(src, 'https://www.mangatown.com/manga/black_clover/c392/5.html')).toBe(
      'https://m.mangatown.com/manga/black_clover',
    );
    expect(mangatown.imageHeaders(src)).toEqual({ Referer: 'https://m.mangatown.com/' });
  });
});
