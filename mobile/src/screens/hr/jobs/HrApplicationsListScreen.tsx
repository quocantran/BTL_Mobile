import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { APPLICATION_STATUS, COLORS } from "../../../constants";
import { applicationService } from "../../../services/applicationService";
import { useNavigation, useRoute } from "@react-navigation/native";
import { IApplication } from "../../../types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";


const STATUS_COLORS = {
  PENDING: COLORS.warning,
  REVIEWING: COLORS.info,
  APPROVED: COLORS.success,
  REJECTED: COLORS.danger,
};

type HrStackParamList = {
    HrApplicationsList: { jobId: string };
    HrApplicationDetail: { applicationId: string };
};

const StatusFilter = ({ status, setStatus }: { status: string | undefined; setStatus: (s: string | undefined) => void }) => (
  <View style={styles.filterRow}>
    <TouchableOpacity
      key="ALL"
      style={[
        styles.filterBtn,
        !status && { backgroundColor: COLORS.primary + '22' },
      ]}
      onPress={() => setStatus(undefined)}
    >
      <Text
        style={{
          color: !status ? COLORS.primary : COLORS.gray[600],
          fontWeight: !status ? '700' : '400',
        }}
      >
        Tất cả
      </Text>
    </TouchableOpacity>
    {(Object.keys(APPLICATION_STATUS) as Array<keyof typeof APPLICATION_STATUS>).map((key) => (
      <TouchableOpacity
        key={key}
        style={[
          styles.filterBtn,
          status === key && { backgroundColor: (STATUS_COLORS[key] as string) + "22" },
        ]}
        onPress={() => setStatus(key)}
      >
        <Text
          style={{
            color: status === key ? (STATUS_COLORS[key] as string) : COLORS.gray[600],
            fontWeight: status === key ? "700" : "400",
          }}
        >
          {APPLICATION_STATUS[key]}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const HrApplicationsListScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HrStackParamList, 'HrApplicationsList'>>();
  const route = useRoute();
  const { jobId } = route.params as HrStackParamList["HrApplicationsList"];
  const [status, setStatus] = useState<string | undefined>(undefined); // undefined = all
  const [applications, setApplications] = useState<IApplication[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = status ? { status } : {};
      const res = await applicationService.getApplicationsByJob(jobId, params);
      setApplications(res.data.result || []);
    } catch {
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [jobId, status]);

  const renderItem = ({ item }: { item: IApplication }) => {
    // Defensive: user can be IUser or string (backend may return string id)
    const user = typeof item.userId === 'object' && item.userId !== null ? item.userId : undefined;
    const cv = typeof item.cvId === 'object' && item.cvId !== null ? item.cvId : undefined;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("HrApplicationDetail", { applicationId: item._id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{user?.name || "Ứng viên ẩn danh"}</Text>
          <Text style={[styles.status, { color: STATUS_COLORS[item.status] as string }]}> 
            {APPLICATION_STATUS[item.status as keyof typeof APPLICATION_STATUS]}
          </Text>
        </View>
        <Text style={styles.cardMeta}>Nộp vào: {new Date(item.createdAt).toLocaleDateString("vi-VN")}</Text>
        <Text style={styles.cardMeta}>CV: {cv?.title || "CV"}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusFilter status={status} setStatus={setStatus} />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={applications}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>Không có ứng viên</Text>}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
    rowGap: 6,
    columnGap: 4,
  },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 0,
    marginRight: 6,
    minWidth: 80,
    alignItems: 'center',
    marginBottom: 6,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    shadowColor: COLORS.gray[400],
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
    width: '100%',
    alignSelf: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 15,
    flexShrink: 1,
  },
  status: {
    fontWeight: '700',
    fontSize: 13,
  },
  cardMeta: {
    color: COLORS.gray[600],
    marginTop: 2,
    fontSize: 13,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: COLORS.gray[400],
    fontSize: 15,
  },
});

export default HrApplicationsListScreen;
