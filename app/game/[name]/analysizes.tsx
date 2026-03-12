import { container, headers, styleVariables } from '@/constants/styles';
import { AnalysisSummary, apiPostForm, LeaderboardPlayer } from '@/services/api';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import moment from 'moment';

type AnalysisState = 'idle' | 'loading' | 'complete';

export default function AnalysizesScreen() {
  const [analysisState, setAnalysisState] = useState<AnalysisState>('idle');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisSummary | null>(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardPlayer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pickImage() {
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });

    if (pickerResult.canceled) return;

    const asset = pickerResult.assets[0];
    const uri = asset.uri;
    setSelectedImage(uri);
    setAnalysisState('loading');
    setError(null);
    setResult(null);
    setLeaderboardEntries(null);

    try {
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const filename = asset.fileName ?? `upload.${ext}`;

      const fileResponse = await fetch(uri);
      const blob = await fileResponse.blob();

      const formData = new FormData();
      formData.append('file', blob, filename);

      // POST /api/ai/analyze — response includes flat leaderboard array
      const analysis = await apiPostForm<AnalysisSummary>('/api/ai/analyze', formData, true);
      setResult(analysis);
      setLeaderboardEntries(analysis.leaderboard || []);

      setAnalysisState('complete');
    } catch (e: any) {
      setError(e.message || 'Analysis failed');
      setAnalysisState('idle');
    }
  }

  function reset() {
    setAnalysisState('idle');
    setSelectedImage(null);
    setResult(null);
    setLeaderboardEntries(null);
    setError(null);
  }

  return (
    <ScrollView contentContainerStyle={[container.padding, container.gap]}>
      <Text style={headers.h1}>Upload Screenshot</Text>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {analysisState === 'idle' ? (
        <Pressable style={styles.fileSelector} onPress={pickImage}>
          <MaterialCommunityIcons name="lightning-bolt-outline" size={24} color="black" />
          <Text style={{ fontWeight: 'bold' }}>Upload a screenshot to get started</Text>
          <Text style={[headers.h4, { textAlign: 'center' }]}>
            Our AI will analyze rankings, events, and players in your image
          </Text>
        </Pressable>
      ) : (
        <View style={styles.imageContainer}>
          <Image source={{ uri: selectedImage! }} style={styles.selectedImage} />
          {analysisState === 'loading' && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={styleVariables.mainColor} />
              <Text style={styles.loadingText}>Analyzing...</Text>
            </View>
          )}
        </View>
      )}

      {analysisState === 'complete' && result && (
        <>
          <Pressable style={styles.uploadButton} onPress={reset}>
            <Text style={styles.uploadButtonText}>Upload Different Image</Text>
          </Pressable>

          {/* Analysis metadata */}
          <View style={styles.resultHeader}>
            <Text style={headers.h2}>Analysis Result</Text>
            {result.gameName && (
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>{result.gameName}</Text>
              </View>
            )}
          </View>
          <Text style={headers.h4}>
            Processed: {result.processedTime ? moment(result.processedTime).format('MMM D, YYYY HH:mm') : '—'}
          </Text>
          {result.serverName && <Text style={headers.h4}>Server: {result.serverName}</Text>}
          {result.eventName && <Text style={headers.h4}>Event: {result.eventName}</Text>}

          {/* Players extracted from analysis */}
          <Text style={headers.h2}>Leaderboard Entries</Text>
          {leaderboardEntries === null ? (
            <ActivityIndicator color={styleVariables.mainColor} />
          ) : leaderboardEntries.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={headers.h4}>No leaderboard entries found for this analysis.</Text>
            </View>
          ) : (
            leaderboardEntries.map((entry, i) => (
              <View key={i} style={styles.leaderboardRow}>
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
  fileSelector: {
    width: '100%',
    height: 384,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: styleVariables.borderColor,
    paddingHorizontal: 20,
  },
  imageContainer: {
    width: '100%',
    height: 384,
    borderRadius: 8,
    overflow: 'hidden',
  },
  selectedImage: { width: '100%', height: '100%' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  uploadButton: {
    backgroundColor: styleVariables.mainColor,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  uploadButtonText: { fontWeight: 'bold', fontSize: 16, color: '#fff' },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confidenceBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  confidenceText: { color: '#065F46', fontWeight: 'bold', fontSize: 13 },
  fieldGroup: {
    borderWidth: 1,
    borderColor: styleVariables.borderColor,
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  fieldGroupTitle: {
    fontWeight: 'bold',
    color: styleVariables.mainColor,
    fontSize: 14,
    marginBottom: 2,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  fieldText: { fontSize: 14, flex: 1 },
  fieldConfidence: { fontSize: 12, color: styleVariables.unHighlightTextColor },
  emptyBox: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
  },
  leaderboardRow: {
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
    backgroundColor: '#9333EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: { color: '#fff', fontWeight: 'bold' },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 10,
  },
  errorText: { color: '#EF4444' },
});
