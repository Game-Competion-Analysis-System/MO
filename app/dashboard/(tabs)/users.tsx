import { container, headers, styleVariables } from '@/constants/styles';
import { useAuth } from '@/context/AuthContext';
import { apiCreateUser, apiDelete, apiGetAllPaged, User } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function UsersScreen() {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return <Redirect href="/dashboard" />;
  }

  return <UsersContent />;
}

function UsersContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  async function load() {
    try {
      const data = await apiGetAllPaged<User>('/api/users', true);
      setUsers(data || []);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openProfile(u: User) {
    setSelectedUser(u);
    setConfirmingDelete(false);
  }

  function closeModal() {
    setSelectedUser(null);
    setConfirmingDelete(false);
  }

  async function handleDelete() {
    if (!selectedUser) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/users/${selectedUser.userId}`, true);
      setUsers((prev) => prev.filter((x) => x.userId !== selectedUser.userId));
      closeModal();
    } catch (e: any) {
      setConfirmingDelete(false);
      Alert.alert('Delete Failed', e.message);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={styleVariables.mainColor} />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={[container.padding, container.gap]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
          />
        }
      >
        <View style={styles.listHeader}>
          <Text style={headers.h1}>Users ({users.length})</Text>
          <Pressable style={styles.createBtn} onPress={() => setCreateModalVisible(true)}>
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>

        {users.map((u) => (
          <TouchableOpacity
            key={u.userId}
            style={styles.card}
            onPress={() => openProfile(u)}
            activeOpacity={0.75}
          >
            <View style={styles.info}>
              <View style={[styles.avatar, {
                backgroundColor: u.role === 'admin' ? styleVariables.mainColor : '#9333EA',
              }]}>
                <Text style={styles.avatarText}>
                  {(u.username?.[0] ?? '?').toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={headers.h3}>{u.username}</Text>
                <Text style={headers.h4}>{u.email}</Text>
                <View style={[styles.badge, u.role === 'admin' ? styles.badgeAdmin : styles.badgeUser]}>
                  <Text style={[styles.badgeText, u.role === 'admin' ? styles.badgeAdminText : styles.badgeUserText]}>
                    {u.role}
                  </Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={styleVariables.unHighlightTextColor} />
          </TouchableOpacity>
        ))}

        {users.length === 0 && <Text style={headers.h4}>No users found.</Text>}
      </ScrollView>

      <Modal
        visible={selectedUser !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        {selectedUser && (
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={headers.h2}>User Profile</Text>
              <Pressable onPress={closeModal}>
                <Ionicons name="close" size={26} color="#000" />
              </Pressable>
            </View>

            <View style={styles.profileAvatar}>
              <View style={[
                styles.avatarLarge,
                { backgroundColor: selectedUser.role === 'admin' ? styleVariables.mainColor : '#9333EA' },
              ]}>
                <Text style={styles.avatarLargeText}>
                  {(selectedUser.username?.[0] ?? '?').toUpperCase()}
                </Text>
              </View>
              <Text style={headers.h2}>{selectedUser.username}</Text>
              <View style={[styles.badge, selectedUser.role === 'admin' ? styles.badgeAdmin : styles.badgeUser]}>
                <Text style={[styles.badgeText, selectedUser.role === 'admin' ? styles.badgeAdminText : styles.badgeUserText]}>
                  {selectedUser.role}
                </Text>
              </View>
            </View>

            <View style={styles.detailsSection}>
              <ProfileRow icon="person-outline" label="Username" value={selectedUser.username} />
              <ProfileRow icon="mail-outline" label="Email" value={selectedUser.email} />
              <ProfileRow icon="key-outline" label="User ID" value={`#${selectedUser.userId}`} />
              <ProfileRow
                icon="shield-outline"
                label="Role"
                value={selectedUser.role === 'admin' ? 'Administrator' : 'Standard User'}
              />
            </View>

            {!confirmingDelete ? (
              <Pressable
                style={styles.deleteBtn}
                onPress={() => setConfirmingDelete(true)}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                <Text style={styles.deleteBtnText}>Delete This User</Text>
              </Pressable>
            ) : (
              <View style={styles.confirmBox}>
                <Text style={styles.confirmTitle}>Are you sure?</Text>
                <Text style={styles.confirmSub}>
                  This will permanently delete <Text style={{ fontWeight: 'bold' }}>{selectedUser.username}</Text>.
                  {'\n'}This action cannot be undone.
                </Text>
                <View style={styles.confirmActions}>
                  <Pressable
                    style={styles.cancelBtn}
                    onPress={() => setConfirmingDelete(false)}
                    disabled={deleting}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.confirmDeleteBtn, deleting && { opacity: 0.6 }]}
                    onPress={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.confirmDeleteBtnText}>Yes, Delete</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}
      </Modal>

      <CreateUserModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={() => { setCreateModalVisible(false); load(); }}
      />
    </>
  );
}

function ProfileRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string | null;
}) {
  return (
    <View style={styles.profileRow}>
      <View style={styles.profileRowIcon}>
        <Ionicons name={icon} size={18} color={styleVariables.mainColor} />
      </View>
      <View>
        <Text style={styles.profileRowLabel}>{label}</Text>
        <Text style={styles.profileRowValue}>{value ?? '—'}</Text>
      </View>
    </View>
  );
}

const ROLES = ['user', 'admin'] as const;
type Role = (typeof ROLES)[number];

function CreateUserModal({
  visible,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [username, setUsername]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [role, setRole]           = useState<Role>('user');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  function reset() {
    setUsername('');
    setEmail('');
    setPassword('');
    setRole('user');
    setError(null);
    setSubmitting(false);
  }

  function handleClose() { reset(); onClose(); }

  async function handleSubmit() {
    if (!username.trim() || !email.trim() || !password.trim()) {
      setError('All fields are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiCreateUser({ username: username.trim(), email: email.trim(), password, role });
      reset();
      onSuccess();
    } catch (e: any) {
      setError(e.message || 'Failed to create user.');
      setSubmitting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={headers.h2}>Create User</Text>
            <Pressable onPress={handleClose}>
              <Ionicons name="close" size={26} color="#000" />
            </Pressable>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Username</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Enter username"
              placeholderTextColor="#aaa"
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
              editable={!submitting}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Enter email address"
              placeholderTextColor="#aaa"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!submitting}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Password</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Enter password"
              placeholderTextColor="#aaa"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!submitting}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Role</Text>
            <View style={styles.roleRow}>
              {ROLES.map((r) => (
                <Pressable
                  key={r}
                  style={[styles.roleChip, role === r && styles.roleChipActive]}
                  onPress={() => setRole(r)}
                  disabled={submitting}
                >
                  <Text style={[styles.roleChipText, role === r && styles.roleChipTextActive]}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {error && <Text style={styles.inlineError}>{error}</Text>}

          <Pressable
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Create User</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: styleVariables.borderColor,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  badgeAdmin: { backgroundColor: '#D1FAE5' },
  badgeUser: { backgroundColor: '#EDE9FE' },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  badgeAdminText: { color: '#065F46' },
  badgeUserText: { color: '#4C1D95' },
  modal: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    paddingTop: 48,
    gap: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileAvatar: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLargeText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  detailsSection: {
    borderWidth: 1,
    borderColor: styleVariables.borderColor,
    borderRadius: 14,
    overflow: 'hidden',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: styleVariables.borderColor,
    backgroundColor: '#fafafa',
  },
  profileRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileRowLabel: { fontSize: 12, color: styleVariables.unHighlightTextColor },
  profileRowValue: { fontSize: 15, fontWeight: '600', marginTop: 1 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    marginTop: 'auto',
  },
  deleteBtnText: { color: '#EF4444', fontWeight: 'bold', fontSize: 16 },
  confirmBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    padding: 16,
    gap: 10,
    marginTop: 'auto',
  },
  confirmTitle: { fontWeight: 'bold', fontSize: 16, color: '#EF4444' },
  confirmSub: { fontSize: 14, color: '#7E6B67', lineHeight: 20 },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  cancelBtnText: { fontWeight: 'bold', color: '#333' },
  confirmDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#EF4444',
  },
  confirmDeleteBtnText: { fontWeight: 'bold', color: '#fff' },

  // Create user
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: styleVariables.mainColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#444' },
  fieldInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: styleVariables.borderColor,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: '#fafafa',
  },
  roleRow: { flexDirection: 'row', gap: 10 },
  roleChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: styleVariables.borderColor,
    backgroundColor: '#f9f9f9',
  },
  roleChipActive: {
    backgroundColor: styleVariables.mainColor,
    borderColor: styleVariables.mainColor,
  },
  roleChipText: { fontWeight: '600', color: '#555' },
  roleChipTextActive: { color: '#fff' },
  inlineError: { color: '#EF4444', fontSize: 13 },
  submitBtn: {
    backgroundColor: styleVariables.mainColor,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
