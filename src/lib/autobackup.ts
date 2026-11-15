import * as FileSystem from "expo-file-system/legacy";
import { settingsRepo } from "../repos";
import { backupJson } from "./exporters";

const DIR = "auto-backups";
const EVERY_MS = 7 * 24 * 60 * 60 * 1000; // weekly
const KEEP = 4;

/**
 * Keeps an automatic copy of the whole shop on this phone, at most one per week,
 * and keeps only the newest few. Runs when the app opens; never blocks the app.
 */
export async function runAutoBackup(): Promise<void> {
  try {
    const s = await settingsRepo.get();
    if (!s.autoBackup) return;
    if (s.lastBackupAt) {
      const last = new Date(s.lastBackupAt).getTime();
      if (Number.isFinite(last) && Date.now() - last < EVERY_MS) return;
    }
    const base = FileSystem.documentDirectory;
    if (!base) return;
    const dir = `${base}${DIR}/`;
    try {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    } catch {}
    const json = await backupJson();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await FileSystem.writeAsStringAsync(`${dir}backup-${stamp}.json`, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const files = (await FileSystem.readDirectoryAsync(dir))
      .filter((f) => f.startsWith("backup-") && f.endsWith(".json"))
      .sort();
    for (const f of files.slice(0, Math.max(0, files.length - KEEP))) {
      try {
        await FileSystem.deleteAsync(`${dir}${f}`, { idempotent: true });
      } catch {}
    }
    await settingsRepo.update({ lastBackupAt: new Date().toISOString() });
  } catch {
    // auto backup must never break opening the app
  }
}
