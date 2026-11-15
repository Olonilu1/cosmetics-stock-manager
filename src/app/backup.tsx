import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useTheme } from "../hooks/useTheme";
import { Button, Card, SectionTitle } from "../components/ui";
import { purchaseRepo, saleRepo, settingsRepo, stockLevels } from "../repos";
import { toCsvSales, toCsvStock, toCsvPurchases, backupJson, shareBackup, restoreJson } from "../lib/exporters";
import { runAutoBackup } from "../lib/autobackup";

export default function Backup() {
  const { colors } = useTheme();
  const [msg, setMsg] = useState<string | null>(null);
  const [auto, setAuto] = useState(false);
  const [lastAt, setLastAt] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      settingsRepo.get().then((s) => {
        setAuto(s.autoBackup);
        setLastAt(s.lastBackupAt);
      });
    }, []),
  );

  const run = (fn: () => Promise<string>) => async () => {
    try { setMsg(await fn()); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
  };

  const exportStock = run(async () => { await toCsvShare("stock.csv", toCsvStock(await stockLevels())); return "Stock CSV ready to share."; });
  const exportSales = run(async () => { await toCsvShare("sales.csv", toCsvSales(await saleRepo.list())); return "Sales CSV ready to share."; });
  const exportPurchases = run(async () => { await toCsvShare("purchases.csv", toCsvPurchases((await purchaseRepo.list()).map((p) => ({ ...p, total: p.qty * p.unitCost })))); return "Purchases CSV ready to share."; });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <SectionTitle>CSV exports</SectionTitle>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Button label="Stock" kind="plain" onPress={exportStock} /></View>
        <View style={{ flex: 1 }}><Button label="Sales" kind="plain" onPress={exportSales} /></View>
        <View style={{ flex: 1 }}><Button label="Purchases" kind="plain" onPress={exportPurchases} /></View>
      </View>

      <SectionTitle>JSON backup</SectionTitle>
      <Card>
        <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 10 }}>A backup holds every product, purchase, sale, debt payment, supplier and staff profile. Keep a copy before restoring.</Text>
        <Button label="Export backup" onPress={run(async () => { await shareBackup(await backupJson()); return "Backup ready to share."; })} />
      </Card>

      <SectionTitle>Automatic backup</SectionTitle>
      <Card>
        <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 10 }}>
          With this on, the app quietly saves a full copy on this phone at most once a week and keeps the newest four. Turning it on makes the first copy right away.
        </Text>
        <Button
          label={auto ? "Automatic backup: ON. Tap to turn off" : "Automatic backup: OFF. Tap to turn on"}
          kind="plain"
          onPress={async () => {
            const next = !auto;
            await settingsRepo.update({ autoBackup: next });
            setAuto(next);
            if (next) {
              await runAutoBackup();
              const s = await settingsRepo.get();
              setAuto(s.autoBackup);
              setLastAt(s.lastBackupAt);
              setMsg(s.lastBackupAt ? "First automatic copy saved on this phone." : null);
            } else {
              setMsg("Automatic backup turned off.");
            }
          }}
        />
        <Text style={{ color: colors.text, fontSize: 13, marginTop: 10 }}>
          Last automatic copy: {lastAt ? new Date(lastAt).toLocaleString() : "never yet"}
        </Text>
      </Card>

      <SectionTitle>Restore</SectionTitle>
      <Card>
        <Text style={{ color: colors.bad, fontSize: 13, marginBottom: 10 }}>Restoring wipes what is on this phone first and replaces it with the backup.</Text>
        <Button label="Choose backup file and restore" kind="danger" onPress={async () => {
          const res = await DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true });
          if (res.canceled) return;
          const file = res.assets[0];
          const json = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
          try { await restoreJson(json); setMsg("Restored. All data replaced with the backup."); }
          catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
        }} />
      </Card>
      {msg ? <Text style={{ color: colors.text, marginTop: 14, fontWeight: "600" }}>{msg}</Text> : null}
    </ScrollView>
  );
}

async function toCsvShare(name: string, content: string) {
  const Sharing = await import("expo-sharing");
  const file = FileSystem.documentDirectory + name;
  await FileSystem.writeAsStringAsync(file, content, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file, { mimeType: "text/csv", dialogTitle: name });
  }
}
