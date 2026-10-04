import {
  displayUrl,
  ensureScheme,
  getHost,
  getPath,
  getQueryParam,
  looksLikeUrl,
  pathSegments,
  resolveUrl,
  sameUrl,
  withQuery,
} from '../src/lib/url';

describe('url', () => {
  test('getHost bỏ www, cổng, viết thường', () => {
    expect(getHost('https://WWW.Example.com:8080/a/b?c=1')).toBe('example.com');
    expect(getHost('not a url')).toBe('');
  });

  test('resolveUrl xử lý đường dẫn tuyệt đối, tương đối, protocol-relative', () => {
    const base = 'https://site.com/manga/abc/chapter-1/';
    expect(resolveUrl('https://cdn.com/x.jpg', base)).toBe('https://cdn.com/x.jpg');
    expect(resolveUrl('//cdn.com/x.jpg', base)).toBe('https://cdn.com/x.jpg');
    expect(resolveUrl('/manga/xyz/', base)).toBe('https://site.com/manga/xyz/');
    expect(resolveUrl('../chapter-2/', base)).toBe('https://site.com/manga/abc/chapter-2/');
    expect(resolveUrl('img/01.jpg', base)).toBe('https://site.com/manga/abc/chapter-1/img/01.jpg');
    expect(resolveUrl('?page=2', base)).toBe('https://site.com/manga/abc/chapter-1/?page=2');
    expect(resolveUrl('', base)).toBe('');
  });

  test('withQuery gắn tham số, bỏ giá trị rỗng, hỗ trợ mảng', () => {
    expect(withQuery('https://a.com/x', { s: 'one piece', page: 2, empty: '' })).toBe(
      'https://a.com/x?s=one%20piece&page=2',
    );
    expect(withQuery('https://a.com/x?a=1', { 'tag[]': ['b', 'c'] })).toBe(
      'https://a.com/x?a=1&tag%5B%5D=b&tag%5B%5D=c',
    );
  });

  test('getQueryParam, getPath, pathSegments', () => {
    expect(getQueryParam('https://a.com/?s=hello+world&x=1', 's')).toBe('hello world');
    expect(getQueryParam('https://a.com/', 's')).toBeUndefined();
    expect(getPath('https://a.com/manga/abc/?x=1')).toBe('/manga/abc/');
    expect(pathSegments('https://a.com/manga/abc%20d/ch-1/')).toEqual(['manga', 'abc d', 'ch-1']);
  });

  test('looksLikeUrl phân biệt URL và từ khoá', () => {
    expect(looksLikeUrl('example.com')).toBe(true);
    expect(looksLikeUrl('https://example.com/path')).toBe(true);
    expect(looksLikeUrl('mangadex.org/title/abc')).toBe(true);
    expect(looksLikeUrl('localhost:8081')).toBe(true);
    expect(looksLikeUrl('one piece')).toBe(false);
    expect(looksLikeUrl('solo leveling')).toBe(false);
    expect(ensureScheme('example.com')).toBe('https://example.com');
  });

  test('sameUrl bỏ qua www, scheme, dấu / cuối và hash', () => {
    expect(sameUrl('https://www.a.com/manga/x/', 'http://a.com/manga/x#top')).toBe(true);
    expect(sameUrl('https://a.com/manga/x', 'https://a.com/manga/y')).toBe(false);
    expect(displayUrl('https://www.a.com/manga/')).toBe('a.com/manga');
  });
});
