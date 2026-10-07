# Mangaka AI — Tình trạng triển khai

Cập nhật: 2026-10-06 · nhánh `feature/first-version`

Bản hiện tại gồm toàn bộ phần làm tay của app: viết kịch bản, nhân vật, chia khung, vẽ, đặt thoại, đọc thử, xuất file. Phần AI bằng chữ đã làm gần đủ theo tài liệu (xem mục "Tính năng AI"); AI tạo ảnh, tài khoản và credit chưa làm. Giao diện bằng tiếng Anh.

Ảnh chụp màn hình khi test không nằm trong repo, xem mục "Ảnh chụp khi test" trong [README](../README.md).

## Đã kiểm tra thế nào

| Kiểm tra | Kết quả |
| --- | --- |
| `npx tsc --noEmit` | Không lỗi |
| `npm run lint` | Không lỗi |
| `npm test` | 164 test qua (chia khung, chia trang, kho dữ liệu, file dự án, sắp xếp kéo thả, công cụ kịch bản, phép biến đổi nét vẽ, bản ngôn ngữ, ghép trang đôi); 1 test sinh truyện mẫu cho ảnh Google Play chỉ chạy khi đặt `SEED_OUT` |
| Build Android debug (`./gradlew assembleDebug`) | Thành công |
| Chạy trên máy ảo Android 14 (Pixel 6, API 34) | Đi trọn luồng: tạo truyện → kịch bản → tự chia trang → chỉnh khung → vẽ → đặt thoại → đọc thử → xuất file |
| Xuất file trên máy ảo | PDF, ZIP ảnh PNG, CBZ, ảnh dài và file `.mangaka` đều tạo ra file đúng |
| Tính năng đợt 2 trên máy ảo | Đã thử từng mục trong bảng "Tính năng thêm ở đợt 2" bên dưới, trừ những mục ghi "chưa thử" |

Chưa kiểm tra: máy thật, bản release, iOS, bút cảm ứng, truyện rất dài (hàng trăm trang), và thao tác **nhập** file `.mangaka` trên máy (phần đổi id khi nhập có test tự động). Máy ảo không giả lập được chụm hai ngón, lực nhấn bút và rung, nên ba thứ này cũng chưa thử.

## Màn hình

| # | Màn hình | Tình trạng | Ghi chú |
| --- | --- | --- | --- |
| 1 | Chào mừng | Xong | 3 slide, minh họa vẽ bằng SVG |
| 2 | Đăng nhập | Bỏ | Vào thẳng như khách, không hỏi tên; bút danh đặt trong Hồ sơ. Truyện lưu trên máy |
| 3 | Chọn sở thích | Xong | Vai trò, thể loại, nét vẽ |
| 4 | Trang chủ | Xong, không AI | Ô ý tưởng chỉ điền sẵn logline cho truyện mới |
| 5 | Thư viện truyện | Xong | Có nhân bản truyện và nút Hoàn tác sau khi xóa |
| 6 | Tạo truyện mới | Xong, không AI | 3 bước |
| 7 | Tổng quan truyện | Xong | "Bước tiếp theo" tính theo quy tắc từ dữ liệu |
| 8 | Dàn ý | Xong | Kéo thả chương trong hồi và sang hồi khác; menu vẫn dùng được |
| 9 | Soạn kịch bản | Xong | Tìm và thay thế, thống kê, chia sẻ kịch bản dạng văn bản, chuyển khối sang cảnh khác |
| 10 | Hồ sơ nhân vật | Xong, trừ AI vẽ bảng thiết kế | Bảng thiết kế dùng ảnh tải từ máy |
| 11 | Thế giới và ghi chú | Xong, trừ AI vẽ ảnh concept | Nội dung là văn bản thuần |
| 12 | Storyboard | Xong | Tự chia trang theo quy tắc (không AI); kéo thả trang ở chế độ lưới, chế độ danh sách dùng menu |
| 13 | Dàn khung trang | Xong | Mẫu khung, kéo đường chia, cắt chéo, gộp, rãnh, thứ tự đọc |
| 14 | Canvas vẽ | Xong phần chính | G-pen, bút chì, bút lông, tẩy, lấy màu, lớp, hoàn tác, vẽ hình (đường thẳng, chữ nhật, elip), tô vùng khoanh tay, screentone, di chuyển và co giãn lớp. Chưa có chọn một phần lớp |
| 15 | AI tạo ảnh khung | Chưa làm | Chờ phần AI |
| 16 | Thoại và hiệu ứng | Xong | 5 kiểu bong bóng, lời dẫn, SFX, 5 hiệu ứng; tự đặt thoại theo quy tắc; bản ngôn ngữ nhập tay hoặc dịch bằng AI |
| 17 | Đọc thử | Xong | Phóng to (chạm đôi, chụm), trang đôi khi xoay ngang, chọn bản ngôn ngữ |
| 18 | Xuất bản | Xong | PDF, PNG (ZIP), CBZ, ảnh dài; chọn bản ngôn ngữ; rời màn hình khi đang xuất thì hủy |
| 19 | Trợ lý AI | Xong | Tab thứ tư; chat theo ngữ cảnh truyện, lưu hội thoại, lưu câu trả lời thành ghi chú |
| 20 | Hồ sơ và cài đặt | Xong, không credit | Thùng rác, nhập dự án, chủ đề, tay thuận |

## Tính năng thêm ở đợt 2

| # | Tính năng | Ở đâu | Đã thử trên máy ảo |
| --- | --- | --- | --- |
| 1 | Nhân bản truyện (cả kịch bản, trang, tranh, ảnh) | Thư viện: nhấn giữ truyện; Tổng quan truyện: menu | Có |
| 2 | Hoàn tác sau khi xóa truyện (thanh thông báo có nút Undo) | Thư viện, Tổng quan truyện, Thùng rác | Có |
| 3 | Rung phản hồi ở công tắc, chip, nút nổi, menu | Thành phần dùng chung | Chưa thử (máy ảo không rung) |
| 4 | Kéo thả để sắp xếp trang | Storyboard, chế độ lưới | Có |
| 5 | Kéo thả để sắp xếp chương, kể cả sang hồi khác | Dàn ý | Có |
| 6 | Tìm và thay thế trong kịch bản, Thay tất cả hoàn tác được | Soạn kịch bản: menu | Có |
| 7 | Thống kê kịch bản và chia sẻ kịch bản dạng `.txt` | Soạn kịch bản: menu | Có |
| 8 | Chuyển khối sang cảnh khác | Soạn kịch bản: thanh công cụ | Chưa thử trên máy |
| 9 | Vẽ hình: đường thẳng, chữ nhật, elip | Canvas | Có |
| 10 | Tô vùng khoanh tay và screentone 10/25/40/60% | Canvas | Có, kể cả trong ảnh xuất ra |
| 11 | Di chuyển và co giãn nội dung lớp | Canvas | Có (kéo và kéo góc); chụm hai ngón chưa thử |
| 12 | Ghi lực nhấn bút cảm ứng | Canvas | Chưa thử (cần máy có bút) |
| 13 | Phóng to khi đọc thử | Đọc thử | Chạm đôi và kéo: có; chụm hai ngón: chưa thử |
| 14 | Trang đôi khi xoay ngang | Đọc thử | Có |
| 15 | Bản ngôn ngữ cho thoại (nhập tay), danh sách dịch nhanh | Thoại và hiệu ứng | Có |
| 16 | Xuất file và đọc thử theo bản ngôn ngữ | Xuất bản, Đọc thử | Có (PNG) |

Sửa kèm theo trong đợt này: Enter trong kịch bản không còn để lại dòng trống và sau khối Bối cảnh sẽ tạo khối Hành động; tên chương mặc định hiện theo vị trí sau khi đổi thứ tự.

## Tính năng AI

App gọi AI qua một server tương thích API của OpenAI (`/v1/chat/completions`) do người dùng tự chạy; địa chỉ server nhập ở Profile → AI server. Chưa nhập thì các nút AI chỉ hiện lời nhắc cài đặt. Mọi kết quả AI đều là bản xem trước: người dùng bấm chấp nhận thì mới ghi vào truyện, và lúc đang chờ luôn hủy được.

| Tính năng | Ở đâu | Đã thử trên máy ảo với AI thật |
| --- | --- | --- |
| Cài địa chỉ server, model, API key; nút thử kết nối | Profile → AI server | Có |
| Từ một câu ý tưởng, AI điền tên truyện, thể loại, tóm tắt | Trang chủ: "Shape with AI"; Tạo truyện: "Suggest with AI" | Có |
| 3 hướng cốt truyện, mỗi hướng có chương theo từng hồi; chọn thêm vào sau hoặc thay chương cũ | Dàn ý: "AI plot ideas" | Có, gồm cả Undo sau khi thêm |
| Chia một chương thành 3–6 cảnh và thêm vào kịch bản | Dàn ý: menu chương → "Break into scenes (AI)" | Có |
| Viết tiếp 3–5 khối, viết lại khối hoặc cả cảnh theo chỉ dẫn, đổi giọng theo nhân vật, rút gọn thoại, gợi ý SFX | Soạn kịch bản: nút "AI" trên thanh bàn phím, menu, link "Shorten with AI" dưới thoại dài | Viết tiếp, rút gọn, SFX: có. Viết lại, đổi giọng: thử qua test tự động với AI thật |
| Điền hồ sơ nhân vật từ vài từ khóa (chỉ điền ô trống hoặc thay hết) | Hồ sơ nhân vật: "Fill with AI" | Có |
| Viết nội dung mục wiki từ tiêu đề (thay hoặc nối thêm) | Mục thế giới: "Write with AI" | Có |
| Tìm lỗ hổng cốt truyện, mở thẳng chương liên quan | Dàn ý: menu → "Find plot holes (AI)" | Có |
| Dịch thoại sang bản ngôn ngữ, xem trước và sửa trước khi áp dụng | Thoại: danh sách dịch → "Translate missing with AI" | Có |
| Trợ lý chat biết truyện đang mở, gợi ý câu hỏi theo màn, lưu hội thoại, lưu câu trả lời thành ghi chú | Tab Assistant | Có |
| Báo lỗi khi không gọi được server, nút Retry, nút Cancel khi đang chờ | Mọi chỗ trên | Có |

Lúc thử dùng [gemini-web2api](https://github.com/Sophomoresty/gemini-web2api) chạy trên máy tính ở chế độ không đăng nhập (model `gemini-3.6-flash`): mỗi lần gọi mất 3–13 giây. Khoảng một phần ba câu trả lời dài bị lỗi JSON nhẹ, nên app tự sửa JSON và tự gọi lại tối đa 3 lần; sau khi thêm bước này 14/14 lần thử đều ra kết quả.

Giới hạn:

- Server đó là công cụ không chính thức, chỉ nên dùng khi phát triển. Nó không tạo được ảnh; mọi tính năng AI về ảnh chưa làm.
- Bản release của Android chặn kết nối `http://` thường, nên server phải có `https` hoặc phải đổi cấu hình mạng trước khi phát hành.
- Nội dung do AI tạo không còn dấu AI sau khi đã chấp nhận (dữ liệu chưa có trường đánh dấu).
- Nút Copy trong trợ lý mở bảng chia sẻ của Android vì app chưa có module clipboard.
- Chưa có: AI chia kịch bản thành trang (đang dùng quy tắc), AI nhận xét chương khi đọc thử, mọi tính năng AI về ảnh.

## Khác với tài liệu thiết kế

- **Giao diện tiếng Anh.** Tài liệu mô tả bằng tiếng Việt, app hiển thị tiếng Anh. Chưa có lựa chọn ngôn ngữ.
- **Lưu dữ liệu bằng MMKV thay cho SQLite.** Truyện nằm trong một store Zustand ghi xuống MMKV; tranh từng khung lưu riêng theo id khung. Đủ nhanh cho quy mô hiện tại và bớt một thư viện native.
- **Tranh là nét vẽ vector, không phải ảnh điểm.** Mỗi lớp là danh sách nét; nhờ vậy xuất ở độ phân giải nào cũng nét. Vì thế công cụ đổ màu là "khoanh vùng rồi tô" chứ không phải thùng sơn loang theo điểm ảnh.
- **Hai tính năng "tự động" không dùng AI:** tự chia kịch bản thành trang và khung, tự đặt bong bóng thoại vào khung. Cả hai chạy theo quy tắc cố định.
- **Phông chữ giao diện là phông hệ thống**, tiêu đề dùng Anton. Be Vietnam Pro và Patrick Hand dùng cho chữ trong trang truyện.
- **Bản ngôn ngữ nhập tay.** Tài liệu mô tả AI dịch thoại; hiện người dùng tự gõ bản dịch, chữ tự thu nhỏ cho vừa bong bóng.
- **Kéo thả ở Dàn ý hiện vạch đỏ chỉ chỗ thả**, các thẻ khác không dịch chuyển theo.

## Việc nên làm tiếp

1. Thử trên máy thật: cảm giác vẽ, chụm hai ngón (canvas, đọc thử, co giãn lớp), bút cảm ứng và rung.
2. Thử nhập file `.mangaka` trên máy và thử với truyện nhiều trang.
3. Canvas: chọn và di chuyển một phần lớp, xoay lớp.
4. Kéo thả ở chế độ danh sách của Storyboard và kéo thả khối trong kịch bản.
5. Phần AI (màn 15, 19 và các nút AI trong những màn còn lại), cần chốt model tạo ảnh và máy chủ trung gian trước.
