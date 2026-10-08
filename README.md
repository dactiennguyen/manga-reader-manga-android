# Mangaka AI

App Android giúp một người tự làm trọn một chương manga trên điện thoại: viết kịch bản, dựng nhân vật, chia khung, vẽ tranh, đặt thoại và xuất file. Viết bằng React Native, giao diện tiếng Anh.

Tài liệu sản phẩm nằm trong [docs/](docs/): [tổng quan](docs/mangaka-ai.md), [mô tả tính năng](docs/features.md), [mô tả 20 màn hình](docs/screens/README.md) và [tình trạng triển khai](docs/status.md).

Phần AI (gợi ý cốt truyện, vẽ khung, trợ lý) chưa làm; bản hiện tại gồm các tính năng làm tay, liệt kê trong [tình trạng triển khai](docs/status.md). App đọc truyện cũ còn ở tag `legacy-reader`.

## Chạy app

Cần Node 22 ≥ 22.13, JDK 17 và Android SDK.

```sh
npm install
npm start          # Metro
npm run android    # build và cài lên máy/emulator
```

Kiểm tra mã nguồn:

```sh
npx tsc --noEmit
npm run lint
npm test
```

## Bật AI khi phát triển

Các tính năng AI (gợi ý truyện, cốt truyện, chia cảnh) gọi tới một server tương thích API của OpenAI do bạn tự chạy. App không kèm server nào.

1. Chạy server trên máy tính, ví dụ [gemini-web2api](https://github.com/Sophomoresty/gemini-web2api) ở cổng 8081.
2. Trong app mở **Profile → AI server**, nhập địa chỉ. Trên máy ảo Android, máy tính là `10.0.2.2`, ví dụ `10.0.2.2:8081`; trên máy thật dùng IP của máy tính trong mạng nội bộ.
3. Bấm **Test connection** rồi **Save**.

Bản debug cho phép kết nối `http://`; bản release thì không, xem [tình trạng triển khai](docs/status.md).

## Ảnh chụp khi test

Ảnh chụp màn hình tạo ra trong lúc test **không commit vào repo**. Lưu chúng vào thư mục `test-screenshots/` ở gốc project; thư mục này đã nằm trong `.gitignore`. Thư mục `docs/` chỉ chứa văn bản: file ảnh đặt trong đó cũng bị `.gitignore` bỏ qua. Ngoại lệ duy nhất là bộ ảnh đăng Google Play trong `docs/google-play/`.

## Build APK hoặc AAB thủ công trên GitHub Actions

Workflow [Build Android (manual)](.github/workflows/build-android.yml) chỉ chạy khi bấm **Run workflow**. Workflow cài dependency bằng `npm ci`, kiểm tra TypeScript, ESLint và Jest, rồi build release bằng Gradle wrapper của project.

1. Push code lên GitHub; file workflow cần có trên nhánh mặc định để hiện nút chạy thủ công.
2. Mở **Actions → Build Android (manual) → Run workflow**, chọn nhánh cần build.
3. Chọn định dạng `apk` để cài trực tiếp lên thiết bị, hoặc `aab` để tạo Android App Bundle.
4. Chọn `arm64` cho điện thoại Android 64-bit hoặc `universal` để gộp mọi kiến trúc.
5. Nhập **version_name** (tên bản hiển thị cho người dùng, ví dụ `1.0.1`) và **version_code** (số nguyên, phải tăng dần mỗi lần nộp Google Play). Để trống version_code thì workflow dùng số lần chạy (`run_number`), tự tăng theo mỗi lần bấm.
6. Khi job hoàn tất, tải file trong **Artifacts** (tên dạng `mangaka-ai-1.0.1-12-aab-arm64`). Artifact được giữ 14 ngày.

Build tại máy cũng truyền được hai giá trị này: `./gradlew bundleRelease -PversionName=1.0.1 -PversionCode=12`. Không truyền thì dùng `1.0` và `1` ghi trong `android/app/build.gradle`.

Bản release được ký bằng upload key `android/app/mangaka-upload.keystore` (alias `mangaka`) có sẵn trong repo, mật khẩu ghi thẳng trong `android/app/build.gradle`. Vì vậy build tại máy hay trên GitHub Actions đều không cần cấu hình Secrets.

## Cấu trúc

```
src/
├── app/          # AppRoot (khởi động), navigation (thanh tab + stack), routes
├── components/   # UI dùng chung: ui.tsx, comic.tsx (thẻ viền mực, bong bóng, bìa…),
│                 # Sheet, CharacterPicker, PageView (vẽ một trang), icons
├── engine/       # dựng trang truyện bằng Skia
│   ├── layout.ts     # cây chia khung, mẫu khung, thứ tự đọc (TS thuần, có test)
│   ├── art.ts        # nét vẽ và lớp
│   ├── lettering.ts  # bong bóng thoại, SFX, hiệu ứng
│   ├── page.ts       # ghép khung + tranh + thoại thành một trang, xuất ảnh, thumbnail
│   └── artStore.ts   # lưu tranh từng khung (MMKV)
├── features/     # mỗi thư mục là một nhóm màn hình
│   ├── onboarding/ home/ library/ project/ profile/
│   ├── outline/ script/ characters/ world/
│   ├── storyboard/ page/ canvas/ lettering/
│   └── preview/ export/
├── lib/          # storage (MMKV), files (ảnh, zip, PDF, chia sẻ), projectArchive (.mangaka)
├── model/        # kiểu dữ liệu, hằng và nhãn, selector, chia trang theo quy tắc
├── store/        # Zustand: useStory (truyện), useSettings, lịch sử kịch bản
└── theme/        # bảng màu "Mực và Giấy" sáng/tối, phông, khoảng cách
specs/            # TurboModule của app: NativeScreen, NativeFiles (Android/Kotlin)
```

## Dữ liệu

- Truyện, chương, kịch bản, nhân vật, trang lưu trong store `useStory`, ghi xuống MMKV.
- Tranh của mỗi khung lưu riêng theo id khung, dạng danh sách nét vẽ (vector) theo từng lớp.
- Tọa độ trên trang tính theo "đơn vị trang": bề rộng trang luôn là 1000, nên tranh và thoại không phụ thuộc độ phân giải khi xuất.
- Bố cục khung là một cây nhị phân: mỗi nút cắt một vùng làm hai theo một đường ngang, dọc hoặc chéo.
- Ảnh người dùng thêm (bìa, bảng thiết kế nhân vật, ảnh thế giới) chép vào thư mục riêng của app.

## Giao diện

Phong cách "Mực và Giấy": nền giấy ngà, viền mực đậm, một màu đỏ son làm điểm nhấn, tiêu đề dùng phông Anton.

Icon dùng font Material Icons. `src/components/icons.tsx` được sinh bởi `scripts/gen-icons.py`; thêm icon thì sửa bảng `MAP` trong script rồi chạy lại.

Phông Anton, Be Vietnam Pro và Patrick Hand dùng giấy phép SIL OFL, font Material Icons dùng Apache 2.0. Xem `android/app/src/main/assets/fonts/FONT-LICENSES.txt`.
