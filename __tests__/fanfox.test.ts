import type { SourceConfig } from '../src/sources/types';
import { sourceEngine } from './helpers/addons';
import { mockFetch, urlIs, urlStarts } from './helpers/mockFetch';

const fanfox = sourceEngine('fanfox');

const src: SourceConfig = {
  id: 'fanfox.net',
  engine: 'fanfox',
  name: 'Manga Fox',
  baseUrl: 'https://m.fanfox.net',
  content: 'manga',
  lang: 'en',
  nsfw: false,
  enabled: true,
  addedAt: 0,
};

// Thư mục desktop (fanfox.net/directory) — rút gọn.
const DIRECTORY = `
<ul class="manga-list-1-list line">
  <li>
    <a href="/manga/solo_hero/" title="Solo Hero"><img class="manga-list-1-cover" src="https://fmcdn.mfcdn.net/store/manga/1/cover.jpg?token=a&amp;ttl=1"></a>
    <p class="manga-list-1-item-title"><a href="/manga/solo_hero/" title="Solo Hero: The Very Long Title">Solo Hero: The Very...</a></p>
    <p class="manga-list-1-item-subtitle"><a href="/manga/solo_hero/v01/c003/1.html"> Vol.01 Ch.003 </a></p>
  </li>
  <li>
    <a href="/manga/second/" title="Second"><img class="manga-list-1-cover" src="//fmcdn.mfcdn.net/store/manga/2/cover.jpg"></a>
    <p class="manga-list-1-item-title"><a href="/manga/second/" title="Second">Second</a></p>
  </li>
</ul>
<div class="pager-list"><div class="pager-list-left">
  <a href="/directory/?rating">&lt;</a><a href="/directory/?rating">1</a><a class="active" href="javascript:void(0)">2</a>
  <a href="/directory/3.html?rating">3</a><a href="/directory/3.html?rating">&gt;</a>
</div></div>`;

const DIRECTORY_LAST = `
<ul class="manga-list-1-list line">
  <li><p class="manga-list-1-item-title"><a href="/manga/last_one/" title="Last One">Last One</a></p></li>
</ul>
<div class="pager-list"><a href="/directory/142.html">&lt;</a><a class="active" href="javascript:void(0)">143</a><a href="javascript:void(0)">&gt;</a></div>`;

// Danh sách của bản mobile (tìm kiếm, trạng thái, thể loại).
const MOBILE_LIST = `
<ul class="post-list">
  <li><div class="post-one clearfix"><a href="https://m.fanfox.net/manga/solo_leveling">
    <span class="cover"><img src="//fmcdn.mfcdn.net/store/manga/29037/cover.jpg?token=x" onerror="this.src='//m.fanfox.net/mobile/images/nopicture.jpg'" title="Solo Leveling"></span>
    <div class="cover-info"><p class="title">Solo Leveling</p><p>Shounen, Action</p><p>Status:Completed </p><p>Rank: 19798th</p></div>
  </a></div></li>
  <li><div class="post-one clearfix"><a href="https://m.fanfox.net/manga/a_very_long_name">
    <span class="cover"><img src="//fmcdn.mfcdn.net/store/manga/2/cover.jpg" title="A Very Long Name Indeed"></span>
    <div class="cover-info"><p class="title">A Very Long...</p><p>Drama</p></div>
  </a></div></li>
</ul>
<div class="more-list" id="Pagenav"><span><a href="https://m.fanfox.net/search?k=solo&amp;page=2" class="next"></a></span></div>`;

const DETAIL = `
<div class="manga-detail">
  <div class="manga-detail-top clearfix">
    <p class="title">Regression of the Yong Clan Heir</p>
    <img src="//fmcdn.mfcdn.net/store/manga/47166/cover.jpg?token=c" title="Regression of the Yong Clan Heir">
    <div class="detail-info">
      <p>Author(s): <a href="https://m.fanfox.net/search/author/Gunju">Gunju</a></p>
      <p>Status:  Ongoing </p>
      <p>Rank: 1873th <a href="/comments">Comments</a></p>
      <p><a href=" //m.fanfox.net/manga/regression_of_the_yong_clan_heir/c001/1.html " class="button-two">Start<br />Reading</a></p>
    </div>
  </div>
  <div class="manga-chapters">
    <dl><dt class="chtitle"><span>Volume 02</span>Chapter 2-3</dt>
      <dd class="chlist">
        <a href="//m.fanfox.net/manga/regression_of_the_yong_clan_heir/v02/c003/1.html">Ch 3 <span class="newch">new</span><span style="float: right">Oct 3, 2026</span></a>
        <a href="//m.fanfox.net/manga/regression_of_the_yong_clan_heir/v02/c002.5/1.html">Ch 2.5 &nbsp;<span style="float: right">2 days ago</span></a>
      </dd></dl>
    <dl><dt class="chtitle"><span>Volume Not Available</span>Chapter 1</dt>
      <dd class="chlist"><a href="//m.fanfox.net/manga/regression_of_the_yong_clan_heir/c001/1.html">Ch 1 <span style="float: right">Mar 31, 2026</span></a></dd></dl>
  </div>
  <div class="manga-genres"><ul>
    <li><a href="https://m.fanfox.net/search/cate/martial-arts"><i><em></em></i>Martial Arts</a></li>
    <li><a href="https://m.fanfox.net/search/cate/mature"><i><em></em></i>Mature</a></li>
  </ul></div>
  <div class="manga-summary"> Yong Hwarin travels back&#x2026;! </div>
</div>`;

const ROLL = `
<header class="header fixed-header"><a href="//m.fanfox.net/manga/regression_of_the_yong_clan_heir/"></a>
  <div class="mangaread-title"><div class="fb-like"></div> Ch57</div></header>
<div id="viewer">
  <img data-original="//zjcdn.mangafox.me/store/manga/47166/057.0/compressed/o001.jpg?token=a&amp;ttl=1" src="//m.fanfox.net/mobile/images/MF-Loading380x380.gif" class="reader-page">
  <img data-original="//zjcdn.mangafox.me/store/manga/47166/057.0/compressed/o002.jpg?token=b&amp;ttl=1" src="//m.fanfox.net/mobile/images/MF-Loading380x380.gif" class="reader-page">
</div>`;

const pagedChapter = (n: number) => `
<div id="viewer"><img src="//zjcdn.mangafox.me/store/manga/9/001.0/compressed/p${n}.jpg" id="image"></div>
<select>
  <option value="//m.fanfox.net/manga/old_one/c001/1.html" selected>1</option>
  <option value="//m.fanfox.net/manga/old_one/c001/2.html">2</option>
  <option value="//m.fanfox.net/manga/old_one/c001/3.html">3</option>
</select>`;

describe('fanfox engine', () => {
  test('list đọc thư mục desktop theo thứ tự + trang và nhận biết trang cuối', async () => {
    const { calls } = mockFetch([
      { match: urlIs('https://fanfox.net/directory/2.html?rating'), body: DIRECTORY },
      { match: urlIs('https://fanfox.net/directory/143.html?latest'), body: DIRECTORY_LAST },
      { match: urlStarts('https://fanfox.net/directory/'), body: DIRECTORY },
    ]);
    const page = await fanfox.list(src, 'rating', 2);
    expect(page.hasNext).toBe(true);
    expect(page.items).toEqual([
      {
        url: 'https://m.fanfox.net/manga/solo_hero',
        title: 'Solo Hero: The Very Long Title',
        cover: 'https://fmcdn.mfcdn.net/store/manga/1/cover.jpg?token=a&ttl=1',
        subtitle: 'Vol.01 Ch.003',
      },
      {
        url: 'https://m.fanfox.net/manga/second',
        title: 'Second',
        cover: 'https://fmcdn.mfcdn.net/store/manga/2/cover.jpg',
        subtitle: undefined,
      },
    ]);

    const last = await fanfox.list(src, 'latest', 143);
    expect(last.hasNext).toBe(false);
    expect(last.items.map(i => i.url)).toEqual(['https://m.fanfox.net/manga/last_one']);

    await fanfox.list(src, 'popular', 1);
    await fanfox.byGenre(src, { id: 'martial-arts', name: 'Martial Arts' }, 'az', 3);
    expect(calls.map(c => c.url).slice(2)).toEqual([
      'https://fanfox.net/directory/',
      'https://fanfox.net/directory/martial-arts/3.html?az',
    ]);
  });

  test('list quay về danh sách mobile khi thư mục desktop lỗi', async () => {
    const { calls } = mockFetch([
      { match: urlStarts('https://fanfox.net/'), status: 500, body: 'error' },
      { match: urlIs('https://m.fanfox.net/search/status/updated/?page=1'), body: MOBILE_LIST },
    ]);
    const page = await fanfox.list(src, 'latest', 1);
    expect(page.items).toHaveLength(2);
    expect(calls.map(c => c.url)).toEqual([
      'https://fanfox.net/directory/?latest',
      'https://m.fanfox.net/search/status/updated/?page=1',
    ]);
  });

  test('search dùng bản mobile, lấy tên đầy đủ từ title của ảnh', async () => {
    const { calls } = mockFetch([{ match: urlStarts('https://m.fanfox.net/search?'), body: MOBILE_LIST }]);
    const page = await fanfox.search(src, ' solo leveling ', 2);
    expect(calls[0].url).toBe('https://m.fanfox.net/search?k=solo%20leveling&page=2');
    expect(page.hasNext).toBe(true);
    expect(page.items).toEqual([
      {
        url: 'https://m.fanfox.net/manga/solo_leveling',
        title: 'Solo Leveling',
        cover: 'https://fmcdn.mfcdn.net/store/manga/29037/cover.jpg?token=x',
        subtitle: 'Shounen, Action',
      },
      {
        url: 'https://m.fanfox.net/manga/a_very_long_name',
        title: 'A Very Long Name Indeed',
        cover: 'https://fmcdn.mfcdn.net/store/manga/2/cover.jpg',
        subtitle: 'Drama',
      },
    ]);

    mockFetch([{ match: urlStarts('https://m.fanfox.net/search?'), body: '<ul class="post-list"></ul>' }]);
    expect(await fanfox.search(src, 'zzz', 1)).toEqual({ items: [], hasNext: false });
  });

  test('genres lấy từ trang tìm kiếm, bỏ mục "All"', async () => {
    mockFetch([
      {
        match: urlIs('https://m.fanfox.net/search'),
        body: `<a href="https://m.fanfox.net/search/cate/all">All</a>
          <a href="https://m.fanfox.net/search/cate/school-life">School Life</a>
          <a href="https://m.fanfox.net/search/cate/action">Action</a>
          <a href="https://m.fanfox.net/search/status/new">New</a>`,
      },
    ]);
    expect(await fanfox.genres(src)).toEqual([
      { id: 'action', name: 'Action' },
      { id: 'school-life', name: 'School Life' },
    ]);
  });

  test('detail đọc bản mobile kể cả khi mở từ URL desktop', async () => {
    const now = Date.now();
    const { calls } = mockFetch([
      { match: urlIs('https://m.fanfox.net/manga/regression_of_the_yong_clan_heir'), body: DETAIL },
    ]);
    const detail = await fanfox.detail(src, 'https://fanfox.net/manga/regression_of_the_yong_clan_heir/');
    expect(calls).toHaveLength(1);
    expect(detail.url).toBe('https://m.fanfox.net/manga/regression_of_the_yong_clan_heir');
    expect(detail.title).toBe('Regression of the Yong Clan Heir');
    expect(detail.cover).toBe('https://fmcdn.mfcdn.net/store/manga/47166/cover.jpg?token=c');
    expect(detail.authors).toEqual(['Gunju']);
    expect(detail.status).toBe('Ongoing');
    expect(detail.views).toBe('Hạng #1873');
    expect(detail.description).toBe('Yong Hwarin travels back…!');
    expect(detail.genres).toEqual([
      { id: 'martial-arts', name: 'Martial Arts' },
      { id: 'mature', name: 'Mature' },
    ]);
    expect(detail.nsfw).toBe(true);
    expect(detail.chapters.map(c => [c.url, c.name, c.number, c.date])).toEqual([
      ['https://m.fanfox.net/manga/regression_of_the_yong_clan_heir/v02/c003/1.html', 'Vol.02 Ch 3', 3, 'Oct 3, 2026'],
      ['https://m.fanfox.net/manga/regression_of_the_yong_clan_heir/v02/c002.5/1.html', 'Vol.02 Ch 2.5', 2.5, '2 days ago'],
      ['https://m.fanfox.net/manga/regression_of_the_yong_clan_heir/c001/1.html', 'Ch 1', 1, 'Mar 31, 2026'],
    ]);
    expect(detail.chapters[0].time).toBe(new Date(2026, 9, 3).getTime());
    expect(Math.abs((detail.chapters[1].time ?? 0) - (now - 2 * 86_400_000))).toBeLessThan(60_000);
  });

  test('chapter đọc trang cuộn roll_manga, bỏ ảnh "đang tải", gửi Referer', async () => {
    const { calls } = mockFetch([
      {
        match: urlIs('https://m.fanfox.net/roll_manga/regression_of_the_yong_clan_heir/c057/1.html'),
        body: ROLL,
      },
    ]);
    const content = await fanfox.chapter(src, 'https://fanfox.net/manga/regression_of_the_yong_clan_heir/c057/5.html');
    expect(calls).toHaveLength(1);
    const headers = { Referer: 'https://m.fanfox.net/' };
    expect(content).toEqual({
      kind: 'images',
      title: 'Ch57',
      pages: [
        { uri: 'https://zjcdn.mangafox.me/store/manga/47166/057.0/compressed/o001.jpg?token=a&ttl=1', headers },
        { uri: 'https://zjcdn.mangafox.me/store/manga/47166/057.0/compressed/o002.jpg?token=b&ttl=1', headers },
      ],
    });
  });

  test('chapter tải từng trang khi trang cuộn trống', async () => {
    const { calls } = mockFetch([
      { match: urlStarts('https://m.fanfox.net/roll_manga/'), body: '<div id="viewer"></div>' },
      { match: urlIs('https://m.fanfox.net/manga/old_one/c001/1.html'), body: pagedChapter(1) },
      { match: urlIs('https://m.fanfox.net/manga/old_one/c001/2.html'), body: pagedChapter(2) },
      { match: urlIs('https://m.fanfox.net/manga/old_one/c001/3.html'), body: pagedChapter(3) },
    ]);
    const content = await fanfox.chapter(src, 'https://m.fanfox.net/manga/old_one/c001/2.html');
    expect(content.kind === 'images' && content.pages.map(p => p.uri.replace(/^.*\//, ''))).toEqual([
      'p1.jpg',
      'p2.jpg',
      'p3.jpg',
    ]);
    expect(calls).toHaveLength(4);
  });

  test('chapter báo lỗi rõ ràng với truyện đã bị cấp phép', async () => {
    mockFetch([
      {
        match: urlStarts('https://m.fanfox.net/roll_manga/'),
        body: '<div class="mangaread-main">Sorry, it’s licensed and not available.</div>',
      },
    ]);
    await expect(fanfox.chapter(src, 'https://m.fanfox.net/manga/naruto/v72/c700/1.html')).rejects.toThrow(
      'cấp phép bản quyền',
    );
  });

  test('classifyUrl và resolveMangaUrl cho cả bản mobile lẫn desktop', async () => {
    const cases: [string, string | null][] = [
      ['https://m.fanfox.net/', 'list'],
      ['https://m.fanfox.net/search/status/updated/?page=1', 'list'],
      ['https://m.fanfox.net/search?k=solo', 'list'],
      ['https://fanfox.net/directory/action/2.html?latest', 'list'],
      ['https://m.fanfox.net/manga/regression_of_the_yong_clan_heir', 'detail'],
      ['https://fanfox.net/manga/regression_of_the_yong_clan_heir/', 'detail'],
      ['https://m.fanfox.net/roll_manga/regression_of_the_yong_clan_heir/c057/1.html', 'chapter'],
      ['https://m.fanfox.net/manga/regression_of_the_yong_clan_heir/c057/3.html', 'chapter'],
      ['https://fanfox.net/manga/onepunch_man/vTBD/c238/1.html', 'chapter'],
      ['https://m.fanfox.net/manga/regression_of_the_yong_clan_heir/comments', null],
      ['https://m.fanfox.net/bookmark', null],
    ];
    for (const [url, kind] of cases) {
      expect([url, fanfox.classifyUrl(src, url)]).toEqual([url, kind]);
    }
    expect(
      await fanfox.resolveMangaUrl(src, 'https://m.fanfox.net/roll_manga/regression_of_the_yong_clan_heir/c057/1.html'),
    ).toBe('https://m.fanfox.net/manga/regression_of_the_yong_clan_heir');
    expect(await fanfox.resolveMangaUrl(src, 'https://fanfox.net/manga/onepunch_man/vTBD/c238/1.html')).toBe(
      'https://m.fanfox.net/manga/onepunch_man',
    );
    expect(fanfox.imageHeaders(src)).toEqual({ Referer: 'https://m.fanfox.net/' });
  });
});
