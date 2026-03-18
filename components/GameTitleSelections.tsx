import { headers, styleVariables } from "@/constants/styles";
import { Game } from "@/services/api";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

function GameTitleSection({
  game,
  onPress,
}: {
  game: Game;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <View style={styles.gameTitleContainer}>
        <View style={styles.gameInfo}>
          <Text style={headers.h2}>{game.gameName}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{game.genre}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function GameTitleSections({ items }: { items: Game[] }) {
  const router = useRouter();

  return (
    <View style={{ gap: 16 }}>
      {items.map((item) => (
        <GameTitleSection
          key={String(item.gameId)}
          game={item}
          onPress={() => router.push(`/dashboard/game/${encodeURIComponent(item.gameName)}` as any)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gameTitleContainer: {
    gap: 8,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: styleVariables.borderColor,
  },
  gameInfo: {
    padding: 16,
    gap: 6,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#E0FDF4",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    color: "#065F46",
    fontSize: 12,
    fontWeight: "600",
  },
});
