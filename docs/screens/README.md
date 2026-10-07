# Mangaka AI — Mô tả giao diện các màn hình

Bộ tài liệu này mô tả giao diện của 20 màn hình: bố cục, thành phần, hành động, trạng thái. Quy tắc xử lý của từng tính năng nằm ở [../features.md](../features.md); phong cách (màu, chữ) nằm ở [../mangaka-ai.md](../mangaka-ai.md#phong-cách-thiết-kế).

## Danh sách màn hình

| # | Màn hình | Route | Tài liệu |
| --- | --- | --- | --- |
| 1 | Chào mừng | `Welcome` | [A · Khởi đầu](a-khoi-dau.md#1-chào-mừng) |
| 2 | Đăng nhập | `SignIn` (chưa có, vào như khách) | [A · Khởi đầu](a-khoi-dau.md#2-đăng-nhập) |
| 3 | Chọn sở thích | `Preferences` | [A · Khởi đầu](a-khoi-dau.md#3-chọn-sở-thích) |
| 4 | Trang chủ | `Home` (tab) | [B · Trang chủ và dự án](b-trang-chu-du-an.md#4-trang-chủ) |
| 5 | Thư viện truyện | `Library` (tab) | [B · Trang chủ và dự án](b-trang-chu-du-an.md#5-thư-viện-truyện) |
| 6 | Tạo truyện mới | `NewProject` | [B · Trang chủ và dự án](b-trang-chu-du-an.md#6-tạo-truyện-mới) |
| 7 | Tổng quan truyện | `Project` | [B · Trang chủ và dự án](b-trang-chu-du-an.md#7-tổng-quan-truyện) |
| 8 | Ý tưởng và dàn ý | `Outline` | [C · Viết truyện](c-viet-truyen.md#8-ý-tưởng-và-dàn-ý) |
| 9 | Soạn kịch bản | `Script` | [C · Viết truyện](c-viet-truyen.md#9-soạn-kịch-bản) |
| 10 | Hồ sơ nhân vật | `Character` | [C · Viết truyện](c-viet-truyen.md#10-hồ-sơ-nhân-vật) |
| 11 | Thế giới và ghi chú | `World` | [C · Viết truyện](c-viet-truyen.md#11-thế-giới-và-ghi-chú) |
| 12 | Storyboard chương | `Storyboard` | [D · Vẽ và dàn trang](d-ve-dan-trang.md#12-storyboard-chương) |
| 13 | Dàn khung trang | `PanelLayout` | [D · Vẽ và dàn trang](d-ve-dan-trang.md#13-dàn-khung-trang) |
| 14 | Canvas vẽ | `Canvas` | [D · Vẽ và dàn trang](d-ve-dan-trang.md#14-canvas-vẽ) |
| 15 | AI tạo ảnh khung | `Generate` | [D · Vẽ và dàn trang](d-ve-dan-trang.md#15-ai-tạo-ảnh-khung) |
| 16 | Thoại và hiệu ứng | `Lettering` | [D · Vẽ và dàn trang](d-ve-dan-trang.md#16-thoại-và-hiệu-ứng) |
| 17 | Đọc thử | `Preview` | [E · Hoàn thiện](e-hoan-thien.md#17-đọc-thử) |
| 18 | Xuất bản và chia sẻ | `Export` | [E · Hoàn thiện](e-hoan-thien.md#18-xuất-bản-và-chia-sẻ) |
| 19 | Trợ lý AI | `Assistant` (tab) | [F · AI và cá nhân](f-ai-ca-nhan.md#19-trợ-lý-ai) |
| 20 | Hồ sơ và cài đặt | `Profile` (tab) | [F · AI và cá nhân](f-ai-ca-nhan.md#20-hồ-sơ-và-cài-đặt) |

## Sơ đồ điều hướng

```
Welcome ─▶ Preferences ─▶ ┐
                          ▼
┌──────────────── Thanh tab ────────────────┐
│ Home │ Library │ (+) │ Assistant │ Profile │
└──┬───────┬───────┬────────────────────────┘
   │       │       └─▶ NewProject ─┐
   └───────┴───────────────────────┴─▶ Project
                                         ├─▶ Outline
                                         ├─▶ Script ◀──────────┐
                                         ├─▶ Character         │
                                         ├─▶ World             │
                                         └─▶ Storyboard ───────┤
                                               ├─▶ PanelLayout │
                                               │     ├─▶ Canvas
                                               │     ├─▶ Generate
                                               │     └─▶ Lettering
                                               ├─▶ Preview
                                               └─▶ Export
```

- Ba màn Khởi đầu chỉ hiện ở lần mở app đầu tiên.
- Thanh tab chỉ hiện ở 4 màn gốc (Home, Library, Assistant, Profile). Mọi màn bên trong một truyện ẩn thanh tab để dành chỗ làm việc.
- Nút (+) ở giữa thanh tab không phải một tab; nó mở NewProject dạng toàn màn hình trượt từ dưới lên.

## Quy ước chung

### Thanh trên (app bar)

- Cao 56dp. Trái: nút quay lại. Giữa: tiêu đề, một dòng, cắt bằng dấu ba chấm. Phải: tối đa 2 nút hành động, phần còn lại vào menu ba chấm.
- Các màn làm việc trong truyện hiện **tên chương** làm phụ đề dưới tiêu đề.

### Nút AI

- Mọi nút gọi AI có nền tím, biểu tượng tia sáng ở trái, và **số credit** ở phải. Ví dụ: `✦ Viết tiếp · 2`.
- Trạng thái:
  - *Sẵn sàng:* nền tím đặc.
  - *Đang chạy:* đổi thành nút "Dừng", có đường tốc độ chạy trong nền.
  - *Cần mạng:* nền xám, nhãn phụ "Cần mạng".
  - *Hết credit:* nền tím nhạt, bấm vào mở bảng Mua credit.

### Nút trợ lý nổi

- Ở mọi màn làm việc trong truyện (8–18) có một nút tròn nổi ở góc dưới phải (góc dưới trái nếu chọn tay thuận trái), màu tím, hình bong bóng thoại.
- Bấm mở Trợ lý AI dạng bảng trượt chiếm 85% chiều cao, kèm ngữ cảnh màn hình hiện tại.
- Ở Canvas vẽ, nút thu nhỏ còn một nửa và mờ 50% để không che tranh.

### Bảng xem trước kết quả AI

Mọi kết quả AI dạng chữ hiện trong một thẻ viền tím với ba nút cố định:

```
┌─ ✦ Gợi ý của AI ─────────────────────┐
│ (nội dung hiện dần)                   │
│                                       │
│ [ Bỏ ]   [ ↻ Thử lại · 2 ]  [ Chấp nhận ] │
└───────────────────────────────────────┘
```

### Các bảng trượt dùng chung (bottom sheet)

| Bảng | Mở từ | Nội dung |
| --- | --- | --- |
| Mua credit | Nút AI khi hết credit, Trang chủ, Hồ sơ | Số dư, các gói credit, gói tháng |
| Chọn nhân vật | Soạn kịch bản, AI tạo ảnh khung, Thoại | Danh sách nhân vật có ảnh đại diện, ô tìm, nút "Tạo nhanh" |
| Xác nhận thao tác AI nặng | Trước tạo ảnh, phân tích cả truyện | Mô tả thao tác, số credit, ô "Không hỏi lại" |
| Xác nhận xóa | Mọi thao tác xóa | Tên thứ bị xóa, hậu quả, nút Xóa màu đỏ |

### Trạng thái chung

- **Đang tải:** khung xương (skeleton) theo đúng hình dạng nội dung, không dùng vòng xoay toàn màn hình.
- **Trống:** một hình minh họa nét mực nhỏ, một bong bóng thoại nói rõ bước tiếp theo, và một nút hành động chính.
- **Lỗi:** thông báo ngắn nói điều gì hỏng và nút Thử lại. Lỗi của thao tác AI luôn ghi rõ "Credit đã được hoàn lại".
- **Không có mạng:** dải mỏng dưới thanh trên: "Đang ngoại tuyến · tính năng AI tạm tắt".
- **Thông báo nhanh (toast):** hiện 3 giây ở trên thanh tab; hành động xóa có nút "Hoàn tác".

### Cử chỉ chung

| Cử chỉ | Ý nghĩa |
| --- | --- |
| Vuốt từ mép trái | Quay lại (trừ Canvas vẽ và Dàn khung trang, nơi vuốt dùng để vẽ) |
| Nhấn giữ một mục | Mở menu ngữ cảnh |
| Kéo sau khi nhấn giữ | Sắp xếp lại |
| Kéo xuống ở đầu danh sách | Làm mới (chỉ ở Thư viện và Lịch sử credit) |

### Số liệu trong hình phác thảo

Số credit trên các nút AI (ví dụ `· 2`, `· 4`), số dư, lượng credit miễn phí mỗi ngày và các giới hạn ký tự trong hình phác thảo là **số minh họa**. Giá credit thật chỉ chốt sau khi chọn model tạo ảnh.

### Mẫu mô tả mỗi màn hình

Mỗi màn hình trong các file nhóm được mô tả theo cùng một khung:

1. **Mục đích** — màn hình giúp người dùng làm gì.
2. **Đường vào và đường ra** — tới từ đâu, đi tiếp đâu.
3. **Bố cục** — phác thảo vị trí các vùng.
4. **Thành phần** — từng phần tử và nội dung của nó.
5. **Hành động** — người dùng làm gì, app phản hồi thế nào.
6. **AI** — các thao tác AI có trong màn hình.
7. **Trạng thái** — trống, đang tải, lỗi, trường hợp biên.
