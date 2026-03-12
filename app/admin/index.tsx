import { useAuth } from '@/context/AuthContext';
import { container, headers, styleVariables } from '@/constants/styles';
import { apiGet, AiAnalysis, Game, User } from '@/services/api';
import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [analyses, setAnalyses] = useState<AiAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const [u, g, a] = await Promise.all([
        apiGet<User[]>('/api/users', true),
        apiGet<Game[]>('/api/games'),
        apiGet<AiAnalysis[]>('/api/ai/history', true),
      ]);
      setUsers(u || []);
      setGames(g || []);
      setAnalyses(a || []);
    } catch {
      // silently fail individual stats
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={styleVariables.mainColor} />
      </View>
    );
  }

  const avgAccuracy = analyses.length
    ? (analyses.reduce((s, a) => s + (a.confidencescore || 0), 0) / analyses.length * 100).toFixed(1)
    : '—';

  return (
    <ScrollView
      contentContainerStyle={[container.padding, container.gap]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      <View>
        <Text style={headers.h1}>Admin Dashboard</Text>
        <Text style={[headers.h4, { marginBottom: 4 }]}>Welcome, {user?.username}</Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Total Users" value={String(users.length)} color="#9333EA" />
        <StatCard label="Total Games" value={String(games.length)} color="#22C55E" />
        <StatCard label="Total Analyses" value={String(analyses.length)} color="#2563EB" />
        <StatCard label="Avg. Accuracy" value={analyses.length ? `${avgAccuracy}%` : '—'} color="#EA580C" />
      </View>

      <Text style={headers.h2}>Recent Analyses</Text>
      {analyses.slice(0, 5).map((a) => (
        <View key={a.analysisid} style={styles.card}>
          <Text style={headers.h4}>Analysis #{a.analysisid}</Text>
          <Text style={headers.h3}>{(a.confidencescore * 100).toFixed(1)}% confidence</Text>
          <Text style={headers.h4}>{a.aiextractedfields?.length ?? 0} fields extracted</Text>
        </View>
      ))}
      {analyses.length === 0 && (
        <Text style={headers.h4}>No analyses yet.</Text>
      )}
    </ScrollView>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderBottomColor: color }]}>
      <Text style={headers.h4}>{label}</Text>
      <Text style={[headers.h2, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: styleVariables.borderColor,
    borderBottomWidth: 3,
    gap: 4,
  },
  card: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: styleVariables.borderColor,
    gap: 2,
  },
});
