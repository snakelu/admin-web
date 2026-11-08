import { fetchStats, postStats } from "./client";
import type { StatsResult } from "./client";
import type { FeedbackCategory, FeedbackPageData, FeedbackStatus } from "./types";

export const ADMIN_FEEDBACK_PATH = "/api/v1/admin/feedback";

export type FeedbackQuery = {
  status?: FeedbackStatus;
  category?: FeedbackCategory;
  userId?: number;
  keyword?: string;
  page?: number;
  pageSize?: number;
};

export function fetchFeedback(params: FeedbackQuery = {}): Promise<StatsResult<FeedbackPageData>> {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.category) search.set("category", params.category);
  if (params.userId !== undefined && Number.isFinite(params.userId)) {
    search.set("user_id", String(params.userId));
  }
  if (params.keyword) search.set("keyword", params.keyword);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  if (params.pageSize && params.pageSize !== 20) search.set("page_size", String(params.pageSize));
  const qs = search.toString();
  return fetchStats<FeedbackPageData>(ADMIN_FEEDBACK_PATH + (qs ? `?${qs}` : ""));
}

/** 处理反馈：更新状态并可选附上给家长的回复。 */
export function handleFeedback(
  id: string,
  body: { status: FeedbackStatus; reply?: string | null },
): Promise<StatsResult<unknown>> {
  return postStats<unknown>(`${ADMIN_FEEDBACK_PATH}/${id}/handle`, body);
}
