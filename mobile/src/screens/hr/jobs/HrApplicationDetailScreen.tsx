import React, { useEffect, useState } from "react";
import ImageViewing from "react-native-image-viewing";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { APPLICATION_STATUS, COLORS } from "../../../constants";
import { applicationService } from "../../../services/applicationService";
import { IApplication, ICompany, IJob, IUser } from "../../../types";
import { useRoute, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "node_modules/@react-navigation/native-stack/lib/typescript/src/types";

const STATUS_COLORS = {
  PENDING: COLORS.warning,
  REVIEWING: COLORS.info,
  APPROVED: COLORS.success,
  REJECTED: COLORS.danger,
};

type HrStackParamList = {
  HrApplicationDetail: { applicationId: string };
  InterviewInvite: {
    user: IUser | undefined;
    job: IJob | undefined;
    company: ICompany | undefined;
    email: string;
  };
};

const HrApplicationDetailScreen: React.FC = () => {
  const route = useRoute();
  const { applicationId } =
    route.params as HrStackParamList["HrApplicationDetail"];
  const [application, setApplication] = useState<IApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [cvPreviewVisible, setCvPreviewVisible] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<HrStackParamList>>();

  const load = async () => {
    setLoading(true);
    try {
      const res = await applicationService.getApplicationById(applicationId);
      setApplication(res.data);
    } catch (error) {
      Alert.alert("Lỗi", "Không thể tải thông tin ứng viên");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [applicationId]);

  const handleUpdateStatus = (status: string) => {
    if (!application) return;
    const statusLabel = APPLICATION_STATUS[status as keyof typeof APPLICATION_STATUS] || status;
    Alert.alert(
      'Xác nhận',
      `Bạn có chắc chắn muốn chuyển trạng thái CV này sang "${statusLabel}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đồng ý',
          style: 'default',
          onPress: async () => {
            await doUpdateStatus(status);
          },
        },
      ]
    );
  };

  const doUpdateStatus = async (status: string) => {
    setUpdating(true);
    try {
      await applicationService.updateApplicationStatus(
        application!._id,
        status,
      );
      await load();
      Alert.alert(
        "Thành công",
        "Cập nhật trạng thái thành công",
        [
          {
            text: 'OK',
            onPress: () => {
              if (status === 'REVIEWING') {
                Alert.alert(
                  "Gửi thư mời phỏng vấn",
                  "Bạn có muốn gửi thư mời phỏng vấn tới ứng viên này không?",
                  [
                    { text: "Không", style: "cancel" },
                    {
                      text: "Có",
                      style: "default",
                      onPress: () => {
                        navigation.navigate("InterviewInvite", {
                          user:
                            typeof application?.userId === "object"
                              ? application.userId
                              : undefined,
                          job:
                            typeof application?.jobId === "object"
                              ? application.jobId
                              : undefined,
                          company:
                            typeof application?.companyId === "object"
                              ? application.companyId
                              : undefined,
                          email:
                            typeof application?.userId === "object" && application.userId
                              ? application.userId.email
                              : "",
                        });
                      },
                    },
                  ]
                );
              }
            }
          }
        ]
      );
    } catch {
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 32 }} />;
  if (!application) return null;

  const user =
    typeof application.userId === "object" && application.userId !== null
      ? application.userId
      : undefined;
  const cv =
    typeof application.cvId === "object" && application.cvId !== null
      ? application.cvId
      : undefined;
  const job =
    typeof application.jobId === "object" && application.jobId !== null
      ? application.jobId
      : undefined;

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: 16 }}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{user?.name || "Ứng viên ẩn danh"}</Text>
          <Text style={styles.meta}>Email: {user?.email || "-"}</Text>
          <Text style={styles.meta}>
            Nộp vào:{" "}
            {new Date(application.createdAt).toLocaleDateString("vi-VN")}
          </Text>
          <Text style={styles.meta}>CV: {cv?.title || "CV"}</Text>
          {cv?.url &&
          (cv.url.endsWith(".jpg") ||
            cv.url.endsWith(".jpeg") ||
            cv.url.endsWith(".png") ||
            cv.url.endsWith(".webp")) ? (
            <TouchableOpacity
              style={styles.cvBtn}
              onPress={() => setCvPreviewVisible(true)}
            >
              <Text style={{ color: COLORS.primary, fontWeight: "700" }}>
                Xem CV
              </Text>
            </TouchableOpacity>
          ) : cv?.url ? (
            <TouchableOpacity
              style={styles.cvBtn}
              onPress={() => Linking.openURL(cv.url)}
            >
              <Text style={{ color: COLORS.primary, fontWeight: "700" }}>
                Xem CV
              </Text>
            </TouchableOpacity>
          ) : null}
          <Text
            style={[
              styles.status,
              {
                color:
                  STATUS_COLORS[
                    application.status as keyof typeof APPLICATION_STATUS
                  ],
              },
            ]}
          >
            Trạng thái:{" "}
            {
              APPLICATION_STATUS[
                application.status as keyof typeof APPLICATION_STATUS
              ]
            }
          </Text>
        </View>
        <View style={styles.statusRow}>
          {(
            Object.keys(APPLICATION_STATUS) as Array<
              keyof typeof APPLICATION_STATUS
            >
          ).map((key) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.statusBtn,
                application.status === key && {
                  backgroundColor: (STATUS_COLORS[key] as string) + "22",
                },
              ]}
              disabled={updating || application.status === key}
              onPress={() => handleUpdateStatus(key)}
            >
              <Text
                style={{
                  color: STATUS_COLORS[key] as string,
                  fontWeight: "700",
                }}
              >
                {APPLICATION_STATUS[key]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tiến trình</Text>
          {application.history && application.history.length > 0 ? (
            application.history.map((h, idx) => (
              <View
                key={idx}
                style={[
                  styles.historyItem,
                  idx !== application.history.length - 1 &&
                    styles.historyItemBorder,
                ]}
              >
                <Text style={styles.historyLabel}>Cập nhật lúc:</Text>
                <Text style={styles.historyValue}>
                  {new Date(h.updatedAt).toLocaleString("vi-VN")}
                </Text>
                <Text style={styles.historyLabel}>Trạng thái:</Text>
                <Text
                  style={[
                    styles.historyValue,
                    {
                      color:
                        STATUS_COLORS[h.status as keyof typeof STATUS_COLORS],
                      fontWeight: "700",
                    },
                  ]}
                >
                  {APPLICATION_STATUS[
                    h.status as keyof typeof APPLICATION_STATUS
                  ] || h.status}
                </Text>
                <Text style={styles.historyLabel}>Bởi:</Text>
                <Text style={styles.historyValue}>
                  {h.updatedBy?.email || "-"}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ color: COLORS.gray[500] }}>Chưa có tiến trình</Text>
          )}
        </View>
      </ScrollView>
      {cv?.url &&
        (cv.url.endsWith(".jpg") ||
          cv.url.endsWith(".jpeg") ||
          cv.url.endsWith(".png") ||
          cv.url.endsWith(".webp")) && (
          <ImageViewing
            images={[{ uri: cv.url }]}
            imageIndex={0}
            visible={cvPreviewVisible}
            onRequestClose={() => setCvPreviewVisible(false)}
            presentationStyle="fullScreen"
          />
        )}
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.gray[400],
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: { fontWeight: "700", fontSize: 20, marginBottom: 8 },
  meta: { color: COLORS.gray[700], marginBottom: 4 },
  status: { fontWeight: "700", marginTop: 8 },
  cvBtn: {
    marginTop: 4,
    marginBottom: 8,
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: COLORS.gray[100],
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    marginBottom: 16,
    backgroundColor: COLORS.white,
    padding: 8,
    borderRadius: 8,
    rowGap: 8,
    columnGap: 6,
  },
  statusBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginHorizontal: 0,
    marginRight: 8,
    minWidth: 110,
    alignItems: "center",
    marginBottom: 8,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  sectionTitle: { fontWeight: "700", marginBottom: 8 },
  historyItem: {
    paddingVertical: 10,
    marginBottom: 0,
  },
  historyItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  historyLabel: {
    color: COLORS.gray[500],
    fontSize: 13,
    marginTop: 2,
  },
  historyValue: {
    color: COLORS.gray[800],
    fontSize: 15,
    marginBottom: 2,
  },
});

export default HrApplicationDetailScreen;
