import { Empty } from "../components/Empty";
import { KpiCards } from "../components/KpiCards";
import { LineChart } from "../components/LineChart";
import { Ring } from "../components/Ring";
import { StackedBarChart } from "../components/StackedBarChart";
import type { UserStatsSnapshot } from "../api/types";
import { dash, num, percent } from "../lib/format";

/** 用户行为页：注册/作业/导学/点评/活跃 KPI、每日请求量、行为构成、按天明细、完成情况。 */
export function UserPage({ data }: { data: UserStatsSnapshot | null }) {
  if (!data) {
    return (
      <Empty
        title="正在读取用户行为"
        text="正在从统计接口读取数据，请稍候；如果长时间无响应，请检查后端服务。"
      />
    );
  }

  const { users, assignments, turns, active_users: active, days } = data;
  const rate = percent(turns.succeeded, turns.total);
  const isEmpty = num(users.total) === 0 && num(turns.total) === 0;

  return (
    <>
      <KpiCards
        cards={[
          {
            label: "注册用户",
            value: dash(users.total),
            unit: " 人",
            foot: `今日 ${dash(users.today)} · 近7天 ${dash(users.last7days)}`,
          },
          {
            label: "作业总数",
            value: dash(assignments.total),
            foot: `作文 ${dash(assignments.writing)} · 阅读 ${dash(assignments.reading)}`,
            badge: `今日 ${dash(assignments.today)} 份`,
            tone: "pill-accent",
          },
          {
            label: "导学请求",
            value: dash(turns.guidance),
            foot: `作文 ${dash(turns.writing_guidance)} · 阅读 ${dash(turns.reading_guidance)}`,
          },
          {
            label: "点评请求",
            value: dash(turns.review),
            foot: `作文 ${dash(turns.writing_review)} · 阅读 ${dash(turns.reading_review)}`,
          },
          {
            label: "今日活跃",
            value: dash(active.today),
            unit: " 人",
            foot: `近7天 ${dash(active.last7days)} 人活跃`,
          },
        ]}
      />

      <section className="charts">
        <article className="card chart-card">
          <header className="card-head">
            <div>
              <h2 className="card-title">每日请求量</h2>
              <p className="card-caption">用户提交的导学与点评轮次</p>
            </div>
            <span className="tag">
              {days.length ? `合计 ${dash(days.reduce((sum, d) => sum + num(d.turns), 0))}` : "—"}
            </span>
          </header>
          <LineChart
            days={days}
            value={(day) => num(day.turns)}
            tipRows={(day) => [
              ["轮次", dash(day.turns)],
              ["导学", dash(day.guidance)],
              ["点评", dash(day.review)],
              ["活跃用户", dash(day.active_users)],
              ["新增注册", dash(day.new_users)],
            ]}
          />
        </article>

        <article className="card chart-card">
          <header className="card-head">
            <div>
              <h2 className="card-title">行为构成</h2>
              <p className="card-caption">每天的导学与点评分布</p>
            </div>
            <span className="legend">
              <span className="legend-item">
                <i className="swatch swatch-in" />
                导学
              </span>
              <span className="legend-item">
                <i className="swatch swatch-out" />
                点评
              </span>
            </span>
          </header>
          <StackedBarChart
            days={days}
            total={(day) => num(day.turns)}
            segments={[
              { read: (day) => num(day.guidance), cls: "bar-in" },
              { read: (day) => num(day.review), cls: "bar-out" },
            ]}
            tipRows={(day, total) => [
              ["导学", dash(day.guidance)],
              ["点评", dash(day.review)],
              ["合计", dash(total)],
              ["活跃用户", dash(day.active_users)],
            ]}
          />
        </article>
      </section>

      <section className="split">
        <article className="card">
          <header className="card-head">
            <div>
              <h2 className="card-title">按天明细</h2>
              <p className="card-caption">注册、作业与轮次的逐日走势</p>
            </div>
            <span className="tag">{days.length ? `${days.length} 天` : "—"}</span>
          </header>
          <div className="table-wrap">
            <table className="grid">
              <thead>
                <tr>
                  <th className="lead">日期</th>
                  <th>新增注册</th>
                  <th>作业</th>
                  <th>轮次</th>
                  <th>导学</th>
                  <th>点评</th>
                  <th>活跃用户</th>
                </tr>
              </thead>
              <tbody>
                {[...days].reverse().map((day) => (
                  <tr key={day.date}>
                    <td className="lead">{day.date}</td>
                    <td>{dash(day.new_users)}</td>
                    <td>{dash(day.assignments)}</td>
                    <td>{dash(day.turns)}</td>
                    <td>{dash(day.guidance)}</td>
                    <td>{dash(day.review)}</td>
                    <td>{dash(day.active_users)}</td>
                  </tr>
                ))}
                {!days.length && (
                  <tr>
                    <td className="text-muted" colSpan={7}>
                      暂无每日记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card gauge-card">
          <header className="card-head">
            <div>
              <h2 className="card-title">轮次完成情况</h2>
              <p className="card-caption">成功占比与待处理轮次</p>
            </div>
          </header>
          <Ring rate={rate} label="完成率" />
          <dl className="window">
            <dt>成功</dt>
            <dd>{dash(turns.succeeded)}</dd>
            <dt>待补图</dt>
            <dd>{dash(turns.needs_input)}</dd>
            <dt>失败</dt>
            <dd className={num(turns.failed) > 0 ? "text-bad" : undefined}>{dash(turns.failed)}</dd>
            <dt>进行中</dt>
            <dd>{dash(turns.in_progress)}</dd>
            <dt>今日活跃</dt>
            <dd>{dash(active.today)} 人</dd>
          </dl>
        </article>
      </section>

      {isEmpty && (
        <Empty
          title="还没有用户行为记录"
          text="第一位家长注册、第一次导学或点评完成后，这里会出现用户关键行为统计。"
        />
      )}
    </>
  );
}
