import { Redirect } from 'expo-router';
import { useAuth } from '../lib/AuthContext';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { firebaseUser, userDoc, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  if (!firebaseUser) return <Redirect href="/auth" />;
  if (!userDoc?.householdIds?.length) return <Redirect href="/household" />;
  return <Redirect href="/select" />;
}
