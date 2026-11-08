import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useOutletContext } from "react-router-dom";
import { statsUrl } from "./api/client";
import { fetchModelStats, fetchUserStats, MODEL_STATS_PATH, USER_STATS_PATH } from "./api/stats";
import type { ModelStatsSnapshot, UserStatsSnapshot } from "./api/types";
import { useStatsData } from "./hooks/useStatsData";
import type { StatsData, StatsProblem } from "./hooks/useStatsData";
import { Empty } from "./components/Empty";
import { clearSession, getUsername, onUnauthorized } from "./lib/auth";

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
    case "unauthorized":
      return "登录已过期";
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
    case "unauthorized":
      return "登录已过期，请重新登录。";
  }
}

/** 全局布局：页头（实时状态/刷新/退出）+ Tab 导航 + 当前页面 + 页脚。两个统计接口都在这里轮询。 */
export default function App() {
  const navigate = useNavigate();
  const model = useStatsData(fetchModelStats, REFRESH_MS);
  const user = useStatsData(fetchUserStats, REFRESH_MS);
  // 登录名只决定顶栏显示；登录态本身以 token 为准，401 时由下方订阅统一处理。
  const [username, setUsername] = useState(getUsername);

  // 任一接口返回 401：fetch 封装已清掉本地登录态，这里跳去登录页。
  useEffect(() => onUnauthorized(() => navigate("/login", { replace: true })), [navigate]);

  const refresh = useCallback(() => {
    model.refresh();
    user.refresh();
  }, [model.refresh, user.refresh]);

  const logout = useCallback(() => {
    clearSession();
    setUsername(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  // 登录态失效交给跳转处理，不作为面板错误展示。
  const visibleProblem = [model.problem, user.problem].find(
    (problem) => problem && problem.kind !== "unauthorized",
  );
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
          <span className={"live" + (visibleProblem ? " is-down" : "")}>
            <span className="live-dot" aria-hidden="true" />
            <span>{visibleProblem ? problemState(visibleProblem) : "实时"}</span>
          </span>
          <span className="stamp">{stamp ? "更新于 " + stamp.replace("T", " ") : "—"}</span>
          {username ? <span className="stamp">{username}</span> : null}
          <button
            className="refresh"
            type="button"
            onClick={refresh}
            disabled={model.loading || user.loading}
          >
            刷新
          </button>
          <button className="refresh ghost" type="button" onClick={logout}>
            退出
          </button>
        </div>
      </header>

      {visibleProblem ? <p className="notice">{problemMessage(visibleProblem)}</p> : null}

      <nav className="tabs" aria-label="统计分类">
        <NavLink to="/model" className={tabClass}>
          模型用量
        </NavLink>
        <NavLink to="/users" className={tabClass}>
          用户行为
        </NavLink>
        <NavLink to="/feedback" className={tabClass}>
          用户反馈
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
