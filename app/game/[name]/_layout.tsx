import { styleVariables } from "@/constants/styles";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Tabs, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable } from "react-native";

function BackButton() {
  const router = useRouter();
  const navigation = useNavigation();

  function handleBack() {
    const parent = navigation.getParent();
    if (parent?.canGoBack()) {
      parent.goBack();
    } else {
      router.replace("/dashboard" as any);
    }
  }

  return (
    <Pressable onPress={handleBack} style={{ paddingLeft: 10 }}>
      <Ionicons name="arrow-back" size={24} color="#000" />
    </Pressable>
  );
}

export default function GameTabsLayout() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const gameName = decodeURIComponent(name ?? '');

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: styleVariables.mainColor,
        },
        headerTitleAlign: "center",
        headerTitle: gameName,
        headerLeft: () => <BackButton />,
        tabBarActiveTintColor: styleVariables.mainColor,
        tabBarInactiveTintColor: "#888",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#eee",
        },
      }}
    >
      <Tabs.Screen
        name="analysis"
        options={{
          title: "Analysis",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analysizes"
        options={{
          title: "Analysizes",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cloud-upload" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
