#!/usr/bin/env python3
"""
Sinh `siteInfo` (danh mục "Site được hỗ trợ") trong addons/<uid>/info.json từ
kết quả test thật docs/rn-engine-test.csv (npm run test:live). Chạy xong thì
build lại addon: npm run addons.

Chỉ đưa vào:
  - site chạy trọn luồng qua engine;
  - site còn sống nhưng không kiểm được từ máy test: bị Cloudflare chặn bot
    (ghi chú "cloudflare"), bị nhà mạng chặn (ghi chú "blocked"), hoặc chỉ
    chậm quá thời gian chờ mà addon gốc vẫn đọc được.
Site đã chết, đổi theme, chuyển sang domain parking… bị loại.

Addon chỉ dành cho một site (MangaDex, Manga Fox…) giữ siteInfo viết tay
(một site, "builtin": true), script không đụng tới.
"""
import csv
import json
import os
import re

ROOT = os.path.join(os.path.dirname(__file__), '..')
RESULTS = os.path.join(ROOT, 'docs/rn-engine-test.csv')
ADDONS = os.path.join(ROOT, 'addons')

SINGLE_SITE = {'mangadex', 'fanfox', 'mangatown', 'weebcentral', 'mangakatana'}
NOVEL_ADDONS = {'madara_novel', 'html_novel'}


def host_of(url: str) -> str:
    m = re.match(r'^[a-z]+://([^/?#]+)', url or '', re.I)
    return m.group(1).lower() if m else ''


def strip_www(host: str) -> str:
    return re.sub(r'^www\.', '', host)


def brand(host: str) -> str:
    """Phần tên chính của domain: "01.kaguya.pro" → "kaguya", "x.com.tr" → "x"."""
    labels = host.split('.')
    if len(labels) >= 3 and labels[-2] in ('com', 'co', 'net', 'org') and len(labels[-1]) == 2:
        return labels[-3]
    return labels[-2] if len(labels) >= 2 else host


def same_site(key: str, host: str) -> bool:
    a, b = brand(strip_www(key)), brand(strip_www(host))
    return a == b or a in b or b in a


def note_of(row: dict) -> str | None:
    """None: chạy được; '' : loại; 'cloudflare' / 'blocked': giữ kèm ghi chú."""
    if row['ok'] == 'true':
        return None
    error = row['error']
    if error.startswith('[cloudflare]') or (row['step'] == 'image' and 'http 403' in error):
        return 'cloudflare'
    unreachable = error.startswith('Không kết nối được') or error.startswith('Hết thời gian')
    if unreachable and row['bucket'].startswith('3_'):
        return 'blocked'
    if error.startswith('Hết thời gian') and row['origOk'] == 'true':
        return None
    return ''


def main() -> None:
    with open(RESULTS, encoding='utf-8-sig') as f:
        rows = list(csv.DictReader(f))

    sites: dict[str, dict] = {}
    rank: dict[str, int] = {}
    for row in rows:
        engine = row['engine']
        if not engine or engine in SINGLE_SITE:
            continue
        note = note_of(row)
        if note == '':
            continue
        # Chưa kiểm chứng mà domain đã redirect sang tên khác hẳn: site bị bán/chiếm.
        if note and not same_site(row['key'], row['host']):
            continue
        base = row['baseUrl'] or f"https://{row['host']}"
        host = host_of(base)
        site_id = strip_www(host)
        if not site_id or site_id.startswith('ww38.'):
            continue
        site = {'id': site_id, 'name': row['name'].strip() or site_id, 'engine': engine}
        if base.rstrip('/') != f'https://{site_id}':
            site['url'] = base.rstrip('/')
        site['lang'] = row['lang'] or 'en'
        if row['addon'] in NOVEL_ADDONS:
            site['content'] = 'novel'
        if row['nsfw'] in ('true', 'True'):
            site['nsfw'] = True
        # Thư mục chỉ đáng tin khi dò được theme trên trang chủ.
        if row['detected'] not in ('', '-') and row['mangaDir'] and row['mangaDir'] != 'manga':
            site['mangaDir'] = row['mangaDir']
        if note:
            site['note'] = note
        # Trùng domain (site cũ redirect về site mới): giữ bản chạy được.
        score = 2 if row['ok'] == 'true' else 1
        if score > rank.get(site_id, 0):
            sites[site_id] = site
            rank[site_id] = score

    by_engine: dict[str, dict[str, dict]] = {}
    for site in sites.values():
        entry = {k: v for k, v in site.items() if k not in ('id', 'engine', 'name')}
        by_engine.setdefault(site['engine'], {})[site['id']] = {'title': site['name'], **entry}

    total = noted = 0
    for engine, entries in sorted(by_engine.items()):
        path = os.path.join(ADDONS, engine, 'info.json')
        with open(path, encoding='utf-8') as f:
            info = json.load(f)
        if not info.get('allowCustomSites'):
            continue
        info.pop('siteInfo', None)
        head = json.dumps(info, ensure_ascii=False, indent=2)
        rows = [
            f'    {json.dumps(sid)}: {json.dumps(entries[sid], ensure_ascii=False)}'
            for sid in sorted(entries, key=lambda k: entries[k]['title'].lower())
        ]
        text = head[:-2] + ',\n  "siteInfo": {\n' + ',\n'.join(rows) + '\n  }\n}\n'
        with open(path, 'w', encoding='utf-8') as f:
            f.write(text)
        total += len(entries)
        noted += sum(1 for e in entries.values() if 'note' in e)
        print(f'  addons/{engine}/info.json: {len(entries)} site')
    print(f'{total} site ({total - noted} đã kiểm chứng, {noted} có ghi chú). Chạy "npm run addons" để build lại.')


if __name__ == '__main__':
    main()
