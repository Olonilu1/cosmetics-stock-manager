import { toISODate, daysBetween, naira } from "../src/lib/dates";

it("formats ISO dates", () => {
  expect(toISODate(new Date(2026, 0, 5))).toBe("2026-01-05");
});

it("counts days", () => {
  expect(daysBetween("2026-06-01", "2026-06-30")).toBe(29);
  expect(daysBetween("2026-06-30", "2026-06-01")).toBe(-29);
});

it("formats naira", () => {
  expect(naira(4500)).toBe("\u20A64,500");
  expect(naira(1234.5)).toBe("\u20A61,234.50");
});
