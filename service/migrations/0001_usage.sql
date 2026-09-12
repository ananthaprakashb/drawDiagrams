-- A request fingerprint makes retries idempotent. Only free calls consume weekly slots.
CREATE TABLE diagram_calls (
  account_id TEXT NOT NULL,
  week_start TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  charged INTEGER NOT NULL CHECK (charged IN (0, 1)),
  PRIMARY KEY (account_id, week_start, fingerprint)
);

CREATE INDEX diagram_calls_week ON diagram_calls (account_id, week_start, charged);

-- Managed by the merchant's billing integration; never set from MCP tool input.
CREATE TABLE paid_entitlements (
  account_id TEXT PRIMARY KEY,
  active_until INTEGER NOT NULL
);
