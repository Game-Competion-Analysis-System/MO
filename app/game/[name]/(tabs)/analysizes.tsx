import { container, headers, styleVariables } from '@/constants/styles';
import { useAuth } from '@/context/AuthContext';
import { AnalysisSummary, apiGet, apiGetAllPaged, apiPostForm, Game, LeaderboardPlayer, PagedResult, ServerDto } from '@/services/api';
import { sendRankChangeNotification } from '@/services/notifications';
import { detectRankChanges } from '@/services/rankTracker';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import moment from 'moment';

type AnalysisState = 'idle' | 'loading' | 'complete';

export default function AnalysizesScreen() {
  const { name } = useGlobalSearchParams<{ name: string }>();
  const gameName = decodeURIComponent(name ?? '');
  const { user } = useAuth();
  const router = useRouter();
  const [analysisState, setAnalysisState] = useState<AnalysisState>('idle');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisSummary | null>(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardPlayer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [servers, setServers] = useState<ServerDto[]>([]);
  const [serverSearch, setServerSearch] = useState('');
  const [selectedServer, setSelectedServer] = useState('');
  const [serverDropdownOpen, setServerDropdownOpen] = useState(false);
  const serverInputRef = useRef<TextInput>(null);

  useEffect(() => {
    (async () => {
      try {
        const games = await apiGetAllPaged<Game>('/api/games');
        const found = games.find(g => g.gameName === gameName);
        if (!found) return;
        const list = await apiGet<ServerDto[]>(`/api/servers/game/${found.gameId}`);
        setServers(list || []);
      } catch {}
    })();
  }, [gameName]);

  const filteredServers = useMemo(
    () => serverSearch.trim()
      ? servers.filter(s => s.serverName?.toLowerCase().includes(serverSearch.toLowerCase()))
      : servers,
    [servers, serverSearch],
  );

  async function checkRankChanges(newAnalysis: AnalysisSummary) {
    const game = newAnalysis.gameName ?? gameName;
    if (!game || !newAnalysis.leaderboard?.length) return;

    // Fetch recent analyses, find the most recent one that isn't the new one
    const page = await apiGet<PagedResult<AnalysisSummary>>(
      `/api/ai?pageSize=10&pageNumber=1&isDescending=true`,
      true,
    );
    const previous = (page.items || [])
      .filter((a) => a.gameName === game && a.analysisId !== newAnalysis.analysisId)
      .at(0);

    if (!previous) return;

    const changes = detectRankChanges(newAnalysis, previous);
    if (changes.length > 0) {
      await sendRankChangeNotification(game, changes);
    }
  }

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

      // Check for rank changes against most recent previous analysis for this game
      checkRankChanges(analysis).catch(() => {});  // non-blocking
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
      <View style={styles.titleRow}>
        <Text style={headers.h1}>Upload Screenshot</Text>
        {user?.role === 'admin' && (
          <Pressable
            style={styles.airtestBtn}
            onPress={() => router.push(`../airtest` as any)}
          >
            <Ionicons name="hardware-chip-outline" size={16} color="#fff" />
            <Text style={styles.airtestBtnText}>Airtest</Text>
          </Pressable>
        )}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Server autocomplete — shown when idle or after analysis */}
      {analysisState !== 'loading' && (
        <View style={styles.serverContainer}>
          <TextInput
            ref={serverInputRef}
            style={styles.serverInput}
            placeholder="Select a server *"
            placeholderTextColor="#aaa"
            value={serverSearch}
            onChangeText={t => {
              setServerSearch(t);
              setSelectedServer(t);
              setServerDropdownOpen(true);
            }}
            onFocus={() => setServerDropdownOpen(true)}
            onBlur={() => setTimeout(() => setServerDropdownOpen(false), 150)}
          />
          {selectedServer !== '' && (
            <Pressable
              style={styles.serverClear}
              onPress={() => { setServerSearch(''); setSelectedServer(''); setServerDropdownOpen(false); }}
            >
              <Text style={styles.serverClearText}>✕</Text>
            </Pressable>
          )}
          {serverDropdownOpen && filteredServers.length > 0 && (
            <View style={styles.serverDropdown}>
              {filteredServers.slice(0, 8).map(s => (
                <Pressable
                  key={s.serverId}
                  style={[styles.serverItem, selectedServer === s.serverName && styles.serverItemActive]}
                  onPress={() => {
                    setSelectedServer(s.serverName ?? '');
                    setServerSearch(s.serverName ?? '');
                    setServerDropdownOpen(false);
                    serverInputRef.current?.blur();
                  }}
                >
                  <Text style={[styles.serverItemText, selectedServer === s.serverName && styles.serverItemTextActive]}>
                    {s.serverName}
                  </Text>
                  {s.region && (
                    <Text style={styles.serverItemSub}>{s.region}</Text>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      {analysisState === 'idle' ? (
        <Pressable
          style={[styles.fileSelector, !selectedServer && styles.fileSelectorDisabled]}
          onPress={() => {
            if (!selectedServer) {
              setError('Please select a server before uploading.');
              return;
            }
            setError(null);
            pickImage();
          }}
        >
          <MaterialCommunityIcons
            name="lightning-bolt-outline"
            size={24}
            color={selectedServer ? 'black' : '#bbb'}
          />
          <Text style={[{ fontWeight: 'bold' }, !selectedServer && styles.disabledText]}>
            Upload a screenshot to get started
          </Text>
          <Text style={[headers.h4, { textAlign: 'center' }, !selectedServer && styles.disabledText]}>
            {selectedServer
              ? 'Our AI will analyze rankings, events, and players in your image'
              : 'Select a server above first'}
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
          {(result.serverName || selectedServer) && (
            <Text style={headers.h4}>Server: {result.serverName || selectedServer}</Text>
          )}
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
  fileSelectorDisabled: {
    backgroundColor: '#f9f9f9',
    borderStyle: 'dashed',
  },
  disabledText: { color: '#bbb' },
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
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  airtestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  airtestBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  serverContainer: { position: 'relative', zIndex: 10 },
  serverInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: styleVariables.borderColor,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    paddingRight: 40,
  },
  serverClear: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  serverClearText: { fontSize: 14, color: '#999' },
  serverDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: styleVariables.borderColor,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 20,
  },
  serverItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serverItemActive: { backgroundColor: '#f0f0ff' },
  serverItemText: { fontSize: 14, color: '#333' },
  serverItemTextActive: { color: styleVariables.mainColor, fontWeight: '600' },
  serverItemSub: { fontSize: 12, color: '#999' },
});
