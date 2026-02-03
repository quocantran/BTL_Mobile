import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SIZES } from '../../constants';
import { Button, Input } from '../../components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getProfile } from '../../store/slices/authSlice';
import { userService } from '../../services/userService';
import { RootStackParamList } from '../../navigation/AppNavigator';

type EditProfileScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EditProfile'>;
};

const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    age: user?.age?.toString() || '',
    gender: user?.gender || '',
    address: user?.address || '',
    avatar: user?.avatar || '',
  });
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Họ tên không được để trống';
    }

    if (!formData.age) {
      newErrors.age = 'Tuổi không được để trống';
    } else if (isNaN(Number(formData.age)) || Number(formData.age) < 18) {
      newErrors.age = 'Tuổi phải là số và >= 18';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await userService.updateProfile({
        name: formData.name.trim(),
        age: Number(formData.age),
        gender: formData.gender,
        address: formData.address.trim(),
        avatar: formData.avatar,
      });
      await dispatch(getProfile());
      Alert.alert('Thành công', 'Cập nhật hồ sơ thành công', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể cập nhật hồ sơ');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Lỗi', 'Cần quyền truy cập thư viện ảnh để chọn ảnh đại diện');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadAvatar(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Lỗi', 'Cần quyền truy cập camera để chụp ảnh');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    setUploadingAvatar(true);
    try {
      // Ensure proper file URI format
      let fileUri = uri;
      if (fileUri && !fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
        fileUri = 'file://' + fileUri;
      }

      // Small delay to ensure file is ready
      const isWeb = typeof window !== 'undefined' && !!(window as any).document;
      if (!isWeb) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Create FormData for file upload
      const uploadForm = new FormData();
      const filename = uri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const mimeType = match ? `image/${match[1]}` : 'image/jpeg';

      if (isWeb) {
        const response = await fetch(fileUri);
        const blobData = await response.blob();
        const file = new File([blobData], filename, { type: mimeType });
        uploadForm.append('fileUpload', file);
      } else {
        uploadForm.append('fileUpload', {
          uri: fileUri,
          type: mimeType,
          name: filename,
        } as any);
      }

      // Retry logic for upload
      let uploadResp;
      let lastError;
      const maxRetries = 2;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          uploadResp = await userService.uploadAvatar(uploadForm);
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

      const uploadedUrl = (uploadResp as any)?.data?.url || (uploadResp as any)?.url || (uploadResp as any)?.data;
      if (!uploadedUrl) {
        throw new Error('Không nhận được đường dẫn file từ server');
      }

      setFormData((prev) => ({ ...prev, avatar: uploadedUrl }));
    } catch (error: any) {
      console.error('Upload error:', error);
      let message = 'Không thể tải lên ảnh';
      if (typeof error === 'object' && error !== null) {
        if ('response' in error && typeof (error as any).response?.data?.message === 'string') {
          message = (error as any).response.data.message;
        } else if ('message' in error && typeof (error as any).message === 'string') {
          message = (error as any).message;
        }
      }
      Alert.alert('Lỗi', message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert('Chọn ảnh đại diện', 'Chọn nguồn ảnh', [
      { text: 'Chụp ảnh', onPress: takePhoto },
      { text: 'Chọn từ thư viện', onPress: pickImage },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={showImageOptions} disabled={uploadingAvatar}>
              <View style={styles.avatarContainer}>
                {uploadingAvatar ? (
                  <ActivityIndicator size="large" color={COLORS.primary} />
                ) : formData.avatar ? (
                  <Image source={{ uri: formData.avatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={50} color={COLORS.gray[400]} />
                  </View>
                )}
                <View style={styles.editBadge}>
                  <Ionicons name="camera" size={16} color={COLORS.white} />
                </View>
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Nhấn để thay đổi ảnh đại diện</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Họ và tên *"
              placeholder="Nhập họ và tên"
              value={formData.name}
              onChangeText={(value) => updateField('name', value)}
              error={errors.name}
              leftIcon={<Ionicons name="person-outline" size={20} color={COLORS.gray[400]} />}
            />

            <Input
              label="Tuổi *"
              placeholder="Nhập tuổi của bạn"
              value={formData.age}
              onChangeText={(value) => updateField('age', value)}
              keyboardType="numeric"
              error={errors.age}
              leftIcon={<Ionicons name="calendar-outline" size={20} color={COLORS.gray[400]} />}
            />

            <Input
              label="Giới tính"
              placeholder="Nam / Nữ / Khác"
              value={formData.gender}
              onChangeText={(value) => updateField('gender', value)}
              leftIcon={<Ionicons name="male-female-outline" size={20} color={COLORS.gray[400]} />}
            />

            <Input
              label="Địa chỉ"
              placeholder="Nhập địa chỉ"
              value={formData.address}
              onChangeText={(value) => updateField('address', value)}
              multiline
              numberOfLines={2}
              leftIcon={<Ionicons name="location-outline" size={20} color={COLORS.gray[400]} />}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button title="Lưu thay đổi" onPress={handleSave} loading={loading} />
        </View>
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
    padding: SIZES.padding,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  avatarHint: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.gray[500],
  },
  form: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
  },
  footer: {
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
});

export default EditProfileScreen;
