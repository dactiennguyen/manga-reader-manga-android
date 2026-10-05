import type { SourceConfig } from '../src/sources/types';
import { sourceEngine } from './helpers/addons';
import { mockFetch, urlIs, urlStarts } from './helpers/mockFetch';

const madtheme = sourceEngine('madtheme');

const mk = (host: string): SourceConfig => ({
  id: host,
  engine: 'madtheme',
  name: host,
  baseUrl: `https://${host}`,
  content: 'manga',
  lang: 'en',
  nsfw: false,
  enabled: true,
  addedAt: 0,
});

const src = mk('buddy.test');

const item = (slug: string, title: string, chapter: string) => `
  <div class="book-item"><div class="book-detailed-item">
    <div class="thumb"><a title="${title}" href="/${slug}"><img class="lazy" src="/static/common/x.gif" data-src="https://thumb.test/${slug}.png" alt="${title}"></a><span class="latest-chapter" title="${chapter}">${chapter}</span></div>
    <div class="meta"><div class="title"><h3><a title="${title}" href="/${slug}">${title}</a></h3></div>
      <div class="rating"><span class="score"><i class="fa fa-star"></i>4.7</span></div></div>
  </div></div>`;

const LISTING = (active: number, pages: number) => `
  <div class="section-body">${item('solo-hero', 'Solo Hero', 'Chapter 12')}${item(
  'second',
  'Second Story',
  'Chapter 3',
)}</div>
  <div class="paginator">
    ${Array.from(
      { length: pages },
      (_, i) =>
        `<a class="btn link ${i + 1 === active ? 'active' : ''}" href="/search?page=${i + 1}&amp;sort=views">${
          i + 1
        }</a>`,
    ).join('')}
    ${
      active < pages
        ? `<a href="/search?page=${active + 1}&amp;sort=views" class="btn btn-default link">Next »</a>`
        : ''
    }
  </div>`;

const SEARCH_FILTERS = `
  <div class="checkbox-group genres">
    <div class="checkbox-wrapper"><span class="checkbox"><input type="checkbox" name="include[]" value="action"><span class="radio__label">Action</span></span></div>
    <div class="checkbox-wrapper"><span class="checkbox"><input type="checkbox" name="include[]" value="adult"><span class="radio__label">Adult</span></span></div>
  </div>`;

const BUDDY_DETAIL = `
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"AggregateRating","ratingValue":4.25,"ratingCount":16}</script>
  <div class="book-info">
    <div id="cover"><div class="img-cover"><img class="lazy" src="/static/common/x.gif" data-src="https://res.test/thumb/solo-hero.png"></div></div>
    <div class="detail">
      <div class="name box"><h1>Solo Hero</h1><h2>Hero Solo ; 솔로 히어로</h2></div>
      <div class="meta box">
        <p><strong>Authors :</strong> <a href="/authors/kim"><span>Kim</span> ,</a> <a href="/authors/lee"><span>Lee</span></a></p>
        <p><strong>Status :</strong> <a href="/status/Ongoing"><span>Ongoing</span></a></p>
        <p><strong>Genres :</strong> <a href="/genres/action"> Action , </a> <a href="/genres/mature"> Mature </a></p>
        <p><strong>Chapters: </strong> <span>2</span></p>
      </div>
    </div>
  </div>
  <div class="section-body summary">
    <p>You are reading <strong>Solo Hero</strong> manga at <strong>Buddy</strong>. Lets enjoy.</p>
    <p class="content">First line.<br>Second line.</p>
  </div>
  <ul class="chapter-list" id="chapter-list">
    <li id="c-12"><a href="/solo-hero/chapter-12" title="Solo Hero - Chapter 12"><div><strong class="chapter-title">Chapter 12</strong><time class="chapter-update">Oct 1, 2026</time></div></a></li>
    <li id="c-11"><a href="/solo-hero//chapter-11" title="Solo Hero - Chapter 11"><div><strong class="chapter-title">Chapter 11.5</strong><time class="chapter-update">2 days ago</time></div></a></li>
    <li id="c-x"><a href="/solo-hero/chapter-x"><div><strong class="chapter-title">Chapter {{number}}</strong></div></a></li>
  </ul>
  <div class="readmore" id="show-more-chapters"><span onclick="showChapters()">SHOW MORE</span></div>`;

const KALI_DETAIL = `
  <script>var bookId = 10163; var bookSlug = "10163-nano-machine"; var chapterId = null; var pageTitle = "Nano Machine";</script>
  <div class="book-info"><div class="detail">
    <div class="name box"><h1>Nano Machine</h1><h2>Nano Mashin,나노마신</h2></div>
    <div class="meta box"><p><strong>Genres :</strong> <a href="/genres/action/">Action ,</a></p></div>
  </div></div>
  <ul class="chapter-list" id="chapter-list">
    <li id="c-4"><a href="/manga/10163-nano-machine/chapter-4"><div><strong class="chapter-title">Chapter 4</strong><time class="chapter-update">3 hours ago </time></div></a></li>
    <li id="c-3"><a href="/manga/10163-nano-machine/chapter-3"><div><strong class="chapter-title">Chapter 3</strong></div></a></li>
  </ul>
  <div class="readmore" id="show-more-chapters"><span onclick="getChapters()">SHOW MORE</span></div>`;

const KALI_CHAPLIST = `
  <ul class="chapter-list" id="chapter-list">
    ${[3, 2, 1]
      .map(
        n =>
          `<li id="c-${n}"><a href="/manga/10163-nano-machine/chapter-${n}"><div><strong class="chapter-title">Chapter ${n}</strong><time class="chapter-update">${n} weeks ago</time></div></a></li>`,
      )
      .join('')}
  </ul>`;

describe('madtheme engine', () => {
  test('list đi qua /search với sort và tính hasNext theo phân trang', async () => {
    const { calls } = mockFetch([{ match: urlStarts('https://buddy.test/search?'), body: LISTING(1, 3) }]);
    const page = await madtheme.list(src, 'popular', 1);
    expect(calls[0].url).toBe('https://buddy.test/search?status=all&sort=views&page=1');
    expect(page.hasNext).toBe(true);
    expect(page.items).toEqual([
      {
        url: 'https://buddy.test/solo-hero',
        title: 'Solo Hero',
        cover: 'https://thumb.test/solo-hero.png',
        subtitle: 'Chapter 12',
      },
      {
        url: 'https://buddy.test/second',
        title: 'Second Story',
        cover: 'https://thumb.test/second.png',
        subtitle: 'Chapter 3',
      },
    ]);

    mockFetch([{ match: urlStarts('https://buddy.test/search?'), body: LISTING(3, 3) }]);
    expect((await madtheme.list(src, 'latest', 3)).hasNext).toBe(false);
  });

  test('search gửi q và page', async () => {
    const { calls } = mockFetch([{ match: urlStarts('https://buddy.test/search?'), body: LISTING(2, 2) }]);
    const page = await madtheme.search(src, 'solo hero', 2);
    expect(calls[0].url).toBe('https://buddy.test/search?q=solo%20hero&page=2');
    expect(page.items).toHaveLength(2);
    expect(page.hasNext).toBe(false);
  });

  test('genres học tên tham số lọc rồi byGenre dùng đúng tham số đó', async () => {
    const kali = mk('kali.test');
    const { calls } = mockFetch([
      { match: urlIs('https://kali.test/search'), body: SEARCH_FILTERS },
      { match: urlStarts('https://kali.test/search?'), body: LISTING(1, 1) },
      { match: urlStarts('https://buddy.test/search?'), body: LISTING(1, 1) },
    ]);
    const genres = await madtheme.genres(kali);
    expect(genres).toEqual([
      { id: 'action', name: 'Action' },
      { id: 'adult', name: 'Adult' },
    ]);
    await madtheme.byGenre(kali, genres[0], 'latest', 2);
    expect(calls[1].url).toBe('https://kali.test/search?include%5B%5D=action&status=all&sort=updated_at&page=2');

    // Chưa biết tham số của site: gửi cả genre[] lẫn include[].
    await madtheme.byGenre(src, { id: 'action', name: 'Action' }, 'popular', 1);
    expect(calls[2].url).toBe(
      'https://buddy.test/search?genre%5B%5D=action&include%5B%5D=action&status=all&sort=views&page=1',
    );
  });

  test('detail kiểu MangaBuddy: đủ chương trong trang, không gọi API', async () => {
    const { calls } = mockFetch([{ match: urlIs('https://buddy.test/solo-hero'), body: BUDDY_DETAIL }]);
    const detail = await madtheme.detail(src, 'https://buddy.test/solo-hero');
    expect(calls).toHaveLength(1);
    expect(detail.title).toBe('Solo Hero');
    expect(detail.altTitles).toEqual(['Hero Solo', '솔로 히어로']);
    expect(detail.cover).toBe('https://res.test/thumb/solo-hero.png');
    expect(detail.description).toBe('First line.\n\nSecond line.');
    expect(detail.status).toBe('Ongoing');
    expect(detail.authors).toEqual(['Kim', 'Lee']);
    expect(detail.genres).toEqual([
      { id: 'action', name: 'Action' },
      { id: 'mature', name: 'Mature' },
    ]);
    expect(detail.rating).toBe(4.25);
    expect(detail.nsfw).toBe(true);
    expect(detail.chapters.map(c => [c.url, c.name, c.number])).toEqual([
      ['https://buddy.test/solo-hero/chapter-12', 'Chapter 12', 12],
      ['https://buddy.test/solo-hero/chapter-11', 'Chapter 11.5', 11.5],
    ]);
    expect(detail.chapters[0].date).toBe('Oct 1, 2026');
    expect(detail.chapters[0].time).toBe(new Date(2026, 9, 1).getTime());
  });

  test('detail kiểu KaliScan: lấy toàn bộ chương qua chaplist theo bookId', async () => {
    const kali = mk('kali.test');
    const { calls } = mockFetch([
      { match: urlIs('https://kali.test/manga/10163-nano-machine'), body: KALI_DETAIL },
      { match: urlStarts('https://kali.test/service/backend/chaplist/'), body: KALI_CHAPLIST },
    ]);
    const detail = await madtheme.detail(kali, 'https://kali.test/manga/10163-nano-machine');
    expect(calls[1].url).toBe('https://kali.test/service/backend/chaplist/?manga_id=10163&manga_name=Nano%20Machine');
    expect((calls[1].init?.headers as Record<string, string>)['X-Requested-With']).toBe('XMLHttpRequest');
    expect(detail.altTitles).toEqual(['Nano Mashin', '나노마신']);
    expect(detail.chapters.map(c => c.number)).toEqual([4, 3, 2, 1]);
    expect(detail.chapters[0].date).toBe('3 hours ago');
    expect(detail.chapters[3].url).toBe('https://kali.test/manga/10163-nano-machine/chapter-1');
  });

  test('chapter đọc chapImages (đường dẫn tương đối ghép mainServer) kèm Referer', async () => {
    mockFetch([
      {
        match: urlIs('https://buddy.test/solo-hero/chapter-12'),
        body: `<div class="chapter-info"><h1>Solo Hero - Chapter 12</h1></div>
          <div id="chapter-images"><div class="chapter-image"><img data-src="//s1.cdn.test/res/a/1.jpg"></div></div>
          <script>var mainServer = "//s1.cdn.test"; var chapImages = '/res/a/1.jpg,/res/a/2.jpg,/res/a/3.jpg';</script>`,
      },
    ]);
    const content = await madtheme.chapter(src, 'https://buddy.test/solo-hero/chapter-12');
    expect(content).toEqual({
      kind: 'images',
      title: 'Solo Hero - Chapter 12',
      pages: [1, 2, 3].map(n => ({
        uri: `https://s1.cdn.test/res/a/${n}.jpg`,
        headers: { Referer: 'https://buddy.test/' },
      })),
    });
  });

  test('chapter rơi về chapterServer khi trang không có ảnh', async () => {
    const kali = mk('kali.test');
    const { calls } = mockFetch([
      {
        match: urlIs('https://kali.test/manga/10163-nano-machine/chapter-4'),
        body: `<script>var bookId = 10163; var chapterId = 3888476;</script><div id="chapter-images"></div>`,
      },
      {
        match: urlStarts('https://kali.test/service/backend/chapterServer/'),
        body: `<div class="chapter-image" data-src="https://img.test/1.webp?acc=x"><span>1/2</span></div>
          <div class="chapter-image" data-src="https://img.test/2.webp?acc=y"></div>`,
      },
    ]);
    const content = await madtheme.chapter(kali, 'https://kali.test/manga/10163-nano-machine/chapter-4');
    expect(calls[1].url).toBe('https://kali.test/service/backend/chapterServer/?server_id=1&chapter_id=3888476');
    expect(content.kind === 'images' && content.pages.map(p => p.uri)).toEqual([
      'https://img.test/1.webp?acc=x',
      'https://img.test/2.webp?acc=y',
    ]);

    mockFetch([{ match: urlStarts('https://kali.test/'), body: '<div id="chapter-images"></div>' }]);
    await expect(madtheme.chapter(kali, 'https://kali.test/manga/x/chapter-1')).rejects.toThrow(
      'Không tìm thấy ảnh trong chương này.',
    );
  });

  test('classifyUrl, resolveMangaUrl và detect', async () => {
    expect(madtheme.classifyUrl(src, 'https://buddy.test/')).toBe('list');
    expect(madtheme.classifyUrl(src, 'https://buddy.test/search?q=hero')).toBe('list');
    expect(madtheme.classifyUrl(src, 'https://buddy.test/genres/action')).toBe('list');
    expect(madtheme.classifyUrl(src, 'https://buddy.test/latest?page=2')).toBe('list');
    expect(madtheme.classifyUrl(src, 'https://buddy.test/solo-hero')).toBe('detail');
    expect(madtheme.classifyUrl(src, 'https://buddy.test/solo-hero/chapter-12')).toBe('chapter');
    expect(madtheme.classifyUrl(src, 'https://kali.test/manga/10163-nano-machine')).toBe('detail');
    expect(madtheme.classifyUrl(src, 'https://kali.test/manga/10163-nano-machine/chapter-4')).toBe('chapter');
    expect(madtheme.classifyUrl(src, 'https://buddy.test/users/bookmark')).toBeNull();

    expect(await madtheme.resolveMangaUrl(src, 'https://buddy.test/solo-hero/chapter-12')).toBe(
      'https://buddy.test/solo-hero',
    );
    const kali = mk('kali.test');
    expect(await madtheme.resolveMangaUrl(kali, 'https://kali.test/manga/10163-nano-machine/chapter-4')).toBe(
      'https://kali.test/manga/10163-nano-machine',
    );

    expect(madtheme.detect?.('<script>var bookSlug = "solo-hero";</script>')).toBe(true);
    expect(madtheme.detect?.('<div class="suggestions" id=\'header-autocomplete-list\'></div>')).toBe(true);
    expect(madtheme.detect?.('<ul class="genres__wrapper clearfix"></ul>')).toBe(true);
    // Madara, Themesia, MangaBox.
    expect(madtheme.detect?.('<link href="/wp-content/themes/madara/style.css"><div class="page-item-detail">')).toBe(
      false,
    );
    expect(madtheme.detect?.('<div class="listupd"><div class="bs"><div class="bsx"></div></div></div>')).toBe(false);
    expect(madtheme.detect?.('<div class="itemupdate first"><div class="list-truyen-item-wrap"></div></div>')).toBe(
      false,
    );
  });
});
