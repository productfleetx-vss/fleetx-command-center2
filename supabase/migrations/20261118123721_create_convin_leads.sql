/*
# Create the convin_leads table: a durable record of every Convin call trigger

## 1. What this does (plain English)

The dashboard can trigger an outbound phone call through Convin (route
deviation, customer detention, unloading stop, ePOD pending). Until now that
event lived nowhere: if a call was triggered and the page closed, there was no
trace of it. This migration creates the one table that stores every trigger
attempt — accepted or rejected, live or dry-run — with who/what/when and the
outgoing and reply payloads.

This project has NO sign-in screen (the demo login is browser-only and does
not create Supabase sessions), so every request arrives as the `anon` role.
Policies therefore target `anon, authenticated`. The table is write-only from
the browser by design: visitors can add rows but can never read them back,
because the rows contain the same driver phone numbers and call details the
rest of the app deliberately keeps out of public reach. Only the edge
function, which holds the service key, reads the table.

## 2. New tables

- `convin_leads`
  - `id` (uuid, primary key, auto-generated)
  - `external_id` (text, not null, the 8-digit call reference shown in the UI)
  - `lead_type` (text, not null, one of: routeDeviation, customerDetention,
    unloadingStop, epodPending)
  - `campaign_id` (text, not null, the Convin campaign the lead was sent to)
  - `account_name` (text, not null, always "Ultratech")
  - `driver_name` (text, nullable)
  - `phone_number` (text, nullable, format +91-XXXXXXXXXX)
  - `vehicle_number` (text, nullable)
  - `ticket_id` (text, nullable)
  - `issue_location` (text, nullable)
  - `payload` (jsonb, not null, the trimmed lead exactly as forwarded)
  - `response` (jsonb, nullable, what Convin answered)
  - `status` (text, not null, one of: dry_run, forwarded, failed, rejected)
  - `http_status` (integer, nullable, Convin's HTTP status when known)
  - `error` (text, nullable, why a trigger failed)
  - `created_at` (timestamptz, defaults to now)

## 3. Indexes

- `convin_leads_external_id_idx` on `external_id` — looking a call up by its
  reference.
- `convin_leads_created_at_idx` on `created_at` — listing triggers newest
  first.
- `convin_leads_status_idx` on `status` — counting failures.

## 4. Security

- RLS is ENABLED on `convin_leads`.
- INSERT: allowed for `anon, authenticated` — any visitor may trigger a call,
  so any visitor may log one. No column of the row is privileged at write
  time beyond what the caller supplies.
- SELECT / UPDATE / DELETE: NO policies at all. With RLS enabled and no
  policy, those verbs return zero rows for both `anon` and `authenticated`.
  Readers must hold the service role (the edge function does).
- Grants: `INSERT` only, for `anon, authenticated`, restricted to the columns
  the browser is allowed to set. `status`, `response`, `http_status` and
  `error` are NOT grantable to the browser — the function sets those. The
  `id` and `created_at` defaults cover inserts that omit them. `SELECT` is
  granted to `service_role` only, so the function can read back history.

## 5. Notes

- No `user_id` column: the app has no Supabase accounts.
- Safe to re-run: uses `CREATE TABLE IF NOT EXISTS` and drops policies before
  creating them.
- Nothing is dropped or destroyed by this migration.
*/

CREATE TABLE IF NOT EXISTS convin_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text NOT NULL,
  lead_type text NOT NULL,
  campaign_id text NOT NULL,
  account_name text NOT NULL,
  driver_name text,
  phone_number text,
  vehicle_number text,
  ticket_id text,
  issue_location text,
  payload jsonb NOT NULL,
  response jsonb,
  status text NOT NULL DEFAULT 'rejected',
  http_status integer,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT convin_leads_type_check CHECK (lead_type IN ('routeDeviation', 'customerDetention', 'unloadingStop', 'epodPending')),
  CONSTRAINT convin_leads_status_check CHECK (status IN ('dry_run', 'forwarded', 'failed', 'rejected'))
);

CREATE INDEX IF NOT EXISTS convin_leads_external_id_idx ON convin_leads (external_id);
CREATE INDEX IF NOT EXISTS convin_leads_created_at_idx ON convin_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS convin_leads_status_idx ON convin_leads (status);

ALTER TABLE convin_leads ENABLE ROW LEVEL SECURITY;

-- Write-only for the browser: it may add a row (every trigger is logged),
-- but with RLS on and no SELECT/UPDATE/DELETE policy for anon/authenticated,
-- those verbs see zero rows for the public roles.
DROP POLICY IF EXISTS "anon_insert_convin_leads" ON convin_leads;
CREATE POLICY "anon_insert_convin_leads"
ON convin_leads FOR INSERT
TO anon, authenticated
WITH CHECK (true);

GRANT INSERT (external_id, lead_type, campaign_id, account_name, driver_name, phone_number,
  vehicle_number, ticket_id, issue_location, payload)
ON convin_leads TO anon, authenticated;

GRANT SELECT, UPDATE ON convin_leads TO service_role;