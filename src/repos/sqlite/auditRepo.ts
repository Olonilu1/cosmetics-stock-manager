import { desc } from "drizzle-orm";
import { getDb } from "../../db/client";
import { auditLog } from "../../db/schema";
import { currentActor } from "./actor";
import type { AuditEntry } from "../types";

export const auditRepo = {
  /** Records who did what. Logging must never break the action itself. */
  async log(action: string, details: string): Promise<void> {
    try {
      const actor = currentActor.get();
      await getDb().insert(auditLog).values({
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        staffId: actor?.id ?? null,
        staffName: actor?.name ?? "Unknown",
        action,
        details,
      });
    } catch {
      // never block a sale, payment or edit because logging failed
    }
  },
  async list(limit = 300): Promise<AuditEntry[]> {
    const rows = await getDb()
      .select()
      .from(auditLog)
      .orderBy(desc(auditLog.at), desc(auditLog.id))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      at: r.at,
      staffId: r.staffId,
      staffName: r.staffName,
      action: r.action,
      details: r.details,
    }));
  },
};
