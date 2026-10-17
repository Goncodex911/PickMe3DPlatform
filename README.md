# PickMe3DPlatform

Dự án nền tảng PickMe3D với cấu trúc Monorepo / Multi-tier:
- **Frontend**: React.js / Next.js (Canvas & UI từ template m3e-canvas)
- **Backend**: Node.js & Express RESTful API
- **Database**: MongoDB Atlas qua Mongoose ODM

---

## Cấu trúc thư mục

```
PickMe3DPlatform/
├── frontend/             # Ứng dụng Frontend (React, Next.js, Tailwind CSS)
│   ├── app/              # App Router Next.js
│   ├── components/       # Các UI Component
│   ├── lib/              # Logic & Utilities
│   ├── public/           # Static assets
│   ├── package.json      # Dependencies frontend
│   └── ...
│
├── backend/              # Dịch vụ Backend (Node.js, Express)
│   ├── src/
│   │   ├── config/       # Cấu hình MongoDB Atlas
│   │   ├── controllers/  # Bộ điều khiển (Controllers)
│   │   ├── models/       # Mongoose Schemas & Models
│   │   ├── routes/       # API Routes (/api/...)
│   │   ├── middlewares/  # Error handler & Middlewares
│   │   └── server.js     # Entry point server
│   ├── .env.example      # Template biến môi trường
│   ├── package.json      # Dependencies backend
│   └── README.md
│
├── .gitignore            # Git ignore chung
└── README.md             # Tài liệu dự án
```

---

## Hướng dẫn cài đặt & khởi chạy

### 1. Backend (Node.js & MongoDB Atlas)
```bash
cd backend
npm install
cp .env.example .env    # Cập nhật MONGODB_URI trong file .env
npm run dev             # Chạy tại http://localhost:5000
```

### 2. Frontend (React / Next.js)
```bash
cd frontend
npm install
npm run dev             # Chạy tại http://localhost:3000
```

### 3. Slide Studio (PPTist)
Trình soạn slide nằm ở `slide-editor/` (PPTist, AGPL-3.0, xem `slide-editor/PICKME.md`). Bản build được chép vào `frontend/public/slide-studio/` và chạy cùng origin với frontend, không cần server riêng.
```bash
cd slide-editor
npm install --ignore-scripts   # lần đầu
cd ../frontend
npm run studio          # build lại studio sau mỗi lần sửa slide-editor (npm run build tự chạy bước này)
```

Dữ liệu mẫu cho Slide Studio (8 deck theo các bộ sưu tập của PickMe3D):
```bash
cd backend
npm run seed:demo -- email@cua-tai-khoan
```

Thanh toán dùng payOS. Khi chưa có `PAYOS_CLIENT_ID`, `PAYOS_API_KEY` và `PAYOS_CHECKSUM_KEY` trong `backend/.env`, checkout chạy giả lập tại `/payment/mock`. Webhook giả lập chỉ được nhận trong chế độ này. Gói thật chỉ nâng sau webhook đã kiểm tra chữ ký. Trang giá: http://localhost:3000/pricing/ — danh sách slide: http://localhost:3000/slides/

---

## Git Repository
- Remote URL: `git@github.com:Goncodex911/PickMe3DPlatform.git`
