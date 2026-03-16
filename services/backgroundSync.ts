// expo-background-fetch requires a development build (not supported in Expo Go since SDK 53).
// These are no-ops until the app is run as a dev/production build.

export const RANK_SYNC_TASK = "rank-sync-task";

export async function registerBackgroundSync(): Promise<void> {}

export async function unregisterBackgroundSync(): Promise<void> {}
