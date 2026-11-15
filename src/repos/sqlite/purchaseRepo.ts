import { eq, desc } from "drizzle-orm";
import { getDb } from "../../db/client";
import { purchases, products, suppliers } from "../../db/schema";
import type { Purchase, PurchaseInput, PurchaseRepository, PurchaseWithNames } from "../types";
import { stockLevels, setCostFromPurchase } from "./productRepo";
import { canDeletePurchase, stockOnHand } from "../../domain/calc";
import { naira } from "../../lib/dates";
import { auditRepo } from "./auditRepo";

function toPurchase(row: typeof purchases.$inferSelect): Purchase {
  return {
    id: row.id,
    date: row.date,
    productId: row.productId,
    supplierId: row.supplierId,
    qty: row.qty,
    unitCost: row.unitCost,
    batchNo: row.batchNo,
    expiry: row.expiry,
    createdAt: row.createdAt,
  };
}

export const purchaseRepo: PurchaseRepository = {
  async list() {
    const db = getDb();
    const rows = await db
      .select({
        purchase: purchases,
        productName: products.name,
        supplierName: suppliers.name,
      })
      .from(purchases)
      .leftJoin(products, eq(purchases.productId, products.id))
      .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .orderBy(desc(purchases.date), desc(purchases.createdAt));
    return rows.map((r) => ({
      ...toPurchase(r.purchase),
      productName: r.productName ?? "(deleted product)",
      supplierName: r.supplierName ?? null,
    }));
  },
  async create(input) {
    const id = crypto.randomUUID();
    const row = {
      id,
      date: input.date,
      productId: input.productId,
      supplierId: input.supplierId ?? null,
      qty: input.qty,
      unitCost: input.unitCost,
      batchNo: input.batchNo ?? null,
      expiry: input.expiry ?? null,
      createdAt: new Date().toISOString(),
    };
    await getDb().insert(purchases).values(row);
    await setCostFromPurchase(input.productId, input.unitCost);
    const prod = await getDb().select({ name: products.name }).from(products).where(eq(products.id, input.productId)).limit(1);
    await auditRepo.log("purchase", `Bought ${input.qty} x ${prod[0]?.name ?? input.productId} at ${naira(input.unitCost)} (cost price updated)`);
    return toPurchase(row);
  },
  async update(id, input) {
    await getDb().update(purchases).set(input).where(eq(purchases.id, id));
    if (input.unitCost !== undefined) {
      const rows = await getDb().select().from(purchases).where(eq(purchases.id, id)).limit(1);
      if (rows[0]) await setCostFromPurchase(rows[0].productId, input.unitCost);
    }
  },
  async remove(id) {
    const rows = await getDb().select().from(purchases).where(eq(purchases.id, id)).limit(1);
    const p = rows[0];
    if (!p) return;
    const levels = await stockLevels();
    const level = levels.find((l) => l.product.id === p.productId);
    const stockAfterRemoval = stockOnHand(
      level?.product.openingStock ?? 0,
      (level?.purchasedQty ?? 0) - p.qty,
      level?.soldQty ?? 0,
    );
    if (!canDeletePurchase(stockAfterRemoval)) {
      throw new Error("Deleting this purchase would leave stock negative.");
    }
    await getDb().delete(purchases).where(eq(purchases.id, id));
    const prod = await getDb().select({ name: products.name }).from(products).where(eq(products.id, p.productId)).limit(1);
    await auditRepo.log("purchase-delete", `Deleted a purchase of ${p.qty} x ${prod[0]?.name ?? p.productId}`);
  },
};
