# Cookie Manga 1.4.4 — Danh sách chức năng

Tài liệu trích xuất từ APK `chat.kijang.manga.cookie.browser` 1.4.4 (versionCode 100040400), dùng làm spec tham khảo khi dựng app tương tự.

**Mức độ tin cậy:** phần đánh ✅ là xác nhận được từ code/asset hoặc log chạy thật. Phần đánh 🟡 là suy luận từ tên biến/chuỗi, vì code Dart đã obfuscate.

---

## 1. Kiến trúc tổng thể

App **không phải** WebView wrapper, cũng không phải app đọc truyện thuần. Nó là **trình duyệt web có hệ thống addon**, giao diện native.

```
┌─ Flutter UI (native) ─────────────────────────────────┐
│  thanh địa chỉ · tab · bookmark · history · reader    │
│                                                        │
│  ┌─ WebView (zikzak_inappwebview) ─────────────────┐  │
│  │  trang web thật của site nguồn                   │  │
│  │   ← inject: jquery + path2regexp + common.js     │  │
│  │              + addons/<tên>/main.js              │  │
│  │   addon đọc HTML → trả JSON                      │  │
│  └──────────────────────────────────────────────────┘  │
│            ↓ JSON { widget, data }                     │
│  Flutter render bằng widget native (reader riêng)      │
└────────────────────────────────────────────────────────┘
```

Luồng người dùng: lướt web bình thường → vào site truyện được hỗ trợ → addon bóc dữ liệu → app hiển thị bằng giao diện đọc truyện native.

---

## 2. Nhóm chức năng

### 2.1 Trình duyệt ✅

| Chức năng | Ghi chú |
|---|---|
| Nhiều tab | `browserTabs`, `browserTabStrip`, `currentTab`, nút đếm tab trên thanh URL |
| Trang chủ tùy biến | "Customize Homepage", `HOME_SETTING`, `HOME_WIDGET`, `HOME_WIDGET_LIMIT` |
| Ô tìm kiếm nhiều engine | Google, Bing, DuckDuckGo, Yahoo, Yandex (có logo riêng trong asset) |
| Gợi ý tìm kiếm | Gọi API suggestion của Bing và Yahoo |
| Quick Access | Shortcut tới Facebook, YouTube, Instagram, Reddit, TikTok, Pinterest, Wikipedia, Netflix, X, Gmail |
| Chế độ ẩn danh | "Incognito mode", "Private" |
| Yêu cầu bản desktop | "Desktop site" |
| Tìm trong trang | "Find in page", `findInteractionController` |
| Chia sẻ | Chia sẻ link, chia sẻ ảnh |
| Mở bằng app khác | "Open in another app" |
| Lưu trang | "Save page as" (route `/saveas`) — lưu offline để đọc lại |
| Quét QR | `QRScannerDialog`, route `/qrcode`, dùng `mobile_scanner` |
| Xem source trang | Addon `viewsource` |
| Quản lý cookie | "Clear cookies and site data", theo từng site |
| Lịch sử duyệt web | "Browsing history", "Clear browsing history" |

### 2.2 Chặn quảng cáo & tracker ✅

| Chức năng | Ghi chú |
|---|---|
| Chặn quảng cáo | `assets/adblock.txt` (36KB), bật/tắt được |
| Chặn tracker | `assets/tracker.txt` (19KB) |
| Cập nhật danh sách từ server | `ADBLOCK_URL`, `ADBLOCK_MD5`, `TRACKER_URL`, `TRACKER_MD5` |
| Thống kê chặn | "Ads & Trackers Blocked On This Page", "Total block in last 30 days", `adblockCounter`, `adblockStats` |
| Nhận diện domain | `assets/psl.dat` (Public Suffix List, 316KB) + `tldts` |

### 2.3 Hệ thống addon ✅

14 addon đóng gói sẵn trong APK tại `assets/flutter_assets/assets/addons/`.

| Addon | Loại | Nội dung | Site khai báo |
|---|---|---|---:|
| madara | catalog | manga | 485 |
| themesia | catalog | manga | 234 |
| madtheme | catalog | manga | 19 |
| mangabox | catalog | manga | 14 |
| html_manga | catalog | manga | 5 |
| fanfox | catalog | manga | 1 |
| mangadex | catalog | manga | 1 |
| mangakatana | catalog | manga | 1 |
| mangareader | catalog | manga | 0 |
| html_novel | catalog | novel | 7 |
| madara_novel | catalog | novel | 4 |
| zorotheme | catalog | anime | 7 |
| videodownloader | pasive | — | mọi site |
| viewsource | code | — | mọi site |

**Cấu trúc 1 addon:**

```
addons/<tên>/
├── info.json       # uid, label, desc, type, content, dependencies, siteInfo
├── main.js         # code chạy thật (TS đã compile)
├── main.ts         # source gốc — dev để sót trong APK
├── settings.html   # trang cài đặt addon (Vue)
└── icon.png
```

**Interface addon** — mọi addon expose 4 hàm qua `window.__addons["<tên>"]`:

| Hàm | Việc làm | Trả `widget` |
|---|---|---|
| `getURL({url, params})` | Dựng URL cho listing/search/genre theo `sort` (latest/popular/newest) + `page` | `url` |
| `fetch({url, method})` | Tải HTML rồi gọi `run()` | — |
| `run({url, method, html})` | Match URL với pattern → chọn parser | tùy loại |
| `get({url, method})` | `method: "genre"` → map thể loại; `method: "chapter"` → danh sách chương | `genre` / `chapter` |

**4 loại widget addon trả về:**

| widget | Dữ liệu | Màn hình tương ứng |
|---|---|---|
| `cataloghome` | `{id, url, tabs[], search, genre[], type}` | Trang chủ catalog của site |
| `cataloglist` | `{list[], page, sort, genre[], search, home}` | Danh sách truyện |
| `catalogdetail` | `{title, altTitle, cover, desc, status, authors, genreMap, rate, views, chapters[], similar[]}` | Chi tiết truyện |
| `catalogchapter` | `{title, detailUrl, pages[]}` | Trang đọc chương |

**Helper phía host** (`assets/js/common.js`) addon phụ thuộc:

`__handle404Get`, `__handle404Post`, `__getText`, `__getJoinText`, `__url`, `__ensureParams`, `__updateProgress`, `__removeUrlSegments`, `__getImageSource`, `__uniqBy`, `__cache`

**Bridge native** — addon gọi ra ngoài qua 4 handler:

| Handler | Dùng cho | Bắt buộc |
|---|---|---|
| `nativeFetch(url, headers, data?)` | Tải HTML/JSON vượt CORS. **Có cả POST** (madara gọi `wp-admin/admin-ajax.php`) | ✅ |
| `flutter_inappwebview_progress(msg)` | Hiện text "đang tải" | không |
| `getByteArray` | zorotheme (anime) | chỉ anime |
| `downloadvideo` | videodownloader | chỉ video |

**Quản lý addon:** `AddOnPage`, `AddOnsMangaPage`, route `/addons`, `/addsites`, `/addcatalogsite`. Người dùng tự thêm domain vào addon (`ADD_SITE_URL`, `ADD_SITE_WITH_ADDONS`) — miễn site dùng đúng theme.

### 2.4 Đọc manga ✅

| Chức năng | Ghi chú |
|---|---|
| Nhiều chế độ xem | Vertical (webtoon), Horizontal, Single, Double page |
| Hướng đọc ngang | "Horizontal viewer direction", "Right to left" (RTL cho manga Nhật) |
| Tự cuộn | "Auto scroll", "Auto Scroll Speed (Only for vertical view mode)" |
| Tap để cuộn | "Enable Tap to Scroll" |
| Cắt ảnh dài | `flutter_image_splitter`, `mangaImageSplitter` — chia ảnh webtoon dài thành nhiều phần để cuộn mượt |
| Preload trang | `mangaPagePreloader`, `READER_CHAPTER_WINDOW_SIZE` |
| Giới hạn texture | `mangaImageMaxTextureSize` — tránh crash ảnh quá lớn |
| Vách ngăn dọc | "Vertical viewer seperator" |
| Chọn chương nhanh | `SelectChapterDialog`, route `/selectchapter` |
| Đánh dấu đã đọc | `MarkChapterDialog`, route `/markchapter` |
| Tóm tắt chương | `MangaChapterSummaryDialog`, route `/summary` |
| Lọc theo nhóm dịch | `viewerScanlator` — "This manga has multiple scanlation groups..." |
| Cài đặt viewer | `ViewerSettingDialog`, route `/viewersetting`, "Apply to all pages" |
| Chờ sang chương | `NEXT_CHAPTER_WAITING_TIME` |

### 2.5 Đọc novel ✅

| Chức năng | Ghi chú |
|---|---|
| Reader riêng cho novel | `NovelPage`, `novelPageList` |
| Đọc thành tiếng (TTS) | `flutter_tts`, `novelTts`, `novelTtsEngineFactory`, `novelTtsEngineHost` |
| Font đọc | 6 Google Font: Bellota, Charm, Lato, Merriweather, PatrickHand, Quicksand |
| Cỡ chữ / theme | "Default font size", "Default font", "Default color theme" |

### 2.6 Thư viện cá nhân ✅

| Chức năng | Ghi chú |
|---|---|
| Bookmark truyện | `BookmarkDialog`, route `/bookmark`, `/promptbookmark`, `/pickbookmark` |
| Bookmark theo nhóm | "Bookmark group", `bookmarkFilter` |
| Bookmark site | "Bookmarked Media Sites", "Bookmark manga/novel site" |
| Bookmark trang web | `AddWebBookmarkDialog`, route `/addwebbookmark` |
| Tách tab theo loại | All / Manga / Novel / Anime Bookmark |
| Tự kiểm tra chương mới | `BG_UPDATE`, "Check for updates", "Notify bookmarked manga or novel updates", `hasUpdatesBookmark` |
| Badge chưa đọc | Asset `cover/unread*.png`, `cover/newch*.png` |
| Tải chương offline | `DownloadChapterDialog`, route `/downloadchapter`, `/donwload` *(typo trong app)* |
| Nhóm download | `DBDownloadGroup`, `downloadGroupList`, `groupDownloadStatus` |
| Tiến trình / pause / resume | `background_downloader`, `downloadProgress`, `chapterDownloader` |
| Lịch sử đọc | `HistoryPage`, route `/history`, `/clearhistory`, nhóm theo ngày (`groupedHistory`) |
| Thống kê đọc | `ReadingStatsPage`, route `/readingstats`, `DBDailyReadingStats` |
| Chuỗi ngày đọc | route `/streak`, "Current Streak", "Best Streak", `StreakMessageWidget` |
| Backup & Restore | `BackupRestoreDialog`, route `/backuprestore`, "Clear existing data before restore" |

### 2.7 Tìm kiếm & khám phá ✅

Route `/search`, `/advancesearch/:id`, `/advancedgenre/:id`, `/genre`, `/genres`, `/genre/:genre`, `/popular`, `/official`, `/recommendations`

| Chức năng | Ghi chú |
|---|---|
| Tìm trong site | Addon dựng URL search riêng cho từng site |
| Autocomplete | `fetchPopularSearch`, MangaMelon có `api/manga/autocomplete` |
| Lịch sử tìm kiếm | "Clear Recent Searches", `filteredSearchHistory` |
| Lọc thể loại nâng cao | `AdvanceSearch`, `AdvancedGenreList`, `fetchGenreList` |
| Lọc theo ngôn ngữ site | `supportedSiteLanguages`, `siteFilter` — 15 ngôn ngữ |
| Đổi grid/list | `mangaListViewMode`, "Tap here to toggle between grid or list view" |

### 2.8 Nội dung người lớn ✅

| Chức năng | Ghi chú |
|---|---|
| Xác nhận tuổi | `AdultContentDialog`, route `/adultcontent`, `CONFIRM_AGE18`, `confirmAge` |
| Lọc nội dung | `CONTENT_FILTER`, `contentFilter`, `contentRating`, "Content Rating" |
| Cờ nsfw theo site | Trong `siteInfo` của addon: 166 site được đánh `nsfw` |

### 2.9 MangaMelon — nguồn nội dung riêng + tính năng xã hội ✅

Site nhà của dev, **không qua addon**, gọi API riêng.

- Trang chủ mặc định: `https://mangamelon.com/`
- API: `https://api.mangamelon.com/` (POST, body `data=<JSON>&sessionid=<...>`, form-urlencoded) + Socket.IO realtime
- CDN ảnh: `fs.mangamelon.com`
- Đăng nhập: `mangamelon.com/auth/login`, JWT + refresh

| Nhóm | Endpoint |
|---|---|
| Tài khoản | `auth/jwt/refresh`, `auth/change_name`, `profile/upload` |
| Truyện | `homepage`, `manga/list`, `manga/get`, `manga/autocomplete`, `manga/popular/search` |
| Chương | `chapter/list`, `chapter/get` |
| Đánh giá | `manga/rate`, `rate/get`, `rate/list`, `rate/like`, `rate/report` |
| Bình luận | `comment/list`, `comment/post`, `comment/like`, `comment/delete`, `comment/report` |
| Báo lỗi | `report`, `report/list`, `report/reply` |

Chức năng kèm theo: Comments (tab riêng, like, xoá, báo cáo, reply), Reviews ("Add Review", "Do you find this review helpful?"), Reports ("My Reports", `reportBadge`, `ReportListDialog`), Profile, `member/tier` 🟡 (có thể là gói VIP — có `vIP`, `maintenanceMode`, `remoteHomeSetting`).

> ⚠️ MangaMelon **không có giấy phép nội dung**. App iOS cùng tên ghi rõ *"does not own or host any content"*, và API admin của web lộ ra `crawler/crawl`, `chapter/download`, `mdex/add` — tức server tự scrape site khác rồi phát lại.

### 2.10 Quảng cáo & doanh thu ✅

**Mediation:** AppLovin MAX 13.6.3, đấu giá giữa AppLovin + Meta Audience Network + Mintegral + Unity Ads. Không dùng AdMob.

| Định dạng | Vị trí | Xác nhận |
|---|---|---|
| Interstitial | Khi mở/chuyển chương | ✅ log: unit `1e359c04d0342a2c`, Unity thắng |
| Native | Chèn giữa trang truyện trong reader | ✅ log: unit `d53e27ef6fe544cf`, Meta thắng |
| MREC | 🟡 "Toggle Mrec Ads", `mrec_adx_failed` | 🟡 |
| Banner | 🟡 `is_adaptive_banner_enabled` | 🟡 |

**Cấu hình tần suất** (Remote Config, chỉnh từ xa — giá trị không nằm trong APK):

`INTERSTITIAL_FIRST_DELAY_SECONDS`, `INTERSTITIAL_CHAPTER_COUNT`, `INTERSTITIAL_COOLDOWN_FIRST/SECOND/THIRD/FOURTH_PLUS_MINUTES` (cooldown tăng dần), `INTERSTITIAL_COUNTDOWN`, `INTERSTITIAL_COUNTDOWN_META`, `SKIP_ON_FIRST_ENTER`, `ADS_LAST_SHOWN`, `ADS_LAST_HANDLED`

**Minh bạch với user:** dialog "About Ads in This App" (`AdsInfoDialog`, route `/adsinfo`) — giải thích khi nào hiện ads, hướng dẫn cách đóng ads khi nút X không hiện, kèm cam kết *"We will never ask you to click on any ad"*. Hỏi consent cá nhân hoá: "Can we use your data to tailor ads for you?" (`gDPRConsent`). Có `in_app_purchase` + Play Billing 🟡 (nhiều khả năng gói gỡ quảng cáo).

### 2.11 Hạ tầng ✅

| Chức năng | Thư viện |
|---|---|
| Thông báo đẩy | Firebase Messaging + `flutter_local_notifications` |
| Nền / foreground service | `flutter_foreground_task`, `workmanager` (kiểm tra chương mới) |
| Crash & analytics | Firebase Crashlytics, Analytics, Performance |
| Cấu hình từ xa | Firebase Remote Config |
| Hướng dẫn lần đầu | `features_tour` — tooltip "Tap here to run the supported addons..." |
| Rate us | `RATE_US_INTERVAL_OK/CANCEL/STORE`, `RATE_NEXT_DATE`, `RATE_SHOWN_COUNT` |
| Chống chụp màn hình | `screen_protector` → `FLAG_SECURE` |
| Phát video | `chewie` + `m3u8Provider` (cho addon anime) |

---

## 3. Data model (ObjectBox) ✅

| Entity | Nội dung |
|---|---|
| `DBBookmark` | Truyện/site đã bookmark |
| `DBBookmarkChapters` | Trạng thái đọc từng chương của bookmark |
| `DBHistory` | Lịch sử đọc & duyệt web |
| `DBDownload` | Chương đã tải |
| `DBDownloadGroup` | Nhóm download |
| `DBDownloadJSON` | Metadata chương tải |
| `DBAddOn` | Addon + site người dùng tự thêm |
| `DBADBlock` | Rule chặn quảng cáo |
| `DBReadingStats` | Thống kê đọc |
| `DBDailyReadingStats` | Thống kê theo ngày (cho streak) |
| `DBKeyValue` | Key-value settings |

---

## 4. Routes ✅

~32 route trong app (ngoài ra còn hàng trăm URL pattern của site nguồn, không phải route app):

```
/settings  /viewersetting  /adblock  /cleardata  /backuprestore
/bookmark  /pickbookmark  /promptbookmark  /addwebbookmark
/history  /clearhistory  /readingstats  /streak
/donwload  /downloadchapter  /chapters  /selectchapter  /markchapter  /summary
/addons  /addsites  /addcatalogsite
/search  /advancesearch/:id  /advancedgenre/:id  /genre  /genres  /genre/:genre  /popular  /official
/adultcontent  /adsinfo  /qrcode  /saveas  /reportlist  /review/:mangaID  /video/:file
```

---

## 5. Nếu dựng lại bằng React Native

### 5.1 Map thư viện

| Vai trò | Cookie Manga (Flutter) | Tương đương RN |
|---|---|---|
| WebView | `zikzak_inappwebview` | `react-native-webview` |
| State | `flutter_riverpod` | Zustand / Jotai / TanStack Query |
| DB | `objectbox` | WatermelonDB / `op-sqlite` / Realm |
| HTTP | `dio` + Cronet | `fetch` / `axios` |
| Ảnh + cache | `extended_image`, `cached_network_image` | `expo-image` / `react-native-fast-image` |
| Reader cuộn dài | `super_sliver_list`, `scrollview_observer` | `FlashList` |
| Tải nền | `background_downloader` | `react-native-background-downloader` |
| Task nền | `workmanager`, `flutter_foreground_task` | `expo-task-manager` / `react-native-background-fetch` |
| TTS | `flutter_tts` | `expo-speech` / `react-native-tts` |
| QR | `mobile_scanner` | `expo-camera` / `react-native-vision-camera` |
| Notification | `flutter_local_notifications` | `notifee` / `expo-notifications` |
| Video | `chewie` | `react-native-video` / `expo-video` |
| Ads | AppLovin MAX Flutter | `react-native-applovin-max` |
| Zoom ảnh | — | `react-native-gesture-handler` + `reanimated` |

### 5.2 Addon chạy ở đâu

Hai hướng, chọn 1:

| | Trong WebView | Trong JS của RN (Hermes) |
|---|---|---|
| Cách làm | Inject jQuery + addon vào `react-native-webview` | Viết lại parser bằng `cheerio` |
| Ưu | Chạy được JS của trang; vượt Cloudflare nhờ cookie thật; tái dùng được logic addon sẵn có | Nhanh, không cần WebView ẩn, dễ chạy song song nhiều request |
| Nhược | Nặng, phải quản lý WebView ẩn, giao tiếp async qua postMessage | Không chạy JS của trang → site render bằng JS sẽ fail; dễ bị Cloudflare chặn |

**Đã kiểm chứng:** mình chạy thử addon gốc (không sửa dòng nào) trong môi trường mô phỏng WebView → **102/137 site đọc trọn luồng** (listing → detail → chapters → ảnh). Chi tiết ở `cookie-manga-addon-test.csv`.

### 5.3 Bridge WebView ↔ RN

Addon chỉ phụ thuộc `window.flutter_inappwebview.callHandler`. Tạo object cùng tên để chuyển tiếp sang RN:

```js
// injectedJavaScriptBeforeContentLoaded
window.__addons = {}; window.__debugMode = false;
const pending = {}; let seq = 0;
window.flutter_inappwebview = {
  callHandler: (name, ...args) => new Promise((resolve, reject) => {
    const id = ++seq; pending[id] = { resolve, reject };
    window.ReactNativeWebView.postMessage(JSON.stringify({ kind: 'call', id, name, args }));
  }),
};
window.__rnReply = (id, ok, v) => { const p = pending[id]; delete pending[id]; ok ? p.resolve(v) : p.reject(v); };
true;
```

Phía RN: `onMessage` nhận `nativeFetch` → `fetch()` (native không bị CORS) → trả về bằng `injectJavaScript(\`window.__rnReply(${id}, true, ${JSON.stringify(html)})\`)`.

### 5.4 Những chỗ dễ sai

- **Gọi addon phải truyền `method` rõ ràng** (`list` / `detail` / `chapter`). Để addon tự đoán theo URL thì theme themesia sai, vì URL chương và URL truyện giống nhau. Test của mình lúc để auto-detect ra 75/137, truyền đúng method ra 102/137.
- **`nativeFetch` phải hỗ trợ POST** — madara lấy danh sách chương qua `admin-ajax.php` với `action=manga_get_chapters`.
- **Cloudflare:** site có challenge cần user mở trong WebView trước để lấy cookie `cf_clearance`. `fetch` từ RN không có cookie sẽ bị chặn.
- **Dọn timer:** `common.js` đặt `setTimeout` 500s cho cache. Tạo/đóng WebView liên tục sẽ rò rỉ.
- **Ảnh cần header:** nhiều site chặn hotlink → phải gửi `Referer`. App có `getImageHeaders`, `refererHost` cho việc này.
- **Chỉ cần 2 theme là đủ:** trong 102 site chạy được, madara 66 + themesia 31 = 95%. Làm tốt 2 parser này là xong gần hết.

---

## 6. Dữ liệu thật về nguồn truyện (03/10/2026)

```
778 site khai báo trong addon
 ├─ 219 dev đã tự tắt (site down / blocked / đổi layout)
 └─ 559 app đang bật
     ├─ 137 còn sống & đúng theme  → test addon thật: 102 chạy trọn luồng
     ├─ 139 chưa xác định (84 Cloudflare, 55 bị nhà mạng VN chặn)
     ├─  32 đổi sang Next.js/theme khác → addon không đọc được
     └─ 251 đã chết (domain bỏ/DNS/5xx/bị chiếm làm web khác)
```

Danh sách chi tiết: `cookie-manga-sites-check.csv` (trạng thái site), `cookie-manga-addon-test.csv` (kết quả chạy addon thật).

**Bài học cho app mới:** danh sách site thêm ngày 06/04/2025, sau ~18 tháng chết gần một nửa. Đừng hard-code danh sách site trong app — nên để server trả về, hoặc để user tự thêm domain.

---

## 7. Lưu ý

**Về bản quyền:** danh sách chức năng ở trên là mô tả tính năng — tính năng không được bảo hộ bản quyền, dựng app có tính năng tương tự là bình thường. Nhưng `main.js`/`main.ts` của addon, asset, icon và code của Kijang thì có bản quyền. Nếu phát hành, hãy tự viết parser dựa trên hiểu biết về cấu trúc theme, đừng copy file vào project.

**Về Google Play:** Cookie Manga sống được trên Play nhờ định vị là *trình duyệt* (có search engine, quick access, adblock, tab) chứ không phải app đọc truyện lậu, và addon chỉ "interpret & optimise viewing experience". Rủi ro lớn nhất vẫn là khiếu nại bản quyền từ nhà xuất bản — có thể bị gỡ bất cứ lúc nào. Mạng quảng cáo (AppLovin/AdMob) cũng cấm hiện ads cạnh nội dung vi phạm bản quyền hoặc 18+, nên có thể bị khoá tài khoản ads dù app chưa bị gỡ.
