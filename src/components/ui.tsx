import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ViewProps } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../hooks/useTheme";

export function Card({ style, ...rest }: ViewProps) {
  const { colors } = useTheme();
  return <View {...rest} style={[{ backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, style]} />;
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: active ? colors.accent : colors.chip, marginRight: 8 }}
      hitSlop={6}
    >
      <Text style={{ color: active ? "#fff" : colors.muted, fontSize: 13, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

export function Button({ label, onPress, kind = "primary", disabled }: { label: string; onPress: () => void; kind?: "primary" | "plain" | "danger"; disabled?: boolean }) {
  const { colors } = useTheme();
  const bg = kind === "primary" ? colors.accent : kind === "danger" ? colors.bad : colors.chip;
  const fg = kind === "plain" ? colors.text : "#fff";
  return (
    <Pressable
      disabled={disabled}
      onPress={async () => { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPress(); }}
      style={{ backgroundColor: disabled ? colors.border : bg, borderRadius: 12, paddingVertical: 13, alignItems: "center", opacity: disabled ? 0.6 : 1 }}
    >
      <Text style={{ color: fg, fontWeight: "700", fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

export function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { colors } = useTheme();
  const { label, style, ...rest } = props;
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted, marginBottom: 5 }}>{label}</Text>
      <TextInput
        {...rest}
        placeholderTextColor={colors.muted}
        style={[{ backgroundColor: colors.chip, color: colors.text, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, style]}
      />
    </View>
  );
}

export function Badge({ tone, text }: { tone: "good" | "warn" | "bad" | "muted"; text: string }) {
  const { colors } = useTheme();
  const bg = tone === "good" ? colors.good : tone === "warn" ? colors.warn : tone === "bad" ? colors.bad : colors.muted;
  return (
    <View style={{ backgroundColor: bg, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>{text}</Text>
    </View>
  );
}

export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "88%", paddingBottom: 24 }}>
          <View style={{ alignItems: "center", paddingTop: 10 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>
          <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 }}>{title}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ paddingHorizontal: 16 }}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 }}>
      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16, marginBottom: 6 }}>{title}</Text>
      <Text style={{ color: colors.muted, textAlign: "center", fontSize: 13 }}>{hint}</Text>
    </View>
  );
}

export function Row({ title, sub, right, badge, onPress, onEdit, onDelete }: {
  title: string;
  sub?: string;
  right?: string;
  badge?: { tone: "good" | "warn" | "bad" | "muted"; text: string };
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Card style={{ marginBottom: 10 }}>
      <Pressable onPress={onPress} disabled={!onPress}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={{ color: colors.text, fontWeight: "600", fontSize: 15 }} numberOfLines={1}>{title}</Text>
            {sub ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{sub}</Text> : null}
          </View>
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            {right ? <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>{right}</Text> : null}
            {badge ? <Badge {...badge} /> : null}
          </View>
        </View>
      </Pressable>
      {onEdit || onDelete ? (
        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          {onEdit ? <Pressable onPress={onEdit} hitSlop={8}><Text style={{ color: colors.accent, fontWeight: "600", fontSize: 13 }}>Edit</Text></Pressable> : null}
          {onDelete ? <Pressable onPress={onDelete} hitSlop={8}><Text style={{ color: colors.bad, fontWeight: "600", fontSize: 13 }}>Delete</Text></Pressable> : null}
        </View>
      ) : null}
    </Card>
  );
}

export function SectionTitle({ children }: { children: string }) {
  const { colors } = useTheme();
  return <Text style={{ color: colors.muted, fontWeight: "700", fontSize: 13, marginTop: 18, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>{children}</Text>;
}

export function confirm(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    import("react-native").then(({ Alert }) => {
      Alert.alert("Are you sure?", text, [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: "Yes", style: "destructive", onPress: () => resolve(true) },
      ]);
    });
  });
}
