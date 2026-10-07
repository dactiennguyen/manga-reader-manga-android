# A · Khởi đầu

Ba màn hình này chỉ hiện ở lần mở app đầu tiên. Mục tiêu: người mới vào được Trang chủ trong dưới 1 phút, và tạo được truyện đầu tiên trong dưới 2 phút.

[← Danh sách màn hình](README.md)

---

## 1. Chào mừng

**Route:** `Welcome`

### Mục đích

Giới thiệu trong 3 slide app làm được gì, rồi đưa người dùng tới bước đăng nhập.

### Đường vào và đường ra

- **Vào:** mở app lần đầu, hoặc sau khi đăng xuất.
- **Ra:** "Bắt đầu" ở slide cuối hoặc Bỏ qua → Chọn sở thích (3). Không có bước đăng nhập hay nhập bút danh: người dùng vào thẳng như khách, bút danh đặt sau trong Hồ sơ (20).

### Bố cục

```
┌───────────────────────────────┐
│                      [Bỏ qua] │
│                               │
│   ┌───────────────────────┐   │
│   │                       │   │
│   │   Minh họa dạng       │   │
│   │   khung truyện        │   │
│   │   (60% chiều cao)     │   │
│   │                       │   │
│   └───────────────────────┘   │
│                               │
│   TIÊU ĐỀ SLIDE               │
│   Một dòng mô tả ngắn.        │
│                               │
│           ● ○ ○               │
│                               │
│   [        Bắt đầu        ]   │
│     Tôi đã có tài khoản       │
└───────────────────────────────┘
```

### Thành phần

| Thành phần | Nội dung |
| --- | --- |
| Nút Bỏ qua | Góc trên phải, chữ thường. Nhảy thẳng tới Chọn sở thích |
| Minh họa | Mỗi slide là một trang manga thu nhỏ có 2–3 khung, viền mực, nền chấm tram |
| Tiêu đề | Phông Anton, chữ hoa |
| Mô tả | Một câu, tối đa 2 dòng |
| Chấm chỉ trang | 3 chấm, chấm đang xem màu đỏ son |
| Nút chính | "Bắt đầu", đỏ son, rộng hết chiều ngang |
| Liên kết phụ | "Tôi đã có tài khoản" |

Nội dung 3 slide:

| Slide | Tiêu đề | Mô tả | Minh họa |
| --- | --- | --- | --- |
| 1 | VIẾT CÂU CHUYỆN CỦA BẠN | Từ một câu ý tưởng, AI giúp bạn dựng cốt truyện và lời thoại. | Trang giấy có chữ hiện dần thành khung truyện |
| 2 | VẼ, HOẶC ĐỂ AI VẼ | Tự vẽ trên canvas, hoặc mô tả cảnh để AI vẽ đúng nhân vật của bạn. | Nét phác thảo chuyển thành nét mực |
| 3 | RA MỘT CHƯƠNG HOÀN CHỈNH | Chia khung, đặt thoại, xuất file để chia sẻ. | Trang manga hoàn chỉnh có bong bóng thoại |

### Hành động

| Hành động | Phản hồi |
| --- | --- |
| Vuốt ngang | Chuyển slide, minh họa trượt kiểu lật trang |
| Bấm "Bắt đầu" ở slide 1 hoặc 2 | Sang slide kế tiếp |
| Bấm "Bắt đầu" ở slide 3 | Tới Chọn sở thích |
| Bấm Bỏ qua | Tới Chọn sở thích |

### Trạng thái

- Không có trạng thái tải hay lỗi; mọi nội dung nằm sẵn trong app.
- Người dùng đã từng hoàn tất Khởi đầu sẽ không thấy lại màn này.

---

## 2. Đăng nhập

**Route:** `SignIn`

> **Chưa có trong app.** Bản hiện tại không có bước này: mở app lần đầu đi thẳng từ Chào mừng sang Chọn sở thích, người dùng vào như khách. Bút danh (tên in ở trang credit khi xuất) đặt trong Hồ sơ (20). Phần dưới là thiết kế để dành cho khi có tài khoản.

### Mục đích

Cho người dùng đăng nhập, hoặc vào dùng thử mà không cần tài khoản.

### Đường vào và đường ra

- **Vào:** từ Chào mừng (1); từ Hồ sơ (20) khi đang dùng không tài khoản; khi bấm một nút AI mà chưa đăng nhập.
- **Ra:** đăng nhập lần đầu → Chọn sở thích (3). Đăng nhập lại → Trang chủ (4), hoặc quay về màn hình đã gọi nó.

### Bố cục

```
┌───────────────────────────────┐
│ ←                             │
│                               │
│          [ Logo ]             │
│        MANGAKA AI             │
│  Đăng nhập để dùng tính năng AI│
│                               │
│  [ G  Tiếp tục với Google   ] │
│                               │
│  ───────── hoặc ─────────     │
│                               │
│  Email                        │
│  [___________________________]│
│  [     Gửi mã đăng nhập     ] │
│                               │
│   Dùng thử không cần tài khoản│
│                               │
│  Tiếp tục nghĩa là bạn đồng ý │
│  Điều khoản · Chính sách      │
└───────────────────────────────┘
```

### Thành phần

| Thành phần | Nội dung |
| --- | --- |
| Nút Google | Viền mực, biểu tượng Google, mở bảng chọn tài khoản của hệ thống |
| Ô Email | Bàn phím kiểu email, kiểm tra định dạng khi rời ô |
| Nút Gửi mã | Gửi mã 6 số tới email; không dùng mật khẩu |
| Ô nhập mã | Thay ô Email sau khi gửi; 6 ô số, tự chuyển ô, tự xác nhận khi đủ 6 số |
| Liên kết dùng thử | "Dùng thử không cần tài khoản" |
| Điều khoản | Hai liên kết mở trong trình duyệt của app |

### Hành động

| Hành động | Phản hồi |
| --- | --- |
| Bấm Google | Mở bảng chọn tài khoản; thành công thì đi tiếp |
| Bấm Gửi mã | Nút chuyển thành đếm ngược 60 giây "Gửi lại sau 0:59" |
| Nhập đủ mã | Tự xác nhận; đúng thì đi tiếp |
| Bấm Dùng thử | Hiện bong bóng nhắc: "Bạn vẫn viết và vẽ được. Tính năng AI cần đăng nhập." rồi đi tiếp |

### Trạng thái

| Trạng thái | Hiển thị |
| --- | --- |
| Đang xác thực | Nút đang bấm hiện vòng xoay nhỏ, các nút khác tạm khóa |
| Email sai định dạng | Viền ô đỏ, dòng chữ "Email chưa đúng" dưới ô |
| Mã sai | 6 ô rung nhẹ và xóa trắng, dòng chữ "Mã chưa đúng, thử lại" |
| Mã hết hạn | "Mã đã hết hạn" kèm nút Gửi lại |
| Không có mạng | Dải báo ngoại tuyến; nút Google và Gửi mã mờ đi; Dùng thử vẫn bấm được |
| Hủy bảng Google | Ở lại màn hình, không báo lỗi |

---

## 3. Chọn sở thích

**Route:** `Preferences`

### Mục đích

Hỏi 3 câu ngắn để đặt mặc định cho gợi ý truyện và phong cách ảnh AI. Mọi câu đều bỏ qua được.

### Đường vào và đường ra

- **Vào:** sau lần đăng nhập đầu tiên, hoặc sau khi chọn Dùng thử.
- **Ra:** "Xong" hoặc "Bỏ qua" → Trang chủ (4).
- Sửa lại sau này ở Hồ sơ và cài đặt (20).

### Bố cục

Một màn hình, 3 bước, chuyển bước bằng nút Tiếp.

```
┌───────────────────────────────┐
│ ←      ▰▰▰▱▱▱▱▱▱  1/3  [Bỏ qua]│
│                               │
│  BẠN MUỐN LÀM GÌ?             │
│  Chọn một.                    │
│                               │
│  ┌───────────────────────┐    │
│  │ ✎  Viết truyện        │    │
│  │ Tôi có ý tưởng, cần   │    │
│  │ người vẽ giúp         │    │
│  └───────────────────────┘    │
│  ┌───────────────────────┐    │
│  │ ✐  Vẽ tranh           │    │
│  └───────────────────────┘    │
│  ┌───────────────────────┐    │
│  │ ★  Cả hai             │    │
│  └───────────────────────┘    │
│                               │
│  [          Tiếp          ]   │
└───────────────────────────────┘
```

### Thành phần theo bước

| Bước | Câu hỏi | Kiểu chọn | Lựa chọn |
| --- | --- | --- | --- |
| 1 | Bạn muốn làm gì? | Một | Viết truyện · Vẽ tranh · Cả hai |
| 2 | Bạn thích thể loại nào? | Nhiều (tối đa 5) | Hành động, Phiêu lưu, Lãng mạn, Hài, Kinh dị, Học đường, Giả tưởng, Khoa học viễn tưởng, Đời thường, Trinh thám, Thể thao, Lịch sử |
| 3 | Bạn thích nét vẽ nào? | Một | Shounen · Shoujo · Seinen · Chibi · Kinh dị · Đời thường |

- Bước 1: thẻ lớn xếp dọc, mỗi thẻ có biểu tượng, tên, một dòng giải thích.
- Bước 2: chip xếp nhiều hàng; chip đã chọn nền mực chữ trắng.
- Bước 3: lưới 2 cột, mỗi ô là một ảnh mẫu cùng một nhân vật vẽ theo phong cách đó, tên phong cách bên dưới.

### Hành động

| Hành động | Phản hồi |
| --- | --- |
| Chọn một lựa chọn | Thẻ/chip đổi sang trạng thái chọn, rung nhẹ |
| Bấm Tiếp | Sang bước kế, thanh tiến độ tăng. Không chọn gì vẫn bấm được |
| Bấm ← | Về bước trước; ở bước 1 thì về Đăng nhập |
| Bấm Bỏ qua | Tới Trang chủ, dùng mặc định: Cả hai, không thể loại, Shounen |
| Bấm Xong (bước 3) | Lưu lựa chọn, tới Trang chủ |

### AI

Màn này không gọi AI. Lựa chọn được dùng về sau:

- **Vai trò** quyết định gợi ý ở Trang chủ: người viết thấy "Bắt đầu từ một câu" nổi bật; người vẽ thấy "Mở canvas trống".
- **Thể loại** là ngữ cảnh cho AI gợi ý tên truyện và cốt truyện.
- **Nét vẽ** là phong cách mặc định khi tạo truyện mới.

### Trạng thái

- Thoát app giữa chừng: lần mở sau quay lại đúng bước đang dở.
- Chọn quá 5 thể loại: chip thứ 6 không được chọn, hiện thông báo nhanh "Tối đa 5 thể loại".
