import { useCallback, useState } from "react";
import { Pressable, ScrollView, Share, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useTheme } from "../hooks/useTheme";
import { Button, Card, EmptyState, Field, Row, Sheet } from "../components/ui";
import { saleRepo, settingsRepo } from "../repos";
import { debtReminderMessage } from "../lib/reminder";
import { naira, todayISO } from "../lib/dates";

interface DebtRow { sale: { id: string; customer: string | null; productName: string; date: string; balance: number; total: number }; payments: { id: string; date: string; amount: number }[]; balance: number }

export default function Debts() {
  const { colors } = useTheme();
  const [rows, setRows] = useState<DebtRow[]>([]);
  const [sheet, setSheet] = useState(false);
  const [target, setTarget] = useState<DebtRow | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shopName, setShopName] = useState("");

  const load = useCallback(async () => {
    const raw = await saleRepo.debts();
    setRows(raw as unknown as DebtRow[]);
    settingsRepo.get().then((s) => setShopName(s.shopName));
  }, []);

  /** Opens the share sheet with a ready-made WhatsApp/SMS reminder for this debt. */
  const sendReminder = (r: DebtRow) => {
    Share.share({
      message: debtReminderMessage({
        customer: r.sale.customer ?? "",
        productName: r.sale.productName,
        balance: r.balance,
        date: r.sale.date,
        shopName,
      }),
    });
  };

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const groups = new Map<string, DebtRow[]>();
  for (const r of rows) {
    const key = r.sale.customer ?? "(no name)";
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {rows.length === 0 ? (
        <EmptyState title="No debts" hint="Credit sales with an unpaid balance will appear here, grouped by customer." />
      ) : [...groups.entries()].map(([customer, list]) => (
        <View key={customer}>
          <Text style={{ color: colors.text, fontWeight: "800", fontSize: 16, marginTop: 14, marginBottom: 6 }}>{customer}</Text>
          {list.map((r) => (
            <Card key={r.sale.id} style={{ marginBottom: 10 }}>
              <Row
                title={`${r.sale.productName} · ${r.sale.date}`}
                sub={`Total ${naira(r.sale.total)} · paid ${naira(r.sale.total - r.balance)} · payments recorded: ${r.payments.length}`}
                right={naira(r.balance)}
                badge={{ tone: "warn", text: "OWED" }}
              />
              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button label="Record payment" onPress={() => { setTarget(r); setAmount(String(r.balance)); setError(null); setSheet(true); }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label="Send reminder" kind="plain" onPress={() => sendReminder(r)} />
                </View>
              </View>
            </Card>
          ))}
        </View>
      ))}
      <Sheet visible={sheet} title="Record a debt payment" onClose={() => setSheet(false)}>
        {target ? (
          <View>
            <Text style={{ color: colors.muted, marginBottom: 10 }}>Balance owed: {naira(target.balance)}</Text>
            <Field label="Amount (₦)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
            {error ? <Text style={{ color: colors.bad, marginBottom: 10 }}>{error}</Text> : null}
            <Button label="Save payment" onPress={async () => {
              const amt = Number(amount || 0);
              if (amt <= 0) { setError("Enter an amount."); return; }
              await saleRepo.addDebtPayment(target.sale.id, todayISO(), amt);
              setSheet(false);
              load();
            }} />
          </View>
        ) : null}
      </Sheet>
    </ScrollView>
  );
}
