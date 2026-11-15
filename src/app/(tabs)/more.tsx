import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import { settingsRepo } from "../../repos";

export default function More() {
  const { colors } = useTheme();
  const [shopName, setShopName] = useState("");
  useFocusEffect(useCallback(() => { settingsRepo.get().then((s) => setShopName(s.shopName)); }, []));

  const item = (label: string, sub: string, icon: keyof typeof Ionicons.glyphMap, href: string) => (
    <Link href={href as never} asChild>
      <Pressable style={{ backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: "row", alignItems: "center", borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}>
        <Ionicons name={icon} size={22} color={colors.accent} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>{label}</Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{sub}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>
    </Link>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: "800", marginBottom: 4 }}>{shopName || "Cosmetics Stock Manager"}</Text>
      <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 18 }}>Everything works offline. Nothing in this app needs internet.</Text>
      {item("Debts", "Who owes you, record payments", "cash-outline", "/debts")}
      {item("Suppliers", "Where you buy from", "people-outline", "/suppliers")}
      {item("Staff logins", "Profiles and PINs for your staff", "people-circle-outline", "/staff")}
      {item("Activity log", "Who sold, restocked or edited, newest first", "time-outline", "/audit")}
      {item("Backup and export", "CSV exports, JSON backup, auto backup on this phone", "save-outline", "/backup")}
      {item("Settings", "Shop name, expiry alert days, sample data", "settings-outline", "/settings")}
      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 12 }}>Cosmetics Stock Manager v1.1 · works fully offline</Text>
    </ScrollView>
  );
}
