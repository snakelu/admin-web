import { fetchStats, postStats } from "./client";
import type { StatsResult } from "./client";
import type { FeedbackItem, FeedbackStatus } from "./types";

export const ADMIN_FEEDBACK_PATH = "/api/v1/admin/feedback";

export function fetchFeedback(): Promise<StatsResult<FeedbackItem[]>> {
  return fetchStats<FeedbackItem[]>(ADMIN_FEEDBACK_PATH);
}

/** 处理反馈：更新状态并可选附上给家长的回复。 */
export function handleFeedback(
  id: string,
  body: { status: FeedbackStatus; reply?: string | null },
): Promise<StatsResult<unknown>> {
  return postStats<unknown>(`${ADMIN_FEEDBACK_PATH}/${id}/handle`, body);
}
