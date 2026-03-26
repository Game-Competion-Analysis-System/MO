import { icons } from "@/constants/files";
import { styleVariables } from "@/constants/styles";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Redirect, Tabs, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

function HeaderTitle() {
  return (
    <View style={styles.header}>
      <Image source={icons.siteIcon} style={styles.icon} />
      <Text style={styles.title}>VLK Analyzer</Text>
    </View>
  );
}

export default function AppTabsLayout() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) {
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: styleVariables.mainColor },
        headerTitleAlign: "center",
        headerTitle: () => <HeaderTitle />,
        headerLeft: () => null,
        headerRight: () => (
          <View style={styles.headerRight}>
            <Pressable onPress={() => router.push("/profile" as any)}>
              <Ionicons name="person-circle-outline" size={26} color="#fff" />
            </Pressable>
            <Pressable onPress={logout}>
              <Ionicons name="log-out-outline" size={26} color="#fff" />
            </Pressable>
          </View>
        ),
        tabBarActiveTintColor: styleVariables.mainColor,
        tabBarInactiveTintColor: "#888",
        tabBarStyle: { backgroundColor: "#fff", borderTopColor: "#eee" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: "Games",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="game-controller" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="players"
        options={{
          title: "Players",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: "Leaderboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          href: user.role !== "admin" ? null : undefined,
          title: "Users",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shield-half" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  icon: { width: 24, height: 24 },
  title: { fontSize: 18, fontWeight: "600" },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingRight: 12,
  },
});
