import { useAuth } from '@/context/AuthContext';
import { container, headers, styleVariables } from '@/constants/styles';
import { AnalysisSummary, apiGet, PagedResult } from '@/services/api';
import moment from 'moment';
import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [userCount, setUserCount]       = useState(0);
  const [gameCount, setGameCount]       = useState(0);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [analyses, setAnalyses]         = useState<AnalysisSummary[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  async function load() {
    try {
      if (isAdmin) {
        // Fetch only what we need: counts from first page + 5 recent analyses
        const [usersRes, gamesRes, analysesRes] = await Promise.all([
          apiGet<PagedResult<any>>('/api/users?pageSize=1&pageNumber=1', true).catch(() => null),
          apiGet<PagedResult<any>>('/api/games?pageSize=1&pageNumber=1').catch(() => null),
          apiGet<PagedResult<AnalysisSummary>>('/api/ai?pageSize=5&pageNumber=1&isDescending=true', true).catch(() => null),
        ]);
        setUserCount(usersRes?.totalCount ?? 0);
        setGameCount(gamesRes?.totalCount ?? 0);
        setAnalysisCount(analysesRes?.totalCount ?? 0);
        setAnalyses(analysesRes?.items ?? []);
      } else {
        const data = await apiGet<PagedResult<AnalysisSummary>>(
          '/api/ai?pageSize=5&pageNumber=1&isDescending=true',
          true
        ).catch(() => null);
        setAnalyses(data?.items ?? []);
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
          <StatCard label="Total Users"     value={String(userCount)}     color="#9333EA" />
          <StatCard label="Total Games"     value={String(gameCount)}     color="#22C55E" />
          <StatCard label="Total Analyses"  value={String(analysisCount)} color="#2563EB" />
        </View>
      )}

      <Text style={headers.h2}>Recent Analyses</Text>
      {analyses.length === 0 ? (
        <Text style={headers.h4}>
          {isAdmin ? 'No analyses yet.' : 'No analyses yet. Pick a game to get started!'}
        </Text>
      ) : (
        analyses.map((a) => (
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
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
