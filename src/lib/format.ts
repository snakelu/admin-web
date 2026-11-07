/** 展示用数值格式化：空值显示 —，大数折算万/亿，数字统一 zh-CN 千分位。 */

export function num(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function dash(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : num(value).toLocaleString("zh-CN");
}

export function compact(value: number | null | undefined): string {
  const n = num(value);
  if (n >= 1e8) return (n / 1e8).toFixed(2) + " 亿";
  if (n >= 1e4) return (n / 1e4).toFixed(n >= 1e6 ? 1 : 2) + " 万";
  return n.toLocaleString("zh-CN");
}

export function millis(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const ms = num(value);
  return ms >= 1000 ? (ms / 1000).toFixed(2) + " 秒" : Math.round(ms) + " 毫秒";
}

export function percent(succeeded: number | null | undefined, requests: number | null | undefined): number | null {
  return num(requests) > 0 ? (num(succeeded) / num(requests)) * 100 : null;
}

export function dayLabel(date: string | undefined): string {
  return date ? date.slice(5) : "";
}
