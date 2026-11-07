import { useRef, useState } from "react";
import { compact, dayLabel, dash, num } from "../lib/format";

const W = 560;
const H = 250;
const PAD = { top: 18, right: 14, bottom: 30, left: 48 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;
const TICKS = 4;

type Hover = { index: number; left: number; top: number };

interface Segment<T> {
  /** 从一天的数据里读出该段的数值。 */
  read: (day: T) => number;
  /** 段的填充样式类（bar-in / bar-out）。 */
  cls: string;
}

interface StackedBarChartProps<T> {
  days: T[];
  /** 每天的总量，决定纵轴刻度与浮层里的“合计”。 */
  total: (day: T) => number;
  /** 段自下而上堆叠。 */
  segments: Segment<T>[];
  tipRows: (day: T, total: number) => [string, string][];
}

/** 堆叠柱状图：如 Token 输入/输出、导学/点评的每日构成。 */
export function StackedBarChart<T extends { date: string }>({
  days,
  total,
  segments,
  tipRows,
}: StackedBarChartProps<T>) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);

  const max = Math.max(1, ...days.map(total));
  const slot = days.length ? INNER_W / days.length : INNER_W;
  const barW = Math.min(40, slot * 0.58);
  const every = Math.max(1, Math.ceil(days.length / 8));
  const base = PAD.top + INNER_H;

  function showTip(index: number) {
    const host = hostRef.current;
    const scale = host ? host.getBoundingClientRect().width / W : 1;
    const topY = base - (total(days[index]) / max) * INNER_H;
    setHover({
      index,
      left: Math.max(78, Math.min((host?.clientWidth ?? 0) - 78, (PAD.left + slot * index + slot / 2) * scale)),
      top: Math.max(46, topY * scale),
    });
  }

  return (
    <div className="chart-body" ref={hostRef}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="每日构成堆叠柱状图">
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
        {days.map((day, index) => {
          const cx = PAD.left + slot * index + slot / 2;
          let offset = 0;
          return (
            <g key={day.date}>
              {segments.map((segment, segIndex) => {
                const h = (segment.read(day) / max) * INNER_H;
                const rect = h > 0 && (
                  <rect
                    key={segIndex}
                    className={segment.cls}
                    x={cx - barW / 2}
                    y={base - offset - h}
                    width={barW}
                    height={h}
                    rx={Math.min(4, barW / 4)}
                  />
                );
                offset += h;
                return rect;
              })}
              {(index % every === 0 || index === days.length - 1) && (
                <text className="axis-label" x={cx} y={H - 10} textAnchor="middle">
                  {dayLabel(day.date)}
                </text>
              )}
              <rect
                className="bar-hit"
                x={PAD.left + slot * index}
                y={PAD.top}
                width={slot}
                height={INNER_H}
                onMouseEnter={() => showTip(index)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="tooltip is-on" style={{ left: hover.left, top: hover.top }}>
          <span className="tooltip-title">{days[hover.index].date}</span>
          {tipRows(days[hover.index], total(days[hover.index])).map(
            ([label, text]) => (
              <span className="tooltip-row" key={label}>
                <span>{label}</span>
                <b>{text}</b>
              </span>
            ),
          )}
        </div>
      )}
      {!days.length && <span className="axis-label chart-hint">暂无数据</span>}
      <span className="visually-hidden">{`合计 ${dash(num(days.reduce((sum, d) => sum + total(d), 0)))}`}</span>
    </div>
  );
}
