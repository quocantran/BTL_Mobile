import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '@/services';
import { Input } from '../../../components/common/Input';
import { Button } from '../../../components/common/Button';
import { UploadLogo } from '@/components/company/UploadLogo';
import { useAppSelector } from '../../../store/hooks';
import { companyService } from '../../../services/companyService';
import { COLORS } from '../../../constants';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Loading } from '../../../components/common/Loading';
import { RichEditor, RichToolbar } from 'react-native-pell-rich-editor';

const HrCompanyUpdateScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAppSelector((state) => state.auth);
  const companyId = user?.company?._id;
  const companyData = (route.params as any)?.company;
  const [formData, setFormData] = useState({
    companyName: '',
    companyAddress: '',
    companyLogoUrl: '',
    companyDescription: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const editor = useRef<RichEditor>(null);

  useEffect(() => {
    if (companyData) {
      setFormData({
        companyName: companyData.name || '',
        companyAddress: companyData.address || '',
        companyLogoUrl: companyData.logo || '',
        companyDescription: companyData.description || '',
      });
    }
  }, [companyData]);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.companyName) newErrors.companyName = 'Tên công ty không được để trống';
    if (!formData.companyAddress) newErrors.companyAddress = 'Địa chỉ công ty không được để trống';
    if (!formData.companyLogoUrl) newErrors.companyLogoUrl = 'Logo công ty không được để trống';
    if (!formData.companyDescription) newErrors.companyDescription = 'Mô tả công ty không được để trống';
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
        !fileUri.startsWith('file://') &&
        !fileUri.startsWith('content://')
      ) {
        fileUri = 'file://' + fileUri;
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

  const handleUpdate = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await companyService.updateCompanyByHr(companyId as string, {
        name: formData.companyName,
        address: formData.companyAddress,
        logo: formData.companyLogoUrl,
        description: formData.companyDescription,
      });
      Alert.alert('Thành công', 'Cập nhật thông tin công ty thành công', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể cập nhật thông tin công ty');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Input
        label="Tên công ty"
        placeholder="Nhập tên công ty"
        value={formData.companyName}
        onChangeText={(value) => updateField('companyName', value)}
        error={errors.companyName}
        leftIcon={null}
      />
      <Input
        label="Địa chỉ công ty"
        placeholder="Nhập địa chỉ công ty"
        value={formData.companyAddress}
        onChangeText={(value) => updateField('companyAddress', value)}
        error={errors.companyAddress}
        leftIcon={null}
      />
      <View>
        <UploadLogo
          uri={formData.companyLogoUrl}
          onPress={pickAndUpload}
          loading={isLogoUploading}
        />
        {errors.companyLogoUrl && (
          <Text style={{ color: 'red', marginTop: 4 }}>{errors.companyLogoUrl}</Text>
        )}
      </View>
      <View style={{ marginTop: 12 }}>
        <RichEditor
          ref={editor}
          placeholder="Nhập mô tả công ty..."
          style={styles.richEditor}
          initialHeight={200}
          initialContentHTML={formData.companyDescription}
          onChange={(html) => updateField('companyDescription', html)}
        />
        <RichToolbar editor={editor} style={styles.richToolbar} />
        {errors.companyDescription && (
          <Text style={{ color: 'red', marginTop: 4 }}>{errors.companyDescription}</Text>
        )}
      </View>
      <Button
        title="Cập nhật"
        onPress={handleUpdate}
        loading={loading}
        style={styles.updateButton}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  updateButton: { marginTop: 20 },
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

export default HrCompanyUpdateScreen;
