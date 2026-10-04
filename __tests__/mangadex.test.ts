import { mangadex } from '../src/sources/engines/mangadex';
import { configureSources } from '../src/sources/runtime';
import type { SourceConfig } from '../src/sources/types';
import { mockFetch, urlStarts } from './helpers/mockFetch';

const src: SourceConfig = {
  id: 'mangadex.org',
  engine: 'mangadex',
  name: 'MangaDex',
  baseUrl: 'https://mangadex.org',
  content: 'manga',
  lang: 'en',
  nsfw: false,
  enabled: true,
  builtin: true,
  addedAt: 0,
  options: { chapterLang: 'vi' },
};

const MANGA_ID = '0aea9f43-d4a9-4bf7-bebc-550a512f9b95';

describe('mangadex engine', () => {
  afterEach(() => configureSources({ allowNsfw: false }));

  test('list gửi đúng tham số và map bìa', async () => {
    const { calls } = mockFetch([
      {
        match: urlStarts('https://api.mangadex.org/manga?'),
        body: {
          total: 50,
          data: [
            {
              id: MANGA_ID,
              attributes: {
                title: { en: 'Hero' },
                altTitles: [{ vi: 'Anh Hùng' }],
                description: {},
                tags: [],
                lastChapter: '12',
              },
              relationships: [{ id: 'c1', type: 'cover_art', attributes: { fileName: 'cover.jpg' } }],
            },
          ],
        },
      },
    ]);
    const page = await mangadex.list(src, 'popular', 2);
    const url = decodeURIComponent(calls[0].url);
    expect(url).toContain('offset=24');
    expect(url).toContain('order[followedCount]=desc');
    expect(url).toContain('availableTranslatedLanguage[]=vi');
    expect(url).not.toContain('pornographic');
    expect(page.hasNext).toBe(true);
    expect(page.items[0]).toEqual({
      url: `https://mangadex.org/title/${MANGA_ID}`,
      title: 'Anh Hùng',
      cover: `https://uploads.mangadex.org/covers/${MANGA_ID}/cover.jpg.256.jpg`,
      subtitle: 'Chương 12',
    });
    expect((calls[0].init?.headers as Record<string, string>)['User-Agent']).toContain('MangaReader');
  });

  test('cho phép 18+ thì thêm contentRating', async () => {
    configureSources({ allowNsfw: true });
    const { calls } = mockFetch([{ match: urlStarts('https://api.mangadex.org/manga?'), body: { total: 0, data: [] } }]);
    await mangadex.search(src, 'abc', 1);
    expect(decodeURIComponent(calls[0].url)).toContain('contentRating[]=pornographic');
  });

  test('detail gộp thông tin, chương (bỏ chương link ngoài), thống kê', async () => {
    mockFetch([
      {
        match: urlStarts(`https://api.mangadex.org/manga/${MANGA_ID}?`),
        body: {
          data: {
            id: MANGA_ID,
            attributes: {
              title: { en: 'Hero' },
              altTitles: [{ ja: 'ヒーロー' }],
              description: { en: 'A [link](https://x.com) **bold** story' },
              status: 'ongoing',
              contentRating: 'safe',
              tags: [{ id: 't1', attributes: { name: { en: 'Action' }, group: 'genre' } }],
            },
            relationships: [{ id: 'a1', type: 'author', attributes: { name: 'Kim' } }],
          },
        },
      },
      {
        match: urlStarts(`https://api.mangadex.org/manga/${MANGA_ID}/feed`),
        body: {
          total: 2,
          data: [
            {
              id: 'ch-2',
              attributes: { volume: '1', chapter: '2', title: 'Two', publishAt: '2026-10-01T00:00:00Z', pages: 20 },
              relationships: [{ id: 'g1', type: 'scanlation_group', attributes: { name: 'Team A' } }],
            },
            {
              id: 'ch-ext',
              attributes: { chapter: '1', publishAt: '2026-09-01T00:00:00Z', externalUrl: 'https://official', pages: 0 },
              relationships: [],
            },
          ],
        },
      },
      {
        match: urlStarts('https://api.mangadex.org/statistics/manga/'),
        body: { statistics: { [MANGA_ID]: { rating: { bayesian: 8.31 }, follows: 1234 } } },
      },
    ]);
    const detail = await mangadex.detail(src, `https://mangadex.org/title/${MANGA_ID}/hero`);
    expect(detail.description).toBe('A link bold story');
    expect(detail.status).toBe('Đang tiến hành');
    expect(detail.authors).toEqual(['Kim']);
    expect(detail.rating).toBe(4.15);
    expect(detail.chapters).toHaveLength(1);
    expect(detail.chapters[0]).toMatchObject({
      url: 'https://mangadex.org/chapter/ch-2',
      name: 'Vol. 1 Ch. 2 - Two',
      scanlator: 'Team A',
      number: 2,
    });
  });

  test('chapter dựng URL ảnh từ at-home server', async () => {
    mockFetch([
      {
        match: urlStarts('https://api.mangadex.org/at-home/server/'),
        body: { baseUrl: 'https://node.test', chapter: { hash: 'h1', data: ['1.png', '2.png'] } },
      },
    ]);
    const content = await mangadex.chapter(src, 'https://mangadex.org/chapter/0aea9f43-d4a9-4bf7-bebc-550a512f9b95');
    expect(content).toEqual({
      kind: 'images',
      pages: [{ uri: 'https://node.test/data/h1/1.png' }, { uri: 'https://node.test/data/h1/2.png' }],
    });
  });
});
