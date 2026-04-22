import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from './firebase';
import { getUserDoc, createUserDoc } from './firestore';
import type { User } from './types';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  userDoc: User | null;
  loading: boolean;
  refreshUserDoc: () => Promise<void>;
  activeHouseholdId: string | null;
  setActiveHouseholdId: (id: string) => void;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  userDoc: null,
  loading: true,
  refreshUserDoc: async () => {},
  activeHouseholdId: null,
  setActiveHouseholdId: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userDoc, setUserDoc] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeHouseholdId, setActiveHouseholdIdState] = useState<string | null>(null);

  const loadUserDoc = async (fbUser: FirebaseUser) => {
    let doc = await getUserDoc(fbUser.uid);
    if (!doc) {
      await createUserDoc(fbUser.uid, fbUser.displayName ?? 'User', fbUser.email ?? '');
      doc = await getUserDoc(fbUser.uid);
    }
    setUserDoc(doc);
  };

  const refreshUserDoc = async () => {
    if (firebaseUser) await loadUserDoc(firebaseUser);
  };

  // Keep activeHouseholdId in sync with the user's household list.
  // If the current selection is still valid, keep it; otherwise pick the first one.
  useEffect(() => {
    const ids = userDoc?.householdIds ?? [];
    if (ids.length === 0) {
      setActiveHouseholdIdState(null);
      return;
    }
    setActiveHouseholdIdState((prev) =>
      prev && ids.includes(prev) ? prev : ids[0],
    );
  }, [userDoc]);

  const setActiveHouseholdId = (id: string) => {
    setActiveHouseholdIdState(id);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      setFirebaseUser(fbUser);
      if (fbUser) {
        await loadUserDoc(fbUser);
      } else {
        setUserDoc(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ firebaseUser, userDoc, loading, refreshUserDoc, activeHouseholdId, setActiveHouseholdId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
