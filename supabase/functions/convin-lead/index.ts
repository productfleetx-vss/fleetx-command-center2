/**
 * convin-lead: server-side relay for Convin call triggers.
 *
 * Why it exists: Convin answers no CORS preflight, so the browser can't call it,
 * and the API key and token must never ship in the page bundle.
 *
 * Secrets (supabase secrets set ...):
 *   CONVIN_API_KEY, CONVIN_API_TOKEN   required to forward
 *   CONVIN_LIVE=true                   forwarding is OFF unless this is exactly "true";
 *                                      otherwise the function validates and answers
 *                                      { dryRun: true, lead } without dialling anyone.
 */
import { CONVIN_URL, checkLead } from '../_shared/convin-lead.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Use POST.' });

  let body: unknown;
  try { body = await req.json(); } catch { return json(400, { ok: false, error: 'Body is not valid JSON.' }); }

  const checked = checkLead(body);
  if (!checked.ok) return json(422, { ok: false, error: 'Payload rejected.', errors: checked.errors, dropped: checked.dropped });
  const { lead, dropped } = checked;

  if (Deno.env.get('CONVIN_LIVE') !== 'true') return json(200, { ok: true, dryRun: true, lead, dropped });

  const key = Deno.env.get('CONVIN_API_KEY'), token = Deno.env.get('CONVIN_API_TOKEN');
  if (!key || !token) return json(500, { ok: false, error: 'CONVIN_API_KEY / CONVIN_API_TOKEN are not set on the function.' });

  let res: Response;
  try {
    res = await fetch(CONVIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'x-api-token': token },
      body: JSON.stringify(lead),
    });
  } catch (e) {
    return json(502, { ok: false, error: `Could not reach Convin: ${(e as Error).message}` });
  }
  const text = await res.text();
  let convin: unknown = text;
  try { convin = JSON.parse(text); } catch { /* keep text */ }
  return json(res.ok ? 200 : 502, { ok: res.ok, status: res.status, convin, lead, dropped });
});
