import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Household, GroceryItem, User, Invite } from './types';

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

// ── Invites ───────────────────────────────────────────────────────────────────

export async function sendInvite(
  fromUid: string,
  fromName: string,
  householdId: string,
  toEmail: string,
): Promise<'sent' | 'not_found' | 'already_member' | 'already_invited'> {
  const { getDocs } = await import('firebase/firestore');

  const householdSnap = await getDoc(doc(db, 'households', householdId));
  const householdName = householdSnap.exists() ? (householdSnap.data() as Household).name : householdId;

  const userSnap = await getDocs(query(collection(db, 'users'), where('email', '==', toEmail.toLowerCase().trim())));
  if (userSnap.empty) return 'not_found';

  const toUserDoc = userSnap.docs[0].data() as User;
  if ((toUserDoc.householdIds ?? []).includes(householdId)) return 'already_member';

  const existingInvites = await getDocs(
    query(
      collection(db, 'invites'),
      where('householdId', '==', householdId),
      where('toUid', '==', toUserDoc.uid),
      where('status', '==', 'pending'),
    ),
  );
  if (!existingInvites.empty) return 'already_invited';

  const ref = doc(collection(db, 'invites'));
  await setDoc(ref, {
    id: ref.id,
    householdId,
    householdName,
    fromUid,
    fromName,
    toUid: toUserDoc.uid,
    toEmail: toEmail.toLowerCase().trim(),
    status: 'pending',
    createdAt: Date.now(),
  } satisfies Invite);

  return 'sent';
}

export async function respondToInvite(
  invite: Invite,
  accept: boolean,
  displayName: string,
): Promise<void> {
  const status = accept ? 'accepted' : 'declined';
  await updateDoc(doc(db, 'invites', invite.id), { status });

  if (accept) {
    await updateDoc(doc(db, 'households', invite.householdId), {
      members: arrayUnion(invite.toUid),
      [`memberNames.${invite.toUid}`]: displayName,
    });
    await addUserHousehold(invite.toUid, invite.householdId);
  }
}

export async function archiveGroup(householdId: string, memberUids: string[]): Promise<void> {
  const batch = writeBatch(db);

  // Mark the group as archived (keep all data intact)
  batch.update(doc(db, 'households', householdId), {
    archived: true,
    archivedAt: Date.now(),
    members: [],
  });

  // Remove the group from every member's active list
  for (const uid of memberUids) {
    batch.update(doc(db, 'users', uid), { householdIds: arrayRemove(householdId) });
  }

  await batch.commit();
}

export function subscribeToArchivedGroups(
  uid: string,
  cb: (groups: Household[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'households'),
    where('createdBy', '==', uid),
    where('archived', '==', true),
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => d.data() as Household));
  });
}

export async function removeMember(householdId: string, uid: string): Promise<void> {
  const hSnap = await getDoc(doc(db, 'households', householdId));
  if (!hSnap.exists()) return;

  const memberNames = (hSnap.data() as Household).memberNames;
  const updatedNames = { ...memberNames };
  delete updatedNames[uid];

  await updateDoc(doc(db, 'households', householdId), {
    members: arrayRemove(uid),
    memberNames: updatedNames,
  });
  await updateDoc(doc(db, 'users', uid), {
    householdIds: arrayRemove(householdId),
  });
}

export function subscribeToInvites(uid: string, cb: (invites: Invite[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'invites'),
    where('toUid', '==', uid),
    where('status', '==', 'pending'),
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => d.data() as Invite));
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
