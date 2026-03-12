import { container, headers, styleVariables } from '@/constants/styles';
import { AiAnalysis, apiGet, apiPostForm, Leaderboard, LeaderboardEntry } from '@/services/api';
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
  const [result, setResult] = useState<AiAnalysis | null>(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pickImage() {
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });

    if (pickerResult.canceled) return;

    const uri = pickerResult.assets[0].uri;
    setSelectedImage(uri);
    setAnalysisState('loading');
    setError(null);
    setResult(null);
    setLeaderboardEntries(null);

    try {
      const filename = uri.split('/').pop() || 'image.jpg';
      const formData = new FormData();
      formData.append('file', { uri, name: filename, type: 'image/jpeg' } as any);

      // POST /api/ai/analyze — this also creates the leaderboard in the same request
      const analysis = await apiPostForm<AiAnalysis>('/api/ai/analyze', formData, true);
      setResult(analysis);

      // The backend already creates a Leaderboard during analysis.
      // Find it by createdfromanalysisid, then fetch its entries.
      try {
        const allLeaderboards = await apiGet<Leaderboard[]>('/api/leaderboard');
        const lb = allLeaderboards?.find(
          (l) => l.createdfromanalysisid === analysis.analysisid
        );
        if (lb) {
          const entries = await apiGet<LeaderboardEntry[]>(
            `/api/leaderboard/${lb.leaderboardid}/entries`
          );
          setLeaderboardEntries(entries || []);
        } else {
          setLeaderboardEntries([]);
        }
      } catch {
        // Leaderboard fetch failure is non-fatal
        setLeaderboardEntries([]);
      }

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
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>
                {((result.confidencescore ?? 0) * 100).toFixed(1)}% confidence
              </Text>
            </View>
          </View>
          <Text style={headers.h4}>
            Processed: {result.processedtime ? moment(result.processedtime).format('MMM D, YYYY HH:mm') : '—'}
          </Text>
          <Text style={headers.h4}>Model: {result.aimodelversion ?? '—'}</Text>

          {/* Extracted fields */}
          {result.aiextractedfields && result.aiextractedfields.length > 0 ? (
            <>
              <Text style={headers.h2}>Extracted Data</Text>
              {groupByFieldType(result.aiextractedfields).map(([type, fields]) => (
                <View key={type} style={styles.fieldGroup}>
                  <Text style={styles.fieldGroupTitle}>{formatFieldType(type)}</Text>
                  {fields.map((f) => (
                    <View key={f.fieldid} style={styles.fieldRow}>
                      <Text style={styles.fieldText}>{f.rawtext}</Text>
                      <Text style={styles.fieldConfidence}>
                        {((f.confidence ?? 0) * 100).toFixed(0)}%
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={headers.h4}>No structured data extracted from this image.</Text>
            </View>
          )}

          {/* Leaderboard entries (created automatically during analysis) */}
          <Text style={headers.h2}>Leaderboard Entries</Text>
          {leaderboardEntries === null ? (
            <ActivityIndicator color={styleVariables.mainColor} />
          ) : leaderboardEntries.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={headers.h4}>No leaderboard entries found for this analysis.</Text>
            </View>
          ) : (
            leaderboardEntries.map((entry) => (
              <View key={entry.entryid} style={styles.leaderboardRow}>
                <View style={styles.rankCircle}>
                  <Text style={styles.rankText}>#{entry.rank}</Text>
                </View>
                <View>
                  <Text style={headers.h3}>
                    {entry.player?.playername ?? `Player #${entry.playerid}`}
                  </Text>
                  <Text style={headers.h4}>Score: {entry.value}</Text>
                </View>
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

function groupByFieldType(fields: AiAnalysis['aiextractedfields']) {
  const map = new Map<string, typeof fields>();
  for (const f of fields) {
    const arr = map.get(f.fieldtype) ?? [];
    arr.push(f);
    map.set(f.fieldtype, arr);
  }
  return [...map.entries()];
}

function formatFieldType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
