/**
 * Given a list of balance entries (debtor:creditor → amount),
 * simplify them into the minimum number of net transfers.
 */
export interface Transfer {
  from: string; // uid who pays
  to: string;   // uid who receives
  amount: number;
}

export function computeNetBalances(
  rawBalances: Record<string, number>,
  memberNames: Record<string, string>,
): Transfer[] {
  // Build net balance per uid: positive = owed money, negative = owes money
  const net: Record<string, number> = {};

  for (const [key, amount] of Object.entries(rawBalances)) {
    const [debtor, creditor] = key.split(':');
    net[debtor] = (net[debtor] ?? 0) - amount;
    net[creditor] = (net[creditor] ?? 0) + amount;
  }

  const creditors = Object.entries(net)
    .filter(([, v]) => v > 0.005)
    .map(([uid, amount]) => ({ uid, amount }));

  const debtors = Object.entries(net)
    .filter(([, v]) => v < -0.005)
    .map(([uid, amount]) => ({ uid, amount: -amount }));

  const transfers: Transfer[] = [];

  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const settle = Math.min(debtors[i].amount, creditors[j].amount);
    transfers.push({
      from: debtors[i].uid,
      to: creditors[j].uid,
      amount: Math.round(settle * 100) / 100,
    });
    debtors[i].amount -= settle;
    creditors[j].amount -= settle;
    if (debtors[i].amount < 0.005) i++;
    if (creditors[j].amount < 0.005) j++;
  }

  return transfers.map((t) => ({
    ...t,
    fromName: memberNames[t.from] ?? t.from,
    toName: memberNames[t.to] ?? t.to,
  }));
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
