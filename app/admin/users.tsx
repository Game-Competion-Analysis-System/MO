import { container, headers, styleVariables } from '@/constants/styles';
import { apiDelete, apiGet, User } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function UsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    try {
      const data = await apiGet<User[]>('/api/users', true);
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
      await apiDelete(`/api/users/${selectedUser.userid}`, true);
      setUsers((prev) => prev.filter((x) => x.userid !== selectedUser.userid));
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
        <Text style={headers.h1}>Users ({users.length})</Text>

        {users.map((u) => (
          <TouchableOpacity
            key={u.userid}
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

      {/* User Profile Modal */}
      <Modal
        visible={selectedUser !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        {selectedUser && (
          <View style={styles.modal}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={headers.h2}>User Profile</Text>
              <Pressable onPress={closeModal}>
                <Ionicons name="close" size={26} color="#000" />
              </Pressable>
            </View>

            {/* Avatar + name */}
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

            {/* Detail rows */}
            <View style={styles.detailsSection}>
              <ProfileRow icon="person-outline" label="Username" value={selectedUser.username} />
              <ProfileRow icon="mail-outline" label="Email" value={selectedUser.email} />
              <ProfileRow icon="key-outline" label="User ID" value={`#${selectedUser.userid}`} />
              <ProfileRow
                icon="shield-outline"
                label="Role"
                value={selectedUser.role === 'admin' ? 'Administrator' : 'Standard User'}
              />
            </View>

            {/* Delete section */}
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

  // Modal
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

  // Delete
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

  // Inline confirmation
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
});
