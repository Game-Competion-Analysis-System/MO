import { container, headers, styleVariables } from "@/constants/styles";
import { useAuth } from "@/context/AuthContext";
import {
  apiDelete,
  apiGet,
  LeaderboardEntryDto,
  LeaderboardEntryRaw,
  LeaderboardRaw,
  PagedResult,
} from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
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

const PAGE_SIZE = 15;

function RankCircle({
  rank,
  size = 36,
}: {
  rank: number | null;
  size?: number;
}) {
  const bg =
    rank === 1
      ? "#F59E0B"
      : rank === 2
        ? "#6B7280"
        : rank === 3
          ? "#92400E"
          : styleVariables.mainColor;
  return (
    <View
      style={[
        styles.rankCircle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
        },
      ]}
    >
      <Text style={styles.rankText}>{rank != null ? `#${rank}` : "—"}</Text>
    </View>
  );
}

function EntryRow({
  entry,
  index,
}: {
  entry: LeaderboardEntryRaw;
  index: number;
}) {
  return (
    <View style={[styles.entryRow, index % 2 === 1 && styles.entryRowAlt]}>
      <RankCircle rank={entry.rank} />
      <View style={{ flex: 1 }}>
        <Text style={headers.h3} numberOfLines={1}>
          {entry.player?.playername ?? "Unknown"}
        </Text>
        <View style={styles.metaRow}>
          {entry.player?.guild?.guildname && (
            <View style={styles.tag}>
              <Ionicons
                name="shield-outline"
                size={11}
                color={styleVariables.unHighlightTextColor}
              />
              <Text style={styles.tagText}>{entry.player.guild.guildname}</Text>
            </View>
          )}
          {entry.player?.server?.servername && (
            <View style={styles.tag}>
              <Ionicons
                name="server-outline"
                size={11}
                color={styleVariables.unHighlightTextColor}
              />
              <Text style={styles.tagText}>
                {entry.player.server.servername}
              </Text>
            </View>
          )}
        </View>
      </View>
      <Text style={[headers.h3, { color: styleVariables.mainColor }]}>
        {entry.value != null && entry.value > 0
          ? entry.value.toLocaleString()
          : "—"}
      </Text>
    </View>
  );
}

function TopEntryRow({
  entry,
  index,
}: {
  entry: LeaderboardEntryDto;
  index: number;
}) {
  return (
    <View style={[styles.entryRow, index % 2 === 1 && styles.entryRowAlt]}>
      <RankCircle rank={entry.rank} />
      <View style={{ flex: 1 }}>
        <Text style={headers.h3} numberOfLines={1}>
          {entry.playerName ?? "Unknown"}
        </Text>
        {entry.guildName && (
          <View style={styles.metaRow}>
            <View style={styles.tag}>
              <Ionicons
                name="shield-outline"
                size={11}
                color={styleVariables.unHighlightTextColor}
              />
              <Text style={styles.tagText}>{entry.guildName}</Text>
            </View>
          </View>
        )}
      </View>
      <Text style={[headers.h3, { color: styleVariables.mainColor }]}>
        {entry.score > 0 ? entry.score.toLocaleString() : "—"}
      </Text>
    </View>
  );
}

function LeaderboardCard({
  lb,
  isAdmin,
  onDeleted,
}: {
  lb: LeaderboardRaw;
  isAdmin: boolean;
  onDeleted: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<LeaderboardRaw | null>(null);
  const [sortedEntries, setSortedEntries] = useState<LeaderboardEntryRaw[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function toggle() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    // Already loaded
    if (detail !== null) {
      setExpanded(true);
      return;
    }

    setLoadingEntries(true);
    try {
      // Fetch full detail and sorted entries in parallel
      const [fullDetail, sorted] = await Promise.all([
        apiGet<LeaderboardRaw>(`/api/leaderboard/${lb.leaderboardid}`),
        apiGet<LeaderboardEntryRaw[]>(
          `/api/leaderboard/${lb.leaderboardid}/sorted`,
        ),
      ]);
      setDetail(fullDetail);
      setSortedEntries(sorted || []);
      setExpanded(true);
    } catch {
      setExpanded(true);
    } finally {
      setLoadingEntries(false);
    }
  }

  function confirmDelete() {
    Alert.alert("Delete Leaderboard", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await apiDelete(`/api/leaderboard/${lb.leaderboardid}`, true);
            onDeleted(lb.leaderboardid);
          } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to delete");
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }

  // Prefer detail data for header info, fall back to list data
  const displayLb = detail ?? lb;
  const entryCount =
    sortedEntries.length || displayLb.leaderboardentries?.length || 0;

  return (
    <View style={styles.card}>
      <Pressable style={styles.cardHeader} onPress={toggle}>
        <View style={styles.cardIcon}>
          <Ionicons name="trophy-outline" size={20} color="#fff" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={headers.h3} numberOfLines={1}>
            {displayLb.title ?? `Leaderboard #${lb.leaderboardid}`}
          </Text>
          <View style={styles.metaRow}>
            {displayLb.metrictype && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{displayLb.metrictype}</Text>
              </View>
            )}
            {entryCount > 0 && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{entryCount} players</Text>
              </View>
            )}
            {displayLb.createdfromanalysisid && (
              <View style={styles.tag}>
                <Ionicons
                  name="analytics-outline"
                  size={11}
                  color={styleVariables.unHighlightTextColor}
                />
                <Text style={styles.tagText}>
                  Analysis #{displayLb.createdfromanalysisid}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardActions}>
          {isAdmin &&
            (deleting ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Pressable
                style={styles.deleteBtn}
                onPress={confirmDelete}
                hitSlop={8}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </Pressable>
            ))}
          {loadingEntries ? (
            <ActivityIndicator size="small" color={styleVariables.mainColor} />
          ) : (
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={styleVariables.unHighlightTextColor}
            />
          )}
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.entriesSection}>
          {sortedEntries.length === 0 ? (
            <Text style={[headers.h4, { padding: 12 }]}>No entries.</Text>
          ) : (
            sortedEntries.map((e, i) => (
              <EntryRow key={i} entry={e} index={i} />
            ))
          )}
        </View>
      )}
    </View>
  );
}

export default function LeaderboardView() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [topEntries, setTopEntries] = useState<LeaderboardEntryDto[]>([]);
  const [leaderboards, setLeaderboards] = useState<LeaderboardRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextPage = useRef(1);
  const hasMore = useRef(true);
  const fetching = useRef(false);

  async function loadInitial() {
    if (fetching.current) return;
    fetching.current = true;
    try {
      setError(null);
      nextPage.current = 1;
      hasMore.current = true;
      const [top, page] = await Promise.all([
        apiGet<LeaderboardEntryDto[]>("/api/leaderboard/top/20"),
        apiGet<PagedResult<LeaderboardRaw>>(
          `/api/leaderboard?pageSize=${PAGE_SIZE}&pageNumber=1&isDescending=true`,
        ),
      ]);
      setTopEntries(top || []);
      setLeaderboards(page.items || []);
      nextPage.current = 2;
      hasMore.current = page.hasNext;
    } catch (e: any) {
      setError(e.message || "Failed to load leaderboard");
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
      const page = await apiGet<PagedResult<LeaderboardRaw>>(
        `/api/leaderboard?pageSize=${PAGE_SIZE}&pageNumber=${nextPage.current}&isDescending=true`,
      );
      setLeaderboards((prev) => [...prev, ...(page.items || [])]);
      nextPage.current += 1;
      hasMore.current = page.hasNext;
    } catch {
      // silently ignore
    } finally {
      setLoadingMore(false);
      fetching.current = false;
    }
  }

  function handleDeleted(id: number) {
    setLeaderboards((prev) => prev.filter((lb) => lb.leaderboardid !== id));
  }

  useEffect(() => {
    loadInitial();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={styleVariables.mainColor} />
      </View>
    );
  }

  return (
    <FlatList
      data={leaderboards}
      keyExtractor={(_, i) => String(i)}
      renderItem={({ item }) => (
        <LeaderboardCard
          lb={item}
          isAdmin={isAdmin}
          onDeleted={handleDeleted}
        />
      )}
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
        <View style={{ gap: 10 }}>
          <Text style={headers.h1}>Leaderboard</Text>
          <Text
            style={[headers.h4, { color: styleVariables.unHighlightTextColor }]}
          >
            Global rankings across all analyses
          </Text>

          {topEntries.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Ionicons name="trophy" size={18} color="#F59E0B" />
                <Text style={headers.h2}>Top 20 Players</Text>
              </View>
              <View style={styles.topSection}>
                {topEntries.map((e, i) => (
                  <TopEntryRow key={i} entry={e} index={i} />
                ))}
              </View>
            </>
          )}

          <View style={styles.sectionHeader}>
            <Ionicons name="list" size={18} color={styleVariables.mainColor} />
            <Text style={headers.h2}>All Leaderboards</Text>
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
            <Text style={headers.h4}>No leaderboards yet.</Text>
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
    paddingVertical: 40,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  topSection: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: styleVariables.borderColor,
    overflow: "hidden",
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  entryRowAlt: { backgroundColor: "#f3f3f3" },
  rankCircle: { justifyContent: "center", alignItems: "center" },
  rankText: { color: "#fff", fontWeight: "bold", fontSize: 11 },
  metaRow: { flexDirection: "row", gap: 6, marginTop: 3, flexWrap: "wrap" },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ede9e8",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: { fontSize: 11, color: styleVariables.unHighlightTextColor },
  card: {
    borderRadius: 12,
    backgroundColor: "#fafafa",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: styleVariables.borderColor,
    shadowColor: "#7E6B67",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#9333EA",
    justifyContent: "center",
    alignItems: "center",
  },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  deleteBtn: { padding: 2 },
  entriesSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: styleVariables.borderColor,
  },
  footerLoader: { paddingVertical: 20, alignItems: "center" },
  errorBox: {
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 10,
    gap: 4,
  },
  errorText: { color: "#EF4444" },
  retryText: { color: "#2563EB", fontWeight: "bold" },
});
