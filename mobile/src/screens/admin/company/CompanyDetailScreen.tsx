import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, Alert, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { companyService } from '../../../services/companyService';
import { ICompany } from '../../../types';
import { Loading } from '../../../components/common/Loading';
import { COLORS } from '../../../constants';
import RenderHTML from 'react-native-render-html';

type AdminStackParamList = {
  CompanyDetail: { companyId: string };
};

const CompanyDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<AdminStackParamList, 'CompanyDetail'>>();
  const navigation = useNavigation();
  const { companyId } = route.params;
  const [company, setCompany] = useState<ICompany | null>(null);
  const [loading, setLoading] = useState(false);
  const { width } = useWindowDimensions();

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
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {!company ? (
        <Loading />
      ) : (
        <>
          {company.logo ? <Image source={{ uri: company.logo }} style={styles.logo} resizeMode="contain" /> : null}
          <Text style={styles.name}>{company.name}</Text>
          {company.address ? <Text style={styles.address}>Địa chỉ: {company.address}</Text> : null}
          <Text style={styles.status}>Trạng thái: {company.isActive ? 'Đã kích hoạt' : 'Chưa kích hoạt'}</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mô tả</Text>
            {company.description ? (
              <RenderHTML contentWidth={width - 32} source={{ html: company.description }} />
            ) : (
              <Text style={styles.empty}>Không có mô tả</Text>
            )}
          </View>

          {company.hr && (
            <View style={styles.hrSection}>
              <Text style={styles.hrTitle}>HR của công ty</Text>
              
                <View key={company.hr._id} style={styles.hrItem}>
                  <View style={styles.hrAvatarWrap}>
                    {company.hr.avatar ? (
                      <Image source={{ uri: company.hr.avatar ?? "https://via.placeholder.com/50" }} style={styles.hrAvatar} />
                    ) : (
                      <View style={[styles.hrAvatar, styles.hrAvatarPlaceholder]} />
                    )}
                  </View>
                  <View style={styles.hrInfo}>
                    <Text style={styles.hrName}>{company.hr.name}</Text>
                    <Text style={styles.hrEmail}>{company.hr.email}</Text>
                    <Text style={styles.hrRole}>Vai trò: {company.hr.role}</Text>
                  </View>
                </View>
              
            </View>
          )}

          <TouchableOpacity style={[styles.btn, { backgroundColor: company.isActive ? COLORS.gray[400] : COLORS.primary }]} onPress={confirmToggleActive}>
            <Text style={[styles.btnText, { color: company.isActive ? COLORS.black : COLORS.white }]}>
              {company.isActive ? 'Hủy kích hoạt' : 'Kích hoạt'}
            </Text>
          </TouchableOpacity>

          
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  logo: { width: '100%', height: 160, marginBottom: 12, borderRadius: 8, backgroundColor: COLORS.white },
  name: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  address: { color: COLORS.gray[700], marginBottom: 8 },
  status: { color: COLORS.gray[700], marginBottom: 12 },
  section: { backgroundColor: COLORS.white, padding: 12, borderRadius: 8, marginBottom: 12 },
  sectionTitle: { fontWeight: '700', marginBottom: 8 },
  empty: { color: COLORS.gray[600] },
  btn: { padding: 12, borderRadius: 8, alignItems: 'center' },
  btnText: { fontWeight: '700' },
  hrSection: { marginTop: 20, backgroundColor: COLORS.white, borderRadius: 8, padding: 12 },
  hrTitle: { fontWeight: '700', fontSize: 16, marginBottom: 10 },
  hrItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  hrAvatarWrap: { marginRight: 12 },
  hrAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.gray[200] },
  hrAvatarPlaceholder: { backgroundColor: COLORS.gray[300] },
  hrInfo: { flex: 1 },
  hrName: { fontWeight: '600', fontSize: 15 },
  hrEmail: { color: COLORS.gray[700], marginTop: 2 },
  hrRole: { color: COLORS.gray[500], marginTop: 2 },
});

export default CompanyDetailScreen;
