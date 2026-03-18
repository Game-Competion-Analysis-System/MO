import { useAuth } from "@/context/AuthContext";
import { Redirect, Stack } from "expo-router";

export default function DashboardLayout() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect href="/" />;
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="game/[name]" options={{ headerShown: false }} />
    </Stack>
  );
}
