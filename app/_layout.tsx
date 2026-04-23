import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { AuthProvider, useAuth } from '../lib/AuthContext';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2E7D32',
    secondaryContainer: '#C8E6C9',
    onSecondaryContainer: '#1B5E20',
  },
};

function RootGuard() {
  const { firebaseUser, userDoc, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === 'auth';
    const inHousehold = segments[0] === 'household';
    const inSelect = segments[0] === 'select';

    if (!firebaseUser) {
      if (!inAuth) router.replace('/auth');
    } else if (!userDoc?.householdIds?.length) {
      // No households yet — must go through setup
      if (!inHousehold) router.replace('/household');
    } else {
      // Has households — show picker after sign-in, let them visit /household freely
      if (inAuth) router.replace('/select');
    }
  }, [firebaseUser, userDoc, loading, segments]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <PaperProvider theme={theme}>
      <AuthProvider>
        <RootGuard />
      </AuthProvider>
    </PaperProvider>
  );
}
