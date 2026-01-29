import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { companyService } from '../../../services/companyService';
import { ICompany } from '../../../types';
import { Loading } from '../../../components/common/Loading';
import { COLORS } from '../../../constants';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

type AdminStackParamList = {
  ManageCompany: undefined;
  CompanyDetail: { companyId: string };
};

const AdminCompaniesListScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<AdminStackParamList>>();
  const [companies, setCompanies] = useState<ICompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState('');

  const load = async (params: any = {}) => {
    setLoading(true);
    try {
      const query: any = { pageSize: 100 };
      if (params.statusFilter === 'active') query.isActive = true;
      if (params.statusFilter === 'inactive') query.isActive = false;
      if (params.search) query.name = params.search;
      const res = await companyService.getAllCompaniesByAdmin(query);
      setCompanies(res.data.result || []);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể tải danh sách công ty');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load({ statusFilter, search });
    const unsubscribe = navigation.addListener('focus', () => load({ statusFilter, search }));
    return unsubscribe;
  }, [navigation, statusFilter, search]);

  const renderItem = ({ item }: { item: ICompany }) => (
    <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('CompanyDetail', { companyId: item._id })}>
      <Text style={styles.name}>{item.name}</Text>
      {item.address ? <Text style={styles.address}>Địa chỉ: {item.address}</Text> : null}
      <Text style={[styles.meta, item.isActive ? styles.active : styles.inactive]}>
        Trạng thái: {item.isActive ? 'Đã kích hoạt' : 'Chưa kích hoạt'}
      </Text>
      <Text style={styles.date}>Ngày tạo: {format(new Date(item.createdAt), 'dd/MM/yyyy', { locale: vi })}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, statusFilter === 'all' && styles.filterBtnActive]}
          onPress={() => setStatusFilter('all')}
        >
          <Text style={styles.filterText}>Tất cả</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, statusFilter === 'active' && styles.filterBtnActive]}
          onPress={() => setStatusFilter('active')}
        >
          <Text style={styles.filterText}>Đã kích hoạt</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, statusFilter === 'inactive' && styles.filterBtnActive]}
          onPress={() => setStatusFilter('inactive')}
        >
          <Text style={styles.filterText}>Chưa kích hoạt</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Tìm kiếm công ty theo tên..."
        value={search}
        onChangeText={setSearch}
        returnKeyType="search"
        onSubmitEditing={() => load({ statusFilter, search })}
      />
      {loading ? (
        <Loading />
      ) : (
        <FlatList data={companies} keyExtractor={(i) => i._id} renderItem={renderItem} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  filterRow: { flexDirection: 'row', marginBottom: 12, gap: 8 },
  filterBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: COLORS.gray[200] },
  filterBtnActive: { backgroundColor: COLORS.primary },
  filterText: { fontWeight: '600', color: COLORS.black },
  input: { backgroundColor: COLORS.white, borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: COLORS.gray[200] },
  item: { padding: 12, backgroundColor: COLORS.white, marginBottom: 8, borderRadius: 8 },
  name: { fontSize: 16, fontWeight: '600' },
  address: { color: COLORS.gray[600], marginTop: 4 },
  meta: { marginTop: 4, fontWeight: '600' },
  active: { color: '#22c55e' }, // green-500
  inactive: { color: '#ef4444' }, // red-500
  date: { color: COLORS.gray[600], marginTop: 4 },
});

export default AdminCompaniesListScreen;
