import HistorySections from "@/components/HistorySections";
import { container, headers } from "@/constants/styles";
import { FontAwesome6 } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

const historySections = [
  {
    createdAtDate: "Dec 15, 2024",
    createdAtTime: "14:32",
    percentage: "99.8 %",
    time: "0.8 s",
    topPlayerName: "Tiểu Tiên Nữ",
    eventName: "Year-End Festival",
  },
  {
    createdAtDate: "Dec 14, 2024",
    createdAtTime: "11:15",
    percentage: "99.6 %",
    time: "0.9 s",
    topPlayerName: "Mộng Du Sinh",
    eventName: "Guild Wars Season 6",
  },
  {
    createdAtDate: "Dec 10, 2024",
    createdAtTime: "10:22",
    percentage: "99.0 %",
    time: "1.2 s",
    topPlayerName: "Vân Trung Tuyết",
    eventName: "Thanksgiving Event",
  },
];

export default function HistoryScreen() {
  return (
    <View style={[container.padding, container.gap]}>
      <View
        style={[container.rowContainer, { justifyContent: "space-between" }]}
      >
        <Text style={headers.h1}>Analysis History</Text>
        <Pressable
          style={[
            styles.button,
            styles.buttonUnHighlight,
            container.rowContainer,
          ]}
        >
          <Text>All (3)</Text>
          <FontAwesome6 name="arrow-down-short-wide" size={18} color="black" />
        </Pressable>
      </View>
      <HistorySections historySections={historySections} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonUnHighlight: {
    backgroundColor: "#DED5D3",
  },
});
