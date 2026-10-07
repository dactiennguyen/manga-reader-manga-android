# Đưa Mangaka AI lên Google Play

Thư mục này chứa mọi thứ cần dán vào Play Console, cùng danh sách từng mục phải điền và câu trả lời gợi ý cho app này. Làm theo thứ tự từ trên xuống.

## 1. Tài sản có sẵn trong thư mục

| Thứ | File | Kích thước | Yêu cầu của Google Play |
| --- | --- | --- | --- |
| Icon app | `graphics/app-icon-512.png` | 512×512, PNG 32-bit có alpha toàn phần | 512×512, PNG 32-bit có alpha, ≤ 1 MB |
| Ảnh bìa (feature graphic) | `graphics/feature-graphic-1024x500.png` | 1024×500, PNG 24-bit không alpha | 1024×500, JPEG hoặc PNG 24-bit, bắt buộc |
| Ảnh màn hình điện thoại | `screenshots/phone/01–06*.png` (6 ảnh chính, 4 ảnh `extra/` dự phòng) | 1080×1920 (9:16) | Tối đa 8 ảnh cho mỗi loại thiết bị; PNG 24-bit/JPEG, 320–3840 px, cạnh dài không quá 2 lần cạnh ngắn |
| Ảnh màn hình máy tính bảng 10" | `screenshots/tablet-10/01–06*.png` (6 ảnh chính, 3 ảnh `extra/` dự phòng) | 1440×2560 (9:16) | Màn hình lớn: tối thiểu 4 ảnh, tối đa 8 ảnh, 1080–7680 px, tỉ lệ 16:9 hoặc 9:16 |
| Mô tả | `descriptions.txt` | tên, mô tả ngắn, mô tả đầy đủ (tiếng Anh) | 30 / 80 / 4000 ký tự |
| Website, chính sách, điều khoản | `../../website/` đã deploy | https://mangaka-ai.pages.dev | Link chính sách phải công khai, không đăng nhập |

Ảnh máy tính bảng 10" dùng được cho ô "7-inch tablet" vì cùng tỉ lệ và cạnh ngắn 1440 px đã trên 1080 px. Không tải toàn bộ thư mục `extra/` cùng với 6 ảnh chính: Play Console chỉ nhận tối đa 8 ảnh cho mỗi loại thiết bị.

### Kết quả kiểm tra bộ file (7/10/2026)

- `app-icon-512.png`: 512×512, PNG `sRGBA` 8-bit, 218,952 bytes; alpha có mặt nhưng mọi pixel đều đục, nên hình ảnh không đổi.
- `feature-graphic-1024x500.png`: 1024×500, PNG `sRGB` 8-bit/3 kênh, 911,062 bytes; đúng loại 24-bit không alpha.
- 10 ảnh điện thoại (6 chính + 4 dự phòng): tất cả 1080×1920, PNG 24-bit không alpha.
- 9 ảnh máy tính bảng (6 chính + 3 dự phòng): tất cả 1440×2560, PNG 24-bit không alpha.
- Tỉ lệ 1080:1920 và 1440:2560 đều là 9:16; bộ 6 ảnh chính của mỗi loại đáp ứng mức tối thiểu 4 ảnh cho đề xuất trên màn hình lớn.
- `descriptions.txt`: tên 24/30 ký tự, mô tả ngắn 79/80, mô tả đầy đủ 2.676/4.000 ký tự.
- Các URL live đã kiểm tra bằng HTTP: trang chủ, `/privacy` và `/terms` đều trả về `200`.

Yêu cầu ảnh ở bảng trên lấy theo trang [Add preview assets to showcase your app](https://support.google.com/googleplay/android-developer/answer/9866151): feature graphic phải là JPEG/PNG 24-bit không alpha; icon phải là PNG 32-bit có alpha; ảnh chụp phải là PNG 24-bit/JPEG và không được kéo giãn. Khi nhập từng ảnh trong Play Console, thêm alt text mô tả ngắn (tối đa 140 ký tự) nếu trường này xuất hiện.

## 2. Việc phải làm trước khi lên Play (chưa xong)

1. **Tạo khóa ký release.** Bản release hiện đang ký bằng `debug.keystore` (xem `android/app/build.gradle`, mục `signingConfigs`). Google không nhận file ký bằng khóa debug. Tạo khóa:

   ```sh
   keytool -genkeypair -v -storetype PKCS12 -keystore mangaka-upload.keystore \
     -alias mangaka -keyalg RSA -keysize 2048 -validity 10000
   ```

   Giữ file này và mật khẩu ở nơi an toàn, **không commit**. Rồi thêm vào `android/app/build.gradle` một `signingConfigs.release` đọc đường dẫn và mật khẩu từ `~/.gradle/gradle.properties` hoặc biến môi trường, và đổi `buildTypes.release.signingConfig` sang nó. Nếu build bằng GitHub Actions thì đưa keystore (base64) và mật khẩu vào Secrets của repo; workflow hiện tại chưa có bước này.

2. **Tăng `versionCode`** mỗi lần nộp bản mới (`android/app/build.gradle`, hiện là 1, `versionName "1.0"`). Play từ chối bản có versionCode trùng hoặc nhỏ hơn bản đã nộp.

3. **Server AI phải là `https://`.** Bản release chặn kết nối không mã hóa. Không cần sửa gì, chỉ cần biết để không bối rối khi test bản release.

4. **Build file nộp:** Play nhận AAB, không nhận APK.

   ```sh
   cd android && ./gradlew bundleRelease
   # file: android/app/build/outputs/bundle/release/app-release.aab
   ```

   Hoặc chạy workflow "Build Android (manual)" trên GitHub với tùy chọn `aab` (sau khi đã thêm keystore vào Secrets).

5. **Target API:** hiện `targetSdkVersion 36`, đáp ứng yêu cầu app mới phải target Android 16/API 36 từ 31/08/2026. Kiểm tra lại khi Google công bố mốc mới.

6. **Đọc lại chính sách quyền riêng tư** trên https://mangaka-ai.pages.dev/privacy một lần: nó mô tả đúng app hiện tại (không tài khoản, không analytics; chỉ gửi nội dung AI khi người dùng chủ động bấm nút tới server họ cấu hình). Nếu sau này thêm đăng nhập, quảng cáo, analytics hoặc server AI mặc định thì phải sửa trang này và khai lại Data safety.

## 3. Tài khoản Play Console

- Đăng ký tại https://play.google.com/console, phí một lần 25 USD.
- Tài khoản **cá nhân** tạo sau **13/11/2023** phải qua bước **thử nghiệm kín**: tối thiểu 12 người thử nghiệm đã opt-in liên tục 14 ngày, rồi mới được xin "Production access". Chuẩn bị sẵn 12 địa chỉ Gmail của bạn bè để thêm vào danh sách tester. Tài khoản tổ chức không thuộc yêu cầu thử nghiệm dành riêng cho tài khoản cá nhân này.
- Email nhà phát triển hiện công khai với người dùng: dùng `mangaka-ai@gmail.com` cho khớp với website.

## 4. Tạo app (Create app)

| Mục | Điền |
| --- | --- |
| App name | `Mangaka AI – Manga Maker` (tối đa 30 ký tự) |
| Default language | English (United States) – en-US |
| App or game | App |
| Free or paid | Free (chọn Free rồi không đổi sang Paid được) |
| Declarations | Tick cả hai ô đồng ý Developer Program Policies và US export laws |

## 5. Store listing (Grow → Store presence → Main store listing)

| Mục | Điền |
| --- | --- |
| App name | như trên |
| Short description | dòng "Short description" trong `descriptions.txt` (79 ký tự) |
| Full description | khối "Full description" trong `descriptions.txt` (2676 ký tự) |
| App icon | `graphics/app-icon-512.png` |
| Feature graphic | `graphics/feature-graphic-1024x500.png` |
| Phone screenshots | 6 ảnh chính `screenshots/phone/01–06.png`, kéo theo thứ tự 01 → 06; `extra/` chỉ là ảnh thay thế |
| 7-inch tablet screenshots | dùng lại 6 ảnh chính trong `screenshots/tablet-10/` |
| 10-inch tablet screenshots | 6 ảnh chính trong `screenshots/tablet-10/` |
| Video | bỏ trống |

Thêm bản dịch tiếng Việt sau cũng được ("Add translation"); hiện mô tả chỉ có tiếng Anh vì giao diện app bằng tiếng Anh.

Alt text gợi ý (mỗi dòng dưới 140 ký tự): `Script editor with scene blocks and dialogue`; `Storyboard with manga panel layouts`; `Panel canvas with inking tools`; `Lettering editor with speech bubbles`; `Manga page preview`; `AI writing assistant chat`.

## 6. Store settings

| Mục | Điền |
| --- | --- |
| App category | Art & Design (hoặc Comics) |
| Tags | Comics, Drawing, Creativity (tối đa 5) |
| Contact email | `mangaka-ai@gmail.com` (bắt buộc) |
| Contact phone | bỏ trống |
| Website | `https://mangaka-ai.pages.dev` |
| External marketing | tùy chọn |

## 7. App content (Policy → App content): phải khai hết mới nộp được

| Mục | Trả lời cho Mangaka AI |
| --- | --- |
| **Privacy policy** | `https://mangaka-ai.pages.dev/privacy` |
| **App access** | "All functionality is available without special access" (không có đăng nhập, không mã mời) |
| **Ads** | No, app không có quảng cáo |
| **Content ratings** | Bắt buộc hoàn tất bảng IARC và trả lời theo nội dung/chức năng thật của bản phát hành; không tự đoán kết quả Everyone/PEGI 3. Nếu app thay đổi tính năng hoặc nội dung, làm lại bảng hỏi. |
| **Target audience and content** | Chọn đúng nhóm tuổi mà app thực sự hướng tới. Nhóm 13–15 hoặc 16–17 có thể được xem là trẻ em ở một số khu vực và kéo theo Families Policy; không chọn nhóm tuổi chỉ để né chính sách. |
| **News apps** | No |
| **COVID-19 contact tracing** | No |
| **Data safety** | Xem mục 8 |
| **Government apps** | No |
| **Financial features** | No, app không có tính năng tài chính |
| **Health** | No |
| **Advertising ID** | No, app không dùng Advertising ID (không có SDK quảng cáo hay analytics) |

## 8. Data safety (bản khai thu thập dữ liệu)

Phần này không thể chốt chỉ từ việc dữ liệu được lưu cục bộ. Google định nghĩa “collect” là truyền dữ liệu ra khỏi thiết bị; ngoại lệ user-initiated action chủ yếu nói về mục “sharing”. Bản release có thể gửi nội dung truyện, câu hỏi và API key trong request AI tới server do người dùng nhập. Vì vậy phải khai theo hành vi của bản AAB thực tế và cách server đó xử lý dữ liệu, không tự động chọn **No**.

| Câu hỏi | Trả lời |
| --- | --- |
| Does your app collect or share any of the required user data types? | **No** chỉ khi bản phát hành không truyền dữ liệu ra ngoài thiết bị. Nếu bật AI, rà soát tối thiểu `Other user-generated content` (optional, App functionality) và credential/API key nếu Play phân loại là dữ liệu xác thực. |
| Is all of the user data collected by your app encrypted in transit? | **Yes** chỉ khi mọi request của bản release dùng HTTPS; hiện release chặn cleartext nhưng vẫn phải kiểm tra AAB thực tế. |
| Do you provide a way for users to request that their data is deleted? | Nếu server AI lưu dữ liệu, dùng cơ chế xoá của server đó hoặc mô tả rõ không có dữ liệu nào do nhà phát triển lưu. |

Không có analytics, crash report, quảng cáo hay tài khoản trong mã hiện tại; dữ liệu chỉ xử lý cục bộ khi không dùng AI. Trang privacy đã nói rõ request AI chỉ được gửi sau thao tác của người dùng và tới server họ cấu hình, nhưng điều đó không thay thế Data safety form. Google yêu cầu form phản ánh tổng hợp hành vi của mọi phiên bản đang phân phối.

## 9. Thử nghiệm và phát hành (Release)

1. **Internal testing** trước: Testing → Internal testing → Create release → tải `app-release.aab` → Release notes (mẫu bên dưới) → Review → Start rollout. Thêm email tester, mở link opt-in trên máy thật, cài và chạy thử bản release (chú ý server AI phải là `https`).
2. **Closed testing** (bắt buộc với tài khoản cá nhân mới): tạo track, thêm 12+ tester, giữ 14 ngày, rồi xin Production access trong Dashboard.
3. **Production**: Create release → chọn lại AAB → quốc gia phát hành: "All countries" hoặc chỉ Việt Nam và các nước nói tiếng Anh → Review → Rollout. Lần đầu Google duyệt mất vài ngày tới một tuần.
4. Mỗi bản sau: tăng `versionCode`, build AAB mới, tạo release mới ở track mong muốn.

Release notes mẫu (en-US, tối đa 500 ký tự):

```
<en-US>
First release of Mangaka AI.
• Write scripts scene by scene with characters and a world wiki
• Auto-paginate into pages and panels, 25+ layouts
• Draw with G-pen, pencil, brush, screentones and layers
• Letter with speech bubbles, narration and SFX
• Read, then export PDF, PNG, CBZ or webtoon image
• Optional AI help through your own OpenAI-compatible server
</en-US>
```

## 10. Những gì Google hay từ chối ở app kiểu này

- Ảnh màn hình có chữ "debug", thanh thông báo lộn xộn, hoặc không phải ảnh thật của app. Bộ ảnh ở đây chụp từ bản debug nhưng không hiện gì của debug; nếu chụp lại thì nhớ tắt toast "Open debugger".
- Tên app chứa "AI" cộng với mô tả hứa hẹn tạo ảnh. Mô tả hiện chỉ nói AI hỗ trợ **phần chữ** và cần server riêng; giữ nguyên như vậy cho đúng với app.
- Link chính sách quyền riêng tư chết hoặc trang không nói về app. Trang hiện tại nêu đúng tên gói `com.manga.reader.viewer.pro`.
- Khai Data safety mâu thuẫn với quyền trong manifest. App chỉ xin `INTERNET` và `VIBRATE`, khớp với bản khai.

## 11. Cách chụp lại bộ ảnh

Truyện mẫu được sinh bằng `__tests__/sampleStory.test.ts` (bỏ qua khi chạy `npm test` bình thường):

```sh
SEED_OUT=/tmp/seed npx jest __tests__/sampleStory.test.ts
# mỗi thư mục /tmp/seed/<lantern|bakery|shrine>/ có story.json; thêm images/cover.png (600×850) rồi nén:
cd /tmp/seed/lantern && zip -r ../lantern.mangaka story.json images
adb push /tmp/seed/lantern.mangaka /sdcard/Download/
```

Rồi trong app: Profile → Import project → chọn file. Nạp theo thứ tự shrine, bakery, lantern để "Lantern Courier" đứng đầu Thư viện.

- Ảnh chụp từ bản debug chạy trên máy ảo Android 14 (Pixel 2 1080×1920 @420dpi cho điện thoại; Pixel Tablet chỉnh 1440×2560, `adb shell wm density 340` cho máy tính bảng). Trên máy tính bảng phải tắt thanh taskbar của launcher trước khi chụp: `adb shell pm disable-user --user 0 com.google.android.apps.nexuslauncher`.
- Ảnh chụp bằng `adb exec-out screencap -p`, giữ nguyên kích thước màn hình, chỉ bỏ kênh alpha để thành PNG 24-bit (`magick in.png -alpha off out.png`).
- Thanh trạng thái dùng chế độ demo của Android (đồng hồ 10:00, pin đầy, Wi-Fi đủ vạch, không thông báo):
  `adb shell settings put global sysui_demo_allowed 1` rồi `adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 1000` (và các lệnh `battery`, `network`, `notifications` tương tự). Đổi density làm mất chế độ demo, phải bật lại.
- Bản release bật chống chụp màn hình, nên phải chụp bằng bản debug.

Ảnh trong `docs/` nói chung không được commit (xem `.gitignore`), riêng thư mục `docs/google-play/` có ngoại lệ nên bộ ảnh này nằm trong git.
