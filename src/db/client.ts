import { openDatabaseSync } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import * as schema from "./schema";
import { applyMigrations } from "./migrations";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

let db: Db | null = null;

export function getDb(): Db {
  if (!db) {
    const sqlite = openDatabaseSync("cosmetics.db");
    sqlite.execSync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    applyMigrations(sqlite);
    db = drizzle(sqlite, { schema });
  }
  return db;
}
