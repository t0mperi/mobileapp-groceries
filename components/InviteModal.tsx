import { useState } from 'react';
import { View, StyleSheet, Clipboard } from 'react-native';
import {
  Modal,
  Portal,
  Text,
  TextInput,
  Button,
  Surface,
  useTheme,
  HelperText,
  Divider,
  IconButton,
  Snackbar,
} from 'react-native-paper';
import { sendInvite } from '../lib/firestore';
import { useAuth } from '../lib/AuthContext';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  householdId: string;
  householdName: string;
  inviteCode: string;
}

export default function InviteModal({ visible, onDismiss, householdId, householdName, inviteCode }: Props) {
  const theme = useTheme();
  const { firebaseUser, userDoc } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  const handleDismiss = () => {
    setEmail('');
    setError('');
    setSuccess('');
    onDismiss();
  };

  const handleCopy = () => {
    Clipboard.setString(inviteCode);
    setCopied(true);
  };

  const handleInvite = async () => {
    setError('');
    setSuccess('');
    if (!email.trim().includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!firebaseUser) return;
    setLoading(true);
    try {
      const result = await sendInvite(
        firebaseUser.uid,
        userDoc?.displayName ?? firebaseUser.displayName ?? 'User',
        householdId,
        email.trim(),
      );
      if (result === 'sent') {
        setSuccess(`Invite sent to ${email.trim()}!`);
        setEmail('');
      } else if (result === 'not_found') {
        setError('No account found with that email. They need to sign up first.');
      } else if (result === 'already_member') {
        setError('That person is already in this group.');
      } else if (result === 'already_invited') {
        setError('That person already has a pending invite to this group.');
      }
    } catch {
      setError('Failed to send invite. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <Surface style={styles.surface} elevation={4}>
          <View style={styles.header}>
            <Text variant="titleLarge" style={styles.title}>Invite to Group</Text>
            <IconButton icon="close" onPress={handleDismiss} />
          </View>

          {/* Share invite code */}
          <Text variant="labelMedium" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
            INVITE CODE
          </Text>
          <View style={styles.codeRow}>
            <Text style={[styles.code, { color: theme.colors.primary }]}>{inviteCode}</Text>
            <IconButton
              icon={copied ? 'check' : 'content-copy'}
              iconColor={copied ? theme.colors.primary : theme.colors.onSurfaceVariant}
              onPress={handleCopy}
            />
          </View>

          <Divider style={styles.divider} />

          {/* Invite by email */}
          <Text variant="labelMedium" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
            INVITE BY EMAIL
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
            They'll get a notification in the app to accept.
          </Text>
          <TextInput
            label="Email Address"
            value={email}
            onChangeText={(v) => { setEmail(v); setError(''); setSuccess(''); }}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="friend@example.com"
            left={<TextInput.Icon icon="email" />}
            style={styles.input}
          />
          {error ? <HelperText type="error">{error}</HelperText> : null}
          {success ? <HelperText type="info" style={{ color: theme.colors.primary }}>{success}</HelperText> : null}
          <Button
            mode="contained"
            onPress={handleInvite}
            loading={loading}
            disabled={loading}
            icon="email-plus"
            style={styles.sendBtn}
          >
            Send Invite
          </Button>
        </Surface>
      </Modal>
      <Snackbar
        visible={copied}
        onDismiss={() => setCopied(false)}
        duration={2000}
      >
        Code copied to clipboard!
      </Snackbar>
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
    marginBottom: 16,
  },
  title: { fontWeight: '700' },
  sectionLabel: { marginBottom: 8, letterSpacing: 0.8, fontWeight: '600' },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  code: { fontSize: 28, fontWeight: '800', letterSpacing: 6, flex: 1 },
  divider: { marginVertical: 20 },
  input: { marginBottom: 4 },
  sendBtn: { marginTop: 8, borderRadius: 8 },
});
