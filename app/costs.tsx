import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Appbar, useTheme, ActivityIndicator, Surface, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { subscribeToHousehold, subscribeToBalances, subscribeToItems } from '../lib/firestore';
import { useAuth } from '../lib/AuthContext';
import BalanceSummary from '../components/BalanceSummary';
import { formatCurrency } from '../lib/splitCost';
import type { Household, GroceryItem } from '../lib/types';

export default function CostsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { firebaseUser, activeHouseholdId } = useAuth();

  const [household, setHousehold] = useState<Household | null>(null);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const hid = activeHouseholdId ?? '';

  useEffect(() => {
    if (!hid) return;
    const u1 = subscribeToHousehold(hid, (h) => { setHousehold(h); setLoading(false); });
    const u2 = subscribeToBalances(hid, setBalances);
    const u3 = subscribeToItems(hid, setItems);
    return () => { u1(); u2(); u3(); };
  }, [hid]);

  const purchasedItems = items.filter((i) => i.purchased && i.actualPrice);
  const totalSpend = purchasedItems.reduce((sum, i) => sum + (i.actualPrice ?? 0), 0);

  const spendByMember: Record<string, number> = {};
  for (const item of purchasedItems) {
    if (item.purchasedBy) {
      spendByMember[item.purchasedBy] = (spendByMember[item.purchasedBy] ?? 0) + (item.actualPrice ?? 0);
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Cost Summary" subtitle={household?.name} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Total spend overview */}
        <Surface style={styles.overviewCard} elevation={2}>
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            Total Spent
          </Text>
          <Text variant="displaySmall" style={{ color: theme.colors.primary, fontWeight: '700' }}>
            {formatCurrency(totalSpend)}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            across {purchasedItems.length} purchased item{purchasedItems.length !== 1 ? 's' : ''}
          </Text>
        </Surface>

        {/* Per-member spend */}
        {Object.keys(spendByMember).length > 0 && (
          <>
            <Text variant="labelLarge" style={styles.sectionTitle}>
              Who paid
            </Text>
            {Object.entries(spendByMember)
              .sort(([, a], [, b]) => b - a)
              .map(([uid, amount]) => (
                <Surface key={uid} style={styles.memberRow} elevation={1}>
                  <View style={styles.memberInfo}>
                    <Text variant="bodyLarge" style={{ fontWeight: '500' }}>
                      {household?.memberNames[uid] ?? uid}
                      {uid === firebaseUser?.uid ? ' (you)' : ''}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {Math.round((amount / totalSpend) * 100)}% of total
                    </Text>
                  </View>
                  <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                    {formatCurrency(amount)}
                  </Text>
                </Surface>
              ))}
            <Divider style={styles.divider} />
          </>
        )}

        {/* Balance summary */}
        <Text variant="labelLarge" style={styles.sectionTitle}>
          Who owes whom
        </Text>
        <BalanceSummary
          rawBalances={balances}
          memberNames={household?.memberNames ?? {}}
          currentUserId={firebaseUser?.uid ?? ''}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, gap: 16, paddingBottom: 32 },
  overviewCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 4,
  },
  sectionTitle: { fontWeight: '600', marginTop: 8 },
  memberRow: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberInfo: { gap: 2 },
  divider: { marginVertical: 8 },
});
