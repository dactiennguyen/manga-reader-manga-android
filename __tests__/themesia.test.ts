import { themesia } from '../src/sources/engines/themesia';
import type { SourceConfig } from '../src/sources/types';
import { mockFetch, urlIs, urlStarts } from './helpers/mockFetch';

const src: SourceConfig = {
  id: 'ts.test',
  engine: 'themesia',
  name: 'Themesia Test',
  baseUrl: 'https://ts.test',
  content: 'manga',
  lang: 'en',
  nsfw: false,
  enabled: true,
  addedAt: 0,
};

describe('themesia engine', () => {
  test('list dựng URL theo order và parse .bsx', async () => {
    const { calls } = mockFetch([
      {
        match: urlStarts('https://ts.test/manga/'),
        body: `<div class="listupd">
            <div class="bs"><div class="bsx"><a href="https://ts.test/manga/tower/" title="Tower">
              <div class="limit"><img src="https://ts.test/t.webp"></div>
              <div class="bigor"><div class="tt">Tower Climber</div><div class="epxs">Chapter 99</div></div>
            </a></div></div>
          </div>
          <div class="hpage"><a class="r" href="?page=2">Next</a></div>`,
      },
    ]);
    const page = await themesia.list(src, 'popular', 1);
    expect(calls[0].url).toBe('https://ts.test/manga/?page=1&order=popular');
    expect(page).toEqual({
      items: [{ url: 'https://ts.test/manga/tower/', title: 'Tower Climber', cover: 'https://ts.test/t.webp', subtitle: 'Chapter 99' }],
      hasNext: true,
    });
  });

  test('detail parse thông tin, chương, điểm thang 10 → 5', async () => {
    mockFetch([
      {
        match: urlIs('https://ts.test/manga/tower/'),
        body: `<h1 class="entry-title">Tower Climber</h1>
          <div class="thumb"><img src="https://ts.test/t.webp"></div>
          <div class="entry-content" itemprop="description"><p>Leo tháp.</p></div>
          <div class="imptdt">Status <i>Ongoing</i></div>
          <div class="imptdt">Author <i>Lee, Park</i></div>
          <div class="num" itemprop="ratingValue">8.4</div>
          <div class="mgen"><a href="https://ts.test/genres/action/">Action</a></div>
          <div id="chapterlist"><ul>
            <li data-num="2"><a href="https://ts.test/tower-chapter-2/"><span class="chapternum">Chapter 2</span><span class="chapterdate">October 2, 2026</span></a></li>
            <li data-num="1"><a href="https://ts.test/tower-chapter-1/"><span class="chapternum">Chapter 1</span><span class="chapterdate">October 1, 2026</span></a></li>
          </ul></div>`,
      },
    ]);
    const detail = await themesia.detail(src, 'https://ts.test/manga/tower/');
    expect(detail.title).toBe('Tower Climber');
    expect(detail.status).toBe('Ongoing');
    expect(detail.authors).toEqual(['Lee', 'Park']);
    expect(detail.rating).toBe(4.2);
    expect(detail.genres).toEqual([{ id: 'action', name: 'Action' }]);
    expect(detail.chapters.map(c => c.url)).toEqual([
      'https://ts.test/tower-chapter-2/',
      'https://ts.test/tower-chapter-1/',
    ]);
    expect(detail.chapters[1].time).toBe(new Date(2026, 9, 1).getTime());
  });

  test('chapter đọc ảnh từ ts_reader.run, kể cả script base64', async () => {
    // base64 của: ts_reader.run({"sources":[{"source":"Server 1","images":["https://cdn.ts/1.jpg","https://cdn.ts/2.jpg"]}]});
    const encoded =
      'dHNfcmVhZGVyLnJ1bih7InNvdXJjZXMiOlt7InNvdXJjZSI6IlNlcnZlciAxIiwiaW1hZ2VzIjpbImh0dHBzOi8vY2RuLnRzLzEuanBnIiwiaHR0cHM6Ly9jZG4udHMvMi5qcGciXX1dfSk7';
    mockFetch([
      {
        match: urlIs('https://ts.test/tower-chapter-2/'),
        body: `<h1 class="entry-title">Tower Climber Chapter 2</h1><div id="readerarea"></div>
          <script src="data:text/javascript;base64,${encoded}"></script>`,
      },
    ]);
    const content = await themesia.chapter(src, 'https://ts.test/tower-chapter-2/');
    expect(content.kind).toBe('images');
    expect(content.kind === 'images' && content.pages.map(p => p.uri)).toEqual([
      'https://cdn.ts/1.jpg',
      'https://cdn.ts/2.jpg',
    ]);
  });

  test('chapter rơi về ảnh trong #readerarea (kể cả noscript)', async () => {
    mockFetch([
      {
        match: urlIs('https://ts.test/x-chapter-1/'),
        body: `<div id="readerarea"><noscript><p><img src="https://cdn.ts/a.jpg"><img src="https://cdn.ts/b.jpg"></p></noscript></div>`,
      },
    ]);
    const content = await themesia.chapter(src, 'https://ts.test/x-chapter-1/');
    expect(content.kind === 'images' && content.pages.map(p => p.uri)).toEqual([
      'https://cdn.ts/a.jpg',
      'https://cdn.ts/b.jpg',
    ]);
  });

  test('classifyUrl dùng HTML khi URL truyện và chương trùng mẫu', async () => {
    expect(themesia.classifyUrl(src, 'https://ts.test/manga/tower/')).toBe('detail');
    expect(themesia.classifyUrl(src, 'https://ts.test/tower-chapter-2/')).toBe('chapter');
    expect(themesia.classifyUrl(src, 'https://ts.test/oneshot-special/', '<div id="readerarea">')).toBe('chapter');
    expect(themesia.classifyUrl(src, 'https://ts.test/oneshot-special/', '<div id="chapterlist">')).toBe('detail');
    expect(themesia.classifyUrl(src, 'https://ts.test/oneshot-special/')).toBeNull();
    expect(
      await themesia.resolveMangaUrl(src, 'https://ts.test/tower-chapter-2/', '<div class="allc">All chapters are in <a href="/manga/tower/">Tower</a></div>'),
    ).toBe('https://ts.test/manga/tower/');
  });
});
