import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export interface RankChange {
  playerName: string;
  oldRank: number | null; // null = new entry
  newRank: number;
  oldScore: number | null;
  newScore: number;
}

export async function sendRankChangeNotification(
  gameName: string,
  changes: RankChange[],
): Promise<void> {
  if (Platform.OS === "web" || changes.length === 0) return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  const improved = changes.filter(
    (c) => c.oldRank === null || c.newRank < c.oldRank,
  );
  const dropped = changes.filter(
    (c) => c.oldRank !== null && c.newRank > c.oldRank,
  );

  const lines: string[] = [];
  for (const c of improved) {
    if (c.oldRank === null) {
      lines.push(`🆕 ${c.playerName} entered at #${c.newRank}`);
    } else {
      lines.push(`↑ ${c.playerName} #${c.oldRank} → #${c.newRank}`);
    }
  }
  for (const c of dropped) {
    lines.push(`↓ ${c.playerName} #${c.oldRank} → #${c.newRank}`);
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Rank Updates · ${gameName}`,
      body: lines.join("\n"),
      data: { gameName },
    },
    trigger: null, // fire immediately
  });
}
