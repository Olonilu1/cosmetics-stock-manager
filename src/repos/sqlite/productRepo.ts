import { eq, sql } from "drizzle-orm";
import { getDb } from "../../db/client";
import { products, purchases, sales } from "../../db/schema";
import type { Product, ProductInput, ProductRepository, ProductStock } from "../types";
import { stockOnHand, classifyStock, canDeleteProduct } from "../../domain/calc";
import { todayISO } from "../../lib/dates";

function toProduct(row: typeof products.$inferSelect): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    brand: row.brand,
    code: row.code,
    costPrice: row.costPrice,
    sellingPrice: row.sellingPrice,
    reorderLevel: row.reorderLevel,
    openingStock: row.openingStock,
    openingExpiry: row.openingExpiry,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const productRepo: ProductRepository = {
  async list() {
    const rows = await getDb().select().from(products).orderBy(products.name);
    return rows.map(toProduct);
  },
  async get(id) {
    const rows = await getDb().select().from(products).where(eq(products.id, id)).limit(1);
    return rows[0] ? toProduct(rows[0]) : null;
  },
  async create(input) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const row = {
      id,
      name: input.name.trim(),
      category: input.category ?? null,
      brand: input.brand ?? null,
      code: input.code ?? null,
      costPrice: input.costPrice,
      sellingPrice: input.sellingPrice,
      reorderLevel: input.reorderLevel,
      openingStock: input.openingStock,
      openingExpiry: input.openingExpiry ?? null,
      createdAt: now,
      updatedAt: now,
    };
    await getDb().insert(products).values(row);
    return toProduct(row);
  },
  async update(id, input) {
    await getDb()
      .update(products)
      .set({ ...input, updatedAt: todayISO() })
      .where(eq(products.id, id));
  },
  async remove(id) {
    const usage = await productRepo.hasUsage(id);
    if (!canDeleteProduct(usage.sold, usage.purchased)) {
      throw new Error("This product has sales or purchases recorded and cannot be deleted.");
    }
    await getDb().delete(products).where(eq(products.id, id));
  },
  async hasUsage(id) {
    const s = await getDb().select({ n: sql<number>`count(*)` }).from(sales).where(eq(sales.productId, id));
    const p = await getDb().select({ n: sql<number>`count(*)` }).from(purchases).where(eq(purchases.productId, id));
    return { sold: (s[0]?.n ?? 0) > 0, purchased: (p[0]?.n ?? 0) > 0 };
  },
};

export async function stockLevels(): Promise<ProductStock[]> {
  const db = getDb();
  const prods = await db.select().from(products).orderBy(products.name);
  const bought = await db
    .select({ productId: purchases.productId, qty: sql<number>`coalesce(sum(${purchases.qty}), 0)` })
    .from(purchases)
    .groupBy(purchases.productId);
  const sold = await db
    .select({ productId: sales.productId, qty: sql<number>`coalesce(sum(${sales.qty}), 0)` })
    .from(sales)
    .groupBy(sales.productId);
  const boughtMap = new Map(bought.map((r) => [r.productId, r.qty]));
  const soldMap = new Map(sold.map((r) => [r.productId, r.qty]));
  return prods.map((row) => {
    const product = toProduct(row);
    const purchasedQty = boughtMap.get(product.id) ?? 0;
    const soldQty = soldMap.get(product.id) ?? 0;
    const stock = stockOnHand(product.openingStock, purchasedQty, soldQty);
    return { product, purchasedQty, soldQty, stock, state: classifyStock(stock, product.reorderLevel) };
  });
}

export async function setCostFromPurchase(productId: string, unitCost: number): Promise<void> {
  // Decided rule: recording a purchase refreshes the product's cost price to that purchase's unit cost.
  await getDb()
    .update(products)
    .set({ costPrice: unitCost, updatedAt: todayISO() })
    .where(eq(products.id, productId));
}
