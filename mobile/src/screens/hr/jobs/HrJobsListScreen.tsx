import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useAppSelector } from '../../../store/hooks';
import { jobService } from '../../../services/jobService';
import { Loading } from '../../../components/common/Loading';
import { COLORS } from '../../../constants';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from 'node_modules/@react-navigation/native-stack/lib/typescript/src/types';

type HrStackParamList = {
    HrJobForm: { job?: any };
    HrJobDetail: { job: any };
};

const HrJobsListScreen: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const company = user?.company;
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [inactiveMessage, setInactiveMessage] = useState<string | null>(null);
  const navigation = useNavigation<NativeStackNavigationProp<HrStackParamList, 'HrJobForm'>>();

  const load = useCallback(async () => {
    if (!company) return;
    // clear previous server messages
    setInactiveMessage(null);
    setLoading(true);
    try {
      const res = await jobService.getJobsByHr({ pageSize: 50, current: 1 });
      setJobs(res.data.result || []);
      setInactiveMessage(null);
    } catch (err: any) {
      // show server-provided message on screen
      let msg = 'Có lỗi xảy ra';
      if (err?.response?.data?.message) msg = err.response.data.message;
      else if (err?.message) msg = err.message;

      if (msg === 'Company is not active' || msg.toLowerCase().includes('not active')) {
        setInactiveMessage('Công ty của bạn chưa được duyệt, vui lòng liên hệ admin');
      } else {
        setInactiveMessage(msg);
      }
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [company]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!company) return <View style={styles.container}><Text>Không tìm thấy công ty của bạn</Text></View>;

  if (inactiveMessage) {
    return (
      <View style={[styles.container, { padding: 16 }]}> 
        <Text style={{ color: COLORS.danger }}>{inactiveMessage}</Text>
      </View>
    );
  }

  if (loading && jobs.length === 0) return <Loading />;

  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.itemCard} onPress={() => navigation.navigate('HrJobDetail' as any, { job: item })}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={[styles.statusText, item.isActive ? styles.statusActive : styles.statusInactive]}>{item.isActive ? 'Đang tuyển' : 'Ngưng tuyển'}</Text>
      </View>

      <View style={styles.kvRow}>
        <Text style={styles.kvLabel}>Địa điểm:</Text>
        <Text style={styles.kvValue}>{item.location || '-'}</Text>
      </View>

      <View style={styles.kvRow}>
        <Text style={styles.kvLabel}>Lương:</Text>
        <Text style={styles.kvValue}>{item.salary ? item.salary + ' ₫' : 'Thương lượng'}</Text>
      </View>

      <View style={styles.kvRow}>
        <Text style={styles.kvLabel}>Bắt đầu:</Text>
        <Text style={styles.kvValue}>{item.startDate ? new Date(item.startDate).toLocaleDateString() : '-'}</Text>
      </View>

      <View style={styles.kvRow}>
        <Text style={styles.kvLabel}>Kết thúc:</Text>
        <Text style={styles.kvValue}>{item.endDate ? new Date(item.endDate).toLocaleDateString() : '-'}</Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.appCount}>{item.applicationsCount ?? 0} ứng viên</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={jobs}
        keyExtractor={(i) => i._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={() => <View style={{ padding: 16 }}><Text>Chưa có tin tuyển dụng</Text></View>}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('HrJobForm' as any)}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Tạo</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  item: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 6, borderRadius: 8, alignItems: 'center' },
  name: { fontWeight: '700', fontSize: 16 },
  meta: { color: COLORS.gray[500], marginTop: 4 },
  count: { fontWeight: '700', fontSize: 16 },
  countLabel: { color: COLORS.gray[500], fontSize: 12 },
  fab: { position: 'absolute', right: 16, bottom: 20, backgroundColor: COLORS.primary, padding: 12, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  itemCard: { backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 8, padding: 12, borderRadius: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontWeight: '700', fontSize: 16 },
  statusText: { fontWeight: '700' },
  statusActive: { color: '#16a34a' },
  statusInactive: { color: '#ef4444' },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  kvLabel: { color: COLORS.gray[600], width: 100 },
  kvValue: { flex: 1, textAlign: 'right' },
  cardFooter: { marginTop: 8, alignItems: 'flex-end' },
  appCount: { fontWeight: '700' },
});

export default HrJobsListScreen;
