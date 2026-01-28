import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  useWindowDimensions,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SIZES } from "../../constants";
import { Button, Loading, CVCard } from "../../components";
import RenderHTML from "react-native-render-html";
import { jobService } from "../../services/jobService";
import { userCVService } from "../../services/userCVService";
import { applicationService } from "../../services/applicationService";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { IJob, IUserCV } from "../../types";

type JobDetailScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "JobDetail">;
  route: RouteProp<RootStackParamList, "JobDetail">;
};

const JobDetailScreen: React.FC<JobDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { width } = useWindowDimensions();
  const { jobId } = route.params;

  const [job, setJob] = useState<IJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [cvs, setCvs] = useState<IUserCV[]>([]);
  const [selectedCV, setSelectedCV] = useState<IUserCV | null>(null);
  const [loadingCVs, setLoadingCVs] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    loadJob();
  }, [jobId]);

  const loadJob = async () => {
    try {
      const response = await jobService.getJobById(jobId);
      setJob(response.data);
    } catch (error) {
      console.error("Failed to load job:", error);
      Alert.alert("Lỗi", "Không thể tải thông tin việc làm");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadCVs = async () => {
    setLoadingCVs(true);
    try {
      const response = await userCVService.getMyCVs();
      const userCvs = response.data || [];
      setCvs(userCvs);
      // Auto-select primary CV
      const primaryCV = userCvs.find((cv: IUserCV) => cv.isPrimary);
      if (primaryCV) setSelectedCV(primaryCV);
    } catch (error) {
      console.error("Failed to load CVs:", error);
    } finally {
      setLoadingCVs(false);
    }
  };

  const handleOpenApplyModal = () => {
    setShowApplyModal(true);
    loadCVs();
  };

  const handleApply = async () => {
    if (!selectedCV) {
      Alert.alert("Thông báo", "Vui lòng chọn CV để ứng tuyển");
      return;
    }

    if (!job) return;

    setApplying(true);
    try {
      await applicationService.apply({
        jobId: jobId,
        cvId: selectedCV._id,
        companyId:
          typeof job.company === "string" ? job.company : job.company._id,
      });
      Alert.alert("Thành công", "Ứng tuyển thành công!", [
        {
          text: "OK",
          onPress: () => {
            setShowApplyModal(false);
            navigation.navigate("MyApplications" as any);
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể ứng tuyển",
      );
    } finally {
      setApplying(false);
    }
  };

  const formatSalary = (salary: string | number) => {
    if (salary === null || salary === undefined) return "";
    let num: number;
    if (typeof salary === "string") {
      num = parseInt(salary.replace(/\D/g, ""), 10);
    } else {
      num = Number(salary);
    }
    if (isNaN(num)) return String(salary);
    return new Intl.NumberFormat("vi-VN").format(num);
  };

  if (loading) {
    return <Loading fullScreen text="Đang tải..." />;
  }

  if (!job) {
    return null;
  }

  const company = typeof job.company === "object" ? job.company : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Company Header */}
        <View style={styles.header}>
          <Image
            source={{ uri: company?.logo || "https://via.placeholder.com/80" }}
            style={styles.companyLogo}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.jobTitle}>{job.name}</Text>
            <TouchableOpacity
              onPress={() =>
                company &&
                navigation.navigate("CompanyDetail", { companyId: company._id })
              }
            >
              <Text style={styles.companyName}>
                {company?.name || "Công ty"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Job Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons
                name="location-outline"
                size={20}
                color={COLORS.gray[500]}
              />
              <Text style={styles.infoText}>{job.location}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons
                name="briefcase-outline"
                size={20}
                color={COLORS.gray[500]}
              />
              <Text style={styles.infoText}>{job.level}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons
                name="cash-outline"
                size={20}
                color={COLORS.gray[500]}
              />
              <Text style={styles.infoText}>
                {formatSalary(job.salary)} VND
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons
                name="people-outline"
                size={20}
                color={COLORS.gray[500]}
              />
              <Text style={styles.infoText}>{job.quantity} vị trí</Text>
            </View>
          </View>
        </View>

        {/* Skills */}
        {job.skills && job.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kỹ năng yêu cầu</Text>
            <View style={styles.skills}>
              {job.skills.map((skill, index) => (
                <View key={index} style={styles.skillTag}>
                  <Text style={styles.skillText}>
                    {typeof skill === "string" ? skill : skill.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mô tả công việc</Text>
          {job.description ? (
            <RenderHTML
              contentWidth={width - 2 * SIZES.padding}
              source={{ html: job.description }}
              baseStyle={styles.description}
              tagsStyles={{
                p: { marginBottom: 8 },
                h1: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
                h2: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
              }}
            />
          ) : (
            <Text style={styles.description}>Không có mô tả</Text>
          )}
        </View>

        {/* Deadline */}
        <View style={styles.section}>
          <View style={styles.deadlineRow}>
            <Ionicons
              name="calendar-outline"
              size={20}
              color={COLORS.warning}
            />
            <Text style={styles.deadlineText}>
              Hạn nộp: {new Date(job.endDate).toLocaleDateString("vi-VN")}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Apply Button */}
      {job.isActive && (
        <View style={styles.footer}>
          <Button title="Ứng tuyển ngay" onPress={handleOpenApplyModal} />
        </View>
      )}

      {/* Apply Modal */}
      <Modal
        visible={showApplyModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowApplyModal(false)}>
              <Ionicons name="close" size={28} color={COLORS.gray[700]} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Chọn CV ứng tuyển</Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.modalContent}>
            {loadingCVs ? (
              <Loading text="Đang tải CV..." />
            ) : cvs.length === 0 ? (
              <View style={styles.noCVContainer}>
                <Ionicons
                  name="document-text-outline"
                  size={64}
                  color={COLORS.gray[300]}
                />
                <Text style={styles.noCVText}>Bạn chưa có CV nào</Text>
                <Button
                  title="Tải lên CV"
                  variant="outline"
                  onPress={() => {
                    setShowApplyModal(false);
                    navigation.navigate("MyCVs" as any);
                  }}
                />
              </View>
            ) : (
              <FlatList
                data={cvs}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.cvItem,
                      selectedCV?._id === item._id && styles.cvItemSelected,
                    ]}
                    onPress={() => setSelectedCV(item)}
                  >
                    <CVCard
                      cv={item}
                      onPress={() => setSelectedCV(item)}
                      showActions={false}
                    />
                    {selectedCV?._id === item._id && (
                      <View style={styles.checkMark}>
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color={COLORS.success}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>

          {cvs.length > 0 && (
            <View style={styles.modalFooter}>
              <Button
                title="Xác nhận ứng tuyển"
                onPress={handleApply}
                loading={applying}
                disabled={!selectedCV}
              />
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
  },
  companyLogo: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: COLORS.gray[100],
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.gray[800],
    marginBottom: 4,
  },
  companyName: {
    fontSize: SIZES.md,
    color: COLORS.primary,
    fontWeight: "500",
  },
  infoSection: {
    backgroundColor: COLORS.white,
    padding: SIZES.padding,
    marginTop: 8,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  infoItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: SIZES.sm,
    color: COLORS.gray[600],
  },
  section: {
    backgroundColor: COLORS.white,
    padding: SIZES.padding,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    fontWeight: "600",
    color: COLORS.gray[800],
    marginBottom: 12,
  },
  skills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillTag: {
    backgroundColor: COLORS.primary + "15",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  skillText: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    fontWeight: "500",
  },
  description: {
    fontSize: SIZES.md,
    color: COLORS.gray[700],
    lineHeight: 24,
  },
  deadlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deadlineText: {
    fontSize: SIZES.md,
    color: COLORS.warning,
    fontWeight: "500",
  },
  footer: {
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SIZES.padding,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  modalTitle: {
    fontSize: SIZES.lg,
    fontWeight: "600",
    color: COLORS.gray[800],
  },
  modalContent: {
    flex: 1,
    padding: SIZES.padding,
  },
  noCVContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  noCVText: {
    fontSize: SIZES.md,
    color: COLORS.gray[500],
  },
  cvItem: {
    position: "relative",
    borderRadius: SIZES.radius,
    borderWidth: 2,
    borderColor: "transparent",
    marginBottom: 4,
  },
  cvItemSelected: {
    borderColor: COLORS.success,
  },
  checkMark: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  modalFooter: {
    padding: SIZES.padding,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
});

export default JobDetailScreen;
