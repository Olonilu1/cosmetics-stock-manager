import { eq, desc } from "drizzle-orm";
import { getDb } from "../../db/client";
import { sales, products, debtPayments } from "../../db/schema";
import type { DebtPayment, Sale, SaleInput, SaleRepository, SaleWithNames } from "../types";
import { stockLevels } from "./productRepo";
import {
  balance, canSell, creditSaleRequiresCustomer, lineProfit, saleLineTotal,
} from "../../domain/calc";
import type { PaymentType } from "../../domain/calc";

function toSale(row: typeof sales.$inferSelect): Sale {
  return {
    id: row.id,
    date: row.date,
    productId: row.productId,
    groupId: row.groupId,
    qty: row.qty,
    unitPrice: row.unitPrice,
    unitCostAtSale: row.unitCostAtSale,
    discount: row.discount,
    paymentType: row.paymentType as PaymentType,
    customer: row.customer,
    amountPaid: row.amountPaid,
    createdAt: row.createdAt,
  };
}

function enrich(s: Sale, productName: string, payments: number): SaleWithNames {
  const total = saleLineTotal(s.qty, s.unitPrice, s.discount);
  return {
    ...s,
    productName,
    total,
    profit: lineProfit(s.qty, s.unitPrice, s.unitCostAtSale, s.discount),
    balance: balance(total, s.amountPaid, payments),
  };
}

async function paymentsBySale(): Promise<Map<string, number>> {
  const rows = await getDb().select().from(debtPayments);
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.saleId, (map.get(r.saleId) ?? 0) + r.amount);
  return map;
}

async function validate(input: SaleInput, excludeSaleId?: string) {
  const levels = await stockLevels();
  const level = levels.find((l) => l.product.id === input.productId);
  if (!level) throw new Error("Product not found.");
  const existing = await getDb().select().from(sales).where(eq(sales.productId, input.productId));
  const soldElsewhere = existing
    .filter((r) => r.id !== excludeSaleId)
    .reduce((sum, r) => sum + r.qty, 0);
  const stock = level.product.openingStock + level.purchasedQty - soldElsewhere;
  if (!canSell(stock, input.qty)) {
    throw new Error(`Only ${stock} left in stock. This sale is too big.`);
  }
  if (!creditSaleRequiresCustomer(input.paymentType, input.customer)) {
    throw new Error("A credit sale needs a customer name.");
  }
}

export const saleRepo: SaleRepository = {
  async list() {
    const payMap = await paymentsBySale();
    const rows = await getDb()
      .select({ sale: sales, productName: products.name })
      .from(sales)
      .leftJoin(products, eq(sales.productId, products.id))
      .orderBy(desc(sales.date), desc(sales.createdAt));
    return rows.map((r) => enrich(toSale(r.sale), r.productName ?? "(deleted product)", payMap.get(r.sale.id) ?? 0));
  },
  async create(input) {
    await validate(input);
    const id = crypto.randomUUID();
    const product = await getDb().select().from(products).where(eq(products.id, input.productId)).limit(1);
    const row = {
      id,
      date: input.date,
      productId: input.productId,
      groupId: input.groupId ?? null,
      qty: input.qty,
      unitPrice: input.unitPrice,
      unitCostAtSale: product[0]?.costPrice ?? 0,
      discount: input.discount ?? 0,
      paymentType: input.paymentType,
      customer: input.customer ?? null,
      amountPaid: input.amountPaid,
      createdAt: new Date().toISOString(),
    };
    await getDb().insert(sales).values(row);
    return toSale(row);
  },
  async update(id, input) {
    const rows = await getDb().select().from(sales).where(eq(sales.id, id)).limit(1);
    const current = rows[0];
    if (!current) return;
    await validate({ ...toSale(current), ...input } as SaleInput, id);
    await getDb().update(sales).set(input).where(eq(sales.id, id));
  },
  async remove(id) {
    const rows = await getDb().select().from(sales).where(eq(sales.id, id)).limit(1);
    const s = rows[0];
    if (!s) return;
    const levels = await stockLevels();
    const level = levels.find((l) => l.product.id === s.productId);
    const stockAfterRemoval = level ? level.stock + s.qty : 0;
    if (stockAfterRemoval < 0) throw new Error("Deleting this sale would leave stock negative.");
    await getDb().delete(sales).where(eq(sales.id, id));
    await getDb().delete(debtPayments).where(eq(debtPayments.saleId, id));
  },
  async debts() {
    const payMap = await paymentsBySale();
    const all = await saleRepo.list();
    const open = all.filter((s) => s.balance > 0.005);
    const rows = await getDb().select().from(debtPayments);
    const bySale = new Map<string, DebtPayment[]>();
    for (const r of rows) {
      const list = bySale.get(r.saleId) ?? [];
      list.push(r);
      bySale.set(r.saleId, list);
    }
    return open.map((sale) => ({ sale, payments: bySale.get(sale.id) ?? [], balance: sale.balance }));
  },
  async addDebtPayment(saleId, date, amount) {
    const id = crypto.randomUUID();
    const row = { id, saleId, date, amount, createdAt: new Date().toISOString() };
    await getDb().insert(debtPayments).values(row);
    return row;
  },
};
