# B · Trang chủ và dự án

Bốn màn hình quản lý truyện: nhìn thấy việc đang dở, tìm truyện, tạo truyện mới và xem tổng quan một truyện.

[← Danh sách màn hình](README.md)

---

## 4. Trang chủ

**Route:** `Home` (tab 1)

### Mục đích

Mở app là thấy ngay truyện đang làm dở và quay lại đúng chỗ bằng một chạm; hoặc bắt đầu truyện mới từ một câu ý tưởng.

### Đường vào và đường ra

- **Vào:** mở app; tab Trang chủ.
- **Ra:** thẻ Tiếp tục → màn hình đang làm dở của truyện đó. Ô ý tưởng → Tạo truyện mới (6). Thẻ truyện gần đây → Tổng quan truyện (7). Chip credit → bảng Mua credit.

### Bố cục

```
┌───────────────────────────────┐
│ Chào Phong 👋        [✦ 120]  │
│░░░░░░░ nền chấm tram ░░░░░░░░░│
│ ┌───────────────────────────┐ │
│ │ TIẾP TỤC                  │ │
│ │ ┌────┐ Cậu bé giao hàng   │ │
│ │ │bìa │ Chương 2 · Trang 5 │ │
│ │ └────┘ ▰▰▰▰▰▱▱▱ 62%       │ │
│ │              [ Vẽ tiếp → ]│ │
│ └───────────────────────────┘ │
│                               │
│ BẮT ĐẦU TỪ MỘT CÂU            │
│ ┌───────────────────────────┐ │
│ │ Truyện của bạn kể về…     │ │
│ │                    [✦ ·1] │ │
│ └───────────────────────────┘ │
│ (Thử: "nữ sinh có thể…")      │
│                               │
│ TRUYỆN GẦN ĐÂY       Xem tất cả│
│ ┌────┐ ┌────┐ ┌────┐          │
│ │    │ │    │ │    │  →       │
│ └────┘ └────┘ └────┘          │
│                               │
│ MẸO HÔM NAY                   │
│ ( bong bóng thoại chứa mẹo )  │
├───────────────────────────────┤
│  ⌂     ▤    (+)    ✦     ☺    │
└───────────────────────────────┘
```

### Thành phần

| Thành phần | Nội dung |
| --- | --- |
| Lời chào | "Chào {tên}"; không tài khoản thì "Chào bạn" |
| Chip credit | Biểu tượng tia sáng + số dư, nền tím nhạt. Không tài khoản: hiện "Đăng nhập" |
| Thẻ Tiếp tục | Bìa, tên truyện, vị trí đang dở (chương · trang, hoặc "Kịch bản chương 2"), thanh tiến độ truyện, nút hành động |
| Nút trên thẻ Tiếp tục | Nhãn đổi theo việc đang dở: "Viết tiếp", "Vẽ tiếp", "Chia khung tiếp" |
| Ô ý tưởng | Ô nhập nhiều dòng (tối đa 200 ký tự), nút AI ở góc dưới phải |
| Gợi ý mẫu | 3 chip ý tưởng mẫu theo thể loại đã chọn; chạm để điền vào ô |
| Truyện gần đây | Dải cuộn ngang, tối đa 6 bìa, mỗi bìa có tên và tiến độ |
| Mẹo hôm nay | Một mẹo vẽ hoặc viết manga trong bong bóng thoại, đổi mỗi ngày, có nút đóng |

### Hành động

| Hành động | Phản hồi |
| --- | --- |
| Bấm nút trên thẻ Tiếp tục | Mở đúng màn hình và vị trí đang dở (ví dụ Canvas của khung cuối cùng đã vẽ) |
| Bấm vùng còn lại của thẻ | Mở Tổng quan truyện |
| Gõ ý tưởng rồi bấm nút AI | Mở Tạo truyện mới với tên, thể loại, logline do AI điền sẵn |
| Chạm chip gợi ý mẫu | Điền câu mẫu vào ô, chưa gọi AI |
| Bấm "Xem tất cả" | Chuyển sang tab Thư viện |
| Bấm chip credit | Mở bảng Mua credit |

### AI

| Thao tác | Mức credit | Kết quả |
| --- | --- | --- |
| Dựng khung truyện từ một câu | Nhẹ | Tên, 1–3 thể loại, logline; hiện trong Tạo truyện mới để sửa |

### Trạng thái

| Trạng thái | Hiển thị |
| --- | --- |
| Chưa có truyện nào | Ẩn thẻ Tiếp tục và Truyện gần đây. Ô ý tưởng lên đầu, phóng lớn, kèm bong bóng: "Kể mình nghe ý tưởng của bạn đi!" và nút phụ "Tạo truyện trống" |
| Vai trò "Vẽ tranh" | Dưới ô ý tưởng có thêm nút "Mở canvas trống" (tạo truyện 1 trang và vào thẳng Canvas) |
| Đang gọi AI | Nút AI thành nút Dừng; ô nhập bị khóa |
| AI lỗi | Thông báo nhanh "Không tạo được, credit đã hoàn lại" + nút Thử lại; chữ đã gõ giữ nguyên |
| Ngoại tuyến | Nút AI xám "Cần mạng"; vẫn có nút "Tạo truyện trống" |
| Ô ý tưởng trống | Nút AI mờ, không bấm được |

---

## 5. Thư viện truyện

**Route:** `Library` (tab 2)

### Mục đích

Xem, tìm, sắp xếp và quản lý mọi truyện trên máy.

### Đường vào và đường ra

- **Vào:** tab Thư viện; "Xem tất cả" ở Trang chủ.
- **Ra:** chạm một truyện → Tổng quan truyện (7). Menu → Nhập dự án, Thùng rác.

### Bố cục

```
┌───────────────────────────────┐
│ THƯ VIỆN              🔍   ⋮  │
│ [Tất cả][Nháp][Đang làm][Xong]│
│ 8 truyện · Sửa gần nhất ▾     │
│                               │
│ ┌────────┐ ┌────────┐         │
│ │        │ │        │         │
│ │  bìa   │ │  bìa   │         │
│ │        │ │        │         │
│ │▰▰▰▱ 62%│ │▰▱▱▱ 10%│         │
│ └────────┘ └────────┘         │
│ Cậu bé     Mưa tháng          │
│ giao hàng  Sáu                │
│ 3 chương   1 chương           │
│                               │
│ ┌────────┐ ┌────────┐         │
│ │  ...   │ │  ...   │         │
├───────────────────────────────┤
│  ⌂     ▤    (+)    ✦     ☺    │
└───────────────────────────────┘
```

### Thành phần

| Thành phần | Nội dung |
| --- | --- |
| Nút tìm | Mở ô tìm thay cho tiêu đề; lọc theo tên khi gõ |
| Menu ba chấm | Nhập dự án (.mangaka) · Thùng rác · Đổi kiểu xem (lưới/danh sách) |
| Chip lọc | Tất cả · Nháp · Đang làm · Xong; mỗi chip hiện số lượng |
| Dòng đếm và sắp xếp | "{n} truyện" và nút chọn sắp xếp: Sửa gần nhất · Tên · Ngày tạo |
| Thẻ truyện (lưới) | Bìa tỉ lệ 2:3, thanh tiến độ đè ở đáy bìa, tên (2 dòng), số chương. Truyện Xong có dấu son đỏ "完" ở góc |
| Thẻ truyện (danh sách) | Bìa nhỏ, tên, logline 1 dòng, số chương · số trang, ngày sửa |

Lưới 2 cột trên điện thoại, 3 cột khi màn hình rộng từ 600dp.

### Hành động

| Hành động | Phản hồi |
| --- | --- |
| Chạm thẻ | Mở Tổng quan truyện |
| Nhấn giữ thẻ | Menu: Đổi tên · Đổi bìa · Nhân bản · Xuất dự án · Đánh dấu xong/chưa xong · Xóa |
| Xóa | Bảng xác nhận; truyện vào Thùng rác; thông báo nhanh có nút Hoàn tác |
| Kéo xuống | Làm mới danh sách |
| Nhập dự án | Mở trình chọn file; nhập xong cuộn tới truyện mới và nháy viền |

### AI

Màn này không gọi AI.

### Trạng thái

| Trạng thái | Hiển thị |
| --- | --- |
| Chưa có truyện | Minh họa giá sách trống, bong bóng "Giá sách còn trống. Tạo truyện đầu tiên nhé!", nút "Tạo truyện mới" |
| Lọc/tìm không ra | "Không có truyện nào khớp" + nút "Xóa bộ lọc" |
| Đang nhập dự án | Thẻ giữ chỗ có thanh tiến độ ở đầu lưới |
| File nhập hỏng | Thông báo "File không đọc được hoặc không phải dự án Mangaka" |
| Thùng rác | Màn danh sách con: mỗi dòng có tên, số ngày còn lại, nút Khôi phục và Xóa hẳn |

---

## 6. Tạo truyện mới

**Route:** `NewProject` (toàn màn hình, trượt từ dưới lên)

### Mục đích

Tạo một dự án truyện qua 3 bước: thông tin, định dạng, phong cách vẽ.

### Đường vào và đường ra

- **Vào:** nút (+) trên thanh tab; ô ý tưởng ở Trang chủ (kèm dữ liệu AI điền sẵn); nút ở trạng thái trống của Thư viện.
- **Ra:** "Tạo truyện" → Tổng quan truyện (7) của truyện mới. Nút ✕ → quay lại, hỏi xác nhận nếu đã nhập gì.

### Bố cục

```
┌───────────────────────────────┐
│ ✕   TRUYỆN MỚI    ▰▰▰▱▱▱ 1/3  │
│                               │
│ Tên truyện *                  │
│ [Cậu bé giao hàng______] [✦·1]│
│                               │
│ Thể loại (tối đa 3)           │
│ (Phiêu lưu)(Giả tưởng)(Hài)…  │
│                               │
│ Logline                       │
│ ┌───────────────────────────┐ │
│ │ Một cậu bé giao hàng phát │ │
│ │ hiện mình nghe được…      │ │
│ └───────────────────────────┘ │
│                   86/200 [✦·1]│
│                               │
│ [         Tiếp          ]     │
└───────────────────────────────┘
```

### Thành phần theo bước

**Bước 1 — Thông tin**

| Thành phần | Nội dung |
| --- | --- |
| Tên truyện | Bắt buộc, tối đa 60 ký tự. Nút AI bên cạnh gợi ý 5 tên |
| Thể loại | Chip chọn nhiều, tối đa 3; thể loại yêu thích xếp trước |
| Logline | Tùy chọn, tối đa 200 ký tự, có bộ đếm. Nút AI viết logline từ tên và thể loại |
| Dấu AI | Trường do AI điền có dấu tia sáng tím ở góc cho tới khi người dùng sửa |

**Bước 2 — Định dạng**

| Thành phần | Nội dung |
| --- | --- |
| Thẻ "Trang manga" | Hình minh họa trang đôi với mũi tên đọc phải → trái. Chọn khổ: B5 (mặc định), A5 |
| Thẻ "Webtoon" | Hình minh họa dải dọc với mũi tên cuộn xuống |
| Ghi chú | Dòng chữ nhỏ có biểu tượng cảnh báo: "Định dạng không đổi được sau khi bạn vẽ trang đầu tiên." |

**Bước 3 — Phong cách vẽ**

| Thành phần | Nội dung |
| --- | --- |
| Lưới phong cách | 2 cột, mỗi ô là ảnh mẫu + tên; phong cách đã chọn ở Sở thích được chọn sẵn |
| Công tắc "Truyện màu" | Mặc định tắt (đen trắng) |
| Thẻ tóm tắt | Tên, thể loại, định dạng, phong cách — để soát lại trước khi tạo |
| Nút chính | "Tạo truyện" |

### Hành động

| Hành động | Phản hồi |
| --- | --- |
| Bấm nút AI cạnh Tên | Mở danh sách 5 tên gợi ý ngay dưới ô; chạm một tên để dùng |
| Bấm nút AI cạnh Logline | Logline hiện dần trong ô; có nút Dừng và Thử lại |
| Bấm Tiếp | Sang bước kế. Tên trống thì ô rung và báo "Cần có tên truyện" |
| Bấm ← (bước 2, 3) | Về bước trước, giữ nguyên dữ liệu |
| Bấm ✕ | Chưa nhập gì: đóng ngay. Đã nhập: hỏi "Bỏ truyện đang tạo?" |
| Bấm Tạo truyện | Tạo dự án + Chương 1 trống, mở Tổng quan truyện với hiệu ứng lật bìa |

### AI

| Thao tác | Mức credit | Kết quả |
| --- | --- | --- |
| Gợi ý tên | Nhẹ | 5 tên theo thể loại và logline |
| Viết logline | Nhẹ | 1 logline tối đa 200 ký tự |
| Tạo bìa tạm | Nặng | Tùy chọn ở thẻ tóm tắt bước 3; không chọn thì bìa là tên truyện trên nền chấm tram |

### Trạng thái

| Trạng thái | Hiển thị |
| --- | --- |
| Vào từ ô ý tưởng | Bước 1 điền sẵn cả 3 trường, có dấu AI; trên cùng có dòng "Ý tưởng: …" để nhắc lại |
| Trùng tên truyện đã có | Cho phép; hiện ghi chú nhẹ "Bạn đã có một truyện cùng tên" |
| AI lỗi | Trường giữ giá trị cũ; thông báo nhanh có Thử lại |
| Ngoại tuyến | Các nút AI xám; vẫn tạo truyện bằng tay bình thường |

---

## 7. Tổng quan truyện

**Route:** `Project`

### Mục đích

Trung tâm của một truyện: thấy tiến độ, vào từng chương, và tới các phần Nhân vật, Thế giới, Ghi chú.

### Đường vào và đường ra

- **Vào:** chạm truyện ở Trang chủ hoặc Thư viện; sau khi tạo truyện mới.
- **Ra:** Dàn ý (8) · Soạn kịch bản (9) · Hồ sơ nhân vật (10) · Thế giới (11) · Storyboard (12) · Đọc thử (17) · Xuất bản (18).

### Bố cục

```
┌───────────────────────────────┐
│ ←                    ▶   ⇪  ⋮ │
│ ┌──────┐ CẬU BÉ GIAO HÀNG     │
│ │ bìa  │ Phiêu lưu · Giả tưởng│
│ │      │ Một cậu bé giao hàng │
│ └──────┘ phát hiện mình…      │
│ ▰▰▰▰▰▰▱▱▱▱ 62% · 13/21 trang  │
│ ┌─ ✦ Bước tiếp theo ────────┐ │
│ │ Chương 2 còn 3 trang chưa │ │
│ │ có tranh.      [Vẽ tiếp →]│ │
│ └───────────────────────────┘ │
│ [Chương][Nhân vật][Thế giới][Ghi chú]
│ ─────────                     │
│ [ ▦ Dàn ý ]                   │
│ ┌───────────────────────────┐ │
│ │ 1  Chiếc hộp biết nói     │ │
│ │    Xong · 8 trang         │ │
│ │    [Kịch bản] [Storyboard]│ │
│ ├───────────────────────────┤ │
│ │ 2  Người gửi bí ẩn        │ │
│ │    Đang vẽ · 5/8 trang ▰▰▱│ │
│ │    [Kịch bản] [Storyboard]│ │
│ └───────────────────────────┘ │
│ [ + Thêm chương ]             │
└───────────────────────────────┘
```

### Thành phần

**Phần đầu (cố định khi cuộn thì thu gọn còn tên truyện)**

| Thành phần | Nội dung |
| --- | --- |
| Thanh trên | ← · ▶ Đọc thử · ⇪ Xuất bản · ⋮ menu (Sửa thông tin, Đổi bìa, Đổi phong cách, Xuất dự án, Xóa truyện) |
| Bìa | Tỉ lệ 2:3; chạm để đổi bìa (tải ảnh, chọn từ trang đã vẽ, hoặc AI tạo) |
| Tên, thể loại, logline | Chạm logline để mở rộng đầy đủ |
| Thanh tiến độ | % và "số trang xong / tổng số trang" |
| Thẻ Bước tiếp theo | Viền tím. AI tóm tắt việc nên làm kế tiếp, kèm một nút đi thẳng tới đó |

**4 tab**

| Tab | Nội dung | Nút thêm |
| --- | --- | --- |
| Chương | Nút "Dàn ý" ở đầu; danh sách chương: số, tên, trạng thái, số trang, thanh tiến độ, 2 nút tắt Kịch bản và Storyboard | "+ Thêm chương" |
| Nhân vật | Lưới 3 cột: ảnh đại diện tròn, tên, vai trò. Nhân vật đã khóa tham chiếu có biểu tượng khóa | "+ Nhân vật" (tạo tay hoặc bằng AI) |
| Thế giới | Danh sách theo nhóm: Địa danh, Phe phái, Thuật ngữ, Sự kiện | "+ Mục mới" |
| Ghi chú | Danh sách ghi chú tự do, mới nhất trước; gồm cả ghi chú lưu từ Trợ lý AI | "+ Ghi chú" |

### Hành động

| Hành động | Phản hồi |
| --- | --- |
| Chạm một dòng chương | Mở Storyboard nếu chương có trang; chưa có trang thì mở Soạn kịch bản |
| Bấm [Kịch bản] / [Storyboard] | Mở thẳng màn tương ứng của chương đó |
| Nhấn giữ dòng chương | Menu: Đổi tên · Nhân bản · Xóa. Kéo để sắp xếp lại |
| Bấm "+ Thêm chương" | Thêm dòng mới ở cuối với ô tên đang sửa |
| Chạm một nhân vật | Mở Hồ sơ nhân vật |
| Chạm một mục thế giới hoặc ghi chú | Mở Thế giới và ghi chú ở đúng mục đó |
| Bấm nút trên thẻ Bước tiếp theo | Đi thẳng tới màn hình được gợi ý |
| Bấm ✕ trên thẻ Bước tiếp theo | Ẩn thẻ cho tới lần mở truyện sau |

### AI

| Thao tác | Mức credit | Kết quả |
| --- | --- | --- |
| Bước tiếp theo | Không tốn credit | Suy ra từ trạng thái dữ liệu (không gọi model): chương chưa có kịch bản, khung chưa có tranh, trang bị gắn cờ cần sửa… |
| Tạo bìa | Nặng | 4 phương án bìa từ logline và nhân vật chính |
| Tạo nhân vật bằng AI | Vừa | Mở Hồ sơ nhân vật với các trường điền sẵn |

### Trạng thái

| Trạng thái | Hiển thị |
| --- | --- |
| Truyện mới tạo | Tab Chương có sẵn "Chương 1" trống. Thẻ Bước tiếp theo: "Bắt đầu bằng dàn ý, hoặc viết luôn kịch bản chương 1" với 2 nút |
| Tab Nhân vật trống | Bong bóng "Truyện chưa có ai cả. Tạo nhân vật chính trước nhé!" + 2 nút: Tạo tay, Tạo bằng AI |
| Tab Thế giới / Ghi chú trống | Bong bóng gợi ý + nút thêm |
| Kịch bản đổi sau khi chia khung | Dòng chương có chấm vàng và nhãn "Kịch bản đã đổi" |
| Xóa chương | Bảng xác nhận yêu cầu gõ lại tên chương |
| Xóa truyện | Bảng xác nhận; truyện vào Thùng rác; quay về Thư viện |
