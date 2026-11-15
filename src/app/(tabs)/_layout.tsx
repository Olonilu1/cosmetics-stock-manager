import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import type { ThemeColors } from "../../lib/theme";

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "home-outline",
  stock: "cube-outline",
  sales: "cart-outline",
  buy: "bag-handle-outline",
  more: "ellipsis-horizontal",
};

export default function TabsLayout() {
  const { colors } = useTheme();
  const c = colors as ThemeColors;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: String(c.accent),
        tabBarInactiveTintColor: String(c.muted),
        tabBarStyle: { backgroundColor: String(c.card), borderTopColor: String(c.border) },
        sceneStyle: { backgroundColor: String(c.bg) },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, size }: { color: unknown; size: number }) => <Ionicons name={icons.index} size={size} color={String(color)} /> }} />
      <Tabs.Screen name="stock" options={{ title: "Stock", tabBarIcon: ({ color, size }: { color: unknown; size: number }) => <Ionicons name={icons.stock} size={size} color={String(color)} /> }} />
      <Tabs.Screen name="sales" options={{ title: "Sales", tabBarIcon: ({ color, size }: { color: unknown; size: number }) => <Ionicons name={icons.sales} size={size} color={String(color)} /> }} />
      <Tabs.Screen name="buy" options={{ title: "Buy", tabBarIcon: ({ color, size }: { color: unknown; size: number }) => <Ionicons name={icons.buy} size={size} color={String(color)} /> }} />
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: ({ color, size }: { color: unknown; size: number }) => <Ionicons name={icons.more} size={size} color={String(color)} /> }} />
    </Tabs>
  );
}
