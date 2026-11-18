import { checkLead } from '../../supabase/functions/_shared/convin-lead.ts';

export interface TriggerResult {
  ok: boolean;
  status: number | null;
  detail: string;
}

const NOT_CONFIGURED = 'The forwarder endpoint is not configured, so the call was not triggered.';

/**
 * Send a Convin lead through the `convin-lead` edge function.
 * Checked here first with the same rules the function applies, so a bad payload never leaves the page.
 * Needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (the same project Bolt uses, also set on Netlify).
 */
export async function triggerConvinLead(payload: Record<string, unknown>): Promise<TriggerResult> {
  const checked = checkLead(payload);
  if (!checked.ok) return { ok: false, status: null, detail: `Not sent. ${checked.errors.join(' ')}` };

  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!base || !anon) return { ok: false, status: null, detail: NOT_CONFIGURED };

  let res: Response;
  try {
    res = await fetch(`${base.replace(/\/$/, '')}/functions/v1/convin-lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anon}`, apikey: anon },
      body: JSON.stringify(checked.lead),
    });
  } catch (e) {
    return { ok: false, status: null, detail: `Could not reach the forwarder: ${(e as Error).message}` };
  }
  let body: { ok?: boolean; dryRun?: boolean; error?: string; errors?: string[]; status?: number; convin?: unknown } = {};
  try { body = await res.json(); } catch { /* non-JSON */ }

  if (body.ok && body.dryRun) return { ok: false, status: res.status, detail: 'Dry run: the forwarder accepted the payload but did not dial (CONVIN_LIVE is off).' };
  if (body.ok) return { ok: true, status: body.status ?? res.status, detail: `Convin accepted the lead (HTTP ${body.status ?? res.status}).` };
  const why = body.errors?.join(' ') || body.error || `HTTP ${res.status}`;
  const convin = body.convin ? ` Convin said: ${typeof body.convin === 'string' ? body.convin : JSON.stringify(body.convin)}` : '';
  return { ok: false, status: body.status ?? res.status, detail: `Not sent. ${why}${convin}` };
}
