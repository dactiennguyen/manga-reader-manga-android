# Manga Reader

Trình duyệt Android có hệ thống nguồn truyện và trình đọc native, dựng lại các tính năng của Cookie Manga 1.4.4 bằng React Native. Spec gốc nằm ở [docs/cookie-manga-features.md](docs/cookie-manga-features.md).

App không phải WebView bọc site, cũng không phải app đọc truyện thuần. Màn gốc là trình duyệt. Khi người dùng vào một site truyện được hỗ trợ, nút **Chạy addon** đọc HTML của trang và mở dữ liệu bằng giao diện native (catalog, chi tiết, reader).

## Chạy app

Cần Node 22 ≥ 22.13, JDK 17 và Android SDK.

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

Test chạy thật trên site nguồn (cần mạng, vài phút):

```sh
npm run test:live                  # mọi site trong docs/cookie-manga-*.csv
ONLY=madara npm run test:live      # lọc theo addon hoặc host
FAILED=1 npm run test:live         # chỉ chạy lại site lỗi lần trước
python3 scripts/gen-catalog.py     # sinh lại danh mục site từ kết quả
```

Mỗi site đi trọn luồng như người dùng: thêm site (dò theme, thư mục) → danh sách → chi tiết → chương → tải một ảnh trang. Kèm theo là tìm kiếm, thể loại, trang 2 và nhận diện URL. Kết quả ghi vào [docs/rn-engine-test.csv](docs/rn-engine-test.csv).

## Build APK hoặc AAB thủ công trên GitHub Actions

Workflow [Build Android (manual)](.github/workflows/build-android.yml) chỉ chạy khi bấm **Run workflow**. Workflow cài dependency bằng `npm ci`, kiểm tra TypeScript, ESLint, addon và Jest, rồi build release bằng Gradle wrapper của project. Test gọi website thật không chạy trong CI.

1. Push code lên GitHub; file workflow cần có trên nhánh mặc định để hiện nút chạy thủ công.
2. Mở **Actions → Build Android (manual) → Run workflow**, chọn nhánh cần build.
3. Chọn định dạng `apk` để cài trực tiếp lên thiết bị, hoặc `aab` để tạo Android App Bundle. AAB không cài trực tiếp như APK.
4. Chọn `arm64` cho điện thoại Android 64-bit hoặc `universal` để gộp `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`. Lựa chọn này áp dụng cho cả APK và AAB; bản universal lớn hơn và build lâu hơn.
5. Khi job hoàn tất, tải `manga-reader-<format>-<architecture>-<run_number>` trong **Artifacts** và giải nén để lấy file `.apk` hoặc `.aab`. Artifact được giữ 14 ngày.

APK release có sẵn JavaScript bundle nên chạy độc lập, không cần Metro. Workflow dùng Node 22, JDK 17, SDK Platform 37.0, Build Tools 37.0.0, NDK 27.1.12297006 và CMake 3.22.1.

Hiện `android/app/build.gradle` ký cả APK và AAB release bằng `android/app/debug.keystore` có sẵn trong repo, phù hợp thử nghiệm và không cần thêm GitHub Secrets. AAB này chưa dùng để phát hành Google Play; cần cấu hình khóa ký riêng trước khi build bản phát hành.

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
│   ├── library/    # bookmark, kiểm tra chương mới (cả ở nền + thông báo)
│   ├── history/ downloads/ stats/ settings/ verify/
├── lib/          # http, url, storage (MMKV), adblock, screen (khoá xoay), thời gian
specs/            # TurboModule của app: NativeScreen, NativeLibraryTasks (Android/Kotlin)
├── addons/       # hệ thống addon: SDK, registry (nạp addon), cập nhật từ kho addon
├── sources/      # Engine (giao diện màn hình dùng), danh mục site (catalog.ts), cache chi tiết
├── store/        # Zustand store, lưu bền bằng MMKV
└── theme/        # bảng màu sáng/tối, khoảng cách, cỡ chữ
```

## Giao diện

Bám theo ảnh chụp của app gốc trên Google Play: Material 3 tông hổ phách (app bar vàng ở theme sáng, gần đen ở theme tối), một thanh địa chỉ duy nhất `[mảnh ghép addon] [URL … QR] [số tab] [⋮]`, và các màn addon (catalog, chi tiết, reader) hiển thị ngay dưới thanh địa chỉ như nội dung của tab. Trên màn rộng (tablet, ≥ 600dp) thanh địa chỉ có thêm ← → ⟳ và nút bookmark, bên dưới là dải tab ngang.

Icon dùng font Material Icons, cùng bộ với app Flutter gốc. `src/components/icons.tsx` được sinh bởi `scripts/gen-icons.py`; thêm icon thì sửa bảng `MAP` trong script rồi chạy lại.

## Nguồn truyện

Nguồn truyện là **addon**, cùng kiến trúc với app gốc. Mỗi addon là một thư mục [addons/](addons/) gồm `info.json` (mô tả + danh sách site) và `main.ts`, export đúng các hàm của addon gốc: `getURL`, `fetch`, `run`, `get` (thêm `match`, `detect`, `imageHeaders`). Addon chỉ dùng hàm của SDK (`src/addons/sdk.ts`), tương tự `common.js` và bridge `nativeFetch` của app gốc. Khác app gốc ở chỗ addon chạy thẳng trong Hermes (parse bằng `cheerio/slim`) thay vì trong WebView ẩn.

`npm run addons` biên dịch mỗi addon thành một đoạn JS độc lập. App nạp đoạn JS đó lúc chạy: bản có sẵn trong app, hoặc bản mới hơn tải từ **kho addon** (Cài đặt › Quản lý addon). Nhờ vậy sửa parser không cần phát hành lại app. Cách viết và phát hành addon xem [addons/README.md](addons/README.md).

| Addon | Addon gốc | Ghi chú |
|---|---|---|
| Madara | madara, madara_novel | WordPress + WP-Manga, cả manga lẫn novel. Chương qua `ajax/chapters/` hoặc `admin-ajax.php`; sai thư mục thì dùng trang tìm kiếm. |
| MangaThemesia | themesia | Ảnh chương lấy từ `ts_reader.run(...)`, kể cả script base64. |
| MadTheme | madtheme | Họ MangaBuddy/KaliScan. Chưa kiểm được trên site thật (mọi site bị Cloudflare chặn hoặc đã chết), mới kiểm bằng trang lưu trên Wayback Machine. |
| MangaBox | mangabox | Họ Mangakakalot/Manganelo, hai kiểu markup. |
| NovelFull | html_novel | NovelFull/NovelBin/NovelLive, trả về chữ. |
| MangaDex, Manga Fox, MangaTown, Weeb Central, MangaKatana | mangadex, fanfox, html_manga, mangakatana | Mỗi addon dành cho một site, là nguồn có sẵn. |

**Site được hỗ trợ** có sẵn danh mục khoảng 200 site, nằm trong `siteInfo` của từng addon và sinh từ kết quả test thật (`scripts/gen-catalog.py`). Danh mục gồm site đã chạy trọn luồng, cộng site còn sống nhưng không kiểm được từ máy test vì Cloudflare hay nhà mạng chặn; loại này có ghi chú. Site đã chết, đã đổi theme hoặc bị domain lạ chiếm thì bị loại. Ô chọn dùng để ghim site vào trang chủ và Bookmark › Site truyện; site không ghim vẫn chạy addon bình thường. Site ngoài danh mục thì thêm ở **Thêm site**: app tự nhận diện theme, tên, thư mục và ngôn ngữ.

Kết quả test (10/2026, chạy qua bản build của addon) trên đúng 137 site mà addon gốc từng được test: **116/137 chạy trọn luồng**, addon gốc được 102/137. Hai site addon gốc đọc được mà ở đây không đọc được: manhwa68.com (Cloudflare chặn request ngoài WebView) và kuroimanga.com (chương phải đăng nhập, addon gốc chỉ lấy được ảnh nhắc đăng nhập). Vài site rất chậm (doujindistrict.com, niji-translations.com mất 40–60 giây mỗi trang) nên lúc đạt lúc quá thời gian chờ.

Trên Android, `fetch` dùng chung cookie với WebView. Khi site chặn bằng Cloudflare, màn **Verify** mở trang trong WebView để người dùng vượt kiểm tra, lưu UA thật rồi quay lại thử tiếp.

## Khác biệt có chủ đích so với app gốc

- Không có MangaMelon (API riêng của nhà phát triển gốc), quảng cáo AppLovin hay Firebase.
- Adblock chặn điều hướng, popup và phần tử quảng cáo trong trang. `react-native-webview` không cho chặn mọi request con ở tầng native.
- Tab ẩn danh không ghi lịch sử và không dùng cache, nhưng vẫn dùng chung cookie: prop `incognito` của WebView trên Android sẽ xoá cookie của cả app.
- Kiểm tra chương mới ở nền dùng WorkManager + Headless JS (khoảng 6 giờ/lần, bật trong Cài đặt), không dùng Firebase.
- Sao lưu dùng một file JSON thay cho ZIP.
- Không có addon anime (zorotheme): mọi site của addon này đã chết hoặc bị chặn, và app chưa có trình phát video. Video trên trang vẫn tải được bằng **Tải video trên trang** (thay cho addon videodownloader), file vào Tải xuống › Tệp & media.

Font đọc novel (Bellota, Charm, Lato, Merriweather, Patrick Hand, Quicksand) dùng giấy phép SIL OFL, font Material Icons dùng Apache 2.0. Xem `android/app/src/main/assets/fonts/FONT-LICENSES.txt`.
