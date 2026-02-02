import AnalysizesResult from "@/components/AnalysizesResult";
import { container, headers, styleVariables } from "@/constants/styles";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type AnalysisState = "idle" | "loading" | "complete";

const mockAnalysisResult = {
  topRankings: [
    {
      playerName: "Tiểu Tiên Nữ",
      tag: "Thiên Phong Thẩm",
      score: 9870,
    },
    {
      playerName: "Mộng Du Sinh",
      tag: "Thiên Âm",
      score: 9670,
    },
    {
      playerName: "Vân Trung Tuyết",
      tag: "Dương Minh",
      score: 9570,
    },
  ],
  activeEvents: [
    {
      eventName: "Festival of Warriors",
      endDate: "1/31/2024",
      status: "Active",
    },
    {
      eventName: "Guild Wars Season 5",
      endDate: "2/15/2024",
      status: "Active",
    },
    {
      eventName: "Lunar New Year Event",
      endDate: "2/10/2024",
      status: "Upcoming",
    },
  ],
  detectedPlayers: [
    {
      playerName: "Tiểu Tiên Nữ",
      level: 150,
      tag: "Thiên Phong Thẩm",
      status: "Online",
    },
    {
      playerName: "Mộng Du Sinh",
      level: 150,
      tag: "Thiên Âm",
      status: "Online",
    },
    {
      playerName: "Vân Trung Tuyết",
      level: 149,
      tag: "Dương Minh",
      status: "Online",
    },
  ],
};

export default function AnalysizesScreen() {
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setAnalysisState("loading");

      setTimeout(() => {
        setAnalysisState("complete");
      }, 2000);
    }
  };

  return (
    <ScrollView contentContainerStyle={[container.padding, container.gap]}>
      <Text style={headers.h1}>Upload Screenshot</Text>

      {analysisState === "idle" ? (
        <Pressable style={styles.fileSelector} onPress={pickImage}>
          <MaterialCommunityIcons
            name="lightning-bolt-outline"
            size={24}
            color="black"
          />
          <Text style={{ fontWeight: "bold" }}>
            Upload a screenshot to get started
          </Text>
          <Text style={[headers.h4, { textAlign: "center" }]}>
            Our AI will analyze rankings, events, and players in your image
          </Text>
        </Pressable>
      ) : (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: selectedImage! }}
            style={styles.selectedImage}
          />
          {analysisState === "loading" && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator
                size="large"
                color={styleVariables.mainColor}
              />
              <Text style={styles.loadingText}>Analyzing...</Text>
            </View>
          )}
        </View>
      )}

      {analysisState === "complete" && (
        <>
          <Pressable
            style={styles.uploadButton}
            onPress={() => {
              setAnalysisState("idle");
              setSelectedImage(null);
            }}
          >
            <Text style={styles.uploadButtonText}>Upload Different Image</Text>
          </Pressable>
          <AnalysizesResult
            topRankings={mockAnalysisResult.topRankings}
            activeEvents={mockAnalysisResult.activeEvents}
            detectedPlayers={mockAnalysisResult.detectedPlayers}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fileSelector: {
    width: "100%",
    height: 384,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: styleVariables.borderColor,
    paddingHorizontal: 20,
  },
  imageContainer: {
    width: "100%",
    height: 384,
    borderRadius: 8,
    overflow: "hidden",
  },
  selectedImage: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  uploadButton: {
    backgroundColor: styleVariables.mainColor,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    width: "100%",
  },
  uploadButtonText: {
    fontWeight: "bold",
    fontSize: 16,
  },
});
