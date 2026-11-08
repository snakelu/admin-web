import { useCallback, useEffect, useState } from "react";
import { fetchFeedback, handleFeedback, ADMIN_FEEDBACK_PATH } from "../api/feedback";
import { statsUrl } from "../api/client";
import type { FeedbackCategory, FeedbackItem, FeedbackStatus } from "../api/types";
import { Empty } from "../components/Empty";
import { KpiCards } from "../components/KpiCards";
import { getToken } from "../lib/auth";
import { stampLabel } from "../lib/format";

/** 反馈管理页：家长提交的问题反馈列表，可展开查看上下文与截图，并更新处理状态和回复。 */

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  generation: "生成问题",
  content: "内容质量",
  photo: "拍照识别",
  suggest: "功能建议",
  other: "其他",
};

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  pending: "待处理",
  in_progress: "处理中",
  resolved: "已解决",
};

const STATUS_PILLS: Record<FeedbackStatus, string> = {
  pending: "pill-warn",
  in_progress: "pill-accent",
  resolved: "pill-sage",
};

const FILTERS: { value: FeedbackStatus | "all"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待处理" },
  { value: "in_progress", label: "处理中" },
  { value: "resolved", label: "已解决" },
];

function statusPill(status: FeedbackStatus) {
  return `pill ${STATUS_PILLS[status]}`;
}

/** 截图必须带管理 token 拉取，img 标签无法带请求头，因此用 fetch blob 转 objectURL。 */
function FeedbackShot({ feedbackId, assetId }: { feedbackId: string; assetId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    let created: string | null = null;
    void (async () => {
      try {
        const token = getToken();
        const response = await fetch(statsUrl(`${ADMIN_FEEDBACK_PATH}/${feedbackId}/images/${assetId}`), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) {
          if (alive) setFailed(true);
          return;
        }
        created = URL.createObjectURL(await response.blob());
        if (alive) setUrl(created);
        else URL.revokeObjectURL(created);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [feedbackId, assetId]);

  if (failed) return <span className="feedback-shot-missing">加载失败</span>;
  return url ? (
    <a href={url} target="_blank" rel="noreferrer">
      <img className="feedback-shot" src={url} alt="反馈截图" />
    </a>
  ) : (
    <span className="feedback-shot-missing">加载中…</span>
  );
}

export function FeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FeedbackStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ status: FeedbackStatus; reply: string }>({
    status: "pending",
    reply: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchFeedback();
    if (result.ok) {
      setItems(result.data);
      setProblem(null);
    } else {
      setProblem(
        result.kind === "limited"
          ? "请求过于频繁，已保留上一次的数据。"
          : result.kind === "network"
            ? "连接不上统计服务，请确认后端已启动。"
            : result.kind === "unauthorized"
              ? "登录已过期，请重新登录。"
              : `无法读取反馈列表（HTTP ${result.status ?? "?"}），请稍后重试。`,
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (item: FeedbackItem) => {
    if (expandedId === item.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(item.id);
    setDraft({ status: item.status, reply: item.reply ?? "" });
    setSaveError(null);
  };

  const save = async (item: FeedbackItem) => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    const result = await handleFeedback(item.id, {
      status: draft.status,
      reply: draft.reply.trim() || null,
    });
    setSaving(false);
    if (!result.ok) {
      setSaveError(
        result.kind === "limited"
          ? "请求过于频繁，请稍后再试。"
          : "保存失败，请稍后重试。",
      );
      return;
    }
    setExpandedId(null);
    await load();
  };

  const list = items ?? [];
  const filtered = filter === "all" ? list : list.filter((item) => item.status === filter);
  const pendingCount = list.filter((item) => item.status === "pending").length;

  if (items === null && problem === null) {
    return (
      <Empty
        title="正在读取用户反馈"
        text="正在从反馈接口读取数据，请稍候；如果长时间无响应，请检查后端服务。"
      />
    );
  }

  return (
    <>
      <KpiCards
        cards={[
          {
            label: "待处理反馈",
            value: String(pendingCount),
            foot: `共 ${list.length} 条反馈记录`,
          },
        ]}
      />

      <section className="split">
        <article className="card feedback-card">
          <header className="card-head">
            <div>
              <h2 className="card-title">用户反馈</h2>
              <p className="card-caption">家长的生成问题、内容质量与建议，附练习上下文</p>
            </div>
            <div className="filter-tabs">
              {FILTERS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  className={"filter-tab" + (filter === tab.value ? " is-active" : "")}
                  onClick={() => setFilter(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
              <button className="refresh" type="button" onClick={() => void load()} disabled={loading}>
                刷新
              </button>
            </div>
          </header>

          {problem ? <p className="notice">{problem}</p> : null}

          <div className="table-wrap">
            <table className="grid">
              <thead>
                <tr>
                  <th className="lead">时间</th>
                  <th>类别</th>
                  <th>家长 · 孩子</th>
                  <th>内容</th>
                  <th>状态</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <FeedbackRow
                    key={item.id}
                    item={item}
                    expanded={expandedId === item.id}
                    draft={draft}
                    setDraft={setDraft}
                    saving={saving}
                    saveError={saveError}
                    onToggle={() => toggle(item)}
                    onSave={() => void save(item)}
                  />
                ))}
                {!filtered.length && (
                  <tr>
                    <td className="text-muted" colSpan={6}>
                      {items === null ? "正在读取反馈…" : "暂无该状态的反馈"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </>
  );
}

function FeedbackRow({
  item,
  expanded,
  draft,
  setDraft,
  saving,
  saveError,
  onToggle,
  onSave,
}: {
  item: FeedbackItem;
  expanded: boolean;
  draft: { status: FeedbackStatus; reply: string };
  setDraft: (value: { status: FeedbackStatus; reply: string }) => void;
  saving: boolean;
  saveError: string | null;
  onToggle: () => void;
  onSave: () => void;
}) {
  const who = [item.user?.nickname, item.student ? `${item.student.name}（${item.student.grade}）` : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <>
      <tr className={expanded ? "feedback-row-open" : undefined}>
        <td className="lead">{stampLabel(item.created_at)}</td>
        <td>{CATEGORY_LABELS[item.category] ?? item.category}</td>
        <td>{who || "—"}</td>
        <td className="feedback-content">{item.content}</td>
        <td>
          <span className={statusPill(item.status)}>{STATUS_LABELS[item.status]}</span>
        </td>
        <td>
          <button className="refresh ghost" type="button" onClick={onToggle}>
            {expanded ? "收起" : "处理"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6}>
            <div className="feedback-detail">
              <p className="feedback-full">{item.content}</p>
              <dl className="feedback-facts">
                {item.assignment && (
                  <>
                    <dt>关联练习</dt>
                    <dd>
                      {item.assignment.title}（
                      {item.assignment.kind === "writing"
                        ? "作文"
                        : item.assignment.kind === "english_writing"
                          ? "英语作文"
                          : "阅读理解"}
                      ）
                    </dd>
                  </>
                )}
                {item.contact && (
                  <>
                    <dt>联系方式</dt>
                    <dd>{item.contact}</dd>
                  </>
                )}
                {item.client_env && (
                  <>
                    <dt>设备信息</dt>
                    <dd>
                      {Object.entries(item.client_env)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(" · ")}
                    </dd>
                  </>
                )}
                <dt>处理记录</dt>
                <dd>
                  {item.handled_by
                    ? `${item.handled_by} · ${stampLabel(item.handled_at)}`
                    : "尚未处理"}
                </dd>
              </dl>
              {item.images.length > 0 && (
                <div className="feedback-shots">
                  {item.images.map((assetId) => (
                    <FeedbackShot key={assetId} feedbackId={item.id} assetId={assetId} />
                  ))}
                </div>
              )}
              <div className="feedback-form">
                <label>
                  状态
                  <select
                    value={draft.status}
                    onChange={(event) =>
                      setDraft({ ...draft, status: event.target.value as FeedbackStatus })
                    }
                  >
                    {(Object.keys(STATUS_LABELS) as FeedbackStatus[]).map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  回复家长（家长端“反馈进度”里可见）
                  <textarea
                    value={draft.reply}
                    maxLength={500}
                    rows={3}
                    placeholder="例如：已定位为识别问题，本周内会改进…"
                    onChange={(event) => setDraft({ ...draft, reply: event.target.value })}
                  />
                </label>
                {saveError ? <p className="text-bad">{saveError}</p> : null}
                <button className="refresh feedback-save" type="button" onClick={onSave} disabled={saving}>
                  {saving ? "保存中…" : "保存处理结果"}
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
