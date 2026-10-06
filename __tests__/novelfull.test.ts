import type { SourceConfig } from '../src/sources/types';
import { sourceEngine } from './helpers/addons';
import { mockFetch, urlIs, urlStarts } from './helpers/mockFetch';

const novelfull = sourceEngine('novelfull');

const mk = (host: string): SourceConfig => ({
  id: host,
  engine: 'novelfull',
  name: host,
  baseUrl: `https://${host}`,
  content: 'novel',
  lang: 'en',
  nsfw: false,
  enabled: true,
  addedAt: 0,
});

const FULL_HOME = `
  <ul class="dropdown-menu">
    <li><a href="/latest-release-novel" title="Latest Release">Latest Release</a></li>
    <li><a href="/new-novel" title="Newly added novels">Newly added</a></li>
    <li><a href="/hot-novel" title="Hot Novel">Hot Novel</a></li>
    <li><a href="/most-popular" title="Most Popular">Most Popular</a></li>
  </ul>
  <ul class="genres"><li><a href="/genre/Action" title="Action Novels">Action</a></li>
    <li><a href="/genre/Martial+Arts">Martial Arts</a></li><li><a href="/genre/Action">Action</a></li></ul>
  <form class="navbar-form" action="/search"><input type="search" name="keyword"></form>
  <div class="ul-list1"><div class="li"><div class="con"><div class="txt"><h3 class="tit"><a href="/the-newest-hero.html">The Newest Hero</a></h3></div></div></div></div>`;

const row = (slug: string, title: string, chapters: string) => `
  <div class="li-row"><div class="li"><div class="con">
    <div class="pic"><a href="/${slug}.html"><img src="/thumbs/${slug}-s.jpg" srcset="/thumbs/${slug}-s.jpg 100w, /thumbs/${slug}-l.jpg 200w"></a></div>
    <div class="txt"><h3 class="tit"><a href="/${slug}.html" title="${title}">${title}</a></h3>
      <div class="desc"><div class="item item-chap-inline"><div class="right"><a class="chapter" href="/${slug}/chapter-1.html"><span class="s1">${chapters}</span></a></div></div></div>
    </div>
  </div></div></div>`;

const FULL_LIST = (path: string, page: number, last: number) => `
  <div class="col-content">${row('martial-world', 'Martial World', '2276 Chapters')}${row(
  'solo-hero',
  'Solo Hero',
  '12 Chapters',
)}</div>
  <nav class="fwn-arch-pages pages" aria-label="Pagination"><ul><li>
    <a href="${path}">1</a>
    ${page < last ? `<a href="${path}?page=${page + 1}" rel="next">&gt;&gt;</a>` : ''}
    <a href="${path}?page=${last}" title="Last page">${last}</a>
  </li></ul></nav>`;

const FULL_DETAIL = `
  <div class="col-xs-12 col-info-desc">
    <div class="info-holder"><div class="books"><div class="desc"><h3 class="title">Martial World</h3></div>
      <div class="book"><img src="/uploads/thumbs/martial-world.jpg" alt="Martial World"></div></div>
      <div class="info">
        <div><h3>Author:</h3><a href="/author/Cocooned+Cow">Cocooned Cow</a>, <a href="/author/x">蚕茧里的牛</a></div>
        <div><h3>Alternative names:</h3>MW; 武极天下</div>
        <div><h3>Genre:</h3><a href="/genre/Action">Action</a>, <a href="/genre/Harem">Harem</a></div>
        <div><h3>Status:</h3><a href="/status/Completed">Completed</a></div>
      </div>
    </div>
    <div class="desc"><div class="rate"><input type="hidden" id="rateVal" value="8.8"><div id="rating" data-novel-id="57"></div></div>
      <div class="desc-text"><p>Lin Ming wanted to audition.</p><p>He later found out.<br>Then he trained.</p></div>
    </div>
  </div>
  <script>var ajaxChapterOptionUrl = '/ajax-chapter-option'</script>
  <div id="list-chapter"><ul class="list-chapter"><li><a href="/martial-world/prologue.html"><span class="chapter-text">Prologue</span></a></li></ul></div>`;

const FULL_OPTIONS = `<select class="chapter_jump">
  <option value="/martial-world/prologue.html">Prologue: Magic Cube</option>
  <option value="/martial-world/chapter-1-lin-ming.html">Chapter 1 – Lin Ming</option>
  <option value="/martial-world/chapter-2.html">Chapter 2 – Peculiar Stone</option>
</select>`;

describe('novelfull engine', () => {
  test('list đọc link sắp xếp ở menu trang chủ và học cách đánh số trang', async () => {
    const src = mk('full.test');
    const { calls } = mockFetch([
      { match: urlIs('https://full.test/'), body: FULL_HOME },
      { match: urlStarts('https://full.test/most-popular'), body: FULL_LIST('/most-popular', 1, 3) },
      { match: urlStarts('https://full.test/new-novel'), body: FULL_LIST('/new-novel', 1, 1) },
    ]);
    const page = await novelfull.list(src, 'popular', 1);
    expect(calls.map(c => c.url)).toEqual(['https://full.test/', 'https://full.test/most-popular']);
    expect(page.hasNext).toBe(true);
    expect(page.items[0]).toEqual({
      url: 'https://full.test/martial-world.html',
      title: 'Martial World',
      cover: 'https://full.test/thumbs/martial-world-l.jpg',
      subtitle: '2276 Chapters',
    });
    expect(page.items).toHaveLength(2);

    const last = await novelfull.list(src, 'popular', 3);
    expect(calls.map(c => c.url).slice(2)).toEqual(['https://full.test/most-popular?page=3']);
    expect(last.hasNext).toBe(false);

    await novelfull.list(src, 'new', 1);
    expect(calls[calls.length - 1].url).toBe('https://full.test/new-novel');
  });

  test('list kiểu /list/<…>/2: chưa biết mẫu thì xem phân trang trang 1 trước', async () => {
    const src = mk('live.test');
    const pager = (page: number) => `
      <div class="li-row"><div class="li"><div class="txt"><h3 class="tit"><a href="https://live.test/book/novel-${page}">Novel ${page}</a></h3></div></div></div>
      <div class="pages"><ul class="pagination">
        <li class="first"><a href="https://live.test/list/latest-release-novels/1" rel="next">« First</a></li>
        <li class="active"><a href="https://live.test/list/latest-release-novels/${page}">${page}</a></li>
        <li><a href="https://live.test/list/latest-release-novels/${page + 1}">${page + 1}</a></li>
        <li class="last"><a href="https://live.test/list/latest-release-novels/9" rel="next">Last »</a></li>
      </ul></div>`;
    const { calls } = mockFetch([
      {
        match: urlIs('https://live.test/'),
        body: `<a href="https://live.test/list/latest-release-novels/">Latest Release Novels</a>
          <form action="/search/" method="post"><input name="searchkey"></form>`,
      },
      { match: urlIs('https://live.test/list/latest-release-novels/'), body: pager(1) },
      { match: urlIs('https://live.test/list/latest-release-novels/4'), body: pager(4) },
    ]);
    const page = await novelfull.list(src, 'latest', 4);
    expect(calls.map(c => c.url)).toEqual([
      'https://live.test/',
      'https://live.test/list/latest-release-novels/',
      'https://live.test/list/latest-release-novels/4',
    ]);
    expect(page.items).toEqual([
      { url: 'https://live.test/book/novel-4', title: 'Novel 4', cover: undefined, subtitle: undefined },
    ]);
    expect(page.hasNext).toBe(true);

    const { calls: searchCalls } = mockFetch([
      { match: (url, init) => url === 'https://live.test/search/' && init?.method === 'POST', body: pager(1) },
    ]);
    const found = await novelfull.search(src, 'martial god', 1);
    expect(searchCalls[0].init?.body).toBe('searchkey=martial%20god');
    expect(found).toEqual({ items: [expect.objectContaining({ title: 'Novel 1' })], hasNext: false });
    expect(await novelfull.search(src, 'martial god', 2)).toEqual({ items: [], hasNext: false });
  });

  test('search GET theo form và genres lấy từ menu', async () => {
    const src = mk('search.test');
    const { calls } = mockFetch([
      { match: urlIs('https://search.test/'), body: FULL_HOME },
      { match: urlStarts('https://search.test/search?'), body: FULL_LIST('/search?keyword=martial', 2, 5) },
    ]);
    const page = await novelfull.search(src, 'martial', 2);
    expect(calls[1].url).toBe('https://search.test/search?keyword=martial&page=2');
    expect(page.items).toHaveLength(2);
    expect(page.hasNext).toBe(true);
    expect(await novelfull.genres(src)).toEqual([
      { id: '/genre/Action', name: 'Action' },
      { id: '/genre/Martial+Arts', name: 'Martial Arts' },
    ]);

    mockFetch([
      { match: urlStarts('https://search.test/genre/Martial+Arts'), body: FULL_LIST('/genre/Martial+Arts', 1, 2) },
    ]);
    const genrePage = await novelfull.byGenre(src, { id: '/genre/Martial+Arts', name: 'Martial Arts' }, 'latest', 1);
    expect(genrePage.items).toHaveLength(2);
    expect(genrePage.hasNext).toBe(true);
  });

  test('detail kiểu NovelFull: lấy mọi chương qua ajax-chapter-option, mới nhất trước', async () => {
    const src = mk('full.test');
    const { calls } = mockFetch([
      { match: urlIs('https://full.test/martial-world.html'), body: FULL_DETAIL },
      { match: urlStarts('https://full.test/ajax-chapter-option'), body: FULL_OPTIONS },
    ]);
    const detail = await novelfull.detail(src, 'https://full.test/martial-world.html');
    expect(calls[1].url).toBe('https://full.test/ajax-chapter-option?novelId=57');
    expect(detail).toMatchObject({
      title: 'Martial World',
      altTitles: ['MW', '武极天下'],
      cover: 'https://full.test/uploads/thumbs/martial-world.jpg',
      description: 'Lin Ming wanted to audition.\n\nHe later found out.\n\nThen he trained.',
      status: 'Completed',
      authors: ['Cocooned Cow', '蚕茧里的牛'],
      genres: [
        { id: '/genre/Action', name: 'Action' },
        { id: '/genre/Harem', name: 'Harem' },
      ],
      rating: 4.4,
      nsfw: false,
    });
    expect(detail.chapters).toEqual([
      { url: 'https://full.test/martial-world/chapter-2.html', name: 'Chapter 2 – Peculiar Stone', number: 2 },
      { url: 'https://full.test/martial-world/chapter-1-lin-ming.html', name: 'Chapter 1 – Lin Ming', number: 1 },
      { url: 'https://full.test/martial-world/prologue.html', name: 'Prologue: Magic Cube', number: undefined },
    ]);
  });

  test('detail kiểu NovelBin: chương qua ajax/chapter-archive theo slug', async () => {
    const src = mk('bin.test');
    const { calls } = mockFetch([
      {
        match: urlIs('https://bin.test/b/demon-king'),
        body: `<div class="col-info-desc"><div class="desc"><h3 class="title">Demon King</h3>
            <div class="rate"><div id="rating" data-novel-id="demon-king"></div></div>
            <div itemprop="aggregateRating"><span itemprop="ratingValue">8.0</span>/<span itemprop="bestRating">10</span></div>
            <ul class="info info-meta">
              <li><h3>Author:</h3><a href="https://bin.test/a/Kim">Kim</a></li>
              <li><h3>Genre:</h3><a href="https://bin.test/genre/smut">Smut</a></li>
              <li><h3>Status:</h3><a href="https://bin.test/sort/ongoing">Ongoing</a></li>
            </ul></div></div>
          <div id="tab-chapters"><div id="list-chapter"><div id="chapter-archive"></div></div></div>`,
      },
      {
        match: urlStarts('https://bin.test/ajax/chapter-archive'),
        body: `<html><body><ul class="nav"><li><a href="/contact">Contact</a></li></ul>
          <div class="panel-body"><ul class="list-chapter">
            <li><a href="https://bin.test/b/demon-king/chapter-1" title="Chapter 1"><span class="nchr-text"> Chapter 1 </span></a></li>
            <li><a href="https://bin.test/b/demon-king/chapter-2" title="Chapter 2"><span class="nchr-text">Chapter 2</span></a></li>
          </ul></div></body></html>`,
      },
    ]);
    const detail = await novelfull.detail(src, 'https://bin.test/b/demon-king');
    expect(calls[1].url).toBe('https://bin.test/ajax/chapter-archive?novelId=demon-king');
    expect(detail.chapters.map(c => c.url)).toEqual([
      'https://bin.test/b/demon-king/chapter-2',
      'https://bin.test/b/demon-king/chapter-1',
    ]);
    expect(detail.rating).toBe(4);
    expect(detail.authors).toEqual(['Kim']);
    expect(detail.status).toBe('Ongoing');
    expect(detail.nsfw).toBe(true);
  });

  test('detail kiểu NovelLive: JSON get-list-chapter, lỗi thì đọc các trang /book/<slug>/N', async () => {
    const src = mk('live.test');
    const page = (from: number) => `
      <div class="m-info"><div class="m-imgtxt">
        <div class="pic"><img src="https://media.live.test/novel/farmer.jpg"></div>
        <div class="txt">
          <div class="item"><span class="glyphicon glyphicon-user" title="Author"></span><div class="right"><a href="/author/Grayback" class="a1">Grayback</a></div></div>
          <div class="item"><span class="glyphicon glyphicon-time" title="Status"></span><div class="right"><span class="s1"><a href="/list/x">OnGoing</a></span></div></div>
        </div></div>
        <div class="m-desc"><h1 class="tit">Farmer</h1><div class="score"><p class="vote">4.4 / 5 ( 7 votes )</p></div>
          <div class="txt"><div class="inner">Battling young masters? No.</div></div></div>
      </div>
      <div class="m-newest2"><ul class="ul-list5">
        <li><a href="https://live.test/book/farmer/chapter-${from}" class="con">Chapter ${from}</a></li>
        <li><a href="https://live.test/book/farmer/chapter-${from + 1}" class="con">Chapter ${from + 1}</a></li>
      </ul>
      <div class="page"><select id="indexselect" novel-id="farmer"><option value="1">C.1 - C.2</option><option value="2">C.3 - C.4</option></select>
        <a class="index-container-btn" href="https://live.test/book/farmer/2">Next</a></div></div>`;
    const json = {
      chapters: [
        { chapter_id: 'chapter-1-start', chapter_name: 'Chapter 1: Start' },
        { chapter_id: 'chapter-2-end', chapter_name: 'Chapter 2: End' },
      ],
    };
    mockFetch([
      { match: urlIs('https://live.test/book/farmer'), body: page(1) },
      { match: urlStarts('https://live.test/ajax/get-list-chapter?novel_id=farmer'), body: json },
    ]);
    const fromJson = await novelfull.detail(src, 'https://live.test/book/farmer');
    expect(fromJson.chapters.map(c => [c.url, c.number])).toEqual([
      ['https://live.test/book/farmer/chapter-2-end', 2],
      ['https://live.test/book/farmer/chapter-1-start', 1],
    ]);
    expect(fromJson).toMatchObject({
      title: 'Farmer',
      cover: 'https://media.live.test/novel/farmer.jpg',
      authors: ['Grayback'],
      status: 'OnGoing',
      rating: 4.4,
      description: 'Battling young masters? No.',
    });

    const { calls } = mockFetch([
      { match: urlIs('https://live.test/book/farmer'), body: page(1) },
      { match: urlIs('https://live.test/book/farmer/2'), body: page(3) },
    ]);
    const fromPages = await novelfull.detail(src, 'https://live.test/book/farmer');
    expect(calls.map(c => c.url)).toContain('https://live.test/book/farmer/2');
    expect(fromPages.chapters.map(c => c.number)).toEqual([4, 3, 2, 1]);
  });

  test('chapter trả về đoạn văn, bỏ quảng cáo và dòng đóng dấu site', async () => {
    const src = mk('bin.test');
    mockFetch([
      {
        match: urlIs('https://bin.test/b/demon-king/chapter-1'),
        body: `<a class="novel-title" href="https://bin.test/b/demon-king">Demon King</a>
          <a class="chr-title" href="#"><span class="chr-text"> Chapter 1</span></a>
          <div id="chr-content" class="chr-c">
            <div id="pf-1"><script>window.ads = 1</script>Ad</div>
            <p>“Understanding abilities?”</p>
            <p style="display: none">Hidden watermark</p>
            <p>Read latest chapters at n.o.v.e.l.b.i.n</p>
            <p>Bathesia tilted her head.</p>
            <p>If you find any errors ( broken links, non-standard content, etc.. ), Please let us know &lt; report chapter &gt; so we can fix it as soon as possible.</p>
            <p>Karos licked his lips.</p>
          </div>`,
      },
    ]);
    expect(await novelfull.chapter(src, 'https://bin.test/b/demon-king/chapter-1')).toEqual({
      kind: 'text',
      title: 'Chapter 1',
      paragraphs: ['“Understanding abilities?”', 'Bathesia tilted her head.', 'Karos licked his lips.'],
    });

    const go = mk('novgo.test');
    mockFetch([
      {
        match: urlIs('https://novgo.test/martial-world/chapter-1.html'),
        body: `<div id="chapter" class="m-read"><div class="top"><h2 class="tit"><a class="truyen-title" href="/martial-world.html">Martial World</a></h2>
          <h1 class="chapter"><span class="chapter-text">Chapter 1 – Lin Ming</span></h1></div>
          <div class="txt fwn-reader-txt"><div id="chapter-content" class="chapter-c">Line one.<br>Line two.<br>Visit novgo dot net for more<br>Line three.</div></div></div>`,
      },
    ]);
    expect(await novelfull.chapter(go, 'https://novgo.test/martial-world/chapter-1.html')).toEqual({
      kind: 'text',
      title: 'Chapter 1 – Lin Ming',
      paragraphs: ['Line one.', 'Line two.', 'Line three.'],
    });
  });

  test('classifyUrl, resolveMangaUrl và detect', async () => {
    const src = mk('full.test');
    expect(novelfull.classifyUrl(src, 'https://full.test/')).toBe('list');
    expect(novelfull.classifyUrl(src, 'https://full.test/latest-release-novel?page=2')).toBe('list');
    expect(novelfull.classifyUrl(src, 'https://full.test/genre/Action')).toBe('list');
    expect(novelfull.classifyUrl(src, 'https://full.test/search?keyword=x')).toBe('list');
    expect(novelfull.classifyUrl(src, 'https://bin.test/sort/latest')).toBe('list');
    expect(novelfull.classifyUrl(src, 'https://live.test/list/latest-release-novels/2')).toBe('list');
    expect(novelfull.classifyUrl(src, 'https://full.test/martial-world.html')).toBe('detail');
    expect(novelfull.classifyUrl(src, 'https://full.test/martial-world/chapter-1.html')).toBe('chapter');
    expect(novelfull.classifyUrl(src, 'https://bin.test/b/demon-king')).toBe('detail');
    expect(novelfull.classifyUrl(src, 'https://bin.test/b/demon-king/chapter-1')).toBe('chapter');
    expect(novelfull.classifyUrl(src, 'https://live.test/book/farmer/2')).toBe('detail');
    expect(novelfull.classifyUrl(src, 'https://live.test/book/farmer/chapter-1-start')).toBe('chapter');

    expect(await novelfull.resolveMangaUrl(src, 'https://full.test/martial-world/chapter-1.html')).toBe(
      'https://full.test/martial-world.html',
    );
    expect(await novelfull.resolveMangaUrl(mk('bin.test'), 'https://bin.test/b/demon-king/chapter-1')).toBe(
      'https://bin.test/b/demon-king',
    );
    expect(
      await novelfull.resolveMangaUrl(
        mk('odd.test'),
        'https://odd.test/read/42',
        '<h2 class="tit"><a class="truyen-title" href="/demon-king.html">Demon King</a></h2>',
      ),
    ).toBe('https://odd.test/demon-king.html');

    expect(novelfull.detect?.('<div class="list list-novel col-xs-12 col-sm-12 col-md-8 col-novel-main">')).toBe(true);
    expect(novelfull.detect?.('<div class="ul-list1 ul-list1-1 home-shelf-card">')).toBe(true);
    expect(novelfull.detect?.("<script>var ajaxChapterOptionUrl = '/ajax-chapter-option'</script>")).toBe(true);
    expect(
      novelfull.detect?.('<link href="/wp-content/themes/madara/style.css"><div class="page-item-detail text">'),
    ).toBe(false);
    expect(novelfull.detect?.('<div class="listupd"><div class="bs"><div class="bsx"></div></div></div>')).toBe(false);
    expect(novelfull.detect?.('<div class="list-truyen-item-wrap"><h3><a href="/manga/x">X</a></h3></div>')).toBe(
      false,
    );
    expect(novelfull.detect?.('<div class="book-item"><div class="book-detailed-item"></div></div>')).toBe(false);
  });
});
