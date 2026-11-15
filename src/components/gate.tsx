import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../state/auth";
import { Button, Field } from "./ui";

export function Gate() {
  const { colors } = useTheme();
  const auth = useAuth();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  if (!auth.ready || (!auth.needsSetup && !auth.gateNeeded)) return null;

  return (
    <View style={{ ...StyleSheet.absoluteFill, backgroundColor: colors.bg, zIndex: 50 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}>
          <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text, textAlign: "center" }}>Cosmetics Stock Manager</Text>
          <Text style={{ color: colors.muted, textAlign: "center", marginTop: 6, marginBottom: 24 }}>
            {auth.needsSetup ? "Create the owner profile to get started." : "Who is using the app?"}
          </Text>
          {auth.needsSetup ? (
            <View>
              <Field label="Your name" value={name} onChangeText={setName} autoCapitalize="words" />
              <Field label="PIN (keep it simple, 4 digits)" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry maxLength={6} />
              <Field label="Repeat PIN" value={confirmPin} onChangeText={setConfirmPin} keyboardType="number-pad" secureTextEntry maxLength={6} />
              {error ? <Text style={{ color: colors.bad, marginBottom: 10 }}>{error}</Text> : null}
              <Button
                label="Start"
                onPress={async () => {
                  if (!name.trim() || pin.length < 4) { setError("Add a name and a PIN of at least 4 digits."); return; }
                  if (pin !== confirmPin) { setError("The two PINs do not match."); return; }
                  await auth.createOwner(name.trim(), pin);
                }}
              />
            </View>
          ) : (
            <View>
              {auth.profiles.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => { setPicked(p.id); setError(null); }}
                  style={{ padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 2, borderColor: picked === p.id ? colors.accent : colors.border, backgroundColor: colors.card }}
                >
                  <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16 }}>{p.name}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{p.role}</Text>
                </Pressable>
              ))}
              {picked ? (
                <View>
                  <Field label="PIN" value={pin} onChangeText={(t) => { setPin(t); setError(null); }} keyboardType="number-pad" secureTextEntry maxLength={6} autoFocus />
                  {error ? <Text style={{ color: colors.bad, marginBottom: 10 }}>{error}</Text> : null}
                  <Button
                    label="Sign in"
                    onPress={async () => {
                      const profile = auth.profiles.find((p) => p.id === picked);
                      if (!profile) return;
                      const err = await auth.signIn(profile.name, pin);
                      setError(err);
                      if (!err) { setPin(""); setPicked(null); }
                    }}
                  />
                </View>
              ) : null}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
