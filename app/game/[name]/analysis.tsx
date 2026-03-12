import { container, headers, styleVariables } from "@/constants/styles";
import { AnalysisSummary, apiGet } from "@/services/api";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useGlobalSearchParams } from "expo-router";
import moment from "moment";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
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

function LineChart({
  data,
  color,
}: {
  data: { label: string; value: number }[];
  color: string;
}) {
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
  const xOf = (i: number) =>
    PL + (data.length === 1 ? iW / 2 : (i / (data.length - 1)) * iW);
  const yOf = (v: number) => PT + iH * (1 - v / maxV);
  const pts = data.map((d, i) => `${xOf(i)},${yOf(d.value)}`).join(" ");

  return (
    <Svg width={SCREEN_W} height={CH}>
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
        <Polyline points={pts} fill="none" stroke={color} strokeWidth={2} />
      )}
      {data.map((d, i) => (
        <G key={i}>
          <Circle
            cx={xOf(i)}
            cy={yOf(d.value)}
            r={4}
            fill={color}
            stroke="#fff"
            strokeWidth={1.5}
          />
          <SvgText
            x={xOf(i)}
            y={CH - PB + 14}
            fontSize={9}
            textAnchor="middle"
            fill="#666"
          >
            {d.label}
          </SvgText>
        </G>
      ))}
    </Svg>
  );
}

export default function AnalysisScreen() {
  const { name } = useGlobalSearchParams<{ name: string }>();
  const gameName = decodeURIComponent(name ?? "");
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  async function load() {
    try {
      const data = await apiGet<AnalysisSummary[]>("/api/ai", true);
      const filtered = (data || [])
        .filter((a) => a.gameName === gameName)
        .sort(
          (a, b) =>
            moment(b.processedTime).valueOf() -
            moment(a.processedTime).valueOf(),
        );
      setAnalyses(filtered);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, [name]);

  const players = useMemo(() => {
    const set = new Set<string>();
    analyses.forEach((a) =>
      (a.leaderboard || []).forEach((e) => {
        if (e.playerName) set.add(e.playerName);
      }),
    );
    return [...set];
  }, [analyses]);

  const chartData = useMemo(() => {
    const map = new Map<
      string,
      { sortKey: number; count: number; scores: number[] }
    >();

    analyses.forEach((a) => {
      if (!a.processedTime) return;
      const m = moment(a.processedTime);
      const key = m.format("MMM YY");
      if (!map.has(key))
        map.set(key, { sortKey: m.valueOf(), count: 0, scores: [] });
      const entry = map.get(key)!;
      entry.count++;

      if (selectedPlayer) {
        (a.leaderboard || []).forEach((e) => {
          if (e.playerName === selectedPlayer) entry.scores.push(e.score);
        });
      }
    });

    return [...map.entries()]
      .sort(([, a], [, b]) => a.sortKey - b.sortKey)
      .map(([label, d]) => ({
        label,
        value: selectedPlayer
          ? d.scores.length
            ? Math.round(d.scores.reduce((s, v) => s + v, 0) / d.scores.length)
            : 0
          : d.count,
      }));
  }, [analyses, selectedPlayer]);

  const thisMonth = analyses.filter((a) =>
    moment(a.processedTime).isSame(moment(), "month"),
  );
  const allPlayers = analyses.flatMap((a) => a.leaderboard || []);
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
        <View style={[styles.badge, container.rowContainer]}>
          <Text style={styles.badgeText}>All Time</Text>
          <FontAwesome6
            name="arrow-down-short-wide"
            size={14}
            color={styleVariables.unHighlightTextColor}
          />
        </View>
      </View>

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

          {/* Player filter chips */}
          {players.length > 0 && (
            <>
              <Text style={headers.h2}>Filter by Player</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.playerRow}>
                  <Pressable
                    style={[styles.chip, !selectedPlayer && styles.chipActive]}
                    onPress={() => setSelectedPlayer(null)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        !selectedPlayer && styles.chipTextActive,
                      ]}
                    >
                      All
                    </Text>
                  </Pressable>
                  {players.map((p) => (
                    <Pressable
                      key={p}
                      style={[
                        styles.chip,
                        selectedPlayer === p && styles.chipActive,
                      ]}
                      onPress={() => setSelectedPlayer(p)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selectedPlayer === p && styles.chipTextActive,
                        ]}
                      >
                        {p}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          {/* Chart */}
          <Text style={headers.h2}>
            {selectedPlayer
              ? `${selectedPlayer} — Avg Score / Month`
              : "Analyses per Month"}
          </Text>
          <View style={styles.chartBox}>
            <LineChart data={chartData} color={styleVariables.mainColor} />
          </View>

          {/* Monthly summary */}
          <Text style={headers.h1}>{moment().format("MMMM YYYY")} Details</Text>
          <DetailRow
            label="Analyses This Month"
            value={String(thisMonth.length)}
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
              {analyses
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
    overflow: "hidden",
  },
  statLine: { width: "100%", height: 4, borderRadius: 4, marginTop: 4 },
  playerRow: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: styleVariables.borderColor,
    backgroundColor: "#fff",
  },
  chipActive: {
    backgroundColor: styleVariables.mainColor,
    borderColor: styleVariables.mainColor,
  },
  chipText: {
    fontSize: 13,
    color: styleVariables.unHighlightTextColor,
    fontWeight: "600",
  },
  chipTextActive: { color: "#fff" },
  chartBox: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: styleVariables.borderColor,
    padding: 12,
    alignItems: "center",
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
});
