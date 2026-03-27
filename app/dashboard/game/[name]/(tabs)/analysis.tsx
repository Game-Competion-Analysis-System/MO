import { container, headers, styleVariables } from "@/constants/styles";
import { AnalysisSummary, User, apiGet, apiGetAllPaged } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { SVGRenderer, SvgChart } from "@wuba/react-native-echarts";
import { LineChart as ELineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { useGlobalSearchParams } from "expo-router";
import moment from "moment";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

echarts.use([SVGRenderer, ELineChart, GridComponent, TooltipComponent]);

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get("window").width;
const CHART_W = SCREEN_W - 60; // 30 px padding each side
const CHART_H = 220;

type TimeFilter = "28d" | "7d" | "24h";
const TIME_FILTER_LABELS: Record<TimeFilter, string> = {
  "28d": "Last 28 Days",
  "7d": "Last 7 Days",
  "24h": "Last 24 Hours",
};

type ChartPoint = { label: string; value: number; exactTime: string };

// ─── ECharts option builder ───────────────────────────────────────────────────

function buildOption(data: ChartPoint[]) {
  const color = styleVariables.mainColor;
  return {
    grid: { top: 20, bottom: 36, left: 52, right: 12 },
    xAxis: {
      type: "category",
      data: data.map((d) => d.label),
      axisLine: { lineStyle: { color: "#e5e5e5" } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { fontSize: 9, color: "#999" },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#f0f0f0" } },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        fontSize: 9,
        color: "#999",
        formatter: (v: number) =>
          v >= 1_000_000
            ? `${(v / 1_000_000).toFixed(1)}M`
            : v >= 1_000
              ? `${(v / 1_000).toFixed(0)}k`
              : String(v),
      },
    },
    series: [
      {
        type: "line",
        data: data.map((d) => d.value),
        smooth: true,
        symbol: "circle",
        symbolSize: 7,
        lineStyle: { color, width: 2.5 },
        itemStyle: { color, borderWidth: 2, borderColor: "#fff" },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${color}55` },
              { offset: 1, color: `${color}00` },
            ],
          },
        },
      },
    ],
  };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AnalysisScreen() {
  const { name } = useGlobalSearchParams<{ name: string }>();
  const gameName = decodeURIComponent(name ?? "");

  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("28d");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");
  const [playerDropdownOpen, setPlayerDropdownOpen] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<string[]>([]);
  const searchRef = useRef<TextInput>(null);

  const svgRef = useRef<any>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  async function load() {
    try {
      const [data, users] = await Promise.all([
        apiGetAllPaged<AnalysisSummary>("/api/ai", true),
        apiGet<User[]>("/api/users", true).catch(() => [] as User[]),
      ]);
      const filtered = (data || [])
        // .filter((a) => a.gameName === gameName)
        .sort(
          (a, b) =>
            moment(b.processedTime).valueOf() -
            moment(a.processedTime).valueOf(),
        );
      setAnalyses(filtered);
      setRegisteredUsers((users || []).map((u) => u.username).filter(Boolean));
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, [name]);

  const visibleAnalyses = useMemo(() => {
    const hours = timeFilter === "24h" ? 24 : timeFilter === "7d" ? 168 : 672;
    const cutoff = moment().subtract(hours, "hours");
    return analyses.filter(
      (a) => a.processedTime && moment(a.processedTime).isAfter(cutoff),
    );
  }, [analyses, timeFilter]);

  const allPlayerNames = useMemo(() => {
    const seen = new Map<string, string>(); // lowercase key → original value
    registeredUsers.forEach((u) => {
      const name = u?.trim();
      if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name);
    });
    visibleAnalyses.forEach((a) =>
      (a.leaderboard || []).forEach((e) => {
        const name = e.playerName?.trim();
        if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name);
      }),
    );
    return Array.from(seen.values()).sort();
  }, [visibleAnalyses, registeredUsers]);

  const filteredPlayerNames = useMemo(
    () =>
      playerSearch.trim()
        ? allPlayerNames.filter((p) =>
            p.toLowerCase().includes(playerSearch.toLowerCase()),
          )
        : allPlayerNames,
    [allPlayerNames, playerSearch],
  );

  // Chart data — only computed when a player is selected
  const chartData = useMemo((): ChartPoint[] => {
    if (!selectedPlayer) return [];
    const xLabel = (t: string) =>
      timeFilter === "24h"
        ? moment(t).format("HH:mm")
        : moment(t).format("D MMM");
    return [...visibleAnalyses]
      .sort(
        (a, b) =>
          moment(a.processedTime).valueOf() - moment(b.processedTime).valueOf(),
      )
      .filter((a) =>
        (a.leaderboard || []).some((e) => e.playerName === selectedPlayer),
      )
      .map((a) => {
        const entry = (a.leaderboard || []).find(
          (e) => e.playerName === selectedPlayer,
        )!;
        return {
          label: xLabel(a.processedTime!),
          value: entry.score,
          exactTime: moment(a.processedTime).format("MMM D, YYYY · HH:mm"),
        };
      });
  }, [visibleAnalyses, selectedPlayer, timeFilter]);

  // Init / update chart
  useEffect(() => {
    if (!selectedPlayer || !svgRef.current) return;

    if (!chartRef.current) {
      chartRef.current = echarts.init(svgRef.current, "light", {
        renderer: "svg",
        width: CHART_W,
        height: CHART_H,
      });
    }
    chartRef.current.setOption(buildOption(chartData));
  }, [chartData, selectedPlayer]);

  // Dispose when player cleared
  useEffect(() => {
    if (!selectedPlayer && chartRef.current) {
      chartRef.current.dispose();
      chartRef.current = null;
    }
  }, [selectedPlayer]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      chartRef.current?.dispose();
    },
    [],
  );

  // Summary stats (always visible)
  const thisMonth = analyses.filter((a) =>
    moment(a.processedTime).isSame(moment(), "month"),
  );
  const allPlayers = visibleAnalyses.flatMap((a) => a.leaderboard || []);
  const topPlayer = allPlayers.length
    ? allPlayers.reduce((best, e) => (e.score > best.score ? e : best))
    : null;

  return (
    <ScrollView
      contentContainerStyle={[container.padding, container.gap]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
    >
      {/* Header row */}
      <View style={[container.rowContainer, styles.sectionHeader]}>
        <Text style={headers.h1}>Analytics</Text>
        <Pressable
          style={[styles.badge, container.rowContainer]}
          onPress={() => setDropdownOpen(true)}
        >
          <Text style={styles.badgeText}>{TIME_FILTER_LABELS[timeFilter]}</Text>
          <FontAwesome6
            name="arrow-down-short-wide"
            size={14}
            color={styleVariables.unHighlightTextColor}
          />
        </Pressable>
      </View>

      {/* Time-filter modal */}
      <Modal
        visible={dropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setDropdownOpen(false)}
        >
          <View style={styles.filterDropdown}>
            <Text style={[headers.h3, { marginBottom: 8 }]}>
              Filter by Period
            </Text>
            {(["28d", "7d", "24h"] as TimeFilter[]).map((f) => (
              <Pressable
                key={f}
                style={[
                  styles.filterItem,
                  timeFilter === f && styles.filterItemActive,
                ]}
                onPress={() => {
                  setTimeFilter(f);
                  setDropdownOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.filterText,
                    timeFilter === f && styles.filterTextActive,
                  ]}
                >
                  {TIME_FILTER_LABELS[f]}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={styleVariables.mainColor} />
        </View>
      ) : (
        <>
          {/* Stat cards — always visible */}
          <View style={styles.statsRow}>
            <StatBox
              label="Total Analyses"
              value={String(analyses.length)}
              color="#9333EA"
            />
            <StatBox
              label="This Month"
              value={String(thisMonth.length)}
              color="#EA580C"
            />
          </View>
          <View style={styles.statsRow}>
            <StatBox
              label="Top Player"
              value={topPlayer?.playerName ?? "—"}
              color="#22C55E"
              small
            />
            <StatBox
              label="Top Score"
              value={topPlayer ? topPlayer.score.toLocaleString() : "—"}
              color="#2563EB"
              small
            />
          </View>

          {/* Player autocomplete */}
          {allPlayerNames.length > 0 && (
            <View style={styles.searchContainer}>
              <View style={styles.searchRow}>
                <Ionicons
                  name="person-outline"
                  size={16}
                  color={styleVariables.unHighlightTextColor}
                  style={{ marginLeft: 12 }}
                />
                <TextInput
                  ref={searchRef}
                  style={styles.searchInput}
                  placeholder="Search player…"
                  placeholderTextColor="#aaa"
                  value={playerSearch}
                  onChangeText={(t) => {
                    setPlayerSearch(t);
                    setPlayerDropdownOpen(true);
                    if (selectedPlayer && t !== selectedPlayer)
                      setSelectedPlayer(null);
                  }}
                  onFocus={() => setPlayerDropdownOpen(true)}
                />
                {selectedPlayer && (
                  <Pressable
                    style={{ paddingHorizontal: 12 }}
                    onPress={() => {
                      setSelectedPlayer(null);
                      setPlayerSearch("");
                      setPlayerDropdownOpen(false);
                    }}
                  >
                    <Ionicons name="close-circle" size={18} color="#aaa" />
                  </Pressable>
                )}
              </View>

              {playerDropdownOpen && filteredPlayerNames.length > 0 && (
                <View style={styles.autocompleteList}>
                  {filteredPlayerNames.slice(0, 8).map((p) => (
                    <Pressable
                      key={p}
                      style={[
                        styles.autocompleteItem,
                        selectedPlayer === p && styles.autocompleteItemActive,
                      ]}
                      onPressIn={() => {
                        // Fire on mousedown/touchstart — before onBlur can close the dropdown
                        setSelectedPlayer(p);
                        setPlayerSearch(p);
                        setPlayerDropdownOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.autocompleteText,
                          selectedPlayer === p && styles.autocompleteTextActive,
                        ]}
                      >
                        {p}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Chart — only when a player is selected */}
          <View style={styles.chartCard}>
            {!selectedPlayer ? (
              <View style={styles.emptyChart}>
                <Ionicons
                  name="analytics-outline"
                  size={36}
                  color={styleVariables.borderColor}
                />
                <Text style={styles.emptyText}>
                  Select a player to see their score chart
                </Text>
              </View>
            ) : (
              <>
                <Text style={[headers.h2, { padding: 14, paddingBottom: 0 }]}>
                  {selectedPlayer} — Score · {TIME_FILTER_LABELS[timeFilter]}
                </Text>
                {chartData.length === 0 ? (
                  <View style={styles.emptyChart}>
                    <Text style={styles.emptyText}>No data in this period</Text>
                  </View>
                ) : (
                  <SvgChart
                    ref={svgRef}
                    style={{ width: CHART_W, height: CHART_H }}
                  />
                )}
              </>
            )}
          </View>

          {/* Summary detail rows */}
          <Text style={headers.h1}>
            {TIME_FILTER_LABELS[timeFilter]} Details
          </Text>
          <DetailRow
            label="Analyses in Period"
            value={String(visibleAnalyses.length)}
            bg="#EFF6FF"
            border="#BFDBFE"
            textColor="#1D4ED8"
            valueColor="#2563EB"
          />
          <DetailRow
            label="Total Analyses"
            value={String(analyses.length)}
            bg="#FFF7ED"
            border="#FED7AA"
            textColor="#C2410C"
            valueColor="#EA580C"
          />
          {topPlayer && (
            <DetailRow
              label="Overall Top Player"
              value={topPlayer.playerName}
              bg="#F0FDF4"
              border="#BBF7D0"
              textColor="#15803D"
              valueColor="#16A34A"
            />
          )}

          {/* Per-player entries — only when player is selected */}
          {selectedPlayer && (
            <>
              <Text style={headers.h2}>{selectedPlayer} — All Entries</Text>
              {visibleAnalyses
                .flatMap((a) =>
                  (a.leaderboard || [])
                    .filter((e) => e.playerName === selectedPlayer)
                    .map((e) => ({ ...e, processedTime: a.processedTime })),
                )
                .sort(
                  (a, b) =>
                    moment(a.processedTime).valueOf() -
                    moment(b.processedTime).valueOf(),
                )
                .map((e, i) => (
                  <View key={i} style={styles.entryRow}>
                    <View style={styles.rankCircle}>
                      <Text style={styles.rankText}>#{e.rank}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={headers.h3}>{e.score.toLocaleString()}</Text>
                      <Text style={headers.h4}>
                        {moment(e.processedTime).format("MMM D, YYYY")}
                      </Text>
                    </View>
                    {e.guildName && (
                      <Text style={headers.h4}>{e.guildName}</Text>
                    )}
                  </View>
                ))}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBox({
  label,
  value,
  color,
  small,
}: {
  label: string;
  value: string;
  color: string;
  small?: boolean;
}) {
  return (
    <View style={styles.statBox}>
      <Text style={headers.h4}>{label}</Text>
      <Text
        style={[small ? headers.h3 : headers.h1, { color }]}
        numberOfLines={1}
      >
        {value}
      </Text>
      <View style={[styles.statLine, { backgroundColor: color }]} />
    </View>
  );
}

function DetailRow({
  label,
  value,
  bg,
  border,
  textColor,
  valueColor,
}: {
  label: string;
  value: string;
  bg: string;
  border: string;
  textColor: string;
  valueColor: string;
}) {
  return (
    <View
      style={[styles.detailRow, { backgroundColor: bg, borderColor: border }]}
    >
      <Text style={{ color: textColor }}>{label}</Text>
      <Text style={[headers.h3, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sectionHeader: { justifyContent: "space-between", alignItems: "flex-start" },
  badge: {
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  badgeText: { fontSize: 13, color: styleVariables.unHighlightTextColor },
  centered: { paddingVertical: 40, alignItems: "center" },

  statsRow: { flexDirection: "row", gap: 10 },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: styleVariables.borderColor,
    gap: 2,
    overflow: "hidden",
  },
  statLine: { width: "100%", height: 4, borderRadius: 4, marginTop: 4 },

  searchContainer: { position: "relative", zIndex: 10 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: styleVariables.borderColor,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 14,
  },
  autocompleteList: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: styleVariables.borderColor,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 20,
  },
  autocompleteItem: { paddingVertical: 11, paddingHorizontal: 14 },
  autocompleteItemActive: { backgroundColor: "#f0f0ff" },
  autocompleteText: { fontSize: 14, color: "#333" },
  autocompleteTextActive: {
    color: styleVariables.mainColor,
    fontWeight: "600",
  },

  chartCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: styleVariables.borderColor,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  emptyChart: {
    height: CHART_H,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: styleVariables.unHighlightTextColor,
    textAlign: "center",
  },

  detailRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f9f9f9",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: styleVariables.borderColor,
  },
  rankCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: styleVariables.mainColor,
    justifyContent: "center",
    alignItems: "center",
  },
  rankText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  filterDropdown: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    minWidth: 200,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  filterItem: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 8 },
  filterItemActive: { backgroundColor: styleVariables.mainColor },
  filterText: { fontSize: 15, color: "#333" },
  filterTextActive: { color: "#fff", fontWeight: "600" },
});
