// expo-notifications requires a development build (not supported in Expo Go since SDK 53).
// These are no-ops until the app is run as a dev/production build.

export async function requestNotificationPermissions(): Promise<boolean> {
  return false;
}

export interface RankChange {
  playerName: string;
  oldRank: number | null;
  newRank: number;
  oldScore: number | null;
  newScore: number;
}

export async function sendRankChangeNotification(
  _gameName: string,
  _changes: RankChange[],
): Promise<void> {}
