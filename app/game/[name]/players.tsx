import { container, headers, styleVariables } from "@/constants/styles";
import { apiGet, apiGetAllPaged, Game, PagedResult, PlayerDto } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { useGlobalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const PAGE_SIZE = 20;

export default function PlayersScreen() {
  const { name } = useGlobalSearchParams<{ name: string }>();
  const gameName = decodeURIComponent(name ?? "");

  const [players, setPlayers] = useState<PlayerDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<PlayerDto[] | null>(null);
  const [searching, setSearching] = useState(false);

  // For paginated browse mode
  const nextPage = useRef(1);
  const hasMore = useRef(true);
  const fetching = useRef(false);
  const gameId = useRef<number | null>(null);

  async function resolveGameId(): Promise<number | null> {
    if (gameId.current !== null) return gameId.current;
    const games = await apiGetAllPaged<Game>("/api/games");
    const match = games.find((g) => g.gameName === gameName);
    gameId.current = match?.gameId ?? null;
    return gameId.current;
  }

  async function fetchPage(page: number): Promise<{ items: PlayerDto[]; hasNext: boolean }> {
    const id = await resolveGameId();
    if (id === null) return { items: [], hasNext: false };
    const res = await apiGet<PagedResult<PlayerDto>>(
      `/api/players?pageSize=${PAGE_SIZE}&pageNumber=${page}&isDescending=true`,
    );
    const items = (res.items || []).filter((p) => p.gameName === gameName);
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
      setPlayers(items);
      nextPage.current = 2;
      hasMore.current = hasNext;
    } catch (e: any) {
      setError(e.message || "Failed to load players");
    } finally {
      setLoading(false);
      setRefreshing(false);
      fetching.current = false;
    }
  }

  async function loadMore() {
    if (fetching.current || !hasMore.current || searchResults !== null) return;
    fetching.current = true;
    setLoadingMore(true);
    try {
      const { items, hasNext } = await fetchPage(nextPage.current);
      setPlayers((prev) => [...prev, ...items]);
      nextPage.current += 1;
      hasMore.current = hasNext;
    } catch {
      // silently ignore
    } finally {
      setLoadingMore(false);
      fetching.current = false;
    }
  }

  useEffect(() => {
    setLoading(true);
    loadInitial();
  }, [name]);

  // Debounced search
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(text: string) {
    setSearch(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!text.trim()) {
      setSearchResults(null);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await apiGet<PlayerDto[]>(
          `/api/players/search?name=${encodeURIComponent(text.trim())}`,
        );
        setSearchResults(
          (results || []).filter((p) => p.gameName === gameName),
        );
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }

  function clearSearch() {
    setSearch("");
    setSearchResults(null);
  }

  const displayedPlayers = searchResults !== null ? searchResults : players;

  const renderItem = ({ item, index }: { item: PlayerDto; index: number }) => (
    <View style={[styles.card, index % 2 === 1 && styles.cardAlt]}>
      <View style={styles.rankCircle}>
        <Text style={styles.rankText}>
          {item.latestRank > 0 ? `#${item.latestRank}` : "—"}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={headers.h3} numberOfLines={1}>
          {item.playerName ?? "Unknown"}
        </Text>
        <View style={styles.metaRow}>
          {item.guildName && (
            <View style={styles.tag}>
              <Ionicons name="shield-outline" size={11} color={styleVariables.unHighlightTextColor} />
              <Text style={styles.tagText}>{item.guildName}</Text>
            </View>
          )}
          {item.serverName && (
            <View style={styles.tag}>
              <Ionicons name="server-outline" size={11} color={styleVariables.unHighlightTextColor} />
              <Text style={styles.tagText}>{item.serverName}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.scoreCol}>
        <Text style={[headers.h3, { color: styleVariables.mainColor }]}>
          {item.latestScore > 0 ? item.latestScore.toLocaleString() : "—"}
        </Text>
        <Text style={headers.h4}>score</Text>
      </View>
    </View>
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
      data={displayedPlayers}
      keyExtractor={(item) => String(item.playerId)}
      renderItem={renderItem}
      contentContainerStyle={[container.padding, container.gap]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            clearSearch();
            loadInitial();
          }}
        />
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.3}
      ListHeaderComponent={
        <View style={{ gap: 10 }}>
          <View style={styles.titleRow}>
            <Text style={headers.h1}>Players</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>
                {searchResults !== null
                  ? `${searchResults.length} results`
                  : `${players.length}${hasMore.current ? "+" : ""} total`}
              </Text>
            </View>
          </View>

          {/* Search bar */}
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color="#aaa" style={{ marginLeft: 10 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search players…"
              placeholderTextColor="#aaa"
              value={search}
              onChangeText={handleSearchChange}
              autoCapitalize="none"
            />
            {searching && (
              <ActivityIndicator size="small" color={styleVariables.mainColor} style={{ marginRight: 10 }} />
            )}
            {search.length > 0 && !searching && (
              <Pressable onPress={clearSearch} style={{ marginRight: 10 }}>
                <Ionicons name="close-circle" size={18} color="#aaa" />
              </Pressable>
            )}
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
            <Text style={headers.h4}>
              {search.trim() ? "No players found." : "No players for this game yet."}
            </Text>
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
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  countBadge: {
    backgroundColor: "#DED5D3",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  countText: { fontWeight: "600" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: styleVariables.borderColor,
    borderRadius: 10,
    backgroundColor: "#fff",
    gap: 6,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: "#333",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fafafa",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: styleVariables.borderColor,
  },
  cardAlt: { backgroundColor: "#f3f3f3" },
  rankCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: styleVariables.mainColor,
    justifyContent: "center",
    alignItems: "center",
  },
  rankText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
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
  scoreCol: { alignItems: "flex-end" },
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
