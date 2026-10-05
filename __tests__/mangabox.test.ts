import { load } from 'cheerio/slim';

import type { SourceConfig } from '../src/sources/types';
import { sourceEngine } from './helpers/addons';
import { mockFetch, urlIs, urlStarts } from './helpers/mockFetch';

const mangabox = sourceEngine('mangabox');

/** Mỗi test một domain riêng vì engine nhớ kiểu URL của site theo baseUrl. */
const srcOf = (baseUrl: string, mangaDir?: string): SourceConfig => ({
  id: baseUrl.replace(/^https:\/\//, ''),
  engine: 'mangabox',
  name: 'MangaBox Test',
  baseUrl,
  content: 'manga',
  lang: 'en',
  nsfw: false,
  enabled: true,
  addedAt: 0,
  options: mangaDir ? { mangaDir } : undefined,
});

// Đời mới (mangakakalove.com): /manga-list/…, chương qua API, ảnh trong script.
const homeKakalot = (base: string) => `
<nav class="menu-primary">
  <a href="${base}/manga-list/latest-manga">LATEST MANGA</a>
  <a href="${base}/manga-list/hot-manga">HOT MANGA</a>
</nav>
<div id="contentstory"><div class="doreamon">
  <div class="itemupdate first">
    <a class="tooltip cover bookmark_check" href="${base}/manga/solo-hero"><img src="https://cdn.test/thumb/solo-hero.webp"></a>
    <ul><li><h3><a class="tooltip" href="${base}/manga/solo-hero">Solo Hero</a></h3></li></ul>
  </div>
</div></div>
<div class="panel-category"><table><tbody><tr>
  <td><a href="${base}/genre/all?type=latest&state=all&page=1">All</a></td>
  <td><a href="${base}/genre/childhood-friends">Childhood_friends</a></td>
  <td><a href="${base}/genre/action">Action</a></td>
</tr></tbody></table></div>
<script>window.mainSiteUrl = 'https://main.test';</script>`;

const LIST_KAKALOT = `
<div class="comic-list">
  <div class="list-comic-item-wrap">
    <a class="list-story-item bookmark_check cover" href="https://kk.test/manga/solo-hero" title="Solo Hero">
      <img alt="Solo Hero" class="lazy" src="https://cdn.test/thumb/solo-hero.webp" data-src="https://cdn.test/thumb/solo-hero.webp">
    </a>
    <h3><a href="https://kk.test/manga/solo-hero" title="Solo Hero">Solo Hero</a></h3>
    <a class="list-story-item-wrap-chapter" rel="nofollow" href="https://main.test/manga/solo-hero/chapter-12"> Chapter 12 </a>
  </div>
  <div class="list-comic-item-wrap">
    <a class="list-story-item cover" href="https://kk.test/manga/second" title="Second"><img src="https://cdn.test/thumb/second.webp"></a>
    <h3><a href="https://kk.test/manga/second">Second Story</a></h3>
  </div>
</div>
<div class="panel_page_number"><div class="group_page">
  <a href="https://kk.test/manga-list/hot-manga?page=1" class="page_blue">First(1)</a>
  <a href="https://kk.test/manga-list/hot-manga?page=1">1</a>
  <a class="page_select">2</a>
  <a href="https://kk.test/manga-list/hot-manga?page=3">3</a>
  <a href="https://kk.test/manga-list/hot-manga?page=40" class="page_blue page_last">Last(40)</a>
</div></div>`;

const LAST_PAGE_KAKALOT = `
<div class="list-comic-item-wrap"><h3><a href="https://kk.test/manga/last">Last One</a></h3></div>
<div class="panel_page_number"><div class="group_page">
  <a href="https://kk.test/manga-list/hot-manga?page=1" class="page_blue">First(1)</a>
  <a href="https://kk.test/manga-list/hot-manga?page=39">39</a>
  <a class="page_select">40</a>
</div></div>`;

const DETAIL_KAKALOT = `
<div class="breadcrumb breadcrumbs"><p>
  <a href="https://kk.test">Manga Online</a> » <a href="https://kk.test/manga/solo-hero">Solo Hero</a>
</p></div>
<div class="manga-info-top">
  <div class="manga-info-pic"><img src="https://cdn.test/thumb/solo-hero.webp" alt="Solo Hero"></div>
  <div class="manga-info-content">
    <ul class="manga-info-text">
      <li><h1>Solo Hero</h1></li>
      <li>Author(s) : Oda Eiichirou (尾田栄一郎) </li>
      <li>Status : Ongoing</li>
      <li style="display: none;">TransGroup : </li>
      <li>View : 1,463,101,891</li>
      <li class="genres">Genres :
        <a href="https://kk.test/genre/fantasy"> Fantasy </a>,
        <a href="https://kk.test/genre/adult"> Adult </a>
      </li>
      <li><span>Rating : </span><div class="rating" data-default="4.40"></div></li>
      <li><em id="rate_row_cmd"> kk.test rate : 4.40 / 5 - 36 votes </em>
        <script type="application/ld+json">{"ratingValue": "4.40"}</script></li>
    </ul>
  </div>
</div>
<div id="chapter" class="chapter"><div class="manga-info-chapter">
  <div id="chapter-list-container" class="chapter-list-loading"
       data-comic-slug="solo-hero"
       data-api-url="https://kk.test/api/manga/__SLUG__/chapters"
       data-chapter-url-template="https://main.test/manga/__MANGA__/__CHAPTER__">
    <p class="chapter-loading-text">Loading chapters...</p>
  </div>
</div></div>
<div id="contentBox">
  <h2><p style="color: red;">Solo Hero summary: </p></h2>
  You are reading Solo Hero manga, one of the most popular manga covering in Action genres, written by Kim at MangaBuddy. Lets enjoy. If you want to get the updates about latest chapters, lets create an account and add Solo Hero to your bookmark.

  First line of the story.<br>Still the first paragraph.<br><br>Second paragraph.
</div>
<script>window.mainSiteUrl = 'https://main.test';</script>`;

const apiPage = (chapters: object[], hasMore: boolean) => ({
  success: true,
  data: { chapters, pagination: { total: 3, limit: 1000, offset: 0, has_more: hasMore } },
});

const CHAPTER_KAKALOT = `
<h1 class="current-chapter">Solo Hero: Chapter 12</h1>
<div class="panel-option"><span class="pn-op-img-sv">
  <span class="pn-op-sv-img-btn a-h isactive" data-cdn="1">1</span>
  <span class="pn-op-sv-img-btn a-h" data-cdn="2">2</span>
</span></div>
<div class="container-chapter-reader">
  <img src='https://s1.test/solo-hero/12/0.webp' alt='Solo Hero Chapter 12 page 1'><img src='https://s1.test/solo-hero/12/1.webp'>
</div>
<script>
  var cdns = ["https:\\/\\/s1.test\\/", "https:\\/\\/s2.test\\/"];
  var backupImage = [];
  var chapterImages = ["solo-hero\\/12\\/0.webp","solo-hero\\/12\\/1.webp","solo-hero\\/12\\/2.webp"];
</script>`;

// Bản PHP cũ (manganelo.cc): /latest?p=, /series/<slug>, chương ngay trong trang.
const HOME_NELO = `
<nav class="menu-primary"><a href="/">HOME</a><a href="/latest">LATEST MANGA</a><a href="/newest">NEW MANGA</a></nav>
<div class="slide"><div id="owl-demo" class="owl-carousel">
  <div class="item"><img src="/thumbnail/popular-one.webp"><div class="slide-caption">
    <h3><a href="/series/popular-one" title="Popular One">Popular One</a></h3>
    <a href="/chapter/1/popular-one-106" title="Chapter 106">Chapter 106</a>
  </div></div>
</div></div>
<div class="doreamon"><div class="itemupdate first"><a class="tooltip cover" href="/series/popular-one"></a></div></div>
<div class="xem-nhieu"><div class="all">
  <div class="xem-nhieu-item"><h3><a href="/series/top-two" title="Top Two">Top Two - Chapter 40</a></h3></div>
</div></div>
<div class="panel-category"><a href="https://nelo.test/genre/action">Action</a><a href="https://nelo.test/genre/adult">Adult</a></div>`;

const LIST_NELO = `
<div class="truyen-list">
  <div class="panel_page_number"><div class="group_page">
    <a href="https://nelo.test/latest" class="page_blue">First(1)</a>
    <a href="https://nelo.test/latest">1</a><a class="page_select">2</a>
    <a href="https://nelo.test/latest?p=674" class="page_blue page_last">Last(674)</a>
  </div><div class="group_qty"><a class="page_blue">Total: 13,471 stories</a></div></div>
  <div class="list-truyen-item-wrap"><a href="/series/shibuya-near-family" title=""><img src="/thumbnail/shibuya-near-family.webp" alt=""></a><h3><a href="/series/shibuya-near-family" title=""></a></h3><a href="/chapter/2714/shibuya-near-family-121" class="list-story-item-wrap-chapter">Chapter 121: Ikko</a></div>
  <div class="list-truyen-item-wrap"><a href="/series/berserk" title="Berserk"><img src="/thumbnail/berserk.webp" alt="Berserk"></a><h3><a href="/series/berserk" title="Berserk">Berserk</a></h3></div>
</div>`;

const SEARCH_NELO = `
<div class="panel_story_list">
  <div class="story_item"><a href="/series/one-piece"><img src="/thumbnail/one-piece.webp" alt="One Piece"></a>
    <div class="story_item_right"><h3 class="story_name"><a href="/series/one-piece">One Piece</a></h3>
      <em class="story_chapter"><a href="/chapter/3606/one-piece-1140" title="One Piece Chapter 1140">Chapter 1140: Scopper Gyaban</a></em>
    </div>
  </div>
</div>
<div class="panel_page_number"><div class="group_page">
  <a href="https://nelo.test/search/story/one_piece" class="page_blue">First(1)</a>
  <a class="page_select">1</a>
  <a href="https://nelo.test/search/story/one_piece?p=2">2</a>
  <a href="https://nelo.test/search/story/one_piece?p=2" class="page_blue page_last">Last(2)</a>
</div></div>`;

const DETAIL_NELO = `
<div class="breadcrumb breadcrumbs"><p>
  <a href="https://nelo.test/">Manga Online</a> » <a href="/series/hotel">Hotel</a>
</p></div>
<div class="manga-info-top">
  <div class="manga-info-pic"><img src="/thumbnail/hotel.webp" alt="Hotel Metsäpeura"></div>
  <ul class="manga-info-text">
    <li><h1>Hotel Metsäpeura</h1>
      <h2 class="story-alternative">Alternative : Tervetuloa Hotelli ; Welcome to Hotel ; ホテル</h2></li>
    <li>Author(s) : <a href="#fukuta-seira">Fukuta Seira</a></li>
    <li>Status : Ongoing</li>
    <li>Genres : <a href="/genre/drama">Drama</a>, <a href="/genre/smut">Smut</a></li>
  </ul>
</div>
<div id="noidungm"><h2><p style="color: red;">Hotel summary: </p></h2>In the Lapland region of Finland.</div>
<div class="chapter_issue">Maybe coming in the next issue<br><a href="/chapter/2827/hotel-23">Hotel Chapter 23</a></div>
<div id="chapter" class="chapter"><div class="manga-info-chapter">
  <div class="row title-list-chapter"><span>Chapter name</span><span>View</span><span>Time uploaded</span></div>
  <div class="chapter-list">
    <div class="row"><span><a href="/chapter/2827/hotel-22" title="Hotel Vol.4 Chapter 22: Fabi">Vol.4 Chapter 22: Fabi</a></span><span>292,121</span><span title="2025-03-01 12:46:22">March 2025</span></div>
    <div class="row"><span><a href="/chapter/2827/hotel-21.5" title="Hotel Chapter 21.5">Chapter 21.5</a></span><span>6,501</span><span title="2025-02-15 16:40:33">February 2025</span></div>
  </div>
</div></div>`;

const CHAPTER_NELO = `
<div class="breadcrumb breadcrumbs bred_doc"><p>
  <a href="https://nelo.test/">Manga Online</a> » <a href="/series/hotel">Hotel</a> »
  <a href="https://nelo.test/chapter/2827/hotel-22">Vol.4 Chapter 22</a>
</p></div>
<h1 class="current-chapter">Hotel: Chapter 22</h1>
<div class="container-chapter-reader">
<img src="https://img.test/hotel/22/0.webp" alt="page 1"><img src="https://img.test/hotel/22/1.webp" alt="page 2"><img src="https://img.test/hotel/22/0.webp" alt="dup">
</div>`;

// Manganato/MangaBat đời cũ: panel-story-info + row-content-chapter.
const DETAIL_NATO = `
<div class="panel-breadcrumb"><a href="https://nato.test/">Home</a> » <a href="https://chap.nato.test/manga-ab123">Classic Story</a></div>
<div class="panel-story-info">
  <div class="story-info-left"><span class="info-image"><img class="img-loading" src="https://cdn.test/classic.jpg"></span></div>
  <div class="story-info-right">
    <h1>Classic Story</h1>
    <table class="variations-tableInfo"><tbody>
      <tr><td class="table-label"><i class="info-alternative"></i>Alternative :</td><td class="table-value"><h2>Alt One ; Alt Two</h2></td></tr>
      <tr><td class="table-label"><i class="info-author"></i>Author(s) :</td><td class="table-value"><a href="https://nato.test/author/story/a">Author A</a> - <a href="https://nato.test/author/story/b">Author B</a></td></tr>
      <tr><td class="table-label"><i class="info-status"></i>Status :</td><td class="table-value">Completed</td></tr>
      <tr><td class="table-label"><i class="info-genres"></i>Genres :</td><td class="table-value"><a class="a-h" href="https://nato.test/genre-2">Action</a> - <a class="a-h" href="https://nato.test/genre-6">Comedy</a></td></tr>
    </tbody></table>
    <div class="story-info-right-extent">
      <p><span class="stre-label"><i class="info-time"></i>Updated :</span><span class="stre-value">Mar 01,2025 - 12:46 PM</span></p>
      <p><span class="stre-label"><i class="info-view"></i>View :</span><span class="stre-value">1.2M</span></p>
    </div>
    <em id="rate_row_cmd">MangaNato.com rate : 4.6 / 5 - 1234 votes</em>
  </div>
  <div class="panel-story-info-description" id="panel-story-info-description"><h3>Description :</h3>Line one.<br><br>Line two.</div>
</div>
<div class="panel-story-chapter-list"><ul class="row-content-chapter">
  <li class="a-h"><a class="chapter-name" href="https://chap.nato.test/manga-ab123/chapter-2">Chapter 2</a><span class="chapter-view">1,234</span><span class="chapter-time" title="Mar 01,2025 12:46">Mar 01,25</span></li>
  <li class="a-h"><a class="chapter-name" href="https://chap.nato.test/manga-ab123/chapter-1">Chapter 1: Start</a><span class="chapter-view">5,678</span><span class="chapter-time" title="Feb 01,2025 10:00">Feb 01,25</span></li>
</ul></div>`;

describe('mangabox engine', () => {
  test('detect nhận ra trang chủ của cả hai đời, bỏ qua Madara/Themesia', () => {
    expect(mangabox.detect!(homeKakalot('https://kk.test'))).toBe(true);
    expect(mangabox.detect!(HOME_NELO)).toBe(true);
    expect(mangabox.detect!('<div class="panel-content-homepage"><div class="content-homepage-item"></div></div>')).toBe(true);
    expect(mangabox.detect!('<script>_base_url_search = "/search/story/";</script>')).toBe(true);

    const madaraHome = `<link rel="stylesheet" href="/wp-content/themes/madara/style.css">
      <div class="page-item-detail manga"><div class="post-title"><h3><a href="/manga/a/">A</a></h3></div></div>
      <div class="popular-item-wrap"><a href="/manga/b/">B</a></div>`;
    const themesiaHome = `<div class="listupd"><div class="bs"><div class="bsx"><a href="/manga/a/" title="A"><div class="tt">A</div></a></div></div></div>
      <div class="serieslist"><ul><li><a class="series" href="/manga/b/">B</a></li></ul></div>`;
    expect(mangabox.detect!(madaraHome)).toBe(false);
    expect(mangabox.detect!(themesiaHome)).toBe(false);
  });

  test('itemLinkSelector bắt được link truyện ở trang chủ', () => {
    const $ = load(HOME_NELO);
    const hrefs = $(mangabox.itemLinkSelector!)
      .toArray()
      .map(el => $(el).attr('href'));
    expect(hrefs).toEqual(expect.arrayContaining(['/series/popular-one', '/series/top-two']));
  });

  test('đời mới: list đọc kiểu URL ở trang chủ rồi dựng /manga-list/…?page=', async () => {
    const src = srcOf('https://kk.test');
    const { calls } = mockFetch([
      { match: urlIs('https://kk.test/'), body: homeKakalot('https://kk.test') },
      { match: urlIs('https://kk.test/manga-list/hot-manga?page=2'), body: LIST_KAKALOT },
      { match: urlIs('https://kk.test/manga-list/hot-manga?page=40'), body: LAST_PAGE_KAKALOT },
      { match: urlStarts('https://kk.test/manga-list/new-manga'), body: LIST_KAKALOT },
    ]);
    const page = await mangabox.list(src, 'popular', 2);
    expect(calls.map(c => c.url)).toEqual(['https://kk.test/', 'https://kk.test/manga-list/hot-manga?page=2']);
    expect(page.hasNext).toBe(true);
    expect(page.items).toEqual([
      {
        url: 'https://kk.test/manga/solo-hero',
        title: 'Solo Hero',
        cover: 'https://cdn.test/thumb/solo-hero.webp',
        subtitle: 'Chapter 12',
      },
      { url: 'https://kk.test/manga/second', title: 'Second Story', cover: 'https://cdn.test/thumb/second.webp', subtitle: undefined },
    ]);

    // Trang cuối không còn link số lớn hơn; trang chủ chỉ tải một lần.
    expect((await mangabox.list(src, 'popular', 40)).hasNext).toBe(false);
    await mangabox.list(src, 'new', 1);
    expect(calls.map(c => c.url).slice(2)).toEqual([
      'https://kk.test/manga-list/hot-manga?page=40',
      'https://kk.test/manga-list/new-manga',
    ]);
  });

  test('đời mới: genres lấy ở khối GENRES, byGenre dùng ?filter=&page=', async () => {
    const src = srcOf('https://kk-genre.test');
    const { calls } = mockFetch([
      { match: urlIs('https://kk-genre.test/'), body: homeKakalot('https://kk-genre.test') },
      { match: urlStarts('https://kk-genre.test/genre/action'), body: LIST_KAKALOT },
    ]);
    expect(await mangabox.genres(src)).toEqual([
      { id: 'action', name: 'Action' },
      { id: 'childhood-friends', name: 'Childhood friends' },
    ]);
    const action = { id: 'action', name: 'Action' };
    await mangabox.byGenre(src, action, 'popular', 2);
    await mangabox.byGenre(src, action, 'latest', 1);
    await mangabox.byGenre(src, action, 'new', 1);
    expect(calls.map(c => c.url).slice(1)).toEqual([
      'https://kk-genre.test/genre/action?filter=7&page=2',
      'https://kk-genre.test/genre/action',
      'https://kk-genre.test/genre/action?filter=1',
    ]);
  });

  test('search đổi từ khoá thành dạng gạch dưới, tham số trang theo đời site', async () => {
    const { calls } = mockFetch([
      { match: urlIs('https://kk-search.test/'), body: homeKakalot('https://kk-search.test') },
      { match: urlIs('https://nelo-search.test/'), body: HOME_NELO },
      { match: urlStarts('https://kk-search.test/search/story/'), body: SEARCH_NELO },
      { match: urlStarts('https://nelo-search.test/search/story/'), body: SEARCH_NELO },
    ]);
    const result = await mangabox.search(srcOf('https://nelo-search.test'), ' One Piece! ', 1);
    expect(result.items).toEqual([
      {
        url: 'https://nelo-search.test/series/one-piece',
        title: 'One Piece',
        cover: 'https://nelo-search.test/thumbnail/one-piece.webp',
        subtitle: 'Chapter 1140: Scopper Gyaban',
      },
    ]);
    expect(result.hasNext).toBe(true);
    await mangabox.search(srcOf('https://nelo-search.test'), 'one piece', 2);
    await mangabox.search(srcOf('https://kk-search.test'), 'Đảo Hải-Tặc', 2);
    const urls = calls.map(c => c.url).filter(u => u.includes('/search/'));
    expect(urls).toEqual([
      'https://nelo-search.test/search/story/one_piece',
      'https://nelo-search.test/search/story/one_piece?p=2',
      'https://kk-search.test/search/story/dao_hai_tac?page=2',
    ]);
  });

  test('đời cũ: /latest?p=, tên trống thì dựng từ slug, popular lấy ở trang chủ', async () => {
    const src = srcOf('https://nelo.test');
    const { calls } = mockFetch([
      { match: urlIs('https://nelo.test/'), body: HOME_NELO },
      { match: urlIs('https://nelo.test/latest?p=2'), body: LIST_NELO },
      { match: urlStarts('https://nelo.test/genre/'), body: LIST_NELO },
    ]);
    const latest = await mangabox.list(src, 'latest', 2);
    expect(calls.map(c => c.url)).toEqual(['https://nelo.test/', 'https://nelo.test/latest?p=2']);
    expect(latest.hasNext).toBe(true);
    expect(latest.items).toEqual([
      {
        url: 'https://nelo.test/series/shibuya-near-family',
        title: 'Shibuya Near Family',
        cover: 'https://nelo.test/thumbnail/shibuya-near-family.webp',
        subtitle: 'Chapter 121: Ikko',
      },
      { url: 'https://nelo.test/series/berserk', title: 'Berserk', cover: 'https://nelo.test/thumbnail/berserk.webp', subtitle: undefined },
    ]);

    const popular = await mangabox.list(src, 'popular', 1);
    expect(popular).toEqual({
      hasNext: false,
      items: [
        {
          url: 'https://nelo.test/series/popular-one',
          title: 'Popular One',
          cover: 'https://nelo.test/thumbnail/popular-one.webp',
          subtitle: 'Chapter 106',
        },
        { url: 'https://nelo.test/series/top-two', title: 'Top Two', subtitle: 'Chapter 40' },
      ],
    });
    expect(await mangabox.list(src, 'popular', 2)).toEqual({ items: [], hasNext: false });

    await mangabox.byGenre(src, { id: 'action', name: 'Action' }, 'popular', 2);
    expect(calls[calls.length - 1].url).toBe('https://nelo.test/genre/action?p=2');
  });

  test('đời cũ: /newest bị chuyển về trang chủ thì dùng danh sách mới cập nhật', async () => {
    const calls: string[] = [];
    (globalThis as any).fetch = jest.fn(async (url: string) => {
      calls.push(url);
      const body = url === 'https://nelo-new.test/latest' ? LIST_NELO : HOME_NELO;
      // /newest redirect 302 về trang chủ.
      const finalUrl = url.endsWith('/newest') ? 'https://nelo-new.test/' : url;
      return { ok: true, status: 200, url: finalUrl, text: async () => body };
    });
    const page = await mangabox.list(srcOf('https://nelo-new.test'), 'new', 1);
    expect(calls).toEqual(['https://nelo-new.test/', 'https://nelo-new.test/newest', 'https://nelo-new.test/latest']);
    expect(page.items.map(i => i.title)).toEqual(['Shibuya Near Family', 'Berserk']);
  });

  test('đời mới: detail đọc thông tin và lấy hết chương qua API, link chương về đúng site', async () => {
    const src = srcOf('https://kk.test', 'manga');
    const { calls } = mockFetch([
      { match: urlIs('https://kk.test/manga/solo-hero'), body: DETAIL_KAKALOT },
      {
        match: urlIs('https://kk.test/api/manga/solo-hero/chapters?limit=1000&offset=0'),
        body: apiPage(
          [
            { chapter_name: 'Chapter 12', chapter_slug: 'chapter-12', chapter_num: 12, updated_at: '2025-12-22T19:57:22.000000Z' },
            { chapter_name: 'Chapter 11.5', chapter_slug: 'chapter-11-5', chapter_num: 11.5, updated_at: '2025-12-15T00:00:00.000000Z' },
          ],
          true,
        ),
      },
      {
        match: urlIs('https://kk.test/api/manga/solo-hero/chapters?limit=1000&offset=2'),
        body: apiPage([{ chapter_name: 'Chapter 1', chapter_slug: 'chapter-1', chapter_num: 1, updated_at: '2025-01-01T08:00:00.000000Z' }], false),
      },
    ]);
    const detail = await mangabox.detail(src, 'https://kk.test/manga/solo-hero');
    expect(detail).toMatchObject({
      title: 'Solo Hero',
      cover: 'https://cdn.test/thumb/solo-hero.webp',
      status: 'Ongoing',
      authors: ['Oda Eiichirou (尾田栄一郎)'],
      genres: [
        { id: 'fantasy', name: 'Fantasy' },
        { id: 'adult', name: 'Adult' },
      ],
      rating: 4.4,
      views: '1,463,101,891',
      nsfw: true,
      description: 'First line of the story. Still the first paragraph.\n\nSecond paragraph.',
    });
    expect(detail.altTitles).toBeUndefined();
    expect(detail.chapters).toEqual([
      {
        url: 'https://kk.test/manga/solo-hero/chapter-12',
        name: 'Chapter 12',
        date: '2025-12-22',
        time: Date.UTC(2025, 11, 22, 19, 57, 22),
        number: 12,
      },
      {
        url: 'https://kk.test/manga/solo-hero/chapter-11-5',
        name: 'Chapter 11.5',
        date: '2025-12-15',
        time: Date.UTC(2025, 11, 15),
        number: 11.5,
      },
      {
        url: 'https://kk.test/manga/solo-hero/chapter-1',
        name: 'Chapter 1',
        date: '2025-01-01',
        time: Date.UTC(2025, 0, 1, 8),
        number: 1,
      },
    ]);
    expect(calls).toHaveLength(3);
  });

  test('đời cũ: detail đọc chương ngay trong trang, bỏ chương "next issue"', async () => {
    mockFetch([{ match: urlIs('https://nelo.test/series/hotel'), body: DETAIL_NELO }]);
    const detail = await mangabox.detail(srcOf('https://nelo.test', 'series'), 'https://nelo.test/series/hotel');
    expect(detail).toMatchObject({
      title: 'Hotel Metsäpeura',
      altTitles: ['Tervetuloa Hotelli', 'Welcome to Hotel', 'ホテル'],
      cover: 'https://nelo.test/thumbnail/hotel.webp',
      description: 'In the Lapland region of Finland.',
      status: 'Ongoing',
      authors: ['Fukuta Seira'],
      genres: [
        { id: 'drama', name: 'Drama' },
        { id: 'smut', name: 'Smut' },
      ],
      nsfw: true,
    });
    expect(detail.rating).toBeUndefined();
    expect(detail.chapters).toEqual([
      {
        url: 'https://nelo.test/chapter/2827/hotel-22',
        name: 'Vol.4 Chapter 22: Fabi',
        date: '2025-03-01 12:46:22',
        time: new Date(2025, 2, 1).getTime(),
        number: 22,
      },
      {
        url: 'https://nelo.test/chapter/2827/hotel-21.5',
        name: 'Chapter 21.5',
        date: '2025-02-15 16:40:33',
        time: new Date(2025, 1, 15).getTime(),
        number: 21.5,
      },
    ]);
  });

  test('Manganato cũ: detail với bảng variations-tableInfo và row-content-chapter', async () => {
    mockFetch([{ match: urlIs('https://chap.nato.test/manga-ab123'), body: DETAIL_NATO }]);
    const detail = await mangabox.detail(srcOf('https://nato.test'), 'https://chap.nato.test/manga-ab123');
    expect(detail).toMatchObject({
      title: 'Classic Story',
      altTitles: ['Alt One', 'Alt Two'],
      cover: 'https://cdn.test/classic.jpg',
      description: 'Line one.\n\nLine two.',
      status: 'Completed',
      authors: ['Author A', 'Author B'],
      genres: [
        { id: '2', name: 'Action' },
        { id: '6', name: 'Comedy' },
      ],
      rating: 4.6,
      views: '1.2M',
      nsfw: false,
    });
    expect(detail.chapters.map(c => [c.url, c.name, c.number, c.time])).toEqual([
      ['https://chap.nato.test/manga-ab123/chapter-2', 'Chapter 2', 2, new Date(2025, 2, 1).getTime()],
      ['https://chap.nato.test/manga-ab123/chapter-1', 'Chapter 1: Start', 1, new Date(2025, 1, 1).getTime()],
    ]);
  });

  test('đời mới: chapter ghép server + chapterImages, bỏ server không trả ảnh', async () => {
    const src = srcOf('https://kk.test');
    const { calls } = mockFetch([
      { match: urlIs('https://kk.test/manga/solo-hero/chapter-12'), body: CHAPTER_KAKALOT },
      { match: (url, init) => init?.method === 'HEAD' && url.startsWith('https://s1.test/'), status: 429, body: '{}' },
      { match: (url, init) => init?.method === 'HEAD' && url.startsWith('https://s2.test/'), body: '' },
    ]);
    const content = await mangabox.chapter(src, 'https://kk.test/manga/solo-hero/chapter-12');
    const headers = { Referer: 'https://kk.test/' };
    expect(content).toEqual({
      kind: 'images',
      title: 'Solo Hero: Chapter 12',
      pages: [
        { uri: 'https://s2.test/solo-hero/12/0.webp', headers },
        { uri: 'https://s2.test/solo-hero/12/1.webp', headers },
        { uri: 'https://s2.test/solo-hero/12/2.webp', headers },
      ],
    });
    expect(calls[0].init?.headers).toMatchObject({ Referer: 'https://kk.test/' });
    expect((calls[1].init?.headers as Record<string, string>).Referer).toBe('https://kk.test/');
    expect(mangabox.imageHeaders(src)).toEqual(headers);
  });

  test('đời cũ: chapter lấy ảnh trong container-chapter-reader', async () => {
    mockFetch([{ match: urlIs('https://nelo.test/chapter/2827/hotel-22'), body: CHAPTER_NELO }]);
    const content = await mangabox.chapter(srcOf('https://nelo.test'), 'https://nelo.test/chapter/2827/hotel-22');
    expect(content.kind === 'images' && content.pages).toEqual([
      { uri: 'https://img.test/hotel/22/0.webp', headers: { Referer: 'https://nelo.test/' } },
      { uri: 'https://img.test/hotel/22/1.webp', headers: { Referer: 'https://nelo.test/' } },
    ]);
  });

  test('chapter báo lỗi tiếng Việt khi không có ảnh', async () => {
    mockFetch([{ match: urlIs('https://nelo.test/chapter/1/empty-1'), body: '<div class="container-chapter-reader"></div>' }]);
    await expect(mangabox.chapter(srcOf('https://nelo.test'), 'https://nelo.test/chapter/1/empty-1')).rejects.toThrow(
      'Không tìm thấy ảnh trong chương này.',
    );
  });

  test('classifyUrl', () => {
    const kk = srcOf('https://kk.test', 'manga');
    const nelo = srcOf('https://nelo.test', 'series');
    expect(mangabox.classifyUrl(kk, 'https://kk.test/')).toBe('list');
    expect(mangabox.classifyUrl(kk, 'https://kk.test/manga-list/hot-manga?page=2')).toBe('list');
    expect(mangabox.classifyUrl(kk, 'https://kk.test/genre/action?filter=7')).toBe('list');
    expect(mangabox.classifyUrl(kk, 'https://kk.test/search/story/one_piece')).toBe('list');
    expect(mangabox.classifyUrl(kk, 'https://kk.test/manga/solo-hero')).toBe('detail');
    expect(mangabox.classifyUrl(kk, 'https://kk.test/manga/solo-hero/chapter-12')).toBe('chapter');
    expect(mangabox.classifyUrl(nelo, 'https://nelo.test/latest?p=2')).toBe('list');
    expect(mangabox.classifyUrl(nelo, 'https://nelo.test/series/hotel')).toBe('detail');
    expect(mangabox.classifyUrl(nelo, 'https://nelo.test/chapter/2827/hotel-22')).toBe('chapter');
    expect(mangabox.classifyUrl(kk, 'https://nato.test/genre-all/2?type=topview')).toBe('list');
    expect(mangabox.classifyUrl(kk, 'https://chap.nato.test/manga-ab123')).toBe('detail');
    expect(mangabox.classifyUrl(kk, 'https://chap.nato.test/manga-ab123/chapter-2')).toBe('chapter');
    expect(mangabox.classifyUrl(kk, 'https://kk.test/x/y', CHAPTER_NELO)).toBe('chapter');
    expect(mangabox.classifyUrl(kk, 'https://kk.test/x/y', DETAIL_NATO)).toBe('detail');
    expect(mangabox.classifyUrl(kk, 'https://kk.test/x/y')).toBeNull();
  });

  test('resolveMangaUrl suy từ URL, không được thì đọc breadcrumb', async () => {
    const { calls } = mockFetch([{ match: urlIs('https://nelo.test/chapter/2827/hotel-22'), body: CHAPTER_NELO }]);
    const kk = srcOf('https://kk.test');
    expect(await mangabox.resolveMangaUrl(kk, 'https://kk.test/manga/solo-hero/chapter-12')).toBe(
      'https://kk.test/manga/solo-hero',
    );
    expect(await mangabox.resolveMangaUrl(kk, 'https://chap.nato.test/manga-ab123/chapter-2')).toBe(
      'https://chap.nato.test/manga-ab123',
    );
    expect(await mangabox.resolveMangaUrl(kk, 'https://kk.test/chapter/ab123/chapter_5')).toBe('https://kk.test/manga/ab123');
    expect(
      await mangabox.resolveMangaUrl(srcOf('https://nelo.test', 'series'), 'https://nelo.test/chapter/2827/hotel-21.5'),
    ).toBe('https://nelo.test/series/hotel');
    expect(calls).toHaveLength(0);

    // Chưa biết thư mục truyện: đọc breadcrumb từ HTML có sẵn, hoặc tải trang chương.
    const nelo = srcOf('https://nelo.test');
    expect(await mangabox.resolveMangaUrl(nelo, 'https://nelo.test/chapter/2827/hotel-22', CHAPTER_NELO)).toBe(
      'https://nelo.test/series/hotel',
    );
    expect(calls).toHaveLength(0);
    expect(await mangabox.resolveMangaUrl(nelo, 'https://nelo.test/chapter/2827/hotel-22')).toBe(
      'https://nelo.test/series/hotel',
    );
    expect(calls.map(c => c.url)).toEqual(['https://nelo.test/chapter/2827/hotel-22']);
  });
});
