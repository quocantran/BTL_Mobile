import React, { useState, useRef } from "react";
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
  Image,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SIZES } from "../../constants";
import { Button, Input } from "../../components/common";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { register, clearError, registerByHr } from "../../store/slices/authSlice";
import { RootStackParamList } from "../../navigation/AppNavigator";
import * as ImagePicker from "expo-image-picker";
import {
  RichEditor,
  RichToolbar,
  actions,
} from "react-native-pell-rich-editor";
import {UploadLogo} from "@/components/company/UploadLogo";
import { api } from "@/services";
type RegisterScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Register">;
};

const RegisterHrScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { isRegisterLoading } = useAppSelector((state) => state.auth);
  const editor = useRef<RichEditor>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    age: "",
    gender: "",
    address: "",
    companyName: "",
    companyDescription: "",
    companyLogoUrl: "",
    companyAddress: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLogoUploading, setIsLogoUploading] = useState(false);

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

    if (!formData.companyName) {
      newErrors.companyName = "Tên công ty không được để trống";
    }

    if (!formData.companyDescription) {
      newErrors.companyDescription = "Mô tả công ty không được để trống";
    }

    if (!formData.companyAddress) {
      newErrors.companyAddress = "Địa chỉ công ty không được để trống";
    }

    if (!formData.companyLogoUrl) {
      newErrors.companyLogoUrl = "Logo công ty không được để trống";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickAndUpload = async () => {
    setIsLogoUploading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (result.canceled) {
        setIsLogoUploading(false);
        return;
      }

      const asset = result.assets[0];
      let fileUri = asset.uri;
      if (
        fileUri &&
        !fileUri.startsWith("file://") &&
        !fileUri.startsWith("content://")
      ) {
        fileUri = "file://" + fileUri;
      }

      const isWeb = typeof window !== 'undefined' && !!(window as any).document;
      if (!isWeb) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      const uploadForm = new FormData();
      if (isWeb && asset.file) {
        uploadForm.append('fileUpload', asset.file);
      } else if (isWeb) {
        const response = await fetch(fileUri);
        const blobData = await response.blob();
        const mimeType = asset.mimeType || 'image/jpeg';
        const file = new File([blobData], asset.fileName || 'logo.jpg', { type: mimeType });
        uploadForm.append('fileUpload', file);
      } else {
        uploadForm.append('fileUpload', {
          uri: fileUri,
          type: asset.mimeType || 'image/jpeg',
          name: asset.fileName || 'logo.jpg',
        } as any);
      }

      let uploadResp;
      let lastError;
      const maxRetries = 2;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          uploadResp = await api.post('/files/upload', uploadForm, {
            headers: { 'Content-Type': 'multipart/form-data' },
            transformRequest: (data) => data,
            timeout: 60000,
          });
          break;
        } catch (err: any) {
          lastError = err;
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      if (!uploadResp) {
        throw lastError || new Error('Upload failed after retries');
      }
      const uploadedUrl = uploadResp?.data?.url || uploadResp?.data?.data?.url || uploadResp?.data;
      if (!uploadedUrl) {
        throw new Error('Không nhận được đường dẫn file từ server');
      }
      setFormData((prev) => ({
        ...prev,
        companyLogoUrl: uploadedUrl,
      }));
    } catch (error) {
      console.error('Upload error:', error);
      let message = 'Không thể tải logo';
      if (typeof error === 'object' && error !== null) {
        if ('response' in error && typeof (error as any).response?.data?.message === 'string') {
          message = (error as any).response.data.message;
        } else if ('message' in error && typeof (error as any).message === 'string') {
          message = (error as any).message;
        }
      }
      Alert.alert('Lỗi', message);
    } finally {
      setIsLogoUploading(false);
    }
  };

  const handleRegister = async () => {
    if (!validate()) return;
    console.log("Submitting", formData);
    dispatch(clearError());
    const result = await dispatch(
      registerByHr({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        age: formData.age ? parseInt(formData.age, 10) : undefined,
        gender: formData.gender || undefined,
        address: formData.address || undefined,
        companyName: formData.companyName,
        companyAddress: formData.companyAddress,
        companyDescription: formData.companyDescription,
        companyLogoUrl: formData.companyLogoUrl,
      }),
    );

    if (registerByHr.fulfilled.match(result)) {
      Alert.alert("Thành công", "Đăng ký thành công! Vui lòng đăng nhập.", [
        { text: "OK", onPress: () => navigation.navigate("Login") },
      ]);
    } else if (registerByHr.rejected.match(result)) {
      Alert.alert("Lỗi", (result.payload as string) || "Đăng ký thất bại");

      return;
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
            <Text style={styles.title}>Tạo tài khoản</Text>
            <Text style={styles.subtitle}>Điền thông tin để đăng ký</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Họ và tên *"
              placeholder="Nhập họ và tên"
              value={formData.name}
              onChangeText={(value) => updateField("name", value)}
              error={errors.name}
              leftIcon={
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={COLORS.gray[400]}
                />
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
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={COLORS.gray[400]}
                />
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
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={COLORS.gray[400]}
                />
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
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={COLORS.gray[400]}
                />
              }
            />

            <Input
              label="Tuổi"
              placeholder="Nhập tuổi (tùy chọn)"
              value={formData.age}
              onChangeText={(value) => updateField("age", value)}
              keyboardType="numeric"
              leftIcon={
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={COLORS.gray[400]}
                />
              }
            />

            <Input
              label="Giới tính"
              placeholder="Nam / Nữ / Khác (tùy chọn)"
              value={formData.gender}
              onChangeText={(value) => updateField("gender", value)}
              leftIcon={
                <Ionicons
                  name="male-female-outline"
                  size={20}
                  color={COLORS.gray[400]}
                />
              }
            />

            <Input
              label="Địa chỉ"
              placeholder="Nhập địa chỉ (tùy chọn)"
              value={formData.address}
              onChangeText={(value) => updateField("address", value)}
              leftIcon={
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={COLORS.gray[400]}
                />
              }
            />

            <Input
              label="Tên công ty"
              placeholder="Nhập tên công ty"
              value={formData.companyName}
              onChangeText={(value) => updateField("companyName", value)}
              error={errors.companyName}
              leftIcon={
                <Ionicons
                  name="business-outline"
                  size={20}
                  color={COLORS.gray[400]}
                />
              }
            />

            <Input
              label="Địa chỉ công ty"
              placeholder="Nhập địa chỉ công ty"
              value={formData.companyAddress}
              onChangeText={(value) => updateField("companyAddress", value)}
              error={errors.companyAddress}
              leftIcon={
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={COLORS.gray[400]}
                />
              }
            />

            <View>
              <UploadLogo
                uri={formData.companyLogoUrl}
                onPress={pickAndUpload}
                loading={isLogoUploading}
              />

              {errors.companyLogoUrl && (
                <Text style={{ color: "red", marginTop: 4 }}>
                  {errors.companyLogoUrl}
                </Text>
              )}
            </View>

            <View style={{ marginTop: 12 }}>
              <RichEditor
                ref={editor}
                placeholder="Nhập mô tả công ty..."
                style={styles.richEditor}
                initialHeight={200}
                onChange={(html) => updateField("companyDescription", html)}
              />

              <RichToolbar editor={editor} style={styles.richToolbar} />
              {errors.companyDescription && (
                <Text style={{ color: "red", marginTop: 4 }}>
                  {errors.companyDescription}
                </Text>
              )}
            </View>

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
    marginBottom: 30,
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
  form: {
    marginBottom: 20,
  },
  registerButton: {
    marginTop: 20,
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
  cvThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
  },
  richEditor: {
    minHeight: 200,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
  },

  richToolbar: {
    borderTopWidth: 1,
    borderColor: COLORS.gray[200],
  },
});

export default RegisterHrScreen;
