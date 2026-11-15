import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { getDb } from "../db/client";
import { products, purchases, sales, debtPayments, suppliers, staff, auditLog } from "../db/schema";

function csv(rows: (string | number | null)[][]): string {
  return rows
    .map((r) => r.map((c) => (c === null || c === undefined ? "" : String(c).includes(",") || String(c).includes('"') ? '"' + String(c).replaceAll('"', '""') + '"' : String(c))).join(","))
    .join("\n");
}

export function toCsvStock(rows: { product: { name: string; category: string | null; brand: string | null; code: string | null; costPrice: number; sellingPrice: number; reorderLevel: number; openingStock: number; openingExpiry: string | null }; stock: number }[]): string {
  return csv([
    ["Name", "Category", "Brand", "Code", "Cost price", "Selling price", "Reorder level", "Opening stock", "Opening expiry", "Stock now"],
    ...rows.map((r) => [r.product.name, r.product.category, r.product.brand, r.product.code, r.product.costPrice, r.product.sellingPrice, r.product.reorderLevel, r.product.openingStock, r.product.openingExpiry, r.stock]),
  ]);
}

export function toCsvSales(rows: { date: string; productName: string; qty: number; unitPrice: number; discount: number; total: number; profit: number; paymentType: string; customer: string | null; amountPaid: number; balance: number }[]): string {
  return csv([
    ["Date", "Product", "Qty", "Unit price", "Discount", "Total", "Profit", "Payment", "Customer", "Amount paid", "Balance"],
    ...rows.map((r) => [r.date, r.productName, r.qty, r.unitPrice, r.discount, r.total, r.profit, r.paymentType, r.customer, r.amountPaid, r.balance]),
  ]);
}

export function toCsvPurchases(rows: { date: string; productName: string; supplierName: string | null; qty: number; unitCost: number; batchNo: string | null; expiry: string | null; total: number }[]): string {
  return csv([
    ["Date", "Product", "Supplier", "Qty", "Unit cost", "Batch no", "Expiry", "Total"],
    ...rows.map((r) => [r.date, r.productName, r.supplierName, r.qty, r.unitCost, r.batchNo, r.expiry, r.total]),
  ]);
}

async function shareFile(name: string, content: string, mime = "text/csv") {
  const file = FileSystem.documentDirectory + name;
  await FileSystem.writeAsStringAsync(file, content, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file, { mimeType: mime, dialogTitle: name });
  }
}

export function shareCsv(name: string, content: string) {
  return shareFile(name, content, "text/csv");
}

export async function backupJson(): Promise<string> {
  const db = getDb();
  const [p, pu, s, d, su, st, au] = await Promise.all([
    db.select().from(products),
    db.select().from(purchases),
    db.select().from(sales),
    db.select().from(debtPayments),
    db.select().from(suppliers),
    db.select().from(staff),
    db.select().from(auditLog),
  ]);
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), products: p, purchases: pu, sales: s, debtPayments: d, suppliers: su, staff: st, auditLog: au }, null, 2);
}

export function shareBackup(json: string) {
  return shareFile("cosmetics-backup.json", json, "application/json");
}

export interface BackupData {
  version: number;
  products: unknown[];
  purchases: unknown[];
  sales: unknown[];
  debtPayments: unknown[];
  suppliers: unknown[];
  staff: unknown[];
  auditLog?: unknown[];
}

export function isBackupData(v: unknown): v is BackupData {
  if (typeof v !== "object" || v === null) return false;
  const b = v as Record<string, unknown>;
  return Array.isArray(b.products) && Array.isArray(b.sales) && Array.isArray(b.purchases);
}

export async function restoreJson(json: string): Promise<void> {
  const data: unknown = JSON.parse(json);
  if (!isBackupData(data)) throw new Error("That file is not a Cosmetics Stock Manager backup.");
  const db = getDb();
  await db.delete(debtPayments);
  await db.delete(sales);
  await db.delete(purchases);
  await db.delete(products);
  await db.delete(suppliers);
  await db.delete(staff);
  await db.delete(auditLog);
  if (data.products.length) await db.insert(products).values(data.products as (typeof products.$inferInsert)[]);
  if (data.suppliers.length) await db.insert(suppliers).values(data.suppliers as (typeof suppliers.$inferInsert)[]);
  if (data.purchases.length) await db.insert(purchases).values(data.purchases as (typeof purchases.$inferInsert)[]);
  if (data.sales.length) await db.insert(sales).values(data.sales as (typeof sales.$inferInsert)[]);
  if (data.debtPayments.length) await db.insert(debtPayments).values(data.debtPayments as (typeof debtPayments.$inferInsert)[]);
  if (data.staff.length) await db.insert(staff).values(data.staff as (typeof staff.$inferInsert)[]);
  if (data.auditLog?.length) await db.insert(auditLog).values(data.auditLog as (typeof auditLog.$inferInsert)[]);
}
