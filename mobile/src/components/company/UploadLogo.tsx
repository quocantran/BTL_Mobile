import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export const UploadLogo = ({
  uri,
  onPress,
  loading,
}: {
  uri?: string;
  onPress: () => void;
  loading?: boolean;
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      disabled={loading}
      style={styles.uploadBox}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.uploadImage} />
      ) : (
        <View style={styles.uploadPlaceholder}>
          {!loading && <Ionicons name="cloud-upload-outline" size={28} color="#999" />}
          <View style={styles.uploadTextRow}>
          <Text style={styles.uploadText}>{loading ? "Uploading..." : "Upload logo"}</Text>
            {loading && (
              <View style={styles.loadingIndicator}>
                <ActivityIndicator size="small" color="#999" style={{ marginLeft: 6 }} />
              </View>
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  uploadBox: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#d9d9d9",
    backgroundColor: "#fafafa",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  uploadPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },

  uploadTextRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  uploadText: {
    fontSize: 13,
    color: "#999",
  },

  loadingIndicator: {
    marginLeft: 4,
    justifyContent: "center",
    alignItems: "center",
  },

  uploadImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
});