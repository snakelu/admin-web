import { useCallback } from "react";
import { NavLink, Outlet, useOutletContext } from "react-router-dom";
import { statsUrl } from "./api/client";
import { fetchModelStats, fetchUserStats, MODEL_STATS_PATH, USER_STATS_PATH } from "./api/stats";
import type { ModelStatsSnapshot, UserStatsSnapshot } from "./api/types";
import { useStatsData } from "./hooks/useStatsData";
import type { StatsData, StatsProblem } from "./hooks/useStatsData";
import { Empty } from "./components/Empty";

const REFRESH_MS = 15000;

export type AppContext = {
  model: StatsData<ModelStatsSnapshot>;
  user: StatsData<UserStatsSnapshot>;
};

export function useAppData(): AppContext {
  return useOutletContext<AppContext>();
}

function problemState(problem: StatsProblem): string {
  switch (problem.kind) {
    case "limited":
      return "请求过快";
    case "network":
      return "连接失败";
    case "http":
      return "服务异常";
  }
}

function problemMessage(problem: StatsProblem): string {
  switch (problem.kind) {
    case "limited":
      return "请求过于频繁，已保留上一次的数据，稍后自动重试。";
    case "network":
      return "连接不上统计服务，请确认后端已启动。";
    case "http":
      return `无法读取统计数据（HTTP ${problem.status ?? "?"}），请稍后重试。`;
  }
}

/** 全局布局：页头（实时状态/刷新）+ Tab 导航 + 当前页面 + 页脚。两个统计接口都在这里轮询。 */
export default function App() {
  const model = useStatsData(fetchModelStats, REFRESH_MS);
  const user = useStatsData(fetchUserStats, REFRESH_MS);

  const refresh = useCallback(() => {
    model.refresh();
    user.refresh();
  }, [model.refresh, user.refresh]);

  const problem = model.problem ?? user.problem;
  const stamp = [model.data?.generated_at, user.data?.generated_at]
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  const tabClass = ({ isActive }: { isActive: boolean }) => "tab" + (isActive ? " is-active" : "");

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-lead">
          <span className="seal" aria-hidden="true">
            量
          </span>
          <div>
            <span className="eyebrow">USAGE DASHBOARD</span>
            <h1 className="topbar-title">用量看板</h1>
          </div>
        </div>
        <div className="topbar-tail">
          <span className={"live" + (problem ? " is-down" : "")}>
            <span className="live-dot" aria-hidden="true" />
            <span>{problem ? problemState(problem) : "实时"}</span>
          </span>
          <span className="stamp">{stamp ? "更新于 " + stamp.replace("T", " ") : "—"}</span>
          <button className="refresh" type="button" onClick={refresh} disabled={model.loading || user.loading}>
            刷新
          </button>
        </div>
      </header>

      {problem ? <p className="notice">{problemMessage(problem)}</p> : null}

      <nav className="tabs" aria-label="统计分类">
        <NavLink to="/model" className={tabClass}>
          模型用量
        </NavLink>
        <NavLink to="/users" className={tabClass}>
          用户行为
        </NavLink>
      </nav>

      {model.data || user.data ? (
        <Outlet context={{ model, user } satisfies AppContext} />
      ) : (
        <Empty
          title="正在连接统计服务"
          text="正在读取模型用量与用户行为数据；如果长时间无响应，请确认后端已启动、接口地址配置正确。"
        />
      )}

      <footer className="foot">
        <span>
          数据来自 <code>{statsUrl(MODEL_STATS_PATH)}</code> 与 <code>{statsUrl(USER_STATS_PATH)}</code>
          ，每 15 秒自动刷新。
        </span>
        <span>用量持久化在数据库，重启不丢失。</span>
      </footer>
    </div>
  );
}
