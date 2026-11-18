/**
 * Convin lead payload: the one definition of what may be sent to
 * POST https://activate.convin.ai/api/v1/lead/add for UltraTech.
 *
 * Used twice so the two can't drift apart: the browser checks a payload before it
 * leaves the page, and the `convin-lead` edge function checks it again before
 * forwarding (it is the only place that holds the API key and token).
 * Pure TypeScript with no Deno or DOM APIs, so it runs in both.
 */

export const CONVIN_URL = 'https://activate.convin.ai/api/v1/lead/add';
export const ACCOUNT_NAME = 'Ultratech';

export type LeadType = 'routeDeviation' | 'customerDetention' | 'unloadingStop' | 'epodPending';

/** type -> campaign. A mismatched pair dials the wrong script, so both must agree. */
export const CAMPAIGNS: Record<LeadType, string> = {
  routeDeviation: '6b4da79b-d651-48c9-aa01-8189fbce2146',
  customerDetention: '7d47fba3-aa8d-4b1e-bbf2-aa2a6c8f0b22',
  unloadingStop: '0d7f49ed-1909-4bb2-9470-b84d6cdb2fa5',
  epodPending: '3d795cac-7d11-4119-8b01-f789a1760e34',
};

/** Dashboard issue category -> Convin type. */
export const TYPE_FOR_CATEGORY: Record<string, LeadType> = {
  'Route Deviation': 'routeDeviation',
  'Customer Detention': 'customerDetention',
  'Unloading Detection': 'unloadingStop',
  'ePOD Delay': 'epodPending',
};

/** Extra fields per type, in documented order. */
export const EXTRA_FIELDS: Record<LeadType, readonly string[]> = {
  routeDeviation: ['lead_kilometers'],
  customerDetention: ['customer_name', 'customer_location', 'detention_duration_hours'],
  unloadingStop: [],
  epodPending: ['customer_name', 'delivery_time'],
};

const HEAD = ['account_name', 'driver_name', 'vehicle_number', 'issue_location'] as const;
const TAIL = ['type', 'timestamp', 'ticket_id', 'phone_number', 'campaign_id', 'external_id'] as const;

/** Every field Convin accepts. Anything else is dropped before sending. */
export const ACCEPTED_FIELDS = [
  'account_name', 'driver_name', 'vehicle_number', 'issue_location', 'customer_name', 'customer_location',
  'detention_duration_hours', 'delivery_time', 'lead_kilometers', 'type', 'timestamp', 'ticket_id',
  'phone_number', 'campaign_id', 'external_id',
] as const;

const TIME = /^(0[1-9]|1[0-2]):[0-5]\d (AM|PM)$/;
const PHONE = /^\+91-\d{10}$/;
const EXTERNAL_ID = /^\d{8}$/;
const NUMBER = /^\d+(\.\d+)?$/;

export type Lead = Record<string, string>;
export type CheckResult =
  | { ok: true; lead: Lead; dropped: string[] }
  | { ok: false; errors: string[]; dropped: string[] };

const isLeadType = (t: unknown): t is LeadType => typeof t === 'string' && t in CAMPAIGNS;

/**
 * Validate a payload and return it trimmed to the fields its type takes, in documented order.
 * Values must already be strings: nothing is coerced, so a number slipping through is caught here.
 */
export function checkLead(input: unknown): CheckResult {
  const errors: string[] = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, errors: ['Payload must be a JSON object.'], dropped: [] };
  const src = input as Record<string, unknown>;

  const type = src.type;
  if (!isLeadType(type)) {
    return { ok: false, errors: [`type must be one of ${Object.keys(CAMPAIGNS).join(', ')}.`], dropped: [] };
  }
  const order = [...HEAD, ...EXTRA_FIELDS[type], ...TAIL];
  const dropped = Object.keys(src).filter((k) => !order.includes(k));

  const lead: Lead = {};
  for (const k of order) {
    const v = src[k];
    if (typeof v !== 'string') { errors.push(`${k} is required and must be a string.`); continue; }
    const s = v.trim();
    if (!s) { errors.push(`${k} is empty.`); continue; }
    lead[k] = s;
  }

  const has = (k: string) => typeof lead[k] === 'string';
  if (has('account_name') && lead.account_name !== ACCOUNT_NAME) errors.push(`account_name must be "${ACCOUNT_NAME}".`);
  if (has('campaign_id') && lead.campaign_id !== CAMPAIGNS[type]) errors.push(`campaign_id does not match type ${type} (expected ${CAMPAIGNS[type]}).`);
  if (has('timestamp') && !TIME.test(lead.timestamp)) errors.push('timestamp must look like "02:45 PM".');
  if (has('delivery_time') && !TIME.test(lead.delivery_time)) errors.push('delivery_time must look like "10:00 AM".');
  if (has('phone_number') && !PHONE.test(lead.phone_number)) errors.push('phone_number must look like "+91-9876543210".');
  if (has('external_id') && !EXTERNAL_ID.test(lead.external_id)) errors.push('external_id must be an 8-digit number.');
  if (has('lead_kilometers') && !NUMBER.test(lead.lead_kilometers)) errors.push('lead_kilometers must be a number of km.');
  if (has('detention_duration_hours') && !NUMBER.test(lead.detention_duration_hours)) errors.push('detention_duration_hours must be a number of hours.');

  return errors.length ? { ok: false, errors, dropped } : { ok: true, lead, dropped };
}

/** "HH:MM AM/PM" in India time, whatever the viewer's own time zone. */
export function convinTime(d: Date = new Date()): string {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).toUpperCase();
}

/** "+91-XXXXXXXXXX" from any spacing or prefix of an Indian 10-digit number; "" if there isn't one. */
export function convinPhone(raw: string | null | undefined): string {
  const digits = String(raw ?? '').replace(/\D/g, '');
  const ten = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits.length === 10 ? digits : '';
  return ten ? `+91-${ten}` : '';
}

/** 8-digit numeric reference, unique per call. */
export function newExternalId(): string {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return String(10_000_000 + (n[0] % 90_000_000));
}
