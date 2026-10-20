# PickMe3D Slide Studio (PPTist)

Thư mục này là PPTist (https://github.com/pipipi-pikachu/PPTist, commit 04e06cb, AGPL-3.0) cộng thêm phần nối với PickMe3D.
Vì studio được phục vụ qua mạng, mã nguồn thư mục này (kể cả phần sửa) phải công khai theo AGPL-3.0. Giữ nguyên LICENSE và ghi công tác giả.

## Chạy

```
npm install --ignore-scripts
npm run dev        # http://localhost:5174
```

Host Next.js đọc `NEXT_PUBLIC_SLIDE_STUDIO_URL` (mặc định `http://localhost:5174`). Studio chỉ nhận tin từ `VITE_HOST_ORIGIN` (mặc định `http://localhost:3000`, xem `.env.example`).

## Phần PickMe3D thêm vào

- `src/bridge/index.ts`: cầu nối postMessage.
  - Studio -> host: `PM_READY`, `PM_SAVE` (title, slides PPTist, theme, thumbnail JPEG, requestId), `PM_SAVE_STATUS`, `PM_REQUEST_FEATURE` (`ai-slide` kèm topic, `export-pptx` khi gói chặn).
  - Host -> studio: `PM_INIT` (deck, plan, features, designs), `PM_PLAN`, `PM_FLUSH` (lưu ngay, trả `PM_SAVE` cùng requestId), `PM_INSERT_DESIGN` (chèn ảnh vào slide hiện tại).
  - Tự lưu sau 1,5 giây kể từ thay đổi cuối; Ctrl+S lưu ngay. Deck `readOnly` hoặc `?mode=view` chỉ trình chiếu, không lưu.
- `src/bridge/legacy.ts`: đổi deck cũ (title/body/image/icons theo %) sang slide PPTist khi mở lần đầu. Lần lưu sau, backend nhận định dạng PPTist.
- `src/bridge/AITopicDialog.vue`: nút AI trong header gọi backend PickMe3D (tính quota), không gọi server.pptist.cn.
- `src/bridge/UpgradeNotice.vue`: tab Xuất PPTX bị chặn khi `features.exportPptx` là false.
- Sửa nhỏ: `App.vue`, `views/Editor/index.vue`, `EditorHeader`, `ExportDialog`, `configs/font.ts`, `index.html`, `vite.config.ts` (cổng 5174), tiêu đề mặc định trong `store/slides.ts`.

## Còn lại

- Phần lớn giao diện vẫn là tiếng Trung; mới Việt hoá header, hộp xuất và màn tải.
- Thư viện ảnh (`ImageLibPanel`) và AI viết lại chữ vẫn gọi `server.pptist.cn` qua `src/services`.
- Ảnh xuất cho gói Free chưa có watermark.
