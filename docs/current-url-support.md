# Báo cáo URL đã hiệu chỉnh — 17/10/2026

**Danh mục vẫn gồm 221 site trong 10 addon. Lượt engine ban đầu có 115 site qua mẫu kiểm tra; kiểm tra lại 3 site xác nhận thêm dojing.net và manhuahot.com, nâng số site từng qua mẫu kiểm tra lên 117. Đây là kết quả gộp hai lượt, không phải chạy lại toàn bộ 221 site cùng thời điểm.**

## Những kết luận được sửa

- **MangaDex:** không có bằng chứng addon hỏng hay khai báo sai chỉ vì lần đầu không kết nối được. Lần mới trang chủ HTTP 200, còn `api.mangadex.org` bị reset trước khi hoàn tất TLS. Lượt kiểm tra qua điện thoại có WARP đọc được MangaDex, nên xác nhận nguyên nhân là đường mạng hiện tại chặn, không phải addon.
- **15 URL không còn phục vụ site tại địa chỉ hiện tại:** 10 URL parking/hết hạn/quảng cáo (gồm ruahapchanhday.com), cộng 4 tên miền NXDOMAIN và 1 trỏ về 127.0.0.1. Báo cáo cũ chỉ đếm 9 URL parking nên thiếu 6 URL. Nhóm DNS được tách riêng; không tuyên bố cả 15 đã đóng cửa vĩnh viễn.
- **MadTheme 0/5 ở lượt đầu:** 4 tên miền NXDOMAIN; `manhuanow.com` có máy chủ lỗi TLS (cả khi đi qua WARP). Kết quả đó không chứng minh engine MadTheme hỏng.
- **Lỗi tạm thời:** dojing.net qua engine với 12 truyện trong danh sách, lấy được chương và ảnh mẫu; manhuahot.com cũng qua luồng đọc nhưng tìm kiếm còn lỗi. hentaicb.fit có lúc truy cập được, có lúc bị reset kết nối giống chặn nhà mạng; xếp vào nhóm chặn mạng.
- **Chặn bot:** webtoon.xyz trả 403 kèm `cf-mitigated: challenge`, được chuyển sang Cloudflare. manhuaus.com có lúc trả 403, có lúc bị reset kết nối; qua WARP gặp xác minh Cloudflare. Xếp vào nhóm chặn mạng.
- **Các lỗi khác:** culturedworks.com vẫn 526; reader.decadencescans.com vẫn timeout; walpurgiscan.it lần kiểm tra lại trước đó là 503, lượt mới là 522; ch1.isekaikomik.site lỗi ảnh 523 ở lượt engine đầu và được kiểm tra lại xác nhận.
- **Tách nhóm chặn mạng (kiểm tra lại 17/10, 22:40):** chỉ những site bị *reset kết nối* lúc bắt tay TLS mới được tính là có dấu hiệu chặn mạng. `ayatoon.com`, `pirulitorosa.site`, `manhuanow.com` nhận *cảnh báo TLS từ chính máy chủ* (đi qua WARP cũng lỗi) nên chuyển sang nhóm máy chủ lỗi TLS. `ruahapchanhday.com` trỏ tới IP của Trellian (dịch vụ đỗ tên miền) nên chuyển sang nhóm hết hạn/parking. `hentaicb.fit` và `manhuaus.com` bị reset kết nối nên chuyển vào nhóm chặn mạng. Nhóm chặn mạng còn 11 site.
- **Thời gian:** lượt engine đầy đủ là 117 giây; lượt engine bổ sung 3 site là khoảng 5 giây. Kiểm tra trang chủ/DNS là các lượt riêng. Không dùng con số “khoảng 6 phút” làm thời lượng đo mạng hoặc cộng các lượt chạy chồng nhau.
- Nếu nguyên nhân là chặn ở đường mạng/nhà mạng, điện thoại dùng cùng Wi-Fi cũng có thể gặp lỗi tương tự; chuyển từ máy tính sang Android tự nó không khắc phục. Cookie WebView chỉ có thể giúp một số challenge, không giải quyết reset TLS của đường mạng.

## Số liệu sau hiệu chỉnh

| Trạng thái | Số site |
|---|---:|
| Đã lấy được chương và tải ảnh mẫu / nội dung chữ | 117 |
| Cloudflare được nhận diện | 66 |
| Dấu hiệu chặn mạng ở TLS; chưa kết luận lỗi addon | 11 |
| Máy chủ lỗi TLS (cả qua WARP) | 3 |
| Tên miền hết hạn / parking / quảng cáo | 10 |
| DNS công cộng trả NXDOMAIN | 4 |
| DNS công cộng trỏ về loopback 127.0.0.1 | 1 |
| Redirect tới hostname không phân giải được | 1 |
| Lỗi máy chủ quan sát được | 2 |
| Timeout quan sát được | 1 |
| Không lấy được danh sách / truyện / chương / ảnh | 5 |

**Tổng: 221.** Nhóm 15 URL không phục vụ site ở địa chỉ hiện tại = 10 parking + 4 NXDOMAIN + 1 loopback. Nhóm 117 đã qua mẫu = 115 lượt đầu + 2 lượt bổ sung. Có 6 site từng qua mẫu nhưng ghi nhận lỗi chức năng phụ ở lượt engine tương ứng.

## Tổng số site có thể hỗ trợ

| Nhóm | Số site | Điều kiện để đọc |
|---|---:|---|
| Đã lấy được chương và tải ảnh mẫu / nội dung chữ | 117 | Đọc được ngay |
| Cloudflare được nhận diện | 66 | Cần xác minh Cloudflare trong app (WebView); chưa kiểm chứng đọc được |
| Dấu hiệu chặn mạng | 11 | Cần VPN/đổi mạng; qua WARP mới xác nhận đọc được 2 site (mangadex.org, manhuaplus.com) |
| **Tổng có thể hỗ trợ** | **194 / 221** | |

27 site còn lại chưa thể hỗ trợ: 15 tên miền không còn phục vụ site (10 parking, 4 NXDOMAIN, 1 loopback), 1 redirect tới hostname chết, 3 máy chủ lỗi TLS, 2 lỗi máy chủ, 1 timeout và 5 site addon không lấy được danh sách/truyện/chương/ảnh.

## Giữ nguyên lịch sử kiểm tra

- Kết quả ban đầu **115 / 65 / 9 / 32** vẫn đúng với lần chạy đầu: 32 gồm 24 lỗi kết nối, 1 timeout, 2 lỗi máy chủ và 5 lỗi nội dung. Không sửa ngược kết quả đo cũ.
- Danh mục: **119 không ghi chú, 72 Cloudflare, 30 bị chặn**. Đây là metadata tĩnh. Lỗi mạng tạm thời không đủ để kết luận danh mục khai báo sai.
- 6 site không ghi chú thất bại ở lượt đầu được giữ trong bảng dưới để đối chiếu, không gọi là “6 site hỗ trợ sai”.

| Site | Quan sát lượt đầu | Hiệu chỉnh / kiểm tra lại |
|---|---|---|
| mangadex.org | Không kết nối được. Kiểm tra mạng rồi thử lại. | https://api.mangadex.org/manga?limit=1: DNS A có đáp án; curl exit 35, chưa hoàn tất TLS, tổng 0.056s. Dấu hiệu phù hợp chặn mạng; API addon sử dụng bị reset. Qua WARP đọc được chương và ảnh mẫu. |
| dojing.net | Không kết nối được. Kiểm tra mạng rồi thử lại. | Engine đúng cấu hình: list=12, chapters=1, pages=54, ảnh mẫu=ok. Lỗi kết nối ban đầu là tạm thời. |
| culturedworks.com | Máy chủ trả lỗi 526. | curl exit=0; HTTP=526; tổng 0.490s. |
| reader.decadencescans.com | Hết thời gian chờ máy chủ phản hồi. | curl exit=28; HTTP=0; tổng 20.005s. |
| ch1.isekaikomik.site | ảnh: http 523 | Kiểm tra lại trước đó: trang chủ trả HTTP 200 nhưng máy chủ ảnh trả HTTP 523. |
| 3asq.online | không có chương | Chưa kiểm tra lại; giữ kết quả mẫu ban đầu, chưa khẳng định lỗi kéo dài. |

## Lỗi chức năng phụ trong các lượt engine

| Site | Lỗi quan sát |
|---|---|
| hentai20.io | page2: err Không kết nối được. Kiểm tra mạng rồi thử lại.; search: err Không kết nối được. Kiểm tra mạng rồi thử lại.; resolve: err Không kết nối được. Kiểm tra mạng rồi thử lại. |
| infrafandub.com | page2: err Không tìm thấy trang (404).; search: err Không tìm thấy trang (404).; genres: err Không tìm thấy trang (404). |
| klikmanga.org | search: err Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục.; genres: err Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| ragnarokscanlation.opchapters.com | page2: err Không tìm thấy trang (404). |
| mangakatana.com | genres: err Hết thời gian chờ máy chủ phản hồi. |
| manhuahot.com | search: err Không kết nối được. Kiểm tra mạng rồi thử lại. |

## Phương pháp, phạm vi và bằng chứng

- Lượt đầu dùng `catalogSources()` và engine addon đóng gói, đúng baseUrl/mangaDir/chapterLang/content; danh sách → tối đa 3 truyện → thử chương đầu/cuối/giữa → tải một ảnh mẫu giữa chương (HTTP/MIME/size >512 byte) hoặc kiểm tra có đoạn văn. Không kiểm tra mọi truyện/chương/ảnh.
- 115 site qua lượt đầu không được chạy lại trong đợt hiệu chỉnh. Chỉ chạy lại engine cho dojing.net, hentaicb.fit, manhuahot.com. Test PASS xác nhận chạy đủ trường hợp, không đồng nghĩa mọi site đều qua.
- Thử mạng bổ sung cho 27 URL thuộc nhóm kết nối/timeout/máy chủ ban đầu và endpoint API MangaDex. Mỗi hostname hỏi DNS hệ thống và 1.1.1.1 (A/AAAA), GET HTTPS theo tối đa 5 redirect, connect timeout 8 giây, tổng timeout 20 giây, tối đa 1 MiB. Giữ xác thực TLS. Kết quả dùng curl có thể khác engine theo endpoint, header và thời điểm.
- Lượt mạng bổ sung bắt đầu từng URL (UTC): 2026-10-17T14:59:24.880566+00:00 → 2026-10-17T14:59:26.162610+00:00.
- Bằng chứng DNS/TLS hỗ trợ chẩn đoán chặn mạng nhưng chưa xác định được tác nhân chính xác. NXDOMAIN/loopback là trạng thái DNS quan sát được, không chứng minh ngừng hoạt động vĩnh viễn.
- `checked_at` trong CSV là thời điểm bằng chứng được dùng cho phân loại hiện tại; các cột `engine_initial_*`, `engine_recheck_*`, `network_recheck_checked_at` và `initial_*` giữ tách từng lượt. `homepage_*` là bằng chứng trang chủ từ lượt cũ cùng ngày. Kết quả kiểm tra lại trước đó bằng curl trên cùng máy tính nằm ở cột riêng `user_recheck_evidence`, không có thời điểm chính xác cho từng request.
- Chưa sửa/gỡ site khỏi addon. Phần gỡ 5 tên miền là lựa chọn riêng, không suy từ yêu cầu hiệu chỉnh báo cáo.

## Từng URL sau hiệu chỉnh

### Đã lấy được chương và tải ảnh mẫu / nội dung chữ — 117 site

| URL | Addon | Bằng chứng / giới hạn |
|---|---|---|
| https://anisascans.in | madara | Qua mẫu engine lượt đầu. |
| https://apcomics.org | madara | Qua mẫu engine lượt đầu. |
| https://apollcomics.es | madara | Qua mẫu engine lượt đầu. |
| https://arthurscan.xyz | madara | Qua mẫu engine lượt đầu. |
| https://asialotuss.com | themesia | Qua mẫu engine lượt đầu. |
| https://bymichiby.com | themesia | Qua mẫu engine lượt đầu. |
| https://cafecomyaoi.com.br | madara | Qua mẫu engine lượt đầu. |
| https://cartoonporn.to | madara | Qua mẫu engine lượt đầu. |
| https://cat-300.com | madara | Qua mẫu engine lượt đầu. |
| https://cocomic.co | madara | Qua mẫu engine lượt đầu. |
| https://dojing.net | themesia | Engine đúng cấu hình: list=12, chapters=1, pages=54, ảnh mẫu=ok. Lỗi kết nối ban đầu là tạm thời. |
| https://www.doodmanga.com | madara | Qua mẫu engine lượt đầu. |
| https://doujindistrict.com | madara | Qua mẫu engine lượt đầu. |
| https://ecchi-doujin.com | themesia | Qua mẫu engine lượt đầu. |
| https://euphoriascan.com | madara | Qua mẫu engine lượt đầu. |
| https://m.fanfox.net | fanfox | Qua mẫu engine lượt đầu. |
| https://fbsquadx.com | madara | Qua mẫu engine lượt đầu. |
| https://gaiatoon.com | themesia | Qua mẫu engine lượt đầu. |
| https://gdscans.com | madara | Qua mẫu engine lượt đầu. |
| https://gedecomix.com | madara | Qua mẫu engine lượt đầu. |
| https://god-doujin.com | themesia | Qua mẫu engine lượt đầu. |
| https://grabber.zone | madara | Qua mẫu engine lượt đầu. |
| https://harmony-scan.fr | madara | Qua mẫu engine lượt đầu. |
| https://hentai20.io | themesia | Qua mẫu engine lượt đầu. Chức năng phụ: page2: err Không kết nối được. Kiểm tra mạng rồi thử lại.; search: err Không kết nối được. Kiểm tra mạng rồi thử lại.; resolve: err Không kết nối được. Kiểm tra mạng rồi thử lại. |
| https://hentaixcomic.com | madara | Qua mẫu engine lượt đầu. |
| https://hentaixdickgirl.com | madara | Qua mẫu engine lượt đầu. |
| https://hentaixyuri.com | madara | Qua mẫu engine lượt đầu. |
| https://hhentai.fr | madara | Qua mẫu engine lượt đầu. |
| https://hotcabaretscan.com | madara | Qua mẫu engine lượt đầu. |
| https://infrafandub.com | madara | Qua mẫu engine lượt đầu. Chức năng phụ: page2: err Không tìm thấy trang (404).; search: err Không tìm thấy trang (404).; genres: err Không tìm thấy trang (404). |
| https://inventariooculto.com | madara | Qua mẫu engine lượt đầu. |
| https://izanamiscans.my.id | themesia | Qua mẫu engine lượt đầu. |
| https://kanzenin.info | themesia | Qua mẫu engine lượt đầu. |
| https://kingofshojo.com | themesia | Qua mẫu engine lượt đầu. |
| https://klikmanga.org | madara | Qua mẫu engine lượt đầu. Chức năng phụ: search: err Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục.; genres: err Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://komiktap.info | themesia | Qua mẫu engine lượt đầu. |
| https://ksgroupscans.com | madara | Qua mẫu engine lượt đầu. |
| https://kumapoi.info | themesia | Qua mẫu engine lượt đầu. |
| https://legionscans.com | themesia | Qua mẫu engine lượt đầu. |
| https://leitor.borutoexplorer.com.br | madara | Qua mẫu engine lượt đầu. |
| https://leitor.kamisama.com.br | madara | Qua mẫu engine lượt đầu. |
| https://lekmanga.site | madara | Qua mẫu engine lượt đầu. |
| https://www.lelmanga.com | themesia | Qua mẫu engine lượt đầu. |
| https://lhtranslation.net | madara | Qua mẫu engine lượt đầu. |
| https://www.lianscans.com | themesia | Qua mẫu engine lượt đầu. |
| https://madaradex.org | madara | Qua mẫu engine lượt đầu. |
| https://madarascans.net | themesia | Qua mẫu engine lượt đầu. |
| https://manga-lc.net | madara | Qua mẫu engine lượt đầu. |
| https://manga.adonisfansub.com | themesia | Qua mẫu engine lượt đầu. |
| https://mangadistrict.com | madara | Qua mẫu engine lượt đầu. |
| https://mangagg.com | madara | Qua mẫu engine lượt đầu. |
| https://www.mangaisekaithai.net | madara | Qua mẫu engine lượt đầu. |
| https://www.mangakakalove.com | mangabox | Qua mẫu engine lượt đầu. |
| https://mangakatana.com | mangakatana | Qua mẫu engine lượt đầu. Chức năng phụ: genres: err Hết thời gian chờ máy chủ phản hồi. |
| https://www.mangakimi.com | themesia | Qua mẫu engine lượt đầu. |
| https://mangalami.com | themesia | Qua mẫu engine lượt đầu. |
| https://mangamaniacs.org | madara | Qua mẫu engine lượt đầu. |
| https://mangaowl.io | madara | Qua mẫu engine lượt đầu. |
| https://mangapark.tv | madara | Qua mẫu engine lượt đầu. |
| https://www.mangaread.org | madara | Qua mẫu engine lượt đầu. |
| https://mangastep.com | themesia | Qua mẫu engine lượt đầu. |
| https://mangasushi.org | madara | Qua mẫu engine lượt đầu. |
| https://mangatop.org | madara | Qua mẫu engine lượt đầu. |
| https://m.mangatown.com | mangatown | Qua mẫu engine lượt đầu. |
| https://mangawow.org | madara | Qua mẫu engine lượt đầu. |
| https://mangazin.org | madara | Qua mẫu engine lượt đầu. |
| https://www.manhuabug.com | madara | Qua mẫu engine lượt đầu. |
| https://manhuahot.com | madara | Engine đúng cấu hình: list=10, chapters=15, pages=4, ảnh mẫu=ok. Lỗi kết nối ban đầu là tạm thời. Curl trang chủ chạy cùng đợt bị reset TLS; engine vẫn lấy được chương, tìm kiếm lỗi. Truy cập có biến động theo request. Chức năng phụ: search: err Không kết nối được. Kiểm tra mạng rồi thử lại. |
| https://manhuanext.com | madara | Qua mẫu engine lượt đầu. |
| https://www.manhuathai.com | madara | Qua mẫu engine lượt đầu. |
| https://www.manhwabreakup.com | madara | Qua mẫu engine lượt đầu. |
| https://www.manhwaden.com | madara | Qua mẫu engine lượt đầu. |
| https://manhwatop.com | madara | Qua mẫu engine lượt đầu. |
| https://marmota.me | madara | Qua mẫu engine lượt đầu. |
| https://mihentai.net | themesia | Qua mẫu engine lượt đầu. |
| https://montetaiscanlator.xyz | madara | Qua mẫu engine lượt đầu. |
| https://mundomanhwa.com | madara | Qua mẫu engine lượt đầu. |
| https://niji-translations.com | madara | Qua mẫu engine lượt đầu. |
| https://ninjacomics.xyz | madara | Qua mẫu engine lượt đầu. |
| https://nirvanamanga.com | themesia | Qua mẫu engine lượt đầu. |
| https://nocfsb.com | madara | Qua mẫu engine lượt đầu. |
| https://novelphoenix.net | novelfull | Qua mẫu engine lượt đầu. |
| https://novgo.net | novelfull | Qua mẫu engine lượt đầu. |
| https://www.ntr-manga.net | themesia | Qua mẫu engine lượt đầu. |
| https://paradise-bl.com | madara | Qua mẫu engine lượt đầu. |
| https://www.paritehaber.com | madara | Qua mẫu engine lượt đầu. |
| https://www.petrotechsociety.org | madara | Qua mẫu engine lượt đầu. |
| https://rackusreads.com | themesia | Qua mẫu engine lượt đầu. |
| https://ragnarokscanlation.opchapters.com | madara | Qua mẫu engine lượt đầu. Chức năng phụ: page2: err Không tìm thấy trang (404). |
| https://ragnarokscanlation.org | madara | Qua mẫu engine lượt đầu. |
| https://ravenscans.org | themesia | Qua mẫu engine lượt đầu. |
| https://reapertrans.com | themesia | Qua mẫu engine lượt đầu. |
| https://www.ruyamanga2.com | madara | Qua mẫu engine lượt đầu. |
| https://sektedoujin.cc | themesia | Qua mẫu engine lượt đầu. |
| https://sereinscan.com | themesia | Qua mẫu engine lượt đầu. |
| https://shijiescans.com | themesia | Qua mẫu engine lượt đầu. |
| https://sleepytranslations.com | madara | Qua mẫu engine lượt đầu. |
| https://sparkmanga.net | madara | Qua mẫu engine lượt đầu. |
| https://speed-manga.net | themesia | Qua mẫu engine lượt đầu. |
| https://sushiscan.net | themesia | Qua mẫu engine lượt đầu. |
| https://tankouhentai.com | madara | Qua mẫu engine lượt đầu. |
| https://www.tanuki-manga.net | themesia | Qua mẫu engine lượt đầu. |
| https://www.tilkiscans.com | madara | Qua mẫu engine lượt đầu. |
| https://toomtam-manga.com | themesia | Qua mẫu engine lượt đầu. |
| https://toonizy.com | madara | Qua mẫu engine lượt đầu. |
| https://topcomicporno.com | madara | Qua mẫu engine lượt đầu. |
| https://tritinia.org | madara | Qua mẫu engine lượt đầu. |
| https://trmangaoku.com | madara | Qua mẫu engine lượt đầu. |
| https://truyentranhdammyy.site | madara | Qua mẫu engine lượt đầu. |
| https://tsundoku.com.br | themesia | Qua mẫu engine lượt đầu. |
| https://uchuujinmangas.com | themesia | Qua mẫu engine lượt đầu. |
| https://vermanhwa.com | madara | Qua mẫu engine lượt đầu. |
| https://violetmanga.com | themesia | Qua mẫu engine lượt đầu. |
| https://webtoonempire-bl.com | madara | Qua mẫu engine lượt đầu. |
| https://weebcentral.com | weebcentral | Qua mẫu engine lượt đầu. |
| https://wuxiaworld.site | madara | Qua mẫu engine lượt đầu. |
| https://www.xn--l3c0azab5a2gta.com | themesia | Qua mẫu engine lượt đầu. |

### Cloudflare được nhận diện — 66 site

| URL | Addon | Bằng chứng / giới hạn |
|---|---|---|
| https://01.kaguya.pro | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://allnovelupdates.com | novelfull | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://allporncomic.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://apenasmaisumyaoi.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://apkomik.cc | themesia | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://ar.kenmanga.com | themesia | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://archiviumbar.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://arcurafansub.com | themesia | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://astral-manga.fr | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://bakamh.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://begatranslation.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://bokugents.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://boratscans.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://doujin-lc.net | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://doujinku.org | themesia | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://dragontea.ink | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://evil-manga.eu | themesia | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://foxaholic.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://hijala.com | themesia | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://kissmanga.in | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://kunmanga.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://leitordemangas.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://lightnovelpub.me | novelfull | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://link-manga.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manga-leko.org | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manga-lionz.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manga-scantrad.io | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manga-starz.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manga.detectiveconanar.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manga168.net | themesia | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manga18free.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manga18x.net | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://mangacrazy.net | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://mangaforfree.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://mangaforfree.net | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://mangaromance19.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://mangas-origines.fr | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://mangawt.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manhuafast.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manhuafast.net | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manhuatop.org | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manhuaus.org | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manhuazonghe.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manhwa-latino.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manhwa-raw.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manhwa68.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manhwaclub.net | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://mugiwarasoficial.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://novelcrow.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://novellive.app | novelfull | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://novellive.com | novelfull | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://patimanga.com | themesia | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://rawdex.net | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://setsuscans.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://shirakami.xyz | themesia | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://stellarsaber.pro | themesia | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://theblank.net | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://tiamanhwa.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://toonfr.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://toongod.org | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://toonily.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://topmanhua.net | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://webtoon.xyz | madara | Header cf-mitigated: challenge xác nhận Cloudflare, không chỉ suy từ mã 403. Chức năng phụ: error: Không kết nối được. Kiểm tra mạng rồi thử lại. |
| https://webtoonscan.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://yaoimangaoku.net | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://yaoiscan.com | madara | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. Chức năng phụ: error: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |

### Dấu hiệu chặn mạng ở TLS; chưa kết luận lỗi addon — 11 site

| URL | Addon | Bằng chứng / giới hạn |
|---|---|---|
| https://guncelmanga.net | madara | https://guncelmanga.net: DNS A có đáp án; curl exit 35, chưa hoàn tất TLS, tổng 0.096s. Dấu hiệu phù hợp chặn mạng. Đối chứng qua WARP: tới được site nhưng danh sách rỗng. |
| https://hentaicb.fit | madara | Kết nối bị reset ngay khi bắt tay TLS, giống chặn nhà mạng; có lúc truy cập được. Đối chứng qua WARP: cũng không kết nối được. |
| https://hentaivn.art | madara | https://hentaivn.art: DNS A có đáp án; curl exit 35, chưa hoàn tất TLS, tổng 0.149s. Dấu hiệu phù hợp chặn mạng. Đối chứng qua WARP: cũng không kết nối được. |
| https://hentaivn.boo | madara | https://hentaivn.boo: DNS A có đáp án; curl exit 35, chưa hoàn tất TLS, tổng 0.129s. Dấu hiệu phù hợp chặn mạng. Đối chứng qua WARP: cũng không kết nối được. |
| https://manga18fx.com | madara | https://manga18fx.com: DNS A có đáp án; curl exit 35, chưa hoàn tất TLS, tổng 0.140s. Dấu hiệu phù hợp chặn mạng. Đối chứng qua WARP: tới được site nhưng danh sách rỗng. |
| https://mangadex.org | mangadex | https://api.mangadex.org/manga?limit=1: DNS A có đáp án; curl exit 35, chưa hoàn tất TLS, tổng 0.056s. Dấu hiệu phù hợp chặn mạng; API addon sử dụng bị reset. Đối chứng: qua WARP đọc được chương và ảnh mẫu. |
| https://mangahentai.me | madara | https://mangahentai.me: DNS A có đáp án; curl exit 35, chưa hoàn tất TLS, tổng 4.259s. Dấu hiệu phù hợp chặn mạng. Đối chứng qua WARP: cũng không kết nối được. |
| https://manhuaplus.com | madara | https://manhuaplus.com: DNS A có đáp án; curl exit 35, chưa hoàn tất TLS, tổng 0.123s. Dấu hiệu phù hợp chặn mạng. Đối chứng qua WARP: đọc được chương và ảnh mẫu. |
| https://manhuaus.com | madara | Kết nối bị reset ngay khi bắt tay TLS, giống chặn nhà mạng; có lúc trả 403. Đối chứng qua WARP: tới được site nhưng gặp xác minh Cloudflare. |
| https://manhwaclan.com | madara | https://manhwaclan.com: DNS A có đáp án; curl exit 35, chưa hoàn tất TLS, tổng 0.092s. Dấu hiệu phù hợp chặn mạng. Đối chứng qua WARP: tới được site nhưng gặp xác minh Cloudflare. |
| https://truyenvn.ac | madara | https://truyenvn.ac: DNS A có đáp án; curl exit 35, chưa hoàn tất TLS, tổng 0.062s. Dấu hiệu phù hợp chặn mạng. Đối chứng qua WARP: máy chủ gốc trả lỗi 521 (đang sập). |

### Máy chủ lỗi TLS (cả qua WARP) — 3 site

| URL | Addon | Bằng chứng / giới hạn |
|---|---|---|
| https://ayatoon.com | themesia | Máy chủ trả cảnh báo TLS "sslv3 alert handshake failure" (không phải bị reset kết nối); qua WARP cũng lỗi SSLV3_ALERT_HANDSHAKE_FAILURE. |
| https://manhuanow.com | madtheme | Máy chủ trả cảnh báo TLS "tlsv1 alert protocol version"; qua WARP lỗi WRONG_VERSION_NUMBER. |
| https://pirulitorosa.site | madara | Máy chủ trả cảnh báo TLS "tlsv1 alert internal error"; qua WARP cũng lỗi TLSV1_ALERT_INTERNAL_ERROR. |

### Tên miền hết hạn / parking / quảng cáo — 10 site

| URL | Addon | Bằng chứng / giới hạn |
|---|---|---|
| https://adultwebtoon.com | madara | Không kết nối được. Kiểm tra mạng rồi thử lại. Trang chủ: lander.parity.domains Chức năng phụ: error: Không kết nối được. Kiểm tra mạng rồi thử lại. |
| https://akimanga.com | madara | Không kết nối được. Kiểm tra mạng rồi thử lại. Trang chủ: domain is expired Chức năng phụ: error: Không kết nối được. Kiểm tra mạng rồi thử lại. |
| https://hentaimanga.me | madara | Không kết nối được. Kiểm tra mạng rồi thử lại. Trang chủ: lander.parity.domains Chức năng phụ: error: Không kết nối được. Kiểm tra mạng rồi thử lại. |
| https://hentaiwebtoon.com | madara | Không kết nối được. Kiểm tra mạng rồi thử lại. Trang chủ: lander.parity.domains Chức năng phụ: error: Không kết nối được. Kiểm tra mạng rồi thử lại. |
| https://mangaraw.org | themesia | Không kết nối được. Kiểm tra mạng rồi thử lại. Trang chủ: parklogic.com Chức năng phụ: error: Không kết nối được. Kiểm tra mạng rồi thử lại. |
| https://manhuaga.com | themesia | Không kết nối được. Kiểm tra mạng rồi thử lại. Trang chủ: lander.parity.domains Chức năng phụ: error: Không kết nối được. Kiểm tra mạng rồi thử lại. |
| https://retsu.org | madara | Không kết nối được. Kiểm tra mạng rồi thử lại. Trang chủ: parklogic.com Chức năng phụ: error: Không kết nối được. Kiểm tra mạng rồi thử lại. |
| https://ruahapchanhday.com | madara | IP 103.224.182.211 thuộc Trellian (dịch vụ đỗ tên miền bỏ không); trang chủ chỉ có tiêu đề tên miền. Qua WARP cũng không kết nối được. |
| https://sapphirescan.com | madara | Không kết nối được. Kiểm tra mạng rồi thử lại. Trang chủ: lander.parity.domains Chức năng phụ: error: Không kết nối được. Kiểm tra mạng rồi thử lại. |
| https://shibamanga.com | madara | Không kết nối được. Kiểm tra mạng rồi thử lại. Trang chủ: lander.parity.domains Chức năng phụ: error: Không kết nối được. Kiểm tra mạng rồi thử lại. |

### DNS công cộng trả NXDOMAIN — 4 site

| URL | Addon | Bằng chứng / giới hạn |
|---|---|---|
| https://kaliscan.com | madtheme | A và AAAA: resolver hệ thống và 1.1.1.1 trả NXDOMAIN. Không suy ra ngừng hoạt động vĩnh viễn. Chức năng phụ: error: Không kết nối được. Kiểm tra mạng rồi thử lại. |
| https://kaliscan.io | madtheme | A và AAAA: resolver hệ thống và 1.1.1.1 trả NXDOMAIN. Không suy ra ngừng hoạt động vĩnh viễn. Chức năng phụ: error: Không kết nối được. Kiểm tra mạng rồi thử lại. |
| https://kaliscan.me | madtheme | A và AAAA: resolver hệ thống và 1.1.1.1 trả NXDOMAIN. Không suy ra ngừng hoạt động vĩnh viễn. Chức năng phụ: error: Không kết nối được. Kiểm tra mạng rồi thử lại. |
| https://mgjinx.com | madtheme | A và AAAA: resolver hệ thống và 1.1.1.1 trả NXDOMAIN. Không suy ra ngừng hoạt động vĩnh viễn. Chức năng phụ: error: Không kết nối được. Kiểm tra mạng rồi thử lại. |

### DNS công cộng trỏ về loopback 127.0.0.1 — 1 site

| URL | Addon | Bằng chứng / giới hạn |
|---|---|---|
| https://starligthscan.com | themesia | 1.1.1.1 trả A=127.0.0.1; không có AAAA. URL không dẫn tới máy chủ truyện công cộng. Chức năng phụ: error: Không kết nối được. Kiểm tra mạng rồi thử lại. |

### Redirect tới hostname không phân giải được — 1 site

| URL | Addon | Bằng chứng / giới hạn |
|---|---|---|
| https://zinmanga.net | madara | HTTP 301 tới https://ww3.zinmanga.net/ rồi không phân giải được hostname đích. Domain gốc vẫn phân giải được. Chức năng phụ: error: Không kết nối được. Kiểm tra mạng rồi thử lại. |

### Lỗi máy chủ quan sát được — 2 site

| URL | Addon | Bằng chứng / giới hạn |
|---|---|---|
| https://culturedworks.com | themesia | curl exit=0; HTTP=526; tổng 0.490s. Chức năng phụ: error: Máy chủ trả lỗi 526. |
| https://walpurgiscan.it | themesia | curl exit=0; HTTP=522; tổng 19.773s. Kiểm tra lại trước đó nhận 503; lần mới nhận 522. Cùng nhóm lỗi máy chủ, không phải hỏng addon. Chức năng phụ: error: Máy chủ trả lỗi 522. |

### Timeout quan sát được — 1 site

| URL | Addon | Bằng chứng / giới hạn |
|---|---|---|
| https://reader.decadencescans.com | madara | curl exit=28; HTTP=0; tổng 20.005s. Chức năng phụ: error: Hết thời gian chờ máy chủ phản hồi. |

### Không lấy được danh sách / truyện / chương / ảnh — 5 site

| URL | Addon | Bằng chứng / giới hạn |
|---|---|---|
| https://3asq.online | madara | không có chương Chức năng phụ: error: không có chương |
| https://arabtoons.net | madara | danh sách rỗng Chức năng phụ: error: danh sách rỗng |
| https://ch1.isekaikomik.site | themesia | ảnh: http 523 Chức năng phụ: error: ảnh: http 523 |
| https://manhuakey.com | madara | trang truyện không có tên Chức năng phụ: error: trang truyện không có tên |
| https://sarcasmscans.com | madara | danh sách rỗng Chức năng phụ: error: danh sách rỗng |

## Tệp đối chiếu

- [CSV phân loại đã hiệu chỉnh](current-url-support.csv): kết quả lượt đầu, lượt thử lại và bằng chứng kiểm tra lại nằm trong các cột `initial_*`, `engine_*`, `recheck_evidence`.
- [Kiểm tra cùng danh mục qua điện thoại có WARP](phone-warp-url-support.md)
