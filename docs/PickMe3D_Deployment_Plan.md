# KẾ HOẠCH TRIỂN KHAI HỆ THỐNG PICKME3D (DEPLOYMENT PLAN)

Tài liệu này cung cấp lộ trình và hướng dẫn chi tiết để đưa toàn bộ hệ thống **PickMe3D Platform** (Frontend Next.js 16, Backend Express REST API / Socket.IO, Cơ sở dữ liệu MongoDB Atlas và kho tài nguyên 3D) lên môi trường Production trên Internet.

---

## 1. TỔNG QUAN KIẾN TRÚC TRIỂN KHAI (ARCHITECTURE TOPOLOGY)

```mermaid
flowchart TD
    subgraph Clients["Khách hàng & Người dùng"]
        Browser["Trình duyệt Web (Desktop / Mobile / Tablet)"]
    end

    subgraph CDN_Edge["Edge CDN & Frontend Hosting (Vercel / Cloudflare)"]
        Vercel["Next.js 16 App Router\n(PickMe3D UI + 3D Canvas Engine)"]
        Static3D["Static Assets (/textures, /models GLB)\nCache-Control: 1 năm"]
    end

    subgraph Backend_Cloud["Backend Hosting (Render.com / Railway)"]
        Express["Node.js Express REST API\n(Port 5001)"]
        SocketIO["Socket.IO Server\n(Realtime Collaboration)"]
    end

    subgraph External_Services["Dịch vụ Đám mây & Bên thứ ba"]
        Atlas[("MongoDB Atlas\nCluster M0/M10 Database")]
        Cloudinary["Cloudinary CDN\n(Ảnh upload & Render 4K)"]
        PayOS["Cổng thanh toán PayOS\n(VietQR Auto-Webhook)"]
        GoogleAuth["Google Identity OAuth 2.0"]
        AI_API["Gemini / Groq / OpenAI\n(Slide AI & ArchViz Prompts)"]
    end

    Browser -->|HTTPS :443| Vercel
    Browser -->|Static WebP/GLB| Static3D
    Browser -->|WSS Socket.IO| SocketIO
    Browser -->|API Requests| Express
    Express -->|Mongoose ODM| Atlas
    Express -->|SDK Upload| Cloudinary
    PayOS -->|POST Webhook| Express
    Express -->|Verify Token| GoogleAuth
    Express -->|Chat Completion| AI_API
```

---

## 2. MA TRẬN BIẾN MÔI TRƯỜNG PRODUCTION (ENVIRONMENT VARIABLES)

### 2.1. Backend (`backend/.env`)

| Biến môi trường | Ý nghĩa | Giá trị mẫu / Hướng dẫn |
| :--- | :--- | :--- |
| `NODE_ENV` | Môi trường chạy | `production` |
| `PORT` | Cổng dịch vụ | `5001` (Render/Railway tự cấp động) |
| `MONGODB_URI` | Chuỗi kết nối MongoDB Atlas | `mongodb+srv://admin:<password>@pickme3d.xxxxx.mongodb.net/pickme3d?retryWrites=true&w=majority` |
| `JWT_SECRET` | Khóa bí mật ký token đăng nhập | Chuỗi ngẫu nhiên tối thiểu 32 ký tự bí mật |
| `FRONTEND_URL` | Domain frontend được phép CORS | `https://pickme3d.vercel.app` (hoặc custom domain) |
| `CLOUDINARY_CLOUD_NAME` | Tên Cloudinary | Lấy từ Dashboard Cloudinary |
| `CLOUDINARY_API_KEY` | API Key Cloudinary | Lấy từ Dashboard Cloudinary |
| `CLOUDINARY_API_SECRET` | Secret Key Cloudinary | Lấy từ Dashboard Cloudinary |
| `PAYOS_CLIENT_ID` | Client ID cổng payOS | Lấy từ payos.vn |
| `PAYOS_API_KEY` | API Key cổng payOS | Lấy từ payos.vn |
| `PAYOS_CHECKSUM_KEY` | Khóa kiểm tra tính toàn vẹn | Lấy từ payos.vn |
| `PAYMENT_MOCK` | Chế độ thanh toán giả lập | `false` (khi chạy production thật) |
| `SLIDE_AI_URL` | Endpoint AI tạo slide / render | `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` |
| `SLIDE_AI_KEY` | API Key Google Gemini / Groq | `AIzaSy...` |
| `SLIDE_AI_MODEL` | Model AI thực thi | `gemini-2.0-flash` hoặc `llama-3.3-70b-versatile` |

### 2.2. Frontend (`frontend/.env.production`)

| Biến môi trường | Ý nghĩa | Giá trị mẫu |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | URL trỏ tới API Backend | `https://pickme3d-api.onrender.com` |
| `NEXT_PUBLIC_SOCKET_URL` | URL WebSocket thời gian thực | `https://pickme3d-api.onrender.com` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`| Client ID đăng nhập Google OAuth | `xxxx.apps.googleusercontent.com` |

---

## 3. CÁC PHƯƠNG ÁN TRIỂN KHAI (DEPLOYMENT STRATEGIES)

### 🌟 PHƯƠNG ÁN 1: Serverless & PaaS (Khuyến nghị hàng đầu — Miễn phí / Chi phí thấp, Không cần quản trị server)

Đây là phương án tối ưu nhất cho giai đoạn ra mắt sản phẩm: Không phải bảo trì hệ điều hành, tự động cấp phát chứng chỉ SSL/TLS miễn phí, và tự động deploy lại mỗi khi có commit mới trên Git.

- **Frontend:** Triển khai trên **Vercel**
  - Tích hợp trực tiếp với repository GitHub: `Goncodex911/PickMe3DPlatform`.
  - Root directory chọn: `frontend`.
  - Tự động tối ưu hóa Next.js, phân phối toàn cầu qua Vercel Edge Network (tốc độ tải mô hình 3D và Texture PBR cực nhanh).
- **Backend:** Triển khai trên **Render.com** (hoặc **Railway.app**)
  - Tạo **Web Service**, chọn kết nối GitHub repo, Root directory: `backend`.
  - Build command: `npm install`.
  - Start command: `npm start`.
  - Hỗ trợ đầy đủ persistent WebSocket cho `Socket.IO`.
- **Database:** **MongoDB Atlas (Free Tier M0)**
  - Đặt datacenter tại Singapore (`ap-southeast-1`) để tối ưu độ trễ thấp nhất về Việt Nam.

---

### 🛡️ PHƯƠNG ÁN 2: Triển khai độc lập trên 1 Cloud VPS (Ubuntu / Docker Compose)

Dành cho doanh nghiệp muốn tự chủ 100% hạ tầng, tích hợp domain riêng và không phụ thuộc vào giới hạn free tier của bên thứ ba.

#### Cấu hình Docker Compose mẫu (`docker-compose.yml`):
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: always
    environment:
      - PORT=5001
      - NODE_ENV=production
      - MONGODB_URI=mongodb+srv://admin:pass@pickme3d.cluster.mongodb.net/pickme3d
      - FRONTEND_URL=https://pickme3d.vn
    ports:
      - "5001:5001"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: always
    ports:
      - "3000:3000"
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
```

---

## 4. QUY TRÌNH THỰC HIỆN TỪNG BƯỚC (STEP-BY-STEP CHECKLIST)

### Bước 1: Khởi tạo Cơ Sở Dữ Liệu MongoDB Atlas
1. Truy cập [cloud.mongodb.com](https://cloud.mongodb.com) và tạo một Cluster miễn phí tại khu vực **Singapore (`ap-southeast-1`)**.
2. Tại mục **Security > Database Access**: Tạo một người dùng (ví dụ: `pickme3d_admin`) với quyền `Read and write to any database`.
3. Tại mục **Security > Network Access**: Bấm `Add IP Address` và chọn `Allow Access from Anywhere` (`0.0.0.0/0`) để cho phép server Render/Vercel kết nối vào.
4. Lấy connection string dạng: `mongodb+srv://pickme3d_admin:<password>@cluster0.xxxxx.mongodb.net/pickme3d`.

### Bước 2: Triển khai Backend lên Render.com
1. Đăng nhập [render.com](https://render.com), chọn **New + > Web Service**.
2. Kết nối với repo `PickMe3DPlatform`.
3. Điền thông tin:
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Trong tab **Environment**, thêm đầy đủ các biến môi trường từ mục **2.1**.
5. Bấm **Deploy Web Service** và chờ build xong. Kiểm tra URL hoạt động bằng cách gọi: `GET https://<render-url>/api/health`.

### Bước 3: Cấu hình Cổng Thanh Toán & Webhook
1. Đăng nhập vào [payos.vn](https://payos.vn), tạo kênh thanh toán.
2. Thiết lập **Webhook URL**: `https://<render-url>/api/payment/payos-webhook`.
3. Sao chép `CLIENT_ID`, `API_KEY`, `CHECKSUM_KEY` dán vào biến môi trường của Render.

### Bước 4: Triển khai Frontend lên Vercel
1. Đăng nhập [vercel.com](https://vercel.com), bấm **Add New > Project**, chọn repo `PickMe3DPlatform`.
2. Trong phần cấu hình dự án:
   - **Root Directory:** Bấm Edit và chọn thư mục `frontend`.
   - **Framework Preset:** `Next.js`.
3. Thêm các biến môi trường:
   - `NEXT_PUBLIC_API_URL = https://<render-url>`
   - `NEXT_PUBLIC_SOCKET_URL = https://<render-url>`
4. Bấm **Deploy**. Vercel sẽ tự động build và cấp domain HTTPS miễn phí (ví dụ `https://pickme3d-platform.vercel.app`).
5. Quay lại Render.com, cập nhật biến `FRONTEND_URL` thành domain vừa tạo ở Vercel để hoàn tất thiết lập bảo mật CORS.

### Bước 5: Kiểm Thử Xác Thực Sau Triển Khai (Post-Deployment Smoke Tests)
- [ ] **Mặt bằng 3D (`/blueprint-3d/`):** Tải trang, kiểm tra sa bàn bản vẽ 3D hiển thị sắc nét không bị trắng lóa; lăn chuột bóc tách mượt mà; bật chế độ sa bàn 1.5m (`dollhouse`).
- [ ] **Chất liệu PBR & Model 3D:** Kiểm tra các file texture WebP và model nội thất GLB trong `/models/` tải thành công với HTTP Status 200.
- [ ] **Xuất File 3D (.GLB):** Nhấn nút `Xuất 3D (.GLB)` và kiểm tra file tải về mở được trên 3D Viewer mặc định của hệ điều hành.
- [ ] **Hệ thống thanh toán:** Thử tạo đơn gói Studio hoặc thanh toán PayOS qua mã VietQR.
- [ ] **Đăng nhập Google OAuth:** Đăng nhập và xác thực phiên làm việc lưu trữ token chính xác.
