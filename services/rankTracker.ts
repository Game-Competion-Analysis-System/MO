import { AnalysisSummary } from "./api";
import { RankChange } from "./notifications";

export function detectRankChanges(
  newAnalysis: AnalysisSummary,
  prevAnalysis: AnalysisSummary,
): RankChange[] {
  const prevMap = new Map<string, { rank: number; score: number }>();
  for (const entry of prevAnalysis.leaderboard ?? []) {
    if (entry.playerName) {
      prevMap.set(entry.playerName, { rank: entry.rank, score: entry.score });
    }
  }

  const changes: RankChange[] = [];
  for (const entry of newAnalysis.leaderboard ?? []) {
    if (!entry.playerName) continue;
    const prev = prevMap.get(entry.playerName);
    if (!prev) {
      // New player entering the leaderboard
      changes.push({
        playerName: entry.playerName,
        oldRank: null,
        newRank: entry.rank,
        oldScore: null,
        newScore: entry.score,
      });
    } else if (prev.rank !== entry.rank) {
      // Rank changed
      changes.push({
        playerName: entry.playerName,
        oldRank: prev.rank,
        newRank: entry.rank,
        oldScore: prev.score,
        newScore: entry.score,
      });
    }
  }

  return changes;
}
