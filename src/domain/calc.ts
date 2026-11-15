import { daysBetween } from "../lib/dates";

export type PaymentType = "Cash" | "Transfer" | "POS" | "Credit";

export interface BatchLike {
  expiry: string | null;
  qtyAvailable: number;
}

export interface BatchAllocation {
  index: number;
  qty: number;
  expiry: string | null;
}

export type StockState = "out" | "low" | "ok";
export type BatchState = "expired" | "expiring" | "ok";

export const round2 = (n: number): number =>
  Math.round((n + Number.EPSILON) * 100) / 100;

/** Rule 1: stock on hand = opening + purchased - sold. */
export function stockOnHand(
  openingStock: number,
  purchasedQty: number,
  soldQty: number,
): number {
  return round2(openingStock + purchasedQty - soldQty);
}

/** Rule 2: sale total = qty x unitPrice, minus a line discount when one is set. */
export function saleLineTotal(
  qty: number,
  unitPrice: number,
  discount = 0,
): number {
  return round2(qty * unitPrice - discount);
}

/** Rule 2: profit uses the cost copied at sale time. */
export function lineProfit(
  qty: number,
  unitPrice: number,
  unitCostAtSale: number,
  discount = 0,
): number {
  return round2(qty * unitPrice - discount - qty * unitCostAtSale);
}

/** Rule 10: margin % = profit / revenue. */
export function marginPct(profit: number, revenue: number): number {
  if (revenue <= 0) return 0;
  return round2((profit / revenue) * 100);
}

/** Rule 8: balance = total - amountPaid - recorded debt payments. */
export function balance(
  total: number,
  amountPaid: number,
  debtPayments: number,
): number {
  return round2(total - amountPaid - debtPayments);
}

/** Rule 6: low stock = stock <= reorderLevel (and above 0). Out of stock = <= 0. */
export function classifyStock(stock: number, reorderLevel: number): StockState {
  if (stock <= 0) return "out";
  if (stock <= reorderLevel) return "low";
  return "ok";
}

/**
 * Rule 3: earliest-expiring batch first; batches with no expiry are used last.
 * Greedy allocation over the given batches (index positions preserved).
 */
export function allocateFefo(
  batches: BatchLike[],
  qty: number,
): { allocations: BatchAllocation[]; unallocated: number } {
  const usable = batches
    .map((b, index) => ({ ...b, index }))
    .filter((b) => b.qtyAvailable > 0)
    .sort((a, b) => {
      if (a.expiry && b.expiry) return a.expiry < b.expiry ? -1 : a.expiry > b.expiry ? 1 : 0;
      if (a.expiry) return -1;
      if (b.expiry) return 1;
      return 0;
    });
  const allocations: BatchAllocation[] = [];
  let remaining = qty;
  for (const b of usable) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, b.qtyAvailable);
    allocations.push({ index: b.index, qty: take, expiry: b.expiry });
    remaining = round2(remaining - take);
  }
  return { allocations, unallocated: round2(Math.max(0, remaining)) };
}

/** Rule 7: expired = expiry before today. */
export function batchIsExpired(expiry: string | null, today: string): boolean {
  return !!expiry && expiry < today;
}

/** Rule 7: expiring = expiry today or later, within alertDays. */
export function batchIsExpiring(
  expiry: string | null,
  today: string,
  alertDays: number,
): boolean {
  if (!expiry) return false;
  const d = daysBetween(today, expiry);
  return d >= 0 && d <= alertDays;
}

export function batchState(
  expiry: string | null,
  today: string,
  alertDays: number,
): BatchState {
  if (batchIsExpired(expiry, today)) return "expired";
  if (batchIsExpiring(expiry, today, alertDays)) return "expiring";
  return "ok";
}

/** Rule 9: a product with sales or purchases cannot be deleted. */
export function canDeleteProduct(hasSales: boolean, hasPurchases: boolean): boolean {
  return !hasSales && !hasPurchases;
}

/** Rule 9: deleting a purchase must not leave stock negative. */
export function canDeletePurchase(stockAfterRemoval: number): boolean {
  return stockAfterRemoval >= 0;
}

/** Rule 4: a sale cannot exceed stock on hand. */
export function canSell(stock: number, qty: number): boolean {
  return qty > 0 && qty <= stock + 1e-9;
}

/**
 * FEFO batch ledger for one product: opening stock is the first batch,
 * then purchases in date order. Sales are drained through the ledger in
 * date order, so remaining batch quantities are reproducible.
 */
export interface LedgerBatch extends BatchLike {
  id: string;
  label: string;
  date: string;
}

export function buildBatchLedger(
  openingStock: number,
  openingExpiry: string | null,
  purchases: { id: string; date: string; qty: number; expiry: string | null; batchNo: string | null }[],
  sales: { date: string; createdAt?: string; qty: number }[],
): LedgerBatch[] {
  const batches: LedgerBatch[] = [];
  if (openingStock > 0) {
    batches.push({
      id: "opening",
      label: "Opening stock",
      date: "",
      expiry: openingExpiry,
      qtyAvailable: openingStock,
    });
  }
  for (const p of [...purchases].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))) {
    if (p.qty > 0) {
      batches.push({
        id: p.id,
        label: p.batchNo ? `Batch ${p.batchNo}` : "Purchase",
        date: p.date,
        expiry: p.expiry,
        qtyAvailable: p.qty,
      });
    }
  }
  const sortedSales = [...sales].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return 0;
  });
  for (const s of sortedSales) {
    let remaining = s.qty;
    for (const b of batches) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, b.qtyAvailable);
      b.qtyAvailable = round2(b.qtyAvailable - take);
      remaining = round2(remaining - take);
    }
  }
  return batches;
}

/** Rule 8: a Credit sale requires a customer. */
export function creditSaleRequiresCustomer(paymentType: PaymentType, customer?: string | null): boolean {
  if (paymentType !== "Credit") return true;
  return !!customer && customer.trim().length > 0;
}
