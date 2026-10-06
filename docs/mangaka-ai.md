# Mangaka AI — Tài liệu ý tưởng & thiết kế sản phẩm

Cập nhật: 2026-10-06

Bộ tài liệu gồm ba phần:

- **Tổng quan sản phẩm** — file này.
- **[Mô tả tính năng](features.md)** — quy tắc xử lý của từng tính năng, có mã F-xx.
- **[Mô tả giao diện 20 màn hình](screens/README.md)** — bố cục, thành phần, hành động, trạng thái của từng màn.
- **[Tình trạng triển khai](status.md)** — phần nào đã làm, đã kiểm tra thế nào, khác gì so với thiết kế. Ảnh chụp màn hình nằm trong [screenshots/](screenshots/).

## Tóm tắt

Mangaka AI là app Android giúp một người tự làm trọn một chương manga trên điện thoại: viết cốt truyện, dựng nhân vật, chia khung, vẽ tranh và xuất file. AI làm trợ lý ở mọi bước, người dùng luôn là người quyết định cuối.

App thay thế hoàn toàn app đọc manga hiện tại. Toàn bộ tính năng đọc truyện, trình duyệt, addon và tải xuống sẽ bị xóa; chỉ giữ lại phần khung kỹ thuật dùng lại được.

Ba điểm khác biệt:

- **Một dòng chảy liền mạch.** Ý tưởng → kịch bản → storyboard → trang vẽ → xuất bản nằm trong cùng một dự án, không phải nhảy giữa 3–4 app.
- **Nhân vật nhất quán.** Mỗi nhân vật có một "hồ sơ hình ảnh" để AI vẽ lại đúng mặt, đúng trang phục ở mọi khung.
- **AI hỗ trợ, không làm thay.** Mọi kết quả AI đều sửa được bằng tay: sửa lời thoại, vẽ đè lên tranh, kéo lại khung.

Phạm vi bản đầu: 20 màn hình, chia 6 nhóm, làm qua một giai đoạn thử nghiệm và 5 giai đoạn xây dựng. Các quyết định cần chốt trước khi code nằm ở phần cuối tài liệu.

## Người dùng mục tiêu

App nhắm vào người có câu chuyện muốn kể nhưng thiếu một trong hai kỹ năng: viết hoặc vẽ.

| Nhóm | Họ có gì | Họ thiếu gì | App giúp gì |
| --- | --- | --- | --- |
| Người viết truyện | Cốt truyện, lời thoại | Không biết vẽ | AI vẽ khung tranh từ mô tả, giữ nhân vật nhất quán |
| Người vẽ nghiệp dư | Nét vẽ, thiết kế nhân vật | Bí ý tưởng, yếu dàn truyện | AI gợi ý cốt truyện, chia cảnh, viết lời thoại |
| Người mới hoàn toàn | Niềm thích manga | Cả hai | Đi theo luồng hướng dẫn, từ một câu ý tưởng ra một trang manga |

Ba vấn đề chung của cả ba nhóm:

- **Quá nhiều công cụ.** Viết ở một app ghi chú, vẽ ở app khác, ghép khung và chèn thoại ở app thứ ba.
- **AI vẽ ảnh không giữ được nhân vật.** Mỗi lần tạo ảnh là một khuôn mặt khác, không ghép thành truyện được.
- **Bỏ dở giữa chừng.** Không có cấu trúc chương, không thấy tiến độ, nên hiếm khi xong được chương đầu.

## Tính năng cốt lõi

App có 4 trụ tính năng, mỗi trụ đều có phần làm tay và phần AI hỗ trợ.

| Trụ | Người dùng làm tay | AI hỗ trợ |
| --- | --- | --- |
| Viết truyện | Soạn ý tưởng, dàn ý, kịch bản theo cảnh, lời thoại | Gợi ý cốt truyện, mở rộng dàn ý, viết tiếp, sửa lời thoại theo tính cách nhân vật |
| Nhân vật & thế giới | Nhập hồ sơ, tính cách, quan hệ, địa danh | Tạo hồ sơ từ vài từ khóa, vẽ bảng thiết kế nhân vật (mặt, toàn thân, biểu cảm) |
| Vẽ & dàn trang | Chia khung, vẽ bằng bút, tẩy, lớp, đặt bong bóng thoại | Chia kịch bản thành storyboard, vẽ khung từ mô tả, biến phác thảo thành nét mực, thêm tone và hiệu ứng |
| Hoàn thiện & xuất bản | Đọc thử, sắp xếp trang, xuất file | Dịch lời thoại, rà lỗi chính tả, nhận xét nhịp truyện |

Nguyên tắc chung cho mọi tính năng AI:

- **Luôn có nút làm lại và nút sửa tay.** Kết quả AI là bản nháp, không tự ghi đè lên công sức người dùng.
- **Hiện rõ chi phí.** Mỗi thao tác AI hiển thị số credit trước khi chạy.
- **Dùng được khi không có AI.** Viết, vẽ tay, dàn trang và xuất file chạy offline; chỉ thao tác AI cần mạng.

## Bản đồ 20 màn hình

Các nhóm A đến E nối nhau theo đúng thứ tự làm truyện. Nhóm F mở được từ thanh tab ở bất kỳ bước nào.

```
A · Khởi đầu  ──▶  B · Trang chủ và dự án  ──▶  C · Viết truyện
                                                      │ kịch bản xong thì sang vẽ
D · Vẽ và dàn trang  ◀────────────────────────────────┘
        │
        ▼
E · Hoàn thiện               F · AI và cá nhân (mở từ thanh tab ở mọi bước)
```

| Nhóm | Màn hình |
| --- | --- |
| A · Khởi đầu | 1. Chào mừng · 2. Đăng nhập · 3. Chọn sở thích |
| B · Trang chủ và dự án | 4. Trang chủ · 5. Thư viện truyện · 6. Tạo truyện mới · 7. Tổng quan truyện |
| C · Viết truyện | 8. Ý tưởng và dàn ý · 9. Soạn kịch bản · 10. Hồ sơ nhân vật · 11. Thế giới và ghi chú |
| D · Vẽ và dàn trang | 12. Storyboard chương · 13. Dàn khung trang · 14. Canvas vẽ · 15. AI tạo ảnh khung · 16. Thoại và hiệu ứng |
| E · Hoàn thiện | 17. Đọc thử · 18. Xuất bản và chia sẻ |
| F · AI và cá nhân | 19. Trợ lý AI · 20. Hồ sơ và cài đặt |

Thanh tab dưới có 5 mục: Trang chủ (4) · Thư viện (5) · Tạo mới (6) · Trợ lý AI (19) · Hồ sơ (20).

## Chi tiết từng màn hình

Mỗi bảng dưới đây là một nhóm màn hình. Cột AI ghi rõ AI làm gì trong màn hình đó; ô trống nghĩa là màn hình không dùng AI.

### A · Khởi đầu

Mục tiêu: người mới vào được dự án đầu tiên trong dưới 2 phút.

| Màn hình | Thành phần chính | AI |
| --- | --- | --- |
| 1. Chào mừng | 3 slide minh họa kiểu trang manga: viết, vẽ, xuất bản. Nút "Bắt đầu" và "Tôi đã có tài khoản" | |
| 2. Đăng nhập | Google, email. Nút "Dùng thử không cần tài khoản", dữ liệu lưu trên máy | |
| 3. Chọn sở thích | Chọn vai trò (viết, vẽ, cả hai), thể loại yêu thích, phong cách vẽ mẫu (shounen, shoujo, seinen, chibi) | Lấy lựa chọn làm mặc định cho gợi ý truyện và phong cách ảnh |

### B · Trang chủ và dự án

Mục tiêu: mở app là thấy ngay việc đang làm dở và quay lại được bằng một chạm.

| Màn hình | Thành phần chính | AI |
| --- | --- | --- |
| 4. Trang chủ | Thẻ "Tiếp tục" dự án gần nhất kèm tiến độ. Ô "Bắt đầu từ một câu". Số credit còn lại. Mẹo trong ngày | Gõ một câu ý tưởng, AI dựng luôn khung dự án: tên, thể loại, logline |
| 5. Thư viện truyện | Lưới bìa truyện. Lọc theo trạng thái (nháp, đang làm, hoàn thành), tìm kiếm, sắp xếp | |
| 6. Tạo truyện mới | 3 bước: thông tin (tên, thể loại), định dạng (trang manga đọc phải sang trái hoặc webtoon cuộn dọc, khổ trang), phong cách vẽ | Gợi ý tên truyện và logline, tạo bìa tạm |
| 7. Tổng quan truyện | Bìa, logline, thanh tiến độ. 4 tab: Chương, Nhân vật, Thế giới, Ghi chú. Nút vào storyboard của từng chương | Tóm tắt truyện đang ở đâu và gợi ý bước tiếp theo |

### C · Viết truyện

Mục tiêu: đi từ một câu ý tưởng đến kịch bản chia cảnh, có nhân vật và bối cảnh rõ ràng.

| Màn hình | Thành phần chính | AI |
| --- | --- | --- |
| 8. Ý tưởng và dàn ý | Bảng thẻ theo hồi và chương, kéo thả để sắp xếp. Mỗi thẻ có tóm tắt và mục tiêu cảnh | Từ logline đề xuất 3 hướng cốt truyện. Mở rộng một thẻ thành các cảnh. Tìm lỗ hổng cốt truyện |
| 9. Soạn kịch bản | Trình soạn theo cảnh: mô tả bối cảnh, hành động, thoại gắn tên nhân vật. Đếm số trang ước tính | Viết tiếp, viết lại đoạn đang chọn, đổi giọng thoại theo tính cách nhân vật, rút gọn thoại cho vừa bong bóng |
| 10. Hồ sơ nhân vật | Ảnh đại diện, tuổi, tính cách, mục tiêu, quan hệ. Bảng thiết kế: mặt, toàn thân, 6 biểu cảm | Tạo hồ sơ từ vài từ khóa. Vẽ bảng thiết kế. Khóa ảnh tham chiếu để mọi khung sau vẽ đúng nhân vật |
| 11. Thế giới và ghi chú | Mục wiki: địa danh, phe phái, thuật ngữ, dòng thời gian. Đính kèm ảnh tham khảo | Sinh mô tả bối cảnh. Vẽ ảnh concept cho địa danh. Kiểm tra mâu thuẫn với kịch bản |

### D · Vẽ và dàn trang

Mục tiêu: biến kịch bản thành trang manga hoàn chỉnh, có khung, tranh, thoại và hiệu ứng.

| Màn hình | Thành phần chính | AI |
| --- | --- | --- |
| 12. Storyboard chương | Lưới thumbnail các trang. Mỗi trang hiện bố cục khung và trạng thái (trống, phác, xong). Kéo thả đổi thứ tự | Chia kịch bản chương thành trang và khung, đề xuất góc máy cho từng khung |
| 13. Dàn khung trang | Thư viện mẫu khung (4 khung, khung chéo, khung tràn lề). Kéo cạnh để chỉnh, cắt hoặc gộp khung, chỉnh độ rộng rãnh | Gợi ý bố cục theo nhịp cảnh: hành động nhanh dùng nhiều khung nhỏ, cao trào dùng một khung lớn |
| 14. Canvas vẽ | Bút G-pen, bút chì, tẩy, đổ màu. Lớp, hoàn tác, phóng to bằng hai ngón, ảnh tham chiếu nổi | Biến phác thảo thành nét mực. Tô screentone tự động. Xóa và vẽ lại một vùng |
| 15. AI tạo ảnh khung | Ô mô tả cảnh. Chọn nhân vật có trong khung, góc máy, biểu cảm, phong cách. Hiện 4 phương án để chọn | Tạo ảnh từ mô tả, giữ nhân vật theo ảnh tham chiếu, tạo biến thể của phương án đã chọn |
| 16. Thoại và hiệu ứng | Bong bóng thoại (nói, nghĩ, hét, lời dẫn), đuôi bong bóng kéo được. Chữ SFX, đường tốc độ, screentone | Tự đặt thoại từ kịch bản vào khung. Gợi ý SFX. Dịch thoại sang ngôn ngữ khác |

### E · Hoàn thiện

Mục tiêu: đọc lại như một độc giả rồi đưa truyện ra khỏi app.

| Màn hình | Thành phần chính | AI |
| --- | --- | --- |
| 17. Đọc thử | Đọc toàn màn hình: lật trang phải sang trái hoặc cuộn dọc. Đánh dấu trang cần sửa | Nhận xét nhịp truyện và chỗ thoại quá dài |
| 18. Xuất bản và chia sẻ | Chọn chương, định dạng (PNG, PDF, CBZ, ảnh dài webtoon), chất lượng. Chia sẻ qua app khác | Tạo ảnh bìa chương và đoạn giới thiệu ngắn |

### F · AI và cá nhân

Mục tiêu: có một trợ lý hiểu cả bộ truyện, và một nơi quản lý tài khoản, credit, dữ liệu.

| Màn hình | Thành phần chính | AI |
| --- | --- | --- |
| 19. Trợ lý AI | Khung chat biết toàn bộ truyện đang mở. Gợi ý câu hỏi nhanh. Chèn câu trả lời vào kịch bản hoặc ghi chú | Hỏi đáp về cốt truyện và nhân vật, động não, giải thích kỹ thuật vẽ manga |
| 20. Hồ sơ và cài đặt | Tài khoản, gói và credit, giao diện sáng hoặc tối, ngôn ngữ, sao lưu và khôi phục, chống chụp màn hình | Lịch sử dùng credit theo từng loại thao tác |

Các bảng phụ như bảng lớp, chọn màu, chọn phông chữ và mua credit là bottom sheet nằm trong màn hình cha, không tính vào 20 màn hình.

## Luồng người dùng chính

Luồng quan trọng nhất là từ một câu ý tưởng đến một chương manga xuất được file. Mọi quyết định thiết kế ưu tiên cho luồng này chạy mượt.

1. **Nhập ý tưởng** ở Trang chủ (4): gõ một câu, ví dụ "cậu bé giao hàng phát hiện mình nghe được tiếng nói của đồ vật".
2. **Chốt khung truyện** ở Tạo truyện mới (6): AI đề xuất tên, thể loại, logline; người dùng chọn định dạng và phong cách vẽ.
3. **Dựng dàn ý** ở Ý tưởng và dàn ý (8): chọn 1 trong 3 hướng cốt truyện, sắp xếp thẻ chương.
4. **Tạo nhân vật** ở Hồ sơ nhân vật (10): AI vẽ bảng thiết kế, người dùng khóa ảnh tham chiếu.
5. **Viết kịch bản chương 1** ở Soạn kịch bản (9): viết tay hoặc nhờ AI viết tiếp từng cảnh.
6. **Chia trang** ở Storyboard chương (12): AI chia kịch bản thành trang và khung; người dùng chỉnh bố cục ở Dàn khung trang (13).
7. **Làm tranh từng khung**: tạo bằng AI tạo ảnh khung (15), hoặc tự vẽ trên Canvas vẽ (14), hoặc kết hợp cả hai.
8. **Đặt thoại và hiệu ứng** ở Thoại và hiệu ứng (16): thoại tự đổ từ kịch bản vào khung, người dùng chỉnh vị trí.
9. **Đọc thử** ở Đọc thử (17): đánh dấu trang cần sửa, quay lại bước 7 hoặc 8 nếu cần.
10. **Xuất file** ở Xuất bản và chia sẻ (18).

Mục tiêu đo được cho bản đầu: người mới đi hết luồng này với một chương 4 trang trong dưới 30 phút. Con số này là đề xuất, cần kiểm chứng bằng thử nghiệm thật.

Trợ lý AI (19) mở được ở mọi bước qua nút nổi, không làm gián đoạn luồng.

## Phong cách thiết kế

Hướng thiết kế đề xuất là "Mực và Giấy": giao diện trông như một trang manga, nền giấy ngà, nét mực đen dứt khoát, một màu đỏ son làm điểm nhấn. Mọi thứ thuộc về AI dùng riêng một màu tím để người dùng nhận ra ngay.

### Màu

| Vai trò | Giao diện sáng | Giao diện tối | Dùng cho |
| --- | --- | --- | --- |
| Nền | `#FAF7F2` giấy ngà | `#121214` | Nền màn hình |
| Bề mặt | `#FFFFFF` | `#1C1C20` | Thẻ, sheet, thanh công cụ |
| Mực | `#16161A` | `#F2EFEA` | Chữ chính, viền khung |
| Chữ phụ | `#6B6660` | `#A09B94` | Mô tả, nhãn phụ |
| Nhấn chính | `#E5383B` đỏ son | `#FF5A5F` | Nút chính, tab đang chọn, tiến độ |
| Nhấn AI | `#6C4CF1` tím | `#9C87FF` | Nút và kết quả của AI, credit |
| Thành công | `#2E9E6B` | `#4CC38A` | Trang đã xong, lưu thành công |

### Chữ

| Vai trò | Phông đề xuất | Ghi chú |
| --- | --- | --- |
| Tiêu đề | Anton | Đậm, hẹp, giống chữ bìa manga |
| Giao diện và nội dung | Be Vietnam Pro | Dễ đọc, hỗ trợ đủ dấu tiếng Việt |
| Lời thoại trong truyện | Patrick Hand | Kiểu chữ viết tay, đã có sẵn trong dự án |

Cần kiểm tra dấu tiếng Việt của Anton trên máy thật trước khi chốt.

### Thành phần

- **Thẻ kiểu khung truyện.** Viền mực 2dp, bo góc 12dp, bóng cứng lệch 4dp thay cho bóng mờ.
- **Nút AI.** Nền tím, biểu tượng tia sáng, luôn kèm số credit sẽ tốn.
- **Bong bóng thoại.** Dùng cho tooltip, trạng thái trống và lời nhắc của trợ lý AI.
- **Họa tiết halftone.** Chấm tram nhẹ ở phần đầu màn hình và thẻ nổi bật, không đặt dưới chữ dài.
- **Thanh tab 5 mục.** Nút Tạo mới nổi ở giữa, màu đỏ son.
- **Màn hình vẽ.** Canvas tràn màn hình, thanh công cụ tối ở cả hai giao diện để tranh nổi bật.

### Chuyển động

- Chuyển màn hình kiểu lật trang, 250ms.
- Khi AI đang tạo: hiệu ứng đường tốc độ (speed lines) chạy trong khung chờ, kèm nút hủy.
- Rung nhẹ khi kéo thả thẻ, cắt khung và hoàn thành một trang.

Quy tắc nền: lưới 8dp, vùng chạm tối thiểu 48dp, độ tương phản chữ từ 4,5:1 trở lên.

## Tích hợp AI

App cần hai loại AI: model văn bản cho phần viết và model tạo ảnh cho phần vẽ. Phần văn bản đề xuất dùng Claude; phần tạo ảnh chưa chốt nhà cung cấp vì Claude không tạo ảnh.

### Tác vụ và model

| Tác vụ | Model đề xuất | Ghi chú |
| --- | --- | --- |
| Viết tiếp, viết lại, lời thoại | Claude Sonnet 5.5 | Trả kết quả dạng streaming để chữ hiện dần |
| Gợi ý nhanh: tên truyện, SFX, rút gọn thoại, dịch | Claude Haiku 4.5 | Nhanh và rẻ, dùng cho thao tác lặp lại nhiều |
| Chia kịch bản thành trang và khung | Claude Sonnet 5.5 | Trả JSON theo schema cố định để đổ thẳng vào storyboard |
| Phân tích cả truyện: lỗ hổng cốt truyện, nhịp, mâu thuẫn | Claude Opus 5.5 | Chạy theo yêu cầu, tốn nhiều credit hơn |
| Trợ lý AI dạng chat | Claude Sonnet 5.5 | Dùng prompt caching cho phần hồ sơ truyện để giảm chi phí |
| Nhận xét trang đã vẽ | Claude Sonnet 5.5 | Gửi ảnh trang, model đọc ảnh và nhận xét bố cục, thoại |
| Tạo ảnh khung, bảng thiết kế nhân vật, bìa | Model tạo ảnh, chưa chốt | Phải nhận được ảnh tham chiếu nhân vật |
| Phác thảo thành nét mực, vẽ lại một vùng | Model ảnh sang ảnh, chưa chốt | Cần image-to-image và inpainting |

Tiêu chí chọn model tạo ảnh: nhận ảnh tham chiếu, có image-to-image và inpainting, vẽ tốt phong cách manga đen trắng, giá mỗi ảnh, và chính sách nội dung. Hai hướng cần khảo sát: thuê API ảnh thương mại, hoặc tự host model mã nguồn mở.

### Giữ nhân vật nhất quán

Đây là rủi ro kỹ thuật lớn nhất của sản phẩm. Cách làm đề xuất gồm 3 lớp:

1. **Ảnh tham chiếu.** Mỗi nhân vật có bảng thiết kế đã khóa; mọi lần tạo khung có nhân vật đó đều gửi kèm ảnh này.
2. **Mô tả cố định.** App tự ghép đoạn mô tả ngoại hình của nhân vật vào prompt, người dùng chỉ mô tả cảnh.
3. **Phong cách theo dự án.** Mỗi truyện dùng một bộ thiết lập phong cách duy nhất cho mọi ảnh.

### Hồ sơ truyện cho model văn bản

Mọi lời gọi AI văn bản đều kèm "hồ sơ truyện": logline, dàn ý, danh sách nhân vật, thuật ngữ thế giới và tóm tắt các chương đã viết. Nhờ vậy AI viết đúng giọng nhân vật và không mâu thuẫn với phần trước.

### Máy chủ trung gian và credit

App không gọi thẳng nhà cung cấp AI. Khóa API nằm trên một máy chủ trung gian, nơi cũng trừ credit và kiểm duyệt nội dung. Để khóa API trong app là lộ khóa.

Credit chia 3 mức: nhẹ (gợi ý nhanh), vừa (viết và chat), nặng (tạo ảnh, phân tích cả truyện). Giá cụ thể tính sau khi chốt model tạo ảnh.

### An toàn nội dung

- Kiểm duyệt cả prompt lẫn kết quả ở máy chủ trung gian.
- Chặn tuyệt đối nội dung tình dục liên quan đến trẻ vị thành niên và ảnh giả người thật.
- Phong cách vẽ chọn từ bộ mẫu chung của app, không cho nhập "vẽ theo phong cách của" một họa sĩ cụ thể.
- File xuất ra ghi chú phần nào do AI tạo trong metadata.

## Kiến trúc kỹ thuật

App tiếp tục dùng nền React Native 0.87 hiện có, thêm một engine vẽ và một máy chủ trung gian cho AI. Dữ liệu truyện lưu trên máy trước, đồng bộ đám mây để sau.

### Công nghệ

| Phần | Lựa chọn | Tình trạng |
| --- | --- | --- |
| Điều hướng | React Navigation: bottom tabs và native stack | Đã có |
| Trạng thái và cài đặt | Zustand, lưu bằng MMKV | Đã có |
| Danh sách lớn | FlashList | Đã có |
| File ảnh và xuất file | react-native-fs, documents picker | Đã có |
| Canvas vẽ, dàn khung, xuất ảnh trang | React Native Skia | Thêm mới |
| Cử chỉ vẽ, kéo thả, phóng to | Gesture Handler và Reanimated | Thêm mới |
| Dữ liệu truyện có cấu trúc | SQLite trên máy | Thêm mới |
| Lớp gọi AI | Module `src/ai` gọi máy chủ trung gian, hỗ trợ streaming | Thêm mới |
| Máy chủ trung gian | Dịch vụ nhỏ giữ khóa API, trừ credit, kiểm duyệt | Thêm mới, chưa chốt nền tảng |

### Thư viện cho phần vẽ

Phiên bản kiểm tra trên npm ngày 2026-10-06. Dự án đang chạy React Native 0.87.1, React 19.2, New Architecture bật.

| Việc | Thư viện | Phiên bản | Ghi chú |
| --- | --- | --- | --- |
| Engine vẽ: nét bút, lớp, khung, bong bóng, xuất ảnh | `@shopify/react-native-skia` | 2.14.0 | Yêu cầu RN ≥ 0.78, React ≥ 19, kèm reanimated ≥ 4 và worklets |
| Cử chỉ: vẽ một ngón, phóng to và xoay hai ngón | `react-native-gesture-handler` | 3.3.0 | |
| Chạy cử chỉ và hoạt ảnh trên luồng giao diện | `react-native-reanimated` + `react-native-worklets` | 4.7.1 + 0.13.0 | Hỗ trợ RN 0.86–0.88 |
| Nét bút đậm nhạt kiểu G-pen | `perfect-freehand` | 1.2.3 | JS thuần, tính đường viền nét từ các điểm chạm |
| Đóng gói CBZ, ZIP, file `.mangaka` | `react-native-zip-archive` | 9.5.2 | |
| Xuất PDF | `pdf-lib` | 1.17.1 | JS thuần, không cập nhật từ 2022; cần thử với file nhiều trang |
| Chọn ảnh tham chiếu từ máy | `react-native-image-picker` | 8.2.1 | |
| Dữ liệu truyện | `@op-engineering/op-sqlite` | 18.2.5 | |

Không dùng: `@benjeau/react-native-draw` và `rn-perfect-sketch-canvas` (cả hai không cập nhật từ 2022), `@sourcetoad/react-native-sketch-canvas` (không có lớp, không phóng to, không tùy biến nét).

### Cấu trúc thư mục

```
src/
  app/         điều hướng, khởi động
  features/    mỗi màn hình một thư mục: onboarding, home, library, project,
               outline, script, characters, world, storyboard, panels,
               canvas, generate, lettering, preview, export, assistant, settings
  ai/          client, prompt, hồ sơ truyện
  db/          schema và truy vấn SQLite
  store/       trạng thái giao diện và cài đặt
  components/  thành phần dùng chung
  theme/       màu, chữ, khoảng cách
  lib/         tiện ích
```

### Mô hình dữ liệu

| Thực thể | Trường chính | Thuộc về |
| --- | --- | --- |
| Project | tên, thể loại, logline, định dạng, hướng đọc, khổ trang, phong cách, bìa | |
| Chapter | số thứ tự, tên, trạng thái, tóm tắt | Project |
| Scene | số thứ tự, bối cảnh, các khối hành động và thoại | Chapter |
| Character | tên, hồ sơ, mô tả ngoại hình, ảnh tham chiếu | Project |
| WorldEntry | loại, tiêu đề, nội dung, ảnh | Project |
| Page | số thứ tự, bố cục khung, trạng thái | Chapter |
| Panel | hình dạng, cảnh liên kết, các lớp ảnh, prompt đã dùng | Page |
| Bubble | kiểu, nội dung, vị trí, phông chữ | Page |
| AiJob | loại, trạng thái, credit, đầu vào, kết quả | Project |

Ảnh lớp và ảnh AI lưu thành file PNG trong thư mục của app; SQLite chỉ giữ đường dẫn. Mỗi dự án xuất được thành một file nén để sao lưu.

## Kế hoạch dọn code cũ

Chưa có gì bị xóa. Việc xóa chỉ bắt đầu sau khi tài liệu này được duyệt, làm trên nhánh `feature/first-version`; nhánh `main` vẫn giữ nguyên app đọc truyện để quay lại khi cần.

| Khu vực | Xóa | Giữ lại |
| --- | --- | --- |
| Nguồn truyện | Toàn bộ `addons/` (10 nguồn), `src/addons/`, `src/sources/` | |
| Màn hình | Toàn bộ `src/features/`: reader, catalog, addons, library, browser, detail, novel, history, downloads, stats, verify | Ý tưởng bố cục của màn Cài đặt, viết lại theo thiết kế mới |
| Trạng thái | `src/store/`: useStats, useHistory, useReaderSettings, progress, useDownloads, useBrowser, useSources, useFiles, useAdblock, useLibrary | `useSettings`, rút gọn còn giao diện, ngôn ngữ, chống chụp màn hình |
| Thành phần | MangaCard, WebView, AddressBarParts, SideTabs, Favicon | `ui.tsx`, Sheet, Dropdown, icons, ErrorView, đổi sang phong cách mới |
| Tiện ích | `src/lib/`: http, adblock, url, sha256, base64 | storage, id, time, format, async, screen |
| Native Android | `NativeLibraryTasksModule.kt`, `UpdateCheckWorker.kt`, `specs/NativeLibraryTasks.ts` | `NativeScreenModule.kt` (xoay màn hình, chống chụp), `MainActivity`, `MainApplication` |
| Thư viện | react-native-webview, cheerio, cookie-manager, camera-kit, react-native-speech | React Navigation, Zustand, MMKV, FlashList, react-native-svg, react-native-fs, documents picker |
| Khác | `cookie-manga-extracted/`, `screenshots/` cũ, test của các nguồn truyện. Các file docs cũ (`docs/cookie-manga-*`, `docs/rn-engine-test.csv`) đã xóa ngày 2026-10-06 | Cấu hình build, GitHub Actions build Android, `src/theme/` (đổi bảng màu) |

Trước khi xóa sẽ gắn tag `legacy-reader` vào commit hiện tại để luôn tìm lại được bản cũ.

## Lộ trình triển khai

Giai đoạn 0 quyết định phần AI vẽ có khả thi không, nên làm trước và làm ngắn. Sau đó là 5 giai đoạn xây dựng, mỗi giai đoạn kết thúc bằng một bản chạy được trên máy thật.

| Giai đoạn | Nội dung | Xong khi |
| --- | --- | --- |
| 0 · Thử nghiệm kỹ thuật | Thử model ảnh giữ nhân vật. Thử canvas Skia trên máy thật | Chốt được model ảnh |
| 1 · Nền móng | Dọn code cũ, giao diện mới, dữ liệu, màn hình 1 đến 7 | Tạo và mở được truyện |
| 2 · Viết truyện | Màn hình 8 đến 11 và 19. AI văn bản, hồ sơ truyện | Viết xong 1 chương |
| 3 · Vẽ và dàn trang | Màn hình 12, 13, 14, 16. Khung, canvas, thoại | Vẽ tay xong 1 trang |
| 4 · AI tạo ảnh | Màn hình 15, AI đi nét mực, credit và kiểm duyệt | AI vẽ được 1 chương |
| 5 · Hoàn thiện | Màn hình 17, 18, 20. Thử nghiệm, đưa lên Play Store | Phát hành bản đầu |

**Cập nhật 2026-10-06:** phần AI được lùi lại. Thứ tự làm thực tế là giai đoạn 1 → 2 → 3 → 5 với các tính năng làm tay; phần thử model ảnh của giai đoạn 0, AI văn bản của giai đoạn 2 và toàn bộ giai đoạn 4 làm sau. Giai đoạn 0 chỉ còn việc thử canvas Skia trên máy thật. Các nút AI trong giao diện để ẩn cho tới khi có AI.

Nếu giai đoạn 0 cho thấy chưa model nào giữ được nhân vật, giai đoạn 1 đến 3 vẫn làm được vì không phụ thuộc AI tạo ảnh; chỉ giai đoạn 4 phải thu hẹp. Thời lượng từng giai đoạn chưa ước tính vì phụ thuộc số người làm.

## Rủi ro và câu hỏi mở

Rủi ro lớn nhất là AI không giữ được nhân vật giữa các khung; nếu không giải được thì phần vẽ bằng AI mất giá trị. Vì vậy giai đoạn 0 dành riêng để thử kỹ thuật này trước khi làm giao diện.

| Rủi ro | Hậu quả | Cách giảm |
| --- | --- | --- |
| Nhân vật không nhất quán giữa các khung | Truyện không đọc được | Thử 2–3 model ảnh với cùng một nhân vật ở giai đoạn 0 |
| Chi phí tạo ảnh cao | Lỗ nếu cho dùng miễn phí nhiều | Credit, giới hạn lượt miễn phí, lưu lại kết quả đã tạo |
| Vẽ bằng ngón tay trên điện thoại khó và dễ giật | Người dùng bỏ phần vẽ tay | Giới hạn kích thước canvas và số lớp, ưu tiên luồng phác thảo rồi để AI đi nét |
| Chính sách Google Play với nội dung do AI tạo | App bị gỡ | Kiểm duyệt ở máy chủ, nút báo cáo nội dung, điều khoản sử dụng rõ ràng |
| Phạm vi 20 màn hình lớn | Kéo dài, không ra được bản dùng thử | Làm theo giai đoạn, sau giai đoạn 2 đã có bản viết truyện dùng được |

### Đã chốt

- [x] **Tên app:** Mangaka AI.
- [x] **Package:** giữ nguyên `com.manga.reader.viewer.pro`.
- [x] **Thứ tự làm:** làm phần viết tay, vẽ tay, dàn trang và xuất file trước. Phần AI làm sau, chưa cần vội.

### Có thể quyết sau

- [ ] **Model tạo ảnh:** thuê API thương mại hay tự host model mã nguồn mở?
- [ ] **Máy chủ trung gian:** dựng trên Firebase, Supabase hay máy chủ riêng?
- [ ] Thu phí theo gói tháng, bán credit lẻ, hay cả hai? Mỗi ngày miễn phí bao nhiêu lượt?
- [ ] Bắt buộc đăng nhập, hay cho dùng không tài khoản với dữ liệu lưu trên máy?
- [ ] Bản đầu chỉ Android, hay làm cả iOS?
- [ ] Giao diện chỉ tiếng Việt, hay thêm tiếng Anh ngay từ đầu?
