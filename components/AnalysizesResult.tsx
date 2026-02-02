import { headers } from "@/constants/styles";
import { StyleSheet, Text, View } from "react-native";

interface TopRanking {
  playerName: string;
  tag: string;
  score: number;
}

interface ActiveEvent {
  eventName: string;
  endDate: string;
  status: string;
}

interface DetectedPlayer {
  playerName: string;
  tag: string;
  level: number;
  status: string;
}

function EventStatusDisplay({ status }: { status: string }) {
  switch (status) {
    case "Active":
      return (
        <View
          style={[styles.eventStatusDisplay, styles.eventStatusActiveDisplay]}
        >
          <Text style={styles.eventStatusActiveText}>{status}</Text>
        </View>
      );
    case "Upcoming":
      return (
        <View
          style={[styles.eventStatusDisplay, styles.eventStatusUpcomingDisplay]}
        >
          <Text style={styles.eventStatusUpcomingText}>{status}</Text>
        </View>
      );
  }
}

function DetectedPlayerStatus({ status }: { status: string }) {
  switch (status) {
    case "Online":
      return (
        <View
          style={[
            styles.detectedPlayerDisplay,
            styles.detectedPlayerOnlineDisplay,
          ]}
        >
          <Text style={styles.detectedPlayerOnlineText}>{status}</Text>
        </View>
      );
  }
}

function TopRankingSections({ topRankings }: { topRankings: TopRanking[] }) {
  return topRankings.map((rank, i) => (
    <View key={i} style={[styles.generalSectionInformation]}>
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          alignItems: "center",
        }}
      >
        <View
          style={{
            backgroundColor: "#9333EA",
            borderRadius: "100%",
            justifyContent: "center",
            alignItems: "center",
            width: 35,
            height: 32,
          }}
        >
          <Text style={{ color: "#ffffff" }}>{i + 1}</Text>
        </View>
        <View>
          <Text style={[headers.h3]}>{rank.playerName}</Text>
          <Text style={headers.h4}>{rank.tag}</Text>
        </View>
      </View>
      <Text style={[headers.h3, { color: "#A71EEB" }]}>{rank.score}</Text>
    </View>
  ));
}

function ActiveEventSections({
  activeEvents,
}: {
  activeEvents: ActiveEvent[];
}) {
  return activeEvents.map((activeEvent, i) => (
    <View key={i} style={[styles.generalSectionInformation]}>
      <View>
        <Text style={headers.h3}>{activeEvent.eventName}</Text>
        <Text style={headers.h4}>Ends: {activeEvent.endDate}</Text>
      </View>
      <EventStatusDisplay status={activeEvent.status} />
    </View>
  ));
}

function DetectedPlayerSections({
  detectedPlayers,
}: {
  detectedPlayers: DetectedPlayer[];
}) {
  return detectedPlayers.map((player, i) => (
    <View key={i} style={[styles.generalSectionInformation]}>
      <View>
        <Text style={headers.h3}>{player.playerName}</Text>
        <Text style={headers.h4}>
          Level {player.level} • {player.tag}
        </Text>
      </View>
      <DetectedPlayerStatus status={player.status} />
    </View>
  ));
}

export default function AnalysizesResult({
  topRankings,
  activeEvents,
  detectedPlayers,
}: {
  topRankings: TopRanking[];
  activeEvents: ActiveEvent[];
  detectedPlayers: DetectedPlayer[];
}) {
  return (
    <>
      <Text style={headers.h1}>Top Rankings</Text>
      <TopRankingSections topRankings={topRankings} />
      <Text style={headers.h1}>Active Events</Text>
      <ActiveEventSections activeEvents={activeEvents} />
      <Text style={headers.h1}>Detected Players</Text>
      <DetectedPlayerSections detectedPlayers={detectedPlayers} />
    </>
  );
}

const styles = StyleSheet.create({
  generalSectionInformation: {
    padding: 12,
    borderRadius: 12,
    flex: 1,
    backgroundColor: "#ded5d37f",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eventStatusDisplay: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  eventStatusActiveDisplay: {
    backgroundColor: "#DCFCE7",
  },
  eventStatusActiveText: {
    color: "#166534",
    fontWeight: "semibold",
  },
  eventStatusUpcomingDisplay: {
    backgroundColor: "#DBEAFE",
  },
  eventStatusUpcomingText: {
    color: "#1E40AF",
    fontWeight: "semibold",
  },
  detectedPlayerDisplay: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  detectedPlayerOnlineDisplay: {
    backgroundColor: "#a71eeb41",
  },
  detectedPlayerOnlineText: {
    fontWeight: "medium",
    color: "#A71EEB",
  },
});
