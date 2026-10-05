import { decodeBase64 } from '../src/lib/base64';
import { imageSrc, paragraphsOf, parseChapterNumber, parseDate, parseHtml } from '../src/sources/html';

describe('html helpers', () => {
  test('imageSrc ưu tiên ảnh lazy-load thật, bỏ placeholder data:', () => {
    const $ = parseHtml(`
      <img id="a" src="data:image/gif;base64,R0lGOD" data-src="  /wp-content/1.jpg  ">
      <img id="b" srcset="/s.jpg 300w, /l.jpg 1200w" src="/fallback.jpg">
      <img id="c" src="data:image/png;base64,xx">
    `);
    const base = 'https://site.com/manga/x/';
    expect(imageSrc($('#a'), base)).toBe('https://site.com/wp-content/1.jpg');
    expect(imageSrc($('#b'), base)).toBe('https://site.com/l.jpg');
    expect(imageSrc($('#c'), base)).toBe('data:image/png;base64,xx');
  });

  test('parseChapterNumber đọc số chương nhiều ngôn ngữ', () => {
    expect(parseChapterNumber('Chapter 12.5 - The end')).toBe(12.5);
    expect(parseChapterNumber('Chương 7')).toBe(7);
    expect(parseChapterNumber('Capítulo 3')).toBe(3);
    expect(parseChapterNumber('Ep. 20')).toBe(20);
    expect(parseChapterNumber('Prologue')).toBeUndefined();
  });

  test('parseDate xử lý ngày tương đối và tuyệt đối', () => {
    const now = new Date(2026, 9, 4, 12, 0, 0).getTime();
    expect(parseDate('2 days ago', now)).toBe(now - 2 * 86_400_000);
    expect(parseDate('3 giờ trước', now)).toBe(now - 3 * 3_600_000);
    expect(parseDate('October 3, 2026', now)).toBe(new Date(2026, 9, 3).getTime());
    expect(parseDate('3 Oct 2026', now)).toBe(new Date(2026, 9, 3).getTime());
    expect(parseDate('2026-10-01', now)).toBe(new Date(2026, 9, 1).getTime());
    expect(parseDate('25/09/2026', now)).toBe(new Date(2026, 8, 25).getTime());
    expect(parseDate('', now)).toBeUndefined();
  });

  test('parseDate hiểu tên tháng và "trước" của nhiều ngôn ngữ', () => {
    const now = new Date(2026, 9, 4, 12, 0, 0).getTime();
    const day = (y: number, m: number, d: number) => new Date(y, m, d).getTime();
    expect(parseDate('23 Ekim 2025', now)).toBe(day(2025, 9, 23));
    expect(parseDate('3 de outubro de 2026', now)).toBe(day(2026, 9, 3));
    expect(parseDate('septiembre 12, 2026', now)).toBe(day(2026, 8, 12));
    expect(parseDate('5 juillet 2026', now)).toBe(day(2026, 6, 5));
    expect(parseDate('5 juin 2026', now)).toBe(day(2026, 5, 5));
    expect(parseDate('14 Agustus 2026', now)).toBe(day(2026, 7, 14));
    expect(parseDate('3 ตุลาคม 2569', now)).toBe(day(2026, 9, 3));
    expect(parseDate('2026年10月3日', now)).toBe(day(2026, 9, 3));
    expect(parseDate('Mayıs 9, 2026', now)).toBe(day(2026, 4, 9));
    expect(parseDate('2 gün önce', now)).toBe(now - 2 * 86_400_000);
    expect(parseDate('il y a 3 heures', now)).toBe(now - 3 * 3_600_000);
    expect(parseDate('5 วันที่แล้ว', now)).toBe(now - 5 * 86_400_000);
  });

  test('paragraphsOf lấy đoạn văn, bỏ quảng cáo/script', () => {
    const $ = parseHtml(`
      <div class="text-left">
        <p>Đoạn một.</p><script>ads()</script><p>Đoạn hai.</p>
        <div class="adsbygoogle">QC</div><p>Đoạn ba.</p>
      </div>`);
    expect(paragraphsOf($, $('.text-left'))).toEqual(['Đoạn một.', 'Đoạn hai.', 'Đoạn ba.']);

    const $br = parseHtml('<div id="t">Dòng 1<br>Dòng 2<br/><br>Dòng 3</div>');
    expect(paragraphsOf($br, $br('#t'))).toEqual(['Dòng 1', 'Dòng 2', 'Dòng 3']);
  });

  test('decodeBase64 giải được UTF-8', () => {
    // "ts_reader.run({}); Việt"
    expect(decodeBase64('dHNfcmVhZGVyLnJ1bih7fSk7IFZp4buHdA==')).toBe('ts_reader.run({}); Việt');
  });
});
