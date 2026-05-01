import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Modal,
  Portal,
  Text,
  Button,
  Surface,
  useTheme,
  IconButton,
  Divider,
  ActivityIndicator,
} from 'react-native-paper';
import { removeMember, archiveGroup } from '../lib/firestore';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onDeleted: () => void;
  householdId: string;
  members: string[];
  memberNames: Record<string, string>;
  currentUserId: string;
}

export default function ManageMembersModal({
  visible,
  onDismiss,
  onDeleted,
  householdId,
  members,
  memberNames,
  currentUserId,
}: Props) {
  const theme = useTheme();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteGroup = async () => {
    setDeleting(true);
    try {
      await archiveGroup(householdId, members);
      onDeleted();
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleRemove = async (uid: string) => {
    setRemovingId(uid);
    try {
      await removeMember(householdId, uid);
      setRemovedIds((prev) => [...prev, uid]);
    } finally {
      setRemovingId(null);
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
          <View style={styles.header}>
            <Text variant="titleLarge" style={styles.title}>Manage Members</Text>
            <IconButton icon="close" onPress={onDismiss} />
          </View>

          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
            Tap the remove button to kick a member from the group.
          </Text>

          {members.map((uid, index) => (
            <View key={uid}>
              {index > 0 && <Divider style={styles.divider} />}
              <View style={styles.memberRow}>
                <View style={styles.memberInfo}>
                  <Text
                    variant="bodyLarge"
                    style={[
                      { fontWeight: '500' },
                      removedIds.includes(uid) && { textDecorationLine: 'line-through', color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {memberNames[uid] ?? uid}
                  </Text>
                  {uid === currentUserId ? (
                    <Text variant="bodySmall" style={{ color: theme.colors.primary }}>You (owner)</Text>
                  ) : removedIds.includes(uid) ? (
                    <Text variant="bodySmall" style={{ color: theme.colors.error }}>Removed from group</Text>
                  ) : null}
                </View>
                {uid !== currentUserId && !removedIds.includes(uid) && (
                  removingId === uid ? (
                    <ActivityIndicator size="small" color={theme.colors.error} />
                  ) : (
                    <IconButton
                      icon="account-remove"
                      iconColor={theme.colors.error}
                      size={22}
                      onPress={() => handleRemove(uid)}
                    />
                  )
                )}
              </View>
            </View>
          ))}

          <Button
            mode="text"
            onPress={() => { setRemovedIds([]); onDismiss(); }}
            style={{ marginTop: 12 }}
          >
            Done
          </Button>

          <Divider style={{ marginVertical: 16 }} />

          {confirmDelete ? (
            <View style={styles.deleteConfirm}>
              <Text variant="bodyMedium" style={{ fontWeight: '600', marginBottom: 8 }}>
                Archive this group?
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                All members will lose access, but the group history and costs will be saved and visible to you.
              </Text>
              <View style={styles.confirmButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setConfirmDelete(false)}
                  style={styles.confirmBtn}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleDeleteGroup}
                  loading={deleting}
                  disabled={deleting}
                  buttonColor={theme.colors.error}
                  style={styles.confirmBtn}
                >
                  Archive
                </Button>
              </View>
            </View>
          ) : (
            <Button
              mode="outlined"
              icon="archive"
              textColor={theme.colors.error}
              style={styles.deleteBtn}
              onPress={() => setConfirmDelete(true)}
            >
              Archive Group
            </Button>
          )}
        </Surface>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { margin: 24 },
  surface: { borderRadius: 16, padding: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: { fontWeight: '700' },
  divider: { marginVertical: 4 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  memberInfo: { flex: 1 },
  deleteBtn: { borderColor: 'transparent' },
  deleteConfirm: {},
  confirmButtons: { flexDirection: 'row', gap: 12 },
  confirmBtn: { flex: 1 },
});
