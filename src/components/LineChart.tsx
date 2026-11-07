import { useId, useRef, useState } from "react";
import { compact, dayLabel, dash, num } from "../lib/format";

const W = 640;
const H = 250;
const PAD = { top: 18, right: 16, bottom: 30, left: 44 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;
const TICKS = 4;

type Hover = { index: number; left: number; top: number };

interface LineChartProps<T> {
  days: T[];
  value: (day: T) => number;
  tipRows: (day: T) => [string, string][];
}

/** 每日请求量折线图：渐变面积 + 描边 + hover 十字线浮层。 */
export function LineChart<T extends { date: string }>({ days, value, tipRows }: LineChartProps<T>) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const gradId = "line-fill-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");

  const total = days.reduce((sum, day) => sum + value(day), 0);
  const max = Math.max(1, ...days.map(value));
  const step = days.length > 1 ? INNER_W / (days.length - 1) : 0;
  const points = days.map((day, index) => ({
    x: days.length > 1 ? PAD.left + step * index : PAD.left + INNER_W / 2,
    y: PAD.top + INNER_H - (value(day) / max) * INNER_H,
    day,
  }));
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
  const area =
    points.length > 1
      ? `${line} L${points[points.length - 1].x} ${PAD.top + INNER_H} L${points[0].x} ${PAD.top + INNER_H} Z`
      : null;
  const every = Math.max(1, Math.ceil(days.length / 8));

  function showTip(index: number) {
    const host = hostRef.current;
    const scale = host ? host.getBoundingClientRect().width / W : 1;
    setHover({
      index,
      left: Math.max(78, Math.min((host?.clientWidth ?? 0) - 78, points[index].x * scale)),
      top: Math.max(46, points[index].y * scale),
    });
  }

  return (
    <div className="chart-body" ref={hostRef}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="每日请求量折线图">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity=".24" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: TICKS + 1 }, (_, i) => {
          const v = (max / TICKS) * i;
          const y = PAD.top + INNER_H - (v / max) * INNER_H;
          return (
            <g key={i}>
              <line className="grid-line" x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} />
              <text className="axis-label" x={PAD.left - 8} y={y + 3} textAnchor="end">
                {compact(Math.round(v))}
              </text>
            </g>
          );
        })}
        {area && <path className="trend-area" d={area} style={{ fill: `url(#${gradId})` }} />}
        {points.length > 1 && <path className="trend-line" d={line} />}
        {points.map(
          (p, i) =>
            (i % every === 0 || i === points.length - 1) && (
              <g key={p.day.date}>
                <circle className="trend-dot" cx={p.x} cy={p.y} r={3.2} />
                <text className="axis-label" x={p.x} y={H - 10} textAnchor="middle">
                  {dayLabel(p.day.date)}
                </text>
              </g>
            ),
        )}
        {hover !== null && (
          <line
            className="crosshair"
            x1={points[hover.index].x}
            y1={PAD.top}
            x2={points[hover.index].x}
            y2={PAD.top + INNER_H}
          />
        )}
        {points.map((p, i) => (
          <rect
            key={p.day.date}
            className="trend-hit"
            x={p.x - step / 2 - 8}
            y={PAD.top}
            width={Math.max(step, 26)}
            height={INNER_H}
            onMouseEnter={() => showTip(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      {hover !== null && (
        <div className="tooltip is-on" style={{ left: hover.left, top: hover.top }}>
          <span className="tooltip-title">{points[hover.index].day.date}</span>
          {tipRows(points[hover.index].day).map(([label, text]) => (
            <span className="tooltip-row" key={label}>
              <span>{label}</span>
              <b>{text}</b>
            </span>
          ))}
        </div>
      )}
      {!days.length && <span className="axis-label chart-hint">暂无数据</span>}
      <span className="visually-hidden">{`合计 ${dash(total)}，峰值 ${dash(num(max))}`}</span>
    </div>
  );
}
