# Mangaka AI

App Android giúp một người tự làm trọn một chương manga trên điện thoại: viết kịch bản, dựng nhân vật, chia khung, vẽ tranh, đặt thoại và xuất file. Viết bằng React Native, giao diện tiếng Anh.

Tài liệu sản phẩm nằm trong [docs/](docs/): [tổng quan](docs/mangaka-ai.md), [mô tả tính năng](docs/features.md), [mô tả 20 màn hình](docs/screens/README.md), [tình trạng triển khai](docs/status.md) và [ảnh chụp màn hình](docs/screenshots/).

Phần AI (gợi ý cốt truyện, vẽ khung, trợ lý) chưa làm; bản hiện tại gồm các tính năng làm tay. App đọc truyện cũ còn ở tag `legacy-reader`.

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

## Build APK hoặc AAB thủ công trên GitHub Actions

Workflow [Build Android (manual)](.github/workflows/build-android.yml) chỉ chạy khi bấm **Run workflow**. Workflow cài dependency bằng `npm ci`, kiểm tra TypeScript, ESLint và Jest, rồi build release bằng Gradle wrapper của project.

1. Push code lên GitHub; file workflow cần có trên nhánh mặc định để hiện nút chạy thủ công.
2. Mở **Actions → Build Android (manual) → Run workflow**, chọn nhánh cần build.
3. Chọn định dạng `apk` để cài trực tiếp lên thiết bị, hoặc `aab` để tạo Android App Bundle.
4. Chọn `arm64` cho điện thoại Android 64-bit hoặc `universal` để gộp mọi kiến trúc.
5. Khi job hoàn tất, tải file trong **Artifacts**. Artifact được giữ 14 ngày.

Hiện `android/app/build.gradle` ký bản release bằng `android/app/debug.keystore` có sẵn trong repo, chỉ phù hợp thử nghiệm. Cần cấu hình khóa ký riêng trước khi phát hành lên Google Play.

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
