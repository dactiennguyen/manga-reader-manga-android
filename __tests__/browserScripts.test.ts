import { buildBridgeScript, JS_FIND_MEDIA, jsRequestHtml, parseBridgeMessage } from '../src/features/browser/scripts';

type FakeEl = {
  tagName: string;
  currentSrc?: string;
  attrs: Record<string, string>;
  textContent?: string;
  children?: FakeEl[];
  contentDocument?: FakeDoc;
};
type FakeDoc = { title: string; querySelectorAll: (selector: string) => FakeEl[] };

function el(tagName: string, attrs: Record<string, string> = {}, extra: Partial<FakeEl> = {}): FakeEl {
  return { tagName, attrs, ...extra };
}

function fakeDoc(title: string, nodes: FakeEl[]): FakeDoc {
  return {
    title,
    querySelectorAll: selector => {
      if (selector === 'video, audio') {
        return nodes.filter(n => n.tagName === 'VIDEO' || n.tagName === 'AUDIO');
      }
      if (selector === 'a[href]') {
        return nodes.filter(n => n.tagName === 'A');
      }
      if (selector === 'iframe') {
        return nodes.filter(n => n.tagName === 'IFRAME');
      }
      return [];
    },
  };
}

/** Chạy script như WebView: có document/location/window giả, trả về các message đã post. */
function runInPage(script: string, doc: FakeDoc, href: string): unknown[] {
  const posted: unknown[] = [];
  const withDom = (node: FakeEl) => ({
    ...node,
    getAttribute: (name: string) => node.attrs[name] ?? null,
    querySelectorAll: (selector: string) =>
      selector === 'source' ? (node.children ?? []).map(child => ({ getAttribute: (n: string) => child.attrs[n] ?? null })) : [],
  });
  const document = {
    title: doc.title,
    querySelectorAll: (selector: string) => doc.querySelectorAll(selector).map(withDom),
  };
  const window = { ReactNativeWebView: { postMessage: (data: string) => posted.push(JSON.parse(data)) } };
  // eslint-disable-next-line no-new-func
  new Function('document', 'location', 'window', 'URL', script)(document, { href }, window, URL);
  return posted;
}

describe('script chèn vào trang', () => {
  test('các script đều là JavaScript hợp lệ', () => {
    const bridge = buildBridgeScript({ adblock: true, longPress: true, findColor: '#ff0', findCurrentColor: '#f80' });
    for (const script of [bridge, JS_FIND_MEDIA, jsRequestHtml('run', 1000)]) {
      // eslint-disable-next-line no-new-func
      expect(() => new Function(script)).not.toThrow();
    }
  });

  test('tìm video/âm thanh tải được, bỏ blob: và luồng HLS', () => {
    const doc = fakeDoc('Trang phim', [
      el('VIDEO', { src: '/media/clip.mp4' }, { currentSrc: 'https://site.com/media/clip.mp4' }),
      el('VIDEO', {}, { currentSrc: 'blob:https://site.com/abc' }),
      el('VIDEO', {}, { children: [el('SOURCE', { src: 'https://cdn.site.com/live/index.m3u8' })] }),
      el('AUDIO', { src: 'song.mp3', title: 'Bài hát' }),
      el('A', { href: '/files/movie.webm?token=1' }, { textContent: 'Tải bản webm' }),
      el('A', { href: '/about' }),
    ]);
    const [message] = runInPage(JS_FIND_MEDIA, doc, 'https://site.com/watch/1');
    const parsed = parseBridgeMessage(JSON.stringify(message));
    expect(parsed).toEqual({
      type: 'media',
      url: 'https://site.com/watch/1',
      items: [
        { url: 'https://site.com/media/clip.mp4', kind: 'video', label: 'Trang phim' },
        { url: 'https://site.com/watch/song.mp3', kind: 'audio', label: 'Bài hát' },
        { url: 'https://site.com/files/movie.webm?token=1', kind: 'video', label: 'Tải bản webm' },
      ],
    });
  });

  test('message media từ trang được lọc chặt', () => {
    const parsed = parseBridgeMessage(
      JSON.stringify({
        type: 'media',
        url: 'https://a.com',
        // eslint-disable-next-line no-script-url -- dữ liệu độc hại giả lập, phải bị lọc bỏ
        items: [{ url: 'javascript:alert(1)' }, { url: 'https://a.com/x.mp4', kind: 'weird' }, null],
      }),
    );
    expect(parsed).toEqual({
      type: 'media',
      url: 'https://a.com',
      items: [{ url: 'https://a.com/x.mp4', kind: 'video', label: '' }],
    });
  });
});
