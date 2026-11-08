import { clearSession, getToken, notifyUnauthorized } from "../lib/auth";

/** API 基址：开发为空（vite 代理 /api），线上为 /ai-writer（nginx 反代）或完整域名。 */
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

export function statsUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export type StatsResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: "limited" | "unauthorized" | "http" | "network"; status?: number };

export async function fetchStats<T>(path: string): Promise<StatsResult<T>> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  try {
    const response = await fetch(statsUrl(path), { headers });
    return readStatsResponse<T>(response);
  } catch {
    return { ok: false, kind: "network" };
  }
}

/** POST JSON 的统计/管理接口封装，错误处理与 fetchStats 完全一致。 */
export async function postStats<T>(path: string, body: unknown): Promise<StatsResult<T>> {
  const headers: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json" };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  try {
    const response = await fetch(statsUrl(path), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    return readStatsResponse<T>(response);
  } catch {
    return { ok: false, kind: "network" };
  }
}

async function readStatsResponse<T>(response: Response): Promise<StatsResult<T>> {
  if (response.status === 429) {
    return { ok: false, kind: "limited" };
  }
  if (response.status === 401) {
    // 登录态失效：清掉本地 token 并广播，布局会跳转登录页。
    clearSession();
    notifyUnauthorized();
    return { ok: false, kind: "unauthorized" };
  }
  if (!response.ok) {
    return { ok: false, kind: "http", status: response.status };
  }
  return { ok: true, data: (await response.json()) as T };
}

export type LoginResult =
  | { ok: true; token: string; username: string }
  | { ok: false; message: string };

/** 管理员登录：成功返回签名 token，失败返回可直接展示的错误文案。 */
export async function loginAdmin(username: string, password: string): Promise<LoginResult> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/auth/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (response.status === 429) {
      return { ok: false, message: "请求过于频繁，请稍后再试。" };
    }
    if (response.status === 401) {
      return { ok: false, message: "用户名或密码错误。" };
    }
    if (!response.ok) {
      return { ok: false, message: `登录失败（HTTP ${response.status}），请稍后重试。` };
    }
    const body = (await response.json()) as { token: string; username: string };
    return { ok: true, token: body.token, username: body.username };
  } catch {
    return { ok: false, message: "连接不上统计服务，请确认后端已启动。" };
  }
}
