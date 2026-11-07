/** API 基址：开发为空（vite 代理 /api），线上为 /ai-writer（nginx 反代）或完整域名。 */
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

export function statsUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export type StatsResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: "limited" | "http" | "network"; status?: number };

export async function fetchStats<T>(path: string): Promise<StatsResult<T>> {
  try {
    const response = await fetch(statsUrl(path), {
      headers: { Accept: "application/json" },
    });
    if (response.status === 429) {
      return { ok: false, kind: "limited" };
    }
    if (!response.ok) {
      return { ok: false, kind: "http", status: response.status };
    }
    return { ok: true, data: (await response.json()) as T };
  } catch {
    return { ok: false, kind: "network" };
  }
}
