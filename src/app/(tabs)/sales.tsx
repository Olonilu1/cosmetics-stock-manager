import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import { useTheme } from "../../hooks/useTheme";
import { Button, Card, Chip, EmptyState, Field, Row, SectionTitle, Sheet, confirm } from "../../components/ui";
import { productRepo, saleRepo, type Product, type SaleWithNames } from "../../repos";
import { naira, todayISO } from "../../lib/dates";
import { saleLineTotal, type PaymentType } from "../../domain/calc";

type PeriodFilter = "all" | "today" | "7d" | "30d";

export default function Sales() {
  const { colors } = useTheme();
  const [sales, setSales] = useState<SaleWithNames[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [pay, setPay] = useState<PaymentType | null>(null);
  const [sheet, setSheet] = useState(false);

  useFocusEffect(useCallback(() => {
    let live = true;
    (async () => {
      setLoading(true);
      const ss = await saleRepo.list();
      if (live) { setSales(ss); setLoading(false); }
    })();
    return () => { live = false; };
  }, []));

  const today = todayISO();
  const start = period === "all" ? null : period === "today" ? today : period === "7d" ? shift(today, -6) : shift(today, -29);
  let shown = sales.filter((s) => !start || s.date >= start);
  if (pay) shown = shown.filter((s) => s.paymentType === pay);
  if (q.trim()) {
    const n = q.trim().toLowerCase();
    shown = shown.filter((s) => s.productName.toLowerCase().includes(n) || (s.customer ?? "").toLowerCase().includes(n));
  }
  const groups = new Map<string, SaleWithNames[]>();
  for (const s of shown) {
    const list = groups.get(s.date) ?? [];
    list.push(s);
    groups.set(s.date, list);
  }
  const ordered = [...groups.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TextInput value={q} onChangeText={setQ} placeholder="Search product or customer" placeholderTextColor={colors.muted} style={{ flex: 1, backgroundColor: colors.card, color: colors.text, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: colors.border }} />
          <Pressable onPress={() => setSheet(true)} hitSlop={8} style={{ backgroundColor: colors.accent, borderRadius: 12, marginLeft: 10, width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="add" size={26} color="#fff" />
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", marginTop: 10 }}>
          {(["all", "today", "7d", "30d"] as PeriodFilter[]).map((p) => <Chip key={p} label={p === "all" ? "All" : p === "today" ? "Today" : p === "7d" ? "7 days" : "30 days"} active={period === p} onPress={() => setPeriod(p)} />)}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          <Chip label="Any payment" active={!pay} onPress={() => setPay(null)} />
          {(["Cash", "Transfer", "POS", "Credit"] as PaymentType[]).map((p) => <Chip key={p} label={p} active={pay === p} onPress={() => setPay(p)} />)}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={async () => setSales(await saleRepo.list())} tintColor={colors.accent} />}>
        {ordered.length === 0 ? (
          <EmptyState title={sales.length === 0 ? "No sales yet" : "Nothing matches"} hint={sales.length === 0 ? "Tap + to record a sale. You can put several products on one receipt." : "Try another filter or clear the search."} />
        ) : ordered.map(([date, rows]) => (
          <View key={date}>
            <SectionTitle>{date === today ? "Today" : date}</SectionTitle>
            {rows.map((s) => (
              <Row
                key={s.id}
                title={`${s.qty} × ${s.productName}`}
                sub={`${naira(s.unitPrice)} each${s.discount > 0 ? " · discount " + naira(s.discount) : ""} · ${s.paymentType}${s.customer ? " · " + s.customer : ""}`}
                right={naira(s.total)}
                badge={s.balance > 0.005 ? { tone: "warn" as const, text: "OWED " + naira(s.balance) } : undefined}
                onDelete={async () => { if (await confirm(`Delete this sale of ${s.productName}? Stock goes back.`)) { try { await saleRepo.remove(s.id); load(); } catch (e) { alert(e instanceof Error ? e.message : String(e)); } } }}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      <SaleSheet visible={sheet} onClose={() => setSheet(false)} />
    </View>
  );

  function load() { saleRepo.list().then(setSales); }
}

function shift(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

interface CartLine { productId: string; name: string; qty: string; unitPrice: string; discount: string; stock: number }

export function SaleSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentType, setPaymentType] = useState<PaymentType>("Cash");
  const [customer, setCustomer] = useState("");
  const [paidNow, setPaidNow] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setProducts(await productRepo.list());
    setCart([]);
    setPaymentType("Cash");
    setCustomer("");
    setPaidNow("");
    setError(null);
  }, []);

  useFocusEffect(useCallback(() => { if (visible) load(); }, [visible, load]));

  const addToCart = (p: Product) => {
    if (cart.some((c) => c.productId === p.id)) return;
    setCart((c) => [...c, { productId: p.id, name: p.name, qty: "1", unitPrice: String(p.sellingPrice), discount: "0", stock: p.openingStock }]);
  };

  const total = cart.reduce((sum, l) => sum + saleLineTotal(Number(l.qty || 0), Number(l.unitPrice || 0), Number(l.discount || 0)), 0);
  const paid = Number(paidNow || 0);

  const save = async () => {
    if (cart.length === 0) { setError("Add at least one product to the sale."); return; }
    const pay = paymentType;
    if (pay === "Credit" && !customer.trim()) { setError("A credit sale needs a customer name."); return; }
    let remaining = paid;
    try {
      for (const line of cart) {
        const lineTotal = saleLineTotal(Number(line.qty || 0), Number(line.unitPrice || 0), Number(line.discount || 0));
        const applied = pay === "Credit" ? Math.min(remaining, lineTotal) : lineTotal;
        if (pay === "Credit") remaining = Math.max(0, Math.round((remaining - applied) * 100) / 100);
        await saleRepo.create({
          date: todayISO(),
          productId: line.productId,
          qty: Number(line.qty || 0),
          unitPrice: Number(line.unitPrice || 0),
          discount: Number(line.discount || 0),
          paymentType: pay,
          customer: pay === "Credit" ? customer.trim() : null,
          amountPaid: applied,
        });
      }
      await load();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Sheet visible={visible} title="Record a sale" onClose={onClose}>
      <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>Tap products to add them to this sale.</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {products.length === 0 ? <Text style={{ color: colors.muted }}>No products yet. Add some in Stock first.</Text> : products.map((p) => (
          <Chip key={p.id} label={p.name} active={cart.some((c) => c.productId === p.id)} onPress={() => addToCart(p)} />
        ))}
      </View>
      {cart.map((line, i) => (
        <Card key={line.productId} style={{ marginBottom: 10 }}>
          <Text style={{ color: colors.text, fontWeight: "700", marginBottom: 8 }}>{line.name}</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}><Field label="Qty" value={line.qty} keyboardType="number-pad" onChangeText={(t) => setCart((c) => c.map((x, j) => (j === i ? { ...x, qty: t } : x)))} /></View>
            <View style={{ flex: 1 }}><Field label="Price (₦)" value={line.unitPrice} keyboardType="decimal-pad" onChangeText={(t) => setCart((c) => c.map((x, j) => (j === i ? { ...x, unitPrice: t } : x)))} /></View>
            <View style={{ flex: 1 }}><Field label="Discount (₦)" value={line.discount} keyboardType="decimal-pad" onChangeText={(t) => setCart((c) => c.map((x, j) => (j === i ? { ...x, discount: t } : x)))} /></View>
          </View>
        </Card>
      ))}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        {(["Cash", "Transfer", "POS", "Credit"] as PaymentType[]).map((p) => <Chip key={p} label={p} active={paymentType === p} onPress={() => setPaymentType(p)} />)}
      </View>
      {paymentType === "Credit" ? (
        <View>
          <Field label="Customer name" value={customer} onChangeText={setCustomer} />
          <Field label="Paid now (₦, optional)" value={paidNow} onChangeText={setPaidNow} keyboardType="decimal-pad" />
        </View>
      ) : null}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Text style={{ color: colors.muted, fontWeight: "600" }}>Total</Text>
        <Text style={{ color: colors.text, fontWeight: "800", fontSize: 17 }}>{naira(total)}</Text>
      </View>
      {error ? <Text style={{ color: colors.bad, marginBottom: 10 }}>{error}</Text> : null}
      <Button label={`Save sale · ${naira(total)}`} onPress={save} />
    </Sheet>
  );
}
