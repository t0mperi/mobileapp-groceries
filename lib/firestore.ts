import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  arrayUnion,
  Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Household, GroceryItem, User } from './types';

// ── Users ────────────────────────────────────────────────────────────────────

export async function createUserDoc(uid: string, displayName: string, email: string) {
  await setDoc(doc(db, 'users', uid), {
    uid,
    displayName,
    email,
    householdIds: [],
  });
}

export async function getUserDoc(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;

  const data = snap.data() as Record<string, unknown>;

  // Migrate docs that were created before the multi-household update.
  // Old docs have a single `householdId: string | null` field.
  if (!Array.isArray(data.householdIds)) {
    const legacyId = typeof data.householdId === 'string' ? data.householdId : null;
    data.householdIds = legacyId ? [legacyId] : [];
  }

  return data as unknown as User;
}

export async function addUserHousehold(uid: string, householdId: string) {
  await updateDoc(doc(db, 'users', uid), { householdIds: arrayUnion(householdId) });
}

// ── Households ───────────────────────────────────────────────────────────────

export async function createHousehold(
  uid: string,
  displayName: string,
  name: string,
): Promise<string> {
  const hid = doc(collection(db, 'households')).id;
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  await setDoc(doc(db, 'households', hid), {
    id: hid,
    name,
    members: [uid],
    memberNames: { [uid]: displayName },
    inviteCode,
    createdBy: uid,
  } satisfies Household);

  await addUserHousehold(uid, hid);
  return hid;
}

export async function joinHouseholdByCode(
  uid: string,
  displayName: string,
  code: string,
): Promise<Household | null> {
  const { getDocs, where } = await import('firebase/firestore');
  const q = query(collection(db, 'households'), where('inviteCode', '==', code.toUpperCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const householdDoc = snap.docs[0];
  const household = householdDoc.data() as Household;

  if (household.members.length >= 10) return null;

  await updateDoc(householdDoc.ref, {
    members: arrayUnion(uid),
    [`memberNames.${uid}`]: displayName,
  });

  await addUserHousehold(uid, household.id);
  return household;
}

export function subscribeToHousehold(hid: string, cb: (h: Household) => void): Unsubscribe {
  return onSnapshot(doc(db, 'households', hid), (snap) => {
    if (snap.exists()) cb(snap.data() as Household);
  });
}

// ── Grocery Items ─────────────────────────────────────────────────────────────

export function subscribeToItems(
  hid: string,
  cb: (items: GroceryItem[]) => void,
): Unsubscribe {
  const q = query(collection(db, 'lists', hid, 'items'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as GroceryItem)));
  });
}

export async function addItem(
  hid: string,
  item: Omit<GroceryItem, 'id' | 'createdAt'>,
): Promise<void> {
  const ref = doc(collection(db, 'lists', hid, 'items'));
  await setDoc(ref, { ...item, id: ref.id, createdAt: Date.now() });
}

export async function markPurchased(
  hid: string,
  itemId: string,
  actualPrice: number,
  purchasedBy: string,
  splitBetween: string[],
): Promise<void> {
  await updateDoc(doc(db, 'lists', hid, 'items', itemId), {
    purchased: true,
    actualPrice,
    purchasedBy,
    splitBetween,
  });
  await recalculateBalances(hid);
}

export async function deleteItem(hid: string, itemId: string): Promise<void> {
  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, 'lists', hid, 'items', itemId));
}

// ── Balances ──────────────────────────────────────────────────────────────────

export async function recalculateBalances(hid: string): Promise<void> {
  const { getDocs } = await import('firebase/firestore');
  const snap = await getDocs(collection(db, 'lists', hid, 'items'));
  const items = snap.docs.map((d) => d.data() as GroceryItem);

  const balances: Record<string, number> = {};

  for (const item of items) {
    if (!item.purchased || !item.actualPrice || !item.purchasedBy || !item.splitBetween?.length) {
      continue;
    }
    const share = item.actualPrice / item.splitBetween.length;
    for (const uid of item.splitBetween) {
      if (uid === item.purchasedBy) continue;
      // uid owes purchasedBy `share`
      const key = `${uid}:${item.purchasedBy}`;
      balances[key] = (balances[key] ?? 0) + share;
    }
  }

  const batch = writeBatch(db);
  batch.set(doc(db, 'balances', hid), { balances, updatedAt: serverTimestamp() });
  await batch.commit();
}

export function subscribeToBalances(
  hid: string,
  cb: (balances: Record<string, number>) => void,
): Unsubscribe {
  return onSnapshot(doc(db, 'balances', hid), (snap) => {
    cb(snap.exists() ? (snap.data().balances as Record<string, number>) : {});
  });
}
