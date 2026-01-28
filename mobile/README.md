# Mobile App - React Native với Expo

Ứng dụng mobile tìm kiếm việc làm được xây dựng với React Native và Expo.

## Tính năng

### Người dùng
- ✅ Đăng nhập / Đăng ký / Quên mật khẩu
- ✅ Tìm kiếm việc làm với bộ lọc (địa điểm, cấp bậc, kỹ năng)
- ✅ Tìm kiếm công ty
- ✅ Theo dõi công ty yêu thích
- ✅ Xem chi tiết việc làm và công ty
- ✅ Đánh giá và bình luận công ty (hỗ trợ nested comments)
- ✅ Upload và quản lý CV (chọn CV chính)
- ✅ Ứng tuyển việc làm (chọn CV khi ứng tuyển)
- ✅ Theo dõi trạng thái hồ sơ ứng tuyển
- ✅ Cập nhật thông tin cá nhân
- ✅ Đổi mật khẩu
- ✅ Nhận thông báo

### Kỹ thuật
- ✅ Redux Toolkit cho state management
- ✅ Axios với refresh token interceptor tự động
- ✅ Expo SecureStore để lưu trữ token an toàn
- ✅ React Navigation (Stack + Bottom Tabs)
- ✅ TypeScript

## Cấu trúc thư mục

```
mobile/
├── App.tsx                 # Entry point
├── app.json               # Expo config
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
└── src/
    ├── components/        # UI Components
    │   ├── common/        # Button, Input, Loading, EmptyState
    │   ├── job/           # JobCard
    │   ├── company/       # CompanyCard
    │   ├── application/   # ApplicationCard
    │   ├── comment/       # CommentItem (nested)
    │   └── cv/            # CVCard
    ├── constants/         # Colors, Sizes, API_URL
    ├── navigation/        # React Navigation setup
    ├── screens/
    │   ├── auth/          # Login, Register, ForgotPassword
    │   ├── main/          # Home, Jobs, Companies, Notifications, Profile
    │   ├── detail/        # JobDetail, CompanyDetail, ApplicationDetail
    │   └── profile/       # EditProfile, MyCVs, MyApplications, ChangePassword
    ├── services/          # API services
    ├── store/             # Redux store
    │   ├── slices/        # authSlice, jobSlice, companySlice
    │   └── hooks.ts       # useAppDispatch, useAppSelector
    ├── types/             # TypeScript interfaces
    └── utils/             # Token storage
```

## Cài đặt

1. **Cài đặt dependencies:**
```bash
cd mobile
npm install
```

2. **Cấu hình API URL:**
Mở file `src/constants/index.ts` và cập nhật `API_URL` theo địa chỉ backend của bạn.

3. **Chạy ứng dụng:**
```bash
# Chạy với Expo Go
npm start

# Hoặc chạy trên Android
npm run android

# Hoặc chạy trên iOS
npm run ios
```

## Luồng hoạt động

### Authentication Flow
1. App khởi động → kiểm tra token trong SecureStore
2. Nếu có token → gọi API lấy profile → vào Main screens
3. Nếu không có token hoặc token hết hạn → vào Auth screens

### Refresh Token Flow
- Axios interceptor tự động:
  1. Nếu API trả về 401 → gọi refresh token API
  2. Nếu refresh thành công → lưu token mới → retry request gốc
  3. Nếu refresh thất bại → logout user

### Apply Job Flow
1. User xem chi tiết việc làm → nhấn "Ứng tuyển"
2. Modal hiện ra danh sách CV của user
3. CV chính được auto-select (có thể đổi)
4. User xác nhận → tạo Application

## Backend API cần có

App này cần backend hỗ trợ các endpoints:

- `POST /auth/login` - Đăng nhập
- `POST /auth/register` - Đăng ký
- `POST /auth/refresh` - Refresh token
- `POST /auth/forgot-password` - Quên mật khẩu
- `GET /auth/account` - Lấy profile

- `GET /jobs` - Danh sách việc làm
- `GET /jobs/:id` - Chi tiết việc làm

- `GET /companies` - Danh sách công ty
- `GET /companies/:id` - Chi tiết công ty

- `GET /user-cvs` - Danh sách CV của user
- `POST /user-cvs` - Upload CV
- `PATCH /user-cvs/:id/set-primary` - Đặt CV chính
- `DELETE /user-cvs/:id` - Xóa CV

- `GET /applications` - Danh sách ứng tuyển
- `GET /applications/:id` - Chi tiết ứng tuyển
- `POST /applications` - Tạo ứng tuyển

- `GET /comments` - Danh sách bình luận
- `POST /comments` - Tạo bình luận
- `DELETE /comments/:id` - Xóa bình luận

- `GET /skills` - Danh sách kỹ năng
- `GET /notifications` - Danh sách thông báo

## Lưu ý

1. **Android Emulator trên Windows:**
   - Cần cài Android Studio hoặc dùng Expo Go trên điện thoại thật
   - Scan QR code từ terminal với Expo Go app

2. **iOS Simulator:**
   - Chỉ chạy được trên macOS

3. **Token Storage:**
   - Sử dụng expo-secure-store (mã hóa)
   - Tự động refresh khi hết hạn
