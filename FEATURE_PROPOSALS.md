# 🚀 Đề Xuất & Báo Cáo Rà Soát Tính Năng — PickMe3D Platform

> **Thời điểm cập nhật:** 02/11/2026 — Nhánh: `thuan-confirm`  
> **Mục tiêu:** Rà soát toàn diện hiện trạng mã nguồn dự án, làm rõ các tính năng còn dang dở (ngoài hệ thống Upload bản vẽ & Dựng 3D đang thực hiện) và đề xuất các tính năng mới có tiềm năng mở rộng lớn cho nền tảng PickMe3D.

---

## 📌 1. Tổng Quan Hiện Trạng Toàn Dự Án

| Phân hệ | Các thành phần đã triển khai | Trạng thái |
|---|---|---|
| **Editor UI & 2D/3D Canvas** | Canvas tương tác, Material 3 components, Layers, Inspector, Viewport máy tính/tablet/mobile, Import/Export (HTML, React, Angular, PNG, PDF), Undo/Redo. | ✅ Hoạt động ổn định |
| **Bản vẽ 2D sang 3D (Blueprint 3D)** | `CasaSerraViewer`, Three.js 3D walkthrough, camera orbit/first-person, floorplan scanner. *(Đang tiếp tục hoàn thiện logic parse AI & extrude)*. | 🟡 Đang hoàn thiện |
| **Hệ thống Trình chiếu (Slide Studio)** | Quản lý slide deck, AI generate slide từ chủ đề, tích hợp Vue slide-editor qua iframe bridge, xuất PPTX/PDF. | ✅ Hoạt động tốt |
| **Xác thực & Người dùng (Auth & Profile)** | Google OAuth, Guest login, Admin login, Creator Profile (`/creator/[username]`), chỉnh sửa Bio/Avatar/Vai trò, Cloudinary media upload. | 🟡 Cần bổ sung phương thức auth truyền thống |
| **Cộng đồng & Tương tác (Social)** | Mẫu thiết kế (`/templates`, `/templates/[id]`), Like, Fork, Review sao, Comment thread phân cấp, Bộ sưu tập (Collections), Chuông thông báo (NotificationBell). | ✅ Đã hoàn thành |
| **Thanh toán & Gói dịch vụ (Billing)** | Tích hợp payOS link checkout + Mock mode, Webhook xử lý nâng hạng tài khoản (Free, Pro, Studio), Quota kiểm tra theo gói. | ✅ Đã kết nối |
| **Quản trị hệ thống (Admin Portal)** | Dashboard quản lý người dùng (khóa/mở khóa tài khoản), duyệt template, xem audit logs, thống kê doanh thu & báo cáo vi phạm. | ✅ Đầy đủ |
| **UI Marketplace** | Thư viện 200+ animations/micro-interactions tương tác, live iframe demo, copy code/download. | 🟡 Dang dở cơ chế lưu trữ & tích hợp |

---

## ⚠️ 2. Rà Soát: Các Chức Năng Chưa Hoàn Thiện / Còn Dang Dở
*(Loại trừ 2 chức năng đang làm dở: Upload bản vẽ 2D và Tái tạo mô hình 3D)*

### 2.1 — Cơ Chế Lưu Bản Quyền & Đồng Bộ UI Marketplace Vào Cơ Sở Dữ Liệu
- **Hiện trạng:** Tại [`frontend/lib/purchased-animations.ts`](file:///d:/CODE/PickMe3D/frontend/lib/purchased-animations.ts), các template / animation mà người dùng "mua" chỉ được ghi tạm vào `localStorage` của trình duyệt (`pickme3d_purchased_templates`). Backend hoàn toàn chưa có Model lưu đơn hàng Marketplace (`Purchase` / `MarketplaceOrder`).
- **Hệ quả:** Khi người dùng đổi thiết bị, đăng nhập máy khác hoặc xóa dữ liệu trình duyệt, toàn bộ template đã mua sẽ bị mất sạch mà không có cách khôi phục.
- **Giải pháp cần làm:**
  - **Backend:** Thêm Mongoose Model `MarketplacePurchase { userId, templateId, price, purchasedAt }`.
  - **API:** Xây dựng endpoint `GET /api/marketplace/my-purchases` và `POST /api/marketplace/purchase`.
  - **Frontend:** Đồng bộ danh sách template đã mua về tài khoản ngay khi đăng nhập.

### 2.2 — Cầu Nối Giữa UI Marketplace & Canvas Editor (Insert trực tiếp vào Canvas)
- **Hiện trạng:** Tại [`frontend/components/UIMarketplace.tsx`](file:///d:/CODE/PickMe3D/frontend/components/UIMarketplace.tsx), người dùng chỉ có thể xem demo, copy mã nguồn HTML/JS hoặc tải file ZIP về máy.
- **Vấn đề:** Người dùng không có nút **"Chèn vào Canvas Editor"** (Insert to Canvas) để đưa ngay component animation vừa chọn vào dự án thiết kế đang mở.
- **Giải pháp cần làm:**
  - Thêm nút hành động `"Dùng trong Editor"` trên từng item marketplace.
  - Xây dựng parser chuyển đổi khối HTML/CSS của animation thành Custom Element Node trong `Editor.tsx`.

### 2.3 — Các Liên Kết Bị Trống & Thiếu Form Cài Đặt AI Tại Trang Settings
- **Hiện trạng:**
  1. Trong [`frontend/app/settings/page.tsx`](file:///d:/CODE/PickMe3D/frontend/app/settings/page.tsx#L246-L302), các mục sidebar như *"Dự án của bạn"*, *"Gói và mức giá"*, *"Thanh toán"* có sự kiện `onClick` rỗng (bấm vào không có phản hồi).
  2. Tại [`frontend/components/AiGenerateModal.tsx`](file:///d:/CODE/PickMe3D/frontend/components/AiGenerateModal.tsx#L308) và [`backend/src/controllers/aiController.js`](file:///d:/CODE/PickMe3D/backend/src/controllers/aiController.js#L22), hệ thống thông báo: *"Chưa cấu hình API Key. Vui lòng nhập API Key trong phần Cài đặt AI"* và nút điều hướng *"Mở Cài đặt AI"*. Tuy nhiên, trang Settings chưa có tab Cấu hình AI Key (Gemini / OpenAI / Claude) để người dùng tự lưu key cá nhân.
- **Giải pháp cần làm:**
  - Bổ sung routing chính xác cho sidebar: *"Dự án của bạn"* → `/profile?tab=designs`, *"Gói và mức giá"* → `/pricing`, *"Thanh toán"* → `/profile?tab=billing`.
  - Tạo tab **"Cài đặt AI"** trong Settings cho phép người dùng chọn Provider và lưu API Key cá nhân vào `localStorage` hoặc mã hóa trên DB.
  - Thêm tab **"Bảo mật" (Security)**: Xem lịch sử đăng nhập và tùy chọn Xóa tài khoản (Account Deletion).

### 2.4 — Thiếu Xác Thực Bằng Email / Mật Khẩu Truyền Thống & Quên Mật Khẩu
- **Hiện trạng:** [`backend/src/routes/authRoutes.js`](file:///d:/CODE/PickMe3D/backend/src/routes/authRoutes.js) hiện tại chỉ cung cấp: `googleLogin`, `guestLogin` (mock) và `adminLogin`.
- **Vấn đề:** Người dùng không thể đăng ký bằng Email/Password độc lập nếu không muốn dùng tài khoản Google, đồng thời thiếu quy trình Quên mật khẩu / Gửi mã xác nhận qua Email (OTP).
- **Giải pháp cần làm:**
  - Bổ sung API `POST /api/auth/register`, `POST /api/auth/login` (băm mật khẩu với `bcryptjs`).
  - Thêm luồng `POST /api/auth/forgot-password` và `POST /api/auth/reset-password` tích hợp dịch vụ gửi mail (Nodemailer / Resend).

### 2.5 — Thiếu Tính Năng Theo Dõi Tác Giả (Follow Creator) & Bảng Tin (Activity Feed)
- **Hiện trạng:** Đã có trang hồ sơ cá nhân công khai [`frontend/app/creator/[username]/page.tsx`](file:///d:/CODE/PickMe3D/frontend/app/creator/[username]/page.tsx), hiển thị số lượng thiết kế, bio, thống kê like/fork. Tuy nhiên nút **"Follow" / "Theo dõi"** chưa có database model lưu trữ và chưa có bảng tin cập nhật thiết kế mới của người mình theo dõi.
- **Giải pháp cần làm:**
  - Tạo Model `Follow { follower: ObjectId, following: ObjectId, createdAt }`.
  - Bổ sung tab *"Đang theo dõi"* trên trang Templates để lọc các mẫu mới nhất từ các Creator ưa thích.

### 2.6 — Lịch Sử Phiên Bản Thiết Kế (Version History & Undo Cloud)
- **Hiện trạng:** Khi người dùng lưu chỉnh sửa thiết kế trong Editor, hệ thống ghi đè trực tiếp lên bản ghi `Template` / `Presentation`. Nếu người dùng lỡ tay chỉnh sửa sai hoặc xóa nhầm và đã bấm lưu thì không thể khôi phục lại trạng thái cũ.
- **Giải pháp cần làm:**
  - Thêm collection `DesignVersion { templateId, versionNumber, docData, snapshotUrl, createdBy, createdAt }`.
  - Giới hạn 5 phiên bản đối với tài khoản Free và không giới hạn đối với Pro/Studio (tận dụng để thúc đẩy nâng cấp gói).

---

## 💡 3. Các Tính Năng Mới Tiềm Năng Cao Có Thể Phát Triển Tiếp

Dưới đây là các tính năng giá trị cao, phù hợp với định vị sản phẩm PickMe3D (Nền tảng Thiết kế 3D, Bản vẽ & Không gian Trực quan):

### 3.1 — 📦 Xuất File 3D Chuẩn Công Nghiệp (GLTF / GLB / OBJ / DXF)
- **Mô tả:** Cho phép người dùng xuất mô hình không gian sau khi tạo ra các file chuẩn 3D như `.glb`, `.gltf`, hoặc file bản vẽ kỹ thuật CAD `.dxf`.
- **Giá trị:** 
  - Khách hàng có thể mang mô hình nhà/phòng vào các phần mềm chuyên nghiệp như **Blender, SketchUp, 3ds Max, AutoCAD** hoặc các game engine (Three.js, Unity, Unreal Engine).
  - Tăng độ tin cậy và khả năng ứng dụng thực tế của đồ án / sản phẩm.
- **Công nghệ đề xuất:** Sử dụng thư viện `three/addons/exporters/GLTFExporter.js` có sẵn trong Three.js, xử lý trực tiếp trên browser không tốn tài nguyên server.

### 3.2 — 🥽 Thực Tế Tăng Cường (AR View) Trên Thiết Bị Di Động
- **Mô tả:** Cho phép người dùng mở bản vẽ 3D trên điện thoại, quét sàn nhà thực tế qua camera và đặt mô hình ngôi nhà / đồ nội thất / giao diện lên sàn phòng thật.
- **Giá trị:** Trải nghiệm "Wow factor" cực lớn khi trình diễn demo, pitching hoặc tư vấn thiết kế cho khách hàng bất động sản / nội thất.
- **Công nghệ đề xuất:**
  - iOS: Tự động xuất file định dạng `.usdz` để mở bằng tính năng Quick Look của Safari.
  - Android: Sử dụng Google `<model-viewer>` với chế độ Scene Viewer (WebXR).

### 3.3 — 🎨 AI Interior Re-Texture (Đổi Phong Cách Nội Thất Không Gian Bằng AI)
- **Mô tả:** Người dùng chỉ định một căn phòng (Phòng khách, Phòng ngủ, Bếp) và chọn phong cách nội thất mong muốn:
  - *Ví dụ:* "Indochine cổ điển", "Bắc Âu Scandinavian", "Tối giản Nhật Bản Japandi", "Hiện đại Marble & Kim loại vàng".
  - AI tự động tính toán và thay đổi vật liệu tường, sàn gỗ/đá, màu sắc đồ đạc, ánh sáng trong mô hình 3D theo thời gian thực.
- **Giá trị:** Giúp kiến trúc sư và người dùng thử nghiệm nhanh hàng chục phương án phối màu và phong cách chỉ với 1 cú click.

### 3.4 — 🎙️ Chế Độ Thuyết Trình Kép (Presenter View) & Điều Khiển Bằng Điện Thoại
- **Mô tả:** Nâng cấp hệ thống Slide Studio:
  - **Màn hình kép:** 1 tab toàn màn hình chiếu cho người xem, 1 tab Presenter View hiển thị ghi chú diễn giả (Speaker Notes), slide tiếp theo và đồng hồ đếm ngược thời gian.
  - **Mobile Remote Controller:** Quét mã QR bằng điện thoại để biến điện thoại thành remote chuyển slide từ xa mà không cần mua chuột thuyết trình.
- **Công nghệ đề xuất:** BroadcastChannel API cho trình duyệt cùng máy, hoặc WebSocket / Socket.io nhẹ nhàng cho điều khiển qua điện thoại.

### 3.5 — 👥 Cộng Tác Thời Gian Thực (Multiplayer Real-time Collaboration)
- **Mô tả:** Cho phép 2 hoặc nhiều người cùng truy cập vào một liên kết thiết kế 3D hoặc Slide để chỉnh sửa cùng lúc.
- **Tính năng:**
  - Hiển thị con trỏ chuột của đồng nghiệp với tên và màu sắc đại diện (tương tự Figma / Google Slides).
  - Khóa chọn (Node lock) tránh việc 2 người cùng kéo thả 1 đối tượng cùng một thời điểm.
- **Công nghệ đề xuất:** Tích hợp `Yjs` + `y-webrtc` / `Socket.io` cho đồng bộ CRDT nhẹ nhàng và bảo đảm tính toàn vẹn dữ liệu.

### 3.6 — 🏪 Creator Economy: Chợ Bán Mẫu Thiết Kế & Nhận Doanh Thu
- **Mô tả:** Cho phép các Designer trong cộng đồng PickMe3D đăng bán các mẫu thiết kế 3D, mô hình không gian, hoặc UI component của họ.
- **Cơ chế:**
  - Người mua thanh toán qua cổng payOS / chuyển khoản.
  - Nền tảng giữ phí hoa hồng sàn (ví dụ 10-15%), số tiền còn lại cộng vào số dư của Creator để rút về tài khoản ngân hàng.

---

## 📊 4. Ma Trận Đánh Giá Ưu Tiên & Lộ Trình Đề Xuất (Roadmap)

| STT | Tính năng | Phân loại | Độ khó | Giá trị | Đề xuất triển khai |
|---|---|---|---|---|---|
| **1** | **Khắc phục đồng bộ UI Marketplace vào DB** | Sửa chữa / Hoàn thiện | ⭐ Thấp | 🔥 Rất cao | **Nên làm ngay (Sprint 1)** |
| **2** | **Sửa liên kết & Bổ sung tab Cài đặt AI Key trong Settings** | Sửa chữa / Hoàn thiện | ⭐ Thấp | 🔥 Cao | **Nên làm ngay (Sprint 1)** |
| **3** | **Xuất file 3D `.GLB` / `.GLTF` từ mô hình 3D** | Tính năng mới | ⭐⭐ Trung bình | 🔥 Rất cao | **Ưu tiên cao (Sprint 2)** |
| **4** | **Nút "Chèn vào Canvas" từ UI Marketplace** | Hoàn thiện luồng | ⭐⭐ Trung bình | 🔥 Cao | **Ưu tiên cao (Sprint 2)** |
| **5** | **Auth Email/Password & Quên mật khẩu** | Hoàn thiện luồng | ⭐⭐ Trung bình | 🟡 Trung bình | **Sprint 2** |
| **6** | **Presenter View & Mobile Remote cho Slide Studio** | Đột phá Slide | ⭐⭐ Trung bình | 🔥 Cao | **Sprint 3** |
| **7** | **Lịch sử phiên bản thiết kế (Version History)** | Nâng cao | ⭐⭐ Trung bình | 🟡 Trung bình | **Sprint 3** |
| **8** | **AI Interior Re-Texture (Đổi phong cách vật liệu nội thất)** | Đột phá AI/3D | ⭐⭐⭐ Khá | 🔥 Rất cao | **Sprint 3 - 4** |
| **9** | **Thực tế tăng cường (AR View WebXR/USDZ trên Mobile)** | Đột phá 3D | ⭐⭐⭐ Khá | 🔥 Rất cao | **Sprint 4** |
| **10**| **Cộng tác thời gian thực (Multiplayer Real-time)** | Hệ thống lớn | ⭐⭐⭐⭐ Cao | 🔥 Cao | **Giai đoạn tiếp theo** |
| **11**| **Chợ bán mẫu chia sẻ doanh thu (Creator Economy)** | Kinh doanh | ⭐⭐⭐⭐ Cao | 🔥 Cao | **Giai đoạn tiếp theo** |
