# Mangaka AI — Mô tả tính năng

Tài liệu này mô tả từng tính năng: nó làm gì, người dùng thao tác thế nào, quy tắc xử lý và các trường hợp biên. Mô tả giao diện từng màn hình nằm trong [screens/](screens/README.md). Tổng quan sản phẩm nằm ở [mangaka-ai.md](mangaka-ai.md).

Mã tính năng (F-xx) dùng để tham chiếu từ tài liệu màn hình và từ code.

## Mục lục

1. [Dự án truyện](#1-dự-án-truyện)
2. [Viết truyện](#2-viết-truyện)
3. [Nhân vật và thế giới](#3-nhân-vật-và-thế-giới)
4. [Storyboard và dàn khung](#4-storyboard-và-dàn-khung)
5. [Vẽ tranh](#5-vẽ-tranh)
6. [AI tạo ảnh](#6-ai-tạo-ảnh)
7. [Thoại và hiệu ứng](#7-thoại-và-hiệu-ứng)
8. [Đọc thử và xuất bản](#8-đọc-thử-và-xuất-bản)
9. [Trợ lý AI](#9-trợ-lý-ai)
10. [Credit và gói](#10-credit-và-gói)
11. [Tài khoản, sao lưu, cài đặt](#11-tài-khoản-sao-lưu-cài-đặt)
12. [Quy tắc chung cho mọi tính năng AI](#12-quy-tắc-chung-cho-mọi-tính-năng-ai)

---

## 1. Dự án truyện

### F-01 Tạo truyện mới

Người dùng tạo một dự án truyện qua 3 bước, hoặc để AI dựng khung từ một câu ý tưởng.

- **Thông tin:** tên truyện (bắt buộc, tối đa 60 ký tự), thể loại (chọn 1–3), logline (tối đa 200 ký tự, có thể để trống).
- **Định dạng:**
  - *Trang manga*: đọc phải sang trái, khổ B5 (mặc định) hoặc A5, lật trang.
  - *Webtoon*: cuộn dọc, rộng 800px, chiều dài tự do.
  - Định dạng **không đổi được** sau khi đã có trang vẽ đầu tiên, vì bố cục khung phụ thuộc vào nó. App cảnh báo điều này ở bước chọn.
- **Phong cách vẽ:** chọn 1 trong bộ mẫu của app (shounen, shoujo, seinen, chibi, kinh dị, đời thường). Phong cách áp dụng cho mọi ảnh AI trong truyện; đổi sau được nhưng ảnh cũ không tự vẽ lại.
- **Tạo nhanh bằng AI:** từ một câu ý tưởng, AI điền sẵn tên, thể loại, logline. Người dùng sửa rồi mới bấm tạo.

Sau khi tạo, app mở thẳng màn Tổng quan truyện với một chương trống "Chương 1".

### F-02 Thư viện truyện

- Hiển thị mọi truyện trên máy dạng lưới bìa, mới sửa gần nhất đứng đầu.
- Lọc theo trạng thái: Nháp (chưa có trang nào), Đang làm, Hoàn thành (người dùng tự đánh dấu).
- Tìm theo tên truyện. Sắp xếp theo: sửa gần nhất, tên, ngày tạo.
- Nhấn giữ một truyện: đổi tên, đổi bìa, nhân bản, đánh dấu hoàn thành, xóa. Nhân bản tạo một bản sao độc lập gồm cả kịch bản, trang, tranh và ảnh.
- Sau khi xóa, thanh thông báo có nút Hoàn tác trong vài giây.
- **Xóa** chuyển truyện vào Thùng rác, giữ 30 ngày rồi mới xóa hẳn. Khôi phục được trong thời gian đó.

### F-03 Tổng quan truyện và tiến độ

- Tiến độ truyện = số trang có trạng thái "xong" / tổng số trang đã tạo.
- Tiến độ chương tính tương tự, hiện trên từng dòng chương.
- Trạng thái chương tự suy ra: *Chưa viết* (không có cảnh), *Đang viết* (có kịch bản, chưa có trang), *Đang vẽ* (có trang chưa xong), *Xong* (mọi trang xong).
- Thêm, đổi tên, sắp xếp lại, xóa chương. Xóa chương xóa cả kịch bản và trang của chương đó, cần xác nhận bằng cách gõ tên chương.

### F-04 Tự động lưu

- Mọi thay đổi lưu ngay xuống máy, không có nút Lưu.
- Văn bản lưu sau 500ms ngừng gõ. Nét vẽ lưu sau mỗi nét.
- Mỗi chương giữ 20 phiên bản gần nhất của kịch bản để khôi phục.

---

## 2. Viết truyện

### F-05 Dàn ý theo hồi và chương

- Dàn ý là bảng thẻ: cột là **hồi** (mặc định 3 hồi: Mở đầu, Phát triển, Kết), thẻ là **chương**.
- Mỗi thẻ chương có: tên, tóm tắt (tối đa 300 ký tự), mục tiêu của chương (nhân vật muốn gì, điều gì thay đổi).
- Kéo thả thẻ để đổi thứ tự hoặc chuyển hồi. Thứ tự thẻ chính là thứ tự chương của truyện.
- Thêm, đổi tên, xóa hồi. Xóa hồi còn thẻ thì phải chuyển thẻ sang hồi khác trước.

### F-06 AI gợi ý cốt truyện

- **3 hướng cốt truyện:** từ logline, AI đưa 3 hướng khác nhau rõ rệt (ví dụ: phiêu lưu, bi kịch, hài). Mỗi hướng gồm tóm tắt 3 hồi. Người dùng chọn một hướng để đổ thành thẻ, hoặc tạo lại.
- **Mở rộng thẻ:** chọn một thẻ chương, AI chia thành 3–6 cảnh kèm mô tả ngắn. Kết quả đổ vào kịch bản chương đó dưới dạng cảnh trống có mô tả.
- **Tìm lỗ hổng:** AI đọc toàn bộ dàn ý và hồ sơ nhân vật, liệt kê điểm mâu thuẫn, tình tiết bị bỏ lửng, nhân vật thiếu động cơ. Mỗi mục có nút "Đi tới" thẻ liên quan.
- Chọn hướng mới khi đã có thẻ: app hỏi *thay thế* hay *thêm vào cuối*, không tự ghi đè.

### F-07 Soạn kịch bản theo cảnh

Kịch bản của một chương là danh sách **cảnh**. Mỗi cảnh gồm các **khối**:

| Loại khối | Nội dung | Ví dụ |
| --- | --- | --- |
| Bối cảnh | Nơi chốn, thời điểm | "Con hẻm sau chợ, chiều mưa" |
| Hành động | Điều xảy ra, không có lời | "Minh dừng xe, nhìn chiếc hộp rung lên" |
| Thoại | Nhân vật + lời nói + kiểu (nói, nghĩ, hét, thì thầm) | Minh (nghĩ): "Lại nữa rồi…" |
| Lời dẫn | Lời người kể | "Ba ngày trước đó." |
| SFX | Từ tượng thanh | "RẦM" |

- Khối thoại gắn với một nhân vật trong hồ sơ; gõ `@` để chọn nhanh. Nhân vật chưa có thì tạo nhanh chỉ với tên.
- Thêm, xóa, kéo thả đổi thứ tự khối và cảnh.
- Chuyển một khối sang cảnh khác: mũi tên lên ở khối đầu cảnh đưa nó về cuối cảnh trước (và ngược lại), hoặc chọn "Move to scene…" trong menu khối.
- **Tìm và thay thế:** tìm trong mọi khối của chương, có "Match case", nhảy tới từng kết quả, thay một hoặc thay tất cả. Thay tất cả là một bước hoàn tác.
- **Thống kê:** số từ, số câu thoại, số khối theo loại, số trang và thời gian đọc ước tính, số câu thoại của từng nhân vật.
- **Chia sẻ kịch bản:** xuất chương thành file `.txt` trình bày kiểu kịch bản rồi mở bảng chia sẻ của Android.
- **Ước tính số trang:** mỗi cảnh hiện số trang dự kiến, tính 5 khối hành động hoặc thoại cho một trang. Con số chỉ để tham khảo.
- **Cảnh báo thoại dài:** khối thoại quá 80 ký tự được gạch chân vàng, vì khó vừa một bong bóng.

### F-08 AI hỗ trợ viết

| Thao tác | Đầu vào | Kết quả |
| --- | --- | --- |
| Viết tiếp | Vị trí con trỏ | 3–5 khối tiếp theo, hiện dạng xem trước |
| Viết lại | Các khối đang chọn + chỉ dẫn tùy chọn ("kịch tính hơn") | Phiên bản mới đặt cạnh bản cũ để so sánh |
| Đổi giọng | Một khối thoại | Lời thoại theo đúng tính cách nhân vật trong hồ sơ |
| Rút gọn | Một khối thoại | Bản ngắn hơn, giữ ý, vừa bong bóng |
| Gợi ý SFX | Một khối hành động | 3 từ tượng thanh để chọn |

- Kết quả AI luôn hiện ở dạng **xem trước** với ba nút: Chấp nhận, Thử lại, Bỏ. Không có gì được chèn vào kịch bản trước khi người dùng chấp nhận.
- Văn bản hiện dần theo kiểu streaming; có nút Dừng.

---

## 3. Nhân vật và thế giới

### F-09 Hồ sơ nhân vật

- **Thông tin:** tên, vai trò (chính, phụ, phản diện, quần chúng), tuổi, giới tính, tính cách (thẻ từ khóa), mục tiêu, điểm yếu, cách nói chuyện, ghi chú.
- **Ngoại hình:** mô tả bằng chữ: tóc, mắt, vóc dáng, trang phục, đặc điểm nhận dạng. Đoạn này được app tự ghép vào prompt mỗi khi vẽ nhân vật.
- **Quan hệ:** liên kết tới nhân vật khác kèm nhãn (bạn thân, kẻ thù, anh em…).
- **Tạo bằng AI:** từ vài từ khóa ("nữ sinh, lạnh lùng, kiếm sĩ"), AI điền mọi trường. Người dùng sửa trước khi lưu.

### F-10 Bảng thiết kế và ảnh tham chiếu

- Bảng thiết kế gồm: 1 ảnh mặt chính diện, 1 ảnh toàn thân, 6 biểu cảm (vui, buồn, giận, ngạc nhiên, sợ, ngượng).
- AI vẽ bảng từ phần Ngoại hình. Người dùng tạo lại từng ô hoặc tải ảnh tự vẽ lên thay.
- **Khóa tham chiếu:** khi hài lòng, người dùng bấm Khóa. Từ đó mọi ảnh khung có nhân vật này đều gửi kèm ảnh tham chiếu để giữ đúng mặt và trang phục.
- Nhân vật chưa khóa tham chiếu vẫn dùng được trong AI tạo ảnh khung, nhưng app cảnh báo ngoại hình có thể không nhất quán.
- Mở khóa để sửa: ảnh khung đã tạo trước đó không đổi; app hỏi có muốn đánh dấu các khung cũ là "cần vẽ lại" không.

### F-11 Thế giới và ghi chú

- Mục wiki thuộc một trong các loại: Địa danh, Phe phái, Thuật ngữ, Sự kiện, Ghi chú tự do.
- Mỗi mục có tiêu đề, nội dung, ảnh đính kèm (tối đa 6), liên kết tới nhân vật.
- **Dòng thời gian:** các mục Sự kiện có ngày/thứ tự được xếp thành trục thời gian.
- **AI:** sinh mô tả từ tiêu đề, vẽ ảnh concept cho địa danh, kiểm tra kịch bản có mâu thuẫn với wiki không (ví dụ: nhân vật ở hai nơi cùng lúc).

---

## 4. Storyboard và dàn khung

### F-12 Storyboard chương

- Storyboard là danh sách trang của một chương, hiện dạng lưới thumbnail.
- Mỗi trang có trạng thái: **Trống** (chưa chia khung), **Đã chia khung**, **Đang vẽ** (có ít nhất một khung có tranh), **Xong** (người dùng đánh dấu).
- Thêm trang trống, nhân bản, xóa, kéo thả đổi thứ tự (nhấn giữ rồi kéo ở chế độ lưới; nhấn giữ rồi thả tay thì mở menu).
- Với định dạng trang manga, thumbnail xếp **từ phải sang trái** để giống cách đọc; trang 1 đứng lẻ, các trang sau ghép cặp như trang đôi.

### F-13 AI chia kịch bản thành trang

- Đầu vào: kịch bản chương. Đầu ra: danh sách trang, mỗi trang có 3–7 khung; mỗi khung có mô tả, góc máy đề xuất (toàn, trung, cận, đặc tả, từ trên, từ dưới), và các khối kịch bản thuộc khung đó.
- Người dùng xem trước cả chương ở dạng danh sách, chỉnh số trang mong muốn (ít hơn = dồn, nhiều hơn = giãn) rồi mới áp dụng.
- Áp dụng khi chương đã có trang: chỉ thêm trang mới cho các cảnh chưa được chia; trang cũ giữ nguyên.
- Liên kết khung ↔ khối kịch bản được lưu lại, dùng cho tự đặt thoại (F-21) và để báo "kịch bản đã đổi sau khi chia khung".

### F-14 Dàn khung trang

- **Mẫu khung:** thư viện mẫu theo số khung (1–7) và kiểu (lưới đều, khung chéo, khung tràn lề, 4-koma).
- **Chỉnh tay:**
  - Kéo cạnh chung giữa hai khung để đổi kích thước.
  - Công cụ **Cắt**: vạch một đường qua khung để chia đôi, hỗ trợ đường chéo.
  - **Gộp** hai khung kề nhau.
  - Kéo một góc để tạo khung nghiêng.
  - Bật **Tràn lề** để khung ăn ra mép trang.
- **Rãnh** (khoảng trắng giữa khung): chỉnh chung cho cả trang; rãnh ngang mặc định rộng hơn rãnh dọc theo quy ước manga.
- **Thứ tự đọc:** app tự đánh số khung theo hướng đọc; người dùng sửa bằng cách chạm lần lượt các khung.
- Đổi bố cục khi khung đã có tranh: tranh được giữ và căn giữa trong khung mới; phần bị che không mất, chỉ bị ẩn.

---

## 5. Vẽ tranh

### F-15 Canvas vẽ

Canvas mở cho **một khung** hoặc **cả trang**.

- **Công cụ:** G-pen (nét mực, đậm nhạt theo tốc độ), bút chì (phác thảo), bút lông, tẩy, vẽ hình (đường thẳng, chữ nhật, elip), tô vùng, di chuyển và co giãn lớp, bút lấy màu.
- **Tô vùng:** khoanh một vùng bằng tay, nhả tay thì vùng tự khép và được tô. Tranh lưu dạng nét vẽ nên không có kiểu thùng sơn loang theo điểm ảnh.
- **Screentone:** bút lông và tô vùng có thể tô bằng chấm tram thay cho màu đặc, mật độ 10/25/40/60%. Lưới chấm cố định theo trang nên các vùng tô riêng vẫn khớp nhau.
- **Di chuyển lớp:** kéo để dời cả nội dung lớp, kéo góc hoặc chụm hai ngón để co giãn. Chưa có chọn một phần lớp.
- **Thiết lập bút:** kích thước, độ mờ, độ ổn định nét (chống rung tay).
- **Màu:** mặc định bảng đen, trắng, 5 mức xám. Bật "Màu đầy đủ" trong dự án để dùng bảng màu tự do.
- **Lớp:** tối đa 8 lớp mỗi khung. Mỗi lớp có tên, ẩn/hiện, độ mờ, khóa. Hai lớp mặc định: *Phác thảo* và *Nét mực*.
- **Cử chỉ:** hai ngón để phóng to và xoay; chạm hai ngón = hoàn tác; chạm ba ngón = làm lại. Một ngón luôn là vẽ.
- **Hoàn tác:** 50 bước mỗi phiên vẽ.
- **Ảnh tham chiếu nổi:** ghim bảng thiết kế nhân vật hoặc ảnh bất kỳ lên góc canvas để nhìn theo.
- **Bút cảm ứng:** nếu máy có bút (S Pen), nét đậm nhạt theo lực nhấn và ngón tay chỉ dùng để di chuyển canvas.

Giới hạn kỹ thuật: canvas trang tối đa 2480×3508px (B5 ở 300dpi tương đương). Trên máy yếu, app tự giảm xuống một nửa và báo cho người dùng.

### F-16 AI hỗ trợ trên canvas

| Thao tác | Mô tả |
| --- | --- |
| Đi nét mực | Lấy lớp phác thảo, tạo lớp nét mực sạch bên trên. Lớp phác thảo giữ nguyên |
| Tô screentone | Tự nhận vùng (tóc, quần áo, bóng đổ) và phủ tone xám dạng chấm tram trên lớp mới |
| Vẽ lại vùng | Người dùng khoanh một vùng, mô tả điều muốn đổi; AI vẽ lại riêng vùng đó |
| Xóa nền | Tách nhân vật khỏi nền thành lớp riêng |

Mọi kết quả AI nằm trên **lớp mới**, không sửa lớp của người dùng.

---

## 6. AI tạo ảnh

### F-17 Tạo ảnh khung từ mô tả

- **Đầu vào:**
  - Mô tả cảnh (bắt buộc). Nếu khung liên kết với kịch bản, mô tả được điền sẵn từ khối hành động.
  - Nhân vật có trong khung (0–3), mỗi nhân vật chọn biểu cảm và tư thế ngắn gọn.
  - Góc máy: toàn, trung, cận, đặc tả, từ trên, từ dưới.
  - Nền: chi tiết, đơn giản, không nền (trắng), đường tốc độ.
  - Đen trắng (mặc định) hoặc màu.
- **Prompt cuối cùng** do app ghép: phong cách dự án + mô tả ngoại hình nhân vật + ảnh tham chiếu + mô tả cảnh + góc máy. Người dùng xem được prompt này ở mục "Chi tiết" nhưng không cần viết.
- **Kết quả:** 4 phương án theo đúng tỉ lệ khung. Chạm để xem lớn.
- **Sau khi chọn:** Dùng ảnh này (đặt vào khung thành một lớp), Tạo biến thể (4 ảnh gần giống ảnh đã chọn), Sửa trên canvas.
- **Lịch sử:** mỗi khung giữ mọi lần tạo trước đó, quay lại chọn ảnh cũ không tốn credit.

### F-18 Hàng đợi tạo ảnh

- Tạo ảnh chạy nền; người dùng rời màn hình vẫn tiếp tục. Thông báo khi xong.
- **Tạo hàng loạt:** từ storyboard, chọn nhiều khung đã có mô tả và tạo cùng lúc. App hiện tổng credit trước khi chạy.
- Thất bại do lỗi mạng hoặc lỗi máy chủ: **hoàn credit** tự động, khung quay về trạng thái trước.
- Bị từ chối do vi phạm chính sách nội dung: không trừ credit, hiện lý do chung và gợi ý sửa mô tả.

---

## 7. Thoại và hiệu ứng

### F-19 Bong bóng thoại

- **Kiểu:** nói (bầu dục), nghĩ (mây), hét (gai), thì thầm (nét đứt), lời dẫn (hộp chữ nhật), máy móc (góc vuông).
- **Đuôi bong bóng:** kéo đầu đuôi về phía nhân vật đang nói; ẩn đuôi được.
- Bong bóng tự co giãn theo chữ. Chữ xuống dòng tự động, căn giữa.
- **Phông chữ:** mặc định Patrick Hand cho thoại; có phông đậm cho tiếng hét. Cỡ chữ chỉnh theo bong bóng hoặc theo cả trang.
- Bong bóng thuộc về **trang**, không thuộc khung, nên đặt đè lên rãnh giữa hai khung được.

### F-20 SFX và hiệu ứng

- **SFX:** chữ tượng thanh với 6 kiểu chữ, xoay, kéo méo, viền, đổ bóng.
- **Hiệu ứng khung:** đường tốc độ, đường tập trung (focus lines), nền chấm tram, nền gradient, hoa/lấp lánh kiểu shoujo.
- Mỗi hiệu ứng là một lớp riêng trong khung, chỉnh mật độ và hướng.

### F-21 AI tự đặt thoại

- Với khung có liên kết kịch bản, AI đặt bong bóng cho mọi khối thoại của khung: chọn kiểu bong bóng theo kiểu thoại, đặt ở vùng trống, tránh che mặt nhân vật, xếp theo thứ tự đọc.
- Người dùng chỉnh lại vị trí tự do.
- **Bản ngôn ngữ:** mỗi truyện có thể thêm tối đa 5 ngôn ngữ. Tranh và vị trí bong bóng dùng chung; mỗi bong bóng giữ một câu chữ cho từng ngôn ngữ. Bản hiện tại nhập tay (từng bong bóng hoặc qua danh sách dịch của trang/chương); chữ dịch dài hơn sẽ tự thu nhỏ cho vừa bong bóng. Bong bóng chưa dịch được đánh dấu và hiện tạm chữ gốc. AI dịch tự động sẽ làm cùng phần AI.

---

## 8. Đọc thử và xuất bản

### F-22 Đọc thử

- Hiển thị chương như độc giả thấy: toàn màn hình, không có công cụ.
- Trang manga: lật phải sang trái, xem trang đơn hoặc trang đôi khi xoay ngang. Webtoon: cuộn dọc liên tục.
- Phóng to tới 4 lần bằng chụm hai ngón hoặc chạm đôi; khi đang phóng to, kéo để xem phần khác của trang và vuốt không lật trang.
- Chọn bản ngôn ngữ để đọc thử nếu truyện có.
- **Đánh dấu:** chạm giữ một trang để gắn cờ "cần sửa" kèm ghi chú. Danh sách cờ hiện ở storyboard.
- **AI nhận xét:** đọc cả chương (ảnh trang + kịch bản) và nhận xét về nhịp truyện, trang quá nhiều chữ, khung khó hiểu thứ tự đọc.

### F-23 Xuất file

| Định dạng | Dùng cho | Tùy chọn |
| --- | --- | --- |
| PNG từng trang | Đăng mạng xã hội, in | Độ phân giải: 1x, 2x |
| PDF | In, gửi đọc thử | Trang đơn hoặc trang đôi |
| CBZ | App đọc truyện | |
| Ảnh dài | Nền tảng webtoon | Tự cắt mỗi 4000px |

- Chọn một chương, nhiều chương, hoặc cả truyện.
- Tùy chọn: thêm trang bìa, thêm trang thông tin (tên truyện, tác giả), chọn bản ngôn ngữ.
- Trang chưa xong vẫn xuất được, app cảnh báo số trang chưa xong trước khi xuất.
- Metadata file ghi rõ truyện có nội dung do AI hỗ trợ tạo.
- Xuất chạy nền, có thanh tiến độ; xong thì mở bảng chia sẻ của Android.

---

## 9. Trợ lý AI

### F-24 Chat theo ngữ cảnh truyện

- Trợ lý luôn biết truyện đang mở: logline, dàn ý, nhân vật, wiki, tóm tắt chương. Khi mở từ một màn hình cụ thể, nó biết thêm chương/trang/khung đang xem.
- Không mở truyện nào: trợ lý trả lời câu hỏi chung về kỹ thuật manga.
- **Gợi ý nhanh** thay đổi theo ngữ cảnh. Ví dụ ở kịch bản: "Cảnh này có lê thê không?"; ở canvas: "Bố cục khung này nên sửa gì?".
- **Chèn kết quả:** mỗi câu trả lời có nút sao chép, chèn vào kịch bản tại con trỏ, hoặc lưu thành ghi chú trong wiki.
- **Lịch sử:** mỗi truyện có lịch sử chat riêng, chia theo cuộc trò chuyện; xóa được.
- Trợ lý **không tự sửa** truyện. Mọi thay đổi đi qua nút chèn do người dùng bấm.

---

## 10. Credit và gói

> Giá cụ thể chưa chốt, phụ thuộc model tạo ảnh. Phần này mô tả cơ chế.

### F-25 Credit

- Mỗi thao tác AI thuộc một trong 3 mức: **nhẹ** (gợi ý nhanh, rút gọn, SFX, dịch), **vừa** (viết tiếp, viết lại, chat, chia storyboard), **nặng** (tạo ảnh, đi nét, phân tích cả truyện).
- Số credit hiện **trên nút** trước khi bấm. Thao tác nặng có thêm bước xác nhận lần đầu; người dùng tắt được.
- Số dư hiện ở Trang chủ và trong mọi bảng AI.
- Người dùng nhận một lượng credit miễn phí mỗi ngày, không cộng dồn.
- Hết credit: thao tác AI bị khóa, hiện bảng mua credit; mọi tính năng làm tay vẫn dùng bình thường.
- **Lịch sử credit:** danh sách từng lần dùng, lọc theo loại thao tác và theo truyện.

### F-26 Gói thuê bao

- Gói tháng cho credit nhiều hơn và mở tính năng: tạo hàng loạt, xuất 2x, nhiều bản ngôn ngữ.
- Mua qua Google Play Billing. Khôi phục giao dịch khi đổi máy.

---

## 11. Tài khoản, sao lưu, cài đặt

### F-27 Tài khoản

- Đăng nhập bằng Google hoặc email.
- **Dùng không tài khoản:** mọi tính năng làm tay dùng được; tính năng AI cần đăng nhập để gắn credit với một tài khoản.
- Xóa tài khoản: xóa dữ liệu trên máy chủ; truyện trên máy không bị ảnh hưởng.

### F-28 Sao lưu và khôi phục

- **Xuất dự án:** đóng gói một truyện (dữ liệu + ảnh) thành một file `.mangaka` để lưu hoặc chuyển máy.
- **Nhập dự án:** mở file `.mangaka` để thêm truyện vào thư viện; trùng tên thì thêm hậu tố.
- Đồng bộ đám mây tự động nằm ngoài phạm vi bản đầu.

### F-29 Cài đặt

| Mục | Lựa chọn | Mặc định |
| --- | --- | --- |
| Giao diện | Theo hệ thống, sáng, tối | Theo hệ thống |
| Ngôn ngữ app | Tiếng Việt, English | Theo máy |
| Ngôn ngữ AI viết | Theo ngôn ngữ truyện | Tiếng Việt |
| Tay thuận | Phải, trái (đảo vị trí thanh công cụ vẽ) | Phải |
| Xác nhận trước thao tác AI nặng | Bật, tắt | Bật |
| Giữ màn hình sáng khi vẽ | Bật, tắt | Bật |
| Thông báo khi AI tạo xong | Bật, tắt | Bật |
| Thùng rác | Xem, khôi phục, xóa hẳn | |

Chống chụp và quay màn hình không phải là một mục cài đặt: bản phát hành luôn bật, bản dev luôn tắt.

---

## 12. Quy tắc chung cho mọi tính năng AI

1. **Xem trước rồi mới áp dụng.** Kết quả AI không bao giờ tự ghi vào truyện.
2. **Không phá công sức người dùng.** Kết quả ảnh nằm trên lớp mới; kết quả chữ đặt cạnh bản cũ.
3. **Luôn dừng được.** Mọi thao tác đang chạy có nút hủy; hủy trước khi có kết quả thì không trừ credit.
4. **Lỗi thì hoàn credit.** Lỗi mạng, lỗi máy chủ, hết thời gian chờ đều hoàn lại.
5. **Không có mạng:** nút AI mờ đi kèm nhãn "Cần mạng"; phần còn lại của app chạy bình thường.
6. **Kiểm duyệt:** mô tả và kết quả đều qua kiểm duyệt ở máy chủ. Nội dung bị chặn hiện thông báo chung, không trừ credit.
7. **Ngữ cảnh nhất quán:** mọi lời gọi AI văn bản kèm hồ sơ truyện; mọi lời gọi AI ảnh kèm phong cách dự án và ảnh tham chiếu nhân vật.
8. **Minh bạch:** nội dung do AI tạo có dấu tia sáng màu tím nhỏ ở góc cho tới khi người dùng sửa nó.
