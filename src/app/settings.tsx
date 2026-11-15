import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useTheme } from "../hooks/useTheme";
import { Button, Card, Field, SectionTitle } from "../components/ui";
import { settingsRepo } from "../repos";
import { loadSampleData, removeSampleData } from "../lib/sample";

export default function Settings() {
  const { colors } = useTheme();
  const [shopName, setShopName] = useState("");
  const [alertDays, setAlertDays] = useState("90");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    settingsRepo.get().then((s) => { setShopName(s.shopName); setAlertDays(String(s.expiryAlertDays)); });
  }, []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <SectionTitle>Shop</SectionTitle>
      <Field label="Shop name" value={shopName} onChangeText={setShopName} />
      <Field label="Expiry alert days (warn this many days ahead)" value={alertDays} onChangeText={setAlertDays} keyboardType="number-pad" />
      <Button label="Save settings" onPress={async () => {
        await settingsRepo.update({ shopName: shopName.trim(), expiryAlertDays: Math.max(1, Number(alertDays || 90)) });
        setMsg("Saved.");
      }} />
      {msg ? <Text style={{ color: colors.good, marginTop: 8 }}>{msg}</Text> : null}

      <SectionTitle>Sample data</SectionTitle>
      <Card>
        <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 10 }}>Sample products are marked [Sample] and can be removed in one tap. They never touch your real records.</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}><Button label="Load samples" kind="plain" onPress={async () => { await loadSampleData(); setMsg("Sample data loaded."); }} /></View>
          <View style={{ flex: 1 }}><Button label="Remove samples" kind="danger" onPress={async () => { await removeSampleData(); setMsg("Sample data removed."); }} /></View>
        </View>
      </Card>
    </ScrollView>
  );
}
