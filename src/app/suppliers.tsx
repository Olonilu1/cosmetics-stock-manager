import { useCallback, useState } from "react";
import { ScrollView, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useTheme } from "../hooks/useTheme";
import { Button, EmptyState, Field, Row, Sheet, confirm } from "../components/ui";
import { supplierRepo, type Supplier } from "../repos";
import { naira } from "../lib/dates";

export default function Suppliers() {
  const { colors } = useTheme();
  const [rows, setRows] = useState<(Supplier & { spent: number })[]>([]);
  const [sheet, setSheet] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", notes: "" });

  const load = useCallback(async () => {
    const list = await supplierRepo.list();
    const withSpent = await Promise.all(list.map(async (s) => ({ ...s, spent: await supplierRepo.totalSpent(s.id) })));
    setRows(withSpent);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Button label={rows.length === 0 ? "Add a supplier" : "Add supplier"} onPress={() => { setEditId(null); setForm({ name: "", phone: "", notes: "" }); setSheet(true); }} />
      <View style={{ marginTop: 14 }}>
        {rows.length === 0 ? <EmptyState title="No suppliers yet" hint="Add the shops or distributors you buy stock from." /> : rows.map((s) => (
          <Row
            key={s.id}
            title={s.name}
            sub={`${s.phone ?? "no phone"}${s.notes ? " · " + s.notes : ""}`}
            right={naira(s.spent)}
            onEdit={() => { setEditId(s.id); setForm({ name: s.name, phone: s.phone ?? "", notes: s.notes ?? "" }); setSheet(true); }}
            onDelete={async () => { if (await confirm(`Delete supplier ${s.name}?`)) { await supplierRepo.remove(s.id); load(); } }}
          />
        ))}
      </View>
      <Sheet visible={sheet} title={editId ? "Edit supplier" : "Add supplier"} onClose={() => setSheet(false)}>
        <Field label="Name" value={form.name} onChangeText={(t) => setForm((f) => ({ ...f, name: t }))} />
        <Field label="Phone" value={form.phone} onChangeText={(t) => setForm((f) => ({ ...f, phone: t }))} keyboardType="phone-pad" />
        <Field label="Notes" value={form.notes} onChangeText={(t) => setForm((f) => ({ ...f, notes: t }))} />
        <Button label="Save supplier" onPress={async () => {
          if (!form.name.trim()) return;
          if (editId) await supplierRepo.update(editId, { name: form.name.trim(), phone: form.phone || null, notes: form.notes || null });
          else await supplierRepo.create({ name: form.name, phone: form.phone || null, notes: form.notes || null });
          setSheet(false);
          load();
        }} />
      </Sheet>
    </ScrollView>
  );
}
