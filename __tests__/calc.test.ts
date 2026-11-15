import {
  stockOnHand, saleLineTotal, lineProfit, marginPct, balance,
  classifyStock, allocateFefo, batchState, canDeleteProduct,
  canDeletePurchase, canSell, buildBatchLedger, creditSaleRequiresCustomer,
} from "../src/domain/calc";

describe("business rules", () => {
  it("rule 1: stock on hand", () => {
    expect(stockOnHand(10, 50, 30)).toBe(30);
    expect(stockOnHand(0, 0, 0)).toBe(0);
  });

  it("rule 2: sale total and profit", () => {
    expect(saleLineTotal(3, 1500)).toBe(4500);
    expect(saleLineTotal(2, 1000, 250)).toBe(1750);
    expect(lineProfit(3, 1500, 1000)).toBe(1500);
    expect(lineProfit(2, 1000, 700, 250)).toBe(350);
    // later cost price changes never alter past sales
    expect(lineProfit(1, 1000, 800)).toBe(200);
  });

  it("rule 10: margin", () => {
    expect(marginPct(1500, 4500)).toBeCloseTo(33.33);
    expect(marginPct(0, 0)).toBe(0);
  });

  it("rule 8: balance", () => {
    expect(balance(10000, 4000, 2000)).toBe(4000);
    expect(balance(10000, 10000, 0)).toBe(0);
  });

  it("rule 6: stock states", () => {
    expect(classifyStock(0, 5)).toBe("out");
    expect(classifyStock(-2, 5)).toBe("out");
    expect(classifyStock(5, 5)).toBe("low");
    expect(classifyStock(6, 5)).toBe("ok");
  });

  it("rule 3: FEFO uses earliest expiry first, no-expiry last", () => {
    const batches = [
      { expiry: null, qtyAvailable: 10 },
      { expiry: "2026-12-01", qtyAvailable: 5 },
      { expiry: "2026-11-01", qtyAvailable: 4 },
    ];
    const { allocations, unallocated } = allocateFefo(batches, 7);
    expect(allocations[0]).toEqual({ index: 2, qty: 4, expiry: "2026-11-01" });
    expect(allocations[1]).toEqual({ index: 1, qty: 3, expiry: "2026-12-01" });
    expect(unallocated).toBe(0);
  });

  it("rule 3: unallocated when stock is short", () => {
    const { allocations, unallocated } = allocateFefo([{ expiry: null, qtyAvailable: 2 }], 5);
    expect(allocations).toHaveLength(1);
    expect(unallocated).toBe(3);
  });

  it("rule 7: expiry states", () => {
    expect(batchState("2026-01-01", "2026-06-01", 90)).toBe("expired");
    expect(batchState("2026-06-30", "2026-06-01", 90)).toBe("expiring");
    expect(batchState("2027-06-30", "2026-06-01", 90)).toBe("ok");
    expect(batchState(null, "2026-06-01", 90)).toBe("ok");
  });

  it("rule 9: delete guards", () => {
    expect(canDeleteProduct(false, false)).toBe(true);
    expect(canDeleteProduct(true, false)).toBe(false);
    expect(canDeleteProduct(false, true)).toBe(false);
    expect(canDeletePurchase(0)).toBe(true);
    expect(canDeletePurchase(-1)).toBe(false);
  });

  it("rule 4: cannot oversell", () => {
    expect(canSell(10, 10)).toBe(true);
    expect(canSell(10, 11)).toBe(false);
    expect(canSell(10, 0)).toBe(false);
  });

  it("rule 8: credit needs a customer", () => {
    expect(creditSaleRequiresCustomer("Credit", "")).toBe(false);
    expect(creditSaleRequiresCustomer("Credit", "Ada")).toBe(true);
    expect(creditSaleRequiresCustomer("Cash", undefined)).toBe(true);
  });

  it("ledger drains sales FEFO and leaves remaining per batch", () => {
    const batches = buildBatchLedger(
      5,
      "2026-12-01",
      [
        { id: "p1", date: "2026-06-01", qty: 10, expiry: "2027-01-01", batchNo: "A" },
        { id: "p2", date: "2026-07-01", qty: 6, expiry: null, batchNo: null },
      ],
      [{ date: "2026-06-02", qty: 7 }],
    );
    expect(batches[0].qtyAvailable).toBe(0); // opening drained first (earliest expiry)
    expect(batches[1].qtyAvailable).toBe(8); // 2 of the sale drew from p1
    expect(batches[2].qtyAvailable).toBe(6);
  });
});
