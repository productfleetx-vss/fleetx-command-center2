// Run: deno run --allow-env --allow-read supabase/functions/convin-lead/relay_test.ts
// Drives the real convin-lead handler with Deno.serve and fetch stubbed (nothing leaves the machine).
let handler: (r: Request) => Promise<Response> = null!;
(Deno as any).serve = (h: any) => { handler = h; };
const sent: { url: string; headers: Headers; body: string }[] = [];
let convinReply = new Response(JSON.stringify({ status: 'success', lead_id: 'L1' }), { status: 200 });
globalThis.fetch = (async (url: string, init: RequestInit) => { sent.push({ url, headers: new Headers(init.headers), body: String(init.body) }); return convinReply.clone(); }) as any;
await import('./index.ts');

const post = (b: unknown) => handler(new Request('http://x/', { method: 'POST', body: typeof b === 'string' ? b : JSON.stringify(b) }));
const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) Deno.exitCode = 1; };

const det = { account_name: 'Ultratech', driver_name: 'ANILKUMAR', vehicle_number: 'KA32AA4147', issue_location: 'BAGALKOT', customer_name: 'BAGALKOT', customer_location: 'BAGALKOT', detention_duration_hours: '6', type: 'customerDetention', timestamp: '09:00 AM', ticket_id: '6905237485', phone_number: '+91-9304072599', campaign_id: '7d47fba3-aa8d-4b1e-bbf2-aa2a6c8f0b22', external_id: '51660284' };
const rd = { account_name: 'Ultratech', driver_name: 'SATNARYAN', vehicle_number: 'AP39UU8291', issue_location: 'Samalkha', lead_kilometers: '64', type: 'routeDeviation', timestamp: '01:41 PM', ticket_id: '6931387954', phone_number: '+91-9000971529', campaign_id: '6b4da79b-d651-48c9-aa01-8189fbce2146', external_id: '48217903' };
const un = { account_name: 'Ultratech', driver_name: 'DEMUDU', vehicle_number: 'AP39WM6119', issue_location: 'SRUNGAVARAPUKOTA', type: 'unloadingStop', timestamp: '03:00 PM', ticket_id: '6931387975', phone_number: '+91-7661927597', campaign_id: '0d7f49ed-1909-4bb2-9470-b84d6cdb2fa5', external_id: '73920145' };
const ep = { account_name: 'Ultratech', driver_name: 'NAGESH AKKIREDDY', vehicle_number: 'AP31TH5066', issue_location: 'VISHAKAPATTNAM 2 STO', customer_name: 'VISHAKAPATTNAM 2 STO', delivery_time: '10:00 AM', type: 'epodPending', timestamp: '04:00 PM', ticket_id: '6931387951', phone_number: '+91-6305607382', campaign_id: '3d795cac-7d11-4119-8b01-f789a1760e34', external_id: '29471058' };

// CORS preflight
const pre = await handler(new Request('http://x/', { method: 'OPTIONS' }));
ok(pre.status === 200 && pre.headers.get('access-control-allow-origin') === '*', 'OPTIONS preflight answered with CORS');

// Dry run (default): all four documented payloads accepted, nothing forwarded, order preserved
Deno.env.delete('CONVIN_LIVE');
for (const [n, p] of [['detention', det], ['route', rd], ['unloading', un], ['epod', ep]] as const) {
  const r = await post(p); const j = await r.json();
  ok(r.status === 200 && j.dryRun === true && JSON.stringify(Object.keys(j.lead)) === JSON.stringify(Object.keys(p)), `${n}: documented payload accepted in documented order (dry run)`);
}
ok(sent.length === 0, 'dry run forwarded nothing');

// Rejections
const rej = async (p: unknown, frag: string, m: string) => { const r = await post(p); const j = await r.json(); ok(r.status >= 400 && JSON.stringify(j).includes(frag), m + ' -> ' + (j.errors || [j.error]).join(' | ')); };
await rej({ ...det, campaign_id: rd.campaign_id }, 'campaign_id does not match', 'mismatched type/campaign pair');
await rej({ ...det, type: 'somethingElse' }, 'type must be one of', 'unknown type');
await rej({ ...det, phone_number: '9304072599' }, 'phone_number', 'phone without +91-');
await rej({ ...det, timestamp: '9:00 am' }, 'timestamp', 'bad timestamp');
await rej({ ...det, external_id: '1234' }, 'external_id', 'external_id not 8 digits');
await rej({ ...det, detention_duration_hours: 6 }, 'must be a string', 'number instead of string');
await rej({ ...det, detention_duration_hours: '' }, 'detention_duration_hours is empty', 'blank detention hours (operator must enter)');
await rej({ ...rd, lead_kilometers: '' }, 'lead_kilometers is empty', 'blank deviation km');
await rej({ ...ep, delivery_time: '' }, 'delivery_time is empty', 'blank delivery time');
await rej({ ...det, account_name: 'UltraTech' }, 'account_name', 'wrong account_name');
await rej('not json', 'not valid JSON', 'invalid JSON');
const g = await handler(new Request('http://x/', { method: 'GET' })); ok(g.status === 405, 'GET refused');

// Unknown and other-type fields are dropped, not forwarded
{ const r = await post({ ...un, lead_kilometers: '5', foo: 'bar' }); const j = await r.json();
  ok(j.ok && !('lead_kilometers' in j.lead) && !('foo' in j.lead) && j.dropped.includes('foo'), 'extra fields dropped: ' + j.dropped.join(',')); }

// Live mode without secrets
Deno.env.set('CONVIN_LIVE', 'true'); Deno.env.delete('CONVIN_API_KEY'); Deno.env.delete('CONVIN_API_TOKEN');
{ const r = await post(det); ok(r.status === 500 && sent.length === 0, 'live without secrets: 500, nothing sent'); }

// Live mode: forwards exactly the cleaned lead with headers
Deno.env.set('CONVIN_API_KEY', 'k-test'); Deno.env.set('CONVIN_API_TOKEN', 't-test');
{ const r = await post({ ...det, junk: 'x' }); const j = await r.json(); const s = sent[0];
  ok(r.status === 200 && j.ok && s.url === 'https://activate.convin.ai/api/v1/lead/add', 'live: forwarded to Convin');
  ok(s.headers.get('x-api-key') === 'k-test' && s.headers.get('x-api-token') === 't-test' && s.headers.get('content-type') === 'application/json', 'live: key/token/content-type headers set');
  ok(s.body === JSON.stringify(det), 'live: body is the documented payload exactly, junk dropped'); }
convinReply = new Response('{"error":"invalid campaign"}', { status: 400 });
{ const r = await post(det); const j = await r.json(); ok(r.status === 502 && !j.ok && j.status === 400 && j.convin.error === 'invalid campaign', 'live: Convin error surfaced'); }
