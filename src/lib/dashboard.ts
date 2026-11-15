import type { ProductStock, SaleWithNames, DebtPayment } from "../repos";
import { marginPct, saleLineTotal, lineProfit, stockOnHand, batchIsExpired, batchIsExpiring, balance } from "../domain/calc";

export type Period = "today" | "7d" | "30d" | "all";

export function periodStart(period: Period, today: string): string | null {
  if (period === "all") return null;
  const days = period === "today" ? 0 : period === "7d" ? 6 : 29;
  const d = new Date(today + "T00:00:00");
  d.setDate(d.getDate() - days);
  const iso = d.toISOString().slice(0, 10);
  return iso;
}

export function inPeriod(date: string, start: string | null): boolean {
  return start === null || date >= start;
}

export function sumSales(sales: SaleWithNames[]): { revenue: number; profit: number } {
  let revenue = 0;
  let profit = 0;
  for (const s of sales) {
    revenue += saleLineTotal(s.qty, s.unitPrice, s.discount);
    profit += lineProfit(s.qty, s.unitPrice, s.unitCostAtSale, s.discount);
  }
  return { revenue: Math.round(revenue * 100) / 100, profit: Math.round(profit * 100) / 100 };
}

export function stockValues(levels: ProductStock[]): { atCost: number; atSelling: number } {
  let atCost = 0;
  let atSelling = 0;
  for (const l of levels) {
    if (l.stock <= 0) continue;
    atCost += l.stock * l.product.costPrice;
    atSelling += l.stock * l.product.sellingPrice;
  }
  return { atCost: Math.round(atCost * 100) / 100, atSelling: Math.round(atSelling * 100) / 100 };
}

export function amountOwed(sales: SaleWithNames[]): number {
  return Math.round(sales.reduce((sum, s) => sum + Math.max(0, s.balance), 0) * 100) / 100;
}

export function groupDaily(sales: SaleWithNames[]): { date: string; revenue: number; profit: number }[] {
  const map = new Map<string, { revenue: number; profit: number }>();
  for (const s of sales) {
    const cur = map.get(s.date) ?? { revenue: 0, profit: 0 };
    cur.revenue += saleLineTotal(s.qty, s.unitPrice, s.discount);
    cur.profit += lineProfit(s.qty, s.unitPrice, s.unitCostAtSale, s.discount);
    map.set(s.date, cur);
  }
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([date, v]) => ({ date, ...v }));
}

export function byPayment(sales: SaleWithNames[]): { label: string; value: number }[] {
  const map = new Map<string, number>();
  for (const s of sales) {
    map.set(s.paymentType, (map.get(s.paymentType) ?? 0) + saleLineTotal(s.qty, s.unitPrice, s.discount));
  }
  return [...map.entries()].map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 }));
}

export function topProducts(sales: SaleWithNames[], limit = 5): { name: string; revenue: number; qty: number }[] {
  const map = new Map<string, { revenue: number; qty: number }>();
  for (const s of sales) {
    const cur = map.get(s.productName) ?? { revenue: 0, qty: 0 };
    cur.revenue += saleLineTotal(s.qty, s.unitPrice, s.discount);
    cur.qty += s.qty;
    map.set(s.productName, cur);
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export function categoryValue(levels: ProductStock[]): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const l of levels) {
    if (l.stock <= 0) continue;
    const key = l.product.category?.trim() || "Uncategorised";
    map.set(key, (map.get(key) ?? 0) + l.stock * l.product.costPrice);
  }
  return [...map.entries()].map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 })).sort((a, b) => b.value - a.value);
}
