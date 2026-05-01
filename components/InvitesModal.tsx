import { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Modal,
  Portal,
  Text,
  Button,
  Surface,
  useTheme,
  Divider,
  ActivityIndicator,
} from 'react-native-paper';
import { respondToInvite } from '../lib/firestore';
import { useAuth } from '../lib/AuthContext';
import type { Invite } from '../lib/types';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  invites: Invite[];
  onResponded: () => void;
}

export default function InvitesModal({ visible, onDismiss, invites, onResponded }: Props) {
  const theme = useTheme();
  const { userDoc, refreshUserDoc } = useAuth();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleRespond = async (invite: Invite, accept: boolean) => {
    setLoadingId(invite.id);
    try {
      await respondToInvite(invite, accept, userDoc?.displayName ?? 'User');
      await refreshUserDoc();
      onResponded();
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <Surface style={styles.surface} elevation={4}>
          <Text variant="titleLarge" style={styles.title}>
            Group Invites
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
            You've been invited to join the following groups.
          </Text>

          <ScrollView>
            {invites.map((invite, index) => (
              <View key={invite.id}>
                {index > 0 && <Divider style={styles.divider} />}
                <View style={styles.inviteRow}>
                  <View style={styles.inviteInfo}>
                    <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                      {invite.householdName}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Invited by {invite.fromName}
                    </Text>
                  </View>
                  <View style={styles.inviteActions}>
                    {loadingId === invite.id ? (
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                      <>
                        <Button
                          mode="outlined"
                          onPress={() => handleRespond(invite, false)}
                          textColor={theme.colors.error}
                          style={styles.actionBtn}
                          compact
                        >
                          Decline
                        </Button>
                        <Button
                          mode="contained"
                          onPress={() => handleRespond(invite, true)}
                          style={styles.actionBtn}
                          compact
                        >
                          Accept
                        </Button>
                      </>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          <Button mode="text" onPress={onDismiss} style={{ marginTop: 8 }}>
            Close
          </Button>
        </Surface>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { margin: 24 },
  surface: { borderRadius: 16, padding: 24 },
  title: { fontWeight: '700', marginBottom: 4 },
  divider: { marginVertical: 12 },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  inviteInfo: { flex: 1 },
  inviteActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  actionBtn: { borderRadius: 8 },
});
