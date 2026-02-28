import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SIZES } from "../../constants";
import { Button, Input } from "../../components/common";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { clearError, registerByHr } from "../../store/slices/authSlice";
import { RootStackParamList } from "../../navigation/AppNavigator";

type RegisterScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Register">;
};

const RegisterHrScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { isRegisterLoading } = useAppSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    age: "",
    gender: "",
    address: "",
    companyName: "",
    taxCode: "",
    companyScale: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) {
      newErrors.name = "Họ tên không được để trống";
    }

    if (!formData.email) {
      newErrors.email = "Email không được để trống";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email không hợp lệ";
    }

    if (!formData.password) {
      newErrors.password = "Mật khẩu không được để trống";
    } else if (formData.password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Vui lòng xác nhận mật khẩu";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu không khớp";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    dispatch(clearError());
    const result = await dispatch(
      registerByHr({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        age: formData.age ? parseInt(formData.age, 10) : undefined,
        gender: formData.gender || undefined,
        address: formData.address || undefined,
        companyName: formData.companyName || undefined,
        taxCode: formData.taxCode || undefined,
        companyScale: formData.companyScale || undefined,
      }),
    );

    if (registerByHr.fulfilled.match(result)) {
      Alert.alert(
        "Đăng ký thành công",
        "Tài khoản của bạn đang chờ Admin duyệt. Bạn sẽ nhận được thông báo khi tài khoản được kích hoạt.",
        [{ text: "OK", onPress: () => navigation.navigate("Login") }],
      );
    } else if (registerByHr.rejected.match(result)) {
      Alert.alert("Lỗi", (result.payload as string) || "Đăng ký thất bại");
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.gray[700]} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Đăng ký HR</Text>
            <Text style={styles.subtitle}>
              Tạo tài khoản nhà tuyển dụng
            </Text>
          </View>

          {/* Info banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={20} color={COLORS.info} />
            <Text style={styles.infoBannerText}>
              Sau khi đăng ký, tài khoản sẽ cần được Admin duyệt trước khi sử dụng.
            </Text>
          </View>

          <View style={styles.form}>
            {/* Section: Personal Info */}
            <View style={styles.sectionHeader}>
              <Ionicons name="person-circle-outline" size={22} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
            </View>

            <Input
              label="Họ và tên *"
              placeholder="Nhập họ và tên"
              value={formData.name}
              onChangeText={(value) => updateField("name", value)}
              error={errors.name}
              leftIcon={
                <Ionicons name="person-outline" size={20} color={COLORS.gray[400]} />
              }
            />

            <Input
              label="Email *"
              placeholder="Nhập email của bạn"
              value={formData.email}
              onChangeText={(value) => updateField("email", value)}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              leftIcon={
                <Ionicons name="mail-outline" size={20} color={COLORS.gray[400]} />
              }
            />

            <Input
              label="Mật khẩu *"
              placeholder="Nhập mật khẩu (ít nhất 6 ký tự)"
              value={formData.password}
              onChangeText={(value) => updateField("password", value)}
              secureTextEntry
              error={errors.password}
              leftIcon={
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray[400]} />
              }
            />

            <Input
              label="Xác nhận mật khẩu *"
              placeholder="Nhập lại mật khẩu"
              value={formData.confirmPassword}
              onChangeText={(value) => updateField("confirmPassword", value)}
              secureTextEntry
              error={errors.confirmPassword}
              leftIcon={
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray[400]} />
              }
            />

            <Input
              label="Tuổi"
              placeholder="Nhập tuổi (tùy chọn)"
              value={formData.age}
              onChangeText={(value) => updateField("age", value)}
              keyboardType="numeric"
              leftIcon={
                <Ionicons name="calendar-outline" size={20} color={COLORS.gray[400]} />
              }
            />

            <Input
              label="Giới tính"
              placeholder="Nam / Nữ / Khác (tùy chọn)"
              value={formData.gender}
              onChangeText={(value) => updateField("gender", value)}
              leftIcon={
                <Ionicons name="male-female-outline" size={20} color={COLORS.gray[400]} />
              }
            />

            <Input
              label="Địa chỉ"
              placeholder="Nhập địa chỉ (tùy chọn)"
              value={formData.address}
              onChangeText={(value) => updateField("address", value)}
              leftIcon={
                <Ionicons name="location-outline" size={20} color={COLORS.gray[400]} />
              }
            />

            {/* Section: Company Info (optional / for reference) */}
            <View style={[styles.sectionHeader, { marginTop: 16 }]}>
              <Ionicons name="business-outline" size={22} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Thông tin công ty (tùy chọn)</Text>
            </View>

            <Text style={styles.sectionHint}>
              Thông tin này giúp Admin xác minh tài khoản nhanh hơn. Bạn sẽ tạo hoặc tham gia công ty sau khi được duyệt.
            </Text>

            <Input
              label="Tên công ty"
              placeholder="Nhập tên công ty (tùy chọn)"
              value={formData.companyName}
              onChangeText={(value) => updateField("companyName", value)}
              leftIcon={
                <Ionicons name="business-outline" size={20} color={COLORS.gray[400]} />
              }
            />

            <Input
              label="Mã số thuế"
              placeholder="Nhập mã số thuế (tùy chọn)"
              value={formData.taxCode}
              onChangeText={(value) => updateField("taxCode", value)}
              leftIcon={
                <Ionicons name="document-text-outline" size={20} color={COLORS.gray[400]} />
              }
            />

            <Input
              label="Quy mô công ty"
              placeholder="VD: 1-10, 10-50, 50-200, 200+ (tùy chọn)"
              value={formData.companyScale}
              onChangeText={(value) => updateField("companyScale", value)}
              leftIcon={
                <Ionicons name="people-outline" size={20} color={COLORS.gray[400]} />
              }
            />

            <Button
              title="Đăng ký"
              onPress={handleRegister}
              loading={isRegisterLoading}
              style={styles.registerButton}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Đã có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.loginLink}>Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SIZES.padding,
    paddingVertical: 20,
  },
  backButton: {
    marginBottom: 20,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.gray[800],
    marginBottom: 8,
  },
  subtitle: {
    fontSize: SIZES.md,
    color: COLORS.gray[500],
  },
  infoBanner: {
    flexDirection: "row",
    backgroundColor: COLORS.info + "10",
    borderRadius: 12,
    padding: 14,
    gap: 10,
    alignItems: "flex-start",
    marginBottom: 20,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.info,
    lineHeight: 20,
  },
  form: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.gray[800],
  },
  sectionHint: {
    fontSize: 13,
    color: COLORS.gray[500],
    marginBottom: 12,
    lineHeight: 19,
  },
  registerButton: {
    marginTop: 24,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 20,
  },
  footerText: {
    color: COLORS.gray[500],
    fontSize: SIZES.md,
  },
  loginLink: {
    color: COLORS.primary,
    fontSize: SIZES.md,
    fontWeight: "600",
  },
});

export default RegisterHrScreen;
