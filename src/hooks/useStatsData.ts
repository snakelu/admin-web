import { useCallback, useEffect, useRef, useState } from "react";
import type { StatsResult } from "../api/client";

export type StatsProblem = {
  kind: "limited" | "unauthorized" | "http" | "network";
  status?: number;
};

export type StatsData<T> = {
  data: T | null;
  problem: StatsProblem | null;
  loading: boolean;
  refresh: () => void;
};

/**
 * 定时轮询一个统计接口：15 秒一次 + 手动刷新。
 * 出现 429 等问题时保留上一次的数据，只把问题挂到 problem 上。
 */
export function useStatsData<T>(
  fetcher: () => Promise<StatsResult<T>>,
  intervalMs: number,
): StatsData<T> {
  const [data, setData] = useState<T | null>(null);
  const [problem, setProblem] = useState<StatsProblem | null>(null);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const result = await fetcherRef.current();
      if (result.ok) {
        setData(result.data);
        setProblem(null);
      } else {
        setProblem({ kind: result.kind, status: result.status });
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), intervalMs);
    return () => window.clearInterval(timer);
  }, [load, intervalMs]);

  return { data, problem, loading, refresh: () => void load() };
}
