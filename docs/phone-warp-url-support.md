# Kiểm tra danh mục qua mạng điện thoại có WARP — 17/10/2026

**Kiểm tra đủ 221 site: 104 site qua mẫu lấy chương và tải ảnh/nội dung chữ.** Cloudflare trace trên điện thoại trả `warp=on` cả trước lẫn sau lượt chạy.

## Kết quả

| Kết quả qua điện thoại | Số site |
|---|---:|
| Qua mẫu lấy chương và tải ảnh/nội dung chữ | 104 |
| Cloudflare/challenge | 68 |
| HTTP 403, chưa xác định là challenge | 11 |
| Không kết nối được | 24 |
| Timeout | 1 |
| Lỗi HTTP khác | 4 |
| Lỗi lấy nội dung/ảnh | 9 |

So với kết quả gộp 117 site từng đọc được trên máy tính: 2 site trước chưa qua nay qua; 15 site từng qua nhưng không qua lượt điện thoại. Hai môi trường/thời điểm khác nhau; không suy toàn bộ thay đổi là do WARP. Có 2 site qua mẫu đọc nhưng gặp lỗi chức năng phụ.

## 13 site trước có dấu hiệu bị chặn TLS

Đây là phân loại tại thời điểm chạy. Sau khi đối chiếu bảng này, [báo cáo chính](current-url-support.md) chỉ giữ 11 site trong nhóm chặn mạng: ayatoon.com, pirulitorosa.site, manhuanow.com là máy chủ lỗi TLS; ruahapchanhday.com là tên miền parking; hentaicb.fit và manhuaus.com được thêm vào.

| Site | Kết quả điện thoại | Chi tiết |
|---|---|---|
| ayatoon.com | Không kết nối được | error:10000410:SSL routines:OPENSSL_internal:SSLV3_ALERT_HANDSHAKE_FAILURE |
| guncelmanga.net | Lỗi lấy nội dung/ảnh | danh sách rỗng |
| hentaivn.art | Không kết nối được | Connection timeout after 8376 ms |
| hentaivn.boo | Không kết nối được | Connection timeout after 8376 ms |
| manga18fx.com | Lỗi lấy nội dung/ảnh | danh sách rỗng |
| mangadex.org | Qua mẫu lấy chương và tải ảnh/nội dung chữ | Qua mẫu đọc |
| mangahentai.me | Không kết nối được | Could not resolve host: mangahentai.me |
| manhuanow.com | Không kết nối được | error:100000f7:SSL routines:OPENSSL_internal:WRONG_VERSION_NUMBER |
| manhuaplus.com | Qua mẫu lấy chương và tải ảnh/nội dung chữ | Qua mẫu đọc |
| manhwaclan.com | Cloudflare/challenge | [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| pirulitorosa.site | Không kết nối được | error:10000438:SSL routines:OPENSSL_internal:TLSV1_ALERT_INTERNAL_ERROR |
| ruahapchanhday.com | Không kết nối được | Connection timeout after 8001 ms |
| truyenvn.ac | Lỗi HTTP khác | Máy chủ trả lỗi 521. |

## Site trước chưa đọc được, nay qua mẫu kiểm tra

| Site | Trạng thái trước | Chi tiết lần này |
|---|---|---|
| mangadex.org | suspected_network_block | Qua mẫu đọc |
| manhuaplus.com | suspected_network_block | Qua mẫu đọc |

## Giới hạn và cách kiểm tra

- Chạy đủ 221 site trong khoảng 164 giây; thử lại 25 site lỗi kết nối/timeout trong khoảng 26 giây. CSV tổng hợp lấy kết quả thử lại cho 25 site này; không có site nào trong 25 site qua mẫu đọc.
- Lượt đầu cầu nối ADB nhận lẫn stderr vào stdout khi curl lỗi, nên một số lỗi bị hiển thị chung là lỗi kết nối. Đã tách stderr và thử lại đủ 25 trường hợp liên quan để lưu nguyên nhân curl. Các kết quả qua mẫu đọc không bị ảnh hưởng.
- Giữ nguyên thiết lập mạng/1.1.1.1 của người dùng; không bật/tắt WARP, không thay DNS hoặc cài bản app khác.
- Engine và parser của 10 addon trong repository chạy bằng Node/Jest trên máy tính. Mọi fetch của lượt engine, gồm HTML/API/ảnh, được chuyển thành curl chạy trên điện thoại qua ADB. Đây là kiểm tra engine qua đường mạng điện thoại, không phải thao tác UI trong app Android.
- Dùng đúng cấu hình 221 site hiện tại. Danh sách mới nhất → tối đa 3 truyện → chương đầu/cuối/giữa → tải một ảnh mẫu (HTTP/MIME/size >512 byte), hoặc có đoạn văn. Không đảm bảo mọi chương/ảnh đều đọc được.
- Thử bổ sung trang 2, tìm kiếm, thể loại và suy URL truyện. Lỗi các chức năng phụ lưu riêng. Không nhập cookie đăng nhập/xác minh từ app hoặc WebView vào curl; challenge có thể cần xác minh riêng.
- curl xác thực chứng chỉ TLS, theo tối đa 8 redirect, connect timeout 8 giây, tổng timeout 28 giây và tối đa 24 MiB/request; timeout của engine/fetch có thể ngắn hơn. Mỗi site có giới hạn tổng 150 giây. Lỗi kết nối không tự động được gọi là site chết.
- Trace WARP trước: 2026-10-17T15:25:33.281Z; sau: 2026-10-17T15:29:15.345Z. Có 1052 request được ghi log, gồm preflight/trace. Lần kiểm tra không đo đối chứng tắt WARP trên cùng điện thoại.
- Kết quả lịch sử trong current-url-support.csv không bị ghi đè; CSV phone-warp-url-support.csv giữ hai trạng thái để đối chiếu.

## Tất cả 221 URL

### Qua mẫu lấy chương và tải ảnh/nội dung chữ — 104 site

| URL | Addon | Chi tiết |
|---|---|---|
| https://anisascans.in | madara | Qua mẫu đọc |
| https://apcomics.org | madara | Qua mẫu đọc |
| https://apollcomics.es | madara | Qua mẫu đọc |
| https://arthurscan.xyz | madara | Qua mẫu đọc |
| https://cafecomyaoi.com.br | madara | Qua mẫu đọc |
| https://cartoonporn.to | madara | Qua mẫu đọc |
| https://cat-300.com | madara | Qua mẫu đọc |
| https://cocomic.co | madara | Qua mẫu đọc |
| https://dojing.net | themesia | Qua mẫu đọc |
| https://www.doodmanga.com | madara | Qua mẫu đọc |
| https://doujindistrict.com | madara | Qua mẫu đọc |
| https://ecchi-doujin.com | themesia | Qua mẫu đọc |
| https://euphoriascan.com | madara | Qua mẫu đọc |
| https://m.fanfox.net | fanfox | Qua mẫu đọc |
| https://fbsquadx.com | madara | Qua mẫu đọc |
| https://gaiatoon.com | themesia | Qua mẫu đọc |
| https://gedecomix.com | madara | Qua mẫu đọc |
| https://god-doujin.com | themesia | Qua mẫu đọc |
| https://grabber.zone | madara | Qua mẫu đọc |
| https://harmony-scan.fr | madara | Qua mẫu đọc |
| https://hentai20.io | themesia | Qua mẫu đọc |
| https://hentaixcomic.com | madara | Qua mẫu đọc |
| https://hentaixdickgirl.com | madara | Qua mẫu đọc |
| https://hentaixyuri.com | madara | Qua mẫu đọc |
| https://hhentai.fr | madara | Qua mẫu đọc |
| https://hotcabaretscan.com | madara | Qua mẫu đọc |
| https://inventariooculto.com | madara | Qua mẫu đọc |
| https://kanzenin.info | themesia | Qua mẫu đọc |
| https://kingofshojo.com | themesia | Qua mẫu đọc |
| https://klikmanga.org | madara | search: err Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục.; genres: err Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://komiktap.info | themesia | Qua mẫu đọc |
| https://ksgroupscans.com | madara | Qua mẫu đọc |
| https://legionscans.com | themesia | Qua mẫu đọc |
| https://leitor.borutoexplorer.com.br | madara | Qua mẫu đọc |
| https://leitor.kamisama.com.br | madara | Qua mẫu đọc |
| https://lekmanga.site | madara | Qua mẫu đọc |
| https://www.lelmanga.com | themesia | Qua mẫu đọc |
| https://lhtranslation.net | madara | Qua mẫu đọc |
| https://madarascans.net | themesia | Qua mẫu đọc |
| https://manga-lc.net | madara | Qua mẫu đọc |
| https://manga.adonisfansub.com | themesia | Qua mẫu đọc |
| https://mangadex.org | mangadex | Qua mẫu đọc |
| https://mangadistrict.com | madara | Qua mẫu đọc |
| https://mangagg.com | madara | Qua mẫu đọc |
| https://www.mangaisekaithai.net | madara | Qua mẫu đọc |
| https://www.mangakakalove.com | mangabox | Qua mẫu đọc |
| https://mangakatana.com | mangakatana | Qua mẫu đọc |
| https://www.mangakimi.com | themesia | Qua mẫu đọc |
| https://mangalami.com | themesia | Qua mẫu đọc |
| https://mangaowl.io | madara | Qua mẫu đọc |
| https://mangapark.tv | madara | Qua mẫu đọc |
| https://www.mangaread.org | madara | Qua mẫu đọc |
| https://mangastep.com | themesia | Qua mẫu đọc |
| https://mangasushi.org | madara | Qua mẫu đọc |
| https://mangatop.org | madara | Qua mẫu đọc |
| https://m.mangatown.com | mangatown | Qua mẫu đọc |
| https://mangawow.org | madara | Qua mẫu đọc |
| https://mangazin.org | madara | Qua mẫu đọc |
| https://www.manhuabug.com | madara | Qua mẫu đọc |
| https://manhuahot.com | madara | Qua mẫu đọc |
| https://manhuanext.com | madara | Qua mẫu đọc |
| https://manhuaplus.com | madara | Qua mẫu đọc |
| https://www.manhuathai.com | madara | Qua mẫu đọc |
| https://www.manhwabreakup.com | madara | Qua mẫu đọc |
| https://www.manhwaden.com | madara | Qua mẫu đọc |
| https://manhwatop.com | madara | Qua mẫu đọc |
| https://mihentai.net | themesia | Qua mẫu đọc |
| https://montetaiscanlator.xyz | madara | Qua mẫu đọc |
| https://mundomanhwa.com | madara | Qua mẫu đọc |
| https://niji-translations.com | madara | Qua mẫu đọc |
| https://ninjacomics.xyz | madara | Qua mẫu đọc |
| https://nirvanamanga.com | themesia | Qua mẫu đọc |
| https://novelphoenix.net | novelfull | Qua mẫu đọc |
| https://novgo.net | novelfull | Qua mẫu đọc |
| https://www.ntr-manga.net | themesia | Qua mẫu đọc |
| https://www.paritehaber.com | madara | Qua mẫu đọc |
| https://www.petrotechsociety.org | madara | Qua mẫu đọc |
| https://ragnarokscanlation.opchapters.com | madara | page2: err Không tìm thấy trang (404). |
| https://ragnarokscanlation.org | madara | Qua mẫu đọc |
| https://ravenscans.org | themesia | Qua mẫu đọc |
| https://reapertrans.com | themesia | Qua mẫu đọc |
| https://sektedoujin.cc | themesia | Qua mẫu đọc |
| https://sereinscan.com | themesia | Qua mẫu đọc |
| https://shijiescans.com | themesia | Qua mẫu đọc |
| https://sleepytranslations.com | madara | Qua mẫu đọc |
| https://sparkmanga.net | madara | Qua mẫu đọc |
| https://speed-manga.net | themesia | Qua mẫu đọc |
| https://sushiscan.net | themesia | Qua mẫu đọc |
| https://tankouhentai.com | madara | Qua mẫu đọc |
| https://www.tanuki-manga.net | themesia | Qua mẫu đọc |
| https://www.tilkiscans.com | madara | Qua mẫu đọc |
| https://toomtam-manga.com | themesia | Qua mẫu đọc |
| https://toonizy.com | madara | Qua mẫu đọc |
| https://topcomicporno.com | madara | Qua mẫu đọc |
| https://tritinia.org | madara | Qua mẫu đọc |
| https://truyentranhdammyy.site | madara | Qua mẫu đọc |
| https://tsundoku.com.br | themesia | Qua mẫu đọc |
| https://uchuujinmangas.com | themesia | Qua mẫu đọc |
| https://vermanhwa.com | madara | Qua mẫu đọc |
| https://violetmanga.com | themesia | Qua mẫu đọc |
| https://webtoonempire-bl.com | madara | Qua mẫu đọc |
| https://weebcentral.com | weebcentral | Qua mẫu đọc |
| https://wuxiaworld.site | madara | Qua mẫu đọc |
| https://www.xn--l3c0azab5a2gta.com | themesia | Qua mẫu đọc |

### Cloudflare/challenge — 68 site

| URL | Addon | Chi tiết |
|---|---|---|
| https://01.kaguya.pro | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://allnovelupdates.com | novelfull | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://allporncomic.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://apenasmaisumyaoi.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://apkomik.cc | themesia | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://ar.kenmanga.com | themesia | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://archiviumbar.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://arcurafansub.com | themesia | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://astral-manga.fr | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://begatranslation.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://bokugents.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://boratscans.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://doujin-lc.net | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://doujinku.org | themesia | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://dragontea.ink | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://evil-manga.eu | themesia | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://foxaholic.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://hijala.com | themesia | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://kissmanga.in | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://kunmanga.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://leitordemangas.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://lightnovelpub.me | novelfull | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://link-manga.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manga-leko.org | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manga-lionz.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manga-scantrad.io | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manga-starz.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manga.detectiveconanar.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manga168.net | themesia | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manga18free.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manga18x.net | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://mangacrazy.net | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://mangaforfree.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://mangaforfree.net | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://mangaromance19.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://mangas-origines.fr | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://mangawt.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manhuafast.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manhuafast.net | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manhuatop.org | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manhuaus.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manhuaus.org | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manhuazonghe.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manhwa-latino.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manhwa-raw.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manhwa68.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manhwaclan.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://manhwaclub.net | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://mugiwarasoficial.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://novelcrow.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://novellive.app | novelfull | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://novellive.com | novelfull | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://patimanga.com | themesia | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://rawdex.net | madara | pages: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://setsuscans.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://shirakami.xyz | themesia | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://stellarsaber.pro | themesia | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://theblank.net | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://tiamanhwa.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://toonfr.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://toongod.org | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://toonily.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://topmanhua.net | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://walpurgiscan.it | themesia | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://webtoon.xyz | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://webtoonscan.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://yaoimangaoku.net | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |
| https://yaoiscan.com | madara | list: [cloudflare] Trang yêu cầu xác minh bạn không phải bot. Mở trong trình duyệt để tiếp tục. |

### HTTP 403, chưa xác định là challenge — 11 site

| URL | Addon | Chi tiết |
|---|---|---|
| https://asialotuss.com | themesia | list: Máy chủ trả lỗi 403. |
| https://bymichiby.com | themesia | list: Máy chủ trả lỗi 403. |
| https://gdscans.com | madara | list: Máy chủ trả lỗi 403. |
| https://infrafandub.com | madara | list: Máy chủ trả lỗi 403. |
| https://izanamiscans.my.id | themesia | list: Máy chủ trả lỗi 403. |
| https://kumapoi.info | themesia | list: Máy chủ trả lỗi 403. |
| https://www.lianscans.com | themesia | list: Máy chủ trả lỗi 403. |
| https://madaradex.org | madara | image: ảnh: http 403 |
| https://marmota.me | madara | list: Máy chủ trả lỗi 403. |
| https://rackusreads.com | themesia | list: Máy chủ trả lỗi 403. |
| https://trmangaoku.com | madara | list: Máy chủ trả lỗi 403. |

### Không kết nối được — 24 site

| URL | Addon | Chi tiết |
|---|---|---|
| https://adultwebtoon.com | madara | list: Không kết nối được. Kiểm tra mạng rồi thử lại. — BoringSSL SSL_connect: SSL_ERROR_SYSCALL in connection to adultwebtoon.com:443  |
| https://akimanga.com | madara | list: Không kết nối được. Kiểm tra mạng rồi thử lại. — Connection timeout after 8340 ms |
| https://ayatoon.com | themesia | list: Không kết nối được. Kiểm tra mạng rồi thử lại. — error:10000410:SSL routines:OPENSSL_internal:SSLV3_ALERT_HANDSHAKE_FAILURE |
| https://hentaicb.fit | madara | list: Không kết nối được. Kiểm tra mạng rồi thử lại. — Connection timeout after 8340 ms |
| https://hentaimanga.me | madara | list: Không kết nối được. Kiểm tra mạng rồi thử lại. — Failed to connect to hentaimanga.me port 443 after 6449 ms: Connection timed out |
| https://hentaivn.art | madara | list: Không kết nối được. Kiểm tra mạng rồi thử lại. — Connection timeout after 8376 ms |
| https://hentaivn.boo | madara | list: Không kết nối được. Kiểm tra mạng rồi thử lại. — Connection timeout after 8376 ms |
| https://hentaiwebtoon.com | madara | list: Không kết nối được. Kiểm tra mạng rồi thử lại. — BoringSSL SSL_connect: SSL_ERROR_SYSCALL in connection to hentaiwebtoon.com:443  |
| https://kaliscan.com | madtheme | list: Không kết nối được. Kiểm tra mạng rồi thử lại. — Could not resolve host: kaliscan.com |
| https://kaliscan.io | madtheme | list: Không kết nối được. Kiểm tra mạng rồi thử lại. — Could not resolve host: kaliscan.io |
| https://kaliscan.me | madtheme | list: Không kết nối được. Kiểm tra mạng rồi thử lại. — Could not resolve host: kaliscan.me |
| https://mangahentai.me | madara | list: Không kết nối được. Kiểm tra mạng rồi thử lại. — Could not resolve host: mangahentai.me |
| https://mangaraw.org | themesia | list: Không kết nối được. Kiểm tra mạng rồi thử lại. — SSL certificate problem: unable to get local issuer certificate |
| https://manhuaga.com | themesia | list: Không kết nối được. Kiểm tra mạng rồi thử lại. — Failed to connect to manhuaga.com port 443 after 6068 ms: Connection timed out |
| https://manhuanow.com | madtheme | list: Không kết nối được. Kiểm tra mạng rồi thử lại. — error:100000f7:SSL routines:OPENSSL_internal:WRONG_VERSION_NUMBER |
| https://mgjinx.com | madtheme | list: Không kết nối được. Kiểm tra mạng rồi thử lại. — Could not resolve host: mgjinx.com |
| https://nocfsb.com | madara | list: Không kết nối được. Kiểm tra mạng rồi thử lại. — Connection timeout after 8000 ms |
| https://pirulitorosa.site | madara | list: Không kết nối được. Kiểm tra mạng rồi thử lại. — error:10000438:SSL routines:OPENSSL_internal:TLSV1_ALERT_INTERNAL_ERROR |
| https://retsu.org | madara | list: Không kết nối được. Kiểm tra mạng rồi thử lại. — SSL certificate problem: unable to get local issuer certificate |
| https://ruahapchanhday.com | madara | list: Không kết nối được. Kiểm tra mạng rồi thử lại. — Connection timeout after 8001 ms |
| https://sapphirescan.com | madara | list: Không kết nối được. Kiểm tra mạng rồi thử lại. — BoringSSL SSL_connect: SSL_ERROR_SYSCALL in connection to sapphirescan.com:443  |
| https://shibamanga.com | madara | list: Không kết nối được. Kiểm tra mạng rồi thử lại. — BoringSSL SSL_connect: SSL_ERROR_SYSCALL in connection to shibamanga.com:443  |
| https://starligthscan.com | themesia | list: Không kết nối được. Kiểm tra mạng rồi thử lại. — Failed to connect to starligthscan.com port 443 after 44 ms: Connection refused |
| https://zinmanga.net | madara | list: Không kết nối được. Kiểm tra mạng rồi thử lại. — Could not resolve host: ww3.zinmanga.net |

### Timeout — 1 site

| URL | Addon | Chi tiết |
|---|---|---|
| https://reader.decadencescans.com | madara | list: Hết thời gian chờ máy chủ phản hồi. — The operation was aborted |

### Lỗi HTTP khác — 4 site

| URL | Addon | Chi tiết |
|---|---|---|
| https://culturedworks.com | themesia | list: Máy chủ trả lỗi 526. |
| https://mangamaniacs.org | madara | list: Máy chủ trả lỗi 522. |
| https://sarcasmscans.com | madara | list: Máy chủ trả lỗi 429. |
| https://truyenvn.ac | madara | list: Máy chủ trả lỗi 521. |

### Lỗi lấy nội dung/ảnh — 9 site

| URL | Addon | Chi tiết |
|---|---|---|
| https://3asq.online | madara | chapters: không có chương |
| https://arabtoons.net | madara | list: danh sách rỗng |
| https://bakamh.com | madara | chapters: không có chương |
| https://ch1.isekaikomik.site | themesia | image: ảnh: http 523 |
| https://guncelmanga.net | madara | list: danh sách rỗng |
| https://manga18fx.com | madara | list: danh sách rỗng |
| https://manhuakey.com | madara | detail: trang truyện không có tên |
| https://paradise-bl.com | madara | image: ảnh: http 400 |
| https://www.ruyamanga2.com | madara | image: ảnh: err Unexpected token 'c', "curl: (61)"... is not valid JSON |

## Tệp bằng chứng

- [CSV so sánh từng URL](phone-warp-url-support.csv)
- [Kiểm tra trên máy tính, không VPN](current-url-support.md)
