import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  useWindowDimensions,
} from "react-native";
import { useAppSelector } from "../../../store/hooks";
import { companyService } from "../../../services/companyService";
import { Loading } from "../../../components/common/Loading";
import { COLORS } from "../../../constants";
import RenderHTML from "react-native-render-html";
import { useNavigation } from "@react-navigation/native";
import { ICompany } from "@/types";
import { NativeStackNavigationProp } from "node_modules/@react-navigation/native-stack/lib/typescript/src/types";

type HrStackParamList = {
  HrCompanyUpdate: { company: ICompany };
};

const HrCompanyDetailScreen: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const companyId = user?.company?._id;
  const [company, setCompany] = useState<ICompany | null>(null);
  const [loading, setLoading] = useState(false);
  const { width } = useWindowDimensions();
  const navigation =
    useNavigation<NativeStackNavigationProp<HrStackParamList>>();

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await companyService.getCompanyById(companyId);
      setCompany(res.data as ICompany);
    } catch (err) {
      Alert.alert("Lỗi", "Không thể tải thông tin công ty");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const unsubscribe = navigation.addListener('focus', () => {
      load();
    });
    return unsubscribe;
  }, [companyId, navigation]);

  if (loading && !company) return <Loading />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
    >
      {!company ? (
        <Loading />
      ) : (
        <>
          {company.logo ? (
            <Image
              source={{ uri: company.logo }}
              style={styles.logo}
              resizeMode="contain"
            />
          ) : null}
          <Text style={styles.name}>{company.name}</Text>
          {company.address ? (
            <Text style={styles.address}>Địa chỉ: {company.address}</Text>
          ) : null}
          <Text style={[styles.status, company.isActive ? styles.statusActive : styles.statusInactive]}>
            Trạng thái: {company.isActive ? "Đã kích hoạt" : "Chưa kích hoạt"}
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mô tả</Text>
            {company.description ? (
              <RenderHTML
                contentWidth={width - 32}
                source={{ html: company.description }}
              />
            ) : (
              <Text style={styles.empty}>Không có mô tả</Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.btn,
              { backgroundColor: COLORS.primary, marginTop: 16 },
            ]}
            onPress={() => navigation.navigate("HrCompanyUpdate", { company })}
          >
            <Text style={[styles.btnText, { color: COLORS.white }]}>
              Cập nhật thông tin công ty
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  logo: {
    width: "100%",
    height: 160,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
  name: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  address: { color: COLORS.gray[700], marginBottom: 8 },
  status: { color: COLORS.gray[700], marginBottom: 12 },
  statusActive: { color: '#16a34a', marginBottom: 12 },
  statusInactive: { color: '#ef4444', marginBottom: 12 },
  section: {
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  sectionTitle: { fontWeight: "700", marginBottom: 8 },
  empty: { color: COLORS.gray[600] },
  btn: { padding: 12, borderRadius: 8, alignItems: "center" },
  btnText: { fontWeight: "700" },
});

export default HrCompanyDetailScreen;
