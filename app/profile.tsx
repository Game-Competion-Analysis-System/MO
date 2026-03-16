import { useAuth } from '@/context/AuthContext';
import { container, headers, styleVariables } from '@/constants/styles';
import { apiGet, apiPut, User } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function ProfileScreen() {
  const { user: authUser, logout } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const data = await apiGet<User>('/api/users/profile', true);
      setProfile(data);
      setUsername(data.username ?? '');
      setEmail(data.email ?? '');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!username.trim() || !email.trim()) {
      Alert.alert('Error', 'Username and email are required');
      return;
    }

    setSaving(true);
    try {
      await apiPut<{ message: string }>('/api/users/profile', {
        username: username.trim(),
        email: email.trim(),
      }, true);
      setProfile((prev) => prev ? { ...prev, username: username.trim(), email: email.trim() } : prev);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  function confirmLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={styleVariables.mainColor} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={[container.padding, container.gap]}>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: authUser?.role === 'admin' ? '#7C3AED' : styleVariables.mainColor }]}>
            <Text style={styles.avatarText}>
              {(username[0] ?? '?').toUpperCase()}
            </Text>
          </View>
          <Text style={headers.h2}>{profile?.username}</Text>
          <View style={[styles.roleBadge, authUser?.role === 'admin' ? styles.roleBadgeAdmin : styles.roleBadgeUser]}>
            <Text style={[styles.roleBadgeText, authUser?.role === 'admin' ? styles.roleBadgeAdminText : styles.roleBadgeUserText]}>
              {authUser?.role ?? 'user'}
            </Text>
          </View>
        </View>

        {/* Edit form */}
        <Text style={headers.h2}>Edit Profile</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            placeholder="Username"
            placeholderTextColor="#aaa"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email"
            placeholderTextColor="#aaa"
          />
        </View>

        <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </Pressable>

        {/* Logout */}
        <Pressable style={styles.logoutBtn} onPress={confirmLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  roleBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleBadgeAdmin: { backgroundColor: '#EDE9FE' },
  roleBadgeUser: { backgroundColor: '#E0FDF4' },
  roleBadgeText: { fontSize: 13, fontWeight: '600' },
  roleBadgeAdminText: { color: '#7C3AED' },
  roleBadgeUserText: { color: '#065F46' },
  fieldGroup: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: styleVariables.unHighlightTextColor,
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: styleVariables.borderColor,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  saveBtn: {
    backgroundColor: styleVariables.mainColor,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  logoutText: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
