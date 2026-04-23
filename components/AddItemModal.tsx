import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import {
  Modal,
  Portal,
  Text,
  TextInput,
  Button,
  Surface,
  useTheme,
  HelperText,
  IconButton,
} from 'react-native-paper';
import { addItem } from '../lib/firestore';
import type { GroceryItem } from '../lib/types';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  householdId: string;
  userId: string;
  userDisplayName: string;
  members: string[];
  memberNames: Record<string, string>;
}

export default function AddItemModal({
  visible,
  onDismiss,
  householdId,
  userId,
  userDisplayName,
  members,
  memberNames,
}: Props) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setName('');
    setQuantity('1');
    setEstimatedPrice('');
    setError('');
  };

  const handleAdd = async () => {
    setError('');
    if (!name.trim()) {
      setError('Item name is required.');
      return;
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      setError('Quantity must be at least 1.');
      return;
    }
    const price = parseFloat(estimatedPrice);
    if (estimatedPrice && isNaN(price)) {
      setError('Enter a valid price.');
      return;
    }

    setLoading(true);
    try {
      const item: Omit<GroceryItem, 'id' | 'createdAt'> = {
        name: name.trim(),
        quantity: qty,
        estimatedPrice: isNaN(price) ? 0 : price,
        addedBy: userId,
        addedByName: userDisplayName,
        purchased: false,
        splitBetween: members,
      };
      await addItem(householdId, item);
      reset();
      onDismiss();
    } catch {
      setError('Failed to add item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    reset();
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Surface style={styles.surface} elevation={4}>
            <View style={styles.header}>
              <Text variant="titleLarge" style={styles.title}>Add Grocery Item</Text>
              <IconButton icon="close" onPress={handleDismiss} />
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <TextInput
                label="Item Name"
                value={name}
                onChangeText={setName}
                mode="outlined"
                placeholder="e.g. Milk"
                left={<TextInput.Icon icon="food" />}
                style={styles.input}
                autoFocus
              />

              <View style={styles.row}>
                <TextInput
                  label="Quantity"
                  value={quantity}
                  onChangeText={setQuantity}
                  mode="outlined"
                  keyboardType="numeric"
                  left={<TextInput.Icon icon="counter" />}
                  style={[styles.input, styles.halfInput]}
                />
                <TextInput
                  label="Est. Price ($)"
                  value={estimatedPrice}
                  onChangeText={setEstimatedPrice}
                  mode="outlined"
                  keyboardType="decimal-pad"
                  left={<TextInput.Icon icon="currency-usd" />}
                  style={[styles.input, styles.halfInput]}
                />
              </View>

              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
                Split between all {members.length} member{members.length !== 1 ? 's' : ''} by default.
                You can change this when marking as purchased.
              </Text>

              {error ? <HelperText type="error">{error}</HelperText> : null}

              <View style={styles.actions}>
                <Button mode="outlined" onPress={handleDismiss} style={styles.actionBtn}>
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleAdd}
                  loading={loading}
                  disabled={loading}
                  style={styles.actionBtn}
                  icon="plus"
                >
                  Add Item
                </Button>
              </View>
            </ScrollView>
          </Surface>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
  },
  surface: {
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontWeight: '600' },
  input: { marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: { flex: 1 },
});
