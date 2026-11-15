export interface Migration {
  version: number;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    sql: `
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  brand TEXT,
  code TEXT,
  cost_price REAL NOT NULL DEFAULT 0,
  selling_price REAL NOT NULL DEFAULT 0,
  reorder_level REAL NOT NULL DEFAULT 0,
  opening_stock REAL NOT NULL DEFAULT 0,
  opening_expiry TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY NOT NULL,
  date TEXT NOT NULL,
  product_id TEXT NOT NULL,
  supplier_id TEXT,
  qty REAL NOT NULL,
  unit_cost REAL NOT NULL,
  batch_no TEXT,
  expiry TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_purchases_product ON purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date);
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY NOT NULL,
  date TEXT NOT NULL,
  product_id TEXT NOT NULL,
  group_id TEXT,
  qty REAL NOT NULL,
  unit_price REAL NOT NULL,
  unit_cost_at_sale REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  payment_type TEXT NOT NULL,
  customer TEXT,
  amount_paid REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sales_product ON sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE TABLE IF NOT EXISTS debt_payments (
  id TEXT PRIMARY KEY NOT NULL,
  sale_id TEXT NOT NULL,
  date TEXT NOT NULL,
  amount REAL NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_debt_payments_sale ON debt_payments(sale_id);
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY NOT NULL,
  shop_name TEXT NOT NULL DEFAULT '',
  expiry_alert_days INTEGER NOT NULL DEFAULT 90
);
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Staff',
  pin TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
`,
  },
  {
    version: 2,
    sql: `
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY NOT NULL,
  at TEXT NOT NULL,
  staff_id TEXT,
  staff_name TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_log(at);
ALTER TABLE settings ADD COLUMN auto_backup INTEGER NOT NULL DEFAULT 0;
ALTER TABLE settings ADD COLUMN last_backup_at TEXT;
`,
  },
];

export function appliedVersion(sqlite: { getFirstSync: (sql: string) => { user_version?: number } | null }): number {
  const row = sqlite.getFirstSync("PRAGMA user_version");
  return row?.user_version ?? 0;
}

export function applyMigrations(
  sqlite: {
    execSync: (sql: string) => unknown;
    getFirstSync: (sql: string) => { user_version?: number } | null;
  },
): number {
  let v = appliedVersion(sqlite);
  for (const m of MIGRATIONS) {
    if (m.version > v) {
      sqlite.execSync(m.sql);
      sqlite.execSync(`PRAGMA user_version = ${m.version}`);
      v = m.version;
    }
  }
  return v;
}
