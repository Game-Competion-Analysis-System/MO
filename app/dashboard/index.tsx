import { useAuth } from '@/context/AuthContext';
import { container, headers, styleVariables } from '@/constants/styles';
import { AnalysisSummary, apiGetAllPaged } from '@/services/api';
import moment from 'moment';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function DashboardHome() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const data = await apiGetAllPaged<AnalysisSummary>('/api/ai', true);
      setAnalyses((data || []).sort((a, b) => moment(b.processedTime).valueOf() - moment(a.processedTime).valueOf()));
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <ScrollView
      contentContainerStyle={[container.padding, container.gap]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
        />
      }
    >
      <Text style={headers.h1}>Welcome, {user?.username}</Text>
      <Text style={[headers.h4, { color: styleVariables.unHighlightTextColor }]}>
        Select the Games tab to pick a game to analyze.
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={styleVariables.mainColor} />
      ) : (
        <>
          <Text style={headers.h2}>Recent Analyses</Text>
          {analyses.length === 0 ? (
            <Text style={headers.h4}>No analyses yet. Pick a game to get started!</Text>
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
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: styleVariables.borderColor,
    gap: 2,
  },
});
