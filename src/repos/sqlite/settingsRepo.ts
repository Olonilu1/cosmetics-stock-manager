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
    return {
      shopName: row.shopName,
      expiryAlertDays: row.expiryAlertDays,
      autoBackup: row.autoBackup === 1,
      lastBackupAt: row.lastBackupAt ?? null,
    };
  },
  async update(input) {
    await settingsRepo.get();
    const set: Partial<typeof settings.$inferInsert> = {};
    if (input.shopName !== undefined) set.shopName = input.shopName;
    if (input.expiryAlertDays !== undefined) set.expiryAlertDays = input.expiryAlertDays;
    if (input.autoBackup !== undefined) set.autoBackup = input.autoBackup ? 1 : 0;
    if (input.lastBackupAt !== undefined) set.lastBackupAt = input.lastBackupAt;
    await getDb().update(settings).set(set).where(eq(settings.id, 1));
  },
};
