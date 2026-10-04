# Manga Reader

Trình duyệt Android có hệ thống nguồn truyện và trình đọc native, dựng lại các tính năng của Cookie Manga 1.4.4 bằng React Native. Spec gốc nằm ở [docs/cookie-manga-features.md](docs/cookie-manga-features.md).

App không phải WebView bọc site, cũng không phải app đọc truyện thuần. Màn gốc là trình duyệt. Khi người dùng vào một site truyện được hỗ trợ, nút **Chạy addon** đọc HTML của trang và mở dữ liệu bằng giao diện native (catalog, chi tiết, reader).

## Chạy app

Cần Node ≥ 22.11, JDK 17 và Android SDK.

```sh
npm install
npm start          # Metro
npm run android    # build và cài lên máy/emulator
```

Kiểm tra mã nguồn:

```sh
npx tsc --noEmit
npm run lint
npm test
```

## Cấu trúc

```
src/
├── app/          # AppRoot (khởi động), navigation, routes
├── components/   # UI dùng chung: ui.tsx (Material 3), AddressBarParts (thanh địa chỉ),
│                 # Dropdown, Sheet, MangaCard, ErrorView, Favicon, WebView, icons
├── features/     # mỗi thư mục là một nhóm màn
│   ├── browser/    # trình duyệt: tab, thanh địa chỉ, adblock, chạy addon, trang chủ, QR
│   ├── addons/     # quản lý nguồn, thêm site, cài đặt nguồn
│   ├── catalog/    # danh sách truyện của một nguồn, tìm trên mọi nguồn
│   ├── detail/     # chi tiết truyện, chương, bookmark, tải chương
│   ├── reader/     # reader manga (4 chế độ) + ghi nhận phiên đọc
│   ├── novel/      # reader novel + đọc to (TTS)
│   ├── library/    # bookmark, kiểm tra chương mới
│   ├── history/ downloads/ stats/ settings/ verify/
├── lib/          # http, url, storage (MMKV), adblock, thời gian, định dạng
├── sources/      # engine Madara, MangaThemesia, MangaDex + cache chi tiết
├── store/        # Zustand store, lưu bền bằng MMKV
└── theme/        # bảng màu sáng/tối, khoảng cách, cỡ chữ
```

## Giao diện

Bám theo ảnh chụp của app gốc trên Google Play: Material 3 tông hổ phách (app bar vàng ở theme sáng, gần đen ở theme tối), một thanh địa chỉ duy nhất `[mảnh ghép addon] [URL … QR] [số tab] [⋮]`, và các màn addon (catalog, chi tiết, reader) hiển thị ngay dưới thanh địa chỉ như nội dung của tab.

Icon dùng font Material Icons, cùng bộ với app Flutter gốc. `src/components/icons.tsx` được sinh bởi `scripts/gen-icons.py`; thêm icon thì sửa bảng `MAP` trong script rồi chạy lại.

## Nguồn truyện

Addon của app gốc là file JS chạy trong WebView. Ở đây mỗi theme là một **engine** viết lại bằng TypeScript, chạy thẳng trong Hermes với `cheerio/slim`:

| Engine | Ghi chú |
|---|---|
| Madara | WordPress + WP-Manga, cả manga lẫn novel. Lấy chương qua `ajax/chapters/` hoặc `admin-ajax.php`. |
| MangaThemesia | Ảnh chương lấy từ `ts_reader.run(...)`, kể cả script base64. |
| MangaDex | API chính thức `api.mangadex.org`. |

App không đóng gói sẵn danh sách site, vì site chết nhanh (docs mục 6). Người dùng tự thêm domain ở **Addon → Thêm site**: app tự nhận diện theme, tên, thư mục và ngôn ngữ của site.

Trên Android, `fetch` dùng chung cookie với WebView. Khi site chặn bằng Cloudflare, màn **Verify** mở trang trong WebView để người dùng vượt kiểm tra, lưu UA thật rồi quay lại thử tiếp.

## Khác biệt có chủ đích so với app gốc

- Không có MangaMelon (API riêng của nhà phát triển gốc), quảng cáo AppLovin hay Firebase.
- Adblock chặn điều hướng, popup và phần tử quảng cáo trong trang. `react-native-webview` không cho chặn mọi request con ở tầng native.
- Tab ẩn danh không ghi lịch sử và không dùng cache, nhưng vẫn dùng chung cookie: prop `incognito` của WebView trên Android sẽ xoá cookie của cả app.
- Kiểm tra chương mới chạy khi mở app và khi kéo làm mới, chưa có tác vụ nền và thông báo đẩy.
- Sao lưu dùng một file JSON thay cho ZIP.
- Chống chụp màn hình mới chỉ lưu cài đặt, cần thêm mã native (`FLAG_SECURE`).

Font đọc novel (Bellota, Charm, Lato, Merriweather, Patrick Hand, Quicksand) dùng giấy phép SIL OFL, font Material Icons dùng Apache 2.0. Xem `android/app/src/main/assets/fonts/FONT-LICENSES.txt`.
