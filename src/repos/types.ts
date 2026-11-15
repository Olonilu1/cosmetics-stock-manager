import type { PaymentType } from "../domain/calc";

export interface Product {
  id: string;
  name: string;
  category: string | null;
  brand: string | null;
  code: string | null;
  costPrice: number;
  sellingPrice: number;
  reorderLevel: number;
  openingStock: number;
  openingExpiry: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Purchase {
  id: string;
  date: string;
  productId: string;
  supplierId: string | null;
  qty: number;
  unitCost: number;
  batchNo: string | null;
  expiry: string | null;
  createdAt: string;
}

export interface Sale {
  id: string;
  date: string;
  productId: string;
  groupId: string | null;
  qty: number;
  unitPrice: number;
  unitCostAtSale: number;
  discount: number;
  paymentType: PaymentType;
  customer: string | null;
  amountPaid: number;
  createdAt: string;
}

export interface DebtPayment {
  id: string;
  saleId: string;
  date: string;
  amount: number;
  createdAt: string;
}

export interface ShopSettings {
  shopName: string;
  expiryAlertDays: number;
  autoBackup: boolean;
  lastBackupAt: string | null;
}

export interface StaffMember {
  id: string;
  name: string;
  role: "Owner" | "Staff";
  pin: string;
  createdAt: string;
}

export interface ProductInput {
  name: string;
  category?: string | null;
  brand?: string | null;
  code?: string | null;
  costPrice: number;
  sellingPrice: number;
  reorderLevel: number;
  openingStock: number;
  openingExpiry?: string | null;
}

export interface PurchaseInput {
  date: string;
  productId: string;
  supplierId?: string | null;
  qty: number;
  unitCost: number;
  batchNo?: string | null;
  expiry?: string | null;
}

export interface SaleInput {
  date: string;
  productId: string;
  groupId?: string | null;
  qty: number;
  unitPrice: number;
  discount?: number;
  paymentType: PaymentType;
  customer?: string | null;
  amountPaid: number;
}

export interface ProductStock {
  product: Product;
  purchasedQty: number;
  soldQty: number;
  stock: number;
  state: "out" | "low" | "ok";
}

export interface PurchaseWithNames extends Purchase {
  productName: string;
  supplierName: string | null;
}

export interface SaleWithNames extends Sale {
  productName: string;
  balance: number;
  total: number;
  profit: number;
}

export interface ProductRepository {
  list(): Promise<Product[]>;
  get(id: string): Promise<Product | null>;
  create(input: ProductInput): Promise<Product>;
  update(id: string, input: Partial<ProductInput>): Promise<void>;
  remove(id: string): Promise<void>;
  hasUsage(id: string): Promise<{ sold: boolean; purchased: boolean }>;
}

export interface SupplierRepository {
  list(): Promise<Supplier[]>;
  create(input: { name: string; phone?: string | null; notes?: string | null }): Promise<Supplier>;
  update(id: string, input: { name?: string; phone?: string | null; notes?: string | null }): Promise<void>;
  remove(id: string): Promise<void>;
  totalSpent(id: string): Promise<number>;
}

export interface PurchaseRepository {
  list(): Promise<PurchaseWithNames[]>;
  create(input: PurchaseInput): Promise<Purchase>;
  update(id: string, input: Partial<PurchaseInput>): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface SaleRepository {
  list(): Promise<SaleWithNames[]>;
  create(input: SaleInput): Promise<Sale>;
  update(id: string, input: Partial<SaleInput>): Promise<void>;
  remove(id: string): Promise<void>;
  debts(): Promise<{ sale: SaleWithNames; payments: DebtPayment[]; balance: number }[]>;
  addDebtPayment(saleId: string, date: string, amount: number): Promise<DebtPayment>;
}

export interface SettingsRepository {
  get(): Promise<ShopSettings>;
  update(input: Partial<ShopSettings>): Promise<void>;
}

export interface StaffRepository {
  list(): Promise<StaffMember[]>;
  create(input: { name: string; role: "Owner" | "Staff"; pin: string }): Promise<StaffMember>;
  update(id: string, input: Partial<{ name: string; role: "Owner" | "Staff"; pin: string }>): Promise<void>;
  remove(id: string): Promise<void>;
  signIn(name: string, pin: string): Promise<StaffMember | null>;
}

export interface AuditEntry {
  id: string;
  at: string;
  staffId: string | null;
  staffName: string;
  action: string;
  details: string;
}

export interface AuditRepository {
  log(action: string, details: string): Promise<void>;
  list(limit?: number): Promise<AuditEntry[]>;
}
