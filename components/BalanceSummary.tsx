import { View, StyleSheet } from 'react-native';
import { Text, Surface, Chip, useTheme, Divider } from 'react-native-paper';
import { computeNetBalances, formatCurrency } from '../lib/splitCost';

interface Props {
  rawBalances: Record<string, number>;
  memberNames: Record<string, string>;
  currentUserId: string;
}

export default function BalanceSummary({ rawBalances, memberNames, currentUserId }: Props) {
  const theme = useTheme();
  const transfers = computeNetBalances(rawBalances, memberNames);

  if (transfers.length === 0) {
    return (
      <Surface style={styles.settledCard} elevation={1}>
        <Text variant="headlineSmall" style={{ textAlign: 'center' }}>✅</Text>
        <Text variant="titleMedium" style={[styles.settledText, { color: theme.colors.primary }]}>
          All settled up!
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
          No outstanding balances between members.
        </Text>
      </Surface>
    );
  }

  const myDebts = transfers.filter((t) => t.from === currentUserId);
  const owedToMe = transfers.filter((t) => t.to === currentUserId);
  const otherTransfers = transfers.filter(
    (t) => t.from !== currentUserId && t.to !== currentUserId,
  );

  return (
    <View style={styles.container}>
      {myDebts.length > 0 && (
        <Surface style={[styles.section, { borderLeftColor: theme.colors.error, borderLeftWidth: 4 }]} elevation={2}>
          <Text variant="labelLarge" style={{ color: theme.colors.error, marginBottom: 10 }}>
            You owe
          </Text>
          {myDebts.map((t, i) => (
            <View key={i} style={styles.transferRow}>
              <Chip icon="arrow-right" compact style={{ backgroundColor: theme.colors.errorContainer }}>
                {memberNames[t.to] ?? 'Removed user'}
              </Chip>
              <Text variant="titleMedium" style={{ color: theme.colors.error, fontWeight: '700' }}>
                {formatCurrency(t.amount)}
              </Text>
            </View>
          ))}
        </Surface>
      )}

      {owedToMe.length > 0 && (
        <Surface style={[styles.section, { borderLeftColor: theme.colors.primary, borderLeftWidth: 4 }]} elevation={2}>
          <Text variant="labelLarge" style={{ color: theme.colors.primary, marginBottom: 10 }}>
            Owed to you
          </Text>
          {owedToMe.map((t, i) => (
            <View key={i} style={styles.transferRow}>
              <Chip icon="arrow-left" compact style={{ backgroundColor: theme.colors.secondaryContainer }}>
                {memberNames[t.from] ?? 'Removed user'}
              </Chip>
              <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                {formatCurrency(t.amount)}
              </Text>
            </View>
          ))}
        </Surface>
      )}

      {otherTransfers.length > 0 && (
        <>
          <Divider style={styles.divider} />
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 10 }}>
            Between other members
          </Text>
          {otherTransfers.map((t, i) => (
            <Surface key={i} style={styles.otherRow} elevation={1}>
              <Text variant="bodyMedium">
                <Text style={{ fontWeight: '600' }}>{memberNames[t.from] ?? 'Removed user'}</Text>
                {' → '}
                <Text style={{ fontWeight: '600' }}>{memberNames[t.to] ?? 'Removed user'}</Text>
              </Text>
              <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                {formatCurrency(t.amount)}
              </Text>
            </Surface>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  section: { borderRadius: 12, padding: 16 },
  transferRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settledCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  settledText: { textAlign: 'center', fontWeight: '700', marginTop: 4 },
  divider: { marginVertical: 8 },
  otherRow: {
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
});
