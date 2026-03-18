import { styleVariables } from "@/constants/styles";
import { Stack, useLocalSearchParams } from "expo-router";

export default function GameLayout() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const gameName = decodeURIComponent(name ?? "");

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="airtest"
        options={{
          title: "Airtest Analysis",
          headerStyle: { backgroundColor: styleVariables.mainColor },
          headerTitleAlign: "center",
          headerTintColor: "#000",
        }}
      />
    </Stack>
  );
}
