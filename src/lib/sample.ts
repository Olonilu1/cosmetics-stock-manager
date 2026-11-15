import { getDb } from "../db/client";
import { products, purchases, sales, debtPayments } from "../db/schema";
import { todayISO } from "./dates";
import type { PaymentType } from "../domain/calc";

const now = () => new Date().toISOString();

export async function loadSampleData(): Promise<void> {
  const db = getDb();
  const today = todayISO();
  const mk = (i: number) => `sample-${i}`;
  const prods = [
    { id: mk(1), name: "[Sample] Shea Body Butter 500ml", category: "Body care", brand: "Natures Glad", code: "SB-500", costPrice: 2600, sellingPrice: 4500, reorderLevel: 6, openingStock: 12, openingExpiry: "2027-06-30", createdAt: now(), updatedAt: now() },
    { id: mk(2), name: "[Sample] Vitamin C Face Serum", category: "Face care", brand: "GlowLab", code: "VC-30", costPrice: 3200, sellingPrice: 6800, reorderLevel: 4, openingStock: 8, openingExpiry: "2027-01-15", createdAt: now(), updatedAt: now() },
    { id: mk(3), name: "[Sample] Matte Lipstick Ruby", category: "Makeup", brand: "LuxeMatte", code: "ML-RB", costPrice: 1200, sellingPrice: 3500, reorderLevel: 5, openingStock: 4, openingExpiry: null, createdAt: now(), updatedAt: now() },
    { id: mk(4), name: "[Sample] Sunscreen SPF50", category: "Face care", brand: "SunGuard", code: "SG-50", costPrice: 2800, sellingPrice: 5500, reorderLevel: 5, openingStock: 10, openingExpiry: "2026-12-20", createdAt: now(), updatedAt: now() },
  ];
  await db.insert(products).values(prods);
  await db.insert(purchases).values([
    { id: mk(11), date: today, productId: mk(1), supplierId: null, qty: 6, unitCost: 2600, batchNo: "B12", expiry: "2027-06-30", createdAt: now() },
  ]);
  await db.insert(sales).values([
    { id: mk(21), date: today, productId: mk(1), groupId: mk(99), qty: 2, unitPrice: 4500, unitCostAtSale: 2600, discount: 0, paymentType: "Cash" as PaymentType, customer: null, amountPaid: 9000, createdAt: now() },
    { id: mk(22), date: today, productId: mk(2), groupId: mk(99), qty: 1, unitPrice: 6800, unitCostAtSale: 3200, discount: 300, paymentType: "Credit" as PaymentType, customer: "Adaeze", amountPaid: 3000, createdAt: now() },
  ]);
  await db.insert(debtPayments).values([]);
}

export async function removeSampleData(): Promise<void> {
  const db = getDb();
  const sampleSales = await db.select().from(sales);
  const sampleIds = new Set(sampleSales.filter((s) => s.id.startsWith("sample-")).map((s) => s.id));
  await db.delete(debtPayments).where(debtPayments.saleId as never);
  await db.delete(sales);
  await db.delete(purchases);
  await db.delete(products);
  // nothing sample-specific remains, everything was sample in this mode
  void sampleIds;
}
