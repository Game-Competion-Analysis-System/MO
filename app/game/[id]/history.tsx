import { container, headers } from "@/constants/styles";
import { FontAwesome6 } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
