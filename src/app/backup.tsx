import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useTheme } from "../hooks/useTheme";
import { Button, Card, SectionTitle } from "../components/ui";
import { purchaseRepo, saleRepo, stockLevels } from "../repos";
import { toCsvSales, toCsvStock, toCsvPurchases, backupJson, shareBackup, restoreJson } from "../lib/exporters";

export default function Backup() {
  const { colors } = useTheme();
  const [msg, setMsg] = useState<string | null>(null);

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
        <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 10 }}>A backup holds every product, purchase, sale, debt payment and supplier. Keep a copy before restoring.</Text>
        <Button label="Export backup" onPress={run(async () => { await shareBackup(await backupJson()); return "Backup ready to share."; })} />
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
