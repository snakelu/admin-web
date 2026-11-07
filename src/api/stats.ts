import { fetchStats } from "./client";
import type { StatsResult } from "./client";
import type { ModelStatsSnapshot, UserStatsSnapshot } from "./types";

export const MODEL_STATS_PATH = "/api/v1/model/stats";
export const USER_STATS_PATH = "/api/v1/user/stats";

export function fetchModelStats(): Promise<StatsResult<ModelStatsSnapshot>> {
  return fetchStats<ModelStatsSnapshot>(MODEL_STATS_PATH);
}

export function fetchUserStats(): Promise<StatsResult<UserStatsSnapshot>> {
  return fetchStats<UserStatsSnapshot>(USER_STATS_PATH);
}
