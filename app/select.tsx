import { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import {
  Text,
  Surface,
  Button,
  useTheme,
  ActivityIndicator,
  Appbar,
  Divider,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { subscribeToHousehold } from '../lib/firestore';
import { useAuth } from '../lib/AuthContext';
import type { Household } from '../lib/types';

export default function SelectScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { userDoc, setActiveHouseholdId } = useAuth();

  const householdIds = userDoc?.householdIds ?? [];
  const [households, setHouseholds] = useState<Record<string, Household>>({});

  useEffect(() => {
    if (householdIds.length === 0) return;
    const unsubs = householdIds.map((id) =>
      subscribeToHousehold(id, (h) =>
        setHouseholds((prev) => ({ ...prev, [id]: h })),
      ),
    );
    return () => unsubs.forEach((u) => u());
  }, [householdIds.join(',')]);

  const loaded = householdIds.every((id) => households[id]);

  const handleSelect = (id: string) => {
    setActiveHouseholdId(id);
    router.replace('/list');
  };

  if (!loaded) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.Content title="Your Households" />
        <Appbar.Action icon="logout" onPress={() => signOut(auth)} />
      </Appbar.Header>

      <FlatList
        data={householdIds}
        keyExtractor={(id) => id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginBottom: 20 }}
          >
            Choose a household to open, or add a new one.
          </Text>
        }
        renderItem={({ item: id }) => {
          const h = households[id];
          return (
            <Surface
              style={[styles.card, { borderColor: theme.colors.outlineVariant }]}
              elevation={2}
              onTouchEnd={() => handleSelect(id)}
            >
              <View style={styles.cardBody}>
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                    {h.name}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}
                  >
                    {h.members.length} member{h.members.length !== 1 ? 's' : ''} · code{' '}
                    <Text style={{ fontWeight: '600', letterSpacing: 1 }}>{h.inviteCode}</Text>
                  </Text>
                </View>
                <Text style={{ color: theme.colors.primary, fontSize: 22 }}>›</Text>
              </View>
            </Surface>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListFooterComponent={
          <>
            <Divider style={{ marginVertical: 24 }} />
            <Button
              mode="outlined"
              icon="home-plus"
              onPress={() => router.push('/household')}
              style={styles.addBtn}
              contentStyle={styles.addBtnContent}
            >
              Add / Join Another Household
            </Button>
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20, paddingBottom: 40 },
  card: {
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addBtn: { borderRadius: 8 },
  addBtnContent: { paddingVertical: 4 },
});
