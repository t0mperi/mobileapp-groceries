import { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Surface,
  HelperText,
  useTheme,
  SegmentedButtons,
  Divider,
} from 'react-native-paper';
import { signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { auth } from '../lib/firebase';
import { createHousehold, joinHouseholdByCode } from '../lib/firestore';
import { useAuth } from '../lib/AuthContext';

export default function HouseholdScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { firebaseUser, userDoc, refreshUserDoc, setActiveHouseholdId } = useAuth();
  const hasHouseholds = (userDoc?.householdIds?.length ?? 0) > 0;
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setError('');
    if (!householdName.trim()) {
      setError('Please enter a group name.');
      return;
    }
    setLoading(true);
    try {
      const hid = await createHousehold(
        firebaseUser!.uid,
        userDoc?.displayName ?? firebaseUser!.displayName ?? 'User',
        householdName.trim(),
      );
      setActiveHouseholdId(hid);
      await refreshUserDoc();
      router.replace('/list');
    } catch (e) {
      setError('Failed to create group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    setError('');
    if (inviteCode.trim().length < 6) {
      setError('Please enter a valid 6-character invite code.');
      return;
    }
    setLoading(true);
    try {
      const result = await joinHouseholdByCode(
        firebaseUser!.uid,
        userDoc?.displayName ?? firebaseUser!.displayName ?? 'User',
        inviteCode.trim(),
      );
      if (!result) {
        setError('Invite code not found or group is full (max 10 members).');
      } else {
        setActiveHouseholdId(result.id);
        await refreshUserDoc();
        router.replace('/list');
      }
    } catch (e) {
      setError('Failed to join group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={{ fontWeight: '700', color: theme.colors.primary }}>
            {hasHouseholds ? 'Add Another Group' : 'Set Up Your Group'}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6, textAlign: 'center' }}>
            Create a new group or join one with an invite code
          </Text>
        </View>

        {hasHouseholds && (
          <Button
            mode="text"
            icon="arrow-left"
            onPress={() => router.back()}
            style={{ alignSelf: 'flex-start', marginBottom: 8 }}
          >
            Back to list
          </Button>
        )}

        <SegmentedButtons
          value={tab}
          onValueChange={(v) => { setTab(v as 'create' | 'join'); setError(''); }}
          buttons={[
            { value: 'create', label: 'Create New', icon: 'home-plus' },
            { value: 'join', label: 'Join Existing', icon: 'account-group' },
          ]}
          style={styles.tabs}
        />

        <Surface style={styles.card} elevation={2}>
          {tab === 'create' ? (
            <>
              <Text variant="titleMedium" style={styles.sectionTitle}>Create a Group</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                Give your group a name. You'll receive an invite code to share with others.
              </Text>
              <TextInput
                label="Group Name"
                value={householdName}
                onChangeText={setHouseholdName}
                mode="outlined"
                placeholder="e.g. The Smith House"
                left={<TextInput.Icon icon="home" />}
                style={styles.input}
              />
              {error ? <HelperText type="error">{error}</HelperText> : null}
              <Button
                mode="contained"
                onPress={handleCreate}
                loading={loading}
                disabled={loading}
                style={styles.button}
                contentStyle={styles.buttonContent}
                icon="home-plus"
              >
                Create Group
              </Button>
            </>
          ) : (
            <>
              <Text variant="titleMedium" style={styles.sectionTitle}>Join a Group</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                Enter the 6-character invite code shared by a group member.
              </Text>
              <TextInput
                label="Invite Code"
                value={inviteCode}
                onChangeText={(v) => setInviteCode(v.toUpperCase())}
                mode="outlined"
                maxLength={6}
                autoCapitalize="characters"
                left={<TextInput.Icon icon="key" />}
                style={styles.input}
              />
              {error ? <HelperText type="error">{error}</HelperText> : null}
              <Button
                mode="contained"
                onPress={handleJoin}
                loading={loading}
                disabled={loading}
                style={styles.button}
                contentStyle={styles.buttonContent}
                icon="account-group"
              >
                Join Group
              </Button>
            </>
          )}
        </Surface>

        <Divider style={styles.divider} />

        <Button
          mode="text"
          icon="logout"
          onPress={() => signOut(auth)}
          textColor={theme.colors.error}
        >
          Sign Out
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 24 },
  tabs: { marginBottom: 20 },
  card: { borderRadius: 16, padding: 24 },
  sectionTitle: { marginBottom: 8, fontWeight: '600' },
  input: { marginBottom: 8 },
  button: { marginTop: 12, borderRadius: 8 },
  buttonContent: { paddingVertical: 6 },
  divider: { marginVertical: 24 },
});
