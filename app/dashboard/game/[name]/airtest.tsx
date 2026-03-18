import { container, headers, styleVariables } from '@/constants/styles';
import { AnalysisSummary, apiGet, apiPost, LeaderboardPlayer } from '@/services/api';
import { sendRankChangeNotification } from '@/services/notifications';
import { detectRankChanges } from '@/services/rankTracker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useGlobalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import moment from 'moment';

type AnalysisState = 'idle' | 'loading' | 'complete';

function toSupportedGame(name: string): string {
  if (name === 'VLTK Mobile') return 'VLTK_Mobile';
  if (name === 'VLTK 2.0') return 'VLTK_2_0';
  return name.replace(/\s+/g, '_').replace(/\./g, '_');
}

export default function AirtestScreen() {
  const { name } = useGlobalSearchParams<{ name: string }>();
  const gameName = decodeURIComponent(name ?? '');

  const [latestUrl, setLatestUrl] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(true);

  const [analysisState, setAnalysisState] = useState<AnalysisState>('idle');
  const [result, setResult] = useState<AnalysisSummary | null>(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardPlayer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const urls = await apiGet<string[]>('/api/ai/airtest-uploads');
        const list = urls || [];
        setLatestUrl(list.length > 0 ? list[list.length - 1] : null);
      } catch {
        setLatestUrl(null);
      } finally {
        setLoadingImage(false);
      }
    })();
  }, []);

  async function analyze() {
    setAnalysisState('loading');
    setError(null);
    setResult(null);
    setLeaderboardEntries(null);
    try {
      const analysis = await apiPost<AnalysisSummary>(
        `/api/ai/analyze/automatic?gameName=${toSupportedGame(gameName)}`,
        null,
        true,
      );
      setResult(analysis);
      setLeaderboardEntries(analysis.leaderboard || []);
      setAnalysisState('complete');

      // Non-blocking rank change check
      apiGet<{ items: AnalysisSummary[] }>(`/api/ai?pageSize=10&pageNumber=1&isDescending=true`, true)
        .then(page => {
          const previous = (page.items || [])
            .filter(a => a.gameName === gameName && a.analysisId !== analysis.analysisId)
            .at(0);
          if (previous) {
            const changes = detectRankChanges(analysis, previous);
            if (changes.length > 0) sendRankChangeNotification(gameName, changes).catch(() => {});
          }
        })
        .catch(() => {});
    } catch (e: any) {
      setError(e.message || 'Analysis failed');
      setAnalysisState('idle');
    }
  }

  function reset() {
    setAnalysisState('idle');
    setResult(null);
    setLeaderboardEntries(null);
    setError(null);
  }

  return (
    <ScrollView contentContainerStyle={[container.padding, container.gap]}>
      <Text style={headers.h1}>Airtest Analysis</Text>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Latest airtest image */}
      <View style={styles.imageBox}>
        {loadingImage ? (
          <ActivityIndicator size="large" color={styleVariables.mainColor} />
        ) : latestUrl ? (
          <>
            <Text style={[headers.h4, { marginBottom: 8 }]}>Latest Airtest Upload</Text>
            <Image source={{ uri: latestUrl }} style={styles.preview} resizeMode="contain" />
          </>
        ) : (
          <Text style={headers.h4}>No airtest uploads found.</Text>
        )}
      </View>

      {analysisState === 'idle' && (
        <Pressable
          style={[styles.analyzeBtn, (!latestUrl || loadingImage) && styles.analyzeBtnDisabled]}
          onPress={analyze}
          disabled={!latestUrl || loadingImage}
        >
          <MaterialCommunityIcons name="robot" size={18} color="#fff" />
          <Text style={styles.analyzeBtnText}>Analyze Latest Upload</Text>
        </Pressable>
      )}

      {analysisState === 'loading' && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={styleVariables.mainColor} />
          <Text style={headers.h4}>Analyzing…</Text>
        </View>
      )}

      {analysisState === 'complete' && result && (
        <>
          <Pressable style={styles.resetBtn} onPress={reset}>
            <Text style={styles.resetBtnText}>Analyze Again</Text>
          </Pressable>

          <View style={styles.resultHeader}>
            <Text style={headers.h2}>Analysis Result</Text>
            {result.gameName && (
              <View style={styles.gameBadge}>
                <Text style={styles.gameBadgeText}>{result.gameName}</Text>
              </View>
            )}
          </View>
          <Text style={headers.h4}>
            Processed: {result.processedTime
              ? moment(result.processedTime).format('MMM D, YYYY HH:mm')
              : '—'}
          </Text>
          {result.serverName && <Text style={headers.h4}>Server: {result.serverName}</Text>}
          {result.eventName && <Text style={headers.h4}>Event: {result.eventName}</Text>}

          <Text style={headers.h2}>Leaderboard Entries</Text>
          {leaderboardEntries === null ? (
            <ActivityIndicator color={styleVariables.mainColor} />
          ) : leaderboardEntries.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={headers.h4}>No leaderboard entries found.</Text>
            </View>
          ) : (
            leaderboardEntries.map((entry, i) => (
              <View key={i} style={styles.entryRow}>
                <View style={styles.rankCircle}>
                  <Text style={styles.rankText}>#{entry.rank}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={headers.h3}>{entry.playerName}</Text>
                  {entry.guildName && <Text style={headers.h4}>{entry.guildName}</Text>}
                </View>
                <Text style={[headers.h3, { color: styleVariables.mainColor }]}>
                  {entry.score.toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  imageBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: styleVariables.borderColor,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  preview: {
    width: '100%',
    height: 240,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 10,
  },
  analyzeBtnDisabled: { opacity: 0.4 },
  analyzeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  resetBtn: {
    backgroundColor: styleVariables.mainColor,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  resetBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  centered: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gameBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  gameBadgeText: { color: '#065F46', fontWeight: 'bold', fontSize: 13 },
  emptyBox: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#ded5d37f',
  },
  rankCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: { color: '#fff', fontWeight: 'bold' },
  errorBox: { backgroundColor: '#FEE2E2', padding: 12, borderRadius: 10 },
  errorText: { color: '#EF4444' },
});
