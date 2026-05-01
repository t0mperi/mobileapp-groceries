import { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import {
  Text,
  FAB,
  useTheme,
  Appbar,
  Chip,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  subscribeToHousehold,
  subscribeToItems,
  subscribeToInvites,
} from '../lib/firestore';
import { useAuth } from '../lib/AuthContext';
import AddItemModal from '../components/AddItemModal';
import ItemCard from '../components/ItemCard';
import InvitesModal from '../components/InvitesModal';
import InviteModal from '../components/InviteModal';
import ManageMembersModal from '../components/ManageMembersModal';
import type { Household, GroceryItem, Invite } from '../lib/types';

export default function ListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { firebaseUser, userDoc, activeHouseholdId, setActiveHouseholdId } = useAuth();

  const [household, setHousehold] = useState<Household | null>(null);
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [invitesModalVisible, setInvitesModalVisible] = useState(false);
  const [manageMembersVisible, setManageMembersVisible] = useState(false);


  const hid = activeHouseholdId ?? '';

  useEffect(() => {
    if (!firebaseUser) return;
    const unsub = subscribeToInvites(firebaseUser.uid, setPendingInvites);
    return unsub;
  }, [firebaseUser?.uid]);

  useEffect(() => {
    if (!hid) return;
    // Clear stale data immediately so the old household's members never flash
    setHousehold(null);
    setItems([]);
    setLoading(true);
    const unsub1 = subscribeToHousehold(hid, (h) => {
      setHousehold(h);
      setLoading(false);
    });
    const unsub2 = subscribeToItems(hid, setItems);
    return () => { unsub1(); unsub2(); };
  }, [hid]);


  const pending = items.filter((i) => !i.purchased);
  const purchased = items.filter((i) => i.purchased);

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
        <Appbar.BackAction onPress={() => router.replace('/select')} />

        <Appbar.Content
          title={household?.name ?? 'Groceries'}
          subtitle={`${household?.members.length ?? 0} members`}
        />
        {pendingInvites.length > 0 && (
          <Appbar.Action
            icon="bell-badge"
            onPress={() => setInvitesModalVisible(true)}
          />
        )}
        {household?.createdBy === firebaseUser.uid && (
          <Appbar.Action icon="account-edit" onPress={() => setManageMembersVisible(true)} />
        )}
        <Appbar.Action icon="account-plus" onPress={() => setInviteModalVisible(true)} />
        <Appbar.Action icon="scale-balance" onPress={() => router.push('/costs')} />
        <Appbar.Action icon="logout" onPress={() => signOut(auth)} />
      </Appbar.Header>

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

      <InvitesModal
        visible={invitesModalVisible}
        onDismiss={() => setInvitesModalVisible(false)}
        invites={pendingInvites}
        onResponded={() => setInvitesModalVisible(false)}
      />

      <ManageMembersModal
        visible={manageMembersVisible}
        onDismiss={() => setManageMembersVisible(false)}
        onDeleted={() => { setManageMembersVisible(false); router.replace('/select'); }}
        householdId={hid}
        members={household?.members ?? []}
        memberNames={household?.memberNames ?? {}}
        currentUserId={firebaseUser.uid}
      />

      <InviteModal
        visible={inviteModalVisible}
        onDismiss={() => setInviteModalVisible(false)}
        householdId={hid}
        householdName={household?.name ?? ''}
        inviteCode={household?.inviteCode ?? ''}
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
