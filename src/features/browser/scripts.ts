import { COSMETIC_CSS } from '../../lib/adblock';

/**
 * Script chạy trong trang (bridge WebView ↔ RN). Mọi tin nhắn là JSON `{type, ...}`.
 *
 * Android gọi injectedJavaScriptBeforeContentLoaded ở onPageStarted (có thể
 * chạy trước khi document mới sẵn sàng), nên cùng script được gắn lại ở
 * injectedJavaScript; cờ `window.__mr` giúp nó chỉ cài một lần mỗi trang.
 */

export type HtmlPurpose = 'run' | 'autorun' | 'detect' | 'save';

export type BridgeMessage =
  | { type: 'ua'; ua: string }
  | { type: 'resources'; hosts: string[] }
  | { type: 'html'; purpose: HtmlPurpose; url: string; html: string }
  | { type: 'longpress'; href: string; text: string; src: string }
  | { type: 'find'; count: number; index: number }
  | { type: 'pull' };

const PURPOSES: HtmlPurpose[] = ['run', 'autorun', 'detect', 'save'];

const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const num = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

/** Kiểm tra dữ liệu từ trang — trang web có thể tự gọi postMessage nên không tin mù quáng. */
export function parseBridgeMessage(data: string): BridgeMessage | null {
  let raw: unknown;
  try {
    raw = JSON.parse(data);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const msg = raw as Record<string, unknown>;
  switch (msg.type) {
    case 'ua':
      return str(msg.ua) ? { type: 'ua', ua: str(msg.ua) } : null;
    case 'resources':
      return Array.isArray(msg.hosts)
        ? { type: 'resources', hosts: msg.hosts.filter((h): h is string => typeof h === 'string').slice(0, 500) }
        : null;
    case 'html': {
      const purpose = PURPOSES.find(p => p === msg.purpose);
      return purpose ? { type: 'html', purpose, url: str(msg.url), html: str(msg.html) } : null;
    }
    case 'longpress':
      return { type: 'longpress', href: str(msg.href), text: str(msg.text), src: str(msg.src) };
    case 'find':
      return { type: 'find', count: num(msg.count, 0), index: num(msg.index, -1) };
    case 'pull':
      return { type: 'pull' };
    default:
      return null;
  }
}

export type BridgeConfig = {
  /** Chèn CSS ẩn quảng cáo và báo host tài nguyên về app. */
  adblock: boolean;
  /** Nhấn giữ link/ảnh để mở menu. */
  longPress: boolean;
  /** Màu tô kết quả "Tìm trong trang". */
  findColor: string;
  findCurrentColor: string;
};

export function buildBridgeScript(config: BridgeConfig): string {
  const cfg = JSON.stringify({
    adblock: config.adblock,
    longPress: config.longPress,
    css: config.adblock ? `${COSMETIC_CSS}{display:none!important;}` : '',
    findCss:
      `mark.__mr_find{background:${config.findColor}!important;color:inherit!important;padding:0!important;}` +
      `mark.__mr_find.__mr_cur{background:${config.findCurrentColor}!important;}`,
  });
  return `
(function () {
  if (window.__mr) { return; }
  var CFG = ${cfg};
  var mr = { blocked: {}, reported: {}, anyBlocked: false };
  window.__mr = mr;

  function post(msg) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); } catch (e) {}
  }
  function hostOf(url) {
    var m = /^https?:\\/\\/([^\\/?#:@]+)/i.exec(url || '');
    return m ? m[1].toLowerCase().replace(/^www\\./, '') : '';
  }
  function whenReady(fn) {
    if (document.documentElement) { fn(); } else { document.addEventListener('DOMContentLoaded', fn); }
  }
  function addStyle(id, css) {
    if (!css || document.getElementById(id)) { return; }
    var root = document.head || document.documentElement;
    if (!root) { return; }
    var style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    root.appendChild(style);
  }

  post({ type: 'ua', ua: navigator.userAgent });

  /* ── Chặn quảng cáo: báo host tài nguyên, gỡ phần tử của host bị chặn ── */
  function isBlocked(host) {
    var h = host;
    while (h && h.indexOf('.') > 0) {
      if (mr.blocked[h]) { return true; }
      h = h.slice(h.indexOf('.') + 1);
    }
    return false;
  }
  var TAGS = 'iframe,script[src],img,embed,object,ins';
  function srcOf(el) {
    return el.src || el.data || (el.getAttribute && (el.getAttribute('src') || el.getAttribute('data-src'))) || '';
  }
  function check(el) {
    if (!el || el.nodeType !== 1 || !el.matches || !el.matches(TAGS)) { return false; }
    var src = srcOf(el);
    if (src && isBlocked(hostOf(src)) && el.parentNode) {
      el.parentNode.removeChild(el);
      return true;
    }
    return false;
  }
  function sweep(root) {
    if (!root || !root.querySelectorAll) { return; }
    var list = root.querySelectorAll(TAGS);
    for (var i = 0; i < list.length; i++) { check(list[i]); }
  }
  mr.block = function (hosts) {
    for (var i = 0; i < hosts.length; i++) { mr.blocked[hosts[i]] = 1; }
    mr.anyBlocked = true;
    whenReady(function () { sweep(document); });
  };

  var reportTimer = 0;
  var lastReport = 0;
  var perfIndex = 0;
  function collect() {
    var hosts = [];
    function add(url) {
      var h = hostOf(url);
      if (h && !mr.reported[h]) { mr.reported[h] = 1; hosts.push(h); }
    }
    try {
      var entries = performance.getEntriesByType('resource');
      for (var i = perfIndex; i < entries.length; i++) { add(entries[i].name); }
      perfIndex = entries.length;
      if (entries.length > 200 && performance.clearResourceTimings) {
        performance.clearResourceTimings();
        perfIndex = 0;
      }
    } catch (e) {}
    if (document.querySelectorAll) {
      var els = document.querySelectorAll('iframe[src],script[src],img[src]');
      for (var j = 0; j < els.length; j++) { add(els[j].src); }
    }
    if (hosts.length) { post({ type: 'resources', hosts: hosts }); }
  }
  function scheduleReport() {
    if (!CFG.adblock || reportTimer) { return; }
    var wait = Math.max(300, 1500 - (Date.now() - lastReport));
    reportTimer = setTimeout(function () {
      reportTimer = 0;
      lastReport = Date.now();
      collect();
    }, wait);
  }

  if (CFG.adblock) {
    whenReady(function () {
      addStyle('__mr_adblock', CFG.css);
      if (!window.MutationObserver) { return; }
      new MutationObserver(function (records) {
        var added = false;
        for (var i = 0; i < records.length; i++) {
          var nodes = records[i].addedNodes;
          for (var j = 0; j < nodes.length; j++) {
            var node = nodes[j];
            if (node.nodeType !== 1) { continue; }
            added = true;
            if (mr.anyBlocked && !check(node)) { sweep(node); }
          }
        }
        if (added) { scheduleReport(); }
      }).observe(document.documentElement, { childList: true, subtree: true });
    });
    document.addEventListener('DOMContentLoaded', function () {
      addStyle('__mr_adblock', CFG.css);
      scheduleReport();
    });
    window.addEventListener('load', scheduleReport);
    scheduleReport();
  }

  /* ── Nhấn giữ link/ảnh ── */
  if (CFG.longPress) {
    var lp = { timer: 0, x: 0, y: 0, suppressUntil: 0 };
    var cancelLp = function () {
      if (lp.timer) { clearTimeout(lp.timer); lp.timer = 0; }
    };
    document.addEventListener('touchstart', function (e) {
      cancelLp();
      if (!e.touches || e.touches.length !== 1) { return; }
      var target = e.target;
      if (!target || !target.closest) { return; }
      var link = target.closest('a[href]');
      var img = target.closest('img');
      var href = link && /^https?:/i.test(link.href) ? link.href : '';
      var src = img ? (img.currentSrc || img.src || '') : '';
      if (src && !/^(https?|data):/i.test(src)) { src = ''; }
      if (!href && !src) { return; }
      lp.x = e.touches[0].clientX;
      lp.y = e.touches[0].clientY;
      lp.timer = setTimeout(function () {
        lp.timer = 0;
        lp.suppressUntil = Date.now() + 800;
        var text = link ? String(link.innerText || link.textContent || '').trim().slice(0, 500) : '';
        try { window.getSelection().removeAllRanges(); } catch (err) {}
        post({ type: 'longpress', href: href, text: text, src: src });
      }, 500);
    }, { capture: true, passive: true });
    document.addEventListener('touchmove', function (e) {
      if (!lp.timer || !e.touches || !e.touches.length) { return; }
      var dx = e.touches[0].clientX - lp.x;
      var dy = e.touches[0].clientY - lp.y;
      if (dx * dx + dy * dy > 100) { cancelLp(); }
    }, { capture: true, passive: true });
    document.addEventListener('touchend', cancelLp, { capture: true, passive: true });
    document.addEventListener('touchcancel', cancelLp, { capture: true, passive: true });
    var swallow = function (e) {
      if (Date.now() < lp.suppressUntil) { e.preventDefault(); e.stopPropagation(); }
    };
    document.addEventListener('click', swallow, true);
    document.addEventListener('contextmenu', swallow, true);
  }

  /* ── Kéo xuống ở đầu trang để tải lại ── */
  var pull = { y: -1, x: 0, dy: 0, dx: 0 };
  function atTop(target) {
    var se = document.scrollingElement || document.documentElement;
    if ((se && se.scrollTop > 0) || window.scrollY > 0) { return false; }
    for (var el = target; el && el.nodeType === 1 && el !== document.body; el = el.parentNode) {
      if (el.scrollTop > 0) { return false; }
    }
    return true;
  }
  document.addEventListener('touchstart', function (e) {
    pull.y = -1;
    if (!e.touches || e.touches.length !== 1 || !atTop(e.target)) { return; }
    pull.y = e.touches[0].clientY;
    pull.x = e.touches[0].clientX;
    pull.dy = 0;
    pull.dx = 0;
  }, { capture: true, passive: true });
  document.addEventListener('touchmove', function (e) {
    if (pull.y < 0 || !e.touches || !e.touches.length) { return; }
    pull.dy = e.touches[0].clientY - pull.y;
    pull.dx = e.touches[0].clientX - pull.x;
    if (window.scrollY > 0) { pull.y = -1; }
  }, { capture: true, passive: true });
  document.addEventListener('touchend', function () {
    if (pull.y >= 0 && pull.dy > 160 && Math.abs(pull.dx) < pull.dy / 2 && window.scrollY <= 0) {
      post({ type: 'pull' });
    }
    pull.y = -1;
  }, { capture: true, passive: true });

  /* ── Tìm trong trang ── */
  var found = { marks: [], index: -1 };
  mr.findClear = function () {
    var parents = [];
    for (var i = 0; i < found.marks.length; i++) {
      var mark = found.marks[i];
      var parent = mark.parentNode;
      if (!parent) { continue; }
      parent.replaceChild(document.createTextNode(mark.textContent), mark);
      if (parents.indexOf(parent) < 0) { parents.push(parent); }
    }
    for (var j = 0; j < parents.length; j++) { parents[j].normalize(); }
    found.marks = [];
    found.index = -1;
  };
  mr.findStep = function (delta) {
    var count = found.marks.length;
    if (!count) { post({ type: 'find', count: 0, index: -1 }); return; }
    if (found.index >= 0 && found.marks[found.index]) { found.marks[found.index].className = '__mr_find'; }
    found.index = found.index < 0 ? 0 : (found.index + delta + count) % count;
    var current = found.marks[found.index];
    current.className = '__mr_find __mr_cur';
    try { current.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch (e) { current.scrollIntoView(); }
    post({ type: 'find', count: count, index: found.index });
  };
  mr.find = function (query) {
    mr.findClear();
    var q = String(query || '').toLowerCase();
    if (!q || !document.body) { post({ type: 'find', count: 0, index: -1 }); return; }
    addStyle('__mr_find_style', CFG.findCss);
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var parent = node.parentNode;
        if (!parent || /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|OPTION)$/.test(parent.nodeName)) { return NodeFilter.FILTER_REJECT; }
        if (!node.nodeValue || node.nodeValue.toLowerCase().indexOf(q) < 0) { return NodeFilter.FILTER_REJECT; }
        return parent.getClientRects().length ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var nodes = [];
    var next;
    while ((next = walker.nextNode())) { nodes.push(next); }
    for (var i = 0; i < nodes.length && found.marks.length < 1000; i++) {
      var node = nodes[i];
      var text = node.nodeValue;
      var lower = text.toLowerCase();
      var frag = document.createDocumentFragment();
      var pos = 0;
      var at;
      while ((at = lower.indexOf(q, pos)) >= 0 && found.marks.length < 1000) {
        if (at > pos) { frag.appendChild(document.createTextNode(text.slice(pos, at))); }
        var mark = document.createElement('mark');
        mark.className = '__mr_find';
        mark.textContent = text.slice(at, at + q.length);
        frag.appendChild(mark);
        found.marks.push(mark);
        pos = at + q.length;
      }
      if (pos < text.length) { frag.appendChild(document.createTextNode(text.slice(pos))); }
      node.parentNode.replaceChild(frag, node);
    }
    mr.findStep(0);
  };
})();
true;
`;
}

const call = (expression: string) => `try { ${expression} } catch (e) {} true;`;

export const jsBlockHosts = (hosts: string[]) =>
  call(`window.__mr && window.__mr.block(${JSON.stringify(hosts)});`);

export const jsFind = (query: string) => call(`window.__mr && window.__mr.find(${JSON.stringify(query)});`);

export const jsFindStep = (delta: 1 | -1) => call(`window.__mr && window.__mr.findStep(${delta});`);

export const JS_FIND_CLEAR = call('window.__mr && window.__mr.findClear();');

/** Lấy HTML trang hiện tại. Tự chứa, không phụ thuộc bridge (phòng khi script chưa cài được). */
export function jsRequestHtml(purpose: HtmlPurpose, limit = 0): string {
  const cut = limit > 0 ? `if (h.length > ${limit}) { h = h.slice(0, ${limit}); }` : '';
  return `(function () {
  try {
    var h = document.documentElement ? document.documentElement.outerHTML : '';
    ${cut}
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'html', purpose: ${JSON.stringify(purpose)}, url: location.href, html: h }));
  } catch (e) {}
})();
true;`;
}

export const jsNavigate = (url: string) => call(`window.location.assign(${JSON.stringify(url)});`);

/** Xoá localStorage/sessionStorage của site hiện tại ("Cookie & dữ liệu trang"). */
export const JS_CLEAR_STORAGE = call('localStorage.clear(); sessionStorage.clear();');
