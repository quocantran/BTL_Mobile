import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, Alert, TouchableOpacity, ScrollView, useWindowDimensions, Modal, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { companyService } from '../../../services/companyService';
import { ICompany } from '../../../types';
import { Loading } from '../../../components/common/Loading';
import { COLORS } from '../../../constants';
import RenderHTML from 'react-native-render-html';
import { Ionicons } from '@expo/vector-icons';

type AdminStackParamList = {
  CompanyDetail: { companyId: string };
};

interface IHrUser {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

const AdminCompanyDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<AdminStackParamList, 'CompanyDetail'>>();
  const navigation = useNavigation();
  const { companyId } = route.params;
  const [company, setCompany] = useState<ICompany | null>(null);
  const [loading, setLoading] = useState(false);
  const { width } = useWindowDimensions();

  // HR management states
  const [showHrModal, setShowHrModal] = useState(false);
  const [hrSearchQuery, setHrSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<IHrUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addingHr, setAddingHr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await companyService.getCompanyById(companyId);
      setCompany(res.data);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể tải thông tin công ty');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [companyId]);

  // Search HRs by name
  const searchHrs = async (query: string) => {
    setHrSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await companyService.searchHrs(query, companyId);
      setSearchResults(res.data || []);
    } catch (err) {
      console.error('Search HRs error:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Add HR to company
  const handleAddHr = async (hr: IHrUser) => {
    if (!company) return;
    setAddingHr(hr._id);
    try {
      await companyService.addHrToCompany(hr._id, company._id, company.name);
      Alert.alert('Thành công', `Đã thêm ${hr.name} vào công ty`);
      setShowHrModal(false);
      setHrSearchQuery('');
      setSearchResults([]);
      load();
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể thêm HR');
    } finally {
      setAddingHr(null);
    }
  };

  // Remove HR from company
  const handleRemoveHr = (hr: IHrUser) => {
    if (!company) return;
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa ${hr.name} khỏi công ty?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await companyService.removeHrFromCompany(hr._id, company._id);
              Alert.alert('Thành công', `Đã xóa ${hr.name} khỏi công ty`);
              load();
            } catch (err: any) {
              Alert.alert('Lỗi', err.response?.data?.message || 'Không thể xóa HR');
            }
          },
        },
      ]
    );
  };


  const confirmToggleActive = () => {
    if (!company) return;
    Alert.alert(
      company.isActive ? 'Xác nhận hủy kích hoạt' : 'Xác nhận kích hoạt',
      company.isActive
        ? 'Bạn có chắc chắn muốn hủy kích hoạt công ty này?'
        : 'Bạn có chắc chắn muốn kích hoạt công ty này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'OK',
          onPress: async () => {
            setLoading(true);
            try {
              await companyService.verifyCompany(company._id);
              Alert.alert('Thành công', 'Cập nhật trạng thái công ty thành công');
              load();
            } catch (err) {
              Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading && !company) return <Loading />;

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 90 }}>
          {!company ? (
            <Loading />
          ) : (
            <>
              {company.logo ? <Image source={{ uri: company.logo }} style={styles.logo} resizeMode="contain" /> : null}
              <Text style={styles.name}>{company.name}</Text>
              {company.address ? <Text style={styles.address}>Địa chỉ: {company.address}</Text> : null}
              <Text style={[styles.status, company.isActive ? styles.statusActive : styles.statusInactive]}>
                Trạng thái: {company.isActive ? 'Đã kích hoạt' : 'Chưa kích hoạt'}
              </Text>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Mô tả</Text>
                {company.description ? (
                  <RenderHTML contentWidth={width - 45} source={{ html: company.description }} />
                ) : (
                  <Text style={styles.empty}>Không có mô tả</Text>
                )}
              </View>

              {/* HR Management Section */}
              <View style={styles.hrSection}>
                <View style={styles.hrSectionHeader}>
                  <Text style={styles.hrTitle}>HR của công ty ({company.hrs?.length || 0})</Text>
                  <TouchableOpacity
                    style={styles.addHrButton}
                    onPress={() => setShowHrModal(true)}
                  >
                    <Ionicons name="add" size={18} color={COLORS.white} />
                    <Text style={styles.addHrButtonText}>Thêm HR</Text>
                  </TouchableOpacity>
                </View>
                {company.hrs && company.hrs.length > 0 ? (
                  company.hrs.map((hr) => (
                    <View key={hr._id} style={styles.hrItem}>
                      <View style={styles.hrAvatarContainer}>
                        {hr.avatar ? (
                          <Image source={{ uri: hr.avatar }} style={styles.hrAvatar} />
                        ) : (
                          <View style={styles.hrAvatarPlaceholder}>
                            <Text style={styles.hrAvatarText}>
                              {hr.name?.charAt(0).toUpperCase() || 'H'}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.hrInfo}>
                        <Text style={styles.hrName}>{hr.name}</Text>
                        <Text style={styles.hrEmail}>{hr.email}</Text>
                        <Text style={styles.hrRole}>Vai trò: {hr.role}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removeHrButton}
                        onPress={() => handleRemoveHr(hr)}
                      >
                        <Ionicons name="close-circle" size={24} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <Text style={styles.empty}>Chưa có HR nào trong công ty</Text>
                )}
              </View>
            </>
          )}
        </ScrollView>
        {company && (
          <View style={styles.footerFloatBtnWrap}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: company.isActive ? COLORS.gray[400] : COLORS.primary }]}
              onPress={confirmToggleActive}
            >
              <Text style={[styles.btnText, { color: company.isActive ? COLORS.black : COLORS.white }]}> 
                {company.isActive ? 'Hủy kích hoạt' : 'Kích hoạt'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Add HR Modal */}
        <Modal
          visible={showHrModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowHrModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Thêm HR vào công ty</Text>
                <TouchableOpacity onPress={() => {
                  setShowHrModal(false);
                  setHrSearchQuery('');
                  setSearchResults([]);
                }}>
                  <Ionicons name="close" size={24} color={COLORS.gray[600]} />
                </TouchableOpacity>
              </View>

              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color={COLORS.gray[400]} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm kiếm HR theo tên..."
                  value={hrSearchQuery}
                  onChangeText={searchHrs}
                  autoFocus
                />
                {searchLoading && <ActivityIndicator size="small" color={COLORS.primary} />}
              </View>

              <FlatList
                data={searchResults}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.searchResultItem}
                    onPress={() => handleAddHr(item)}
                    disabled={addingHr === item._id}
                  >
                    <View style={styles.hrAvatarContainer}>
                      {item.avatar ? (
                        <Image source={{ uri: item.avatar }} style={styles.hrAvatar} />
                      ) : (
                        <View style={styles.hrAvatarPlaceholder}>
                          <Text style={styles.hrAvatarText}>
                            {item.name?.charAt(0).toUpperCase() || 'H'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.hrInfo}>
                      <Text style={styles.hrName}>{item.name}</Text>
                      <Text style={styles.hrEmail}>{item.email}</Text>
                    </View>
                    {addingHr === item._id ? (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                      <Ionicons name="add-circle" size={24} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  hrSearchQuery.length > 0 && !searchLoading ? (
                    <View style={styles.emptySearchContainer}>
                      <Ionicons name="search-outline" size={48} color={COLORS.gray[300]} />
                      <Text style={styles.emptySearchText}>Không tìm thấy HR nào</Text>
                      <Text style={styles.emptySearchHint}>Chỉ tìm thấy HR chưa thuộc công ty khác</Text>
                    </View>
                  ) : null
                }
                style={styles.searchResultsList}
              />
            </View>
          </View>
        </Modal>
      </View>
    );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  logo: { width: '100%', height: 160, marginBottom: 12, borderRadius: 8, backgroundColor: COLORS.white },
  name: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  address: { color: COLORS.gray[700], marginBottom: 8 },
  status: { marginBottom: 12 },
  statusActive: { color: '#22c55e' },
  statusInactive: { color: COLORS.danger },
  section: { backgroundColor: COLORS.white, padding: 12, borderRadius: 8, marginBottom: 12 },
  sectionTitle: { fontWeight: '700', marginBottom: 8 },
  empty: { color: COLORS.gray[600] },
  btn: { padding: 16, borderRadius: 8, alignItems: 'center', minWidth: 160 },
  footerFloatBtnWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    padding: 16,
    alignItems: 'center',
    zIndex: 10,
  },
  btnText: { fontWeight: '700' },
  hrSection: { marginTop: 20, backgroundColor: COLORS.white, borderRadius: 8, padding: 12 },
  hrSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  hrTitle: { fontWeight: '700', fontSize: 16 },
  addHrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    gap: 4,
  },
  addHrButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  hrItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.gray[100] },
  hrAvatarContainer: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hrAvatar: {
    width: 45,
    height: 45,
    borderRadius: 23,
  },
  hrAvatarPlaceholder: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hrAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  hrInfo: { flex: 1 },
  hrName: { fontWeight: '600', fontSize: 15 },
  hrEmail: { color: COLORS.gray[700], marginTop: 2 },
  hrRole: { color: COLORS.gray[500], marginTop: 2 },
  removeHrButton: {
    padding: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.gray[800],
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.gray[800],
  },
  searchResultsList: {
    paddingHorizontal: 16,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  emptySearchContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptySearchText: {
    fontSize: 16,
    color: COLORS.gray[500],
    marginTop: 12,
  },
  emptySearchHint: {
    fontSize: 13,
    color: COLORS.gray[400],
    marginTop: 4,
  },
});

export default AdminCompanyDetailScreen;
