# C · Viết truyện

Bốn màn hình cho phần chữ của truyện: dàn ý, kịch bản, nhân vật và thế giới.

[← Danh sách màn hình](README.md)

---

## 8. Ý tưởng và dàn ý

**Route:** `Outline`

### Mục đích

Dựng xương sống của truyện: các hồi, các chương trong mỗi hồi, và điều gì xảy ra ở từng chương.

### Đường vào và đường ra

- **Vào:** nút "Dàn ý" ở tab Chương của Tổng quan truyện (7); thẻ Bước tiếp theo.
- **Ra:** chạm "Viết kịch bản" trên một thẻ → Soạn kịch bản (9) của chương đó.

### Bố cục

Bảng cuộn ngang, mỗi cột là một hồi.

```
┌───────────────────────────────┐
│ ←  DÀN Ý                 ⋮    │
│ Logline: Một cậu bé giao…  ✎  │
│ [✦ 3 hướng cốt truyện ·2] [✦ Tìm lỗ hổng ·4]
│───────────────────────────────│
│ HỒI 1 · MỞ ĐẦU     │ HỒI 2 ·  │
│ 2 chương            │ PHÁT TRI│
│ ┌─────────────────┐ │ ┌───────│
│ │ 1 Chiếc hộp     │ │ │ 3 Cuộc│
│ │   biết nói      │ │ │   rượt│
│ │ Minh nhận một   │ │ │ …     │
│ │ gói hàng lạ…    │ │ │       │
│ │ ◎ Minh phát hiện│ │ └───────│
│ │   năng lực      │ │         │
│ │ ● Có kịch bản   │ │ [+ Chươn│
│ └─────────────────┘ │         │
│ ┌─────────────────┐ │         │
│ │ 2 Người gửi…    │ │         │
│ └─────────────────┘ │         │
│ [+ Chương]          │         │
└───────────────────────────────┘
```

### Thành phần

| Thành phần | Nội dung |
| --- | --- |
| Dòng logline | Logline của truyện, 1 dòng; nút ✎ sửa tại chỗ |
| Thanh AI | Hai nút AI: "3 hướng cốt truyện", "Tìm lỗ hổng" |
| Cột hồi | Tiêu đề hồi (sửa được), số chương, danh sách thẻ, nút "+ Chương". Cột rộng 85% màn hình để lộ mép cột kế |
| Thẻ chương | Số thứ tự, tên, tóm tắt (tối đa 4 dòng), dòng mục tiêu (biểu tượng ◎), chấm trạng thái kịch bản |
| Chấm trạng thái | ○ Chưa có kịch bản · ● Có kịch bản · ✔ Đã vẽ xong |
| Cột cuối | Cột trống với nút "+ Hồi" |
| Menu ⋮ | Xem dạng danh sách dọc · Xuất dàn ý ra văn bản · Lịch sử phiên bản |

**Bảng sửa thẻ** (bảng trượt, mở khi chạm thẻ):

| Trường | Nội dung |
| --- | --- |
| Tên chương | Tối đa 60 ký tự |
| Tóm tắt | Tối đa 300 ký tự, có bộ đếm |
| Mục tiêu | Một câu: nhân vật muốn gì, điều gì thay đổi |
| Nhân vật xuất hiện | Chip chọn từ danh sách nhân vật |
| Nút AI | "Mở rộng thành cảnh" |
| Nút | "Viết kịch bản →" · "Xóa chương" |

### Hành động

| Hành động | Phản hồi |
| --- | --- |
| Chạm thẻ | Mở bảng sửa thẻ |
| Nhấn giữ rồi kéo thẻ | Thẻ nhấc lên có bóng cứng, các thẻ khác dạt ra; kéo tới mép màn hình để cuộn sang cột khác. Thả xuống thì số chương đánh lại, rung nhẹ |
| Bấm "+ Chương" | Thêm thẻ trống ở cuối cột, mở bảng sửa |
| Chạm tiêu đề hồi | Sửa tên tại chỗ |
| Nhấn giữ tiêu đề hồi | Menu: Đổi tên · Chuyển trái/phải · Xóa hồi |
| Vuốt ngang | Chuyển cột, có hít dính vào từng cột |

### AI

| Thao tác | Mức | Luồng |
| --- | --- | --- |
| 3 hướng cốt truyện | Vừa | Mở bảng trượt toàn màn hình với 3 thẻ hướng đi (tên hướng, giọng điệu, tóm tắt 3 hồi). Chọn một thẻ → "Dùng hướng này". Nếu dàn ý đã có thẻ, hỏi *Thay thế* hay *Thêm vào cuối* |
| Mở rộng thành cảnh | Vừa | Trong bảng sửa thẻ: hiện danh sách 3–6 cảnh xem trước. Chấp nhận → tạo các cảnh trống có mô tả trong kịch bản chương |
| Tìm lỗ hổng | Nặng | Mở bảng kết quả: danh sách vấn đề, mỗi vấn đề có loại (mâu thuẫn, bỏ lửng, thiếu động cơ), giải thích, nút "Đi tới thẻ". Đánh dấu "Đã xử lý" từng mục |

### Trạng thái

| Trạng thái | Hiển thị |
| --- | --- |
| Dàn ý trống | 3 cột hồi mặc định, trống. Bong bóng lớn ở giữa: "Chưa biết bắt đầu từ đâu? Để AI gợi ý 3 hướng đi." + nút AI + nút phụ "Tự thêm chương" |
| Chưa có logline | Dòng logline thành ô nhập "Viết một câu về truyện của bạn"; nút "3 hướng cốt truyện" mờ đi cho tới khi có logline |
| AI đang chạy | Bảng kết quả hiện 3 thẻ khung xương, nội dung hiện dần; có nút Dừng |
| Xóa hồi còn thẻ | Bảng hỏi chuyển các thẻ sang hồi nào trước khi xóa |
| Xóa thẻ có kịch bản | Bảng xác nhận nêu rõ "Kịch bản và {n} trang của chương này cũng bị xóa" |

---

## 9. Soạn kịch bản

**Route:** `Script`

### Mục đích

Viết kịch bản của một chương theo cảnh và khối (bối cảnh, hành động, thoại, lời dẫn, SFX), có AI viết cùng.

### Đường vào và đường ra

- **Vào:** nút [Kịch bản] ở Tổng quan truyện (7); "Viết kịch bản" ở Dàn ý (8); "Xem kịch bản" ở Storyboard (12).
- **Ra:** "Chia trang" → Storyboard (12). Chạm tên nhân vật → Hồ sơ nhân vật (10).

### Bố cục

```
┌───────────────────────────────┐
│ ←  KỊCH BẢN            ↶ ↷  ⋮ │
│    Chương 2 · Người gửi bí ẩn │
│ ~8 trang · 4 cảnh · Đã lưu ✓  │
│───────────────────────────────│
│ CẢNH 1                  ~2 tr │
│ ▌BỐI CẢNH                     │
│ ▌Con hẻm sau chợ, chiều mưa   │
│                               │
│ ▌HÀNH ĐỘNG                    │
│ ▌Minh dừng xe, nhìn chiếc hộp │
│ ▌rung lên trong giỏ.          │
│                               │
│   (ảnh) MINH · nghĩ           │
│   ┌───────────────────────┐   │
│   │ Lại nữa rồi…          │   │
│   └───────────────────────┘   │
│                               │
│ ▌SFX   RẦM                    │
│        ┄┄ + thêm khối ┄┄      │
│ CẢNH 2                  ~3 tr │
│ …                             │
│───────────────────────────────│
│ [Bối cảnh][Hành động][Thoại][Lời dẫn][SFX] │ [✦]
│ (bàn phím)                    │
└───────────────────────────────┘
```

### Thành phần

| Thành phần | Nội dung |
| --- | --- |
| Thanh trên | ← · Hoàn tác · Làm lại · ⋮ (Chia trang, Lịch sử phiên bản, Chế độ tập trung, Xuất văn bản) |
| Dòng thống kê | Số trang ước tính · số cảnh · trạng thái lưu ("Đang lưu…" / "Đã lưu ✓") |
| Tiêu đề cảnh | "CẢNH n", số trang ước tính; chạm để thu gọn/mở rộng cảnh; nhấn giữ để kéo sắp xếp |
| Khối Bối cảnh | Vạch trái màu xám, nhãn nhỏ, chữ nghiêng |
| Khối Hành động | Vạch trái màu mực, chữ thường |
| Khối Thoại | Thụt vào; ảnh đại diện nhân vật, tên in hoa, kiểu thoại (nói/nghĩ/hét/thì thầm); nội dung trong khung bo góc giống bong bóng |
| Khối Lời dẫn | Khung chữ nhật viền mảnh |
| Khối SFX | Chữ đậm, phông tiêu đề |
| Dòng thêm khối | Đường đứt mờ giữa các khối và cuối mỗi cảnh; chạm để chèn |
| Thanh công cụ trên bàn phím | 5 chip loại khối để đổi loại khối đang sửa hoặc chèn khối mới; nút AI ở cuối |
| Nút cuối trang | "+ Cảnh mới" và nút chính "Chia trang →" |

### Hành động

| Hành động | Phản hồi |
| --- | --- |
| Chạm một khối | Đặt con trỏ, mở bàn phím, thanh công cụ nổi lên |
| Enter ở cuối khối | Tạo khối mới cùng loại bên dưới (sau Thoại thì tạo Thoại mới, chờ chọn nhân vật) |
| Enter ở khối trống | Đổi khối trống thành Hành động; Enter lần nữa thì xóa khối |
| Gõ `@` trong khối Thoại, hoặc chạm tên nhân vật | Mở bảng Chọn nhân vật |
| Chạm kiểu thoại | Đổi vòng: nói → nghĩ → hét → thì thầm |
| Nhấn giữ một khối | Vào chế độ chọn: chọn nhiều khối; thanh dưới đổi thành Sao chép · Xóa · ✦ Viết lại |
| Vuốt trái trên khối | Lộ nút Xóa |
| Kéo tay nắm bên phải khối | Sắp xếp lại, kể cả sang cảnh khác |
| Bấm "Chia trang →" | Mở Storyboard và chạy AI chia trang (có bước xem trước) |

### AI

Bấm nút ✦ trên thanh công cụ mở menu AI theo ngữ cảnh:

| Ngữ cảnh | Thao tác hiện ra | Mức |
| --- | --- | --- |
| Con trỏ ở cuối cảnh | Viết tiếp | Vừa |
| Đang chọn một hay nhiều khối | Viết lại (kèm ô chỉ dẫn tùy chọn) | Vừa |
| Con trỏ trong khối Thoại | Đổi giọng theo nhân vật · Rút gọn | Nhẹ |
| Con trỏ trong khối Hành động | Gợi ý SFX | Nhẹ |
| Cảnh trống có mô tả | Viết cả cảnh | Vừa |

- Kết quả hiện ngay tại chỗ dưới dạng **khối xem trước viền tím**, chữ hiện dần.
- Với Viết lại: bản cũ mờ đi và gạch nhẹ, bản mới ngay dưới để so sánh.
- Ba nút dưới khối xem trước: Bỏ · Thử lại · Chấp nhận.
- Chấp nhận xong, các khối mới giữ dấu tia sáng nhỏ ở lề cho tới khi được sửa.

### Trạng thái

| Trạng thái | Hiển thị |
| --- | --- |
| Chương trống | Cảnh 1 có sẵn một khối Bối cảnh với chữ gợi ý "Câu chuyện bắt đầu ở đâu?". Bong bóng: "Gõ luôn, hoặc để AI viết cảnh mở đầu từ dàn ý." |
| Chương có cảnh từ Dàn ý | Mỗi cảnh hiện mô tả từ dàn ý trong khung nét đứt, kèm nút "✦ Viết cả cảnh" |
| Thoại quá 80 ký tự | Gạch chân vàng; chạm hiện gợi ý "Thoại dài khó vừa bong bóng" + nút "✦ Rút gọn" |
| Thoại chưa gán nhân vật | Ảnh đại diện là dấu "?", tên hiện "Chọn nhân vật" màu đỏ son |
| Kịch bản đã chia trang | Lề phải mỗi khối có nhãn nhỏ "T3·K2" (trang 3, khung 2); chạm để nhảy tới khung đó |
| Sửa khối đã chia trang | Dải mỏng trên cùng: "Kịch bản đã đổi sau khi chia trang" + nút "Cập nhật storyboard" |
| Chế độ tập trung | Ẩn thanh trên và dòng thống kê; chỉ còn chữ và thanh công cụ |
| Lịch sử phiên bản | Bảng trượt: danh sách 20 phiên bản theo thời gian; xem trước và Khôi phục |

---

## 10. Hồ sơ nhân vật

**Route:** `Character`

### Mục đích

Định nghĩa một nhân vật: tính cách để AI viết đúng giọng, ngoại hình và ảnh tham chiếu để AI vẽ đúng mặt.

### Đường vào và đường ra

- **Vào:** tab Nhân vật ở Tổng quan truyện (7); chạm tên nhân vật ở Soạn kịch bản (9); bảng Chọn nhân vật → "Tạo nhanh".
- **Ra:** quay lại màn trước. Chạm một nhân vật trong mục Quan hệ → Hồ sơ của nhân vật đó.

### Bố cục

```
┌───────────────────────────────┐
│ ←  NHÂN VẬT              ⋮    │
│        ┌────────┐             │
│        │  ảnh   │  🔒         │
│        │đại diện│             │
│        └────────┘             │
│          MINH                 │
│   Nhân vật chính · 16 tuổi    │
│ [ Hồ sơ ][ Thiết kế ][ Quan hệ ]
│ ──────                        │
│ [✦ Điền hồ sơ từ từ khóa · 2] │
│                               │
│ Tính cách                     │
│ (tốt bụng)(hậu đậu)(lì) [+]   │
│                               │
│ Mục tiêu                      │
│ [Tìm ra ai gửi chiếc hộp___]  │
│                               │
│ Điểm yếu                      │
│ [Sợ làm người khác thất vọng] │
│                               │
│ Cách nói chuyện               │
│ [Nói nhanh, hay tự chọc mình] │
└───────────────────────────────┘
```

### Thành phần

**Phần đầu**

| Thành phần | Nội dung |
| --- | --- |
| Ảnh đại diện | Vuông bo góc, viền mực; lấy từ ảnh mặt trong bảng thiết kế. Chưa có ảnh: chữ cái đầu của tên trên nền chấm tram |
| Biểu tượng khóa | Hiện khi đã khóa tham chiếu |
| Tên | Sửa tại chỗ, tối đa 30 ký tự |
| Vai trò · tuổi | Chạm để sửa: vai trò chọn từ danh sách; tuổi nhập số hoặc chữ ("khoảng 30") |
| Menu ⋮ | Nhân bản · Xuất hiện ở đâu (danh sách chương) · Xóa nhân vật |

**Tab Hồ sơ**

| Trường | Kiểu | Ghi chú |
| --- | --- | --- |
| Nút AI điền hồ sơ | Nút AI | Mở ô nhập từ khóa, AI điền mọi trường còn trống |
| Tính cách | Chip tự do, tối đa 8 | |
| Mục tiêu | Một dòng | |
| Điểm yếu | Một dòng | |
| Cách nói chuyện | Nhiều dòng | AI dùng trường này khi "Đổi giọng" thoại |
| Tiểu sử | Nhiều dòng, tối đa 1000 ký tự | |
| Ghi chú | Nhiều dòng | Không gửi cho AI |

**Tab Thiết kế**

```
│ Ngoại hình (AI dùng khi vẽ)   │
│ ┌───────────────────────────┐ │
│ │ Tóc đen ngắn rối, mắt to, │ │
│ │ áo khoác giao hàng cam…   │ │
│ └───────────────────────────┘ │
│ [✦ Vẽ bảng thiết kế · 12]     │
│                               │
│ ┌──────────┐ ┌──────────┐     │
│ │   MẶT    │ │ TOÀN THÂN│     │
│ │          │ │          │     │
│ └──────────┘ └──────────┘     │
│ BIỂU CẢM                      │
│ ┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐│
│ │vui││buồn││giận││ngạc││sợ ││ngượng│
│ └───┘└───┘└───┘└───┘└───┘└───┘│
│                               │
│ [ 🔒 Khóa làm ảnh tham chiếu ]│
```

| Thành phần | Nội dung |
| --- | --- |
| Ô Ngoại hình | Mô tả bằng chữ, tối đa 400 ký tự; có gợi ý các mục nên có: tóc, mắt, vóc dáng, trang phục, đặc điểm nhận dạng |
| Nút vẽ bảng thiết kế | Tạo cả 8 ô một lượt |
| Ô Mặt, Toàn thân | Ô lớn; chạm để xem lớn |
| 6 ô Biểu cảm | Ô nhỏ có nhãn |
| Menu mỗi ô (nhấn giữ) | ✦ Tạo lại ô này · Tải ảnh lên · Sửa trên canvas · Xóa |
| Nút Khóa | Bật khi có ít nhất ảnh Mặt và Toàn thân |

**Tab Quan hệ**

| Thành phần | Nội dung |
| --- | --- |
| Danh sách quan hệ | Mỗi dòng: ảnh đại diện nhân vật kia, tên, nhãn quan hệ (bạn thân, kẻ thù…), ghi chú 1 dòng |
| Nút "+ Quan hệ" | Mở bảng Chọn nhân vật rồi nhập nhãn |

Quan hệ là hai chiều: thêm ở nhân vật này thì hiện ở nhân vật kia.

### Hành động

| Hành động | Phản hồi |
| --- | --- |
| Sửa bất kỳ trường nào | Lưu tự động |
| Bấm "Vẽ bảng thiết kế" | Bảng xác nhận credit → 8 ô hiện đường tốc độ rồi lần lượt hiện ảnh |
| Nhấn giữ một ô → Tạo lại | Chỉ ô đó chạy lại; ảnh cũ vào lịch sử của ô |
| Bấm Khóa | Bảng giải thích "Từ giờ AI sẽ vẽ Minh theo các ảnh này" → xác nhận → nút đổi thành "🔓 Mở khóa để sửa" |
| Bấm Mở khóa | Hỏi có đánh dấu các khung đã vẽ nhân vật này là "cần vẽ lại" không |
| Sửa ô Ngoại hình khi đã khóa | Chặn, hiện gợi ý "Mở khóa để sửa ngoại hình" |

### AI

| Thao tác | Mức | Kết quả |
| --- | --- | --- |
| Điền hồ sơ từ từ khóa | Vừa | Điền các trường còn trống; trường đã có nội dung không bị ghi đè |
| Viết mô tả ngoại hình | Nhẹ | Từ tính cách và vai trò, gợi ý đoạn mô tả ngoại hình |
| Vẽ bảng thiết kế | Nặng | 8 ảnh: mặt, toàn thân, 6 biểu cảm, theo phong cách của truyện |
| Tạo lại một ô | Nặng (1 ảnh) | 1 ảnh, có dùng các ô khác làm tham chiếu |

### Trạng thái

| Trạng thái | Hiển thị |
| --- | --- |
| Nhân vật mới | Tab Hồ sơ mở sẵn, con trỏ ở ô Tên; bong bóng "Nhập tên rồi để AI lo phần còn lại, nếu muốn" |
| Tạo nhanh từ kịch bản | Chỉ có tên; dải nhắc "Hồ sơ còn trống" |
| Chưa có ô Ngoại hình | Nút vẽ bảng thiết kế mờ; gợi ý "Mô tả ngoại hình trước đã" |
| Đang vẽ | Mỗi ô có đường tốc độ; thanh trên hiện "Đang vẽ 3/8"; có nút Dừng (hoàn credit phần chưa vẽ) |
| Một ô vẽ lỗi | Ô hiện biểu tượng lỗi + "Thử lại"; credit của ô đó được hoàn |
| Bị từ chối do nội dung | Thông báo "Mô tả chưa phù hợp chính sách nội dung. Hãy sửa mô tả ngoại hình." Không trừ credit |
| Xóa nhân vật đang được dùng | Bảng xác nhận nêu "{n} lời thoại và {m} khung đang dùng nhân vật này"; sau khi xóa, thoại chuyển thành "chưa gán nhân vật" |

---

## 11. Thế giới và ghi chú

**Route:** `World`

### Mục đích

Ghi lại bối cảnh của truyện để người dùng tra cứu và để AI viết, vẽ không sai lệch.

### Đường vào và đường ra

- **Vào:** tab Thế giới hoặc tab Ghi chú ở Tổng quan truyện (7); nút "Lưu thành ghi chú" ở Trợ lý AI (19).
- **Ra:** quay lại; chạm nhân vật liên quan → Hồ sơ nhân vật (10).

### Bố cục

Màn hình có hai chế độ: **danh sách** và **chi tiết một mục**.

```
 DANH SÁCH                        CHI TIẾT
┌───────────────────────────┐   ┌───────────────────────────┐
│ ←  THẾ GIỚI        🔍  ⋮  │   │ ←  ĐỊA DANH            ⋮  │
│ [Tất cả][Địa danh][Phe phái]  │ ┌───────────────────────┐ │
│ [Thuật ngữ][Sự kiện][Ghi chú] │ │   ảnh concept (16:9)  │ │
│ [ ≡ Danh sách | ⟷ Dòng thời gian ]│ └───────────────────────┘ │
│                           │   │ ○ ○ ○  [+ ảnh] [✦ Vẽ ·4]  │
│ ĐỊA DANH                  │   │                           │
│ ┌────┐ Chợ Bến Cũ         │   │ CHỢ BẾN CŨ                │
│ │ảnh │ Khu chợ ven sông…  │   │ ┌───────────────────────┐ │
│ └────┘                    │   │ │ Khu chợ ven sông, nơi │ │
│ ┌────┐ Kho số 7           │   │ │ Minh nhận hàng mỗi…   │ │
│ └────┘                    │   │ └───────────────────────┘ │
│ PHE PHÁI                  │   │        [✦ Viết mô tả · 1] │
│  ◆  Hội Người Nghe        │   │                           │
│ THUẬT NGỮ                 │   │ Nhân vật liên quan        │
│  ❝  "Tiếng vọng"          │   │ (Minh)(Bà Tư) [+]         │
│                           │   │ Xuất hiện ở               │
│            [ + Mục mới ]  │   │ Chương 1 · Chương 2       │
└───────────────────────────┘   └───────────────────────────┘
```

### Thành phần

**Chế độ danh sách**

| Thành phần | Nội dung |
| --- | --- |
| Chip loại | Tất cả · Địa danh · Phe phái · Thuật ngữ · Sự kiện · Ghi chú |
| Công tắc kiểu xem | Danh sách / Dòng thời gian |
| Dòng mục | Ảnh thu nhỏ (hoặc biểu tượng loại), tiêu đề, 1 dòng mô tả |
| Nút "+ Mục mới" | Mở bảng chọn loại rồi vào chi tiết mục mới |
| Menu ⋮ | ✦ Kiểm tra mâu thuẫn với kịch bản · Xuất wiki ra văn bản |

**Chế độ dòng thời gian** (chỉ các mục Sự kiện)

```
│  Trước truyện                 │
│  ●── Chiếc hộp được chế tạo   │
│  │                            │
│  Chương 1                     │
│  ●── Minh nhận gói hàng       │
│  ●── Lần đầu nghe tiếng nói   │
│  │                            │
│  Chương 3                     │
│  ●── Kho số 7 cháy            │
```

Sự kiện xếp theo mốc: "Trước truyện", từng chương, "Sau truyện". Kéo để đổi thứ tự trong một mốc.

**Chế độ chi tiết**

| Thành phần | Nội dung |
| --- | --- |
| Ảnh | Dải ảnh vuốt ngang, tối đa 6; nút thêm ảnh và nút AI vẽ concept |
| Tiêu đề | Sửa tại chỗ |
| Nội dung | Ô nhiều dòng, định dạng đơn giản (đậm, gạch đầu dòng) |
| Trường theo loại | Sự kiện: mốc thời gian. Thuật ngữ: cách đọc/phiên âm. Phe phái: thủ lĩnh (chọn nhân vật) |
| Nhân vật liên quan | Chip nhân vật; nút + mở bảng Chọn nhân vật |
| Xuất hiện ở | Tự động: các chương có kịch bản nhắc tới tiêu đề mục này |
| Công tắc "Gửi cho AI" | Mặc định bật; tắt thì mục này không vào hồ sơ truyện (Ghi chú mặc định tắt) |

### Hành động

| Hành động | Phản hồi |
| --- | --- |
| Chạm một dòng | Mở chi tiết |
| Nhấn giữ một dòng | Menu: Đổi loại · Nhân bản · Xóa |
| Bấm 🔍 | Tìm trong tiêu đề và nội dung |
| Chạm ảnh ở chi tiết | Xem toàn màn hình; phóng to bằng hai ngón |
| Nhấn giữ ảnh | Đặt làm ảnh chính · Dùng làm ảnh tham chiếu nền cho AI tạo ảnh khung · Xóa |

### AI

| Thao tác | Mức | Kết quả |
| --- | --- | --- |
| Viết mô tả | Nhẹ | Từ tiêu đề và loại, viết đoạn mô tả hợp với truyện; hiện dạng xem trước |
| Vẽ ảnh concept | Nặng | 4 phương án ảnh cho địa danh theo phong cách truyện; chọn để thêm vào mục |
| Kiểm tra mâu thuẫn | Nặng | Đối chiếu wiki với kịch bản mọi chương; liệt kê điểm lệch kèm nút đi tới khối kịch bản |

### Trạng thái

| Trạng thái | Hiển thị |
| --- | --- |
| Chưa có mục nào | Bong bóng "Truyện của bạn diễn ra ở đâu? Thêm một địa danh để bắt đầu." + nút "+ Địa danh" |
| Dòng thời gian chưa có sự kiện | Trục trống với các mốc chương; gợi ý "Thêm sự kiện để thấy trình tự câu chuyện" |
| Mục chưa có ảnh | Vùng ảnh thu thành dải mỏng với hai nút: Thêm ảnh, ✦ Vẽ |
| Ghi chú lưu từ Trợ lý AI | Có nhãn "Từ trợ lý" và ngày; nội dung sửa được như ghi chú thường |
| Đủ 6 ảnh | Nút thêm ảnh và nút AI vẽ mờ đi, gợi ý "Tối đa 6 ảnh mỗi mục" |
