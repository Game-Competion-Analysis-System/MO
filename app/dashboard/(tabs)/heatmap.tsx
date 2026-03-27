import { container, headers, styleVariables } from "@/constants/styles";
import { AnalysisSummary, apiGetAllPaged } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { SVGRenderer, SvgChart } from "@wuba/react-native-echarts";
import { HeatmapChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
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

echarts.use([
  SVGRenderer,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
]);

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_LABELS = ["0–4h", "4–8h", "8–12h", "12–16h", "16–20h", "20–24h"];
const HEAT_COLORS = [
  "#EEF8F6",
  "#A8DEDD",
  "#55C9C2",
  "#1ABFB7",
  styleVariables.mainColor,
];

const SCREEN_W = Dimensions.get("window").width;
const H_PAD = 30;
const CHART_W = SCREEN_W - H_PAD * 2;
const CHART_H = 310;

// ─── Types ────────────────────────────────────────────────────────────────────

type CellEntry = {
  analysisId: number;
  gameName: string | null;
  serverName: string | null;
  eventName: string | null;
  playerRank: number | null;
  playerScore: number | null;
  time: string;
};
type MatrixCell = { count: number; entries: CellEntry[] };
type Matrix = MatrixCell[][];

// ─── Data helpers ─────────────────────────────────────────────────────────────

function buildMatrix(
  analyses: AnalysisSummary[],
  playerName: string | null,
): Matrix {
  const matrix: Matrix = Array.from({ length: 7 }, () =>
    Array.from({ length: 6 }, () => ({ count: 0, entries: [] })),
  );
  for (const a of analyses) {
    if (!a.processedTime) continue;
    const dt = new Date(a.processedTime);
    const rawDay = dt.getDay();
    const dayIndex = rawDay === 0 ? 6 : rawDay - 1; // 0=Mon…6=Sun
    const slot = Math.min(Math.floor(dt.getHours() / 4), 5);
    const playerEntry = playerName
      ? (a.leaderboard ?? []).find((p) => p.playerName === playerName)
      : null;
    matrix[dayIndex][slot].count++;
    matrix[dayIndex][slot].entries.push({
      analysisId: a.analysisId,
      gameName: a.gameName,
      serverName: a.serverName,
      eventName: a.eventName,
      playerRank: playerEntry?.rank ?? null,
      playerScore: playerEntry?.score ?? null,
      time: dt.toTimeString().slice(0, 5),
    });
  }
  return matrix;
}

function buildSeriesData(matrix: Matrix, maxCount: number) {
  const data: object[] = [];
  for (let d = 0; d < 7; d++) {
    for (let s = 0; s < 6; s++) {
      const count = matrix[d][s].count;
      data.push({
        value: [d, s, count],
        label: {
          show: count > 0,
          color: count > maxCount / 2 ? "#fff" : "#0D4744",
        },
      });
    }
  }
  return data;
}

function buildOption(matrix: Matrix, maxCount: number) {
  return {
    grid: { top: 28, bottom: 10, left: 58, right: 12 },
    xAxis: {
      type: "category",
      data: DAY_LABELS,
      splitArea: { show: true },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        fontSize: 11,
        color: styleVariables.unHighlightTextColor,
        fontWeight: "bold",
      },
    },
    yAxis: {
      type: "category",
      data: TIME_LABELS,
      inverse: true, // 0–4h at top
      splitArea: { show: true },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontSize: 10, color: styleVariables.unHighlightTextColor },
    },
    visualMap: {
      show: false,
      min: 0,
      max: maxCount || 1,
      inRange: { color: HEAT_COLORS },
    },
    series: [
      {
        type: "heatmap",
        data: buildSeriesData(matrix, maxCount),
        label: { show: true, fontSize: 11, fontWeight: "bold" },
        itemStyle: { borderRadius: 5, borderColor: "#fff", borderWidth: 2 },
        emphasis: {
          itemStyle: { shadowBlur: 6, shadowColor: "rgba(0,0,0,0.2)" },
        },
      },
    ],
  };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HeatmapScreen() {
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{
    day: number;
    slot: number;
    cell: MatrixCell;
  } | null>(null);

  const [playerSearch, setPlayerSearch] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const playerInputRef = useRef<TextInput>(null);

  const svgRef = useRef<any>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  async function load() {
    try {
      setError(null);
      const data = await apiGetAllPaged<AnalysisSummary>("/api/ai", true);
      setAnalyses(data || []);
    } catch (e: any) {
      setError(e.message || "Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // All unique player names extracted from leaderboards
  const allPlayers = useMemo(() => {
    const seen = new Map<string, string>(); // lowercase key → original value
    for (const a of analyses) {
      for (const p of a.leaderboard ?? []) {
        const name = p.playerName?.trim();
        if (name && !seen.has(name.toLowerCase())) {
          seen.set(name.toLowerCase(), name);
        }
      }
    }
    return Array.from(seen.values()).sort();
  }, [analyses]);

  // Players shown in dropdown, filtered by search text
  const filteredPlayers = useMemo(() => {
    const q = playerSearch.trim().toLowerCase();
    const list = q
      ? allPlayers.filter((p) => p.toLowerCase().includes(q))
      : allPlayers;
    return list.slice(0, 10);
  }, [allPlayers, playerSearch]);

  // Analyses that contain the selected player
  const playerAnalyses = useMemo(() => {
    if (!selectedPlayer) return [];
    return analyses.filter((a) =>
      a.leaderboard?.some((p) => p.playerName === selectedPlayer),
    );
  }, [analyses, selectedPlayer]);

  const matrix = useMemo(
    () => buildMatrix(playerAnalyses, selectedPlayer),
    [playerAnalyses, selectedPlayer],
  );
  const maxCount = useMemo(
    () => Math.max(...matrix.flatMap((row) => row.map((c) => c.count)), 1),
    [matrix],
  );

  // Initialise or update the ECharts instance whenever data changes
  useEffect(() => {
    if (!selectedPlayer || !svgRef.current) return;

    if (!chartRef.current) {
      chartRef.current = echarts.init(svgRef.current, "light", {
        renderer: "svg",
        width: CHART_W,
        height: CHART_H,
      });
      chartRef.current.on("click", (params: any) => {
        if (
          params.componentType !== "series" ||
          !Array.isArray(params.data?.value)
        )
          return;
        const [dayIdx, slotIdx] = params.data.value as number[];
        setSelected({
          day: dayIdx,
          slot: slotIdx,
          cell: matrix[dayIdx][slotIdx],
        });
      });
    }

    chartRef.current.setOption(buildOption(matrix, maxCount));
  }, [matrix, maxCount, selectedPlayer]);

  // Dispose chart when player is cleared
  useEffect(() => {
    if (!selectedPlayer && chartRef.current) {
      chartRef.current.dispose();
      chartRef.current = null;
    }
  }, [selectedPlayer]);

  // Clean up on unmount
  useEffect(
    () => () => {
      chartRef.current?.dispose();
    },
    [],
  );

  // Summary stats
  const totalAnalyses = useMemo(
    () => matrix.flatMap((row) => row).reduce((s, c) => s + c.count, 0),
    [matrix],
  );
  const mostActiveDay = useMemo(() => {
    if (totalAnalyses === 0) return "—";
    const totals = matrix.map((row) => row.reduce((s, c) => s + c.count, 0));
    return DAY_LABELS[totals.indexOf(Math.max(...totals))];
  }, [matrix, totalAnalyses]);
  const peakSlot = useMemo(() => {
    if (totalAnalyses === 0) return "—";
    const totals = TIME_LABELS.map((_, si) =>
      matrix.reduce((s, day) => s + day[si].count, 0),
    );
    return TIME_LABELS[totals.indexOf(Math.max(...totals))];
  }, [matrix, totalAnalyses]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={styleVariables.mainColor} />
      </View>
    );
  }

  return (
    <>
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
        <Text style={headers.h1}>Activity Heatmap</Text>
        <Text style={[headers.h4, { marginTop: -4 }]}>
          Select a player to see their analysis activity
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={load}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Player autocomplete */}
            <View style={styles.playerContainer}>
              <View style={styles.playerInputRow}>
                <Ionicons
                  name="person-outline"
                  size={16}
                  color={styleVariables.unHighlightTextColor}
                  style={{ marginLeft: 12 }}
                />
                <TextInput
                  ref={playerInputRef}
                  style={styles.playerInput}
                  placeholder="Search player…"
                  placeholderTextColor="#aaa"
                  value={playerSearch}
                  onChangeText={(t) => {
                    setPlayerSearch(t);
                    setDropdownOpen(true);
                    if (selectedPlayer && t !== selectedPlayer)
                      setSelectedPlayer(null);
                  }}
                  onFocus={() => setDropdownOpen(true)}
                />
                {selectedPlayer && (
                  <Pressable
                    style={styles.clearBtn}
                    onPress={() => {
                      setSelectedPlayer(null);
                      setPlayerSearch("");
                      setDropdownOpen(false);
                    }}
                  >
                    <Ionicons name="close-circle" size={18} color="#aaa" />
                  </Pressable>
                )}
              </View>

              {dropdownOpen && filteredPlayers.length > 0 && (
                <View style={styles.dropdown}>
                  {filteredPlayers.map((p) => (
                    <Pressable
                      key={p}
                      style={[
                        styles.dropdownItem,
                        selectedPlayer === p && styles.dropdownItemActive,
                      ]}
                      onPressIn={() => {
                        // Fire on mousedown/touchstart — before onBlur can close the dropdown
                        setSelectedPlayer(p);
                        setPlayerSearch(p);
                        setDropdownOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          selectedPlayer === p && styles.dropdownItemTextActive,
                        ]}
                      >
                        {p}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {!selectedPlayer ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="analytics-outline"
                  size={48}
                  color={styleVariables.borderColor}
                />
                <Text style={styles.emptyText}>
                  Select a player to view their heatmap
                </Text>
              </View>
            ) : (
              <>
                {/* Summary stats */}
                <View style={styles.statsRow}>
                  <StatBox
                    label="Appearances"
                    value={String(totalAnalyses)}
                    color="#2563EB"
                  />
                  <StatBox
                    label="Most Active Day"
                    value={mostActiveDay}
                    color="#9333EA"
                  />
                  <StatBox label="Peak Time" value={peakSlot} color="#EA580C" />
                </View>

                {/* ECharts heatmap */}
                <View style={styles.chartCard}>
                  <SvgChart
                    ref={svgRef}
                    style={{ width: CHART_W, height: CHART_H }}
                  />
                </View>

                {/* Colour legend */}
                <View style={styles.legend}>
                  <Text style={styles.legendLabel}>Less</Text>
                  {HEAT_COLORS.map((color, i) => (
                    <View
                      key={i}
                      style={[styles.legendSwatch, { backgroundColor: color }]}
                    />
                  ))}
                  <Text style={styles.legendLabel}>More</Text>
                </View>

                {totalAnalyses === 0 && (
                  <Text
                    style={[
                      headers.h4,
                      { textAlign: "center", paddingVertical: 8 },
                    ]}
                  >
                    No analyses found for {selectedPlayer}.
                  </Text>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Cell detail modal */}
      <Modal
        visible={selected !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelected(null)}
      >
        {selected && (
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <View style={{ gap: 2 }}>
                <Text style={headers.h2}>
                  {DAY_LABELS[selected.day]} · {TIME_LABELS[selected.slot]}
                </Text>
                <Text style={headers.h4}>
                  {selected.cell.count}{" "}
                  {selected.cell.count === 1 ? "analysis" : "analyses"}
                </Text>
              </View>
              <Pressable onPress={() => setSelected(null)}>
                <Ionicons name="close" size={26} color="#000" />
              </Pressable>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ gap: 10, paddingBottom: 32 }}
            >
              {selected.cell.entries.map((entry, i) => (
                <View key={i} style={styles.entryRow}>
                  {/* Left: time + analysis id */}
                  <View style={styles.timePill}>
                    <Text style={styles.timePillText}>{entry.time}</Text>
                    <Text style={styles.analysisIdText}>
                      #{entry.analysisId}
                    </Text>
                  </View>

                  {/* Middle: game / server / event */}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={headers.h3} numberOfLines={1}>
                      {entry.gameName ?? "Unknown Game"}
                    </Text>
                    {entry.serverName && (
                      <Text style={headers.h4} numberOfLines={1}>
                        {entry.serverName}
                      </Text>
                    )}
                    {entry.eventName && (
                      <Text style={headers.h4} numberOfLines={1}>
                        {entry.eventName}
                      </Text>
                    )}
                  </View>

                  {/* Right: rank + score */}
                  <View style={styles.resultBadge}>
                    {entry.playerRank != null && (
                      <Text style={styles.rankText}>#{entry.playerRank}</Text>
                    )}
                    {entry.playerScore != null && (
                      <Text style={styles.scoreText}>
                        {entry.playerScore.toLocaleString()}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </Modal>
    </>
  );
}

// ─── StatBox ──────────────────────────────────────────────────────────────────

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={[styles.statBox, { borderBottomColor: color }]}>
      <Text style={headers.h4}>{label}</Text>
      <Text style={[headers.h3, { color }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  playerContainer: { position: "relative", zIndex: 10 },
  playerInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: styleVariables.borderColor,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  playerInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 14,
  },
  clearBtn: { paddingHorizontal: 12 },
  dropdown: {
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
  dropdownItem: {
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  dropdownItemActive: { backgroundColor: "#f0f0ff" },
  dropdownItemText: { fontSize: 14, color: "#333" },
  dropdownItemTextActive: {
    color: styleVariables.mainColor,
    fontWeight: "600",
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: styleVariables.unHighlightTextColor,
    textAlign: "center",
  },

  statsRow: { flexDirection: "row", gap: 8 },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: styleVariables.borderColor,
    borderBottomWidth: 3,
    gap: 3,
  },

  chartCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: styleVariables.borderColor,
    backgroundColor: "#fff",
    overflow: "hidden",
    alignItems: "center",
  },

  legend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: -4,
  },
  legendLabel: { fontSize: 10, color: styleVariables.unHighlightTextColor },
  legendSwatch: { width: 14, height: 14, borderRadius: 3 },

  errorBox: {
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 10,
    gap: 4,
  },
  errorText: { color: "#EF4444" },
  retryText: { color: "#2563EB", fontWeight: "bold" },

  modal: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 24,
    paddingTop: 48,
    gap: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: styleVariables.borderColor,
  },
  timePill: {
    backgroundColor: styleVariables.mainColor,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  timePillText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  analysisIdText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 10,
    marginTop: 1,
  },
  resultBadge: {
    alignItems: "flex-end",
    gap: 2,
  },
  rankText: {
    fontSize: 13,
    fontWeight: "700",
    color: styleVariables.mainColor,
  },
  scoreText: {
    fontSize: 12,
    color: styleVariables.unHighlightTextColor,
    fontWeight: "600",
  },
});
