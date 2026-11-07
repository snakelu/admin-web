import { Empty } from "../components/Empty";
import { KpiCards } from "../components/KpiCards";
import { LineChart } from "../components/LineChart";
import { Ring } from "../components/Ring";
import { StackedBarChart } from "../components/StackedBarChart";
import type { ModelStatsSnapshot } from "../api/types";
import { compact, dash, millis, num, percent } from "../lib/format";

/** 模型用量页：KPI、每日请求量、Token 构成、按模型明细、调用健康度、按天明细。 */
export function ModelPage({ data }: { data: ModelStatsSnapshot | null }) {
  if (!data) {
    return (
      <Empty
        title="正在读取模型用量"
        text="正在从统计接口读取数据，请稍候；如果长时间无响应，请检查后端服务。"
      />
    );
  }

  const totals = data.totals;
  const days = data.days;
  const rate = percent(totals.succeeded, totals.requests);
  const windowMinutes = Math.round(num(data.window_seconds) / 60);

  return (
    <>
      <KpiCards
        cards={[
          {
            label: "总请求数",
            value: compact(totals.requests),
            foot: `${dash(totals.requests)} 次调用`,
          },
          {
            label: "成功率",
            value: rate === null ? "—" : rate.toFixed(1),
            unit: rate === null ? undefined : "%",
            foot: `成功 ${dash(totals.succeeded)} · 失败 ${dash(totals.failed)}`,
            badge: totals.failed > 0 ? `${dash(totals.failed)} 次失败` : "无失败",
            tone: totals.failed > 0 ? "pill-warn" : "pill-sage",
          },
          {
            label: "总 Tokens",
            value: compact(totals.total_tokens),
            foot: `输入 ${compact(totals.prompt_tokens)} · 输出 ${compact(totals.completion_tokens)}`,
          },
          {
            label: "平均每次 Tokens",
            value: dash(totals.avg_tokens),
            foot: `输入 ${dash(totals.avg_prompt_tokens)} · 输出 ${dash(totals.avg_completion_tokens)}`,
          },
          {
            label: "平均用时",
            value: totals.avg_duration_ms === null ? "—" : (num(totals.avg_duration_ms) / 1000).toFixed(2),
            unit: totals.avg_duration_ms === null ? undefined : " 秒",
            foot: `${dash(totals.fallbacks)} 次备用接管`,
            badge: totals.fallbacks > 0 ? `${dash(totals.fallbacks)} 次切换` : undefined,
            tone: "pill-accent",
          },
        ]}
      />

      <section className="charts">
        <article className="card chart-card">
          <header className="card-head">
            <div>
              <h2 className="card-title">每日请求量</h2>
              <p className="card-caption">按天统计的模型调用次数</p>
            </div>
            <span className="tag">
              {days.length ? `合计 ${dash(days.reduce((sum, d) => sum + num(d.requests), 0))}` : "—"}
            </span>
          </header>
          <LineChart
            days={days}
            value={(day) => num(day.requests)}
            tipRows={(day) => [
              ["请求", dash(day.requests)],
              ["成功", dash(day.succeeded)],
              ["失败", dash(day.failed)],
              ["Tokens", dash(day.total_tokens)],
            ]}
          />
        </article>

        <article className="card chart-card">
          <header className="card-head">
            <div>
              <h2 className="card-title">Token 构成</h2>
              <p className="card-caption">每天的输入与输出 Token 分布</p>
            </div>
            <span className="legend">
              <span className="legend-item">
                <i className="swatch swatch-in" />
                输入
              </span>
              <span className="legend-item">
                <i className="swatch swatch-out" />
                输出
              </span>
            </span>
          </header>
          <StackedBarChart
            days={days}
            total={(day) => num(day.total_tokens)}
            segments={[
              { read: (day) => num(day.prompt_tokens), cls: "bar-in" },
              { read: (day) => num(day.completion_tokens), cls: "bar-out" },
            ]}
            tipRows={(day, total) => [
              ["输入", dash(day.prompt_tokens)],
              ["输出", dash(day.completion_tokens)],
              ["合计", dash(total)],
              ["请求", dash(day.requests)],
            ]}
          />
        </article>
      </section>

      <section className="split">
        <article className="card">
          <header className="card-head">
            <div>
              <h2 className="card-title">按模型明细</h2>
              <p className="card-caption">累计调用与 Token 消耗</p>
            </div>
            <span className="tag">{totals.models.length ? `${totals.models.length} 个模型` : "—"}</span>
          </header>
          <div className="table-wrap">
            <table className="grid">
              <thead>
                <tr>
                  <th className="lead">模型</th>
                  <th>请求</th>
                  <th>成功</th>
                  <th>失败</th>
                  <th>输入</th>
                  <th>输出</th>
                  <th>合计</th>
                </tr>
              </thead>
              <tbody>
                {totals.models.map((model) => (
                  <tr key={model.model}>
                    <td className="lead">
                      <div className="model-name">
                        <i className="model-dot" style={{ background: "var(--accent)" }} />
                        <span>{model.model}</span>
                        <span className="model-bar">
                          <span
                            style={{
                              width: `${Math.min(100, totals.requests > 0 ? (num(model.requests) / totals.requests) * 100 : 0)}%`,
                            }}
                          />
                        </span>
                      </div>
                    </td>
                    <td>{dash(model.requests)}</td>
                    <td className={num(model.failed) > 0 ? undefined : "text-good"}>{dash(model.succeeded)}</td>
                    <td className={num(model.failed) > 0 ? "text-bad" : undefined}>{dash(model.failed)}</td>
                    <td>{dash(model.prompt_tokens)}</td>
                    <td>{dash(model.completion_tokens)}</td>
                    <td>{dash(num(model.prompt_tokens) + num(model.completion_tokens))}</td>
                  </tr>
                ))}
                {!totals.models.length && (
                  <tr>
                    <td className="text-muted" colSpan={7}>
                      暂无模型调用记录
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
              <h2 className="card-title">调用健康度</h2>
              <p className="card-caption">成功率与当前汇总窗口</p>
            </div>
          </header>
          <Ring rate={rate} label="成功率" />
          <dl className="window">
            <dt>窗口时长</dt>
            <dd>{windowMinutes} 分钟</dd>
            <dt>窗口内请求</dt>
            <dd>{dash(data.window.requests)}</dd>
            <dt>平均 Tokens</dt>
            <dd>{dash(data.window.avg_tokens)}</dd>
            <dt>平均用时</dt>
            <dd>{millis(data.window.avg_duration_ms)}</dd>
            <dt>备用切换</dt>
            <dd>{dash(data.window.fallbacks)}</dd>
          </dl>
        </article>
      </section>

      <section className="card">
        <header className="card-head">
          <div>
            <h2 className="card-title">按天明细</h2>
            <p className="card-caption">逐日用量与均值</p>
          </div>
          <span className="tag">{days.length ? `${days.length} 天` : "—"}</span>
        </header>
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th className="lead">日期</th>
                <th>请求</th>
                <th>成功</th>
                <th>失败</th>
                <th>备用切换</th>
                <th>输入</th>
                <th>输出</th>
                <th>合计</th>
                <th>平均 Tokens</th>
                <th>平均用时</th>
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((day) => (
                <tr key={day.date}>
                  <td className="lead">{day.date}</td>
                  <td>{dash(day.requests)}</td>
                  <td className={num(day.failed) > 0 ? undefined : "text-good"}>{dash(day.succeeded)}</td>
                  <td className={num(day.failed) > 0 ? "text-bad" : undefined}>{dash(day.failed)}</td>
                  <td className={num(day.fallbacks) > 0 ? "text-bad" : undefined}>{dash(day.fallbacks)}</td>
                  <td>{dash(day.prompt_tokens)}</td>
                  <td>{dash(day.completion_tokens)}</td>
                  <td>{dash(day.total_tokens)}</td>
                  <td>{dash(day.avg_tokens)}</td>
                  <td>{millis(day.avg_duration_ms)}</td>
                </tr>
              ))}
              {!days.length && (
                <tr>
                  <td className="text-muted" colSpan={10}>
                    暂无每日记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {num(totals.requests) === 0 && (
        <Empty
          title="还没有模型调用记录"
          text="第一次拍照导学或作答点评完成后，这里会出现调用量、Token 与成功率。"
        />
      )}
    </>
  );
}
