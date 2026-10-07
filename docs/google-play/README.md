# Bộ ảnh đăng Google Play

Thư mục này chứa mọi thứ cần dán vào Play Console cho mục "Store listing".

| Thứ | Ở đâu | Kích thước | Yêu cầu của Google Play |
| --- | --- | --- | --- |
| Icon app | `graphics/app-icon-512.png` | 512×512, PNG không trong suốt | 512×512, PNG 32-bit, ≤ 1 MB |
| Ảnh bìa (feature graphic) | `graphics/feature-graphic-1024x500.png` | 1024×500, PNG | 1024×500, JPEG hoặc PNG 24-bit, bắt buộc |
| Ảnh màn hình điện thoại | `screenshots/phone/*.png` | 1080×1920 (9:16) | 2–8 ảnh, mỗi cạnh 320–3840 px, tỉ lệ 16:9 hoặc 9:16 |
| Ảnh màn hình máy tính bảng 10" | `screenshots/tablet-10/*.png` | 1440×2560 (9:16) | 2–8 ảnh, mỗi cạnh 1080–7680 px, tỉ lệ 16:9 hoặc 9:16 |
| Mô tả | `descriptions.txt` | tên, mô tả ngắn, mô tả đầy đủ (tiếng Anh) | 30 / 80 / 4000 ký tự |

Ảnh máy tính bảng 10" dùng được luôn cho ô "7-inch tablet" vì cùng tỉ lệ và cạnh đã trên 1080 px.

## Cách chụp lại

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
