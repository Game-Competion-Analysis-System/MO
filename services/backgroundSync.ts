import AsyncStorage from "@react-native-async-storage/async-storage";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { AnalysisSummary, BASE_URL, PagedResult, TOKEN_KEY } from "./api";
import { sendRankChangeNotification } from "./notifications";
import { detectRankChanges } from "./rankTracker";

export const RANK_SYNC_TASK = "rank-sync-task";
const LAST_SEEN_KEY = "rank_tracker_last_id";

// --- Task definition (must be top-level, outside any component) ---
TaskManager.defineTask(RANK_SYNC_TASK, async () => {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return BackgroundFetch.BackgroundFetchResult.NoData;

    const res = await fetch(
      `${BASE_URL}/api/ai?pageSize=20&pageNumber=1&isDescending=true`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    if (!res.ok) return BackgroundFetch.BackgroundFetchResult.Failed;

    const page: PagedResult<AnalysisSummary> = await res.json();
    const analyses = page.items ?? [];
    if (analyses.length === 0) return BackgroundFetch.BackgroundFetchResult.NoData;

    // Find analyses newer than the last one we processed
    const lastSeenStr = await AsyncStorage.getItem(LAST_SEEN_KEY);
    const lastSeenId = lastSeenStr ? parseInt(lastSeenStr, 10) : 0;
    const newAnalyses = analyses.filter((a) => a.analysisId > lastSeenId);

    if (newAnalyses.length === 0) return BackgroundFetch.BackgroundFetchResult.NoData;

    // Group all fetched analyses by game for comparison lookup
    const byGame = new Map<string, AnalysisSummary[]>();
    for (const a of analyses) {
      if (!a.gameName) continue;
      if (!byGame.has(a.gameName)) byGame.set(a.gameName, []);
      byGame.get(a.gameName)!.push(a);
    }

    // For each new analysis find the previous one for the same game and compare
    const notifiedGames = new Set<string>();
    for (const newA of newAnalyses) {
      const game = newA.gameName;
      if (!game || notifiedGames.has(game)) continue;

      const gameAnalyses = (byGame.get(game) ?? []).sort(
        (a, b) => b.analysisId - a.analysisId,
      );
      const idx = gameAnalyses.findIndex((a) => a.analysisId === newA.analysisId);
      const prev = gameAnalyses[idx + 1];
      if (!prev) continue;

      const changes = detectRankChanges(newA, prev);
      if (changes.length > 0) {
        await sendRankChangeNotification(game, changes);
        notifiedGames.add(game);
      }
    }

    // Persist the newest analysis ID we've seen
    const maxId = Math.max(...analyses.map((a) => a.analysisId));
    await AsyncStorage.setItem(LAST_SEEN_KEY, String(maxId));

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// --- Registration helpers ---
export async function registerBackgroundSync(): Promise<void> {
  const status = await BackgroundFetch.getStatusAsync();
  if (
    status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
    status === BackgroundFetch.BackgroundFetchStatus.Denied
  ) {
    return;
  }

  const already = await TaskManager.isTaskRegisteredAsync(RANK_SYNC_TASK);
  if (!already) {
    await BackgroundFetch.registerTaskAsync(RANK_SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutes minimum (OS may delay further)
      stopOnTerminate: false,   // Android: keep running after app is killed
      startOnBoot: true,        // Android: restart after device reboot
    });
  }
}

export async function unregisterBackgroundSync(): Promise<void> {
  const already = await TaskManager.isTaskRegisteredAsync(RANK_SYNC_TASK);
  if (already) {
    await BackgroundFetch.unregisterTaskAsync(RANK_SYNC_TASK);
  }
}
