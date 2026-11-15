import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category"),
  brand: text("brand"),
  code: text("code"),
  costPrice: real("cost_price").notNull().default(0),
  sellingPrice: real("selling_price").notNull().default(0),
  reorderLevel: real("reorder_level").notNull().default(0),
  openingStock: real("opening_stock").notNull().default(0),
  openingExpiry: text("opening_expiry"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const suppliers = sqliteTable("suppliers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const purchases = sqliteTable("purchases", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  productId: text("product_id").notNull(),
  supplierId: text("supplier_id"),
  qty: real("qty").notNull(),
  unitCost: real("unit_cost").notNull(),
  batchNo: text("batch_no"),
  expiry: text("expiry"),
  createdAt: text("created_at").notNull(),
});

export const sales = sqliteTable("sales", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  productId: text("product_id").notNull(),
  groupId: text("group_id"),
  qty: real("qty").notNull(),
  unitPrice: real("unit_price").notNull(),
  unitCostAtSale: real("unit_cost_at_sale").notNull(),
  discount: real("discount").notNull().default(0),
  paymentType: text("payment_type").notNull(),
  customer: text("customer"),
  amountPaid: real("amount_paid").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const debtPayments = sqliteTable("debt_payments", {
  id: text("id").primaryKey(),
  saleId: text("sale_id").notNull(),
  date: text("date").notNull(),
  amount: real("amount").notNull(),
  createdAt: text("created_at").notNull(),
});

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  shopName: text("shop_name").notNull().default(""),
  expiryAlertDays: integer("expiry_alert_days").notNull().default(90),
  autoBackup: integer("auto_backup").notNull().default(0),
  lastBackupAt: text("last_backup_at"),
});

export const staff = sqliteTable("staff", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull().default("Staff"),
  pin: text("pin").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  at: text("at").notNull(),
  staffId: text("staff_id"),
  staffName: text("staff_name").notNull(),
  action: text("action").notNull(),
  details: text("details").notNull(),
});
