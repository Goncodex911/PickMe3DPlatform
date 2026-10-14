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

## ✅ Nhóm 2: Tính Năng Nâng Cao — Cần Cả Frontend + Backend Mới (ĐÃ HOÀN THÀNH)

### 2.1 — 🔔 Thông Báo & Hoạt Động ✅
**Mô tả:** Khi người khác like / fork / review thiết kế của bạn → nhận thông báo  
**Backend:** ✅ Model `Notification`, endpoint `GET /api/notifications`, helper tự động tạo notification  
**Frontend:** ✅ `NotificationBell` component — Badge đỏ trên icon chuông, panel thông báo, mark read/all  
**Tích hợp:** ✅ Đã tích hợp vào header trang Templates, Profile, Creator Profile, Template Detail

### 2.2 — 👤 Trang Profile Công Khai ✅
**Mô tả:** Mỗi user có trang `/creator/[username]` có thể chia sẻ  
**Hiển thị:** ✅ Avatar, bio, username, tổng số thiết kế / lượt like / fork nhận được  
**Backend:** ✅ Endpoint `GET /api/users/:id/public`, `GET /api/users/username/:username`, field `bio`+`username` trong User model  
**Frontend:** ✅ Trang `/creator/[username]`, tab Thiết kế + Bộ sưu tập, stats cards  
**Chỉnh sửa:** ✅ User có thể chỉnh bio/username từ trang Profile, link đến hồ sơ công khai  
**Liên kết:** ✅ Tên tác giả trên Template Detail bấm được → mở Public Profile

### 2.3 — 🔍 Tìm Kiếm Nâng Cao ✅
**Mô tả:** Trang Templates hiện có search text đơn giản  
**Nâng cấp:** ✅ Đã triển khai đầy đủ:
- ✅ Filter đa hashtag (click nhiều tag cùng lúc)
- ✅ Filter theo khoảng thời gian (tuần này / tháng này)
- ✅ Filter "Chỉ hiện thiết kế đã fork được"
- ✅ Backend: Index `{ title: 'text', description: 'text', tags: 'text' }` + query params `tags`, `dateRange`, `forkable`
- ✅ Frontend: Component `AdvancedSearchFilters` tích hợp vào trang Templates

### 2.4 — 💬 Bình Luận Trên Thiết Kế ✅
**Mô tả:** Hệ thống comment riêng (khác với review sao)  
**Backend:** ✅ Model `Comment` riêng, CRUD endpoints, reply thread, like comment, tự động gửi notification  
**Frontend:** ✅ `CommentThread` component — thread comment, reply, like, xóa  
**Tích hợp:** ✅ Đã tích hợp vào trang chi tiết `/templates/[id]`

### 2.5 — 📦 Bộ Sưu Tập (Collections) ✅
**Mô tả:** User có thể tạo "Board" / Collection để ghim các mẫu yêu thích  
**Ví dụ:** "Mùa hè 2026", "Cảm hứng tối giản"  
**Backend:** ✅ Model `Collection { name, description, user, templates[], isPublic, coverImage }`, CRUD endpoints  
**Frontend:** ✅ `CollectionManager` — AddToCollectionModal + CollectionCard  
**Tích hợp:** ✅ Nút "Lưu vào Bộ Sưu Tập" trên Template Detail, tab BST trên Profile, hiển thị trên Creator Profile

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

| Tính năng | Độ khó | Giá trị | Trạng thái |
|---|---|---|---|
| Trang `/templates/[id]` | ⭐ Thấp | 🔥 Cao | ✅ Đã xong |
| Chỉnh sửa từ Profile | ⭐ Thấp | 🔥 Cao | ✅ Đã xong |
| Export PNG/PDF | ⭐⭐ Trung | 🔥 Cao | ✅ Có |
| Trang Profile công khai | ⭐⭐ Trung | 🔥 Cao | ✅ Đã xong |
| Tìm kiếm nâng cao | ⭐⭐ Trung | 🟡 Trung | ✅ Đã xong |
| AI Generate | ⭐⭐⭐ Cao | 🔥 Cao | 🟡 Nên |
| Collections/Board | ⭐⭐ Trung | 🟡 Trung | ✅ Đã xong |
| Embed Widget | ⭐ Thấp | 🟡 Trung | ✅ Đã xong |
| Thông báo | ⭐⭐⭐ Cao | 🟡 Trung | ✅ Đã xong |
| Bình luận | ⭐⭐ Trung | 🟡 Trung | ✅ Đã xong |
| Contest | ⭐⭐⭐⭐ Cao | 🔥 Cao | 🔴 Sau |
| Gói trả phí | ⭐⭐⭐⭐ Cao | 🔥 Cao | 🔴 Sau |
