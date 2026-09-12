export const WEEKLY_FREE_LIMIT = 3;

export interface Database {
  prepare(query: string): {
    bind(...values: (string | number)[]): {
      first<T>(): Promise<T | null>;
      all<T>(): Promise<{ results: T[] }>;
    };
  };
}

export function weekStart(now: Date): string {
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  return monday.toISOString().slice(0, 10);
}

export function resetAt(week: string): string {
  const monday = new Date(`${week}T00:00:00.000Z`);
  monday.setUTCDate(monday.getUTCDate() + 7);
  return monday.toISOString();
}

export type Quota = {
  plan: 'free' | 'paid';
  used: number;
  remaining: number | null;
  resets_at: string;
};

export async function getQuota(db: Database, accountId: string, now = new Date()): Promise<Quota> {
  const week = weekStart(now);
  const paid = await db.prepare('SELECT active_until FROM paid_entitlements WHERE account_id = ?').bind(accountId)
    .first<{ active_until: number }>();
  const usage = await db.prepare(
    'SELECT COUNT(*) AS used FROM diagram_calls WHERE account_id = ? AND week_start = ? AND charged = 1',
  ).bind(accountId, week).first<{ used: number }>();
  const used = usage?.used ?? 0;
  const isPaid = (paid?.active_until ?? 0) > Math.floor(now.getTime() / 1000);
  return {
    plan: isPaid ? 'paid' : 'free',
    used,
    remaining: isPaid ? null : Math.max(0, WEEKLY_FREE_LIMIT - used),
    resets_at: resetAt(week),
  };
}

// One SQL statement checks and reserves a free slot, so concurrent calls cannot overrun the cap.
const RESERVE_FREE = `
INSERT INTO diagram_calls (account_id, week_start, fingerprint, created_at, charged)
SELECT ?, ?, ?, ?, 1
WHERE (SELECT COUNT(*) FROM diagram_calls
       WHERE account_id = ? AND week_start = ? AND charged = 1) < 3
ON CONFLICT (account_id, week_start, fingerprint) DO NOTHING
RETURNING fingerprint`;

export async function reserveUse(db: Database, accountId: string, fingerprint: string, now = new Date()) {
  const week = weekStart(now);
  const quota = await getQuota(db, accountId, now);
  if (quota.plan === 'paid') {
    await db.prepare(
      'INSERT OR IGNORE INTO diagram_calls (account_id, week_start, fingerprint, created_at, charged) VALUES (?, ?, ?, ?, 0)',
    ).bind(accountId, week, fingerprint, now.getTime()).all();
  } else {
    const inserted = await db.prepare(RESERVE_FREE)
      .bind(accountId, week, fingerprint, now.getTime(), accountId, week).all<{ fingerprint: string }>();
    if (!inserted.results.length) {
      const prior = await db.prepare(
        'SELECT charged FROM diagram_calls WHERE account_id = ? AND week_start = ? AND fingerprint = ?',
      ).bind(accountId, week, fingerprint).first<{ charged: number }>();
      if (!prior) return { allowed: false, quota: await getQuota(db, accountId, now) };
    }
  }
  return { allowed: true, quota: await getQuota(db, accountId, now) };
}
