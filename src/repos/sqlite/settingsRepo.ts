import { eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { settings } from "../../db/schema";
import type { SettingsRepository, ShopSettings } from "../types";

export const settingsRepo: SettingsRepository = {
  async get() {
    const db = getDb();
    let rows = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
    if (!rows[0]) {
      await db.insert(settings).values({ id: 1, shopName: "", expiryAlertDays: 90 });
      rows = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
    }
    const row = rows[0];
    return { shopName: row.shopName, expiryAlertDays: row.expiryAlertDays };
  },
  async update(input) {
    await settingsRepo.get();
    await getDb().update(settings).set(input).where(eq(settings.id, 1));
  },
};
