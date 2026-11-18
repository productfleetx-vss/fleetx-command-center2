# UltraTech · Agentic Control Tower

Internal Fleetx dashboard for the UTCL pilot. It has three role workspaces: Logistics head, Plant head and Control-tower executive. Five AI agents work exceptions first, and people handle what is left.

## Pipeline

Source in this repo → GitHub → Bolt (preview) + Netlify (hosting) → custom domain.
Claude commits locally. You run `git pull --rebase && git push` yourself, because Bolt commits to the repo too.

## Commands

```
npm install
npm run dev            # local dev server
npm run build          # multi-file build in dist/ (what Netlify serves)
npm run build:single   # one self-contained HTML in dist-single/ (open without a server)
```

## Layout

| Path | What it is |
|---|---|
| `src/main.tsx` | Entry. Boots the FX engine, then mounts the React layer. |
| `src/fx/engine.js` | Store, derivations, agent engine. CONFIG at the top holds users, plants, norms and budgets. |
| `src/fx/screens.js` | Every screen (overview, agents, map, replay, guardrails, trips, Ask AI). |
| `src/legacy/command-center.js` | Case-record drawer, action modals, toast and case model. De-bundled from the v7 build (compiled output, minified names). It is being rewritten as typed components; don't add features here. |
| `src/data/trips.json` | **The real trip feed**: 976 rows across 3 plants. |
| `src/data/calls.json`, `clips.json` | Call scripts and voice clips. Clips become `blob:` URLs at runtime, because Safari won't play `data:` audio. |
| `src/data/india-map.json` | Map outline for the network map. |
| `src/lib/convin.ts` | Browser side of the Convin call trigger: checks the payload, then posts it to the relay. |
| `supabase/functions/convin-lead/` | Edge function relay to Convin. It holds the key and token, validates the payload and forwards it. `relay_test.ts` tests it with nothing sent out. |
| `supabase/functions/_shared/convin-lead.ts` | The single set of Convin payload rules (fields, type/campaign pairs, formats). Both the page and the relay use it. |

## Data: what is real and what is modelled

The real feed has 20 fields: di_no, trip_id, trip_start_date, job_stage, customer_segment, lead_distance_km, transporter_name, driver_name, mobile_number, source_location, depot, destination, product_name, vehicle, vehicle_type, customer_code, city_code, sap_order_no, rsn_number, invoice_number.

**Computed from real fields:** trip and DI counts by plant, stage, transporter, segment, product and vehicle type; DI age; lead distance; repeat vehicles and drivers.

**Modelled, not in the data** (carried over from v7 unchanged):

- **Seven added plants** (`CONFIG.addedPlants`): Awarpur, Rawan, Kotputli, Gujarat, Andhra Pradesh, Reddipalayam and Dalla. `generateTrips()` creates their 905 trips with a seeded random generator, including the driver names.
- **Time in stage.** `retime()` replaces each trip's time in stage with a point on the `CONFIG.timing` distribution, scaled by `plantProfile`. Waits, detention hours and ₹, ₹-at-risk, ETAs and SLA ages all derive from this.
- **Budget.** It comes from `CONFIG.budget` (6.5% incidence × 1 chargeable day), not from actuals.
- **Dispatch plan / achievement.** This comes from `plantProfile`.

Removing the modelled parts needs per-stage timestamps (gate in/out, arrival at site, unload, ePOD), GPS or ETA data, and the detention tariff by customer.

## Login (demo)

The three accounts live in `CONFIG.users` (`src/fx/engine.js`). Passwords are **not** stored in the
source: only `sha256(CONFIG.pwSalt + password)` is, and `FX.login` compares digests. The OTP codes are
stored the same way (`OTP_HASHES`) and wrong tries are capped at `CONFIG.otpMaxAttempts`.

### Security notes (read before sharing a build)

- **Rotate the shared password.** The password that used to be hardcoded here (`Utcl@2026`) was shipped
  in every build made from this repo and must be considered public. Change it on any real account that
  uses it, then regenerate the digests above with
  `node -e "console.log(require('crypto').createHash('sha256').update('utcl-command-v9:'+'NEW_PASSWORD').digest('hex'))"`.
- **Sign-in and roles are browser-only.** The session is plain JSON in `localStorage`, so anyone can
  edit it and open any workspace, and any digest in the bundle can be brute-forced offline. Real
  separation between logistics head, plant head and control tower needs the records and the role check
  to move to a server; until then treat every build as public to whoever can open its URL.
- **The trip feed is real.** `src/data/trips.json` ships with the page, so everything in it is public
  to any visitor. Driver mobile numbers are masked; driver names, vehicle registrations, customers and
  invoice numbers are not. Redact or replace them before a build goes anywhere public.

## Convin call trigger ("Trigger Manually")

Convin sends no CORS headers, so the page can't call it directly. Calls go **page → `convin-lead` edge function → Convin**.

Setup, against the same Bolt Database project in both Bolt and Netlify:

1. Deploy the function: `supabase functions deploy convin-lead`.
2. Set the function secrets: `CONVIN_API_KEY`, `CONVIN_API_TOKEN` (Bolt project → database icon → **Secrets** → add each by name, or Supabase dashboard → Edge Functions → Secrets).
3. Set the page env (`.env.example`): `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Set them in Bolt **and** in Netlify, pointing to the same project.
4. Calls start as **dry runs**. The function validates the payload and answers without dialling until you set `CONVIN_LIVE=true` on it.

If the page env is missing, the button reports "forwarder endpoint is not configured", as v7 did.

**What goes in the payload:**

- driver, vehicle, DI (`ticket_id`) and destination come from the trip feed.
- **phone:** the feed's `mobile_number` is masked (e.g. `93XXXXX599`), so the page can't fill a number that can be dialled. The trigger refuses a masked number. The real number has to be looked up on the server by DI (not built yet), or typed in by the operator.
- `timestamp` is the trigger time, in IST.
- `lead_kilometers`, `detention_duration_hours` and `delivery_time` start **blank**. The feed has no GPS or stage timestamps, and Convin's agent reads these values out to a real driver. The operator types them in, and the trigger refuses to send while any of them is blank.

**Security:** the anon key ships in the page, and login is still client-side only. Anyone holding the anon key can therefore ask the relay to dial a number. Add real auth before turning `CONVIN_LIVE` on outside a trial.
