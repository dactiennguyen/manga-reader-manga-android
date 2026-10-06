# E · Hoàn thiện

Hai màn hình cuối của luồng làm truyện: đọc lại như một độc giả, rồi xuất file.

[← Danh sách màn hình](README.md)

---

## 17. Đọc thử

**Route:** `Preview`

### Mục đích

Xem chương đúng như độc giả sẽ thấy, để phát hiện trang cần sửa trước khi xuất bản.

### Đường vào và đường ra

- **Vào:** nút ▶ ở Tổng quan truyện (7) hoặc Storyboard (12).
- **Ra:** ✕ → màn trước. "Sửa trang này" → Dàn khung trang (13) của trang đang xem. "Xuất bản" ở trang cuối → Xuất bản và chia sẻ (18).

### Bố cục

Toàn màn hình, nền đen, ẩn thanh trạng thái. Chạm giữa màn hình để hiện/ẩn lớp điều khiển.

```
 ĐANG ĐỌC (ẩn điều khiển)         HIỆN ĐIỀU KHIỂN
┌───────────────────────────┐   ┌───────────────────────────┐
│                           │   │ ✕  Chương 2         ⚑  ⋮  │
│                           │   │───────────────────────────│
│   ┌───────────────────┐   │   │   ┌───────────────────┐   │
│   │                   │   │   │   │                   │   │
│   │                   │   │   │   │                   │   │
│   │    TRANG MANGA    │   │   │   │    TRANG MANGA    │   │
│   │                   │   │   │   │                   │   │
│   │                   │   │   │   │                   │   │
│   │                   │   │   │   │                   │   │
│   └───────────────────┘   │   │   └───────────────────┘   │
│                           │   │───────────────────────────│
│                           │   │ 8 ━━━━━━●━━━━━━━━━━━━━ 1  │
│                     3/8   │   │ [✎ Sửa trang này] [✦ Nhận xét ·4] │
└───────────────────────────┘   └───────────────────────────┘
```

### Thành phần

| Thành phần | Nội dung |
| --- | --- |
| Vùng trang | Trang vừa khít chiều ngang (dọc) hoặc chiều cao (ngang); phóng to bằng chụm hai ngón hoặc chạm hai lần |
| Số trang | "3/8" mờ ở góc dưới, luôn hiện |
| Thanh trên (lớp điều khiển) | ✕ · tên chương (chạm để chọn chương khác) · ⚑ gắn cờ trang này · ⋮ |
| Thanh trượt trang | Với trang manga, thanh trượt chạy **từ phải sang trái** (trang 1 ở bên phải); kéo hiện thumbnail nổi của trang |
| Nút dưới | "Sửa trang này" · nút AI "Nhận xét chương" |
| Menu ⋮ | Trang đơn/trang đôi · Bản ngôn ngữ · Hiện/ẩn trang chưa xong · Danh sách cờ · Giữ màn hình sáng |

**Theo định dạng**

| Định dạng | Cách đọc |
| --- | --- |
| Trang manga, máy dọc | Một trang mỗi lần; vuốt **sang phải** hoặc chạm mép **trái** để sang trang kế (đọc phải → trái) |
| Trang manga, máy ngang | Trang đôi, trang lẻ nằm bên phải |
| Webtoon | Cuộn dọc liên tục, các trang nối liền không khe hở |

**Trang cuối chương**: sau trang cuối là một thẻ kết: "Hết chương 2", số trang, và các nút: Đọc chương kế · Xuất bản · Đóng.

### Hành động

| Hành động | Phản hồi |
| --- | --- |
| Chạm giữa màn hình | Hiện/ẩn lớp điều khiển |
| Chạm mép trái / phải | Sang trang kế / trang trước (đảo lại với webtoon và truyện đọc trái → phải) |
| Vuốt ngang | Lật trang, có hiệu ứng trang giấy trượt |
| Chạm hai lần | Phóng to 2× tại điểm chạm; chạm hai lần nữa để về vừa màn hình |
| Bấm ⚑ hoặc nhấn giữ trang | Mở bảng gắn cờ: ô ghi chú ngắn (tùy chọn) + các chip lý do nhanh: Tranh · Thoại · Bố cục · Thứ tự đọc |
| Bấm "Sửa trang này" | Mở Dàn khung trang của trang đó; quay lại thì trở về đúng trang đang đọc |
| Kéo thanh trượt | Nhảy trang; thumbnail nổi theo ngón tay |

### AI

| Thao tác | Mức | Kết quả |
| --- | --- | --- |
| Nhận xét chương | Nặng | Đọc ảnh mọi trang và kịch bản của chương, trả về bảng nhận xét |

**Bảng nhận xét** (trượt từ dưới lên, chiếm 70% chiều cao)

```
┌─ ✦ NHẬN XÉT CHƯƠNG 2 ─────────┐
│ Tổng quan                     │
│ Nhịp truyện tốt ở nửa đầu,    │
│ trang 5–6 dồn nhiều thoại…    │
│                               │
│ ĐIỂM CẦN XEM                  │
│ ⚠ Trang 5 · Thoại             │
│   Khung 2 có 4 bong bóng,     │
│   khó đọc.        [Xem trang] │
│ ⚠ Trang 6 · Thứ tự đọc        │
│   Khung 3 và 4 dễ đọc nhầm    │
│   thứ tự.         [Xem trang] │
│ ĐIỂM TỐT                      │
│ ✓ Trang 3: khung lớn tạo      │
│   điểm nhấn đúng lúc          │
│                               │
│ [ Gắn cờ tất cả điểm cần xem ]│
└───────────────────────────────┘
```

- Mỗi điểm có loại (Nhịp, Thoại, Bố cục, Thứ tự đọc, Nhất quán nhân vật), trang liên quan, giải thích ngắn.
- "Xem trang" đóng bảng và nhảy tới trang đó. "Gắn cờ tất cả" chuyển các điểm thành cờ kèm ghi chú.
- Nhận xét được lưu lại cùng chương; mở lại không tốn credit cho tới khi chương thay đổi.

### Trạng thái

| Trạng thái | Hiển thị |
| --- | --- |
| Chương chưa có trang | Màn hình báo "Chương này chưa có trang nào để đọc" + nút "Tới storyboard" |
| Trang chưa xong | Vẫn hiện, có nhãn mờ "Chưa xong" ở góc; ẩn được trong menu |
| Khung chưa có tranh | Hiện khung trống với mô tả từ kịch bản bằng chữ xám, để vẫn theo được mạch truyện |
| Trang đã gắn cờ | Biểu tượng ⚑ đỏ son ở góc trang; chạm để đọc/sửa ghi chú hoặc gỡ cờ |
| Danh sách cờ | Bảng trượt: mọi cờ của chương theo trang; chạm để nhảy tới; nút "Gỡ tất cả" |
| Đang chạy AI nhận xét | Bảng nhận xét mở với khung xương, chữ hiện dần; vẫn lật trang được phía sau |
| Chống chụp màn hình bật | Màn hình này không chụp/quay được, như phần còn lại của app |

---

## 18. Xuất bản và chia sẻ

**Route:** `Export`

### Mục đích

Xuất một hay nhiều chương thành file ảnh, PDF, CBZ hoặc ảnh dài, rồi lưu hoặc chia sẻ.

### Đường vào và đường ra

- **Vào:** nút ⇪ ở Tổng quan truyện (7) hoặc Storyboard (12); thẻ kết chương ở Đọc thử (17).
- **Ra:** sau khi xuất → bảng chia sẻ của Android, hoặc "Mở thư mục". ← về màn trước.

### Bố cục

```
┌───────────────────────────────┐
│ ←  XUẤT BẢN                   │
│                               │
│ NỘI DUNG                      │
│ ☑ Chương 1 · 8 trang          │
│ ☑ Chương 2 · 8 trang  ⚠ 3 chưa xong
│ ☐ Chương 3 · 0 trang          │
│ Bản ngôn ngữ: Tiếng Việt ▾    │
│                               │
│ ĐỊNH DẠNG                     │
│ ┌──────┐┌──────┐┌──────┐┌──────┐
│ │ PNG  ││● PDF ││ CBZ  ││Ảnh dài│
│ └──────┘└──────┘└──────┘└──────┘
│ Dùng để in hoặc gửi đọc thử.  │
│                               │
│ TÙY CHỌN                      │
│ Chất lượng      (1x)(●2x)     │
│ Bố cục PDF      (●Đơn)(Đôi)   │
│ Thêm trang bìa          [ ●━] │
│ Thêm trang thông tin    [━○ ] │
│                               │
│ ┌─ Xem trước ───────────────┐ │
│ │ [bìa][tr1][tr2][tr3] →    │ │
│ └───────────────────────────┘ │
│ 17 trang · khoảng 24 MB       │
│ [          Xuất file        ] │
└───────────────────────────────┘
```

### Thành phần

| Thành phần | Nội dung |
| --- | --- |
| Danh sách chương | Ô chọn cho từng chương; hiện số trang và cảnh báo số trang chưa xong. Chương 0 trang không chọn được. Có ô "Chọn tất cả" |
| Bản ngôn ngữ | Hiện khi truyện có hơn một bản ngôn ngữ |
| Thẻ định dạng | 4 thẻ chọn một; dưới là một dòng giải thích định dạng đang chọn |
| Tùy chọn | Thay đổi theo định dạng (bảng dưới) |
| Dải xem trước | Thumbnail các trang theo đúng thứ tự xuất, gồm cả bìa và trang thông tin nếu bật |
| Dòng ước tính | Tổng số trang và dung lượng ước tính |
| Nút chính | "Xuất file" |

**Tùy chọn theo định dạng**

| Định dạng | Giải thích hiện trên màn hình | Tùy chọn |
| --- | --- | --- |
| PNG | "Mỗi trang một ảnh, nén trong một file ZIP. Hợp để đăng mạng xã hội." | Chất lượng 1x/2x · Thêm bìa |
| PDF | "Dùng để in hoặc gửi đọc thử." | Chất lượng · Trang đơn/đôi · Thêm bìa · Thêm trang thông tin |
| CBZ | "Mở được bằng các app đọc truyện." | Chất lượng · Thêm bìa |
| Ảnh dài | "Nối các trang thành dải dọc cho nền tảng webtoon." | Chiều rộng (800/1080px) · Tự cắt mỗi 4000px · Khoảng cách giữa trang |

- Chất lượng 2x cần gói thuê bao; người chưa có gói thấy biểu tượng khóa và bấm vào mở bảng gói.
- Truyện định dạng Webtoon mặc định chọn Ảnh dài; truyện Trang manga mặc định chọn PDF.

**Trang thông tin** (khi bật): tên truyện, tên tác giả (lấy từ Hồ sơ, sửa được ngay tại đây), ngày xuất, dòng "Có nội dung do AI hỗ trợ tạo" nếu truyện có ảnh hoặc chữ AI.

### Hành động

| Hành động | Phản hồi |
| --- | --- |
| Đổi lựa chọn bất kỳ | Dải xem trước và dòng ước tính cập nhật ngay |
| Chạm thumbnail xem trước | Xem lớn trang đó |
| Bấm Xuất file | Nếu có trang chưa xong: bảng xác nhận "3 trang chưa xong vẫn sẽ được xuất" với nút Xuất / Xem các trang đó. Sau đó chuyển sang trạng thái đang xuất |
| Xuất xong | Thẻ kết quả thay nút chính: tên file, dung lượng, ba nút Chia sẻ · Lưu vào máy · Mở |
| Bấm Chia sẻ | Mở bảng chia sẻ của Android |
| Bấm Lưu vào máy | Mở trình chọn thư mục của hệ thống |

### AI

| Thao tác | Mức | Kết quả |
| --- | --- | --- |
| Tạo bìa chương | Nặng | Ở công tắc "Thêm trang bìa", nếu chương chưa có bìa: nút "✦ Tạo bìa" cho 4 phương án từ nhân vật và nội dung chương |
| Viết lời giới thiệu | Nhẹ | Sau khi xuất xong: nút "✦ Viết lời giới thiệu" tạo đoạn 2–3 câu để dán kèm khi đăng; có nút Sao chép |

### Trạng thái

| Trạng thái | Hiển thị |
| --- | --- |
| Chưa chọn chương nào | Nút chính mờ; dòng ước tính: "Chọn ít nhất một chương" |
| Truyện chưa có trang nào | Toàn màn hình là trạng thái trống: "Chưa có gì để xuất" + nút "Tới storyboard" |
| Đang xuất | Nút chính thành thanh tiến độ "Đang xuất trang 6/17" + nút Hủy. Rời màn hình thì tiếp tục chạy nền, có thông báo khi xong |
| Hủy giữa chừng | File dở bị xóa; quay lại trạng thái chọn |
| Hết dung lượng máy | Thông báo "Không đủ dung lượng, cần khoảng 24 MB" |
| Xuất lỗi | Thông báo nêu trang bị lỗi + Thử lại |
| Lịch sử xuất | Mục thu gọn cuối màn hình: 5 file xuất gần nhất, chạm để chia sẻ lại; file đã bị xóa khỏi máy thì hiện mờ |
