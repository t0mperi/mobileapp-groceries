import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Card,
  Text,
  Checkbox,
  IconButton,
  useTheme,
  Chip,
  Modal,
  Portal,
  Surface,
  TextInput,
  Button,
  HelperText,
} from 'react-native-paper';
import { markPurchased, deleteItem } from '../lib/firestore';
import { formatCurrency } from '../lib/splitCost';
import type { GroceryItem } from '../lib/types';

interface Props {
  item: GroceryItem;
  householdId: string;
  currentUserId: string;
  members: string[];
  memberNames: Record<string, string>;
}

export default function ItemCard({ item, householdId, currentUserId, members, memberNames }: Props) {
  const theme = useTheme();
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [actualPrice, setActualPrice] = useState(
    item.estimatedPrice ? item.estimatedPrice.toFixed(2) : '',
  );
  const [selectedSplit, setSelectedSplit] = useState<string[]>(members);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleSplitMember = (uid: string) => {
    setSelectedSplit((prev) =>
      prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid],
    );
  };

  const handleMarkPurchased = async () => {
    setError('');
    const price = parseFloat(actualPrice);
    if (isNaN(price) || price < 0) {
      setError('Enter a valid price.');
      return;
    }
    if (selectedSplit.length === 0) {
      setError('Select at least one member to split with.');
      return;
    }
    setLoading(true);
    try {
      await markPurchased(householdId, item.id, price, currentUserId, selectedSplit);
      setPurchaseModalVisible(false);
    } catch {
      setError('Failed to update item.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    await deleteItem(householdId, item.id);
  };

  return (
    <>
      <Card
        style={[
          styles.card,
          item.purchased && { opacity: 0.6, backgroundColor: theme.colors.surfaceVariant },
        ]}
        elevation={item.purchased ? 0 : 2}
      >
        <Card.Content style={styles.content}>
          <View style={styles.left}>
            <Checkbox.Android
              status={item.purchased ? 'checked' : 'unchecked'}
              onPress={() => !item.purchased && setPurchaseModalVisible(true)}
              color={theme.colors.primary}
            />
          </View>

          <View style={styles.middle}>
            <Text
              variant="bodyLarge"
              style={[styles.name, item.purchased && styles.strikethrough]}
            >
              {item.name}
            </Text>
            <View style={styles.meta}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                ×{item.quantity}
              </Text>
              {item.estimatedPrice > 0 && (
                <Chip compact style={styles.priceChip} textStyle={styles.priceText}>
                  {item.purchased && item.actualPrice != null
                    ? formatCurrency(item.actualPrice)
                    : `~${formatCurrency(item.estimatedPrice)}`}
                </Chip>
              )}
              {item.purchased && item.splitBetween.length > 0 && (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  split {item.splitBetween.length} ways
                </Text>
              )}
            </View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Added by {item.addedByName}
            </Text>
          </View>

          {!item.purchased && (
            <IconButton
              icon="trash-can-outline"
              iconColor={theme.colors.error}
              size={20}
              onPress={handleDelete}
            />
          )}
        </Card.Content>
      </Card>

      <Portal>
        <Modal
          visible={purchaseModalVisible}
          onDismiss={() => setPurchaseModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalSurface} elevation={4}>
            <Text variant="titleMedium" style={styles.modalTitle}>
              Mark as Purchased
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
              "{item.name}" — enter what you actually paid and who to split with.
            </Text>

            <TextInput
                  label="Actual Price (€)"
              value={actualPrice}
              onChangeText={setActualPrice}
              mode="outlined"
              keyboardType="decimal-pad"
                  left={<TextInput.Icon icon="currency-eur" />}
              style={styles.input}
            />

            <Text variant="bodyMedium" style={styles.splitLabel}>Split between:</Text>
            <View style={styles.chipRow}>
              {members.map((uid) => (
                <Chip
                  key={uid}
                  selected={selectedSplit.includes(uid)}
                  onPress={() => toggleSplitMember(uid)}
                  style={styles.memberChip}
                  showSelectedCheck
                >
                  {memberNames[uid] ?? uid}
                </Chip>
              ))}
            </View>

            {error ? <HelperText type="error">{error}</HelperText> : null}

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setPurchaseModalVisible(false)} style={styles.actionBtn}>
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleMarkPurchased}
                loading={loading}
                disabled={loading}
                style={styles.actionBtn}
              >
                Confirm
              </Button>
            </View>
          </Surface>
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 10, borderRadius: 12 },
  content: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  left: { marginRight: 4 },
  middle: { flex: 1, minWidth: 0 },
  name: { fontWeight: '500' },
  strikethrough: { textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' },
  priceChip: { height: 26, justifyContent: 'center' },
  priceText: { fontSize: 12, lineHeight: 16 },
  modalContainer: { margin: 24 },
  modalSurface: { borderRadius: 16, padding: 20 },
  modalTitle: { marginBottom: 8, fontWeight: '600' },
  input: { marginBottom: 12 },
  splitLabel: { marginBottom: 8, fontWeight: '500' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  memberChip: {},
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionBtn: { flex: 1 },
});
