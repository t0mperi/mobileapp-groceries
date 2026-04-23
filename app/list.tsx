import { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Share } from 'react-native';
import {
  Text,
  FAB,
  useTheme,
  Appbar,
  Chip,
  ActivityIndicator,
  Banner,
  Divider,
  Menu,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  subscribeToHousehold,
  subscribeToItems,
} from '../lib/firestore';
import { useAuth } from '../lib/AuthContext';
import AddItemModal from '../components/AddItemModal';
import ItemCard from '../components/ItemCard';
import type { Household, GroceryItem } from '../lib/types';

export default function ListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { firebaseUser, userDoc, activeHouseholdId, setActiveHouseholdId } = useAuth();

  const [household, setHousehold] = useState<Household | null>(null);
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showInviteBanner, setShowInviteBanner] = useState(false);
  const [householdMenuVisible, setHouseholdMenuVisible] = useState(false);

  // Names for each household in the switcher — fetched lazily via snapshot
  const [householdNames, setHouseholdNames] = useState<Record<string, string>>({});

  const hid = activeHouseholdId ?? '';

  useEffect(() => {
    if (!hid) return;
    // Clear stale data immediately so the old household's members never flash
    setHousehold(null);
    setItems([]);
    setLoading(true);
    const unsub1 = subscribeToHousehold(hid, (h) => {
      setHousehold(h);
      setLoading(false);
      setHouseholdNames((prev) => ({ ...prev, [hid]: h.name }));
    });
    const unsub2 = subscribeToItems(hid, setItems);
    return () => { unsub1(); unsub2(); };
  }, [hid]);

  // Subscribe to each household for its display name in the switcher menu.
  // Re-runs only when the set of household IDs actually changes.
  const householdIdsKey = (userDoc?.householdIds ?? []).join(',');
  useEffect(() => {
    const ids = userDoc?.householdIds ?? [];
    if (ids.length === 0) return;
    const unsubs = ids.map((id) =>
      subscribeToHousehold(id, (h) =>
        setHouseholdNames((prev) => ({ ...prev, [id]: h.name })),
      ),
    );
    return () => unsubs.forEach((u) => u());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdIdsKey]);

  const pending = items.filter((i) => !i.purchased);
  const purchased = items.filter((i) => i.purchased);
  const householdIds = userDoc?.householdIds ?? [];

  const shareInviteCode = async () => {
    if (!household) return;
    await Share.share({
      message: `Join our grocery list "${household.name}" on Groceries! Use invite code: ${household.inviteCode}`,
    });
  };

  if (loading || !firebaseUser) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        {householdIds.length > 1 ? (
          <Menu
            visible={householdMenuVisible}
            onDismiss={() => setHouseholdMenuVisible(false)}
            anchor={
              <Appbar.Action
                icon="home-switch"
                onPress={() => setHouseholdMenuVisible(true)}
              />
            }
          >
            {householdIds.map((id) => (
              <Menu.Item
                key={id}
                title={householdNames[id] ?? id}
                leadingIcon={id === hid ? 'check' : 'home-outline'}
                onPress={() => {
                  setActiveHouseholdId(id);
                  setHouseholdMenuVisible(false);
                }}
              />
            ))}
            <Divider />
            <Menu.Item
              title="Add / Join Household"
              leadingIcon="home-plus"
              onPress={() => {
                setHouseholdMenuVisible(false);
                router.push('/household');
              }}
            />
          </Menu>
        ) : null}

        <Appbar.Content
          title={household?.name ?? 'Groceries'}
          subtitle={`${household?.members.length ?? 0} members`}
        />
        <Appbar.Action icon="account-plus" onPress={() => setShowInviteBanner((v) => !v)} />
        <Appbar.Action icon="scale-balance" onPress={() => router.push('/costs')} />
        {householdIds.length <= 1 && (
          <Appbar.Action icon="home-plus" onPress={() => router.push('/household')} />
        )}
        <Appbar.Action icon="logout" onPress={() => signOut(auth)} />
      </Appbar.Header>

      <Banner
        visible={showInviteBanner}
        actions={[
          { label: 'Share Code', onPress: shareInviteCode },
          { label: 'Close', onPress: () => setShowInviteBanner(false) },
        ]}
        icon="key"
      >
        <Text>
          Invite code:{' '}
          <Text style={{ fontWeight: '700', letterSpacing: 2, color: theme.colors.primary }}>
            {household?.inviteCode}
          </Text>
          {'  '}Share it with friends to let them join.
        </Text>
      </Banner>

      <FlatList
        data={pending}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <View style={styles.memberRow}>
              {(household?.members ?? []).map((uid) => (
                <Chip key={uid} compact icon="account" style={styles.memberChip}>
                  {household?.memberNames?.[uid] ?? uid}
                </Chip>
              ))}
            </View>

            {pending.length > 0 && (
              <Text variant="labelLarge" style={styles.sectionLabel}>
                Shopping List ({pending.length})
              </Text>
            )}
          </>
        }
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            householdId={hid}
            currentUserId={firebaseUser.uid}
            members={household?.members ?? []}
            memberNames={household?.memberNames ?? {}}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="headlineSmall" style={{ marginBottom: 8 }}>🛒</Text>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              Your list is empty
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Tap + to add your first item
            </Text>
          </View>
        }
        ListFooterComponent={
          purchased.length > 0 ? (
            <>
              <Divider style={{ marginVertical: 16 }} />
              <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                Purchased ({purchased.length})
              </Text>
              {purchased.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  householdId={hid}
                  currentUserId={firebaseUser.uid}
                  members={household?.members ?? []}
                  memberNames={household?.memberNames ?? {}}
                />
              ))}
            </>
          ) : null
        }
      />

      <FAB
        icon="plus"
        label="Add Item"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="white"
        onPress={() => setAddModalVisible(true)}
      />

      <AddItemModal
        visible={addModalVisible}
        onDismiss={() => setAddModalVisible(false)}
        householdId={hid}
        userId={firebaseUser.uid}
        userDisplayName={userDoc?.displayName ?? firebaseUser.displayName ?? 'User'}
        members={household?.members ?? []}
        memberNames={household?.memberNames ?? {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 96 },
  memberRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  memberChip: {},
  sectionLabel: { marginBottom: 12, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 80, gap: 4 },
  fab: { position: 'absolute', right: 16, bottom: 24 },
});
