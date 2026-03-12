import { AuthProvider, useAuth } from '@/context/AuthContext';
import { icons } from '@/constants/files';
import { styleVariables } from '@/constants/styles';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

function HeaderTitle() {
  return (
    <View style={styles.header}>
      <Image source={icons.siteIcon} style={styles.icon} />
      <Text style={styles.title}>VLK Analyzer</Text>
    </View>
  );
}

function RootLayoutInner() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // index (/) and register are the only unauthenticated screens
  const inAuthScreen = !segments[0] || segments[0] === 'register';

  useEffect(() => {
    if (isLoading) return;
    if (!user && !inAuthScreen) {
      router.replace('/');
    } else if (user && inAuthScreen) {
      router.replace(user.role === 'admin' ? '/admin' : '/dashboard');
    }
  }, [user, isLoading, segments]);

  // Show spinner while loading auth state or while a redirect is in-flight
  if (isLoading || (!user && !inAuthScreen) || (!!user && inAuthScreen)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={styleVariables.mainColor} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: styleVariables.mainColor },
        headerTitle: () => <HeaderTitle />,
        headerRight: () => (
          <View style={styles.headerRight}>
            <Pressable onPress={() => router.push('/profile' as any)}>
              <Ionicons name="person-circle-outline" size={26} color="#000" />
            </Pressable>
            <Pressable onPress={logout}>
              <Ionicons name="log-out-outline" size={26} color="#000" />
            </Pressable>
          </View>
        ),
      }}
    >
      {/* Auth screens — no header */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />

      {/* App screens — use shared header above */}
      <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ title: 'My Profile' }} />
      <Stack.Screen name="game/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="admin" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutInner />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: { width: 24, height: 24 },
  title: { fontSize: 18, fontWeight: '600' },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingRight: 12,
  },
});
