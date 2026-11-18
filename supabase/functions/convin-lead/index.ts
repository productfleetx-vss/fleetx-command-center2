/**
 * convin-lead: server-side relay for Convin call triggers.
 *
 * Why it exists: Convin answers no CORS preflight, so the browser can't call it,
 * and the API key and token must never ship in the page bundle.
 *
 * Every validated trigger is recorded in the `convin_leads` table before the
 * call is placed, with the outcome written back afterwards — so a trigger is
 * never lost, even if Convin is unreachable or the function dies mid-flight.
 *
 * Secrets (supabase secrets set ...):
 *   CONVIN_API_KEY, CONVIN_API_TOKEN   required to forward
 *   CONVIN_LIVE=true                   forwarding is OFF unless this is exactly "true";
 *                                      otherwise the function validates and answers
 *                                      { dryRun: true, lead } without dialling anyone.
 */
import { CONVIN_URL, checkLead, type Lead } from '../_shared/convin-lead.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

type LeadRow = {
  external_id: string;
  lead_type: string;
  campaign_id: string;
  account_name: string;
  driver_name: string | null;
  phone_number: string | null;
  vehicle_number: string | null;
  ticket_id: string | null;
  issue_location: string | null;
  payload: Lead;
};

function toRow(lead: Lead): LeadRow {
  const s = (k: string): string | null => (typeof lead[k] === 'string' && lead[k] ? lead[k] : null);
  return {
    external_id: lead.external_id,
    lead_type: lead.type,
    campaign_id: lead.campaign_id,
    account_name: lead.account_name,
    driver_name: s('driver_name'),
    phone_number: s('phone_number'),
    vehicle_number: s('vehicle_number'),
    ticket_id: s('ticket_id'),
    issue_location: s('issue_location'),
    payload: lead,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Use POST.' });

  let body: unknown;
  try { body = await req.json(); } catch { return json(400, { ok: false, error: 'Body is not valid JSON.' }); }

  const checked = checkLead(body);
  if (!checked.ok) return json(422, { ok: false, error: 'Payload rejected.', errors: checked.errors, dropped: checked.dropped });
  const { lead, dropped } = checked;

  const log = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  ).from('convin_leads');

  const { data: saved, error: saveErr } = await log.insert(toRow(lead)).select('id').maybeSingle();
  if (saveErr || !saved) {
    console.error('convin_leads insert failed', saveErr);
    return json(500, { ok: false, error: 'The trigger was received but could not be recorded, so the call was not placed.' });
  }

  const record = (patch: Record<string, unknown>) =>
    log.update(patch).eq('id', saved.id);

  if (Deno.env.get('CONVIN_LIVE') !== 'true') {
    await record({ status: 'dry_run' });
    return json(200, { ok: true, dryRun: true, lead, dropped });
  }

  const key = Deno.env.get('CONVIN_API_KEY'), token = Deno.env.get('CONVIN_API_TOKEN');
  if (!key || !token) {
    await record({ status: 'failed', error: 'CONVIN_API_KEY / CONVIN_API_TOKEN are not set on the function.' });
    return json(500, { ok: false, error: 'CONVIN_API_KEY / CONVIN_API_TOKEN are not set on the function.' });
  }

  try {
    const res = await fetch(CONVIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'x-api-token': token },
      body: JSON.stringify(lead),
    });
    const text = await res.text();
    let convin: unknown = text;
    try { convin = JSON.parse(text); } catch { /* keep text */ }
    await record({
      status: res.ok ? 'forwarded' : 'failed',
      http_status: res.status,
      response: convin,
      error: res.ok ? null : `Convin answered HTTP ${res.status}`,
    });
    return json(res.ok ? 200 : 502, { ok: res.ok, status: res.status, convin, lead, dropped });
  } catch (e) {
    await record({ status: 'failed', error: `Could not reach Convin: ${(e as Error).message}` });
    return json(502, { ok: false, error: `Could not reach Convin: ${(e as Error).message}` });
  }
});
