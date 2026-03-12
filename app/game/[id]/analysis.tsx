import { useAuth } from '@/context/AuthContext';
import { files } from '@/constants/files';
import { container, headers, styleVariables } from '@/constants/styles';
import { AiAnalysis, apiGet } from '@/services/api';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import moment from 'moment';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function AnalysisScreen() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<AiAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const monthYearString = moment().format('MMMM YYYY');

  async function load() {
    if (!user) { setLoading(false); return; }
    try {
      const data = await apiGet<AiAnalysis[]>('/api/ai/history', true);
      setAnalyses(data || []);
    } catch {
      // show zeros on failure
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [user]);

  const totalAnalyses = analyses.length;
  const avgAccuracy = analyses.length
    ? (analyses.reduce((s, a) => s + (a.confidencescore ?? 0), 0) / analyses.length * 100).toFixed(1)
    : '—';
  const uniqueFields = new Set(
    analyses.flatMap((a) => a.aiextractedfields?.map((f) => f.rawtext) ?? [])
  ).size;

  // This month's analyses
  const thisMonth = analyses.filter((a) =>
    moment(a.processedtime).isSame(moment(), 'month')
  );
  const monthAvgAccuracy = thisMonth.length
    ? (thisMonth.reduce((s, a) => s + (a.confidencescore ?? 0), 0) / thisMonth.length * 100).toFixed(1)
    : '—';

  return (
    <ScrollView
      contentContainerStyle={[container.padding, container.gap]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      {/* Monthly Analytics section */}
      <View style={[container.rowContainer, styles.monthlyFilterHeaderSection]}>
        <Text style={headers.h1}>Analytics</Text>
        <View style={[styles.button, styles.buttonHighlight, container.rowContainer]}>
          <Text style={styles.monthlyFilterText}>All Time</Text>
          <FontAwesome6 name="arrow-down-short-wide" size={18} color="black" />
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={styleVariables.mainColor} />
        </View>
      ) : (
        <>
          <View style={[container.rowContainer, styles.monthlyAnalyticSections]}>
            <StatBox label="Total Analyses" value={String(totalAnalyses)} color="#9333EA" />
            <StatBox label="Avg. Accuracy" value={totalAnalyses ? `${avgAccuracy}%` : '—'} color="#22C55E" />
          </View>
          <View style={[container.rowContainer, styles.monthlyAnalyticSections]}>
            <StatBox label="Unique Extractions" value={String(uniqueFields)} color="#2563EB" />
            <StatBox label="This Month" value={String(thisMonth.length)} color="#EA580C" />
          </View>

          {/* Graph section */}
          <Text style={headers.h1}>Year-Round Trends</Text>
          <View style={container.rowContainer}>
            <Pressable style={[styles.button, styles.buttonHighlight]}>
              <Text style={styles.graphButtonHighlightText}>Line Chart</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.buttonUnHighlight]}>
              <Text style={{ color: styleVariables.unHighlightTextColor }}>Bar Chart</Text>
            </Pressable>
          </View>
          <View style={styles.graphContainer}>
            <Text style={headers.h2}>Trends</Text>
            <Image source={files.graphImageExample} style={{ width: '100%', height: 292 }} />
          </View>

          {/* Month details section */}
          <Text style={headers.h1}>{monthYearString} Details</Text>
          <DetailRow label="Accuracy" value={monthAvgAccuracy !== '—' ? `${monthAvgAccuracy}%` : '—'} bg="#F0FDF4" border="#BBF7D0" textColor="#15803D" valueColor="#16A34A" />
          <DetailRow label="Analyses This Month" value={String(thisMonth.length)} bg="#EFF6FF" border="#BFDBFE" textColor="#1D4ED8" valueColor="#2563EB" />
          <DetailRow label="Unique Extractions" value={String(uniqueFields)} bg="#FAF5FF" border="#E9D5FF" textColor="#7E22CE" valueColor="#9333EA" />
          <DetailRow label="Total Analyses" value={String(totalAnalyses)} bg="#FFF7ED" border="#FED7AA" textColor="#C2410C" valueColor="#EA580C" />

          {/* Performance metrics section */}
          {!user && (
            <View style={[styles.generalSectionInformation, { padding: 16, alignItems: 'center' }]}>
              <Text style={headers.h4}>Sign in to see your analytics</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.monthlyAnalyticSection, styles.generalSectionInformation]}>
      <Text style={headers.h4}>{label}</Text>
      <Text style={headers.h1}>{value}</Text>
      <View style={[styles.generalSectionInformationBottomLine, { backgroundColor: color }]} />
    </View>
  );
}

function DetailRow({
  label, value, bg, border, textColor, valueColor,
}: {
  label: string; value: string; bg: string; border: string; textColor: string; valueColor: string;
}) {
  return (
    <View style={[styles.generalSectionInformation, styles.monthDetailSectionInformation, { backgroundColor: bg, borderColor: border }]}>
      <Text style={{ color: textColor }}>{label}</Text>
      <Text style={[headers.h2, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonHighlight: { backgroundColor: styleVariables.mainColor },
  buttonUnHighlight: { backgroundColor: '#DED5D3' },
  monthlyFilterHeaderSection: { justifyContent: 'space-between' },
  monthlyFilterText: { fontWeight: 'bold' },
  monthlyAnalyticSections: { gap: 20 },
  generalSectionInformation: {
    padding: 4,
    borderRadius: 12,
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  monthlyAnalyticSection: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: styleVariables.borderColor,
  },
  generalSectionInformationBottomLine: {
    width: '100%',
    height: 4,
    borderRadius: 12,
  },
  graphButtonHighlightText: { color: '#ffffff' },
  graphContainer: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: styleVariables.borderColor,
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  monthDetailSectionInformation: {
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  centered: {
    paddingVertical: 40,
    alignItems: 'center',
  },
});
