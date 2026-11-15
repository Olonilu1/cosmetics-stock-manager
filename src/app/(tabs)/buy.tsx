import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import { Button, Card, EmptyState, Field, Row, SectionTitle, Sheet, confirm } from "../../components/ui";
import { productRepo, purchaseRepo, supplierRepo, type Product, type PurchaseWithNames, type Supplier } from "../../repos";
import { naira, todayISO } from "../../lib/dates";

export default function Buy() {
  const { colors } = useTheme();
  const [rows, setRows] = useState<PurchaseWithNames[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sheet, setSheet] = useState(false);

  useFocusEffect(useCallback(() => {
    let live = true;
    (async () => {
      setLoading(true);
      const rs = await purchaseRepo.list();
      if (live) { setRows(rs); setLoading(false); }
    })();
    return () => { live = false; };
  }, []));

  const load = useCallback(async () => setRows(await purchaseRepo.list()), []);

  let shown = rows;
  if (q.trim()) {
    const n = q.trim().toLowerCase();
    shown = shown.filter((r) => r.productName.toLowerCase().includes(n) || (r.supplierName ?? "").toLowerCase().includes(n));
  }
  const groups = new Map<string, PurchaseWithNames[]>();
  for (const r of shown) {
    const list = groups.get(r.date) ?? [];
    list.push(r);
    groups.set(r.date, list);
  }
  const ordered = [...groups.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TextInput value={q} onChangeText={setQ} placeholder="Search product or supplier" placeholderTextColor={colors.muted} style={{ flex: 1, backgroundColor: colors.card, color: colors.text, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: colors.border }} />
          <Pressable onPress={() => setSheet(true)} hitSlop={8} style={{ backgroundColor: colors.accent, borderRadius: 12, marginLeft: 10, width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="add" size={26} color="#fff" />
          </Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}>
        {ordered.length === 0 ? (
          <EmptyState title={rows.length === 0 ? "No purchases yet" : "Nothing matches"} hint={rows.length === 0 ? "Tap + to record stock you bought, with its batch number and expiry." : "Try another search."} />
        ) : ordered.map(([date, group]) => (
          <View key={date}>
            <SectionTitle>{date === todayISO() ? "Today" : date}</SectionTitle>
            {group.map((p) => (
              <Row
                key={p.id}
                title={`${p.qty} × ${p.productName}`}
                sub={`${naira(p.unitCost)} each${p.supplierName ? " · " + p.supplierName : ""}${p.batchNo ? " · batch " + p.batchNo : ""}${p.expiry ? " · expiry " + p.expiry : ""}`}
                right={naira(p.qty * p.unitCost)}
                onDelete={async () => { if (await confirm("Delete this purchase?")) { try { await purchaseRepo.remove(p.id); load(); } catch (e) { alert(e instanceof Error ? e.message : String(e)); } } }}
              />
            ))}
          </View>
        ))}
      </ScrollView>
      <PurchaseSheet visible={sheet} onClose={() => setSheet(false)} />
    </View>
  );
}

export function PurchaseSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState({ productId: "", date: todayISO(), supplierId: "", qty: "", unitCost: "", batchNo: "", expiry: "" });
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    if (!visible) return;
    (async () => {
      setProducts(await productRepo.list());
      setSuppliers(await supplierRepo.list());
      setForm({ productId: "", date: todayISO(), supplierId: "", qty: "", unitCost: "", batchNo: "", expiry: "" });
      setError(null);
    })();
  }, [visible]));

  const set = (k: keyof typeof form) => (t: string) => setForm((f) => ({ ...f, [k]: t }));

  const save = async () => {
    if (!form.productId) { setError("Pick a product."); return; }
    if (!form.qty || Number(form.qty) <= 0) { setError("Add the quantity bought."); return; }
    try {
      await purchaseRepo.create({
        date: form.date,
        productId: form.productId,
        supplierId: form.supplierId || null,
        qty: Number(form.qty),
        unitCost: Number(form.unitCost || 0),
        batchNo: form.batchNo || null,
        expiry: form.expiry || null,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Sheet visible={visible} title="Record a purchase" onClose={onClose}>
      <Field label="Product" value={form.productId} onChangeText={set("productId")} placeholder="Paste the product name" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {products.map((p) => <Card key={p.id} style={{ marginRight: 8, paddingVertical: 8 }}><Text style={{ color: colors.text, fontWeight: "600" }} onPress={() => setForm((f) => ({ ...f, productId: p.id }))}>{p.name}</Text></Card>)}
      </ScrollView>
      <Field label="Date (yyyy-mm-dd)" value={form.date} onChangeText={set("date")} />
      <Field label="Supplier (optional)" value={form.supplierId} onChangeText={set("supplierId")} placeholder="Pick in Suppliers screen or leave blank" />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Field label="Quantity" value={form.qty} onChangeText={set("qty")} keyboardType="number-pad" /></View>
        <View style={{ flex: 1 }}><Field label="Unit cost (₦)" value={form.unitCost} onChangeText={set("unitCost")} keyboardType="decimal-pad" /></View>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Field label="Batch no (optional)" value={form.batchNo} onChangeText={set("batchNo")} /></View>
        <View style={{ flex: 1 }}><Field label="Expiry (optional)" value={form.expiry} onChangeText={set("expiry")} placeholder="2026-12-31" /></View>
      </View>
      {error ? <Text style={{ color: colors.bad, marginBottom: 10 }}>{error}</Text> : null}
      <Button label="Save purchase" onPress={save} />
    </Sheet>
  );
}
