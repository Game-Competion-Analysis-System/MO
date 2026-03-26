import { useAuth } from '@/context/AuthContext';
import { container, headers, styleVariables } from '@/constants/styles';
import { AnalysisSummary, apiGetAllPaged, Game, User } from '@/services/api';
import moment from 'moment';
import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [users, setUsers] = useState<User[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      if (isAdmin) {
        const [u, g, a] = await Promise.all([
          apiGetAllPaged<User>('/api/users', true),
          apiGetAllPaged<Game>('/api/games'),
          apiGetAllPaged<AnalysisSummary>('/api/ai', true),
        ]);
        setUsers(u || []);
        setGames(g || []);
        setAnalyses((a || []).sort((x, y) => moment(y.processedTime).valueOf() - moment(x.processedTime).valueOf()));
      } else {
        const data = await apiGetAllPaged<AnalysisSummary>('/api/ai', true);
        setAnalyses((data || []).sort((a, b) => moment(b.processedTime).valueOf() - moment(a.processedTime).valueOf()));
      }
    } catch {
      // silently fail
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

  const totalPlayers = analyses.reduce((s, a) => s + (a.leaderboard?.length ?? 0), 0);

  return (
    <ScrollView
      contentContainerStyle={[container.padding, container.gap]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      <View>
        <Text style={headers.h1}>{isAdmin ? 'Admin Dashboard' : `Welcome, ${user?.username}`}</Text>
        {isAdmin && <Text style={[headers.h4, { marginBottom: 4 }]}>Welcome, {user?.username}</Text>}
        {!isAdmin && (
          <Text style={[headers.h4, { color: styleVariables.unHighlightTextColor }]}>
            Select the Games tab to pick a game to analyze.
          </Text>
        )}
      </View>

      {isAdmin && (
        <View style={styles.statsGrid}>
          <StatCard label="Total Users" value={String(users.length)} color="#9333EA" />
          <StatCard label="Total Games" value={String(games.length)} color="#22C55E" />
          <StatCard label="Total Analyses" value={String(analyses.length)} color="#2563EB" />
          <StatCard label="Players Detected" value={String(totalPlayers)} color="#EA580C" />
        </View>
      )}

      <Text style={headers.h2}>Recent Analyses</Text>
      {analyses.length === 0 ? (
        <Text style={headers.h4}>
          {isAdmin ? 'No analyses yet.' : 'No analyses yet. Pick a game to get started!'}
        </Text>
      ) : (
        analyses.slice(0, 5).map((a) => (
          <View key={a.analysisId} style={styles.card}>
            <Text style={headers.h4}>
              {a.gameName ?? 'Unknown Game'} — {a.serverName ? `Server: ${a.serverName}` : a.eventName ?? `#${a.analysisId}`}
            </Text>
            <Text style={headers.h3}>{moment(a.processedTime).format('MMM D, YYYY · HH:mm')}</Text>
            <Text style={headers.h4}>{a.leaderboard?.length ?? 0} players</Text>
          </View>
        ))
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
