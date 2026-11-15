import { eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { staff } from "../../db/schema";
import type { StaffMember, StaffRepository } from "../types";

function toStaff(row: typeof staff.$inferSelect): StaffMember {
  return { id: row.id, name: row.name, role: row.role as StaffMember["role"], pin: row.pin, createdAt: row.createdAt };
}

export const staffRepo: StaffRepository = {
  async list() {
    const rows = await getDb().select().from(staff).orderBy(staff.createdAt);
    return rows.map(toStaff);
  },
  async create(input) {
    const id = crypto.randomUUID();
    const row = { id, name: input.name.trim(), role: input.role, pin: input.pin, createdAt: new Date().toISOString() };
    await getDb().insert(staff).values(row);
    return toStaff(row);
  },
  async update(id, input) {
    await getDb().update(staff).set(input).where(eq(staff.id, id));
  },
  async remove(id) {
    const all = await staffRepo.list();
    if (all.length <= 1) throw new Error("Keep at least one staff profile.");
    await getDb().delete(staff).where(eq(staff.id, id));
  },
  async signIn(name, pin) {
    const rows = await getDb().select().from(staff).where(eq(staff.name, name.trim())).limit(1);
    const s = rows[0];
    if (s && s.pin === pin) return toStaff(s);
    return null;
  },
};
