import { useEffect, useState } from "react";
import { fetchFeedback, handleFeedback, ADMIN_FEEDBACK_PATH } from "../api/feedback";
import type { FeedbackQuery } from "../api/feedback";
import { statsUrl } from "../api/client";
import type { FeedbackCategory, FeedbackItem, FeedbackStatus } from "../api/types";
import { Empty } from "../components/Empty";
import { KpiCards } from "../components/KpiCards";
import { getToken } from "../lib/auth";
import { stampLabel } from "../lib/format";

/** 反馈管理页：分页查看家长反馈，支持关键词/用户/类别/状态过滤，可展开处理并回复。 */

const PAGE_SIZE = 20;

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
  closed: "已关闭",
};

const STATUS_PILLS: Record<FeedbackStatus, string> = {
  pending: "pill-warn",
  in_progress: "pill-accent",
  resolved: "pill-sage",
  closed: "pill-muted",
};

const FILTERS: { value: FeedbackStatus | "all"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待处理" },
  { value: "in_progress", label: "处理中" },
  { value: "resolved", label: "已解决" },
  { value: "closed", label: "已关闭" },
];

/** 快捷流转按钮：按当前状态给出下一步，点击即按当前回复草稿保存。 */
const QUICK_ACTIONS: Record<FeedbackStatus, { label: string; target: FeedbackStatus }[]> = {
  pending: [
    { label: "开始处理", target: "in_progress" },
    { label: "标记完成", target: "resolved" },
    { label: "关闭", target: "closed" },
  ],
  in_progress: [
    { label: "标记完成", target: "resolved" },
    { label: "关闭", target: "closed" },
  ],
  resolved: [{ label: "重新打开", target: "in_progress" }],
  closed: [{ label: "重新打开", target: "in_progress" }],
};

type Query = {
  status: FeedbackStatus | "all";
  category: FeedbackCategory | "all";
  userId: number | null;
  keyword: string;
  page: number;
};

const INITIAL_QUERY: Query = { status: "all", category: "all", userId: null, keyword: "", page: 1 };

function problemMessage(kind: string, status?: number): string {
  if (kind === "limited") return "请求过于频繁，已保留上一次的数据。";
  if (kind === "network") return "连接不上统计服务，请确认后端已启动。";
  if (kind === "unauthorized") return "登录已过期，请重新登录。";
  return `无法读取反馈列表（HTTP ${status ?? "?"}），请稍后重试。`;
}

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
        const response = await fetch(
          statsUrl(`${ADMIN_FEEDBACK_PATH}/${feedbackId}/images/${assetId}`),
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        );
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
  const [query, setQuery] = useState<Query>(INITIAL_QUERY);
  const [reload, setReload] = useState(0);
  const [items, setItems] = useState<FeedbackItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 文本类过滤输入只在点击“查询”时生效，避免每敲一个字就请求一次。
  const [keywordDraft, setKeywordDraft] = useState("");
  const [userIdDraft, setUserIdDraft] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ status: FeedbackStatus; reply: string }>({
    status: "pending",
    reply: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoading(true);
      const params: FeedbackQuery = { page: query.page, pageSize: PAGE_SIZE };
      if (query.status !== "all") params.status = query.status;
      if (query.category !== "all") params.category = query.category;
      if (query.userId !== null) params.userId = query.userId;
      if (query.keyword) params.keyword = query.keyword;
      const result = await fetchFeedback(params);
      if (!alive) return; // 查询条件已变化，丢弃过期响应
      if (result.ok) {
        setItems(result.data.items);
        setTotal(result.data.total);
        setProblem(null);
      } else {
        setProblem(problemMessage(result.kind, result.status));
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [query, reload]);

  // 待处理总数需要跨全量统计，单独发一个只取 total 的轻量请求。
  useEffect(() => {
    let alive = true;
    void (async () => {
      const result = await fetchFeedback({ status: "pending", page: 1, pageSize: 1 });
      if (alive && result.ok) setPendingTotal(result.data.total);
    })();
    return () => {
      alive = false;
    };
  }, [query, reload]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const applySearch = () => {
    const parsed = Number(userIdDraft.trim());
    setQuery((current) => ({
      ...current,
      userId: userIdDraft.trim() && Number.isFinite(parsed) ? parsed : null,
      keyword: keywordDraft.trim(),
      page: 1,
    }));
  };

  const toggle = (item: FeedbackItem) => {
    if (expandedId === item.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(item.id);
    setDraft({ status: item.status, reply: item.reply ?? "" });
    setSaveError(null);
  };

  const save = async (item: FeedbackItem, overrideStatus?: FeedbackStatus) => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    const result = await handleFeedback(item.id, {
      status: overrideStatus ?? draft.status,
      reply: draft.reply.trim() || null,
    });
    setSaving(false);
    if (!result.ok) {
      setSaveError(
        result.kind === "limited" ? "请求过于频繁，请稍后再试。" : "保存失败，请稍后重试。",
      );
      return;
    }
    setExpandedId(null);
    setReload((mark) => mark + 1);
  };

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
            value: String(pendingTotal),
            foot: `当前筛选共 ${total} 条记录`,
          },
        ]}
      />

      <article className="card feedback-card">
        <header className="card-head">
            <div>
              <h2 className="card-title">用户反馈</h2>
              <p className="card-caption">家长的生成问题、内容质量与建议，附练习上下文</p>
            </div>
          </header>

          <div className="filter-bar">
            <div className="filter-tabs">
              {FILTERS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  className={"filter-tab" + (query.status === tab.value ? " is-active" : "")}
                  onClick={() => setQuery({ ...query, status: tab.value, page: 1 })}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <input
              className="filter-input"
              placeholder="搜索问题描述…"
              value={keywordDraft}
              onChange={(event) => setKeywordDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applySearch();
              }}
            />
            <input
              className="filter-userid"
              placeholder="家长 ID"
              type="number"
              min={1}
              value={userIdDraft}
              onChange={(event) => setUserIdDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applySearch();
              }}
            />
            <select
              value={query.category}
              onChange={(event) =>
                setQuery({
                  ...query,
                  category: event.target.value as FeedbackCategory | "all",
                  page: 1,
                })
              }
            >
              <option value="all">全部类别</option>
              {(Object.keys(CATEGORY_LABELS) as FeedbackCategory[]).map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
            <button className="refresh" type="button" onClick={applySearch}>
              查询
            </button>
            <button
              className="refresh ghost"
              type="button"
              onClick={() => setReload((mark) => mark + 1)}
              disabled={loading}
            >
              刷新
            </button>
          </div>

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
                {(items ?? []).map((item) => (
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
                    onQuick={(target) => void save(item, target)}
                  />
                ))}
                {items !== null && !items.length && (
                  <tr>
                    <td className="text-muted" colSpan={6}>
                      没有符合条件的反馈
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pager">
            <span>
              {loading ? "加载中…" : `第 ${query.page} / ${pageCount} 页 · 共 ${total} 条`}
            </span>
            <button
              className="refresh"
              type="button"
              disabled={query.page <= 1 || loading}
              onClick={() => setQuery({ ...query, page: query.page - 1 })}
            >
              上一页
            </button>
            <button
              className="refresh"
              type="button"
              disabled={query.page >= pageCount || loading}
              onClick={() => setQuery({ ...query, page: query.page + 1 })}
            >
              下一页
            </button>
          </div>
      </article>
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
  onQuick,
}: {
  item: FeedbackItem;
  expanded: boolean;
  draft: { status: FeedbackStatus; reply: string };
  setDraft: (value: { status: FeedbackStatus; reply: string }) => void;
  saving: boolean;
  saveError: string | null;
  onToggle: () => void;
  onSave: () => void;
  onQuick: (target: FeedbackStatus) => void;
}) {
  const who = [item.user?.nickname, item.student ? `${item.student.name}（${item.student.grade}）` : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <>
      <tr className={expanded ? "feedback-row-open" : undefined}>
        <td className="lead">{stampLabel(item.created_at)}</td>
        <td>{CATEGORY_LABELS[item.category] ?? item.category}</td>
        <td>
          {who || "—"}
          {item.user ? <span className="feedback-uid"> #{item.user.id}</span> : null}
        </td>
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
              <div className="feedback-actions">
                <span className="feedback-actions-label">快捷操作：</span>
                {(QUICK_ACTIONS[item.status] ?? []).map((action) => (
                  <button
                    key={action.target}
                    className="refresh"
                    type="button"
                    disabled={saving}
                    onClick={() => onQuick(action.target)}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
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
