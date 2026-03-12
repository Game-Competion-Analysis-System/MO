import GameTitleSections from '@/components/GameTitleSelections';
import { container, headers, styleVariables } from '@/constants/styles';
import { apiGet, Game } from '@/services/api';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function GamesTab() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadGames() {
    try {
      setError(null);
      const data = await apiGet<Game[]>('/api/games');
      setGames(data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load games');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadGames(); }, []);

  return (
    <ScrollView
      contentContainerStyle={[container.padding, container.gap, { flexGrow: 1 }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); loadGames(); }}
        />
      }
    >
      <Text style={headers.h1}>Pick a game to analyze</Text>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={styleVariables.mainColor} />
          <Text style={headers.h4}>Loading games...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={loadGames}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : games.length === 0 ? (
        <View style={styles.centered}>
          <Text style={headers.h4}>No games available.</Text>
        </View>
      ) : (
        <GameTitleSections items={games} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  errorText: { color: '#EF4444', textAlign: 'center' },
  retryBtn: {
    backgroundColor: styleVariables.mainColor,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: { color: '#fff', fontWeight: 'bold' },
});
