import { icons } from "@/constants/files";
import { styleVariables } from "@/constants/styles";
import { Image } from "expo-image";
import { Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

function HeaderTitle() {
  return (
    <View style={styles.header}>
      <Image source={icons.siteIcon} style={styles.icon} />
      <Text style={styles.title}>VLK Analyzer</Text>
    </View>
  );
}

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleAlign: "center",
        headerStyle: {
          backgroundColor: styleVariables.mainColor,
        },
        headerTitle: () => HeaderTitle(),
      }}
    >
      <Stack.Screen name="index" options={{ title: "VLK Analyzer" }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  icon: {
    width: 24,
    height: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
});
