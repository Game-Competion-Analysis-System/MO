import AsyncStorage from "@react-native-async-storage/async-storage";

export const BASE_URL = "https://swdaigame.onrender.com";
export const TOKEN_KEY = "auth_token";
export const USER_KEY = "auth_user";

// --- Types ---
export interface User {
  userid: number;
  username: string;
  email: string;
  role: string;
  passwordhash?: string;
}

export interface Game {
  gameid: number;
  gamename: string;
  genre: string;
  companyid: number;
}

export interface Company {
  companyid: number;
  companyname: string;
  country: string;
  website: string;
}

export interface AiExtractedField {
  fieldid: number;
  analysisid: number;
  rawtext: string;
  fieldtype: string;
  confidence: number;
}

export interface AiAnalysis {
  analysisid: number;
  uploadid: number;
  aimodelversion: string;
  confidencescore: number;
  processedtime: string;
  aiextractedfields: AiExtractedField[];
}

export interface LeaderboardEntry {
  entryid: number;
  leaderboardid: number;
  playerid: number;
  rank: number;
  value: number;
  player?: { playerid: number; playername: string };
}

export interface Leaderboard {
  leaderboardid: number;
  eventid: number | null;
  title: string | null;
  metrictype: string | null;
  createdfromanalysisid: number | null;
  leaderboardentries: LeaderboardEntry[];
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
  const headers: Record<string, string> = {};
  if (auth) Object.assign(headers, await getAuthHeader());
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: form,
  });
  return handleResponse<T>(res);
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
