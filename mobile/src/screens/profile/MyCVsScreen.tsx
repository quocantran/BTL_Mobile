import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Linking,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS, SIZES } from '../../constants';
import { CVCard, Loading, EmptyState, Button, Input } from '../../components';
import { userCVService } from '../../services/userCVService';
import { onlineCVService, IOnlineCV } from '../../services/onlineCVService';
import api from '../../services/api';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { IUserCV } from '../../types';

type MyCVsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MyCVs'>;
};

const MyCVsScreen: React.FC<MyCVsScreenProps> = ({ navigation }) => {
  const [cvs, setCvs] = useState<IUserCV[]>([]);
  const [draftCVs, setDraftCVs] = useState<IOnlineCV[]>([]); // Online CV drafts
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [cvName, setCvName] = useState('');
  const [pickedFile, setPickedFile] = useState<any>(null);
  
  // Edit CV states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCV, setEditingCV] = useState<IUserCV | null>(null);
  const [editCvName, setEditCvName] = useState('');
  const [saving, setSaving] = useState(false);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadCVs();
    }, [])
  );

  const loadCVs = async () => {
    try {
      console.log('Loading CVs...');
      const [cvsResponse, draftsResponse] = await Promise.all([
        userCVService.getMyCVs(),
        onlineCVService.getMyOnlineCVs(),
      ]);
      console.log('CVs response:', JSON.stringify(cvsResponse));
      console.log('Drafts response:', JSON.stringify(draftsResponse));
      setCvs(cvsResponse.data || []);
      // Only show online CVs as drafts if they haven't been exported to PDF yet
      const allOnlineCVs = draftsResponse.data || [];
      setDraftCVs(allOnlineCVs.filter((cv: IOnlineCV) => !cv.pdfUrl));
      console.log('Drafts set:', allOnlineCVs.filter((cv: IOnlineCV) => !cv.pdfUrl).length, 'of', allOnlineCVs.length);
    } catch (error) {
      console.error('Failed to load CVs:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCVs();
    setRefreshing(false);
  };

  const handleUploadCV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        // Only allow PDF and DOCX files
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
        ],
        copyToCacheDirectory: true,
      });

      // Expo DocumentPicker returns { type: 'success'|'cancel', uri, name, size, mimeType }
      // On web it also has `file` (File object) and `output` (FileList)
      // On newer Expo SDK it returns { canceled, assets: [{ uri, name, mimeType, size }] }
      
      console.log('DocumentPicker raw result:', JSON.stringify(result, null, 2));
      
      if ((result as any).type === 'cancel' || (result as any).canceled === true) return;

      const picked: any = result;
      
      // Handle both old format (direct properties) and new format (assets array)
      const asset = picked.assets?.[0] || picked;
      
      console.log('Asset extracted:', JSON.stringify(asset, null, 2));

      // On web, prefer the actual File object; on native use uri
      const file = {
        uri: asset.uri || asset.fileUri || picked.uri || picked.fileUri || '',
        mimeType: asset.mimeType || asset.type || picked.mimeType || picked.type || 'application/pdf',
        name: asset.name || asset.fileName || picked.name || picked.fileName || 'upload.pdf',
        webFile: picked.file || picked.output?.[0] || asset.file || null, // actual File object on web
      };

      console.log('Picked file:', JSON.stringify(file, null, 2));

      if (!file.uri) {
        Alert.alert('Lỗi', 'Không tìm thấy đường dẫn file. Vui lòng thử lại.');
        return;
      }

      // Small delay to ensure file is fully written to cache on native
      const isWeb = typeof window !== 'undefined' && !!(window as any).document;
      if (!isWeb) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      setPickedFile(file);
      setCvName((file.name || '').replace(/\.[^/.]+$/, ''));
      setShowNameModal(true);
    } catch (error) {
      console.error('Document picker error:', error);
    }
  };

  const handleConfirmUpload = async () => {
    if (!cvName?.trim() || !pickedFile) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên CV và chọn file');
      return;
    }

    setUploading(true);
    try {
      // 1) Upload file to /files/upload (field name expected: fileUpload)
      const uploadForm = new FormData();

      // Handle web vs native platforms
      const isWeb = typeof window !== 'undefined' && !!(window as any).document;
      
      console.log('Upload debug:', {
        isWeb,
        uri: pickedFile.uri,
        mimeType: pickedFile.mimeType,
        name: pickedFile.name,
        hasWebFile: !!pickedFile.webFile,
      });

      if (isWeb && pickedFile.webFile) {
        // Web: use the actual File object directly from DocumentPicker
        uploadForm.append('fileUpload', pickedFile.webFile);
      } else if (isWeb) {
        // Web fallback: fetch the URI and create File
        const response = await fetch(pickedFile.uri);
        const blobData = await response.blob();
        const mimeType = pickedFile.mimeType || 'application/pdf';
        const file = new File([blobData], pickedFile.name, { type: mimeType });
        uploadForm.append('fileUpload', file);
      } else {
        // Native (iOS/Android): use uri/type/name object
        // Ensure URI starts with file:// for some platforms
        let fileUri = pickedFile.uri || '';
        if (fileUri && !fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
          fileUri = 'file://' + fileUri;
        }
        
        if (!fileUri) {
          throw new Error('Không tìm thấy đường dẫn file');
        }
        
        uploadForm.append('fileUpload', {
          uri: fileUri,
          type: pickedFile.mimeType || 'application/pdf',
          name: pickedFile.name || 'upload.pdf',
        } as any);
      }

      // Don't set Content-Type manually - let RN set it with boundary
      // Add retry logic for transient network errors on native
      let uploadResp;
      let lastError;
      const maxRetries = 2;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          uploadResp = await api.post('/files/upload', uploadForm, {
            headers: { 'Content-Type': 'multipart/form-data' },
            transformRequest: (data) => data, // Prevent axios from transforming FormData
            timeout: 60000, // 60 second timeout for file uploads
          });
          break; // Success, exit loop
        } catch (err: any) {
          lastError = err;
          console.log(`Upload attempt ${attempt} failed:`, err.message);
          if (attempt < maxRetries) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      if (!uploadResp) {
        throw lastError || new Error('Upload failed after retries');
      }

      // Files service returns { url: '...' } or wrapped in data
      const uploadedUrl =
        uploadResp?.data?.url || uploadResp?.data?.data?.url || uploadResp?.data;

      if (!uploadedUrl) {
        throw new Error('Không nhận được đường dẫn file từ server');
      }

      // 2) Create user CV record with returned url
      await userCVService.createCV({ url: uploadedUrl, title: cvName.trim() });
      await loadCVs();

      setShowNameModal(false);
      setPickedFile(null);
      setCvName('');
      Alert.alert('Thành công', 'Tải CV lên thành công');
    } catch (error: any) {
      console.error('Upload error', error);
      Alert.alert('Lỗi', error.response?.data?.message || error.message || 'Không thể tải CV');
    } finally {
      setUploading(false);
    }
  };

  const handleSetPrimary = async (cvId: string) => {
    try {
      await userCVService.setPrimaryCv(cvId);
      await loadCVs();
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể đặt CV chính');
    }
  };

  const handleDeleteCV = (cv: IUserCV) => {
    Alert.alert('Xóa CV', `Bạn có chắc chắn muốn xóa "${cv.title}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await userCVService.deleteCV(cv._id);
            await loadCVs();
          } catch (error: any) {
            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xóa CV');
          }
        },
      },
    ]);
  };

  const handleViewCV = (cv: IUserCV) => {
    // Open PDF or DOCX files in browser/external viewer
    if (cv.url) {
      Linking.openURL(cv.url);
    }
  };

  // Handle edit CV - different behavior for online vs uploaded CVs
  const handleEditCV = (cv: IUserCV) => {
    if (cv.onlineCvId) {
      // Online CV: navigate to CVFormScreen to edit content + can also edit name here
      Alert.alert(
        'Chỉnh sửa CV',
        'Bạn muốn chỉnh sửa gì?',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Đổi tên',
            onPress: () => {
              setEditingCV(cv);
              setEditCvName(cv.title || '');
              setShowEditModal(true);
            },
          },
          {
            text: 'Sửa nội dung',
            onPress: () => {
              // Navigate to CVFormScreen with onlineCvId
              navigation.navigate('CVFormScreen', { 
                templateType: '', // Will be loaded from the online CV
                cvId: cv.onlineCvId 
              });
            },
          },
        ]
      );
    } else {
      // Uploaded CV: only allow editing name
      setEditingCV(cv);
      setEditCvName(cv.title || '');
      setShowEditModal(true);
    }
  };

  // Save edited CV name
  const handleSaveEditName = async () => {
    if (!editingCV || !editCvName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên CV');
      return;
    }
    
    setSaving(true);
    try {
      await userCVService.updateCV(editingCV._id, { title: editCvName.trim() });
      await loadCVs();
      setShowEditModal(false);
      setEditingCV(null);
      setEditCvName('');
      Alert.alert('Thành công', 'Đã cập nhật tên CV');
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể cập nhật CV');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading fullScreen text="Đang tải CV..." />;
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>CV của tôi</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={[styles.uploadButton, styles.createOnlineBtn]}
              onPress={() => navigation.navigate('CVTemplateSelect')}
            >
              <Ionicons name="create-outline" size={20} color={COLORS.white} />
              <Text style={styles.uploadButtonText}>Tạo online</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleUploadCV}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={20} color={COLORS.white} />
                  <Text style={styles.uploadButtonText}>Tải lên</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.info} />
          <Text style={styles.infoText}>
            Chỉ hỗ trợ file PDF và DOCX. Chọn một CV làm CV chính, CV này sẽ được tự động chọn khi bạn ứng tuyển.
          </Text>
        </View>

        {/* Name input modal (cross-platform) */}
        <Modal visible={showNameModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Đặt tên CV</Text>

              <Input placeholder="Tên CV" value={cvName} onChangeText={setCvName} />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancel]}
                  onPress={() => {
                    setShowNameModal(false);
                    setPickedFile(null);
                  }}
                  disabled={uploading}
                >
                  <Text style={styles.modalButtonText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalConfirm, uploading && styles.modalButtonDisabled]}
                  onPress={handleConfirmUpload}
                  disabled={uploading}
                >
                  {uploading ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color={COLORS.white} />
                      <Text style={[styles.modalButtonText, { color: COLORS.white, marginLeft: 8 }]}>Đang tải...</Text>
                    </View>
                  ) : (
                    <Text style={[styles.modalButtonText, { color: COLORS.white }]}>Xác nhận</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* CV List */}
        {cvs.length === 0 && draftCVs.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="Chưa có CV nào"
            message="Tải lên CV của bạn để bắt đầu ứng tuyển"
            actionLabel="Tải lên CV"
            onAction={handleUploadCV}
          />
        ) : (
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {/* Draft CVs Section */}
            {draftCVs.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="document-outline" size={18} color={COLORS.warning} />
                  <Text style={styles.sectionTitle}>Bản nháp ({draftCVs.length})</Text>
                </View>
                <Text style={styles.sectionSubtitle}>
                  CV đang tạo dở, nhấn để tiếp tục chỉnh sửa
                </Text>
                {draftCVs.map((draft) => (
                  <TouchableOpacity
                    key={draft._id}
                    style={styles.draftCard}
                    onPress={() => navigation.navigate('CVFormScreen', { 
                      templateType: draft.templateType, 
                      cvId: draft._id 
                    })}
                  >
                    <View style={styles.draftIcon}>
                      <Ionicons 
                        name={draft.templateType === 'template1' ? 'document-text' : 'grid'} 
                        size={24} 
                        color={COLORS.primary} 
                      />
                    </View>
                    <View style={styles.draftInfo}>
                      <Text style={styles.draftName} numberOfLines={1}>
                        {draft.fullName || 'Chưa có tên'}
                      </Text>
                      <Text style={styles.draftTemplate}>
                        {draft.templateType === 'template1' ? 'Mẫu cơ bản' : 'Mẫu hiện đại'}
                      </Text>
                      <Text style={styles.draftDate}>
                        Cập nhật: {new Date(draft.updatedAt).toLocaleDateString('vi-VN')}
                      </Text>
                    </View>
                    <View style={styles.draftActions}>
                      <TouchableOpacity
                        style={styles.draftActionBtn}
                        onPress={() => {
                          Alert.alert(
                            'Xóa bản nháp',
                            'Bạn có chắc muốn xóa bản nháp này?',
                            [
                              { text: 'Hủy', style: 'cancel' },
                              {
                                text: 'Xóa',
                                style: 'destructive',
                                onPress: async () => {
                                  try {
                                    await onlineCVService.deleteOnlineCV(draft._id);
                                    await loadCVs();
                                  } catch (err) {
                                    Alert.alert('Lỗi', 'Không thể xóa bản nháp');
                                  }
                                },
                              },
                            ]
                          );
                        }}
                      >
                        <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                      </TouchableOpacity>
                      <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Completed CVs Section */}
            {cvs.length > 0 && (
              <View style={styles.sectionContainer}>
                {draftCVs.length > 0 && (
                  <>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                      <Text style={styles.sectionTitle}>CV hoàn chỉnh ({cvs.length})</Text>
                    </View>
                    <Text style={styles.sectionSubtitle}>
                      CV đã hoàn thành, sẵn sàng ứng tuyển
                    </Text>
                  </>
                )}
                {cvs.map((item) => (
                  <CVCard
                    key={item._id}
                    cv={item}
                    onPress={() => handleViewCV(item)}
                    onSetPrimary={() => handleSetPrimary(item._id)}
                    onDelete={() => handleDeleteCV(item)}
                    onEdit={() => handleEditCV(item)}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        )}

        {/* Edit CV Name Modal */}
        <Modal visible={showEditModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Đổi tên CV</Text>
              
              <Input 
                placeholder="Tên CV" 
                value={editCvName} 
                onChangeText={setEditCvName} 
              />
              
              {editingCV?.onlineCvId && (
                <Text style={styles.editHint}>
                  Đây là CV tạo online. Bạn có thể sửa nội dung trong màn hình chi tiết.
                </Text>
              )}
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancel]}
                  onPress={() => {
                    setShowEditModal(false);
                    setEditingCV(null);
                    setEditCvName('');
                  }}
                  disabled={saving}
                >
                  <Text style={styles.modalButtonText}>Hủy</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalConfirm, saving && styles.modalButtonDisabled]}
                  onPress={handleSaveEditName}
                  disabled={saving}
                >
                  {saving ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color={COLORS.white} />
                      <Text style={[styles.modalButtonText, { color: COLORS.white, marginLeft: 8 }]}>Đang lưu...</Text>
                    </View>
                  ) : (
                    <Text style={[styles.modalButtonText, { color: COLORS.white }]}>Lưu</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  createOnlineBtn: {
    backgroundColor: COLORS.success,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: SIZES.radius,
    gap: 6,
  },
  uploadButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: SIZES.sm,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.info + '10',
    marginHorizontal: SIZES.padding,
    marginBottom: 12,
    padding: 12,
    borderRadius: SIZES.radius,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: SIZES.sm,
    color: COLORS.info,
    lineHeight: 20,
  },
  listContent: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: 20,
  },
  scrollContainer: {
    flex: 1,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  sectionSubtitle: {
    fontSize: SIZES.sm,
    color: COLORS.gray[500],
    marginBottom: 12,
  },
  draftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.warning + '40',
    borderStyle: 'dashed',
  },
  draftIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  draftInfo: {
    flex: 1,
    marginLeft: 12,
  },
  draftName: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  draftTemplate: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    marginTop: 2,
  },
  draftDate: {
    fontSize: 11,
    color: COLORS.gray[400],
    marginTop: 2,
  },
  draftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  draftActionBtn: {
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  editHint: {
    fontSize: SIZES.sm,
    color: COLORS.gray[500],
    fontStyle: 'italic',
    marginTop: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  modalCancel: {
    backgroundColor: COLORS.gray[200],
  },
  modalConfirm: {
    backgroundColor: COLORS.primary,
  },
  modalButtonDisabled: {
    opacity: 0.7,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalButtonText: {
    fontWeight: '600',
    color: COLORS.gray[800],
  },
});

export default MyCVsScreen;
