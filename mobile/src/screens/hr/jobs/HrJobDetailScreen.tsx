import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../../constants';
import { jobService } from '../../../services/jobService';
import { NativeStackNavigationProp } from 'node_modules/@react-navigation/native-stack/lib/typescript/src/types';

type HrStackParamList = {
    HrJobDetail: { job: any };
};

const HrJobDetailScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<HrStackParamList, 'HrJobDetail'>>();
  const job = (route.params as any)?.job;
  const [localJob, setLocalJob] = useState(job);

  const load = async () => {
    if (!job?._id) return;
    try {
      const res = await jobService.getJobById(job._id);
      setLocalJob(res.data);
    } catch (err) {
      // ignore fetch errors here
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [job?._id]),
  );

  const displayJob = localJob;
  if (!displayJob) return <View style={styles.container}><Text>Không tìm thấy công việc</Text></View>;

  const handleDelete = async () => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa công việc này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        try {
          await jobService.deleteJob(job._id);
          Alert.alert('Thành công', 'Đã xóa công việc', [{ text: 'OK', onPress: () => navigation.goBack() }]);
        } catch (err) {
          Alert.alert('Lỗi', 'Không thể xóa công việc');
        }
      } }
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.title}>{displayJob.name}</Text>
          <Text style={[styles.status, displayJob.isActive ? styles.statusActive : styles.statusInactive]}>{displayJob.isActive ? 'Đang tuyển' : 'Ngưng tuyển'}</Text>
        </View>

        <View style={styles.kvRow}><Text style={styles.kvLabel}>Địa điểm:</Text><Text style={styles.kvValue}>{displayJob.location || '-'}</Text></View>
        <View style={styles.kvRow}><Text style={styles.kvLabel}>Lương:</Text><Text style={styles.kvValue}>{displayJob.salary ? displayJob.salary + ' ₫' : 'Thương lượng'}</Text></View>
        <View style={styles.kvRow}><Text style={styles.kvLabel}>Bắt đầu:</Text><Text style={styles.kvValue}>{displayJob.startDate ? new Date(displayJob.startDate).toLocaleDateString() : '-'}</Text></View>
        <View style={styles.kvRow}><Text style={styles.kvLabel}>Kết thúc:</Text><Text style={styles.kvValue}>{displayJob.endDate ? new Date(displayJob.endDate).toLocaleDateString() : '-'}</Text></View>

        <View style={{ marginTop: 12 }}>
          <Text style={styles.sectionTitle}>Mô tả</Text>
          <Text>{displayJob.description || 'Không có mô tả'}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', marginTop: 20, justifyContent: 'space-between' }}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.primary }]} onPress={() => navigation.navigate('HrJobForm' as any, { job })}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Cập nhật</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#ef4444' }]} onPress={handleDelete}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Xóa</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.gray[200] }]} onPress={() => {/* xem ứng viên - implement later */}}>
          <Text style={{ fontWeight: '700' }}>Ứng viên</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  card: { backgroundColor: '#fff', padding: 12, borderRadius: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  status: { fontWeight: '700' },
  statusActive: { color: '#16a34a' },
  statusInactive: { color: '#ef4444' },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  kvLabel: { color: COLORS.gray[600], width: 100 },
  kvValue: { flex: 1, textAlign: 'right' },
  sectionTitle: { fontWeight: '700', marginBottom: 6 },
  btn: { padding: 12, borderRadius: 8, minWidth: 90, alignItems: 'center' },
});

export default HrJobDetailScreen;
