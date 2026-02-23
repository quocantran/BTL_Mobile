# Mobile App - React Native với Expo

Ứng dụng mobile tìm kiếm việc làm được xây dựng với React Native và Expo + backend NestJS.

## Công nghệ sử dụng

### Backend
- **NestJS** - Framework Node.js
- **MongoDB** - Database với Mongoose ODM
- **Redis** - Caching + background job
- **JWT** - Authentication
- **Socket.IO** - Realtime notifications
- **Nodemailer** - Email service (hỗ trợ template Handlebars)
- **Cron Jobs** - Gửi email tự động cho subscribers

### Mobile
- **React Native** với **Expo**
- **Redux Toolkit** - State management
- **React Navigation** - Navigation
- **Expo Image Picker** - Upload ảnh

## Tính năng theo vai trò

### Chức năng chung
- Đăng nhập / Đăng ký / Quên mật khẩu / Đổi mật khẩu
- Quản lý tài khoản cá nhân (cập nhật thông tin, upload ảnh đại diện)
- Hệ thống thông báo realtime

### 1. Ứng viên (Người tìm việc)
- **Tìm việc làm:**
  - Tìm kiếm, xem chi tiet với bộ lọc (địa điểm, cấp bậc, kỹ năng, mức lương,...)
  
- **Công ty:**
  - Tìm kiếm và xem chi tiết công ty
  - Theo dõi/bỏ theo dõi công ty yêu thích
  - Đánh giá, bình luận công ty (hỗ trợ bình luận lồng nhau)

- **CV & Ứng tuyển:**
  - Upload, quản lý CV (chọn CV chính, xóa CV)
  - Ứng tuyển việc làm (chọn CV khi ứng tuyển)
  - Theo dõi trạng thái hồ sơ ứng tuyển (PENDING, REVIEWING, APPROVED, REJECTED)
  - Xem lịch sử thay đổi trạng thái hồ sơ

- **Đăng ký nhận thông báo việc làm:**
  - Chọn kỹ năng quan tâm
  - Nhận email tự động khi có việc làm mới phù hợp theo kỹ năng đăng ký (Cron job chạy định kỳ)

- **Thông báo:**
  - Khi hồ sơ ứng tuyển được cập nhật trạng thái
  - Khi công ty đang theo dõi đăng tuyển việc mới
  - Khi được mời phỏng vấn

### 2. Nhà tuyển dụng (HR)
- **Quản lý công ty:**
  - Tạo và chỉnh sửa thông tin công ty
  - Một công ty có thể có nhiều HR
  - Xem danh sách HR trong công ty, thêm hoặc xóa HR trong công ty

- **Quản lý tin tuyển dụng:**
  - Tạo, chỉnh sửa, xóa tin tuyển dụng
  - Quản lý số lượng, mức lương, kỹ năng yêu cầu

- **Quản lý ứng viên:**
  - Xem danh sách ứng viên ứng tuyển vào từng job
  - Lọc ứng viên theo trạng thái hồ sơ
  - Xem chi tiết hồ sơ ứng viên, CV, lịch sử trạng thái
  - Đổi trạng thái hồ sơ (PENDING → REVIEWING → APPROVED/REJECTED)
  - Gửi thư mời phỏng vấn (soạn nội dung, gửi mail trực tiếp từ app)

- **Thông báo:**
  - Khi có ứng viên mới ứng tuyển
  - Khi có người dùng theo dõi công ty
  - Khi công ty được duyệt/bị khóa bởi Admin

### 3. Quản trị viên (Admin)
- **Quản lý người dùng:**
  - Xem danh sách, tìm kiếm người dùng
  - Tạo mới / chỉnh sửa người dùng
  - Khi tạo user với role HR, bắt buộc phải chọn công ty
  - Xóa người dùng

- **Quản lý công ty:**
  - Xem danh sách công ty
  - Xem chi tiết công ty (bao gồm danh sách HR)
  - Duyệt/kích hoạt hoặc hủy kích hoạt công ty
  - Khi hủy kích hoạt công ty, tất cả việc làm của công ty đó sẽ không hiển thị

- **Cron Job:**
  - Tự động gửi email thông báo việc làm mới cho subscribers hàng ngày

### 4. Chức năng AI Matching (Xếp hạng ứng viên thông minh)

**Mục đích:**
- Tự động phân tích và chấm điểm độ phù hợp giữa CV ứng viên và Job Description (JD)
- Giúp HR xếp hạng ứng viên một cách khách quan dựa trên AI
- Tiết kiệm thời gian sàng lọc hồ sơ thủ công

**Công nghệ sử dụng:**
- **Tesseract OCR:** Trích xuất văn bản từ ảnh CV (hỗ trợ tiếng Việt + tiếng Anh)
- **Xenova/transformers:** AI Embedding model (all-MiniLM-L6-v2)
- **Bull Queue:** Xử lý CV bất đồng bộ, tránh blocking
- **Cosine Similarity:** Tính độ tương đồng ngữ nghĩa

**Quy trình xử lý:**

1. **Khi ứng viên ứng tuyển:**
   - Hệ thống tự động đưa CV vào hàng đợi (Queue) để xử lý
   - Trạng thái: PENDING → PROCESSING → COMPLETED/FAILED

2. **Xử lý CV (Background Processing):**
   - **Bước 1 - OCR:** Trích xuất toàn bộ văn bản từ ảnh CV
   - **Bước 2 - Embedding:** Chuyển CV text thành vector số học (384 chiều)
   - **Bước 3 - Tạo JD Embedding:** Chuyển Job Description + Skills thành vector
   - **Bước 4 - Tính điểm:** Kết hợp Semantic Similarity + Skill Matching

3. **Lưu kết quả vào Database:**
   - Điểm khớp (Match Score: 0-100%)
   - Kỹ năng trùng khớp (Matched Skills)
   - Kỹ năng còn thiếu (Missing Skills)
   - Giải thích ngắn gọn

**Thuật toán tính điểm (Match Score):**

```
Điểm cuối cùng = (Semantic Score × 40%) + (Skill Match Ratio × 60%) + Bonus
```

- **Semantic Score:** Độ tương đồng ngữ nghĩa giữa CV và JD (Cosine Similarity)
- **Skill Match Ratio:** Tỷ lệ kỹ năng khớp (Matched Skills / Total Job Skills)
- **Bonus:**
  - +20% nếu khớp ≥80% skills
  - +15% nếu khớp ≥60% skills
  - +10% nếu khớp ≥40% skills
  - +5% nếu semantic score > 0.5

**Phân loại độ phù hợp:**
- **80-100%:** "Ứng viên rất phù hợp" - Khớp hầu hết yêu cầu
- **60-79%:** "Ứng viên phù hợp khá tốt" - Đáp ứng được phần lớn yêu cầu
- **40-59%:** "Ứng viên phù hợp một phần" - Thiếu một số kỹ năng quan trọng
- **0-39%:** "Mức độ phù hợp thấp" - Hồ sơ không khớp với yêu cầu

**Tính năng cho HR:**
- Xem danh sách ứng viên được xếp hạng theo Match Score (cao → thấp)
- Lọc top N ứng viên phù hợp nhất (VD: Top 10)
- Xem chi tiết: kỹ năng nào khớp, kỹ năng nào thiếu

**Ưu điểm:**
- ✅ Tự động hóa, không cần chấm điểm thủ công
- ✅ Khách quan, dựa trên dữ liệu thực tế từ CV
- ✅ Nhanh chóng (chỉ vài giây/CV)
- ✅ Xử lý bất đồng bộ, không ảnh hưởng UX
- ✅ Hỗ trợ tiếng Việt lẫn tiếng Anh

### 5. Thông báo (Notification)
- Tất cả người dùng đều có màn hình thông báo riêng
- Nhận thông báo realtime qua Socket.IO
- Đánh dấu đã đọc, đánh dấu tất cả đã đọc
- Badge hiển thị số thông báo chưa đọc

## Cài đặt

### Backend

1. **Cài đặt dependencies:**
```bash
cd backend
npm install
```

2. **Cấu hình môi trường:**
Tạo file `.env` theo cấu trúc `.env.example`:
```env
PORT=8000
MONGODB_URI=mongodb://localhost:27017/job-app
JWT_SECRET=your-secret-key
JWT_EXPIRES=7d
REDIS_HOST=localhost
REDIS_PORT=6379
MAIL_HOST=smtp.gmail.com
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
```

3. **Khởi chạy:**
```bash
npm run start:dev
```

### Mobile

1. **Cài đặt dependencies:**
```bash
cd mobile
npm install
```

2. **Cấu hình API URL:**
Tạo file `.env` theo cấu trúc `.env.example`

3. **Chạy ứng dụng:**
```bash
# Chạy với Expo Go
npm start

# Hoặc chạy trên Android
npm run android

# Hoặc chạy trên iOS
npm run ios
```
### Database
- Khởi tạo dữ liệu mẫu: `/backend/environment/mongodb/nestjs-backend`

## Tài khoản mẫu

| Vai trò | Email | Mật khẩu |
|---------|-------|----------|
| Admin | admin@gmail.com | 123456 |
| HR | hr1@gmail.com | 123456 |
| User | test@gmail.com | 123456 |

## API Documentation

API docs có sẵn tại: `http://localhost:8000/api` (Swagger UI)
