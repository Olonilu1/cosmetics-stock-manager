import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { LineChart, BarChart } from "react-native-gifted-charts";
import { useTheme } from "../../hooks/useTheme";
import { Badge, Card, Chip, EmptyState, Row, SectionTitle } from "../../components/ui";
import { productRepo, purchaseRepo, saleRepo, stockLevels, type ProductStock, type SaleWithNames } from "../../repos";
import { naira, todayISO } from "../../lib/dates";
import {
  amountOwed, byPayment, categoryValue, groupDaily, inPeriod, periodStart, stockValues, sumSales, topProducts, type Period,
} from "../../lib/dashboard";
import { batchIsExpired, batchIsExpiring, marginPct, buildBatchLedger } from "../../domain/calc";

export default function Home() {
  const { colors } = useTheme();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("30d");
  const [levels, setLevels] = useState<ProductStock[]>([]);
  const [sales, setSales] = useState<SaleWithNames[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      (async () => {
        setLoading(true);
        const [ls, ss, pp] = await Promise.all([stockLevels(), saleRepo.list(), purchaseRepo.list()]);
        if (live) { setLevels(ls); setSales(ss); setLoading(false); }
      })();
      return () => { live = false; };
    }, []),
  );

  const today = todayISO();
  const start = periodStart(period, today);
  const scoped = sales.filter((s) => inPeriod(s.date, start));
  const { revenue, profit } = sumSales(scoped);
  const margin = marginPct(profit, revenue);
  const values = stockValues(levels);
  const owed = amountOwed(scoped);

  const out = levels.filter((l) => l.state === "out");
  const low = levels.filter((l) => l.state === "low");
  const alertDays = 90;
  const expired = levels.filter((l) => l.stock > 0 && batchIsExpired(l.product.openingExpiry, today));
  const expiring = levels.filter((l) => l.stock > 0 && !batchIsExpired(l.product.openingExpiry, today) && batchIsExpiring(l.product.openingExpiry, today, alertDays));
  const debts = sales.filter((s) => s.balance > 0.005);
  const restock = [...out, ...low].slice(0, 5);

  const daily = groupDaily(scoped).slice(-14);
  const payments = byPayment(scoped);

  const kpi = (label: string, value: string) => (
    <View style={{ flex: 1, marginRight: 8 }}>
      <Card>
        <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "600" }}>{label}</Text>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800", marginTop: 4 }}>{value}</Text>
      </Card>
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={async () => { const [ls, ss] = await Promise.all([stockLevels(), saleRepo.list()]); setLevels(ls); setSales(ss); }} tintColor={colors.accent} />}
    >
      <View style={{ flexDirection: "row", marginBottom: 14 }}>
        {(["today", "7d", "30d", "all"] as Period[]).map((p) => (
          <Chip key={p} label={p === "today" ? "Today" : p === "7d" ? "7 days" : p === "30d" ? "30 days" : "All"} active={period === p} onPress={() => setPeriod(p)} />
        ))}
      </View>

      {levels.length === 0 && !loading ? (
        <EmptyState title="Welcome" hint="Add your first product in the Stock tab, then record a purchase. The dashboard fills itself as you trade." />
      ) : null}

      <View style={{ flexDirection: "row", marginBottom: 8 }}>{kpi("Revenue", naira(revenue))}{kpi("Profit", naira(profit))}</View>
      <View style={{ flexDirection: "row", marginBottom: 8 }}>{kpi("Margin", `${margin}%`)}{kpi("Owed to you", naira(owed))}</View>
      <View style={{ flexDirection: "row", marginBottom: 16 }}>{kpi("Stock at cost", naira(values.atCost))}{kpi("Stock at selling", naira(values.atSelling))}</View>

      <SectionTitle>Needs attention</SectionTitle>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Chip label={`Out of stock: ${out.length}`} active={false} onPress={() => router.push({ pathname: "/stock", params: { filter: "out" } })} />
        <Chip label={`Low: ${low.length}`} active={false} onPress={() => router.push({ pathname: "/stock", params: { filter: "low" } })} />
        <Chip label={`Expired: ${expired.length}`} active={false} onPress={() => router.push({ pathname: "/stock", params: { filter: "expiring" } })} />
        <Chip label={`Expiring: ${expiring.length}`} active={false} onPress={() => router.push({ pathname: "/stock", params: { filter: "expiring" } })} />
        <Chip label={`Debts: ${debts.length}`} active={false} onPress={() => router.push("/debts")} />
      </View>

      {restock.length > 0 ? (
        <View>
          <SectionTitle>Restock shortlist</SectionTitle>
          {restock.map((l) => (
            <Row key={l.product.id} title={l.product.name} sub={`${l.stock} left · reorder at ${l.product.reorderLevel}`} right={naira(l.product.sellingPrice)} badge={{ tone: l.state === "out" ? "bad" : "warn", text: l.state === "out" ? "OUT" : "LOW" }} onPress={() => router.push(`/product/${l.product.id}`)} />
          ))}
        </View>
      ) : null}

      {daily.length > 1 ? (
        <View>
          <SectionTitle>Daily revenue and profit</SectionTitle>
          <Card>
            <LineChart
              data={daily.map((d) => ({ value: d.revenue, label: d.date.slice(5) }))}
              data2={daily.map((d) => ({ value: d.profit, label: d.date.slice(5) }))}
              height={140}
              width={300}
              areaChart
              curved
              color1={colors.accent}
              color2={colors.good}
              yAxisColor={colors.border}
              xAxisColor={colors.border}
              yAxisTextStyle={{ color: colors.muted, fontSize: 9 }}
              noOfSections={3}
             
              adjustToWidth
            />
            <View style={{ flexDirection: "row", gap: 16, marginTop: 8 }}>
              <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "600" }}>Revenue</Text>
              <Text style={{ color: colors.good, fontSize: 12, fontWeight: "600" }}>Profit</Text>
            </View>
          </Card>
        </View>
      ) : null}

      {payments.length > 0 ? (
        <View>
          <SectionTitle>Sales by payment type</SectionTitle>
          <Card>
            <BarChart
              data={payments.map((p) => ({ value: p.value, label: p.label, frontColor: colors.accent }))}
              height={140}
              width={300}
              yAxisColor={colors.border}
              xAxisColor={colors.border}
              yAxisTextStyle={{ color: colors.muted, fontSize: 9 }}
              noOfSections={3}
              adjustToWidth
            />
          </Card>
        </View>
      ) : null}

      {topProducts(scoped).length > 0 ? (
        <View>
          <SectionTitle>Top products</SectionTitle>
          {topProducts(scoped).map((t, i) => (
            <Row key={t.name} title={`${i + 1}. ${t.name}`} sub={`${t.qty} sold`} right={naira(t.revenue)} />
          ))}
        </View>
      ) : null}

      {categoryValue(levels).length > 0 ? (
        <View>
          <SectionTitle>Stock value by category</SectionTitle>
          {categoryValue(levels).map((c) => (
            <Row key={c.name} title={c.name} right={naira(c.value)} />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
