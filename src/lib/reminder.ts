import { naira } from "./dates";

export interface DebtReminderInput {
  customer: string;
  productName: string;
  balance: number;
  date: string;
  shopName: string;
}

/** Builds the follow-up message a shop owner sends a debtor on WhatsApp or SMS. */
export function debtReminderMessage(input: DebtReminderInput): string {
  const shop = input.shopName.trim() || "our shop";
  const customer = input.customer.trim() || "there";
  const product = input.productName.trim() || "your purchase";
  return (
    `Hello ${customer}, a friendly reminder from ${shop}: ` +
    `${naira(input.balance)} is still owed for ${product} bought on ${input.date}. ` +
    "Please send your payment when you can. Thank you!"
  );
}
