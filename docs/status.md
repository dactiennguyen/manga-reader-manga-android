# Mangaka AI — Tình trạng triển khai

Cập nhật: 2026-10-06 · nhánh `feature/first-version`

Bản hiện tại gồm toàn bộ phần làm tay của app: viết kịch bản, nhân vật, chia khung, vẽ, đặt thoại, đọc thử, xuất file. Phần AI, tài khoản và credit chưa làm. Giao diện bằng tiếng Anh.

Ảnh chụp từng màn hình nằm trong [screenshots/](screenshots/); hai ảnh tổng hợp là [overview-1.png](screenshots/overview-1.png) và [overview-2.png](screenshots/overview-2.png).

## Đã kiểm tra thế nào

| Kiểm tra | Kết quả |
| --- | --- |
| `npx tsc --noEmit` | Không lỗi |
| `npm run lint` | Không lỗi |
| `npm test` | 39 test qua (chia khung, chia trang, kho dữ liệu, file dự án) |
| Build Android debug (`./gradlew assembleDebug`) | Thành công |
| Chạy trên máy ảo Android 14 (Pixel 6, API 34) | Đi trọn luồng: tạo truyện → kịch bản → tự chia trang → chỉnh khung → vẽ → đặt thoại → đọc thử → xuất file |
| Xuất file trên máy ảo | PDF, ZIP ảnh PNG, CBZ, ảnh dài và file `.mangaka` đều tạo ra file đúng |

Chưa kiểm tra: máy thật, bản release, iOS, bút cảm ứng, truyện rất dài (hàng trăm trang), và thao tác **nhập** file `.mangaka` trên máy (phần đổi id khi nhập có test tự động).

## Màn hình

| # | Màn hình | Tình trạng | Ghi chú |
| --- | --- | --- | --- |
| 1 | Chào mừng | Xong | 3 slide, minh họa vẽ bằng SVG |
| 2 | Đăng nhập | Thay bằng bước nhập bút danh | Chưa có tài khoản; truyện lưu trên máy |
| 3 | Chọn sở thích | Xong | Vai trò, thể loại, nét vẽ |
| 4 | Trang chủ | Xong, không AI | Ô ý tưởng chỉ điền sẵn logline cho truyện mới |
| 5 | Thư viện truyện | Xong | Chưa có "Nhân bản truyện" và nút Hoàn tác sau khi xóa (khôi phục qua Thùng rác) |
| 6 | Tạo truyện mới | Xong, không AI | 3 bước |
| 7 | Tổng quan truyện | Xong | "Bước tiếp theo" tính theo quy tắc từ dữ liệu |
| 8 | Dàn ý | Xong | Sắp xếp chương bằng menu, chưa có kéo thả |
| 9 | Soạn kịch bản | Xong, không AI | Chuyển khối lên/xuống chỉ trong một cảnh |
| 10 | Hồ sơ nhân vật | Xong, không AI | Bảng thiết kế dùng ảnh tải từ máy |
| 11 | Thế giới và ghi chú | Xong, không AI | Nội dung là văn bản thuần |
| 12 | Storyboard | Xong | Tự chia trang theo quy tắc (không AI); sắp xếp trang bằng menu |
| 13 | Dàn khung trang | Xong | Mẫu khung, kéo đường chia, cắt chéo, gộp, rãnh, thứ tự đọc |
| 14 | Canvas vẽ | Xong phần chính | G-pen, bút chì, bút lông, tẩy, lấy màu, lớp, hoàn tác. Chưa có đổ màu, chọn vùng, di chuyển nội dung lớp |
| 15 | AI tạo ảnh khung | Chưa làm | Chờ phần AI |
| 16 | Thoại và hiệu ứng | Xong | 5 kiểu bong bóng, lời dẫn, SFX, 5 hiệu ứng; tự đặt thoại theo quy tắc. Chưa có bản ngôn ngữ |
| 17 | Đọc thử | Xong phần chính | Chưa có phóng to và trang đôi khi xoay ngang |
| 18 | Xuất bản | Xong | PDF, PNG (ZIP), CBZ, ảnh dài; rời màn hình khi đang xuất thì hủy |
| 19 | Trợ lý AI | Chưa làm | Chờ phần AI; tab này đang ẩn |
| 20 | Hồ sơ và cài đặt | Xong, không credit | Thùng rác, nhập dự án, chủ đề, tay thuận |

## Khác với tài liệu thiết kế

- **Giao diện tiếng Anh.** Tài liệu mô tả bằng tiếng Việt, app hiển thị tiếng Anh. Chưa có lựa chọn ngôn ngữ.
- **Lưu dữ liệu bằng MMKV thay cho SQLite.** Truyện nằm trong một store Zustand ghi xuống MMKV; tranh từng khung lưu riêng theo id khung. Đủ nhanh cho quy mô hiện tại và bớt một thư viện native.
- **Tranh là nét vẽ vector, không phải ảnh điểm.** Mỗi lớp là danh sách nét; nhờ vậy xuất ở độ phân giải nào cũng nét, nhưng chưa làm được đổ màu kiểu thùng sơn.
- **Hai tính năng "tự động" không dùng AI:** tự chia kịch bản thành trang và khung, tự đặt bong bóng thoại vào khung. Cả hai chạy theo quy tắc cố định.
- **Phông chữ giao diện là phông hệ thống**, tiêu đề dùng Anton. Be Vietnam Pro và Patrick Hand dùng cho chữ trong trang truyện.
- **Rung phản hồi** đã có công tắc và hàm `haptic()` nhưng chưa gắn vào thao tác nào.

## Việc nên làm tiếp

1. Thử trên máy thật, nhất là cảm giác vẽ và các cử chỉ hai, ba ngón.
2. Thử nhập file `.mangaka` trên máy và thử với truyện nhiều trang.
3. Canvas: đổ màu, chọn vùng, di chuyển nội dung lớp.
4. Đọc thử: phóng to, trang đôi.
5. Kéo thả để sắp xếp chương và trang.
6. Phần AI (màn 15, 19 và các nút AI trong những màn còn lại), cần chốt model tạo ảnh và máy chủ trung gian trước.
