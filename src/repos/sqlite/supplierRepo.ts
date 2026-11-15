import { eq, sql } from "drizzle-orm";
import { getDb } from "../../db/client";
import { suppliers, purchases } from "../../db/schema";
import type { Supplier, SupplierRepository } from "../types";

function toSupplier(row: typeof suppliers.$inferSelect): Supplier {
  return { id: row.id, name: row.name, phone: row.phone, notes: row.notes, createdAt: row.createdAt };
}

export const supplierRepo: SupplierRepository = {
  async list() {
    const rows = await getDb().select().from(suppliers).orderBy(suppliers.name);
    return rows.map(toSupplier);
  },
  async create(input) {
    const id = crypto.randomUUID();
    const row = { id, name: input.name.trim(), phone: input.phone ?? null, notes: input.notes ?? null, createdAt: new Date().toISOString() };
    await getDb().insert(suppliers).values(row);
    return toSupplier(row);
  },
  async update(id, input) {
    await getDb().update(suppliers).set(input).where(eq(suppliers.id, id));
  },
  async remove(id) {
    await getDb().delete(suppliers).where(eq(suppliers.id, id));
  },
  async totalSpent(id) {
    const rows = await getDb()
      .select({ total: sql<number>`coalesce(sum(${purchases.qty} * ${purchases.unitCost}), 0)` })
      .from(purchases)
      .where(eq(purchases.supplierId, id));
    return rows[0]?.total ?? 0;
  },
};
