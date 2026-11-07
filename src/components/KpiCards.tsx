export type KpiTone = "pill-warn" | "pill-sage" | "pill-accent";

export interface KpiCardItem {
  label: string;
  value: string;
  unit?: string;
  foot: string;
  badge?: string;
  tone?: KpiTone;
}

/** KPI 主卡区：大数字 + 脚注 + 可选徽标。 */
export function KpiCards({ cards }: { cards: KpiCardItem[] }) {
  return (
    <section className="kpis" aria-label="总览指标">
      {cards.map((card) => (
        <article className="kpi" key={card.label}>
          <span className="kpi-label">{card.label}</span>
          <span className="kpi-value">
            {card.value}
            {card.unit ? <span className="kpi-unit">{card.unit}</span> : null}
          </span>
          <div className="kpi-foot">
            {card.badge && card.tone ? <span className={`pill ${card.tone}`}>{card.badge}</span> : null}
            <span>{card.foot}</span>
          </div>
        </article>
      ))}
    </section>
  );
}
