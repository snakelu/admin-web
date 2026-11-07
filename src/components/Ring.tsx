/** 成功率环：>=90% 草绿，否则暖橙；无数据显示灰色空环。 */
export function Ring({ rate, label }: { rate: number | null; label: string }) {
  const circumference = 2 * Math.PI * 52;
  const offset = rate === null ? circumference : circumference * (1 - rate / 100);
  const stroke = rate === null ? "var(--line)" : rate >= 90 ? "var(--sage)" : "var(--accent)";

  return (
    <div className="gauge">
      <svg className="ring" viewBox="0 0 120 120" role="img" aria-label={label}>
        <circle className="ring-track" cx="60" cy="60" r="52" />
        <circle
          className="ring-value"
          cx="60"
          cy="60"
          r="52"
          style={{ strokeDasharray: String(circumference), strokeDashoffset: String(offset), stroke }}
        />
      </svg>
      <div className="gauge-center">
        <span className="gauge-number">{rate === null ? "—" : rate.toFixed(1) + "%"}</span>
        <span className="gauge-label">{label}</span>
      </div>
    </div>
  );
}
