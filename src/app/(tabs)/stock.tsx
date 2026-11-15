import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import { Badge, Button, Card, Chip, EmptyState, Field, Row, SectionTitle, Sheet } from "../../components/ui";
import { productRepo, stockLevels, type ProductStock } from "../../repos";
import { naira, todayISO } from "../../lib/dates";
import { batchIsExpired, batchIsExpiring } from "../../domain/calc";

type Filter = "all" | "low" | "out" | "expiring";

export default function Stock() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState<Filter>((params.filter as Filter) ?? "all");
  const [levels, setLevels] = useState<ProductStock[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      (async () => {
        setLoading(true);
        const ls = await stockLevels();
        if (live) {
          setLevels(ls);
          setCategories([...new Set(ls.map((l) => l.product.category).filter(Boolean) as string[])]);
          setLoading(false);
        }
      })();
      return () => { live = false; };
    }, []),
  );

  useEffect(() => {
    if (params.filter) setFilter(params.filter as Filter);
  }, [params.filter]);

  const today = todayISO();
  const alertDays = 90;
  let shown = levels;
  if (filter === "low") shown = shown.filter((l) => l.state === "low");
  if (filter === "out") shown = shown.filter((l) => l.state === "out");
  if (filter === "expiring") {
    shown = shown.filter((l) => {
      const e = l.product.openingExpiry;
      return l.stock > 0 && e && (batchIsExpired(e, today) || batchIsExpiring(e, today, alertDays));
    });
  }
  if (category) shown = shown.filter((l) => l.product.category === category);
  if (q.trim()) {
    const needle = q.trim().toLowerCase();
    shown = shown.filter((l) => [l.product.name, l.product.brand, l.product.code].some((f) => (f ?? "").toLowerCase().includes(needle)));
  }

  const badgeFor = (l: ProductStock) => {
    const e = l.product.openingExpiry;
    if (l.state === "out") return { tone: "bad" as const, text: "OUT" };
    if (l.state === "low") return { tone: "warn" as const, text: "LOW" };
    if (e && batchIsExpired(e, today) && l.stock > 0) return { tone: "bad" as const, text: "EXPIRED" };
    if (e && batchIsExpiring(e, today, alertDays) && l.stock > 0) return { tone: "warn" as const, text: "EXPIRING" };
    return { tone: "good" as const, text: `${l.stock}` };
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search name, brand or code"
            placeholderTextColor={colors.muted}
            style={{ flex: 1, backgroundColor: colors.card, color: colors.text, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: colors.border }}
          />
          <Pressable onPress={() => setSheet(true)} hitSlop={8} style={{ backgroundColor: colors.accent, borderRadius: 12, marginLeft: 10, width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="add" size={26} color="#fff" />
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", marginTop: 10 }}>
          <Chip label="All" active={filter === "all"} onPress={() => setFilter("all")} />
          <Chip label="Low" active={filter === "low"} onPress={() => setFilter("low")} />
          <Chip label="Out" active={filter === "out"} onPress={() => setFilter("out")} />
          <Chip label="Expiring" active={filter === "expiring"} onPress={() => setFilter("expiring")} />
        </View>
        {categories.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            <Chip label="Every category" active={!category} onPress={() => setCategory(null)} />
            {categories.map((c) => <Chip key={c} label={c} active={category === c} onPress={() => setCategory(category === c ? null : c)} />)}
          </ScrollView>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={async () => setLevels(await stockLevels())} tintColor={colors.accent} />}>
        {shown.length === 0 ? (
          <EmptyState title={levels.length === 0 ? "No products yet" : "Nothing matches"} hint={levels.length === 0 ? "Tap + to add your first product with its cost, price and opening stock." : "Try another filter or clear the search."} />
        ) : (
          shown.map((l) => (
            <Row
              key={l.product.id}
              title={l.product.name}
              sub={`${l.product.category ?? "Uncategorised"}${l.product.brand ? " · " + l.product.brand : ""} · cost ${naira(l.product.costPrice)} · sells ${naira(l.product.sellingPrice)}`}
              right={`${l.stock}`}
              badge={badgeFor(l)}
              onPress={() => router.push(`/product/${l.product.id}`)}
            />
          ))
        )}
      </ScrollView>

      <ProductSheet visible={sheet} onClose={() => setSheet(false)} />
    </View>
  );
}

export function ProductSheet({ visible, onClose, editId, onSaved }: { visible: boolean; onClose: () => void; editId?: string | null; onSaved?: () => void }) {
  const { colors } = useTheme();
  const [form, setForm] = useState({ name: "", category: "", brand: "", code: "", costPrice: "", sellingPrice: "", reorderLevel: "", openingStock: "", openingExpiry: "" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (visible && editId) {
        const p = await productRepo.get(editId);
        if (p) setForm({
          name: p.name, category: p.category ?? "", brand: p.brand ?? "", code: p.code ?? "",
          costPrice: String(p.costPrice), sellingPrice: String(p.sellingPrice), reorderLevel: String(p.reorderLevel),
          openingStock: String(p.openingStock), openingExpiry: p.openingExpiry ?? "",
        });
      } else if (visible) {
        setForm({ name: "", category: "", brand: "", code: "", costPrice: "", sellingPrice: "", reorderLevel: "", openingStock: "", openingExpiry: "" });
      }
      setError(null);
    })();
  }, [visible, editId]);

  const set = (k: keyof typeof form) => (t: string) => setForm((f) => ({ ...f, [k]: t }));

  const save = async () => {
    if (!form.name.trim()) { setError("Give the product a name."); return; }
    const num = (s: string, def = 0) => (s.trim() === "" ? def : Number(s));
    try {
      const input = {
        name: form.name,
        category: form.category || null,
        brand: form.brand || null,
        code: form.code || null,
        costPrice: num(form.costPrice),
        sellingPrice: num(form.sellingPrice),
        reorderLevel: num(form.reorderLevel),
        openingStock: num(form.openingStock),
        openingExpiry: form.openingExpiry || null,
      };
      if (editId) await productRepo.update(editId, input);
      else await productRepo.create(input);
      await new Promise((r) => setTimeout(r, 0));
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Sheet visible={visible} title={editId ? "Edit product" : "Add product"} onClose={onClose}>
      <Field label="Name" value={form.name} onChangeText={set("name")} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Field label="Category" value={form.category} onChangeText={set("category")} /></View>
        <View style={{ flex: 1 }}><Field label="Brand" value={form.brand} onChangeText={set("brand")} /></View>
      </View>
      <Field label="Code / SKU (optional)" value={form.code} onChangeText={set("code")} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Field label="Cost price (₦)" value={form.costPrice} onChangeText={set("costPrice")} keyboardType="decimal-pad" /></View>
        <View style={{ flex: 1 }}><Field label="Selling price (₦)" value={form.sellingPrice} onChangeText={set("sellingPrice")} keyboardType="decimal-pad" /></View>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Field label="Reorder level" value={form.reorderLevel} onChangeText={set("reorderLevel")} keyboardType="number-pad" /></View>
        <View style={{ flex: 1 }}><Field label="Opening stock" value={form.openingStock} onChangeText={set("openingStock")} keyboardType="number-pad" /></View>
      </View>
      <Field label="Opening stock expiry (yyyy-mm-dd, optional)" value={form.openingExpiry} onChangeText={set("openingExpiry")} placeholder="2026-12-31" />
      {error ? <Text style={{ color: colors.bad, marginBottom: 10 }}>{error}</Text> : null}
      <Button label={editId ? "Save changes" : "Add product"} onPress={save} />
    </Sheet>
  );
}
