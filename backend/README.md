# PickMe3D Platform - Backend

Node.js / Express REST API kết nối MongoDB Atlas.

## Cài đặt & Khởi chạy

1. **Cài đặt dependencies:**
   ```bash
   npm install
   ```

2. **Cấu hình môi trường:**
   Tạo file `.env` từ `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Sau đó điền chuỗi kết nối MongoDB Atlas của bạn vào `MONGODB_URI`:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/pickme3d?retryWrites=true&w=majority
   ```

3. **Chạy server:**
   - Chế độ phát triển (auto-reload với nodemon):
     ```bash
     npm run dev
     ```
   - Chế độ production:
     ```bash
     npm start
     ```

## Cấu trúc thư mục
- `src/config/`: Cấu hình kết nối MongoDB Atlas.
- `src/controllers/`: Xử lý logic nghiệp vụ.
- `src/models/`: Định nghĩa Mongoose schema & model.
- `src/routes/`: Định nghĩa các API endpoints.
- `src/middlewares/`: Middlewares xử lý lỗi, auth, validate.
- `src/server.js`: File khởi động Express server.
