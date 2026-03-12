import { container, headers, styleVariables } from '@/constants/styles';
import { apiDelete, apiGet, apiPost, apiPut, Company, Game } from '@/services/api';
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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface GameForm {
  gamename: string;
  genre: string;
  companyid: string;
}

const emptyForm: GameForm = { gamename: '', genre: '', companyid: '' };

export default function GamesScreen() {
  const [games, setGames] = useState<Game[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [form, setForm] = useState<GameForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [g, c] = await Promise.all([
        apiGet<Game[]>('/api/games'),
        apiGet<Company[]>('/api/companies'),
      ]);
      setGames(g || []);
      setCompanies(c || []);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditingGame(null);
    setForm(emptyForm);
    setModalVisible(true);
  }

  function openEdit(g: Game) {
    setEditingGame(g);
    setForm({ gamename: g.gamename, genre: g.genre, companyid: String(g.companyid) });
    setModalVisible(true);
  }

  async function saveGame() {
    if (!form.gamename.trim() || !form.genre.trim()) {
      Alert.alert('Error', 'Game name and genre are required');
      return;
    }
    const payload = {
      gamename: form.gamename.trim(),
      genre: form.genre.trim(),
      companyid: Number(form.companyid) || 1,
    };
    setSaving(true);
    try {
      if (editingGame) {
        const updated = await apiPut<Game>(`/api/games/${editingGame.gameid}`, payload, true);
        setGames((prev) => prev.map((g) => g.gameid === editingGame.gameid ? updated : g));
      } else {
        const created = await apiPost<Game>('/api/games', payload, true);
        setGames((prev) => [...prev, created]);
      }
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(g: Game) {
    Alert.alert('Delete Game', `Delete "${g.gamename}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiDelete(`/api/games/${g.gameid}`, true);
            setGames((prev) => prev.filter((x) => x.gameid !== g.gameid));
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
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
    <>
      <ScrollView
        contentContainerStyle={[container.padding, container.gap]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <View style={styles.headerRow}>
          <Text style={headers.h1}>Games ({games.length})</Text>
          <Pressable style={styles.addBtn} onPress={openCreate}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        </View>

        {games.map((g) => (
          <View key={g.gameid} style={styles.card}>
            <View style={styles.info}>
              <View style={styles.gameIcon}>
                <Ionicons name="game-controller" size={24} color={styleVariables.mainColor} />
              </View>
              <View>
                <Text style={headers.h3}>{g.gamename}</Text>
                <Text style={headers.h4}>{g.genre}</Text>
                <Text style={headers.h4}>Company ID: {g.companyid}</Text>
              </View>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => openEdit(g)} style={styles.iconBtn}>
                <Ionicons name="pencil-outline" size={20} color="#2563EB" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelete(g)} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {games.length === 0 && <Text style={headers.h4}>No games found.</Text>}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={headers.h2}>{editingGame ? 'Edit Game' : 'New Game'}</Text>
            <Pressable onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#000" />
            </Pressable>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Game Name"
            placeholderTextColor="#aaa"
            value={form.gamename}
            onChangeText={(v) => setForm((f) => ({ ...f, gamename: v }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Genre (e.g. MMORPG)"
            placeholderTextColor="#aaa"
            value={form.genre}
            onChangeText={(v) => setForm((f) => ({ ...f, genre: v }))}
          />

          <Text style={[headers.h4, { marginBottom: 4 }]}>Select Company:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {companies.map((c) => (
              <Pressable
                key={c.companyid}
                style={[
                  styles.companyChip,
                  form.companyid === String(c.companyid) && styles.companyChipSelected,
                ]}
                onPress={() => setForm((f) => ({ ...f, companyid: String(c.companyid) }))}
              >
                <Text
                  style={[
                    styles.companyChipText,
                    form.companyid === String(c.companyid) && styles.companyChipTextSelected,
                  ]}
                >
                  {c.companyname}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable style={styles.saveBtn} onPress={saveGame} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>{editingGame ? 'Save Changes' : 'Create Game'}</Text>
            )}
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: styleVariables.mainColor,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontWeight: 'bold' },
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
  info: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gameIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#E0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 6 },
  modal: {
    flex: 1,
    padding: 24,
    paddingTop: 48,
    backgroundColor: '#fff',
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: styleVariables.borderColor,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  companyChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: styleVariables.borderColor,
    marginRight: 8,
    backgroundColor: '#f9f9f9',
  },
  companyChipSelected: {
    backgroundColor: styleVariables.mainColor,
    borderColor: styleVariables.mainColor,
  },
  companyChipText: { color: '#333', fontSize: 14 },
  companyChipTextSelected: { color: '#fff', fontWeight: 'bold' },
  saveBtn: {
    backgroundColor: styleVariables.mainColor,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
