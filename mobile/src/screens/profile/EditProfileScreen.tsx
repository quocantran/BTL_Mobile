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
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
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
  });
  const [loading, setLoading] = useState(false);
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
