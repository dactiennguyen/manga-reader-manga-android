# Mangaka AI — Tình trạng triển khai

Cập nhật: 2026-10-06 · nhánh `feature/first-version`

Bản hiện tại gồm toàn bộ phần làm tay của app: viết kịch bản, nhân vật, chia khung, vẽ, đặt thoại, đọc thử, xuất file. Phần AI, tài khoản và credit chưa làm. Giao diện bằng tiếng Anh.

Ảnh chụp màn hình khi test không nằm trong repo, xem mục "Ảnh chụp khi test" trong [README](../README.md).

## Đã kiểm tra thế nào

| Kiểm tra | Kết quả |
| --- | --- |
| `npx tsc --noEmit` | Không lỗi |
| `npm run lint` | Không lỗi |
| `npm test` | 106 test qua (chia khung, chia trang, kho dữ liệu, file dự án, sắp xếp kéo thả, công cụ kịch bản, phép biến đổi nét vẽ, bản ngôn ngữ, ghép trang đôi) |
| Build Android debug (`./gradlew assembleDebug`) | Thành công |
| Chạy trên máy ảo Android 14 (Pixel 6, API 34) | Đi trọn luồng: tạo truyện → kịch bản → tự chia trang → chỉnh khung → vẽ → đặt thoại → đọc thử → xuất file |
| Xuất file trên máy ảo | PDF, ZIP ảnh PNG, CBZ, ảnh dài và file `.mangaka` đều tạo ra file đúng |
| Tính năng đợt 2 trên máy ảo | Đã thử từng mục trong bảng "Tính năng thêm ở đợt 2" bên dưới, trừ những mục ghi "chưa thử" |

Chưa kiểm tra: máy thật, bản release, iOS, bút cảm ứng, truyện rất dài (hàng trăm trang), và thao tác **nhập** file `.mangaka` trên máy (phần đổi id khi nhập có test tự động). Máy ảo không giả lập được chụm hai ngón, lực nhấn bút và rung, nên ba thứ này cũng chưa thử.

## Màn hình

| # | Màn hình | Tình trạng | Ghi chú |
| --- | --- | --- | --- |
| 1 | Chào mừng | Xong | 3 slide, minh họa vẽ bằng SVG |
| 2 | Đăng nhập | Thay bằng bước nhập bút danh | Chưa có tài khoản; truyện lưu trên máy |
| 3 | Chọn sở thích | Xong | Vai trò, thể loại, nét vẽ |
| 4 | Trang chủ | Xong, không AI | Ô ý tưởng chỉ điền sẵn logline cho truyện mới |
| 5 | Thư viện truyện | Xong | Có nhân bản truyện và nút Hoàn tác sau khi xóa |
| 6 | Tạo truyện mới | Xong, không AI | 3 bước |
| 7 | Tổng quan truyện | Xong | "Bước tiếp theo" tính theo quy tắc từ dữ liệu |
| 8 | Dàn ý | Xong | Kéo thả chương trong hồi và sang hồi khác; menu vẫn dùng được |
| 9 | Soạn kịch bản | Xong, không AI | Tìm và thay thế, thống kê, chia sẻ kịch bản dạng văn bản, chuyển khối sang cảnh khác |
| 10 | Hồ sơ nhân vật | Xong, không AI | Bảng thiết kế dùng ảnh tải từ máy |
| 11 | Thế giới và ghi chú | Xong, không AI | Nội dung là văn bản thuần |
| 12 | Storyboard | Xong | Tự chia trang theo quy tắc (không AI); kéo thả trang ở chế độ lưới, chế độ danh sách dùng menu |
| 13 | Dàn khung trang | Xong | Mẫu khung, kéo đường chia, cắt chéo, gộp, rãnh, thứ tự đọc |
| 14 | Canvas vẽ | Xong phần chính | G-pen, bút chì, bút lông, tẩy, lấy màu, lớp, hoàn tác, vẽ hình (đường thẳng, chữ nhật, elip), tô vùng khoanh tay, screentone, di chuyển và co giãn lớp. Chưa có chọn một phần lớp |
| 15 | AI tạo ảnh khung | Chưa làm | Chờ phần AI |
| 16 | Thoại và hiệu ứng | Xong | 5 kiểu bong bóng, lời dẫn, SFX, 5 hiệu ứng; tự đặt thoại theo quy tắc; bản ngôn ngữ nhập tay |
| 17 | Đọc thử | Xong | Phóng to (chạm đôi, chụm), trang đôi khi xoay ngang, chọn bản ngôn ngữ |
| 18 | Xuất bản | Xong | PDF, PNG (ZIP), CBZ, ảnh dài; chọn bản ngôn ngữ; rời màn hình khi đang xuất thì hủy |
| 19 | Trợ lý AI | Chưa làm | Chờ phần AI; tab này đang ẩn |
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
