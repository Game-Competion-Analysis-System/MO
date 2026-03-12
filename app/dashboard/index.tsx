import { useAuth } from '@/context/AuthContext';
import { container, headers, styleVariables } from '@/constants/styles';
import { apiGet, AiAnalysis } from '@/services/api';
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
  const [analyses, setAnalyses] = useState<AiAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const data = await apiGet<AiAnalysis[]>('/api/ai/history', true);
      setAnalyses(data || []);
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
                <Text style={headers.h4}>Analysis #{a.analysisId}</Text>
                <Text style={headers.h3}>{((a.confidenceScore ?? 0) * 100).toFixed(1)}% confidence</Text>
                <Text style={headers.h4}>{a.aiExtractedFields?.length ?? 0} fields extracted</Text>
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
