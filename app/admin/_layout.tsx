import { useAuth } from '@/context/AuthContext';
import { styleVariables } from '@/constants/styles';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs, useRouter } from 'expo-router';
import { Pressable } from 'react-native';

export default function AdminLayout() {
  const { user } = useAuth();
  const router = useRouter();

  if (!user || user.role !== 'admin') {
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: styleVariables.mainColor },
        headerTitleAlign: 'center',
        headerLeft: () => (
          <Pressable onPress={() => router.back()} style={{ paddingLeft: 10 }}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </Pressable>
        ),
        tabBarActiveTintColor: styleVariables.mainColor,
        tabBarInactiveTintColor: '#888',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#eee' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: 'Games',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="game-controller" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
