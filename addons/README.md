# Addon

Mỗi thư mục ở đây là một addon, cùng cấu trúc với `assets/addons/<tên>/` của app gốc:

```
addons/<uid>/
├── info.json   # mô tả addon + danh sách site (siteInfo)
└── main.ts     # code: getURL, fetch, run, get, match, detect, imageHeaders
```

Lúc build, `main.ts` được biên dịch thành một đoạn JS độc lập. App nạp đoạn JS đó lúc chạy (`new Function`): có thể là bản có sẵn trong app (`src/addons/builtin.generated.ts`) hoặc bản mới hơn tải về từ kho addon. Nhờ vậy sửa parser không cần phát hành lại app.

## info.json

| Khoá | Ý nghĩa |
|---|---|
| `uid` | Trùng tên thư mục. Cũng là `engine` của site đã lưu. |
| `label`, `desc` | Tên và mô tả hiển thị ở màn Quản lý addon. |
| `version` | Số nguyên. Tăng mỗi lần sửa addon; app chỉ nhận bản tải về có version lớn hơn bản đang chạy. |
| `sdk` | Phiên bản SDK tối thiểu (`SDK_VERSION` trong `src/addons/sdk.ts`). |
| `content` | `["manga"]`, `["novel"]` hoặc cả hai. |
| `allowCustomSites` | Người dùng thêm được domain khác dùng cùng theme. |
| `sorts` | Các kiểu sắp xếp hỗ trợ: `latest`, `popular`, `new`, `rating`, `az`, kèm nhãn. |
| `itemLinkSelector` | Selector link tới trang truyện trong danh sách, để đoán thư mục truyện khi thêm site. |
| `siteInfo` | Site của addon, khoá là host không có `www.`. Addon theme chung thì sinh bằng `scripts/gen-catalog.py`; addon một-site thì viết tay với `"builtin": true`. |

## main.ts

Có đúng các hàm của addon gốc (`getURL`, `fetch`, `run`, `get`), thêm `match`, `detect`, `imageHeaders`. Kiểu dữ liệu nằm ở `src/addons/types.ts`.

| Hàm | Việc làm | Trả về |
|---|---|---|
| `getURL({ site, params })` | Dựng URL thật của trang danh sách / tìm kiếm / thể loại theo `params` (`method`, `sort`, `page`, `query`, `genre`). | `string` (hoặc Promise) |
| `fetch({ site, url, method, params })` | Tải trang rồi đọc. `method`: `list`, `detail`, `chapter`. | widget `cataloglist` / `catalogdetail` / `catalogchapter` |
| `run({ site, url, method, html })` | Đọc HTML đã có (trang đang mở trong trình duyệt). Thường chỉ là `runFromHtml({ fetch, match }, input)`. | như `fetch` |
| `get({ site, method, url, html })` | `genre`: danh sách thể loại. `chapter`: toàn bộ chương của trang truyện. `manga`: URL trang truyện của một chương. | widget `genre` / `chapter` / `manga` |
| `match({ site, url, html })` | Trang thuộc loại nào: `list`, `detail`, `chapter` hoặc `null`. | |
| `detect(html)` | Nhận diện theme từ HTML trang chủ khi thêm site. | `boolean` |
| `imageHeaders(site)` | Header khi tải ảnh, thường là `Referer`. | |

Quy tắc, script build sẽ kiểm tra:

- Chỉ import giá trị từ `src/addons/sdk.ts`: `getText`, `getJson`, `request`, `head`, `parseHtml` (cheerio), `imageSrc`, `parseDate`, `resolveUrl`, `withQuery`, `mapLimit`… Kiểu dữ liệu thì dùng `import type`.
- Addon export hàm `fetch` nên **không** được gọi `fetch` toàn cục. Tải bằng hàm của SDK.

## Build, test, phát hành

```sh
npm run addons                  # build mọi addon → src/addons/builtin.generated.ts + dist/addons/
npm run addons -- --uid madara  # chỉ biên dịch thử một addon
npm test                        # kiểm tra bản build khớp mã nguồn, test từng addon và bản build
SITE=gdscans.com ENGINE=madara npx jest -c jest.live.config.js debug   # chạy thử trên site thật
npm run test:live               # chạy mọi site, ghi docs/rn-engine-test.csv
python3 scripts/gen-catalog.py  # cập nhật siteInfo từ kết quả test, rồi npm run addons
```

**Phát hành bản sửa addon:** tăng `version` trong `info.json`, chạy `npm run addons`, rồi đưa nội dung `dist/addons/` (`manifest.json` + `<uid>.json`) lên một chỗ host tĩnh bất kỳ (GitHub Pages, S3…). Trong app, vào **Cài đặt › Quản lý addon** và nhập URL của `manifest.json`. App kiểm tra mỗi ngày, hoặc khi bấm **Kiểm tra cập nhật**. App chỉ cài gói có version mới hơn, đúng sha256 và chạy thử được. Gỡ bản cập nhật thì addon quay về bản có sẵn.
