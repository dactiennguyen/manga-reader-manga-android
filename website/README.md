# Website cho Google Play

Trang web tĩnh (HTML + CSS thuần, không cần build) cung cấp hai link mà Play Console yêu cầu hoặc khuyên nên có:

| Trang | File | Dùng ở đâu trong Play Console |
| --- | --- | --- |
| Chính sách quyền riêng tư | `privacy.html` | App content → Privacy policy (bắt buộc) |
| Điều khoản sử dụng | `terms.html` | Store listing → thêm vào mô tả hoặc trang web |
| Trang giới thiệu | `index.html` | Store listing → Website |

Email hỗ trợ trong ba file HTML là `mangaka-ai@gmail.com`; nếu đổi thì sửa cả ba file và khai cùng email đó ở Play Console. Nếu đổi tên gói, sửa cả `com.manga.reader.viewer.pro` trong `index.html` và `privacy.html`.

## Deploy lên Cloudflare Pages

Cách 1, qua giao diện: Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git → chọn repo này. Ở phần build đặt:

- Build command: để trống
- Build output directory: `website`

Mỗi lần push nhánh đã chọn, Cloudflare tự deploy lại.

Cách 2, bằng dòng lệnh (không cần nối Git). Dự án Pages `mangaka-ai` đã được tạo (wrangler 4 cần `--force` khi tạo để tạo đúng dự án Pages thay vì Worker; chỉ cần một lần). Mỗi lần sửa trang chỉ chạy:

```sh
npx wrangler pages deploy website --project-name mangaka-ai --branch main --commit-dirty=true
```

Pages tự bỏ đuôi `.html`: `/privacy.html` được chuyển hướng sang `/privacy`, nên link trong trang và link khai ở Play Console đều dùng dạng không có đuôi.

Sau khi deploy, hai link cần dán vào Play Console có dạng:

- `https://mangaka-ai.pages.dev/privacy`
- `https://mangaka-ai.pages.dev/terms`

Gắn tên miền riêng trong Pages → Custom domains nếu muốn link đẹp hơn. Link chính sách quyền riêng tư phải truy cập được công khai, không yêu cầu đăng nhập, và không được đổi địa chỉ sau khi app đã lên store.

`cloudflared tunnel` (Cloudflare Tunnel) cũng chạy được, nhưng nó chỉ nối một máy đang chạy ra Internet; máy tắt là link chết. Với trang chính sách nên dùng Pages, miễn phí và luôn sẵn sàng.

## Xem thử trên máy

```sh
python3 -m http.server 8000 --directory website
```

rồi mở `http://localhost:8000/privacy.html`.
