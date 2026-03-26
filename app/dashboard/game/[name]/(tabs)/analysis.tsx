import { container, headers, styleVariables } from "@/constants/styles";
import { AnalysisSummary, User, apiGet, apiGetAllPaged } from "@/services/api";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
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
import Svg, {
  Circle,
  G,
  Line,
  Polyline,
  Text as SvgText,
} from "react-native-svg";

const SCREEN_W = Dimensions.get("window").width - 60;
const CH = 180;
const PL = 40,
  PB = 28,
  PT = 8,
  PR = 8;

type ChartPoint = { dayKey: string; exactTime: string; value: number; timestamp: number };

function LineChart({ data, color }: { data: ChartPoint[]; color: string }) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    point: ChartPoint;
  } | null>(null);

  if (!data.length) {
    return (
      <View style={styles.emptyChart}>
        <Text style={headers.h4}>No data yet</Text>
      </View>
    );
  }

  const maxV = Math.max(...data.map((d) => d.value), 1);
  const iW = SCREEN_W - PL - PR;
  const iH = CH - PB - PT;
  const minT = Math.min(...data.map((d) => d.timestamp));
  const maxT = Math.max(...data.map((d) => d.timestamp));
  const rangeT = maxT - minT || 1;
  const xOf = (ts: number) =>
    data.length === 1 ? PL + iW / 2 : PL + ((ts - minT) / rangeT) * iW;
  const yOf = (v: number) => PT + iH * (1 - v / maxV);
  const pts = data.map((d) => `${xOf(d.timestamp)},${yOf(d.value)}`).join(" ");

  // One label per unique dayKey, capped at 5 evenly-spaced labels
  const allTicks: [string, number][] = [];
  const seenDays = new Set<string>();
  for (const d of data) {
    if (!seenDays.has(d.dayKey)) {
      seenDays.add(d.dayKey);
      allTicks.push([d.dayKey, d.timestamp]);
    }
  }
  const maxTicks = 5;
  const dayTicks: [string, number][] =
    allTicks.length <= maxTicks
      ? allTicks
      : allTicks.filter((_, i) =>
          i === 0 ||
          i === allTicks.length - 1 ||
          (i % Math.ceil(allTicks.length / (maxTicks - 1))) === 0,
        ).slice(0, maxTicks);

  return (
    <View>
      <Svg width={SCREEN_W} height={CH} onPress={() => setTooltip(null)}>
        <Line
          x1={PL}
          y1={PT}
          x2={PL}
          y2={CH - PB}
          stroke="#ddd"
          strokeWidth={1}
        />
        <Line
          x1={PL}
          y1={CH - PB}
          x2={SCREEN_W - PR}
          y2={CH - PB}
          stroke="#ddd"
          strokeWidth={1}
        />
        {[0, 0.5, 1].map((r) => {
          const y = PT + iH * (1 - r);
          return (
            <G key={r}>
              <Line
                x1={PL}
                y1={y}
                x2={SCREEN_W - PR}
                y2={y}
                stroke="#f0f0f0"
                strokeWidth={1}
              />
              <SvgText
                x={PL - 4}
                y={y + 4}
                fontSize={9}
                textAnchor="end"
                fill="#999"
              >
                {maxV >= 1000000
                  ? `${((maxV * r) / 1000000).toFixed(1)}M`
                  : Math.round(maxV * r)}
              </SvgText>
            </G>
          );
        })}
        {data.length > 1 && (
          <Polyline
            points={pts}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeOpacity={0.4}
          />
        )}
        {dayTicks.map(([day, ts]) => (
          <SvgText
            key={day}
            x={xOf(ts)}
            y={CH - PB + 14}
            fontSize={9}
            textAnchor="middle"
            fill="#666"
          >
            {day}
          </SvgText>
        ))}
        {data.map((d, i) => {
          const cx = xOf(d.timestamp);
          const cy = yOf(d.value);
          const isActive = tooltip?.point === d;
          return (
            <G
              key={i}
              onPress={(e) => {
                e.stopPropagation?.();
                setTooltip(isActive ? null : { x: cx, y: cy, point: d });
              }}
            >
              <Circle
                cx={cx}
                cy={cy}
                r={isActive ? 7 : 5}
                fill={color}
                stroke="#fff"
                strokeWidth={1.5}
              />
            </G>
          );
        })}
      </Svg>
      {tooltip && (
        <View
          style={[
            styles.tooltip,
            {
              left: Math.min(Math.max(tooltip.x - 60, 0), SCREEN_W - 130),
              top: Math.max(tooltip.y - 52, 0),
            },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.tooltipTime}>{tooltip.point.exactTime}</Text>
          <Text style={styles.tooltipValue}>
            {tooltip.point.value >= 1000000
              ? `${(tooltip.point.value / 1000000).toFixed(2)}M`
              : tooltip.point.value.toLocaleString()}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function AnalysisScreen() {
  const { name } = useGlobalSearchParams<{ name: string }>();
  const gameName = decodeURIComponent(name ?? "");
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  type TimeFilter = "28d" | "7d" | "24h";
  const TIME_FILTER_LABELS: Record<TimeFilter, string> = {
    "28d": "Last 28 Days",
    "7d": "Last 7 Days",
    "24h": "Last 24 Hours",
  };

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("28d");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");
  const [playerDropdownOpen, setPlayerDropdownOpen] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<string[]>([]);
  const searchRef = useRef<TextInput>(null);

  async function load() {
    try {
      const [data, users] = await Promise.all([
        apiGetAllPaged<AnalysisSummary>("/api/ai", true),
        apiGet<User[]>("/api/users", true).catch(() => [] as User[]),
      ]);
      const filtered = (data || [])
        .filter((a) => a.gameName === gameName)
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
    const set = new Set<string>(registeredUsers);
    visibleAnalyses.forEach((a) =>
      (a.leaderboard || []).forEach((e) => {
        if (e.playerName) set.add(e.playerName);
      }),
    );
    return [...set].sort();
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

  const chartData = useMemo((): ChartPoint[] => {
    const sorted = [...visibleAnalyses].sort(
      (a, b) =>
        moment(a.processedTime).valueOf() - moment(b.processedTime).valueOf(),
    );
    const xLabel = (t: string) =>
      timeFilter === "24h"
        ? moment(t).format("HH:mm")
        : moment(t).format("D MMM");
    if (selectedPlayer) {
      return sorted
        .filter((a) =>
          (a.leaderboard || []).some((e) => e.playerName === selectedPlayer),
        )
        .map((a) => {
          const entry = (a.leaderboard || []).find(
            (e) => e.playerName === selectedPlayer,
          )!;
          return {
            dayKey: xLabel(a.processedTime!),
            exactTime: moment(a.processedTime).format("MMM D, YYYY · HH:mm"),
            value: entry.score,
            timestamp: moment(a.processedTime).valueOf(),
          };
        });
    }
    return sorted.map((a) => ({
      dayKey: xLabel(a.processedTime!),
      exactTime: moment(a.processedTime).format("MMM D, YYYY · HH:mm"),
      value: (a.leaderboard || []).length,
      timestamp: moment(a.processedTime).valueOf(),
    }));
  }, [visibleAnalyses, selectedPlayer, timeFilter]);

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
          <View style={styles.dropdown}>
            <Text style={[headers.h3, { marginBottom: 8 }]}>
              Filter by Period
            </Text>
            {(["28d", "7d", "24h"] as TimeFilter[]).map((f) => (
              <Pressable
                key={f}
                style={[
                  styles.dropdownItem,
                  timeFilter === f && styles.dropdownItemActive,
                ]}
                onPress={() => {
                  setTimeFilter(f);
                  setDropdownOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    timeFilter === f && styles.dropdownTextActive,
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
          {/* Stat cards */}
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
              value={topPlayer ? topPlayer.playerName : "—"}
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

          {/* Player search */}
          {allPlayerNames.length > 0 && (
            <View style={styles.searchContainer}>
              <TextInput
                ref={searchRef}
                style={styles.searchInput}
                placeholder="Search player…"
                placeholderTextColor="#aaa"
                value={playerSearch}
                onChangeText={(t) => {
                  setPlayerSearch(t);
                  setPlayerDropdownOpen(true);
                }}
                onFocus={() => setPlayerDropdownOpen(true)}
              />
              {selectedPlayer && (
                <Pressable
                  style={styles.clearBtn}
                  onPress={() => {
                    setSelectedPlayer(null);
                    setPlayerSearch("");
                    setPlayerDropdownOpen(false);
                  }}
                >
                  <Text style={styles.clearBtnText}>✕</Text>
                </Pressable>
              )}
              {playerDropdownOpen && filteredPlayerNames.length > 0 && (
                <View style={styles.autocompleteList}>
                  {filteredPlayerNames.slice(0, 8).map((p) => (
                    <Pressable
                      key={p}
                      style={[
                        styles.autocompleteItem,
                        selectedPlayer === p && styles.autocompleteItemActive,
                      ]}
                      onPress={() => {
                        setSelectedPlayer(p);
                        setPlayerSearch(p);
                        setPlayerDropdownOpen(false);
                        searchRef.current?.blur();
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

          {/* Chart */}
          <Text style={headers.h2}>
            {selectedPlayer
              ? `${selectedPlayer} — Score · ${TIME_FILTER_LABELS[timeFilter]}`
              : `Analyses · ${TIME_FILTER_LABELS[timeFilter]}`}
          </Text>
          <View style={styles.chartBox}>
            <LineChart data={chartData} color={styleVariables.mainColor} />
          </View>

          {/* Summary */}
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

          {/* Per-player entries when filtered */}
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
    shadowColor: '#7E6B67',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statLine: { width: "100%", height: 4, borderRadius: 4, marginTop: 4 },
  searchContainer: { position: "relative", zIndex: 10 },
  searchInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: styleVariables.borderColor,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#fff",
    paddingRight: 40,
  },
  clearBtn: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  clearBtnText: { fontSize: 14, color: "#999" },
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
  tooltip: {
    position: "absolute",
    backgroundColor: "rgba(30,30,30,0.88)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 120,
    zIndex: 99,
  },
  tooltipTime: { color: "#ccc", fontSize: 11 },
  tooltipValue: { color: "#fff", fontWeight: "700", fontSize: 13 },
  chartBox: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: styleVariables.borderColor,
    padding: 12,
    alignItems: "center",
    shadowColor: '#7E6B67',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  emptyChart: { height: CH, justifyContent: "center", alignItems: "center" },
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
    shadowColor: '#7E6B67',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
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
  dropdown: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    minWidth: 200,
    maxHeight: 360,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  dropdownItemActive: { backgroundColor: styleVariables.mainColor },
  dropdownText: { fontSize: 15, color: "#333" },
  dropdownTextActive: { color: "#fff", fontWeight: "600" },
});
