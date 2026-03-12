import AsyncStorage from "@react-native-async-storage/async-storage";

export const BASE_URL = "https://swdaigame.onrender.com";
export const TOKEN_KEY = "auth_token";
export const USER_KEY = "auth_user";

// --- Types ---
export interface User {
  userId: number;
  username: string;
  email: string;
  role: string;
  passwordHash?: string;
}

export interface Game {
  gameId: number;
  gameName: string;
  genre: string;
  companyId: number;
}

export interface Company {
  companyId: number;
  companyName: string;
  country: string;
  website: string;
}

export interface AiExtractedField {
  fieldId: number;
  analysisId: number;
  rawText: string;
  fieldType: string;
  confidence: number;
}

export interface AiAnalysis {
  analysisId: number;
  uploadId: number | null;
  aiModelVersion: string | null;
  confidenceScore: number | null;
  processedTime: string | null;
  aiExtractedFields: AiExtractedField[];
}

// Flat DTO returned by GET /api/ai, GET /api/ai/{id}, POST /api/ai/analyze
export interface AnalysisSummary {
  analysisId: number;
  gameId: number | null;
  imageUrl: string | null;
  processedTime: string | null;
  gameName: string | null;
  serverName: string | null;
  eventName: string | null;
  leaderboard: LeaderboardPlayer[];
}

export interface LeaderboardPlayer {
  rank: number;
  playerName: string;
  score: number;
  guildName: string | null;
}

export interface LeaderboardEntry {
  entryId: number;
  leaderboardId: number;
  playerId: number;
  rank: number;
  value: number;
  player?: { playerId: number; playerName: string };
}

export interface Leaderboard {
  leaderboardId: number;
  eventId: number | null;
  title: string | null;
  metricType: string | null;
  createdFromAnalysisId: number | null;
  leaderboardEntries: LeaderboardEntry[];
}

// --- Helpers ---
async function getAuthHeader(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    let message = text || `HTTP ${res.status}`;
    try {
      const json = JSON.parse(text);
      // ASP.NET Problem Details or custom { message } shape
      message = json.message || json.title || json.detail || message;
    } catch {
      // raw text, use as-is
    }
    throw new Error(message);
  }
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text);
}

// --- API methods ---
export async function apiGet<T>(path: string, auth = false): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth) Object.assign(headers, await getAuthHeader());
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  return handleResponse<T>(res);
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  auth = false,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth) Object.assign(headers, await getAuthHeader());
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiPostForm<T>(
  path: string,
  form: FormData,
  auth = false,
): Promise<T> {
  const authHeaders = auth ? await getAuthHeader() : {};
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE_URL}${path}`);
    Object.entries(authHeaders).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); } catch { resolve(undefined as T); }
      } else {
        let message = xhr.responseText || `HTTP ${xhr.status}`;
        try {
          const json = JSON.parse(xhr.responseText);
          message = json.message || json.title || json.detail || message;
        } catch {}
        reject(new Error(message));
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(form);
  });
}

export async function apiPut<T>(
  path: string,
  body: unknown,
  auth = false,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth) Object.assign(headers, await getAuthHeader());
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiDelete<T>(path: string, auth = false): Promise<T> {
  const headers: Record<string, string> = {};
  if (auth) Object.assign(headers, await getAuthHeader());
  const res = await fetch(`${BASE_URL}${path}`, { method: "DELETE", headers });
  return handleResponse<T>(res);
}
