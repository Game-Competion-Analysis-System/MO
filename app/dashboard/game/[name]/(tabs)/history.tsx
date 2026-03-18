import { container, headers, styleVariables } from "@/constants/styles";
import { AnalysisSummary, apiDelete, apiGet, PagedResult } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useGlobalSearchParams } from "expo-router";
import moment from "moment";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

const PAGE_SIZE = 20;

export default function HistoryScreen() {
  const { name } = useGlobalSearchParams<{ name: string }>();
  const gameName = decodeURIComponent(name ?? "");

  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState<number | null>(null);
  const [detailCache, setDetailCache] = useState<Record<number, AnalysisSummary>>({});

  // Track server-side pagination
  const nextPage = useRef(1);
  const hasMore = useRef(true);
  const fetching = useRef(false);

  // Fetch a single server page, filter by gameName, return items + whether more pages exist
  async function fetchPage(page: number): Promise<{ items: AnalysisSummary[]; hasNext: boolean }> {
    const res = await apiGet<PagedResult<AnalysisSummary>>(
      `/api/ai?pageSize=${PAGE_SIZE}&pageNumber=${page}&isDescending=true`,
      true,
    );
    const items = (res.items || []).filter((a) => a.gameName === gameName);
    return { items, hasNext: res.hasNext };
  }

  async function loadInitial() {
    if (fetching.current) return;
    fetching.current = true;
    try {
      setError(null);
      nextPage.current = 1;
      hasMore.current = true;
      const { items, hasNext } = await fetchPage(1);
      setAnalyses(items);
      nextPage.current = 2;
      hasMore.current = hasNext;
    } catch (e: any) {
      setError(e.message || "Failed to load history");
    } finally {
      setLoading(false);
      setRefreshing(false);
      fetching.current = false;
    }
  }

  async function loadMore() {
    if (fetching.current || !hasMore.current) return;
    fetching.current = true;
    setLoadingMore(true);
    try {
      const { items, hasNext } = await fetchPage(nextPage.current);
      setAnalyses((prev) => [...prev, ...items]);
      nextPage.current += 1;
      hasMore.current = hasNext;
    } catch {
      // silently ignore load-more errors
    } finally {
      setLoadingMore(false);
      fetching.current = false;
    }
  }

  useEffect(() => {
    setLoading(true);
    loadInitial();
  }, [name]);

  async function toggleDetail(analysisId: number) {
    if (expandedId === analysisId) {
      setExpandedId(null);
      return;
    }
    if (detailCache[analysisId]) {
      setExpandedId(analysisId);
      return;
    }
    setDetailLoading(analysisId);
    try {
      const detail = await apiGet<AnalysisSummary>(`/api/ai/${analysisId}/result`, true);
      setDetailCache((prev) => ({ ...prev, [analysisId]: detail }));
      setExpandedId(analysisId);
    } catch {
      setExpandedId(analysisId);
    } finally {
      setDetailLoading(null);
    }
  }

  function confirmDelete(analysisId: number) {
    Alert.alert("Delete Analysis", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiDelete(`/api/ai/${analysisId}`, true);
            setAnalyses((prev) => prev.filter((a) => a.analysisId !== analysisId));
            if (expandedId === analysisId) setExpandedId(null);
          } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to delete");
          }
        },
      },
    ]);
  }

  const renderItem = useCallback(
    ({ item: analysis }: { item: AnalysisSummary }) => {
      const isExpanded = expandedId === analysis.analysisId;
      const isLoadingDetail = detailLoading === analysis.analysisId;
      const detail = detailCache[analysis.analysisId] ?? analysis;
      const date = moment(analysis.processedTime);

      return (
        <View style={styles.card}>
          <Pressable
            style={styles.cardHeader}
            onPress={() => toggleDetail(analysis.analysisId)}
          >
            <View style={styles.imgPreview}>
              <Ionicons name="image-outline" size={22} color="#fff" />
            </View>

            <View style={styles.cardContent}>
              <Text style={headers.h3}>{date.format("MMM D, YYYY · HH:mm")}</Text>
              <Text style={headers.h4}>{analysis.leaderboard.length} players</Text>
              {analysis.serverName && (
                <Text style={headers.h4}>Server: {analysis.serverName}</Text>
              )}
              {analysis.eventName && (
                <Text style={headers.h4}>Event: {analysis.eventName}</Text>
              )}
            </View>

            <View style={styles.cardActions}>
              <Pressable
                style={styles.deleteBtn}
                onPress={() => confirmDelete(analysis.analysisId)}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </Pressable>
              {isLoadingDetail ? (
                <ActivityIndicator size="small" color={styleVariables.mainColor} />
              ) : (
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={styleVariables.unHighlightTextColor}
                />
              )}
            </View>
          </Pressable>

          {isExpanded && (
            <View style={styles.detailSection}>
              {detail.imageUrl && (
                <Image
                  source={{ uri: detail.imageUrl }}
                  style={styles.detailImage}
                  contentFit="contain"
                />
              )}
              <Text style={[headers.h3, { marginBottom: 6 }]}>Leaderboard</Text>
              {(detail.leaderboard || []).map((entry, i) => (
                <View
                  key={i}
                  style={[styles.playerRow, i % 2 === 0 && styles.playerRowAlt]}
                >
                  <View
                    style={[
                      styles.rankCircle,
                      entry.rank === 1 && { backgroundColor: "#F59E0B" },
                      entry.rank === 2 && { backgroundColor: "#6B7280" },
                      entry.rank === 3 && { backgroundColor: "#92400E" },
                    ]}
                  >
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
              ))}
            </View>
          )}
        </View>
      );
    },
    [expandedId, detailLoading, detailCache],
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={styleVariables.mainColor} />
      </View>
    );
  }

  return (
    <FlatList
      data={analyses}
      keyExtractor={(item) => String(item.analysisId)}
      renderItem={renderItem}
      contentContainerStyle={[container.padding, container.gap]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadInitial();
          }}
        />
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.3}
      ListHeaderComponent={
        <View style={[{ justifyContent: "space-between" }, { flexDirection: "row", alignItems: "center" }]}>
          <Text style={headers.h1}>Analysis History</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{analyses.length}{hasMore.current ? "+" : ""} total</Text>
          </View>
        </View>
      }
      ListEmptyComponent={
        error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={loadInitial}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.centered}>
            <Text style={headers.h4}>No analyses for this game yet.</Text>
          </View>
        )
      }
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator size="small" color={styleVariables.mainColor} />
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingVertical: 40,
  },
  countBadge: {
    backgroundColor: "#DED5D3",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  countText: { fontWeight: "600" },
  card: {
    borderRadius: 12,
    backgroundColor: "#fafafa",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: styleVariables.borderColor,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
  },
  imgPreview: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: styleVariables.mainColor,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: { flex: 1, gap: 2 },
  cardActions: { alignItems: "center", gap: 8 },
  deleteBtn: { padding: 4 },
  detailSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: styleVariables.borderColor,
    padding: 12,
    gap: 4,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  playerRowAlt: { backgroundColor: "#f3f3f3" },
  rankCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: styleVariables.mainColor,
    justifyContent: "center",
    alignItems: "center",
  },
  rankText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  errorBox: {
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 10,
    gap: 4,
  },
  errorText: { color: "#EF4444" },
  retryText: { color: "#2563EB", fontWeight: "bold" },
  detailImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#f0f0f0",
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
});
