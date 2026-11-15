import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useFocusEffect, useRouter } from "expo-router";
import { useTheme } from "../../hooks/useTheme";
import { Badge, Button, Card, confirm, EmptyState, Row, SectionTitle } from "../../components/ui";
import { productRepo, purchaseRepo, saleRepo, stockLevels, type PurchaseWithNames, type SaleWithNames } from "../../repos";
import { naira, todayISO } from "../../lib/dates";
import { buildBatchLedger, stockOnHand, classifyStock } from "../../domain/calc";
import { ProductSheet } from "../(tabs)/stock";

export default function ProductDetail() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [editOpen, setEditOpen] = useState(false);
  const [purchases, setPurchases] = useState<PurchaseWithNames[]>([]);
  const [sales, setSales] = useState<SaleWithNames[]>([]);
  const [stock, setStock] = useState(0);
  const [opening, setOpening] = useState(0);
  const [expiry, setExpiry] = useState<string | null>(null);
  const [name, setName] = useState("");

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const p = await productRepo.get(id as string);
        if (!p) return;
        setName(p.name);
        setOpening(p.openingStock);
        setExpiry(p.openingExpiry);
        const [ps, ss, ls] = await Promise.all([purchaseRepo.list(), saleRepo.list(), stockLevels()]);
        setPurchases(ps.filter((x) => x.productId === id));
        setSales(ss.filter((x) => x.productId === id));
        const level = ls.find((l) => l.product.id === id);
        setStock(level?.stock ?? 0);
      })();
    }, [id]),
  );

  const today = todayISO();
  const ledger = buildBatchLedger(
    opening,
    expiry,
    purchases.map((p) => ({ id: p.id, date: p.date, qty: p.qty, expiry: p.expiry, batchNo: p.batchNo })),
    sales.map((s) => ({ date: s.date, qty: s.qty })),
  );
  const state = classifyStock(stock, 0);

  if (!name) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800", flex: 1 }}>{name}</Text>
        <Badge tone={state === "out" ? "bad" : state === "low" ? "warn" : "good"} text={`${stock} in stock`} />
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
        <View style={{ flex: 1 }}><Button label="Edit" onPress={() => setEditOpen(true)} kind="plain" /></View>
        <View style={{ flex: 1 }}><Button label="Delete" kind="danger" onPress={async () => {
          if (await confirm("Delete this product? Only possible when it has no sales or purchases.")) {
            try { await productRepo.remove(id as string); router.back(); } catch (e) { alert(e instanceof Error ? e.message : String(e)); }
          }
        }} /></View>
      </View>

      <SectionTitle>Batches (earliest expiry first)</SectionTitle>
      {ledger.length === 0 ? <EmptyState title="No stock" hint="Add an opening stock or record a purchase." /> : ledger.map((b) => (
        <Row key={b.id} title={b.label} sub={`${b.date ? b.date + " · " : ""}${b.expiry ? "expires " + b.expiry : "no expiry"}`} right={`${b.qtyAvailable} left`} badge={{ tone: b.qtyAvailable <= 0 ? "muted" : b.expiry && b.expiry < today ? "bad" : "good", text: b.qtyAvailable <= 0 ? "USED" : "LIVE" }} />
      ))}

      <SectionTitle>Recent sales</SectionTitle>
      {sales.length === 0 ? <EmptyState title="No sales yet" hint="Sales for this product will show here." /> : sales.slice(0, 10).map((s) => (
        <Row key={s.id} title={`${s.qty} × ${naira(s.unitPrice)}`} sub={`${s.date} · ${s.paymentType}${s.customer ? " · " + s.customer : ""}`} right={naira(s.total)} />
      ))}

      <SectionTitle>Purchases</SectionTitle>
      {purchases.length === 0 ? <EmptyState title="No purchases yet" hint="Record restocks in the Buy tab." /> : purchases.map((p) => (
        <Row key={p.id} title={`${p.qty} × ${naira(p.unitCost)}`} sub={`${p.date}${p.supplierName ? " · " + p.supplierName : ""}${p.expiry ? " · expiry " + p.expiry : ""}`} right={naira(p.qty * p.unitCost)} />
      ))}

      <ProductSheet visible={editOpen} editId={id as string} onClose={() => setEditOpen(false)} onSaved={() => router.replace(`/product/${id}`)} />
    </ScrollView>
  );
}
