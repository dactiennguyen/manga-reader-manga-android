# D · Vẽ và dàn trang

Năm màn hình biến kịch bản thành trang manga: storyboard, dàn khung, vẽ tay, AI tạo ảnh, đặt thoại và hiệu ứng.

Ba màn 14, 15, 16 cùng làm việc trên **một khung hoặc một trang**; người dùng chuyển qua lại giữa chúng bằng thanh chế độ ở đáy màn Dàn khung trang.

[← Danh sách màn hình](README.md)

---

## 12. Storyboard chương

**Route:** `Storyboard`

### Mục đích

Nhìn cả chương dưới dạng các trang thu nhỏ: biết trang nào xong, trang nào còn trống, và sắp xếp lại thứ tự.

### Đường vào và đường ra

- **Vào:** nút [Storyboard] hoặc chạm dòng chương ở Tổng quan truyện (7); "Chia trang" ở Soạn kịch bản (9).
- **Ra:** chạm trang → Dàn khung trang (13). ▶ → Đọc thử (17). ⇪ → Xuất bản (18). "Xem kịch bản" → Soạn kịch bản (9).

### Bố cục

```
┌───────────────────────────────┐
│ ←  STORYBOARD         ▶  ⇪  ⋮ │
│    Chương 2 · Người gửi bí ẩn │
│ 8 trang · 5 xong · 2 cần sửa  │
│ ▰▰▰▰▰▰▱▱▱▱ 62%                │
│ [✦ Chia trang từ kịch bản · 3]│
│───────────────────────────────│
│        ← hướng đọc            │
│ ┌──────┐┌──────┐   ┌──────┐   │
│ │┌─┬──┐││┌────┐│   │┌────┐│   │
│ ││ │  ││││    ││   ││    ││   │
│ │├─┴──┤││├──┬─┤│   │├────┤│   │
│ ││    ││││  │ ││   ││    ││   │
│ │└────┘││└──┴─┘│   │└────┘│   │
│ └──────┘└──────┘   └──────┘   │
│   3 ✔     2 ✔        1 ✔      │
│                               │
│ ┌──────┐┌──────┐              │
│ │  ⚑   ││ trống│              │
│ │ ░░░░ ││  +   │              │
│ └──────┘└──────┘              │
│   5 ◐     4 ○                 │
│                 [ + Trang ]   │
└───────────────────────────────┘
```

### Thành phần

| Thành phần | Nội dung |
| --- | --- |
| Thanh trên | ← · ▶ Đọc thử · ⇪ Xuất bản · ⋮ (Xem kịch bản, Chọn nhiều, Kiểu xem, Tạo ảnh hàng loạt) |
| Dòng thống kê | Tổng số trang · số trang xong · số trang gắn cờ cần sửa |
| Thanh tiến độ chương | % trang xong |
| Nút AI chia trang | Hiện khi chương có kịch bản chưa được chia hết |
| Chỉ dẫn hướng đọc | Mũi tên nhỏ "← hướng đọc" (trang manga) hoặc "↓ cuộn dọc" (webtoon) |
| Thumbnail trang | Hình thu nhỏ trang với đường viền khung thật và tranh đã vẽ; số trang và biểu tượng trạng thái bên dưới |
| Biểu tượng trạng thái | ○ Trống · ▢ Đã chia khung · ◐ Đang vẽ · ✔ Xong |
| Cờ cần sửa | ⚑ đỏ son ở góc thumbnail |
| Nút "+ Trang" | Nổi ở góc dưới; thêm trang trống vào cuối |

**Cách xếp thumbnail**

- *Trang manga:* xếp từ **phải sang trái**. Trang 1 đứng riêng; từ trang 2 ghép thành cặp trang đôi (2–3, 4–5…), hai trang trong cặp sát nhau.
- *Webtoon:* một cột dọc, thumbnail cao theo chiều dài thật của dải.
- Kiểu xem thay thế trong menu: **Danh sách** — mỗi trang một dòng, bên cạnh là mô tả từng khung từ kịch bản.

### Hành động

| Hành động | Phản hồi |
| --- | --- |
| Chạm thumbnail | Mở Dàn khung trang của trang đó |
| Nhấn giữ thumbnail | Menu: Đánh dấu xong/chưa xong · Nhân bản · Chèn trang trước/sau · Gỡ cờ · Xóa |
| Nhấn giữ rồi kéo | Sắp xếp lại; các cặp trang đôi tự ghép lại theo thứ tự mới |
| Chạm ô "trống +" | Mở Dàn khung trang ở bước chọn mẫu khung |
| Menu → Chọn nhiều | Ô chọn hiện trên từng thumbnail; thanh dưới: Xóa · Đánh dấu xong · ✦ Tạo ảnh hàng loạt |
| Chạm cờ ⚑ | Hiện ghi chú đã viết lúc đọc thử |

### AI

| Thao tác | Mức | Luồng |
| --- | --- | --- |
| Chia trang từ kịch bản | Vừa | Mở bảng xem trước toàn màn hình (xem dưới) |
| Tạo ảnh hàng loạt | Nặng × số khung | Chọn các trang → app đếm số khung đã có mô tả nhưng chưa có tranh → bảng xác nhận tổng credit → chạy nền, từng thumbnail cập nhật khi có ảnh |

**Bảng xem trước chia trang**

```
┌───────────────────────────────┐
│ ✕  CHIA TRANG                 │
│ Số trang:  [−]  8  [+]        │
│ (AI đề xuất 8 · ít hơn = dồn) │
│───────────────────────────────│
│ TRANG 1 · 4 khung             │
│  1  Toàn · Con hẻm trong mưa  │
│  2  Trung · Minh dừng xe      │
│  3  Cận · Chiếc hộp rung      │
│  4  Đặc tả · Mắt Minh mở to   │
│     "Lại nữa rồi…"            │
│ TRANG 2 · 5 khung             │
│  …                            │
│───────────────────────────────│
│ [ ↻ Chia lại · 3 ] [ Áp dụng ]│
└───────────────────────────────┘
```

- Mỗi khung hiện: số, góc máy, mô tả, và thoại thuộc khung.
- Đổi số trang rồi bấm "Chia lại" để AI dồn hoặc giãn.
- Áp dụng: tạo trang với bố cục khung tương ứng số khung; mỗi khung được gắn mô tả và liên kết tới khối kịch bản.

### Trạng thái

| Trạng thái | Hiển thị |
| --- | --- |
| Chương chưa có trang, có kịch bản | Bong bóng "Kịch bản đã sẵn sàng. Để AI chia thành trang nhé?" + nút AI + nút phụ "Tự thêm trang" |
| Chương chưa có trang, chưa có kịch bản | Bong bóng "Bạn có thể viết kịch bản trước, hoặc vẽ luôn." + 2 nút: Viết kịch bản, Thêm trang trống |
| Kịch bản đổi sau khi chia | Dải vàng: "Kịch bản có 3 khối mới chưa vào trang nào" + nút "Chia phần mới" |
| Đang tạo ảnh hàng loạt | Thanh tiến độ dính dưới thanh trên "Đang vẽ 4/12 khung" + nút Dừng; thumbnail đang vẽ có đường tốc độ |
| Xóa trang có tranh | Bảng xác nhận; thông báo nhanh có Hoàn tác |

---

## 13. Dàn khung trang

**Route:** `PanelLayout`

### Mục đích

Chia một trang thành các khung và là **trung tâm làm việc của trang**: từ đây vào vẽ, tạo ảnh AI, đặt thoại cho từng khung.

### Đường vào và đường ra

- **Vào:** chạm thumbnail ở Storyboard (12); nút "Vẽ tiếp" ở Trang chủ.
- **Ra:** chạm khung ở chế độ Tranh → Canvas vẽ (14) hoặc AI tạo ảnh khung (15). Chế độ Thoại → Thoại và hiệu ứng (16). Vuốt ngang ở vùng ngoài trang → trang trước/sau.

### Bố cục

```
┌───────────────────────────────┐
│ ←  TRANG 3 / 8     ↶ ↷  ✔  ⋮  │
│───────────────────────────────│
│     ┌─────────────────────┐   │
│     │┌─────────┬─────────┐│   │
│     ││    2    │    1    ││   │
│     ││         │         ││   │
│     │├─────────┴─────────┤│   │
│     ││         3         ││   │
│     ││   (khung đang chọn,│   │
│     ││    viền đỏ son)   ││   │
│     │├──────┬────────────┤│   │
│     ││  5   │     4      ││   │
│     │└──────┴────────────┘│   │
│     └─────────────────────┘   │
│ ┌─ Khung 3 ─────────────────┐ │
│ │ Cận · Chiếc hộp rung lên  │ │
│ │ [✎ Vẽ] [✦ AI vẽ ·4] [⋯]  │ │
│ └───────────────────────────┘ │
│───────────────────────────────│
│  [ ▦ Khung ]  [ ✎ Tranh ]  [ ❝ Thoại ] │
└───────────────────────────────┘
```

### Thành phần

| Thành phần | Nội dung |
| --- | --- |
| Thanh trên | ← · "Trang n / tổng" (chạm để nhảy trang) · Hoàn tác · Làm lại · ✔ Đánh dấu trang xong · ⋮ |
| Vùng trang | Trang hiện đầy đủ trên nền xám, đổ bóng cứng. Phóng to/di chuyển bằng hai ngón |
| Số thứ tự khung | Số nhỏ trong vòng tròn ở góc mỗi khung, theo thứ tự đọc |
| Khung đang chọn | Viền đỏ son 3dp; các tay nắm ở cạnh và góc (chỉ ở chế độ Khung) |
| Thẻ khung | Thẻ nổi phía dưới khi chọn một khung: góc máy, mô tả từ kịch bản, các nút hành động |
| Thanh chế độ | 3 chế độ: **Khung** (sửa bố cục) · **Tranh** (vẽ/tạo ảnh) · **Thoại** (bong bóng, hiệu ứng) |
| Menu ⋮ | Xem kịch bản của trang · Xóa mọi khung · Sao chép bố cục · Dán bố cục · Hiện lưới an toàn |

**Thanh công cụ ở chế độ Khung** (thay cho thẻ khung khi không chọn khung nào)

| Công cụ | Chức năng |
| --- | --- |
| Mẫu | Mở bảng mẫu khung |
| Cắt | Vạch một đường qua khung để chia đôi |
| Gộp | Chạm hai khung kề nhau để gộp |
| Rãnh | Thanh trượt độ rộng rãnh ngang và dọc |
| Thứ tự | Chạm lần lượt các khung để đánh số lại |
| ✦ Gợi ý | AI đề xuất bố cục |

**Bảng mẫu khung**

- Chip lọc theo số khung: 1 · 2 · 3 · 4 · 5 · 6 · 7.
- Chip kiểu: Lưới đều · Khung chéo · Tràn lề · 4-koma.
- Lưới 3 cột các mẫu thu nhỏ; chạm để xem trước ngay trên trang, bấm "Dùng mẫu này" để áp dụng.

### Hành động

**Chế độ Khung**

| Hành động | Phản hồi |
| --- | --- |
| Chạm khung | Chọn khung, hiện tay nắm |
| Kéo cạnh chung giữa hai khung | Cả hai khung đổi kích thước; hít dính ở các mốc 1/2, 1/3, 1/4 kèm rung nhẹ |
| Kéo tay nắm góc | Làm nghiêng cạnh khung (tạo khung chéo) |
| Công cụ Cắt + vạch qua khung | Đường xem trước nét đứt đi theo ngón tay; thả tay thì khung chia đôi theo đường đó |
| Công cụ Gộp + chạm 2 khung | Gộp nếu hai khung chung trọn một cạnh; không thì rung báo lỗi |
| Nhấn giữ khung | Menu: Tràn lề bật/tắt · Bỏ viền · Nhân đôi · Xóa khung |

**Chế độ Tranh**

| Hành động | Phản hồi |
| --- | --- |
| Chạm khung | Chọn khung, hiện thẻ khung |
| Bấm [✎ Vẽ] | Mở Canvas vẽ cho khung đó |
| Bấm [✦ AI vẽ] | Mở AI tạo ảnh khung |
| Bấm [⋯] | Sửa mô tả khung · Đổi góc máy · Căn chỉnh tranh trong khung · Xóa tranh |
| Chạm hai lần vào khung | Vào thẳng Canvas vẽ |
| Kéo trong khung đã có tranh (sau khi chọn "Căn chỉnh") | Di chuyển, phóng to tranh bên trong khung |

**Chế độ Thoại**: chuyển sang màn Thoại và hiệu ứng (16), giữ nguyên trang và mức phóng to.

### AI

| Thao tác | Mức | Kết quả |
| --- | --- | --- |
| Gợi ý bố cục | Nhẹ | 3 bố cục theo nội dung trang: cảnh hành động → nhiều khung nhỏ, chéo; cảnh cao trào → một khung lớn; đối thoại → khung đều. Chạm để xem trước |

### Trạng thái

| Trạng thái | Hiển thị |
| --- | --- |
| Trang trống | Mở sẵn bảng mẫu khung. Nếu trang có kịch bản: dòng "Trang này có 4 khung theo kịch bản" và lọc sẵn mẫu 4 khung |
| Đổi bố cục khi đã có tranh | Bảng cảnh báo "Tranh sẽ được giữ và căn giữa trong khung mới" trước khi áp dụng mẫu |
| Khung đang được AI vẽ | Khung hiện đường tốc độ và nhãn "Đang vẽ…"; vẫn làm việc được với khung khác |
| Khung có cờ "cần vẽ lại" | Góc khung có chấm vàng; thẻ khung giải thích lý do (nhân vật đã đổi thiết kế) |
| Lưới an toàn bật | Đường viền mảnh cách mép trang 5%: chữ và mặt nhân vật nên nằm trong vùng này |
| Webtoon | Trang là dải dọc cuộn được; chỉ có cắt ngang, không có trang đôi; nút "+ Kéo dài dải" ở cuối |

---

## 14. Canvas vẽ

**Route:** `Canvas`

### Mục đích

Vẽ tay lên một khung hoặc cả trang: phác thảo, đi nét, tô tone.

### Đường vào và đường ra

- **Vào:** [✎ Vẽ] hoặc chạm hai lần vào khung ở Dàn khung trang (13); "Sửa trên canvas" ở AI tạo ảnh khung (15) hoặc Hồ sơ nhân vật (10).
- **Ra:** ✓ Xong → quay lại màn trước, tranh đã lưu.

### Bố cục

Toàn màn hình, thanh công cụ nền tối ở cả hai giao diện.

```
┌───────────────────────────────┐
│ ✓   Khung 3      ↶  ↷   ▤  ⋮  │
│───────────────────────────────│
│ ┌──┐                    ┌───┐ │
│ │✎ │                    │ref│ │
│ │✐ │                    └───┘ │
│ │🖌│                          │
│ │◻ │      VÙNG VẼ             │
│ │▨ │   (khung đang vẽ, phần   │
│ │⬚ │    ngoài khung mờ đi)    │
│ │✥ │                          │
│ │──│                          │
│ │● │ ← kích thước             │
│ │◐ │ ← độ mờ                  │
│ └──┘                     (✦)  │
│───────────────────────────────│
│ ■ □ ▓ ▒ ░ │ Cỡ ━━●━━ 12 │ [✦ AI] │
└───────────────────────────────┘
```

### Thành phần

| Thành phần | Nội dung |
| --- | --- |
| Thanh trên | ✓ Xong · tên khung · Hoàn tác · Làm lại · ▤ Lớp · ⋮ |
| Thanh công cụ dọc | Bên trái (bên phải nếu tay thuận trái). Kéo tay nắm để thu gọn thành một nút |
| Vùng vẽ | Khung đang vẽ sáng rõ; phần còn lại của trang mờ 30% để thấy bối cảnh. Nền ngoài trang màu xám đậm |
| Ảnh tham chiếu nổi | Cửa sổ nhỏ kéo được, đổi cỡ được; chạm hai lần để ẩn |
| Thanh dưới | Bảng màu nhanh · thanh trượt cỡ bút · nút AI |
| Menu ⋮ | Vẽ cả trang/chỉ khung này · Lật ngang canvas · Hiện lưới · Thêm ảnh tham chiếu · Nhập ảnh vào lớp · Xóa lớp hiện tại |

**Công cụ**

| Biểu tượng | Công cụ | Thiết lập (nhấn giữ biểu tượng) |
| --- | --- | --- |
| ✎ | G-pen | Cỡ, độ ổn định nét, đậm nhạt theo tốc độ/lực nhấn |
| ✐ | Bút chì | Cỡ, độ mờ, độ nhám |
| 🖌 | Bút lông | Cỡ, độ mờ |
| ◻ | Tẩy | Cỡ, cứng/mềm |
| ▨ | Đổ màu | Ngưỡng, lấy mẫu mọi lớp / lớp hiện tại, đổ màu hoặc đổ tone |
| ⬚ | Chọn vùng | Chữ nhật / tự do; sau khi chọn: di chuyển, co giãn, xóa, ✦ vẽ lại vùng |
| ✥ | Di chuyển | Di chuyển, xoay, co giãn nội dung lớp |

**Bảng Lớp** (trượt từ cạnh phải)

```
┌─ LỚP ─────────────── [+] ─┐
│ 👁 ▣ Hiệu ứng        100% │
│ 👁 ▣ Tone             80% │
│ 👁 ▣ Nét mực  ←đang vẽ    │
│ 👁 ▣ ✦ AI: ảnh gốc   🔒   │
│ ─  ▣ Phác thảo        40% │
│ ─────────────────────────│
│ Độ mờ ━━━━●━━ 100%       │
│ [Gộp xuống] [Nhân bản] [Xóa] │
└──────────────────────────┘
```

- Mỗi dòng: bật/tắt hiển thị, ảnh thu nhỏ, tên (chạm hai lần để đổi), độ mờ, khóa.
- Kéo dòng để đổi thứ tự. Lớp do AI tạo có dấu ✦.
- Tối đa 8 lớp; lớp thứ 9 bị chặn với gợi ý gộp lớp.

**Bảng màu**

- Mặc định: đen, trắng, 3 mức xám.
- Chạm ô màu đang chọn để mở bảng đầy đủ: 5 mức xám, các mẫu screentone (chấm 10%–60%, sọc, gradient); nếu truyện bật "Truyện màu" thì có thêm vòng chọn màu và các màu gần đây.

### Hành động

| Cử chỉ | Phản hồi |
| --- | --- |
| Một ngón kéo | Vẽ bằng công cụ đang chọn |
| Hai ngón kéo / chụm / xoay | Di chuyển, phóng to (10%–1600%), xoay canvas; hít về 0° khi gần |
| Chạm hai ngón | Hoàn tác |
| Chạm ba ngón | Làm lại |
| Nhấn giữ một ngón trên canvas | Lấy màu tại điểm đó |
| Chạm hai lần bằng hai ngón | Đưa canvas về vừa màn hình |
| Bấm ✓ | Lưu, quay lại; thumbnail khung cập nhật |

- Khi máy có bút cảm ứng: bút vẽ, một ngón tay di chuyển canvas.
- Nét vẽ bị cắt theo hình khung; bật "Vẽ cả trang" để vẽ tràn qua nhiều khung.
- Khi đang vẽ, thanh trên và thanh dưới tự mờ đi; hiện lại khi nhấc tay.

### AI

Bấm [✦ AI] mở menu:

| Thao tác | Mức | Kết quả |
| --- | --- | --- |
| Đi nét mực | Nặng | Lấy lớp Phác thảo → tạo lớp "✦ Nét mực" bên trên; lớp phác thảo tự giảm độ mờ còn 20% |
| Tô screentone | Nặng | Tạo lớp "✦ Tone" với vùng tone tự nhận diện |
| Vẽ lại vùng | Nặng | Cần chọn vùng trước → ô nhập mô tả → 3 phương án cho riêng vùng đó → chọn một → lớp mới |
| Xóa nền | Vừa | Tách nhân vật thành lớp riêng |

Trước và sau khi AI chạy: nút **So sánh** (nhấn giữ để xem bản trước) hiện 10 giây ở giữa đáy màn hình, kèm Chấp nhận / Bỏ.

### Trạng thái

| Trạng thái | Hiển thị |
| --- | --- |
| Lần đầu mở Canvas | Lớp phủ hướng dẫn 4 cử chỉ (vẽ, di chuyển, hoàn tác, lấy màu); chạm để đóng |
| Khung trống | Lớp Phác thảo được chọn sẵn với bút chì; nếu khung có mô tả, hiện mô tả ở dải mờ trên cùng trong 5 giây |
| Khung đã có ảnh AI | Ảnh AI nằm ở lớp "✦ AI: ảnh gốc" đã khóa; lớp Nét mực trống được chọn sẵn để vẽ đè |
| Lớp bị khóa hoặc ẩn | Vẽ lên thì thanh Lớp nháy và hiện "Lớp đang khóa" |
| AI đang chạy | Vùng vẽ phủ đường tốc độ, nút Dừng; vẫn di chuyển và phóng to được nhưng không vẽ được |
| Máy yếu / canvas lớn | Dải nhắc một lần: "Đã giảm độ phân giải để vẽ mượt hơn" |
| Thoát đột ngột | Lần mở sau khôi phục tới nét vẽ cuối cùng |

---

## 15. AI tạo ảnh khung

**Route:** `Generate`

### Mục đích

Mô tả một cảnh và để AI vẽ khung tranh, với đúng nhân vật và phong cách của truyện.

### Đường vào và đường ra

- **Vào:** [✦ AI vẽ] ở Dàn khung trang (13).
- **Ra:** "Dùng ảnh này" → quay lại Dàn khung trang, ảnh đã nằm trong khung. "Sửa trên canvas" → Canvas vẽ (14).

### Bố cục

Màn hình có hai trạng thái chính: **nhập mô tả** và **chọn kết quả**.

```
 NHẬP MÔ TẢ                       CHỌN KẾT QUẢ
┌───────────────────────────┐   ┌───────────────────────────┐
│ ←  AI VẼ KHUNG 3   [✦ 120]│   │ ←  AI VẼ KHUNG 3   [✦ 116]│
│ ┌───────────────────────┐ │   │ ┌──────────┐┌──────────┐  │
│ │ khung xem trước       │ │   │ │    1     ││    2     │  │
│ │ (đúng tỉ lệ khung)    │ │   │ │          ││          │  │
│ └───────────────────────┘ │   │ └──────────┘└──────────┘  │
│ Mô tả cảnh                │   │ ┌──────────┐┌──────────┐  │
│ ┌───────────────────────┐ │   │ │    3 ✓   ││    4     │  │
│ │ Chiếc hộp rung lên    │ │   │ │ (đã chọn)││          │  │
│ │ trong giỏ xe, phát    │ │   │ └──────────┘└──────────┘  │
│ │ sáng nhẹ              │ │   │                           │
│ └───────────────────────┘ │   │ [ ↻ Tạo lại · 4 ]         │
│ Nhân vật                  │   │ [ ◈ Biến thể của ảnh 3 · 4]│
│ (Minh 🔒 ngạc nhiên ▾)[+] │   │ [ ✎ Sửa trên canvas ]     │
│ Góc máy                   │   │                           │
│ (Toàn)(Trung)(●Cận)(Đặc tả)…  │ [     Dùng ảnh này      ] │
│ Nền                       │   │                           │
│ (●Chi tiết)(Đơn giản)(Trắng)… │ Lịch sử (3)             ▾ │
│ ▸ Chi tiết                │   └───────────────────────────┘
│                           │
│ [   ✦ Tạo 4 phương án · 4 ]│
└───────────────────────────┘
```

### Thành phần — trạng thái nhập mô tả

| Thành phần | Nội dung |
| --- | --- |
| Chip credit | Số dư hiện tại, góc trên phải |
| Khung xem trước | Hình dạng thật của khung (kể cả khung chéo) trên nền chấm tram; có ảnh thì hiện ảnh hiện tại |
| Ô Mô tả cảnh | Nhiều dòng, tối đa 300 ký tự. Điền sẵn từ khối Hành động của kịch bản nếu khung có liên kết |
| Nhân vật | Chip cho từng nhân vật trong khung (tối đa 3). Mỗi chip: ảnh đại diện, tên, biểu tượng khóa nếu đã khóa tham chiếu, biểu cảm (chạm để đổi). Nút [+] mở bảng Chọn nhân vật |
| Góc máy | Chip chọn một: Toàn · Trung · Cận · Đặc tả · Từ trên · Từ dưới. Điền sẵn từ storyboard |
| Nền | Chip chọn một: Chi tiết · Đơn giản · Trắng · Đường tốc độ |
| Mục Chi tiết (thu gọn) | Tư thế từng nhân vật (ô ngắn) · Ánh sáng (ngày, đêm, ngược sáng) · Dùng ảnh địa danh làm tham chiếu nền · Xem prompt đầy đủ (chỉ đọc) |
| Nút chính | "✦ Tạo 4 phương án" kèm số credit |

### Thành phần — trạng thái chọn kết quả

| Thành phần | Nội dung |
| --- | --- |
| Lưới 2×2 | 4 phương án đúng tỉ lệ khung; ảnh đang chọn viền đỏ son và dấu ✓ |
| Nút Tạo lại | Chạy lại với cùng mô tả; kết quả cũ vào Lịch sử |
| Nút Biến thể | Tạo 4 ảnh gần giống ảnh đang chọn |
| Nút Sửa trên canvas | Đặt ảnh vào khung rồi mở Canvas vẽ |
| Nút chính | "Dùng ảnh này" |
| Liên kết "Sửa mô tả" | Quay lại trạng thái nhập, giữ nguyên các lựa chọn |
| Lịch sử | Dải cuộn ngang các lần tạo trước của khung này; chạm để mở lại bộ 4 ảnh đó, không tốn credit |

### Hành động

| Hành động | Phản hồi |
| --- | --- |
| Bấm Tạo 4 phương án | Lần đầu: bảng xác nhận thao tác AI nặng. Sau đó chuyển sang lưới 2×2 với 4 ô đường tốc độ; ảnh hiện dần từng ô |
| Chạm một phương án | Chọn ảnh đó |
| Chạm hai lần / nhấn giữ một phương án | Xem toàn màn hình, vuốt ngang để so sánh 4 ảnh; hiện ảnh lồng trong trang thật để xem có hợp các khung bên cạnh không |
| Bấm Dùng ảnh này | Ảnh thành lớp "✦ AI: ảnh gốc" của khung; quay lại Dàn khung trang; khung nháy viền |
| Rời màn hình khi đang tạo | Việc tạo tiếp tục chạy nền; có thông báo khi xong |
| Chạm biểu cảm trên chip nhân vật | Bảng chọn: 6 biểu cảm có ảnh từ bảng thiết kế + ô "Khác" để tự mô tả |

### AI

| Thao tác | Mức | Kết quả |
| --- | --- | --- |
| Tạo 4 phương án | Nặng | 4 ảnh từ prompt do app ghép: phong cách truyện + ngoại hình và ảnh tham chiếu nhân vật + mô tả + góc máy + nền |
| Biến thể | Nặng | 4 ảnh giữ bố cục của ảnh đã chọn, thay đổi chi tiết |
| Gợi ý mô tả | Nhẹ | Nút nhỏ trong ô mô tả: viết lại mô tả cho rõ ràng, cụ thể hơn về hình ảnh |

### Trạng thái

| Trạng thái | Hiển thị |
| --- | --- |
| Khung chưa có mô tả | Ô mô tả trống với gợi ý "Điều gì đang xảy ra trong khung này?"; nút chính mờ cho tới khi có chữ |
| Nhân vật chưa khóa tham chiếu | Chip có viền vàng; dòng nhắc "Minh chưa có ảnh tham chiếu, ngoại hình có thể không giống nhau giữa các khung." + liên kết "Tới hồ sơ" |
| Đang tạo | 4 ô đường tốc độ, dòng "Đang vẽ… thường mất khoảng nửa phút", nút Dừng (dừng trước khi có ảnh thì hoàn credit) |
| Lỗi mạng hoặc máy chủ | Thẻ lỗi thay cho lưới: "Không vẽ được. Credit đã được hoàn lại." + Thử lại |
| Bị từ chối do nội dung | Thẻ: "Mô tả này không phù hợp chính sách nội dung." + gợi ý sửa; không trừ credit |
| Không đủ credit | Nút chính đổi thành "Cần thêm credit" → bảng Mua credit |
| Ngoại tuyến | Nút chính xám "Cần mạng"; Lịch sử vẫn xem và dùng lại được |
| Khung đã có ảnh | Dòng nhắc trên cùng "Khung đã có tranh. Ảnh mới sẽ thay ảnh AI cũ, nét vẽ tay của bạn được giữ nguyên." |

---

## 16. Thoại và hiệu ứng

**Route:** `Lettering`

### Mục đích

Đặt bong bóng thoại, lời dẫn, chữ SFX và hiệu ứng lên trang.

### Đường vào và đường ra

- **Vào:** chế độ Thoại ở Dàn khung trang (13).
- **Ra:** chuyển chế độ Khung/Tranh trên thanh chế độ; ← về Storyboard (12).

### Bố cục

```
┌───────────────────────────────┐
│ ←  TRANG 3 / 8     ↶ ↷  ✔  ⋮  │
│ [✦ Tự đặt thoại từ kịch bản · 2]
│───────────────────────────────│
│     ┌─────────────────────┐   │
│     │┌─────────┬─────────┐│   │
│     ││  ╭────╮ │         ││   │
│     ││  │Lại │ │  RẦM!   ││   │
│     ││  │nữa…│ │         ││   │
│     ││  ╰─╲──╯ │         ││   │
│     │├─────────┴─────────┤│   │
│     ││  ┌╌╌╌╌╌╌╌╌╌╌╌╌╌┐  ││   │
│     ││  ╎ bong bóng đang╎ ││   │
│     ││  ╎ chọn (tay nắm)╎ ││   │
│     ││  └╌╌╌╌╌╲╌╌╌╌╌╌╌┘  ││   │
│     │└───────────────────┘│   │
│     └─────────────────────┘   │
│ ┌─ Bong bóng ───────────────┐ │
│ │ (Nói)(Nghĩ)(Hét)(Thì thầm)│ │
│ │ Aa Phông ▾  Cỡ −14+  🗑   │ │
│ └───────────────────────────┘ │
│ [❝ Thoại][▭ Lời dẫn][✸ SFX][≋ Hiệu ứng] │
│  [ ▦ Khung ]  [ ✎ Tranh ]  [ ❝ Thoại ] │
└───────────────────────────────┘
```

### Thành phần

| Thành phần | Nội dung |
| --- | --- |
| Nút AI tự đặt thoại | Hiện khi trang có khối thoại trong kịch bản chưa được đặt |
| Vùng trang | Như Dàn khung trang; bong bóng và SFX hiện đè lên tranh |
| Phần tử đang chọn | Viền nét đứt với tay nắm ở 4 góc, tay nắm xoay ở trên, và tay nắm riêng cho đầu đuôi bong bóng |
| Thẻ thuộc tính | Thẻ nổi đổi nội dung theo loại phần tử đang chọn |
| Thanh thêm phần tử | 4 nút: Thoại · Lời dẫn · SFX · Hiệu ứng |
| Thanh chế độ | Giống Dàn khung trang, chế độ Thoại đang chọn |
| Menu ⋮ | Danh sách thoại của trang · Bản ngôn ngữ · Ẩn/hiện mọi bong bóng · Khóa tranh (mặc định bật) |

**Thẻ thuộc tính theo loại**

| Loại | Thuộc tính |
| --- | --- |
| Bong bóng thoại | Kiểu: Nói · Nghĩ · Hét · Thì thầm · Máy móc. Phông, cỡ chữ, đậm. Ẩn/hiện đuôi. Nhân vật nói (liên kết với kịch bản). Xóa |
| Lời dẫn | Kiểu hộp: viền · nền đen chữ trắng · không viền. Phông, cỡ, căn lề |
| SFX | 6 kiểu chữ. Cỡ, xoay, kéo méo, viền (độ dày, màu trắng/đen), đổ bóng. Chữ dọc/ngang |
| Hiệu ứng | Loại: Đường tốc độ · Đường tập trung · Chấm tram · Gradient · Lấp lánh. Mật độ, hướng/tâm, độ mờ. Áp vào khung nào |

**Danh sách thoại của trang** (bảng trượt từ menu)

- Liệt kê mọi khối thoại, lời dẫn, SFX của trang theo kịch bản, mỗi dòng có trạng thái: đã đặt ✔ / chưa đặt ○.
- Chạm dòng chưa đặt để thả bong bóng vào giữa khung tương ứng.
- Sửa chữ ở đây cũng sửa trong kịch bản, và ngược lại.

### Hành động

| Hành động | Phản hồi |
| --- | --- |
| Bấm [❝ Thoại] rồi chạm vào trang | Thả bong bóng tại điểm chạm, mở bàn phím để gõ |
| Chạm bong bóng | Chọn, hiện tay nắm và thẻ thuộc tính |
| Chạm hai lần bong bóng | Sửa chữ |
| Kéo bong bóng | Di chuyển; hiện đường gióng khi thẳng hàng với bong bóng khác hoặc mép khung |
| Kéo tay nắm góc | Đổi kích thước; chữ tự xuống dòng lại |
| Kéo tay nắm đuôi | Đầu đuôi đi theo ngón tay; kéo vào trong bong bóng thì ẩn đuôi |
| Kéo tay nắm xoay | Xoay (chủ yếu cho SFX); hít ở 0°, 15°, 45°, 90° |
| Bấm [≋ Hiệu ứng] | Mở bảng chọn loại → chạm một khung để áp vào |
| Chạm tranh | Không làm gì (tranh bị khóa ở chế độ này); bỏ chọn phần tử đang chọn |
| Nhấn giữ phần tử | Menu: Nhân bản · Đưa lên trên · Đưa xuống dưới · Xóa |

- Thứ tự đọc của bong bóng trong một khung được đánh số nhỏ khi bật "Hiện thứ tự đọc" trong menu.
- Chữ tự co để vừa bong bóng tới cỡ tối thiểu 9pt; nhỏ hơn thì bong bóng viền vàng báo "chữ quá nhiều".

### AI

| Thao tác | Mức | Kết quả |
| --- | --- | --- |
| Tự đặt thoại từ kịch bản | Vừa | Đặt bong bóng cho mọi khối thoại chưa đặt: đúng kiểu, ở vùng trống, không che mặt, đúng thứ tự đọc. Các bong bóng mới viền tím cho tới khi được chạm; có nút "Hoàn tác tất cả" |
| Gợi ý SFX | Nhẹ | Chọn một khung → 3 từ tượng thanh hợp với cảnh; chạm để thả vào khung |
| Dịch thoại | Vừa | Menu → Bản ngôn ngữ → "+ Thêm ngôn ngữ": dịch mọi thoại của chương sang ngôn ngữ đích thành một bản riêng |

### Trạng thái

| Trạng thái | Hiển thị |
| --- | --- |
| Trang chưa có tranh | Vẫn đặt thoại được; dải nhắc nhẹ "Trang chưa có tranh, vị trí thoại có thể cần chỉnh lại sau" |
| Trang có thoại trong kịch bản, chưa đặt | Nút AI nổi bật + bộ đếm "5 thoại chưa đặt" |
| Trang không có kịch bản | Ẩn nút AI tự đặt; chỉ thêm tay |
| Bong bóng đè lên mặt nhân vật | Không tự chặn; chỉ AI tự đặt mới tránh mặt |
| Đang xem bản ngôn ngữ khác | Chip ngôn ngữ trên thanh trên (ví dụ "EN"); sửa chữ chỉ ảnh hưởng bản đó; vị trí bong bóng dùng chung trừ khi bật "Vị trí riêng cho bản này" |
| Thoại trong kịch bản bị xóa | Bong bóng tương ứng viền đỏ, nhãn "Không còn trong kịch bản" + nút Giữ / Xóa |
