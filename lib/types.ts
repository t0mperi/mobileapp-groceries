export interface User {
  uid: string;
  displayName: string;
  email: string;
  householdIds: string[];
}

export interface Household {
  id: string;
  name: string;
  members: string[]; // array of uid
  memberNames: Record<string, string>; // uid -> displayName
  inviteCode: string;
  createdBy: string;
}

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  estimatedPrice: number;
  addedBy: string; // uid
  addedByName: string;
  purchased: boolean;
  actualPrice?: number;
  purchasedBy?: string; // uid of who paid
  splitBetween: string[]; // uids
  createdAt: number;
}

export interface Invite {
  id: string;
  householdId: string;
  householdName: string;
  fromUid: string;
  fromName: string;
  toUid: string;
  toEmail: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
}

export interface Balance {
  // "uid_A:uid_B" → amount uid_A owes uid_B (positive = A owes B, negative = B owes A)
  [key: string]: number;
}
