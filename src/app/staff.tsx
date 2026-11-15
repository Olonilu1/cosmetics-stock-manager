import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useTheme } from "../hooks/useTheme";
import { Button, EmptyState, Field, Row, Sheet, confirm } from "../components/ui";
import { staffRepo, type StaffMember } from "../repos";
import { useAuth } from "../state/auth";

export default function Staff() {
  const { colors } = useTheme();
  const auth = useAuth();
  const [rows, setRows] = useState<StaffMember[]>([]);
  const [sheet, setSheet] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", role: "Staff" as "Owner" | "Staff", pin: "" });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => setRows(await staffRepo.list()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Button label="Add staff profile" onPress={() => { setEditId(null); setForm({ name: "", role: "Staff", pin: "" }); setError(null); setSheet(true); }} />
      <View style={{ marginTop: 14 }}>
        {rows.length === 0 ? <EmptyState title="Only you for now" hint="Add a profile per staff member. Each signs in with their PIN when the app starts." /> : rows.map((s) => (
          <Row
            key={s.id}
            title={s.name}
            sub={s.role === "Owner" ? "Owner" : "Staff"}
            badge={auth.current?.id === s.id ? { tone: "good", text: "signed in" } : undefined}
            onEdit={() => { setEditId(s.id); setForm({ name: s.name, role: s.role, pin: s.pin }); setError(null); setSheet(true); }}
            onDelete={async () => { if (await confirm(`Delete profile ${s.name}?`)) { try { await staffRepo.remove(s.id); load(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } } }}
          />
        ))}
      </View>
      {error ? <Text style={{ color: colors.bad }}>{error}</Text> : null}
      <Sheet visible={sheet} title={editId ? "Edit profile" : "Add profile"} onClose={() => setSheet(false)}>
        <Field label="Name" value={form.name} onChangeText={(t) => setForm((f) => ({ ...f, name: t }))} />
        <Field label="Role (Owner or Staff)" value={form.role} onChangeText={(t) => setForm((f) => ({ ...f, role: t.toUpperCase() === "OWNER" ? "Owner" : "Staff" }))} />
        <Field label="PIN" value={form.pin} onChangeText={(t) => setForm((f) => ({ ...f, pin: t }))} keyboardType="number-pad" secureTextEntry maxLength={6} />
        <Button label="Save profile" onPress={async () => {
          if (!form.name.trim() || form.pin.length < 4) { setError("Name and a PIN of at least 4 digits."); return; }
          if (editId) await staffRepo.update(editId, { name: form.name.trim(), role: form.role, pin: form.pin });
          else await staffRepo.create({ name: form.name, role: form.role, pin: form.pin });
          setSheet(false);
          load();
          auth.refresh();
        }} />
      </Sheet>
    </ScrollView>
  );
}
