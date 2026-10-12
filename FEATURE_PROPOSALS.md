# 🚀 Đề Xuất Tính Năng Mới — PickMe3D Platform

## Tổng Quan Hiện Tại

| Thành phần | Đã có |
|---|---|
| **Editor 3D** | ✅ Canvas kéo thả, layers, inspector, theme, AI panel |
| **Auth** | ✅ Google Login, JWT token |
| **Templates** | ✅ Lưu, xem, fork, like, đánh giá (★), tìm kiếm, sort |
| **Profile** | ✅ Xem thiết kế cá nhân, toggle public/private, xóa |
| **Landing Page** | ✅ Sticky scroll 3D canvas, hero, pricing |
| **Backend API** | ✅ CRUD templates, like, review, user profile |

---

## 🟢 Nhóm 1: Backend Đã Sẵn Sàng — Chỉ Cần Làm Frontend

> Backend model/API đã tồn tại, chỉ cần build giao diện

### 1.1 — Trang Chi Tiết Template Công Khai
**Vấn đề:** Hiện tại `TemplateDetailModal` chỉ là popup, không có URL riêng  
**Đề xuất:** Tạo page `/templates/[id]` với:
- Preview thiết kế 3D đầy đủ
- Thông tin tác giả + nút Follow
- Section reviews/ratings (★) đã có API `POST /templates/:id/review`
- Nút **Dùng mẫu này** / **Fork & Chỉnh sửa**
- Chia sẻ link có thể nhúng (embed)

### 1.2 — Bộ Đếm Fork Trực Quan
**Vấn đề:** `forksCount` đã được lưu trong DB nhưng chưa hiển thị rõ ràng  
**Đề xuất:** Hiển thị "🔁 X lần được dùng lại" trên TemplateCard

### 1.3 — Chỉnh Sửa Thiết Kế Từ Profile
**Vấn đề:** Profile có nút "Chỉnh sửa" nhưng chỉ navigate, chưa tải đúng docData  
**Đề xuất:** Flow: Profile → Click Edit → Editor tải đúng thiết kế → Lưu ghi đè lên bản gốc

---

## 🟡 Nhóm 2: Tính Năng Nâng Cao — Cần Cả Frontend + Backend Mới

### 2.1 — 🔔 Thông Báo & Hoạt Động
**Mô tả:** Khi người khác like / fork / review thiết kế của bạn → nhận thông báo  
**Backend cần thêm:** Model `Notification`, endpoint `GET /api/notifications`  
**Frontend:** Badge đỏ trên icon chuông ở header, panel thông báo trượt từ phải

### 2.2 — 👤 Trang Profile Công Khai
**Mô tả:** Mỗi user có trang `/creator/[username]` có thể chia sẻ  
**Hiển thị:** Avatar, bio, tổng số thiết kế / lượt like / fork nhận được  
**Backend cần thêm:** Endpoint `GET /api/users/:id/public`, field `bio` trong User model

### 2.3 — 🔍 Tìm Kiếm Nâng Cao
**Mô tả:** Trang Templates hiện có search text đơn giản  
**Nâng cấp:**
- Filter đa hashtag (click nhiều tag cùng lúc)
- Filter theo khoảng thời gian (tuần này / tháng này)
- Filter "Chỉ hiện thiết kế đã fork được"
- Backend: Index đã có `{ title: 'text', description: 'text', tags: 'text' }`

### 2.4 — 💬 Bình Luận Trên Thiết Kế
**Mô tả:** Hệ thống comment riêng (khác với review sao)  
**Backend cần thêm:** Array `comments[]` trong Template model hoặc Model riêng  
**Frontend:** Thread comment dưới detail view, có reply, like comment

### 2.5 — 📦 Bộ Sưu Tập (Collections)
**Mô tả:** User có thể tạo "Board" / Collection để ghim các mẫu yêu thích  
**Ví dụ:** "Mùa hè 2026", "Cảm hứng tối giản"  
**Backend cần thêm:** Model `Collection { name, user, templates[] }`

---

## 🔴 Nhóm 3: Tính Năng Chiến Lược — Giá Trị Cao

### 3.1 — 🤖 AI Generate Từ Mô Tả
**Mô tả:** Người dùng nhập mô tả bằng ngôn ngữ tự nhiên → AI tạo ra bản thiết kế  
**Ví dụ:** "Tạo cho tôi một outfit streetwear màu đen, có mũ, phong cách cyberpunk"  
**Tích hợp:** Gemini API / Claude API → trả về `docData` cấu trúc → load vào editor  
> 💡 `AiPanel.tsx` và `PromptPanel.tsx` đã có sẵn trong dự án!

### 3.2 — 🖼️ Export Ảnh / PDF Catalogue
**Mô tả:** Xuất thiết kế ra file PNG/PDF chất lượng cao  
**Đã có:** `toPng` từ `html-to-image` trong Editor.tsx  
**Nâng cấp:** Modal export với tùy chọn kích thước (Instagram 1:1, Story 9:16, A4), watermark

### 3.3 — 🌐 Embed Widget
**Mô tả:** Nhúng thiết kế vào website ngoài bằng iframe  
**URL:** `/embed/[templateId]` — chỉ hiển thị canvas 3D, không có UI  
**Ứng dụng:** Fashion blog, lookbook online nhúng vào bài viết

### 3.4 — 💳 Hệ Thống Gói Trả Phí (Monetization)
**Mô tả:** Giới hạn tính năng theo plan  
**Phân tầng gợi ý:**

| | Free | Pro | Studio |
|---|---|---|---|
| Số thiết kế lưu | 5 | Không giới hạn | Không giới hạn |
| Export HD | ❌ | ✅ | ✅ |
| AI Generate | 3/tháng | 50/tháng | Không giới hạn |
| Private designs | ❌ | ✅ | ✅ |

**Backend cần thêm:** Field `plan` trong User model, middleware kiểm tra plan

### 3.5 — 🏆 Hệ Thống Thách Đấu / Contest
**Mô tả:** Tổ chức cuộc thi thiết kế theo chủ đề  
**Ví dụ:** "Thiết kế outfit Halloween tốt nhất - deadline 31/10"  
**Cộng đồng vote** → tác giả thắng được badge hiển thị trên profile  
**Backend cần thêm:** Model `Contest`

---

## 📊 Ma Trận Ưu Tiên

| Tính năng | Độ khó | Giá trị | Nên làm trước? |
|---|---|---|---|
| Trang `/templates/[id]` | ⭐ Thấp | 🔥 Cao | ✅ Có |
| Chỉnh sửa từ Profile | ⭐ Thấp | 🔥 Cao | ✅ Có |
| Export PNG/PDF | ⭐⭐ Trung | 🔥 Cao | ✅ Có |
| Trang Profile công khai | ⭐⭐ Trung | 🔥 Cao | ✅ Có |
| Tìm kiếm nâng cao | ⭐⭐ Trung | 🟡 Trung | 🟡 Nên |
| AI Generate | ⭐⭐⭐ Cao | 🔥 Cao | 🟡 Nên |
| Collections/Board | ⭐⭐ Trung | 🟡 Trung | 🟡 Nên |
| Embed Widget | ⭐ Thấp | 🟡 Trung | 🟡 Nên |
| Thông báo | ⭐⭐⭐ Cao | 🟡 Trung | 🔴 Sau |
| Contest | ⭐⭐⭐⭐ Cao | 🔥 Cao | 🔴 Sau |
| Gói trả phí | ⭐⭐⭐⭐ Cao | 🔥 Cao | 🔴 Sau |
