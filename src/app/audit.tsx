import { useCallback, useState } from "react";
import { ScrollView } from "react-native";
import { useFocusEffect } from "expo-router";
import { useTheme } from "../hooks/useTheme";
import { EmptyState, Row } from "../components/ui";
import { auditRepo, type AuditEntry } from "../repos";

const LABELS: Record<string, string> = {
  sale: "Sale",
  "sale-delete": "Sale deleted",
  "debt-payment": "Debt payment",
  purchase: "Restock",
  "purchase-delete": "Purchase deleted",
  product: "Product added",
  "product-edit": "Product updated",
  "product-delete": "Product deleted",
  staff: "Staff profile",
  "sign-in": "Signed in",
};

function when(at: string): string {
  return `${at.slice(0, 10)} ${at.slice(11, 16)}`;
}

export default function Audit() {
  const { colors } = useTheme();
  const [rows, setRows] = useState<AuditEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      auditRepo.list().then(setRows);
    }, []),
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {rows.length === 0 ? (
        <EmptyState
          title="No activity yet"
          hint="Every sale, payment, restock and product edit gets logged here with the staff name behind it."
        />
      ) : (
        rows.map((e) => (
          <Row
            key={e.id}
            title={LABELS[e.action] ?? e.action}
            sub={`${e.staffName} · ${e.details}`}
            right={when(e.at)}
          />
        ))
      )}
    </ScrollView>
  );
}
