import { debtReminderMessage } from "../src/lib/reminder";

describe("debtReminderMessage", () => {
  it("names the customer, product, balance, date and shop", () => {
    const msg = debtReminderMessage({
      customer: "Bola",
      productName: "Shea butter cream",
      balance: 3500,
      date: "2026-11-10",
      shopName: "Kenny Beauty",
    });
    expect(msg).toContain("Bola");
    expect(msg).toContain("Shea butter cream");
    expect(msg).toContain("\u20A63,500");
    expect(msg).toContain("2026-11-10");
    expect(msg).toContain("Kenny Beauty");
  });

  it("falls back gracefully when the customer or shop name is missing", () => {
    const msg = debtReminderMessage({
      customer: "",
      productName: "Lipstick",
      balance: 1200.5,
      date: "2026-11-01",
      shopName: "  ",
    });
    expect(msg).toContain("there");
    expect(msg).toContain("our shop");
    expect(msg).toContain("\u20A61,200.50");
  });
});
