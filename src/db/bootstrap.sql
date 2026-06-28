-- Finup shared schema — owned by Foundation (TC-MOD-02, TC-STACK-03).
-- Derived from docs/requirements.md domain model. v1: single-user, UAH-only,
-- Europe/Kyiv (BC-SCOPE-01/02/03). Any later change goes through a
-- Foundation / Coordination change, not a feature-owned migration.

-- One act of user input; the raw original is preserved here (NFR-PRIV-02).
CREATE TABLE IF NOT EXISTS input_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source      text NOT NULL CHECK (source IN ('text', 'photo', 'bank')),
  provider    text CHECK (provider IN ('monobank', 'privatbank')),
  raw_text    text,
  storage_uri text,
  mime_type   text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- One parse attempt over an input_event (FR-PARSE-08). Foundation owns the table
-- only; the `parsing` capability owns the run behavior.
CREATE TABLE IF NOT EXISTS parser_runs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  input_event_id     uuid NOT NULL REFERENCES input_events (id),
  status             text NOT NULL CHECK (status IN ('success', 'failed')),
  normalized_payload text,
  result_json        jsonb,
  error              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, input_event_id)
);

-- The atomic financial row and single source of truth for balances
-- (FR-LEDGER-01/05). amount_minor is signed kopiyky (expense < 0, income > 0).
-- NOTE: account_id is NOT NULL but its FK to the accounts table is added by the
-- `accounts` capability (a coordination change), since that table is owned there.
CREATE TABLE IF NOT EXISTS ledger_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        uuid NOT NULL,
  input_event_id    uuid NOT NULL REFERENCES input_events (id),
  parser_run_id     uuid,
  description       text NOT NULL,
  amount_minor      bigint NOT NULL,
  currency          text NOT NULL DEFAULT 'UAH' CHECK (currency = 'UAH'),
  type              text NOT NULL CHECK (type IN ('expense', 'income')),
  CONSTRAINT ledger_items_amount_sign_chk CHECK (
    (type = 'expense' AND amount_minor < 0) OR
    (type = 'income' AND amount_minor > 0)
  ),
  category          text NOT NULL DEFAULT 'Без категорії',
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'deleted')),
  import_row_number integer,
  occurred_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (parser_run_id, input_event_id)
    REFERENCES parser_runs (id, input_event_id)
);

-- Bank-row idempotency (FR-BANK-06): a retried bank parse cannot duplicate a
-- statement row. Relies on default NULL-distinct semantics (NOT
-- `NULLS NOT DISTINCT`) so manual/photo items (NULL import_row_number) are never
-- constrained against each other. The upsert behavior is owned by `bank-imports`.
CREATE UNIQUE INDEX IF NOT EXISTS ux_ledger_items_input_event_row
  ON ledger_items (input_event_id, import_row_number);
