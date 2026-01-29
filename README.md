# Mobile App - React Native với Expo

Ứng dụng mobile tìm kiếm việc làm được xây dựng với React Native và Expo + backend NestJS.


## Tính năng theo vai trò

### Chức năng chung
- Đăng nhập / Đăng ký / Quên mật khẩu / Đổi mật khẩu / Quản lý tài khoản

### 1. Ứng viên (Người tìm việc)
- Tìm kiếm việc làm với bộ lọc (địa điểm, cấp bậc, kỹ năng,...)
- Tìm kiếm và xem chi tiết công ty
- Theo dõi công ty yêu thích
- Đánh giá, bình luận công ty (hỗ trợ bình luận lồng nhau)
- Upload, quản lý CV (chọn CV chính, xóa CV)
- Ứng tuyển việc làm (chọn CV khi ứng tuyển)
- Theo dõi trạng thái hồ sơ ứng tuyển (PENDING, REVIEWING, APPROVED, REJECTED)
- Xem lịch sử thay đổi trạng thái hồ sơ
- Cập nhật thông tin cá nhân, đổi mật khẩu
- Nhận thông báo hoặc email khi:
   - Hồ sơ ứng tuyển được cập nhật trạng thái (HR duyệt, từ chối...)
   - Có phản hồi/phỏng vấn từ HR

### 2. Nhà tuyển dụng (HR)
- Đăng nhập với vai trò HR
- Tạo, chỉnh sửa, quản lý tin tuyển dụng, quản lý thông tin công ty
- Xem danh sách ứng viên ứng tuyển vào từng job
- Lọc ứng viên theo trạng thái hồ sơ
- Xem chi tiết hồ sơ ứng viên, CV, lịch sử trạng thái
- Đổi trạng thái hồ sơ ứng viên (PENDING, REVIEWING, APPROVED, REJECTED)
- Khi chuyển trạng thái sang REVIEWING, có thể gửi thư mời phỏng vấn (soạn nội dung, gửi mail trực tiếp từ app)
- Nhận thông báo khi có ứng viên mới ứng tuyển vào job của mình

### 3. Quản trị viên (Admin)
- Đăng nhập với vai trò Admin
- Quản lý danh sách người dùng (xem, tìm kiếm, xem chi tiết, xóa)
- Quản lý danh sách công ty (duyệt/kích hoạt, tìm kiếm, xem chi tiết)
- Duyệt/kích hoạt hoặc hủy kích hoạt công ty

### 4. Thông báo (Notification)
- Tất cả người dùng đều có màn hình thông báo riêng
- Nhận thông báo realtime khi có sự kiện liên quan:
   - Ứng viên: khi trạng thái hồ sơ thay đổi, được mời phỏng vấn, bị từ chối, công ty theo dõi tạo việc làm mới
   - HR: khi có ứng viên mới ứng tuyển vào job của mình
   - Admin: khi có công ty mới đăng ký cần duyệt (nếu có)
- Thông báo có thể đánh dấu đã đọc, đánh dấu tất cả đã đọc

## Cài đặt

1. **Cài đặt dependencies:**
```bash
cd mobile
npm install
```

2. **Cấu hình API URL + Database:**
Tạo file .env cấu trúc tương tự .env.example
Khởi tạo dữ liệu mẫu cho database trong /backend/environment/mongodb/nestjs-backend
3. **Chạy ứng dụng:**
```bash
# Chạy với Expo Go
npm start

# Hoặc chạy trên Android
npm run android

# Hoặc chạy trên iOS
npm run ios
```

4. **Tài khoản admin:**
Email: admin@gmail.com
Mật khẩu: 123456