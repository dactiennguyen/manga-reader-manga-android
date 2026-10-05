import type { SourceConfig } from '../src/sources/types';
import { sourceEngine } from './helpers/addons';
import { mockFetch, urlIs, urlStarts } from './helpers/mockFetch';

const madara = sourceEngine('madara');

const src: SourceConfig = {
  id: 'madara.test',
  engine: 'madara',
  name: 'Madara Test',
  baseUrl: 'https://madara.test',
  content: 'manga',
  lang: 'en',
  nsfw: false,
  enabled: true,
  addedAt: 0,
};

const LISTING = `
<div class="page-listing-item">
  <div class="page-item-detail manga">
    <div class="item-thumb"><a href="https://madara.test/manga/solo-hero/"><img data-src="https://madara.test/cover1.jpg" src="data:image/gif;base64,R0"></a></div>
    <div class="item-summary">
      <div class="post-title font-title"><h3 class="h5"><a href="https://madara.test/manga/solo-hero/">Solo Hero</a></h3></div>
      <div class="list-chapter"><div class="chapter-item"><span class="chapter"><a href="/manga/solo-hero/chapter-12/">Chapter 12</a></span></div></div>
    </div>
  </div>
  <div class="page-item-detail manga">
    <div class="item-thumb"><img srcset="/c2-small.jpg 110w, /c2.jpg 350w"></div>
    <div class="post-title"><h3><a href="/manga/second/">Second Story</a></h3></div>
  </div>
</div>
<div class="nav-previous float-left"><a href="https://madara.test/manga/page/2/">Older Posts</a></div>`;

const DETAIL_NO_CHAPTERS = `
<div class="post-title"><h1>Solo Hero <span class="manga-title-badges hot">HOT</span></h1></div>
<div class="summary_image"><img data-src="https://madara.test/cover1.jpg"></div>
<div class="post-content_item"><div class="summary-heading"><h5>Alternative</h5></div><div class="summary-content">Hero Solo; 솔로 히어로</div></div>
<div class="post-content_item"><div class="summary-heading"><h5>Status</h5></div><div class="summary-content">OnGoing</div></div>
<div class="author-content"><a href="#">Kim</a></div>
<div class="genres-content"><a href="https://madara.test/manga-genre/action/">Action</a>, <a href="https://madara.test/manga-genre/mature/">Mature</a></div>
<div class="description-summary"><div class="summary__content"><p>First line.</p><p>Second line.</p></div></div>
<span id="averagerate">4.6</span>
<div id="manga-chapters-holder" data-id="777"></div>`;

const CHAPTERS_AJAX = `
<ul>
  <li class="wp-manga-chapter"><a href="https://madara.test/manga/solo-hero/chapter-12/">Chapter 12 </a><span class="chapter-release-date"><a class="c-new-tag" title="2 days ago">new</a></span></li>
  <li class="wp-manga-chapter"><a href="https://madara.test/manga/solo-hero/chapter-11/">Chapter 11</a><span class="chapter-release-date"><i>October 1, 2026</i></span></li>
</ul>`;

describe('madara engine', () => {
  test('list dựng đúng URL và parse danh sách', async () => {
    const { calls } = mockFetch([{ match: urlStarts('https://madara.test/manga/'), body: LISTING }]);
    const page = await madara.list(src, 'popular', 1);
    expect(calls[0].url).toBe('https://madara.test/manga/?m_orderby=views');
    expect(page.hasNext).toBe(true);
    expect(page.items).toEqual([
      {
        url: 'https://madara.test/manga/solo-hero/',
        title: 'Solo Hero',
        cover: 'https://madara.test/cover1.jpg',
        subtitle: 'Chapter 12',
      },
      { url: 'https://madara.test/manga/second/', title: 'Second Story', cover: 'https://madara.test/c2.jpg', subtitle: undefined },
    ]);

    await madara.list(src, 'latest', 3);
    expect(calls[1].url).toBe('https://madara.test/manga/page/3/?m_orderby=latest');
  });

  test('detail lấy chương qua ajax/chapters khi trang không có sẵn', async () => {
    const { calls } = mockFetch([
      { match: urlIs('https://madara.test/manga/solo-hero/'), body: DETAIL_NO_CHAPTERS },
      {
        match: (url, init) => url === 'https://madara.test/manga/solo-hero/ajax/chapters/' && init?.method === 'POST',
        body: CHAPTERS_AJAX,
      },
    ]);
    const detail = await madara.detail(src, 'https://madara.test/manga/solo-hero/');
    expect(detail.title).toBe('Solo Hero');
    expect(detail.altTitles).toEqual(['Hero Solo', '솔로 히어로']);
    expect(detail.status).toBe('OnGoing');
    expect(detail.authors).toEqual(['Kim']);
    expect(detail.genres).toEqual([
      { id: 'action', name: 'Action' },
      { id: 'mature', name: 'Mature' },
    ]);
    expect(detail.description).toBe('First line.\n\nSecond line.');
    expect(detail.rating).toBe(4.6);
    expect(detail.nsfw).toBe(true);
    expect(detail.chapters.map(c => [c.name, c.number])).toEqual([
      ['Chapter 12', 12],
      ['Chapter 11', 11],
    ]);
    expect(detail.chapters[0].date).toBe('2 days ago');
    expect(calls).toHaveLength(2);
  });

  test('detail rơi về admin-ajax khi ajax/chapters lỗi', async () => {
    const { calls } = mockFetch([
      { match: urlIs('https://madara.test/manga/solo-hero/'), body: DETAIL_NO_CHAPTERS },
      {
        match: (url, init) =>
          url === 'https://madara.test/wp-admin/admin-ajax.php' &&
          String(init?.body).includes('action=manga_get_chapters') &&
          String(init?.body).includes('manga=777'),
        body: CHAPTERS_AJAX,
      },
    ]);
    const detail = await madara.detail(src, 'https://madara.test/manga/solo-hero/');
    expect(detail.chapters).toHaveLength(2);
    expect(calls.map(c => c.url)).toContain('https://madara.test/wp-admin/admin-ajax.php');
  });

  test('chapter lấy ảnh ở chế độ style=list kèm Referer', async () => {
    const { calls } = mockFetch([
      {
        match: urlIs('https://madara.test/manga/solo-hero/chapter-12/?style=list'),
        body: `<h1 id="chapter-heading">Solo Hero - Chapter 12</h1>
          <div class="reading-content">
            <div class="page-break"><img class="wp-manga-chapter-img" data-src=" https://cdn.test/1.jpg "></div>
            <div class="page-break"><img class="wp-manga-chapter-img" src="https://cdn.test/2.jpg"></div>
          </div>`,
      },
    ]);
    const content = await madara.chapter(src, 'https://madara.test/manga/solo-hero/chapter-12/');
    expect(calls[0].url).toContain('style=list');
    expect(content).toEqual({
      kind: 'images',
      title: 'Solo Hero - Chapter 12',
      pages: [
        { uri: 'https://cdn.test/1.jpg', headers: { Referer: 'https://madara.test/' } },
        { uri: 'https://cdn.test/2.jpg', headers: { Referer: 'https://madara.test/' } },
      ],
    });
  });

  test('chapter của nguồn novel trả về đoạn văn', async () => {
    mockFetch([
      {
        match: urlStarts('https://madara.test/novel/x/chapter-1/'),
        body: `<div class="reading-content"><div class="text-left"><p>Một.</p><p>Hai.</p><p>Ba.</p></div></div>`,
      },
    ]);
    const content = await madara.chapter({ ...src, content: 'novel' }, 'https://madara.test/novel/x/chapter-1/');
    expect(content).toEqual({ kind: 'text', title: undefined, paragraphs: ['Một.', 'Hai.', 'Ba.'] });
  });

  test('classifyUrl, resolveMangaUrl và detect', async () => {
    expect(madara.classifyUrl(src, 'https://madara.test/')).toBe('list');
    expect(madara.classifyUrl(src, 'https://madara.test/manga/')).toBe('list');
    expect(madara.classifyUrl(src, 'https://madara.test/manga/page/2/')).toBe('list');
    expect(madara.classifyUrl(src, 'https://madara.test/manga/solo-hero/')).toBe('detail');
    expect(madara.classifyUrl(src, 'https://madara.test/manga/solo-hero/chapter-3/')).toBe('chapter');
    expect(madara.classifyUrl(src, 'https://madara.test/?s=hero&post_type=wp-manga')).toBe('list');
    expect(await madara.resolveMangaUrl(src, 'https://madara.test/manga/solo-hero/chapter-3/')).toBe(
      'https://madara.test/manga/solo-hero/',
    );
    expect(madara.detect?.('<link href="/wp-content/themes/madara/style.css">')).toBe(true);
    expect(madara.detect?.('<div class="listupd"></div>')).toBe(false);
  });
});
