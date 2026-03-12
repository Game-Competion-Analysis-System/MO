import { useAuth } from '@/context/AuthContext';
import { container, headers, styleVariables } from '@/constants/styles';
import { AiAnalysis, apiGet } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import moment from 'moment';
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
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function HistoryScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [analyses, setAnalyses] = useState<AiAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await apiGet<AiAnalysis[]>('/api/ai/history', true);
      setAnalyses(data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [user]);

  if (!user) {
    return (
      <View style={[container.padding, styles.centered]}>
        <Ionicons name="lock-closed-outline" size={48} color={styleVariables.unHighlightTextColor} />
        <Text style={headers.h3}>Sign in to view history</Text>
        <Text style={headers.h4}>Your analysis history is saved to your account</Text>
        <Pressable style={styles.signInBtn} onPress={() => router.push('/login')}>
          <Text style={styles.signInBtnText}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

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
      <View style={[container.rowContainer, { justifyContent: 'space-between' }]}>
        <Text style={headers.h1}>Analysis History</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>All ({analyses.length})</Text>
        </View>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={load}><Text style={styles.retryText}>Retry</Text></Pressable>
        </View>
      )}

      {analyses.length === 0 && !error && (
        <View style={styles.centered}>
          <Text style={headers.h4}>No analyses yet. Upload a screenshot to get started!</Text>
        </View>
      )}

      {analyses.map((analysis) => (
        <AnalysisCard key={analysis.analysisid} analysis={analysis} />
      ))}
    </ScrollView>
  );
}

function AnalysisCard({ analysis }: { analysis: AiAnalysis }) {
  const date = moment(analysis.processedtime);
  const fieldCount = analysis.aiextractedfields?.length ?? 0;

  return (
    <View style={styles.card}>
      <View style={styles.imgPreview}>
        <Ionicons name="image-outline" size={28} color="#fff" />
      </View>
      <View style={styles.cardContent}>
        <View style={container.rowContainer}>
          <Text style={headers.h3}>{date.format('MMM D, YYYY')}</Text>
          <Text style={headers.h4}>{date.format('HH:mm')}</Text>
        </View>
        <View style={container.rowContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="lightning-bolt-outline" size={14} color="black" />
            <Text style={headers.h4}>{(analysis.confidencescore * 100).toFixed(1)}%</Text>
          </View>
          <Text style={headers.h4}>{fieldCount} fields</Text>
        </View>
        <Text style={headers.h4}>Model: {analysis.aimodelversion}</Text>
      </View>
    </View>
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
  signInBtn: {
    backgroundColor: styleVariables.mainColor,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  signInBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  card: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#ded5d37f',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  imgPreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: styleVariables.mainColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: { flex: 1, gap: 2 },
  countBadge: {
    backgroundColor: '#DED5D3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  countText: { fontWeight: '600' },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 10,
    gap: 4,
  },
  errorText: { color: '#EF4444' },
  retryText: { color: '#2563EB', fontWeight: 'bold' },
});
