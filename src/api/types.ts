/** 接口返回的模型用量统计（GET {API_BASE}/api/v1/model/stats）。 */

export interface ModelUsage {
  model: string;
  requests: number;
  succeeded: number;
  failed: number;
  prompt_tokens: number;
  completion_tokens: number;
}

export interface Counters {
  requests: number;
  succeeded: number;
  failed: number;
  fallbacks: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  avg_prompt_tokens: number | null;
  avg_completion_tokens: number | null;
  avg_tokens: number | null;
  avg_duration_ms: number | null;
  models: ModelUsage[];
}

export interface ModelDay extends Counters {
  date: string;
}

export interface ModelStatsSnapshot {
  generated_at: string;
  window_seconds: number;
  window: Counters;
  totals: Counters;
  days: ModelDay[];
}

/** 接口返回的用户行为统计（GET {API_BASE}/api/v1/user/stats）。 */

export interface UserDay {
  date: string;
  new_users: number;
  assignments: number;
  turns: number;
  guidance: number;
  review: number;
  active_users: number;
}

export interface UserStatsSnapshot {
  generated_at: string;
  users: { total: number; today: number; last7days: number };
  assignments: {
    total: number;
    writing: number;
    reading: number;
    today: number;
    last7days: number;
  };
  turns: {
    total: number;
    today: number;
    last7days: number;
    guidance: number;
    review: number;
    writing_guidance: number;
    reading_guidance: number;
    writing_review: number;
    reading_review: number;
    succeeded: number;
    needs_input: number;
    failed: number;
    in_progress: number;
  };
  active_users: { today: number; last7days: number };
  days: UserDay[];
}
