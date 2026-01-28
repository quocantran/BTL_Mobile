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
Thay thế API_URL trong .env thành api backend của bạn.

3. **Chạy ứng dụng:**
```bash
# Chạy với Expo Go
npm start

# Hoặc chạy trên Android
npm run android

# Hoặc chạy trên iOS
npm run ios
```

## Lưu ý

1. **Android Emulator trên Windows:**
   - Cần cài Android Studio hoặc dùng Expo Go trên điện thoại thật
   - Scan QR code từ terminal với Expo Go app

2. **iOS Simulator:**
   - Chỉ chạy được trên macOS

3. **Token Storage:**
   - Sử dụng expo-secure-store (mã hóa)
   - Tự động refresh khi hết hạn
