# F · AI và cá nhân

Hai màn hình nằm trên thanh tab, mở được ở bất kỳ lúc nào: trợ lý AI dạng chat, và hồ sơ kèm cài đặt.

[← Danh sách màn hình](README.md)

---

## 19. Trợ lý AI

**Route:** `Assistant` (tab 4) — cũng mở dạng bảng trượt từ nút trợ lý nổi ở các màn 8–18.

### Mục đích

Hỏi đáp và động não với một trợ lý hiểu toàn bộ truyện đang làm, rồi đưa câu trả lời vào truyện bằng một chạm.

### Đường vào và đường ra

- **Vào:** tab Trợ lý trên thanh tab; nút trợ lý nổi ở mọi màn làm việc trong truyện.
- **Ra:** "Chèn vào kịch bản" → chèn tại con trỏ ở Soạn kịch bản (9). "Lưu thành ghi chú" → tạo ghi chú trong Thế giới và ghi chú (11). Chạm một tham chiếu (chương, nhân vật) trong câu trả lời → mở màn tương ứng.

### Bố cục

```
┌───────────────────────────────┐
│ ☰  TRỢ LÝ               ✎   ⋮ │
│ [▣ Cậu bé giao hàng ▾] · Ch.2 │
│───────────────────────────────│
│                               │
│            ╭────────────────╮ │
│            │ Cảnh 3 có lê   │ │
│            │ thê không?     │ │
│            ╰──────────────╱─╯ │
│ ╭─────────────────────────╮   │
│ │✦ Có hơi dài ở đoạn Minh │   │
│ │ và bà Tư nói chuyện.    │   │
│ │ Gợi ý:                  │   │
│ │ • Cắt 2 câu thoại đầu   │   │
│ │ • Chuyển lời giải thích │   │
│ │   thành hành động       │   │
│ ╰╲────────────────────────╯   │
│  [⧉] [↳ Chèn] [▤ Ghi chú] [↻] │
│                               │
│ (Viết lại cảnh 3 gọn hơn)     │
│ (Bà Tư nên nói gì ở đây?)     │
│───────────────────────────────│
│ [ Hỏi về truyện của bạn…  ] ➤ │
│                        ✦ · 2  │
└───────────────────────────────┘
```

### Thành phần

| Thành phần | Nội dung |
| --- | --- |
| Thanh trên | ☰ Lịch sử trò chuyện · tiêu đề · ✎ Cuộc trò chuyện mới · ⋮ |
| Chip ngữ cảnh | Bìa nhỏ + tên truyện đang gắn; chạm để đổi truyện hoặc chọn "Không gắn truyện". Bên cạnh là vị trí hiện tại nếu mở từ một màn trong truyện ("Ch.2", "Trang 3 · Khung 2", "Nhân vật: Minh") |
| Tin nhắn người dùng | Bong bóng căn phải, nền mực chữ trắng, đuôi bên phải |
| Tin nhắn trợ lý | Bong bóng căn trái, nền trắng viền mực, dấu ✦ tím; chữ hiện dần; hỗ trợ đậm, gạch đầu dòng, danh sách đánh số |
| Tham chiếu trong câu trả lời | Tên chương, nhân vật, địa danh hiện dạng chip nhỏ chạm được |
| Thanh hành động dưới câu trả lời | ⧉ Sao chép · ↳ Chèn vào kịch bản · ▤ Lưu thành ghi chú · ↻ Trả lời lại |
| Gợi ý nhanh | 2–3 chip câu hỏi tiếp theo, đổi theo ngữ cảnh và câu trả lời vừa rồi |
| Ô nhập | Nhiều dòng, tối đa 6 dòng rồi cuộn; nút gửi; số credit mỗi tin nhắn |
| Menu ⋮ | Đổi tên cuộc trò chuyện · Xóa cuộc trò chuyện · Trợ lý biết gì về truyện này |

**Gợi ý nhanh theo nơi mở**

| Mở từ | Gợi ý mẫu |
| --- | --- |
| Tab Trợ lý, chưa gắn truyện | "Cách vẽ đường tốc độ" · "Một chương manga nên dài bao nhiêu trang?" · "Giúp mình nghĩ ý tưởng truyện" |
| Dàn ý | "Hồi 2 còn thiếu gì?" · "Gợi ý một cú twist" |
| Soạn kịch bản | "Cảnh này có lê thê không?" · "Lời thoại này có hợp tính cách Minh không?" |
| Hồ sơ nhân vật | "Minh còn thiếu điểm yếu nào thú vị?" · "Gợi ý quan hệ với nhân vật khác" |
| Dàn khung trang / Canvas | "Bố cục trang này nên sửa gì?" · "Nên dùng góc máy nào cho khung này?" |
| Đọc thử | "Trang này có khó đọc không?" |

**Ngăn Lịch sử trò chuyện** (trượt từ trái)

- Nhóm theo truyện; trong mỗi truyện xếp theo ngày: Hôm nay, Hôm qua, Trước đó.
- Mỗi dòng: tên cuộc trò chuyện (tự đặt theo câu hỏi đầu), thời gian.
- Vuốt trái một dòng để xóa. Ô tìm ở trên cùng.

**Bảng "Trợ lý biết gì về truyện này"**

- Liệt kê những gì đang được gửi kèm: logline, dàn ý (số chương), nhân vật (số lượng), mục thế giới đang bật "Gửi cho AI", tóm tắt các chương.
- Mục đích: cho người dùng thấy rõ trợ lý dựa vào đâu, và dẫn tới chỗ sửa nếu thông tin sai.

### Hành động

| Hành động | Phản hồi |
| --- | --- |
| Gửi tin nhắn | Bong bóng người dùng hiện ngay; bong bóng trợ lý hiện ba chấm rồi chữ chạy dần; nút gửi thành nút Dừng |
| Chạm chip gợi ý | Gửi luôn câu đó |
| Bấm ↳ Chèn | Nếu mở từ Soạn kịch bản: chèn tại con trỏ dưới dạng khối xem trước viền tím. Nếu mở từ nơi khác: hỏi chèn vào chương nào, rồi chèn vào cuối kịch bản chương đó |
| Bấm ▤ Ghi chú | Tạo ghi chú mới trong truyện; thông báo nhanh "Đã lưu vào Ghi chú" + nút Mở |
| Bấm ↻ | Tạo câu trả lời khác; mũi tên ‹ 1/2 › cho phép xem lại bản trước |
| Nhấn giữ tin nhắn | Sao chép · Chọn chữ · Xóa tin nhắn |
| Nhấn giữ tin nhắn của mình | Thêm: Sửa và gửi lại |
| Đổi truyện ở chip ngữ cảnh | Bắt đầu cuộc trò chuyện mới gắn với truyện đó |
| Kéo bảng trượt xuống (khi mở từ nút nổi) | Đóng trợ lý, quay lại đúng màn đang làm; cuộc trò chuyện được giữ |

Trợ lý **không tự sửa truyện**. Khi người dùng yêu cầu "viết lại cảnh 3", trợ lý trả lời bằng nội dung đề xuất và nút Chèn; chỉ khi người dùng bấm thì nội dung mới vào kịch bản.

### AI

| Thao tác | Mức | Ghi chú |
| --- | --- | --- |
| Mỗi tin nhắn | Vừa | Kèm hồ sơ truyện và ngữ cảnh màn hình hiện tại |
| Tin nhắn kèm ảnh trang | Vừa | Khi mở từ Dàn khung trang, Canvas, Đọc thử: có nút 📎 "Gửi kèm trang này" để trợ lý nhìn tranh |
| Trả lời lại | Vừa | Tính như một tin nhắn mới |

### Trạng thái

| Trạng thái | Hiển thị |
| --- | --- |
| Cuộc trò chuyện mới | Hình trợ lý nét mực + bong bóng "Mình đã đọc *Cậu bé giao hàng*. Bạn muốn bàn về phần nào?" + 4 chip gợi ý xếp lưới 2×2 |
| Chưa gắn truyện | Bong bóng chào: "Hỏi mình bất cứ điều gì về viết và vẽ manga." Ẩn nút Chèn và Ghi chú |
| Chưa đăng nhập | Ô nhập thay bằng nút "Đăng nhập để dùng trợ lý" |
| Đang trả lời | Chữ chạy dần; nút Dừng. Dừng giữa chừng: giữ phần đã viết, có nhãn "Đã dừng" |
| Lỗi | Bong bóng trợ lý hiện "Không trả lời được. Credit đã được hoàn lại." + nút Thử lại |
| Hết credit | Ô nhập vẫn gõ được; nút gửi đổi thành "Cần thêm credit" |
| Ngoại tuyến | Ô nhập bị khóa với chữ "Trợ lý cần mạng"; vẫn đọc được lịch sử |
| Câu hỏi bị từ chối do nội dung | Trợ lý trả lời ngắn rằng không hỗ trợ được yêu cầu đó; không trừ credit |
| Cuộc trò chuyện rất dài | Dải nhắc "Cuộc trò chuyện đã dài, trợ lý có thể quên phần đầu" + nút "Bắt đầu cuộc mới kèm tóm tắt" |

---

## 20. Hồ sơ và cài đặt

**Route:** `Profile` (tab 5)

### Mục đích

Quản lý tài khoản, credit và gói, cùng mọi cài đặt của app.

### Đường vào và đường ra

- **Vào:** tab Hồ sơ trên thanh tab.
- **Ra:** Đăng nhập (2) · bảng Mua credit · các màn con: Lịch sử credit, Sở thích, Thùng rác, Giới thiệu.

### Bố cục

```
┌───────────────────────────────┐
│ HỒ SƠ                         │
│░░░░░░░░ nền chấm tram ░░░░░░░░│
│ ┌────┐ Phong                  │
│ │ảnh │ phong@example.com      │
│ └────┘ Bút danh: Phong  ✎     │
│ ┌───────────────────────────┐ │
│ │ ✦ 120 credit              │ │
│ │ +20 miễn phí mỗi ngày     │ │
│ │ Gói: Miễn phí             │ │
│ │ [Mua credit] [Nâng cấp gói]│ │
│ │ Lịch sử dùng credit     › │ │
│ └───────────────────────────┘ │
│ ┌──────┐┌──────┐┌──────┐      │
│ │  3   ││  21  ││  48  │      │
│ │truyện││trang ││ảnh AI│      │
│ └──────┘└──────┘└──────┘      │
│ GIAO DIỆN                     │
│ Chủ đề          Theo hệ thống›│
│ Ngôn ngữ        Tiếng Việt   ›│
│ Tay thuận       Phải         ›│
│ VIẾT VÀ VẼ                    │
│ Sở thích sáng tác            ›│
│ Giữ màn hình sáng khi vẽ [●━] │
│ AI                            │
│ Hỏi trước thao tác tốn nhiều credit [●━]
│ Thông báo khi AI tạo xong [●━]│
│ RIÊNG TƯ VÀ DỮ LIỆU           │
│ Chống chụp màn hình      [●━] │
│ Nhập dự án (.mangaka)        ›│
│ Thùng rác (2)                ›│
│ KHÁC                          │
│ Trợ giúp · Điều khoản · Giới thiệu
│ [ Đăng xuất ]                 │
├───────────────────────────────┤
│  ⌂     ▤    (+)    ✦     ☺    │
└───────────────────────────────┘
```

### Thành phần

**Thẻ tài khoản**

| Thành phần | Nội dung |
| --- | --- |
| Ảnh đại diện | Từ tài khoản Google hoặc chữ cái đầu |
| Tên, email | Chỉ đọc |
| Bút danh | Tên tác giả in trên trang thông tin khi xuất; sửa tại chỗ |

**Thẻ credit** (viền tím)

| Thành phần | Nội dung |
| --- | --- |
| Số dư | Số credit hiện có |
| Credit miễn phí | Lượng nhận mỗi ngày và giờ làm mới |
| Gói | Tên gói hiện tại; gói trả phí hiện thêm ngày gia hạn |
| Nút | "Mua credit" mở bảng Mua credit; "Nâng cấp gói" mở bảng gói. Người đã có gói thấy "Quản lý gói" |
| Lịch sử dùng credit | Mở màn con |

**Dải thống kê**: số truyện, số trang đã xong, số ảnh AI đã tạo.

**Các nhóm cài đặt**

| Nhóm | Mục | Kiểu | Mặc định |
| --- | --- | --- | --- |
| Giao diện | Chủ đề | Chọn một: Theo hệ thống · Sáng · Tối | Theo hệ thống |
| | Ngôn ngữ | Chọn một: Tiếng Việt · English | Theo máy |
| | Tay thuận | Chọn một: Phải · Trái | Phải |
| Viết và vẽ | Sở thích sáng tác | Mở lại 3 câu hỏi của màn Chọn sở thích | |
| | Giữ màn hình sáng khi vẽ | Công tắc | Bật |
| | Rung phản hồi | Công tắc | Bật |
| AI | Hỏi trước thao tác tốn nhiều credit | Công tắc | Bật |
| | Thông báo khi AI tạo xong | Công tắc | Bật |
| | Ngôn ngữ AI viết | Chọn một: Theo ngôn ngữ app · Tiếng Việt · English | Theo ngôn ngữ app |
| Riêng tư và dữ liệu | Chống chụp màn hình | Công tắc | Bật ở bản phát hành |
| | Nhập dự án (.mangaka) | Mở trình chọn file | |
| | Thùng rác | Mở màn con; hiện số mục | |
| | Dung lượng đã dùng | Chỉ đọc: tổng dung lượng truyện trên máy; chạm để xem theo từng truyện | |
| Khác | Trợ giúp, Điều khoản, Chính sách riêng tư, Giới thiệu (phiên bản) | Liên kết | |
| | Xóa tài khoản | Chữ đỏ, trong Giới thiệu | |

### Màn con

**Lịch sử dùng credit**

```
┌───────────────────────────────┐
│ ←  LỊCH SỬ CREDIT             │
│ [Tất cả][Viết][Vẽ][Chat][Nạp] │
│ Tháng này: đã dùng 86         │
│ ▰▰▰▰▰ Vẽ 60 ▰▰ Viết 18 ▰ Chat 8
│───────────────────────────────│
│ HÔM NAY                       │
│ ✦ Tạo ảnh khung          −4   │
│   Cậu bé giao hàng · Ch.2     │
│ ✦ Viết tiếp              −2   │
│ ↩ Hoàn credit (lỗi mạng)  +4  │
│ ☀ Credit miễn phí        +20  │
│ HÔM QUA                       │
│ …                             │
└───────────────────────────────┘
```

- Chip lọc theo loại; thanh tỉ lệ cho thấy credit tháng này đi vào đâu.
- Mỗi dòng: loại thao tác, truyện và chương liên quan, số credit (trừ màu mực, cộng màu xanh).
- Kéo xuống để làm mới.

**Bảng Mua credit**

- Số dư hiện tại ở trên cùng.
- 3 gói credit lẻ xếp ngang (gói giữa có nhãn "Phổ biến"), mỗi gói: số credit, giá, ước tính "≈ 25 khung tranh".
- Thẻ gói tháng bên dưới với các quyền lợi: nhiều credit hơn, tạo ảnh hàng loạt, xuất 2x, nhiều bản ngôn ngữ.
- Liên kết "Khôi phục giao dịch".
- Thanh toán qua Google Play; thành công thì số dư nhảy số và có thông báo nhanh.

**Thùng rác**: như mô tả ở Thư viện truyện (5).

### Hành động

| Hành động | Phản hồi |
| --- | --- |
| Đổi Chủ đề | Áp dụng ngay, chuyển màu mượt 200ms |
| Đổi Ngôn ngữ | Áp dụng ngay, không cần khởi động lại |
| Đổi Tay thuận | Thanh công cụ Canvas và nút trợ lý nổi đổi bên |
| Bật/tắt Chống chụp màn hình | Áp dụng ngay cho toàn app |
| Sửa bút danh | Lưu khi rời ô |
| Bấm Đăng xuất | Bảng xác nhận nêu rõ "Truyện trên máy vẫn được giữ"; sau đó thẻ tài khoản thành trạng thái chưa đăng nhập |
| Bấm Xóa tài khoản | Bảng cảnh báo 2 bước, yêu cầu gõ "XÓA"; xóa dữ liệu trên máy chủ, truyện trên máy giữ nguyên |

### AI

Màn này không gọi AI. Nó hiển thị số dư và lịch sử credit của mọi thao tác AI trong app.

### Trạng thái

| Trạng thái | Hiển thị |
| --- | --- |
| Chưa đăng nhập | Thẻ tài khoản thành: "Bạn đang dùng không tài khoản" + nút "Đăng nhập". Thẻ credit thành lời mời: "Đăng nhập để nhận credit miễn phí mỗi ngày". Ẩn Đăng xuất và Xóa tài khoản |
| Ngoại tuyến | Số dư hiện giá trị lần cuối kèm nhãn "chưa cập nhật"; nút mua mờ đi |
| Hết credit | Số dư màu đỏ son; dòng nhắc giờ nhận credit miễn phí tiếp theo |
| Thanh toán thất bại hoặc bị hủy | Thông báo nhanh; số dư không đổi |
| Lịch sử credit trống | "Bạn chưa dùng tính năng AI nào" + nút "Thử ngay" dẫn về Trang chủ |
| Bản dev | Mục Chống chụp màn hình mặc định tắt |
