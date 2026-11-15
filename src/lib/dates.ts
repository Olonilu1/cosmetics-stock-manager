export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

function utc(ms: [number, number, number]): number {
  return Date.UTC(ms[0], ms[1] - 1, ms[2]);
}

function parseParts(iso: string): [number, number, number] {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return [y, m, d];
}

/** Whole days from `from` to `to`. Positive when `to` is later. */
export function daysBetween(from: string, to: string): number {
  const a = utc(parseParts(from));
  const b = utc(parseParts(to));
  return Math.round((b - a) / 86400000);
}

export function isISODate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function naira(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  const whole = Math.floor(Math.abs(rounded)).toLocaleString("en-NG");
  const decimals = Math.round((Math.abs(rounded) % 1) * 100);
  const sign = rounded < 0 ? "-" : "";
  const frac = decimals > 0 ? "." + String(decimals).padStart(2, "0") : "";
  return `${sign}\u20A6${whole}${frac}`;
}
