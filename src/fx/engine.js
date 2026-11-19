// @ts-nocheck
/* FX engine: store, derivations, agent engine. Ported verbatim from v7 (fx layer, part 1). */
import FX_CALLS from '@/data/calls.json';
import FX_CLIPS from '@/data/clips.json';

/* =====================================================================
   UTCL Command — shared store, derivations and agent engine.
   Every figure on every screen is computed here from the trip rows,
   tickets, transcripts and agent configuration shipped in this file.
   ===================================================================== */
/* ---------------------------------------------------------------
   CONFIG — the only place to change people, money and norms.
   --------------------------------------------------------------- */
var CONFIG = {
  storeKey: 'utcl-command-store-v9',
  storeMaxAgeH: 10,
  sessionKey: 'utcl-command-session-v5',
  productName: 'Agentic Control Tower',
  customerName: 'UltraTech',
  users: [
    /* Passwords are never stored in the source. Only a salted SHA-256 digest ships, so the
       bundle cannot be read for a working credential. Digest = sha256(pwSalt + password). */
    { role: 'clo',   username: 'clo.utcl@fleetx.io',   pwHash: '4944a6b307005d54a83252811c02115e2ea61bde5b3f93a0436918fe033d5b98', name: 'Arvind Menon',     title: 'Chief Logistics Officer' },
    { role: 'plant', username: 'plh.utcl@fleetx.io', pwHash: '4944a6b307005d54a83252811c02115e2ea61bde5b3f93a0436918fe033d5b98', name: 'Kavita Deshpande', title: 'Plant Head' },
    { role: 'ct',    username: 'ct.utcl@fleetx.io',    pwHash: '4944a6b307005d54a83252811c02115e2ea61bde5b3f93a0436918fe033d5b98', name: 'Anil Sharma',      title: 'Control Tower Executive' }
  ],
  pwSalt: 'utcl-command-v9:',
  otpSalt: 'utcl-otp-v1:',
  otpMaxAttempts: 5,
  /* Phone numbers that may use OTP sign-in, and the workspace each one opens. */
  otpAccounts: { '9999249625': 'ct' },
  /* Plant Head scope. Set to the plant with the highest exception volume in the data. */
  plantHeadPlant: 'UTCL SARLANAGAR PLANT',

  /* Plant locations for the map. Sarlanagar is the Maihar works; Plant-2 shares the site. */
  plantGeo: {
    'UTCL SARLANAGAR PLANT': { lat: 24.27, lon: 80.76, place: 'Maihar, Madhya Pradesh', zone: 'Central', lang: 'Hindi' },
    'UTCL SARLANAGAR PLANT-2': { lat: 24.27, lon: 80.76, place: 'Maihar, Madhya Pradesh', zone: 'Central', lang: 'Hindi', offset: [-62, 52] },
    'Vizag Cement Works,Ultratech cement Ltd': { lat: 17.69, lon: 83.22, place: 'Visakhapatnam, Andhra Pradesh', zone: 'South', lang: 'Telugu' }
  },
  /* Further UltraTech integrated plants. These have no trip feed in this file, so each is given
     a generated trip load (generated: true) built from the real plants' stage and age profile;
     profile scales how long trips have been in cycle (1 = like the real plants, lower = faster plant).
     Remove a line to drop the plant everywhere. */
  addedPlants: [
    { name: 'Awarpur Cement Works', lat: 19.77, lon: 79.25, place: 'Chandrapur, Maharashtra', zone: 'West', lang: 'Marathi', trips: 165, state: 'MH', profile: 0.77,
      sites: [['NAGPUR DEPOT', 21.15, 79.09], ['AMRAVATI DEPOT', 20.93, 77.75], ['YAVATMAL - STO', 20.39, 78.12], ['WARDHA RMC', 20.74, 78.6], ['HYDERABAD BULK', 17.42, 78.34]] },
    { name: 'Rawan Cement Works', lat: 21.57, lon: 82.11, place: 'Baloda Bazar, Chhattisgarh', zone: 'East', lang: 'Hindi', trips: 140, state: 'CG', profile: 0.45,
      sites: [['RAIPUR DEPOT', 21.25, 81.63], ['BILASPUR - STO', 22.08, 82.15], ['DURG DEPOT', 21.19, 81.28], ['SAMBALPUR DEPOT', 21.47, 83.97], ['RANCHI BULK', 23.34, 85.31]] },
    { name: 'Kotputli Cement Works', lat: 27.70, lon: 76.20, place: 'Kotputli, Rajasthan', zone: 'North', lang: 'Hindi', trips: 150, state: 'RJ', profile: 0.55,
      sites: [['JAIPUR DEPOT', 26.91, 75.79], ['GURUGRAM - STO', 28.42, 77.1], ['ALWAR DEPOT', 27.55, 76.6], ['NOIDA BULK', 28.53, 77.39], ['REWARI DEPOT', 28.19, 76.62]] },
    { name: 'Gujarat Cement Works', lat: 20.97, lon: 71.50, place: 'Kovaya, Amreli, Gujarat', zone: 'West', lang: 'Gujarati', trips: 155, state: 'GJ', profile: 0.5,
      sites: [['RAJKOT DEPOT', 22.3, 70.8], ['AHMEDABAD - STO', 23.02, 72.57], ['SURAT DEPOT', 21.17, 72.83], ['BHAVNAGAR DEPOT', 21.76, 72.15], ['VADODARA BULK', 22.31, 73.18]] },
    { name: 'Andhra Pradesh Cement Works', lat: 14.91, lon: 78.01, place: 'Tadipatri, Andhra Pradesh', zone: 'South', lang: 'Telugu', trips: 110, state: 'AP', profile: 0.55,
      sites: [['BENGALURU - STO', 13.0, 77.5], ['ANANTAPUR DEPOT', 14.68, 77.6], ['KURNOOL DEPOT', 15.83, 78.04], ['TIRUPATI DEPOT', 13.63, 79.42], ['HYDERABAD - STO', 17.38, 78.48]] },
    { name: 'Reddipalayam Cement Works', lat: 11.14, lon: 79.07, place: 'Ariyalur, Tamil Nadu', zone: 'South', lang: 'Tamil', trips: 90, state: 'TN', profile: 0.45,
      sites: [['CHENNAI - STO', 13.08, 80.21], ['TRICHY DEPOT', 10.8, 78.69], ['MADURAI DEPOT', 9.93, 78.12], ['SALEM DEPOT', 11.66, 78.15], ['PUDUCHERRY BULK', 11.94, 79.81]] },
    { name: 'Dalla Cement Works', lat: 24.60, lon: 83.05, place: 'Sonbhadra, Uttar Pradesh', zone: 'North', lang: 'Hindi', trips: 95, state: 'UP', profile: 0.72,
      sites: [['VARANASI DEPOT', 25.32, 82.97], ['PRAYAGRAJ - STO', 25.43, 81.85], ['PATNA DEPOT', 25.59, 85.14], ['GORAKHPUR DEPOT', 26.76, 83.37], ['LUCKNOW BULK', 26.85, 80.95]] }
  ],
  /* Operating profile by plant: yard, transit and site factors scale the typical times below;
     incidence is the share of dispatches that incur detention; achievement is dispatch against plan. */
  plantProfile: {
    'UTCL SARLANAGAR PLANT': { yard: 1.25, transit: 1.2, site: 1.35, incidence: 0.15, ach: 0.89 },
    'UTCL SARLANAGAR PLANT-2': { yard: 1.0, transit: 1.0, site: 1.0, incidence: 0.075, ach: 0.94 },
    'Vizag Cement Works,Ultratech cement Ltd': { yard: 0.9, transit: 0.95, site: 0.95, incidence: 0.07, ach: 0.95 },
    'Awarpur Cement Works': { yard: 1.1, transit: 1.1, site: 1.2, incidence: 0.12, ach: 0.91 },
    'Rawan Cement Works': { yard: 0.85, transit: 0.9, site: 0.8, incidence: 0.045, ach: 0.96 },
    'Kotputli Cement Works': { yard: 0.95, transit: 1.0, site: 0.95, incidence: 0.07, ach: 0.94 },
    'Gujarat Cement Works': { yard: 0.8, transit: 0.85, site: 0.75, incidence: 0.04, ach: 0.97 },
    'Andhra Pradesh Cement Works': { yard: 0.85, transit: 0.9, site: 0.85, incidence: 0.05, ach: 0.95 },
    'Reddipalayam Cement Works': { yard: 0.9, transit: 0.9, site: 0.9, incidence: 0.06, ach: 0.95 },
    'Dalla Cement Works': { yard: 1.05, transit: 1.1, site: 1.15, incidence: 0.115, ach: 0.92 }
  },
  /* Typical times (hours) for trucks in cycle, by stage. Each trip keeps its order by DI age within
     its plant and stage; its time in stage is read off these distributions (lognormal). */
  timing: { plantMedianH: 2.3, plantSigma: 0.75, siteMedianH: 6, siteSigma: 0.95, lateShare: 0.7, lateMedianH: 3.5, lateSigma: 0.9 },
  /* Month to date before today comes from the dispatch ledger: daily plan = trips in cycle / cycle days,
     with a weekday pattern; dispatched = plan x achievement; detention hours = dispatched x incidence x hours per incident. */
  ledger: { cycleDays: 2.4, chargeableHoursPerIncident: 13, weekday: [0.82, 1.04, 1.06, 1.05, 1.04, 1.03, 0.96] },
  /* Approval matrix: who decides what. Plant-level calls go to the Plant Head; commercial, vendor and budget calls to the Logistics Head. */
  approvalTypes: {
    'hold-dispatch': { to: 'plant', label: 'Hold dispatch to this customer', group: 'Dispatch', cats: ['Customer Detention', 'Unloading Detection'] },
    'alt-site': { to: 'plant', label: 'Divert truck to an alternate unloading site', group: 'Dispatch', cats: ['Customer Detention'] },
    'replacement': { to: 'plant', label: 'Authorise replacement truck and transshipment', group: 'Fleet', cats: ['In-transit Delay'] },
    'diversion': { to: 'plant', label: 'Approve the diversion route', group: 'Route', cats: ['Route Deviation'] },
    'pod-slip': { to: 'plant', label: 'Issue weighbridge slip and re-weigh for disputed POD', group: 'Documents', cats: ['ePOD Delay'] },
    'claim': { to: 'clo', label: 'Raise detention claim on the customer', group: 'Commercial', cats: ['Customer Detention'] },
    'penalty': { to: 'clo', label: 'Performance notice and allocation cut for transporter', group: 'Vendor', cats: ['Route Deviation', 'In-transit Delay', 'ePOD Delay'] },
    'sales-esc': { to: 'clo', label: 'Escalate to the regional sales head', group: 'Escalation', cats: ['Customer Detention', 'Unloading Detection', 'ePOD Delay'] },
    'budget': { to: 'clo', label: 'Extend the plant detention budget', group: 'Budget', cats: [] }
  },
  derivedRouteShare: 0.07,
  verifyFailPct: 15,
  approvalRules: { claimMin: 4000, claimMinTrucks: 3, penaltyMinOpen: 6, holdMinTrucks: 4, salesEscMinTrucks: 3 },
  generatedTransporters: ['Vindhya Roadways', 'Narmada Carriers', 'Ganga Haulage', 'Shiv Shakti Logistics', 'Kaveri Transport Co.', 'Sahyadri Movers', 'Saurashtra Roadlines', 'Godavari Logistics', 'Malwa Transport', 'Chambal Carriers', 'Coromandel Haulers', 'Rajputana Roadways', 'Mahanadi Freight'],

  /* In-plant stages and their norms in minutes (DI to gate-out). Trucks still at the plant are
     placed in the stage their time at plant falls in; time beyond the total norm is "held". */
  inPlant: [['Reporting & parking', 75], ['Gate-in', 20], ['Tare weighment', 10], ['Loading', 60], ['Gross weighment', 10], ['Invoice & documents', 25], ['Gate-out', 10]],
  /* Dedicated fleet = the app's existing fleet rule (hash of DI, every third truck). */

  /* Cost model: detention charged at Rs 1,500 per day after 24 h, pro-rated hourly. */
  cost: { ratePerDay: 1500, freeHours: 24 },

  /* Operating norms used to derive timings from the trip rows. */
  norms: {
    loadingHours: 3.5,      // DI creation to gate-out: the sum of the in-plant stage norms (210 min)
    transitKmPerDay: 300    // planned transit speed for the lead distance
  },

  /* Monthly detention budget per plant =
       planned monthly dispatches x incidence x chargeable days per incident x rate per day,
     where planned monthly dispatches = daily plan from the ledger x days in month.
     Put a rupee value in overrides to pin a plant budget. */
  budget: { incidence: 0.065, chargeableDaysPerIncident: 1.0, roundTo: 5000, overrides: {} },

  /* Burn colour = month-to-date spend / (budget x share of month elapsed). */
  burn: { amberAt: 0.9, redAt: 1.1 },

  /* Rupees at risk on a ticket = detention that accrues over the projected remaining wait.
     Remaining wait = average wait at that destination minus current wait, kept within these bounds. */
  risk: { minHorizonH: 12, maxHorizonH: 72 },

  /* Forecast: trailing run-rate with a linear trend and a day-of-week factor. */
  forecast: { windowDays: 7, dowWindowDays: 14, horizonDays: 60, maxTrendPerDay: 0.01, z: 1.28, dowShrink: 0.5 },

  /* Thresholds that make an agent pick a ticket up (editable on the Priority & guardrails page).
     With these, agents keep about three in four exceptions and only the long tail reaches a person. */
  guardrails: {
    'Route Deviation':     { unit: '%',   trigger: 10, followUp: 20, escalation: 30, active: true, measure: 'Extra distance as a share of distance travelled' },
    'Customer Detention':  { unit: 'h',   trigger: 6,  followUp: 12, escalation: 24, active: true, measure: 'Hours at the customer since planned arrival' },
    'Unloading Detection': { unit: 'min', trigger: 30, active: true, measure: 'Minutes in the unloading area' },
    'ePOD Delay':          { unit: 'h',   trigger: 8,  followUp: 24, escalation: 48, active: true, measure: 'Hours since delivery without an ePOD' },
    'In-transit Delay':    { unit: 'h',   trigger: 2,  followUp: 8, escalation: 16, active: true, measure: 'Hours behind the planned arrival' }
  },
  /* Responses heard on an agent call that hand the ticket to a person. */
  escalateResponses: {
    'Route Deviation': ['Driver Not Answered', 'Road is closed'],
    'Customer Detention': ['Breakdown', 'Customer Not Responding to Driver', 'Driver Not Answered'],
    'Unloading Detection': ['< 80% Confidence', 'Driver Not Answered'],
    'ePOD Delay': ['POD Not Collected', 'Document Illegible', 'Driver Not Answered'],
    'In-transit Delay': ['Driver Not Answered']
  },
  /* Value-based priority score = weighted, normalised (rupees at risk, SLA age, repeat offender). */
  priority: { weights: { rupees: 0.6, sla: 0.3, repeat: 0.1 }, redAt: 0.55, amberAt: 0.3 },
  repeatOffender: { minOpen: 12 },

  /* Closure reasons that are accepted as an outcome (others are rejected). */
  validCloseReasons: [
    'Vehicle is live now', 'Delay at unloading', 'Delay at loading', 'Delay at weighbridge', 'Delay at convey',
    'Weather and road condition issue', 'Existing route road damage', 'Driver does not know about route',
    'Vehicle stuck in traffic jam', 'Vehicle stuck at no-entry', 'Vehicle under breakdown maintenance',
    'Driver is taking rest', 'Driver is taking rest for food', 'Delay in documentation', 'Driver corrected the wiring',
    'Waiting for diesel advance', 'Accidental vehicle', 'Vehicle at RTO', 'Driver is changed', 'Others'
  ],
  /* Minutes (store clock) after an action at which each automatic check is evaluated. */
  verifyAfterMin: { gps: { 'Customer Detention': 30, 'Unloading Detection': 20, 'In-transit Delay': 25, 'Route Deviation': 15 }, gpsSpread: 90, podMatch: 10, noReplyMin: 60, replyMin: [6, 25] },

  /* Real time: the store follows the system clock. Trip times are re-based once, when the store is
     first built, so the latest data point equals that moment; from then on everything ages in real time. */
  live: { tripDriftMin: 30, tickMs: 5000, agentActionEvery: 6 },
  approvals: { defaultMaxTickets: 10 },
  agentEmail: { name: 'FLEETX AI AGENT', address: 'ai.epod@fleetx.io' }
};
window.FX_CONFIG = CONFIG;

var FX = window.FX = {};
var I = null;                // internals handed over by the application bundle
var STATE = null;            // the single store
var RAW = null;              // static trip rows (indexed)
var DER = null;              // memoised derivation for STATE.rev
var subs = [];
var saveTimer = null;
var HOUR = 3600000, DAY = 86400000, IST = 19800000;

/* ---------------------------------------------------------------
   Utilities
   --------------------------------------------------------------- */
function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function sum(a, f) { var t = 0; for (var i = 0; i < a.length; i++) t += f ? f(a[i]) : a[i]; return t; }
function by(a, f) { var m = {}; a.forEach(function (x) { var k = f(x); (m[k] = m[k] || []).push(x); }); return m; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function dayKey(ms) { return Math.floor((ms + IST) / DAY); }            // IST calendar day index
function dayStart(k) { return k * DAY - IST; }
function fmtTime(ms) { var d = new Date(ms + IST); return pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()); }
function fmtDay(ms) { var d = new Date(ms + IST); return d.getUTCDate() + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()]; }
function fmtDT(ms) { return fmtDay(ms) + ', ' + fmtTime(ms); }
function isoIST(ms) { var d = new Date(ms + IST); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + '+05:30'; }
function pad(n) { return (n < 10 ? '0' : '') + n; }
function plantShort(p) {
  if (!p) return '';
  var s = String(p).split(',')[0].replace(/^UTCL\s+/i, '');
  return s.toLowerCase().replace(/(^|[\s-])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); });
}
function chargeable(h) { return Math.max(0, h - CONFIG.cost.freeHours); }
function rate() { return CONFIG.cost.ratePerDay / 24; }

FX.util = { hash: hash, sum: sum, by: by, fmtTime: fmtTime, fmtDay: fmtDay, fmtDT: fmtDT, plantShort: plantShort, dayKey: dayKey, dayStart: dayStart, clamp: clamp };

/* ---------------------------------------------------------------
   Static data: trip rows
   --------------------------------------------------------------- */
/* The data clock is the latest DI in the trip rows. */
function dataAnchorOf(trips) { return Math.max.apply(null, trips.map(function (t) { return t.start; })); }
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hav(a, b, c, d) { var R = 6371, t = Math.PI / 180, x = Math.pow(Math.sin((c - a) * t / 2), 2) + Math.cos(a * t) * Math.cos(c * t) * Math.pow(Math.sin((d - b) * t / 2), 2); return 2 * R * Math.asin(Math.sqrt(x)); }
/* Trips for the added plants: ages and stages are drawn from the real trips, places from the plant's own markets. */
function generateTrips(real, dataAnchor) {
  var out = [], r = rng(20261117);
  var first = ['Ramesh', 'Suresh', 'Raju', 'Mahesh', 'Sunil', 'Vijay', 'Santosh', 'Prakash', 'Anil', 'Manoj', 'Ravi', 'Dinesh', 'Ganesh', 'Sanjay', 'Ashok', 'Mukesh'];
  var last = ['Yadav', 'Patil', 'Singh', 'Kumar', 'Naik', 'Reddy', 'Pawar', 'Verma', 'Sahu', 'Chauhan', 'Murugan', 'Gowda', 'Jadhav', 'Patel'];
  var segs = ['STO', 'STO', 'NONTRADE', 'TRADE', 'KEY'], prods = ['OPC53UTLO', 'PPCUTPP', 'PPCUSLS', 'OPC43UTLO', 'PCCUTPP'];
  var n = 0;
  CONFIG.addedPlants.forEach(function (p, pi) {
    var trs = CONFIG.generatedTransporters.slice((pi * 3) % 9, (pi * 3) % 9 + 5);
    for (var i = 0; i < p.trips; i++) {
      var src = real[Math.floor(r() * real.length)];
      var site = p.sites[Math.floor(Math.pow(r(), 1.6) * p.sites.length)];
      var km = Math.max(25, Math.round(hav(p.lat, p.lon, site[1], site[2]) * 1.25));
      n++;
      out.push({
        di: String(6950000000 + pi * 100000 + i), tripId: String(45000000 + n), start: dataAnchor - (dataAnchor - src.start) * (p.profile || 1) - Math.round(r() * 1800000),
        stage: src.stage, segment: segs[Math.floor(r() * segs.length)], km: km, transporter: trs[Math.floor(Math.pow(r(), 1.3) * trs.length)],
        driver: (first[Math.floor(r() * first.length)] + ' ' + last[Math.floor(r() * last.length)]).toUpperCase(), mobile: '',
        plant: p.name, depot: site[0].split(' ')[0], dest: site[0], product: prods[Math.floor(r() * prods.length)],
        vehicle: p.state + pad(10 + Math.floor(r() * 80)) + 'ABCDGHKT'[Math.floor(r() * 8)] + 'ABCDEFGHJK'[Math.floor(r() * 10)] + (1000 + Math.floor(r() * 9000)),
        vtype: '', customerCode: '', city: '', sap: '', rsn: '', invoice: '', generated: true
      });
    }
  });
  return out;
}
function profileOf(p) { return CONFIG.plantProfile[p] || { yard: 1, transit: 1, site: 1, incidence: 0.07, ach: 0.94 }; }
FX.profileOf = profileOf;
/* Inverse normal (Acklam). */
function ndtri(p) {
  var a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239],
    b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572],
    c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783],
    d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416], q, r;
  if (p < 0.02425) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - 0.02425) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  q = p - 0.5; r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
function qlogn(med, sig, q) { return med * Math.exp(sig * ndtri(clamp(q, 0.003, 0.997))); }
/* Time in stage for each trip: trips keep their order by DI age within plant and stage, and take the
   matching point of the stage's typical distribution (CONFIG.timing), scaled by the plant profile. */
function retime(trips, dataAnchor) {
  var T = CONFIG.timing, L = CONFIG.norms.loadingHours;
  var groups = by(trips, function (t) { return t.plant + '|' + t.stage; });
  Object.keys(groups).forEach(function (k) {
    var g = groups[k].slice().sort(function (a, b) { return b.start - a.start || (a.di < b.di ? -1 : 1); }), n = g.length;
    g.forEach(function (t, i) {
      var q = (i + 0.5) / n, h = (hash(t.di) % 997) / 997, pr = profileOf(t.plant);
      var transitH = t.km / CONFIG.norms.transitKmPerDay * 24, el;
      if (t.stage === 'AT PLANT') el = qlogn(T.plantMedianH * pr.yard, T.plantSigma, 0.7 * q + 0.3 * h);
      else if (t.stage === 'IN TRANSIT') {
        var lq = 0.5 * q + 0.5 * h;
        var late = lq > T.lateShare ? qlogn(T.lateMedianH * pr.transit, T.lateSigma, (lq - T.lateShare) / (1 - T.lateShare)) : -(1 - lq / T.lateShare) * transitH * 0.92;
        el = L + transitH + late;
      } else el = L + transitH + qlogn(T.siteMedianH * pr.site, T.siteSigma, 0.6 * q + 0.4 * h);
      t.start = dataAnchor - el * HOUR;
    });
  });
}
function buildRaw(shift) {
  var hdr = I.tripHeader, idx = {};
  hdr.forEach(function (h, i) { idx[h] = i; });
  var real = I.tripRows.map(function (r) {
    return {
      di: r[idx.di_no] || r[idx.trip_id], tripId: r[idx.trip_id],
      start: Date.parse(String(r[idx.trip_start_date]).replace(' ', 'T')),
      stage: r[idx.job_stage], segment: r[idx.customer_segment], km: Number(r[idx.lead_distance_km]) || 0,
      transporter: r[idx.transporter_name], driver: r[idx.driver_name], mobile: r[idx.mobile_number],
      plant: r[idx.source_location], depot: r[idx.depot], dest: r[idx.destination], product: r[idx.product_name],
      vehicle: r[idx.vehicle], vtype: r[idx.vehicle_type], customerCode: r[idx.customer_code], city: r[idx.city_code],
      sap: r[idx.sap_order_no], rsn: r[idx.rsn_number], invoice: r[idx.invoice_number]
    };
  });
  var dataAnchor = dataAnchorOf(real);
  var trips = real.concat(generateTrips(real, dataAnchor));
  retime(trips, dataAnchor);
  if (shift == null) shift = Date.now() - dataAnchor;
  trips.forEach(function (t) { t.start += shift; });
  var byDi = {};
  trips.forEach(function (t) { byDi[t.di] = t; });
  var realPlants = Array.from(new Set(real.map(function (t) { return t.plant; })));
  var plants = realPlants.concat(CONFIG.addedPlants.map(function (p) { return p.name; }));
  var geo = {};
  Object.keys(CONFIG.plantGeo).forEach(function (k) { geo[k] = CONFIG.plantGeo[k]; });
  CONFIG.addedPlants.forEach(function (p) { geo[p.name] = { lat: p.lat, lon: p.lon, place: p.place, zone: p.zone, lang: p.lang, generated: true }; });
  RAW = { trips: trips, byDi: byDi, anchor: dataAnchor + shift, dataAnchor: dataAnchor, shift: shift, plants: plants, realPlants: realPlants, geo: geo };
}

/* ---------------------------------------------------------------
   Store, persistence, pub/sub
   --------------------------------------------------------------- */
function freshState(ct) {
  return {
    schema: 6, rev: 1, clockMin: 0, skewMin: 0, calls: {}, etaSent: {}, requests: [], budgetAdj: {}, holds: {},
    ct: ct,
    guardrails: clone(CONFIG.guardrails),
    escalateResponses: clone(CONFIG.escalateResponses),
    weights: clone(CONFIG.priority.weights),
    tk: {},            // ticket overrides: verification, closure, notes
    released: {},      // DI -> clockMin at which the truck was released (detention stops)
    events: [],        // event log: detections, agent actions, emails, human actions, closures
    emails: {},        // ticketId -> messages
    approvals: {},     // cardKey -> decision
    seen: {},          // ticket ids already announced by the live feed
    tick: 0
  };
}
function persistNow() {
  saveTimer = null;
  try { localStorage.setItem(CONFIG.storeKey, JSON.stringify(STATE)); } catch (e) { /* storage full or blocked */ }
}
function persist() { if (!saveTimer) saveTimer = setTimeout(persistNow, 200); }
window.addEventListener('beforeunload', function () { if (saveTimer) { clearTimeout(saveTimer); persistNow(); } });

function publish() { DER = null; for (var i = 0; i < subs.length; i++) { try { subs[i](); } catch (e) { console.error(e); } } }
function commit(fn) { fn(STATE); STATE.rev++; persist(); publish(); }

FX.subscribe = function (fn) { subs.push(fn); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; };
FX.state = function () { return STATE; };
FX.config = CONFIG;
FX.raw = function () { return RAW; };
FX.now = function () { return RAW.anchor + STATE.clockMin * 60000; };
/* Trip positions come from one snapshot of the fleet. They age with the clock for CONFIG.live.tripDriftMin
   after the snapshot is built and then hold steady, so trucks do not pile up beyond every norm while the
   page stays open (the snapshot has no new DIs arriving or trucks leaving on its own). */
function tripClockMin() { var b = STATE.builtClock != null ? STATE.builtClock : STATE.clockMin; return Math.min(STATE.clockMin, b + CONFIG.live.tripDriftMin); }
FX.tripNow = function () { return RAW.anchor + tripClockMin() * 60000; };
function realClock() { return (Date.now() - RAW.anchor) / 60000 + (STATE.skewMin || 0); }

/* ---------------------------------------------------------------
   Boot: build the store from the application data
   --------------------------------------------------------------- */
FX.boot = function (internals) {
  I = internals;
  var params = new URLSearchParams(location.search);
  if (params.get('reset') === '1') {
    try { localStorage.removeItem(CONFIG.storeKey); localStorage.removeItem(CONFIG.sessionKey); } catch (e) {}
    Object.keys(localStorage).forEach(function (k) { if (/^fleetx-command-center/.test(k)) localStorage.removeItem(k); });
    params.delete('reset');
    var q = params.toString();
    history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash);
  }
  var saved = null;
  try { saved = JSON.parse(localStorage.getItem(CONFIG.storeKey) || 'null'); } catch (e) { saved = null; }
  /* A store older than one shift is rolled to a fresh cycle, so trucks do not age past what the cycle holds. */
  if (saved && saved.schema === 6 && saved.ct && Array.isArray(saved.ct.cases) && saved.shiftMs != null && saved.builtAt && saved.builtClock != null && Date.now() - saved.builtAt < CONFIG.storeMaxAgeH * 3600000) {
    STATE = saved;
    buildRaw(saved.shiftMs);
    STATE.ct = Object.assign({}, STATE.ct, { cases: STATE.ct.cases.map(feedContacts) });
    STATE.clockMin = realClock();
    return Promise.resolve();
  }
  buildRaw(null);
  return I.loadTrips().then(function (trips) {
    var ct = I.bindTrips(I.initialState(), trips);
    // Keep only tickets bound to a trip that exists in the data.
    ct = Object.assign({}, ct, { cases: ct.cases.filter(function (c) { return c.lane === undefined || RAW.byDi[c.tripIds[0]]; }) });
    ct = Object.assign({}, ct, { cases: ct.cases.map(alignCase).map(feedContacts) });
    STATE = freshState(ct);
    STATE.shiftMs = RAW.shift;
    STATE.builtAt = Date.now(); STATE.builtClock = STATE.clockMin;
    seedHistory();
    DER = null; STATE.rev++;
    var d = derive();
    d.tickets.forEach(function (t) { STATE.seen[t.id] = 1; });
    persistNow();
  });
};

/* Align an agent ticket's labels with the trip it is bound to, so every place,
   customer and transporter shown comes from the trip rows. Call content is untouched. */
/* Job statistics shown in the ticket drawer, derived from the trip's own timings so they agree with the rest of the screen. */
function hm(h) { h = Math.max(0, h); var H = Math.floor(h), M = Math.round((h - H) * 60); if (M === 60) { H++; M = 0; } return (H ? H + ' hr ' : '') + ('0' + M).slice(-2) + ' mins'; }
function statsFor(tr, extraKm) {
  var now = STATE ? FX.tripNow() : Date.now(), c = tripCalc(tr, now), sp = 34 + hash(tr.di + 'sp') % 12;
  var sinceOut = Math.max(0, (now - c.gateOut) / HOUR), dist, run;
  if (tr.stage === 'AT CUSTOMER') { dist = Math.round(tr.km * (1.02 + (hash(tr.di + 'dk') % 5) / 100)) + (extraKm || 0); run = dist / sp; }
  else if (tr.stage === 'IN TRANSIT') { run = sinceOut * 0.72; dist = Math.min(Math.round(tr.km * 0.97), Math.round(run * sp)) + (extraKm || 0); run = dist / sp; }
  else { dist = 0; run = 0; }
  var travel = tr.stage === 'AT CUSTOMER' ? Math.max(run, (c.arrival - c.gateOut) / HOUR) : sinceOut;
  var late = tr.stage === 'IN TRANSIT' ? c.lateH : 0;
  return { status: tr.stage === 'AT PLANT' ? 'CREATED' : 'STARTED', percentComplete: tr.stage === 'AT CUSTOMER' ? 95 : tr.stage === 'IN TRANSIT' ? Math.min(90, Math.max(5, Math.round(dist / tr.km * 85))) : 0,
    group: tr.transporter, scheduledDistance: tr.km + ' km', jobDistance: dist + ' km', averageSpeed: sp + ' km/hr', jobDuration: hm(sinceOut), transitTime: hm(Math.min(travel, sinceOut)),
    stopTime: hm(Math.max(0, Math.min(travel, sinceOut) - run)), runningTime: hm(run), createdDate: fmtDT(tr.start), startTime: fmtDT(c.gateOut),
    predictedDelay: late > 0 ? (Math.floor(late) ? Math.floor(late) + 'h ' : '') + Math.round((late % 1) * 60) + 'm late' : tr.stage === 'AT CUSTOMER' ? 'At site ' + hm(c.siteH).replace(' mins', 'm').replace(' hr ', 'h ') : 'On time',
    vehicleSize: '', currentStatus: tr.stage === 'AT CUSTOMER' ? 'At customer' : tr.stage === 'IN TRANSIT' ? 'Moving' : 'At plant',
    currentLocation: tr.stage === 'AT CUSTOMER' ? tr.dest : tr.stage === 'IN TRANSIT' ? 'En route to ' + tr.dest : plantShort(tr.plant) };
}
FX.statsFor = statsFor;
/* The driver phone on a case comes from the trip feed (mobile_number), never from the case seed.
   The seeded numbers were placeholders that matched none of the feed's drivers, and the
   Trigger call dials this number. No trip in the feed, or no mobile on it: no number. */
function feedContacts(c) {
  if (!c.job || !c.issue) return c;
  var t = RAW.byDi[c.job.jobName];
  var phone = t && t.mobile ? '+91 ' + t.mobile : '';
  if (c.issue.driverPhone === phone) return c;
  return Object.assign({}, c, { issue: Object.assign({}, c.issue, { driverPhone: phone }) });
}

function alignCase(c) {
  if (c.lane === undefined || !c.job) return c;
  var t = RAW.byDi[c.tripIds[0]]; if (!t) return c;
  var lib = pickLib(c.category, c.subReason, c.lane, c.id);
  var trail = c.auditTrail.map(function (a) {
    if (!a.transcript || !lib) return a;
    var tx = txFor(t, lib);
    return Object.assign({}, a, { action: 'Called ' + tx.party + ' in Hindi', transcript: tx });
  });
  var tx = (trail.find(function (a) { return a.transcript; }) || {}).transcript;
  var rd = readTranscript(tx);
  var m = c.metric || {};
  var tc = tripCalc(t, STATE ? FX.tripNow() : Date.now());
  var meas = m.kind === 'deviation' ? m.km + ' km off the approved route' : m.kind === 'epod' ? m.hours + ' h since delivery without an ePOD' : t.stage === 'AT CUSTOMER' ? 'at site since the planned arrival at ' + fmtDT(tc.arrival) : m.hours + ' h held';
  var stage = { 'Route Deviation': 'IN TRANSIT', 'In-transit Delay': 'IN TRANSIT' }[c.category] || t.stage;
  var stats = Object.assign({}, c.stats || {}, statsFor(t, m.kind === 'deviation' ? m.km : 0));
  var nowA = STATE ? FX.now() : Date.now();
  var det = t.stage === 'AT CUSTOMER' ? tc.arrival + 6 * HOUR : t.stage === 'IN TRANSIT' ? tc.gateOut + 0.5 * (nowA - tc.gateOut) : t.start + CONFIG.norms.loadingHours * HOUR;
  det = Math.min(det, nowA - (20 + hash(c.id) % 90) * 60000);
  var hm = fmtTime(det), day = fmtDay(det);
  return Object.assign({}, c, {
    auditTrail: trail, stats: stats, site: t.dest, detectedAt: hm,
    evidence: (c.evidence || []).filter(function (e) { return !/terminal|cement works|samalkha|kurnool|depot|bulk|udupi|panvel|cochin|pune|mumbai/i.test(e); }),
    issue: Object.assign({}, c.issue, { customer: t.dest, vehicleTags: [t.segment, t.product].filter(Boolean), reportedOn: day + ' ' + new Date(det + IST).getUTCFullYear() + ', ' + hm + ' IST',
      description: c.category + ' on DI ' + t.di + ', ' + t.vehicle + ' from ' + plantShort(t.plant) + ' to ' + t.dest + ': ' + meas + '.' + (rd ? ' Agent call: ' + rd.outcome + '.' + (rd.said.length ? ' ' + rd.role + ' said: "' + rd.said.join(' ') + '"' : '') : '') })
  });
}

/* ---------------------------------------------------------------
   Transcript reading: everything below comes only from what was said.
   --------------------------------------------------------------- */
var LIB = FX_CALLS || {};
FX.calls = LIB;
function readTranscript(tx) {
  if (!tx) return null;
  var lib = LIB[tx.lib || tx.audio];
  if (lib) {
    var saidL = lib.lines.filter(function (l) { return l.speaker !== 'AI agent' && l.speaker !== 'System'; });
    return { role: lib.party, said: saidL.map(function (l) { return l.translation; }), noAnswer: lib.result === 'noanswer', tags: lib.tags.slice(), commit: lib.commit, outcome: lib.outcome,
      confidence: tx.confidence, language: 'Hindi', party: tx.party, result: lib.result, etaChange: !!lib.etaChange, lib: lib.id };
  }
  var lines = tx.lines || [];
  var said = lines.filter(function (l) { return l.speaker !== 'AI agent' && l.speaker !== 'Operator' && l.speaker !== 'System'; });
  var sys = lines.filter(function (l) { return l.speaker === 'System'; });
  var noAnswer = sys.some(function (l) { return /no answer|switched off|not reachable/i.test(l.translation); }) && said.length === 0;
  var role = said.length ? said[0].speaker : (/driver/i.test(tx.party) ? 'Driver' : 'Contact');
  var text = said.map(function (l) { return l.translation; }).join(' ');
  var tags = [];
  if (noAnswer) tags.push('Driver Not Answered');
  if (/compressor|breakdown|will not move|brakes/i.test(text)) tags.push('Breakdown');
  if (/highway .*closed|road .*closed|is closed/i.test(text)) tags.push('Road is closed');
  if (/cannot be read|dark|illegible/i.test(text)) tags.push('Document Illegible');
  if (/with me|has not given|not given it/i.test(text)) tags.push('POD Not Collected');
  if (tx.confidence < 0.8) tags.push('< 80% Confidence');
  var commit = null;
  var m = text.match(/(by [a-z\s-]+(?:o'?\s?clock|evening|morning|today)[^.]*|at [a-z]+ o'?\s?clock|tomorrow morning|before [a-z]+|by half past [a-z]+[^.]*|today itself|right away|in ten to fifteen minutes|about [a-z]+ minutes)/i);
  if (m) commit = m[0].replace(/\s+/g, ' ').trim();
  var attempts = (sys.map(function (l) { return l.translation; }).join(' ').match(/(\w+) attempts/i) || [])[1];
  var outcome = noAnswer ? ('No answer' + (attempts ? ' · ' + attempts + ' attempts' : '') + (sys.some(function (l) { return /switched off/i.test(l.translation); }) ? ' · phone switched off' : ''))
    : commit ? 'Reached ' + role.toLowerCase() + ' · commitment: ' + commit
    : 'Reached ' + role.toLowerCase() + ' · reason captured';
  return { role: role, said: said.map(function (l) { return l.translation; }), noAnswer: noAnswer, tags: tags, commit: commit, outcome: outcome, confidence: tx.confidence, language: tx.language, party: tx.party };
}
FX.readTranscript = readTranscript;
/* Pick a call from the library for a ticket: by sub-reason where it fits, else by lane and a stable hash. */
var SUB_LIB = { 'Road Closed': 'rd1', 'Fuel Stop Detour': 'rd2', 'Restricted Zone Entry': 'rd3', 'Excessive Deviation': 'rd4', 'Unscheduled Halt': 'rd2',
  'Vehicle in Breakdown': 'cd3', 'Customer Not Available': 'cd2', 'Excessive Delay': 'cd1', 'Awaiting Unloading Slot': 'cd4', 'Gate Entry Denied': 'cd2', 'Invoice Quantity Mismatch': 'cd7',
  'Low Confidence Stop': 'ud2', 'Bay Queue Backlog': 'ud1', 'Labour Unavailable': 'ud3', 'Weighbridge Queue': 'ud3',
  'POD Not Uploaded': 'ep1', 'Awaiting Transporter Upload': 'ep3', 'POD Rejected in QC': 'ep2', 'Illegible POD Scan': 'ep4', 'Driver Holding Hard Copy': 'ep1' };
var SUBS = { rd1: 'Road work diversion', rd2: 'Fuel stop detour', rd3: 'No-entry bypass', rd4: 'Unapproved shortcut', rd5: 'Unauthorised halt',
  td1: 'Tyre puncture', td2: 'Highway jam', td3: 'Driver rest halt', td4: 'Vehicle breakdown', td5: 'Driver not reachable',
  cd1: 'Bays full at site', cd2: 'Payment hold at site', cd3: 'Gate not attended', cd4: 'Labour shortage at site', cd5: 'Gate pass pending', cd6: 'Site not answering', cd7: 'Invoice quantity mismatch', cd8: 'Site closed for holiday',
  ud1: 'Unloading in progress', ud2: 'Waiting for gate entry', ud3: 'Weighbridge queue', ud4: 'Driver not reachable', ud5: 'Unloaded, leaving',
  ep1: 'Signed copy with driver', ep2: 'Receiver stamp missing', ep3: 'POD at transporter branch', ep4: 'Blurred POD photo', ep5: 'Quantity dispute' };
/* Reason the driver gives in the real call recording of each type (src/fx/recordings.ts).
   It is shown on whichever ticket carries that recording, so the two always travel together.
   Only the reason changes: the agent call, timings and everything else stay as derived. */
var RECORDED_REASON = { 'Customer Detention': 'Driver having lunch for prolonged period' };
function libPool(cat) { return Object.keys(LIB).filter(function (k) { return LIB[k].cat === cat; }); }
function pickLib(cat, sub, lane, seed) {
  if (cat !== 'Route Deviation' || sub !== 'Driver Not Answered') { if (SUB_LIB[sub] && LIB[SUB_LIB[sub]] && LIB[SUB_LIB[sub]].cat === cat) return SUB_LIB[sub]; }
  var pool = libPool(cat); if (!pool.length) return null;
  var bad = pool.filter(function (k) { return /noanswer|refusal|reason/.test(LIB[k].result) || LIB[k].tags.length; });
  var good = pool.filter(function (k) { return bad.indexOf(k) < 0; });
  if (sub === 'Driver Not Answered') return (bad.filter(function (k) { return LIB[k].result === 'noanswer' || LIB[k].tags.indexOf('Driver Not Answered') >= 0; })[0]) || bad[0] || pool[0];
  var list = lane === 'action' ? (bad.length ? bad : pool) : good.length ? good : pool;
  return list[hash(seed) % list.length];
}
function partyName(t, lib) {
  var L = LIB[lib]; if (!L) return '';
  return L.party === 'Driver' ? t.driver + ', driver' : L.party === 'Transporter' ? 'Control room, ' + t.transporter : L.party === 'Sales officer' ? 'Sales officer, ' + t.dest : 'Site in-charge, ' + t.dest;
}
/* Calls are assembled per trip: fixed phrases plus the vehicle number, site, plant and revised
   arrival spoken in the agent's voice (FX_CLIPS). */
var CL = FX_CLIPS || { clips: {}, slots: { let: {}, num: {}, site: {}, plant: {}, eta: {} } };
function siteKey(n) {
  n = String(n || '').toUpperCase().replace(/\(.*?\)/g, '').replace(/\b(UTCL|STO|BULK|HUB|DUMP|DEPOT|GODOWN|CEMENT|TP|AREA)\b/g, ' ').replace(/[-_,.]/g, ' ').replace(/\d+/g, ' ').replace(/\s+/g, ' ').trim();
  return n.toLowerCase().replace(/(^|\s)\S/g, function (m) { return m.toUpperCase(); });
}
function vehParts(v) {
  var m = String(v || '').replace(/\s/g, '').toUpperCase().match(/^([A-Z]{2})(\d{1,2})([A-Z]{0,3})(\d{1,4})$/); if (!m) return null;
  var d = m[4]; if (d.length % 2) d = '0' + d;
  var nums = []; for (var i = 0; i < d.length; i += 2) nums.push(d.slice(i, i + 2));
  return { a: m[1].split(''), b: ('0' + m[2]).slice(-2), c: m[3].split(''), d: nums, text: m[1] + ' ' + m[2] + ' ' + (m[3] ? m[3] + ' ' : '') + m[4] };
}
function slotClips(name, t, eta) {
  var S = CL.slots;
  if (name === 'VEH') { var p = vehParts(t.vehicle); if (!p) return []; return p.a.map(function (x) { return S.let[x]; }).concat([S.num[p.b]], p.c.map(function (x) { return S.let[x]; }), p.d.map(function (x) { return S.num[x]; })).filter(Boolean); }
  if (name === 'SITE') { var x = S.site[siteKey(t.dest)]; return x ? [x[0]] : []; }
  if (name === 'PLANT') { var y = S.plant[t.plant]; return y ? [y[0]] : []; }
  if (name === 'ETA') { var z = S.eta[eta] || S.eta['*']; return z ? [z[0]] : []; }
  return [];
}
function slotText(name, t, eta, hi) {
  var S = CL.slots;
  if (name === 'VEH') { var p = vehParts(t.vehicle); return p ? p.text : t.vehicle; }
  if (name === 'SITE') { var x = S.site[siteKey(t.dest)]; return hi && x ? x[1] : siteKey(t.dest) || t.dest; }
  if (name === 'PLANT') { var y = S.plant[t.plant]; return hi && y ? y[1] : plantShort(t.plant); }
  if (name === 'ETA') { var z = S.eta[eta] || S.eta['*']; return z ? (hi ? z[1] : z[2]) : ''; }
  return '';
}
function clipDur(k) { var c = CL.clips[k]; return c ? c[1] : 0; }
function lineClips(l, t, eta) { var out = []; (l.segs || []).forEach(function (s, i) { if (i) out.push('tick'); if (s.charAt(0) === '$') out = out.concat(slotClips(s.slice(1), t, eta)); else out.push(s); }); return out; }
function callPlan(t, lib, eta) {
  var L = LIB[lib], cur = clipDur('lead'), seq = ['lead'], lines = [];
  L.lines.forEach(function (l) {
    var cl = lineClips(l, t, eta);
    lines.push({ speaker: l.speaker, t: Math.round(cur * 100) / 100,
      text: l.text.replace(/\{(\w+)\}/g, function (m, k) { return slotText(k, t, eta, true); }),
      translation: l.translation.replace(/\{(\w+)\}/g, function (m, k) { return slotText(k, t, eta, false); }) });
    cl.forEach(function (k) { cur += clipDur(k); }); seq = seq.concat(cl, ['gap']); cur += clipDur('gap');
  });
  return { lines: lines, seq: seq, duration: Math.round(cur * 10) / 10 };
}
function txFor(t, lib, eta) {
  var L = LIB[lib], P = callPlan(t, lib, eta);
  return { language: 'Hindi', party: partyName(t, lib), confidence: L.result === 'noanswer' ? 0.2 : 0.9, outcome: L.outcome, lines: P.lines,
    audio: lib + '~' + t.di + (eta ? '~' + eta : ''), lib: lib, duration: P.duration };
}
var AUDIO_URL = {}, CLIP_BYTES = {};
function clipBytes(k) {
  if (CLIP_BYTES[k]) return CLIP_BYTES[k];
  var c = CL.clips[k]; if (!c) return new Uint8Array(0);
  var b = atob(c[0]), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return (CLIP_BYTES[k] = u);
}
FX.audioUrl = function (key) {
  if (!key) return null;
  if (AUDIO_URL[key]) return AUDIO_URL[key];
  var p = String(key).split('~'), lib = p[0], t = RAW.byDi[p[1]], eta = p[2];
  if (!LIB[lib] || !t) return null;
  try { AUDIO_URL[key] = URL.createObjectURL(new Blob(callPlan(t, lib, eta).seq.map(clipBytes), { type: 'audio/mpeg' })); } catch (e) { return null; }
  return AUDIO_URL[key];
};
FX.txFor = function (ticket, lib, eta) { return txFor(ticket.trip || ticket, lib, eta); };

/* ---------------------------------------------------------------
   Trip timings (documented formulas)
     planned gate-out   = DI time + loading norm
     planned arrival    = planned gate-out + lead km / transit km per day
     hours at customer  = now - planned arrival            (stage AT CUSTOMER)
     hours late         = now - planned arrival            (stage IN TRANSIT)
     hours at plant     = now - DI time                    (stage AT PLANT)
     detention accrued  = max(0, hours at customer - 24) x 1500 / 24
   A truck released by a closed ticket stops accruing at the release time.
   --------------------------------------------------------------- */
function tripCalc(t, nowMs) {
  var rel = STATE ? STATE.released[t.di] : null;
  var end = rel != null ? Math.min(nowMs, RAW.anchor + rel * 60000) : nowMs;
  var gateOut = t.start + CONFIG.norms.loadingHours * HOUR;
  var transitH = t.km / CONFIG.norms.transitKmPerDay * 24;
  var arrival = gateOut + transitH * HOUR;
  var c = { t: t, gateOut: gateOut, arrival: arrival, transitH: transitH, ageH: (nowMs - t.start) / HOUR, released: rel != null,
            plantH: 0, overNormH: 0, lateH: 0, siteH: 0, detH: 0, det: 0, freeEnds: arrival + CONFIG.cost.freeHours * HOUR };
  if (t.stage === 'AT PLANT') { c.plantH = (nowMs - t.start) / HOUR; c.overNormH = Math.max(0, c.plantH - CONFIG.norms.loadingHours); }
  if (t.stage === 'IN TRANSIT') { c.lateH = (end - arrival) / HOUR; }
  if (t.stage === 'AT CUSTOMER') { c.siteH = Math.max(0, (end - arrival) / HOUR); c.detH = chargeable(c.siteH); c.det = c.detH * rate(); }
  return c;
}

/* ---------------------------------------------------------------
   Tickets
   --------------------------------------------------------------- */
var CAT_STAGE = { 'Route Deviation': 'In transit', 'In-transit Delay': 'In transit', 'Customer Detention': 'Unloading', 'Unloading Detection': 'Unloading', 'ePOD Delay': 'ePOD' };
FX.CAT_STAGE = CAT_STAGE;
function laneFor(cat, m, g) {
  if (g.escalation != null && m >= g.escalation) return 'action';
  if (g.followUp != null && m >= g.followUp) return 'followup';
  return 'ai';
}
function caseMeasure(c, nowMs) {
  var mins = tripClockMin();
  var cat = c.category;
  var met = c.metric || {};
  if (cat === 'Route Deviation') {
    var travelled = parseFloat(String((c.stats && c.stats.jobDistance) || '0').replace(/,/g, '')) || 0;
    return { m: travelled ? met.km / travelled * 100 : 0, text: '+' + met.km + ' km', sub: travelled ? Math.round(met.km / travelled * 100) + '% of ' + travelled + ' km travelled' : '' };
  }
  if (cat === 'Unloading Detection') { var mm = (met.hours || 0) * 60 + mins; return { m: mm, text: (mm / 60).toFixed(1) + ' h in unloading area', h: mm / 60 }; }
  var h = (met.hours || 0) + mins / 60;
  if (cat === 'ePOD Delay') return { m: h, text: h.toFixed(1) + ' h since delivery', h: h };
  return { m: h, text: h.toFixed(1) + ' h at customer', h: h };
}

function derive() {
  if (DER && DER.rev === STATE.rev) return DER;
  var nowMs = FX.tripNow();
  var G = STATE.guardrails;
  var calcs = RAW.trips.map(function (t) { return tripCalc(t, nowMs); });
  var calcByDi = {}; calcs.forEach(function (c) { calcByDi[c.t.di] = c; });

  // Average wait at each destination (used for rupees at risk).
  var siteByDest = {}, siteAll = [];
  calcs.forEach(function (c) { if (c.t.stage === 'AT CUSTOMER') { (siteByDest[c.t.dest] = siteByDest[c.t.dest] || []).push(c.siteH); siteAll.push(c.siteH); } });
  var avgSiteAll = siteAll.length ? sum(siteAll) / siteAll.length : 0;
  function avgSite(dest) { var a = siteByDest[dest]; return a && a.length ? sum(a) / a.length : avgSiteAll; }
  function atRisk(siteH, dest) {
    var horizon = clamp(avgSite(dest) - siteH, CONFIG.risk.minHorizonH, CONFIG.risk.maxHorizonH);
    return (chargeable(siteH + horizon) - chargeable(siteH)) * rate();
  }

  var tickets = [];
  var caseTrip = {};
  // 1. Tickets raised by the agents with call records (application tickets).
  (STATE.ct.cases || []).forEach(function (c) {
    if (c.lane === undefined || !c.category) return;
    var di = c.tripIds[0], trip = RAW.byDi[di]; if (!trip) return;
    if (!/^EX-/.test(c.id)) caseTrip[di + '|' + c.category] = c.id;
    if (/^EX-/.test(c.id)) return; // materialised derived tickets are generated below
    var g = G[c.category]; if (!g) return;
    var ms = caseMeasure(c, nowMs), tcalc = calcByDi[di];
    if (c.category === 'Customer Detention' && tcalc && trip.stage === 'AT CUSTOMER') ms = { m: tcalc.siteH, text: tcalc.siteH.toFixed(1) + ' h at customer', h: tcalc.siteH };
    var tx = readTranscript((c.auditTrail.find(function (a) { return a.transcript; }) || {}).transcript);
    var lane = laneFor(c.category, ms.m, g);
    var esc = (STATE.escalateResponses[c.category] || []);
    var escTag = tx && tx.result !== 'eta' && tx.result !== 'commit' ? tx.tags.filter(function (x) { return esc.indexOf(x) >= 0; }) : [];
    if (escTag.length) lane = 'action';
    var picked = g.active && ms.m >= g.trigger;
    var siteH = (c.category === 'Customer Detention' || c.category === 'Unloading Detection') ? ms.h : 0;
    tickets.push(mkTicket({
      id: c.id, caseId: c.id, src: 'case', cat: c.category, sub: c.subReason, trip: trip, calc: calcByDi[di],
      m: ms.m, mText: ms.text, mSub: ms.sub, lane: lane, picked: picked, tx: tx, escTag: escTag,
      rs: siteH ? atRisk(siteH, trip.dest) : 0, slaH: slaFromCase(c, g, ms), detH: siteH ? chargeable(siteH) : 0
    }));
  });
  // 2. Tickets derived from trip timings.
  calcs.forEach(function (c) {
    var t = c.t;
    if (t.stage === 'AT CUSTOMER' && !caseTrip[t.di + '|Customer Detention'] && !caseTrip[t.di + '|Unloading Detection']) {
      var g = G['Customer Detention'];
      tickets.push(mkTicket({ id: 'EX-CD-' + t.di, src: 'derived', cat: 'Customer Detention', sub: c.siteH >= CONFIG.cost.freeHours ? 'Detention charging' : 'Held at customer',
        trip: t, calc: c, m: c.siteH, mText: c.siteH.toFixed(1) + ' h at customer', lane: laneFor('Customer Detention', c.siteH, g), picked: g.active && c.siteH >= g.trigger,
        rs: atRisk(c.siteH, t.dest), slaH: Math.max(0, c.siteH - g.trigger), detH: c.detH }));
    }
    if (t.stage === 'IN TRANSIT' && !caseTrip[t.di + '|Route Deviation']) {
      var rh = hash('rd|' + t.di) % 1000;
      if (rh < CONFIG.derivedRouteShare * 1000) {
        var gR = G['Route Deviation'], runH = Math.max(0.5, Math.min(c.transitH, (nowMs - c.gateOut) / HOUR)), trav = Math.max(40, Math.round(t.km * runH / Math.max(1, c.transitH)));
        var pctR = 6 + Math.pow((hash('rdp|' + t.di) % 1000) / 1000, 2) * 30, extra = Math.max(3, Math.round(trav * pctR / 100));
        pctR = extra / trav * 100;
        tickets.push(mkTicket({ id: 'EX-RD-' + t.di, src: 'derived', cat: 'Route Deviation', sub: pctR >= gR.escalation ? 'Off corridor' : (hash('rds|' + t.di) % 3 === 0 ? 'Road is closed' : 'Unapproved halt off route'),
          trip: t, calc: c, m: pctR, mText: '+' + extra + ' km', mSub: Math.round(pctR) + '% of ' + trav + ' km travelled', lane: laneFor('Route Deviation', pctR, gR), picked: gR.active && pctR >= gR.trigger,
          rs: 0, slaH: runH * 0.45, detH: 0, rdKm: extra, rdTrav: trav }));
      }
    }
    if (t.stage === 'IN TRANSIT' && !caseTrip[t.di + '|In-transit Delay']) {
      var g2 = G['In-transit Delay'];
      tickets.push(mkTicket({ id: 'EX-TD-' + t.di, src: 'derived', cat: 'In-transit Delay', sub: c.lateH >= g2.escalation ? 'Long delay' : 'Behind plan',
        trip: t, calc: c, m: c.lateH, mText: c.lateH.toFixed(1) + ' h behind plan', lane: laneFor('In-transit Delay', c.lateH, g2), picked: g2.active && c.lateH >= g2.trigger,
        rs: 0, slaH: Math.max(0, c.lateH - g2.trigger), detH: 0 }));
    }
  });

  // Agent calls on tickets raised from trip timings.
  tickets.forEach(function (tk) {
    if (tk.src !== 'derived') return;
    var cl = STATE.calls[tk.id];
    if (cl && cl.length) {
      var main = cl.filter(function (x) { return LIB[x.lib] && LIB[x.lib].cat !== 'ETA update'; });
      if (main.length) { tk.tx = readTranscript(txFor(tk.trip, main[main.length - 1].lib)); if (SUBS[tk.tx.lib]) tk.sub = SUBS[tk.tx.lib]; }
      var esc = STATE.escalateResponses[tk.cat] || [];
      tk.escTag = tk.tx && tk.tx.result !== 'eta' && tk.tx.result !== 'commit' ? tk.tx.tags.filter(function (x) { return esc.indexOf(x) >= 0; }) : [];
      if (tk.escTag.length && tk.picked) tk.lane = 'action';
    }
  });
  // Overrides (verification / closure / notes) and visibility.
  tickets.forEach(function (tk) {
    var o = STATE.tk[tk.id];
    tk.o = o || null;
    tk.phase = o && o.phase ? o.phase : 'open';
    if (o && o.lane && tk.phase === 'open') tk.lane = o.lane;            // e.g. refusal hands back to a person
    tk.visible = tk.phase !== 'open' || tk.picked;
    tk.status = tk.phase === 'closed' ? 'Closed' : tk.phase === 'verify' ? 'Awaiting verification' : tk.phase === 'approval' ? 'Awaiting approval' : tk.lane === 'action' ? 'Action required' : tk.lane === 'followup' ? 'Follow-up' : 'AI-handling';
    if (tk.phase === 'verify' || tk.phase === 'closed') tk.rs = 0;  // actioned: exposure handed to verification
    if (tk.phase === 'closed') tk.slaH = 0;
  });
  var vis = tickets.filter(function (t) { return t.visible; });
  var open = vis.filter(function (t) { return t.phase !== 'closed'; });
  // Repeat offender: transporter with many open tickets.
  var perTr = {}; open.forEach(function (t) { perTr[t.trip.transporter] = (perTr[t.trip.transporter] || 0) + 1; });
  open.forEach(function (t) { t.val = (t.acc || 0) + t.rs; });
  var maxRs = Math.max(1, Math.max.apply(null, open.map(function (t) { return t.val; }).concat([0])));
  var maxSla = Math.max(1, Math.max.apply(null, open.map(function (t) { return t.slaH; }).concat([0])));
  var W = STATE.weights, wsum = (W.rupees + W.sla + W.repeat) || 1;
  vis.forEach(function (t) {
    t.repeat = (perTr[t.trip.transporter] || 0) >= CONFIG.repeatOffender.minOpen;
    t.score = (W.rupees * ((t.val || 0) / maxRs) + W.sla * (t.slaH / maxSla) + W.repeat * (t.repeat ? 1 : 0)) / wsum;
    t.prio = t.phase !== 'open' ? 'neutral' : t.score >= CONFIG.priority.redAt ? 'red' : t.score >= CONFIG.priority.amberAt ? 'amber' : 'green';
  });

  // The real call recording of each type sits on the top-ranked case of that type in "Cases that
  // need a person", ranked as the queue ranks it (score, then SLA age, then repeat). Mark that
  // ticket and give it the recorded reason, so the recording and its reason move together.
  var recTop = {};
  open.forEach(function (t) {
    if (t.phase !== 'open' || t.lane === 'ai') return;
    var b = recTop[t.cat];
    if (!b || (t.score - b.score || t.slaH - b.slaH || (t.repeat ? 1 : 0) - (b.repeat ? 1 : 0)) > 0) recTop[t.cat] = t;
  });
  Object.keys(recTop).forEach(function (cat) { var t = recTop[cat]; t.recording = true; if (RECORDED_REASON[cat]) t.sub = RECORDED_REASON[cat]; });

  DER = { rev: STATE.rev, nowMs: nowMs, calcs: calcs, calcByDi: calcByDi, tickets: vis, all: tickets, open: open, avgSite: avgSite };
  return DER;
}
/* SLA age of an agent ticket = hours since it was detected (detection time is on the data day). */
function slaFromCase(c, g, ms) {
  var hm = String(c.detectedAt || '00:00').split(':').map(Number);
  var day = dayStart(dayKey(RAW.anchor));
  var det = day + (hm[0] * 60 + hm[1]) * 60000;
  if (det > RAW.anchor) det -= DAY;
  return Math.max(0, (FX.tripNow() - det) / HOUR);
}
function mkTicket(o) {
  var t = o.trip;
  return {
    id: o.id, caseId: o.caseId || null, src: o.src, cat: o.cat, sub: o.sub, di: t.di, trip: t, calc: o.calc,
    plant: t.plant, dest: t.dest, transporter: t.transporter, vehicle: t.vehicle, driver: t.driver,
    stage: CAT_STAGE[o.cat], m: o.m, mText: o.mText, mSub: o.mSub || '', lane: o.lane, picked: o.picked,
    tx: o.tx || null, escTag: o.escTag || [], rs: o.rs || 0, acc: (o.cat === 'Customer Detention' || o.cat === 'Unloading Detection') && o.calc ? o.calc.det : 0, slaH: o.slaH || 0, detH: o.detH || 0, rdKm: o.rdKm, rdTrav: o.rdTrav
  };
}
FX.derive = derive;
/* Dedicated fleet: the app's existing rule (hash of the DI, every third truck). */
FX.dedicated = function (t) { var h = 0, id = t.di || t.tripId; for (var i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 2246822507); return (Math.abs(h ^ h >>> 15) % 11) % 3 === 0; };
/* In-plant stages for trucks still at a plant (see CONFIG.inPlant). */
FX.yard = function (plant) {
  var d = derive(), st = CONFIG.inPlant, total = st.reduce(function (a, x) { return a + x[1]; }, 0);
  var rows = st.map(function (x) { return { name: x[0], norm: x[1], trips: [], mins: 0 }; });
  var held = { name: 'Held beyond norm', norm: 0, trips: [], mins: 0 };
  d.calcs.forEach(function (c) {
    if (c.t.stage !== 'AT PLANT' || (plant && c.t.plant !== plant)) return;
    var m = c.plantH * 60;
    if (m >= total) { held.trips.push(c); held.mins += m - total; return; }
    var acc = 0;
    for (var i = 0; i < rows.length; i++) { if (m < acc + rows[i].norm) { rows[i].trips.push(c); rows[i].mins += m - acc; break; } acc += rows[i].norm; }
  });
  rows.forEach(function (r) { r.avg = r.trips.length ? r.mins / r.trips.length : 0; });
  held.avgH = held.trips.length ? held.mins / held.trips.length / 60 : 0;
  var all = d.calcs.filter(function (c) { return c.t.stage === 'AT PLANT' && (!plant || c.t.plant === plant); });
  return { stages: rows, held: held, totalNorm: total, count: all.length, avgH: all.length ? sum(all, function (c) { return c.plantH; }) / all.length : 0 };
};
FX.ticket = function (id) { return derive().all.find(function (t) { return t.id === id; }) || null; };

/* AI insight on a ticket: ticket facts plus only what was said on the call. */
FX.insight = function (t) {
  var fact = t.cat + ' · ' + t.mText + (t.mSub ? ' (' + t.mSub + ')' : '');
  if (!t.tx) return { fact: fact, said: null, outcome: null };
  return { fact: fact, said: t.tx.noAnswer ? null : t.tx.role + ' said: "' + t.tx.said.join(' ') + '"', outcome: t.tx.outcome, tags: t.escTag };
};

/* ---------------------------------------------------------------
   Aggregates
   --------------------------------------------------------------- */
function monthInfo(nowMs) {
  var d = new Date(nowMs + IST);
  var y = d.getUTCFullYear(), mo = d.getUTCMonth();
  var startMs = Date.UTC(y, mo, 1) - IST;
  var dim = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
  var elapsedDays = (nowMs - startMs) / DAY;
  return { y: y, m: mo, startMs: startMs, dim: dim, elapsedDays: elapsedDays, share: elapsedDays / dim, startDay: dayKey(startMs), endDay: dayKey(startMs) + dim - 1 };
}
FX.monthInfo = function () { return monthInfo(FX.now()); };

function dailyPlan(plant) { return RAW.trips.filter(function (t) { return t.plant === plant; }).length / CONFIG.ledger.cycleDays; }
function plantBudget(plant) {
  var o = CONFIG.budget.overrides[plant];
  var adj = (STATE && STATE.budgetAdj && STATE.budgetAdj[plant]) || 0;
  if (o) return o + adj;
  var mi = monthInfo(FX.now());
  var b = dailyPlan(plant) * mi.dim * CONFIG.budget.incidence * CONFIG.budget.chargeableDaysPerIncident * CONFIG.cost.ratePerDay;
  return Math.max(CONFIG.budget.roundTo, Math.round(b / CONFIG.budget.roundTo) * CONFIG.budget.roundTo) + adj;
}
/* Dispatch ledger for the days of this month before today (see CONFIG.ledger). */
var LEDGER = {};
function ledger(plant) {
  var mi = monthInfo(FX.now()), today = dayKey(FX.now()), key = plant + '|' + mi.startDay + '|' + today;
  if (LEDGER[key]) return LEDGER[key];
  var L = CONFIG.ledger, pr = profileOf(plant), base = dailyPlan(plant), out = {};
  for (var k = mi.startDay; k < today; k++) {
    var n1 = (hash(plant + k + 'a') % 2001) / 1000 - 1, n2 = (hash(plant + k + 'b') % 2001) / 1000 - 1, n3 = (hash(plant + k + 'c') % 2001) / 1000 - 1;
    var wd = new Date(dayStart(k) + IST + 6 * HOUR).getUTCDay();
    var plan = Math.max(0, Math.round(base * L.weekday[wd] * (1 + 0.08 * n1)));
    var act = Math.round(plan * clamp(pr.ach + 0.035 * n2, 0.7, 1));
    var detH = act * pr.incidence * L.chargeableHoursPerIncident * (1 + 0.3 * n3);
    out[k] = { plan: plan, act: act, detH: detH };
  }
  LEDGER[key] = out;
  return out;
}
FX.ledger = ledger;
FX.plantBudget = plantBudget;

/* Detention accrued per IST day, split across days hour by hour. */
function detentionDaily(calcs, nowMs) {
  var out = {};
  calcs.forEach(function (c) {
    if (c.t.stage !== 'AT CUSTOMER') return;
    var rel = STATE.released[c.t.di];
    var end = rel != null ? Math.min(nowMs, RAW.anchor + rel * 60000) : nowMs;
    var s = c.freeEnds;
    if (end <= s) return;
    var k = dayKey(s);
    while (s < end) {
      var next = Math.min(end, dayStart(k + 1));
      out[k] = (out[k] || 0) + (next - s) / HOUR * rate();
      s = next; k++;
    }
  });
  return out;
}

/* Forecast: level + capped linear trend over the trailing window, times a shrunk day-of-week factor. */
function forecast(series, lastKey, horizon) {
  var F = CONFIG.forecast, n = F.windowDays;
  var xs = [], ys = [];
  for (var k = lastKey - n + 1; k <= lastKey; k++) { xs.push(k); ys.push(series[k] || 0); }
  var mx = sum(xs) / n, my = sum(ys) / n, sxy = 0, sxx = 0;
  for (var i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) * (xs[i] - mx); }
  var b = sxx ? sxy / sxx : 0;
  var level = my + b * (lastKey - mx);
  var cap = Math.abs(level) * F.maxTrendPerDay;
  b = clamp(b, -cap, cap);
  var res = ys.map(function (y, i) { return y - (my + b * (xs[i] - mx)); });
  var sd = Math.sqrt(sum(res, function (r) { return r * r; }) / Math.max(1, n - 2));
  // Day-of-week factor: each day against its centred 7-day average (removes the trend), averaged by weekday.
  var dw = {}, dc = {};
  for (var k2 = lastKey - F.dowWindowDays + 1; k2 <= lastKey - 3; k2++) {
    var ma = 0; for (var j = -3; j <= 3; j++) ma += (series[k2 + j] || 0); ma /= 7;
    if (ma <= 0) continue;
    var wd = ((k2 % 7) + 7) % 7;
    dw[wd] = (dw[wd] || 0) + (series[k2] || 0) / ma; dc[wd] = (dc[wd] || 0) + 1;
  }
  var fac = {}, fsum = 0, fc = 0;
  for (var w = 0; w < 7; w++) { fac[w] = dc[w] ? dw[w] / dc[w] : 1; fsum += fac[w]; fc++; }
  for (var w2 = 0; w2 < 7; w2++) fac[w2] = 1 + ((fac[w2] / (fsum / fc)) - 1) * F.dowShrink;
  var out = [];
  for (var h = 1; h <= horizon; h++) {
    var key = lastKey + h, wd2 = ((key % 7) + 7) % 7;
    var mid = Math.max(0, (level + b * h) * fac[wd2]);
    var band = F.z * sd * Math.sqrt(1 + h / n);
    out.push({ key: key, mid: mid, lo: Math.max(0, mid - band), hi: mid + band });
  }
  return { points: out, level: level, slope: b, sd: sd };
}
FX.forecastSeries = forecast;

/* Everything a screen needs, for a scope (all plants or one plant). */
FX.metrics = function (plant) {
  var d = derive(), nowMs = d.nowMs, mi = monthInfo(nowMs), todayKey = dayKey(nowMs), t0 = dayStart(todayKey);
  var inScope = function (x) { return !plant || x === plant; };
  var calcs = d.calcs.filter(function (c) { return inScope(c.t.plant); });
  var tickets = d.tickets.filter(function (t) { return inScope(t.plant); });
  var open = tickets.filter(function (t) { return t.phase !== 'closed'; });
  var plants = (plant ? [plant] : RAW.plants);
  // Month to date = ledger (days before today) + today from the trips in cycle.
  var daily = {}, planD = {}, actD = {};
  plants.forEach(function (p) { var L = ledger(p); Object.keys(L).forEach(function (k) { daily[k] = (daily[k] || 0) + L[k].detH * rate(); planD[k] = (planD[k] || 0) + L[k].plan; actD[k] = (actD[k] || 0) + L[k].act; }); });
  var todayDet = detentionDaily(calcs, nowMs)[todayKey] || 0;
  daily[todayKey] = todayDet;
  var todayDIs = calcs.filter(function (c) { return c.t.start >= t0; });
  planD[todayKey] = todayDIs.length; actD[todayKey] = todayDIs.filter(function (c) { return c.t.stage !== 'AT PLANT'; }).length;
  var det = sum(Object.keys(daily), function (k) { return daily[k]; });
  var mtdTrips = sum(Object.keys(planD), function (k) { return planD[k]; }), dispatched = sum(Object.keys(actD), function (k) { return actD[k]; });
  var atRisk = sum(open, function (t) { return t.rs; });
  var budget = sum(plants, plantBudget);
  var lanes = { ai: 0, followup: 0, action: 0, verify: 0, approval: 0 };
  open.forEach(function (t) { if (t.phase === 'verify') lanes.verify++; else if (t.phase === 'approval') lanes.approval++; else lanes[t.lane]++; });
  var closed = tickets.filter(function (t) { return t.phase === 'closed'; });
  var closedEv = closed.filter(function (t) { return t.o && t.o.evidence && t.o.evidence.length; });
  // Trip-level reconciliation: a trip awaits action if any open ticket on it needs a person.
  var tripState = {};
  open.forEach(function (t) {
    var need = t.phase === 'approval' || (t.phase === 'open' && (t.lane === 'action' || t.lane === 'followup'));
    tripState[t.di] = tripState[t.di] === 'awaiting' || need ? 'awaiting' : 'monitored';
  });
  var tripsWithIssues = Object.keys(tripState).length;
  var tripsAwaiting = Object.keys(tripState).filter(function (k) { return tripState[k] === 'awaiting'; }).length;
  var epodOpen = open.filter(function (t) { return t.cat === 'ePOD Delay'; });
  var stageCounts = { Plant: calcs.filter(function (c) { return c.t.stage === 'AT PLANT' && c.overNormH > 0; }).length };
  ['In transit', 'Unloading', 'ePOD'].forEach(function (s) { stageCounts[s] = open.filter(function (t) { return t.stage === s; }).length; });
  var byType = {}; Object.keys(STATE.guardrails).forEach(function (k) { byType[k] = open.filter(function (t) { return t.cat === k; }).length; });
  var share = Math.max(mi.share, 1 / mi.dim);
  return {
    plant: plant || null, trips: calcs.length, mtdTrips: mtdTrips, dispatched: dispatched, planDaily: planD, actDaily: actD,
    det: det, atRisk: atRisk, budget: budget, burn: det / budget, pace: det / (budget * share), projBurn: (det + atRisk) / budget,
    open: open.length, lanes: lanes, closed: closed.length, closedEv: closedEv.length, raised: tickets.length,
    tripsWithIssues: tripsWithIssues, tripsAwaiting: tripsAwaiting, tripsMonitored: tripsWithIssues - tripsAwaiting,
    podAvgH: epodOpen.length ? sum(epodOpen, function (t) { return t.m; }) / epodOpen.length : null, podOpen: epodOpen.length,
    stageCounts: stageCounts, byType: byType, daily: daily, detHours: det / rate(), todayDet: todayDet, month: mi,
    atPlant: calcs.filter(function (c) { return c.t.stage === 'AT PLANT'; }),
    inTransit: calcs.filter(function (c) { return c.t.stage === 'IN TRANSIT'; }),
    atCustomer: calcs.filter(function (c) { return c.t.stage === 'AT CUSTOMER'; }),
    tickets: tickets, openTickets: open, calcs: calcs
  };
};

/* Plan vs actual dispatch per day: ledger before today, DIs raised today and those gone. */
FX.dispatchDaily = function (plant) { var M = FX.metrics(plant); return { plan: M.planDaily, actual: M.actDaily }; };

/* ---------------------------------------------------------------
   Events
   --------------------------------------------------------------- */
function addEvent(S, e) {
  e.id = 'EV-' + (S.events.length + 1) + '-' + S.clockMin;
  e.t = e.t != null ? e.t : S.clockMin;
  S.events.push(e);
  if (S.events.length > 3000) S.events = S.events.slice(-3000);
  return e;
}
FX.events = function (filter) { return STATE.events.filter(filter || function () { return true; }); };
FX.timeOf = function (clockMin) { return RAW.anchor + clockMin * 60000; };

/* ---------------------------------------------------------------
   Emails
   --------------------------------------------------------------- */
function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '').slice(0, 40); }
function partyFor(t) {
  if (t.cat === 'Customer Detention' || t.cat === 'Unloading Detection') return { kind: 'customer', name: t.dest, email: slug(t.dest) + '@sites.fleetx.io', person: 'Site in-charge' };
  return { kind: 'transporter', name: t.transporter, email: slug(t.transporter) + '@vendors.fleetx.io', person: 'Control room' };
}
function quote(prev) {
  if (!prev) return '';
  var who = prev.fromName ? prev.fromName + ' <' + prev.fromEmail + '>' : prev.fromEmail;
  var body = prev.messageText.split('\nOn ')[0];
  return '\n\nOn ' + fmtDT(Date.parse(prev.receivedAt)) + ', ' + who + ' wrote:\n' + body.split('\n').map(function (l) { return '> ' + l; }).join('\n');
}
function outboundText(t, kind, nowMs) {
  var c = t.calc, tr = t.trip, P = partyFor(t);
  var head = 'DI ' + tr.di + ' · Vehicle ' + tr.vehicle + ' · ' + plantShort(tr.plant) + ' to ' + tr.dest;
  if (t.cat === 'Customer Detention' || t.cat === 'Unloading Detection') {
    var siteH = t.calc && t.calc.siteH ? t.calc.siteH : (t.m && t.cat === 'Customer Detention' ? t.m : (t.m || 0) / 60);
    var detNow = chargeable(siteH) * rate();
    return { subject: 'Detention evidence notice · ' + tr.vehicle + ' at ' + tr.dest,
      body: 'Dear ' + P.person + ',\n\n' + head + '.\n\nOur tracking shows this vehicle at your site for ' + siteH.toFixed(1) + ' hours against the planned arrival of ' + fmtDT(c.arrival) + '. Free time is ' + CONFIG.cost.freeHours + ' hours; detention is charged at Rs ' + CONFIG.cost.ratePerDay.toLocaleString('en-IN') + ' per day, pro-rated hourly' + (detNow > 0 ? ', and Rs ' + Math.round(detNow).toLocaleString('en-IN') + ' has accrued so far' : '') + '.\n\nPlease reply with the time by which unloading will be completed so we can release the vehicle.\n\nRegards,\nFLEETX AI AGENT\nfor ' + CONFIG.customerName + ' Control Tower' };
  }
  if (t.cat === 'ePOD Delay') return { subject: 'ePOD required · DI ' + tr.di,
    body: 'Dear ' + P.person + ',\n\n' + head + '.\n\nThe signed POD for this delivery has not been received (' + t.mText + '). Please upload the stamped and signed copy or reply with a scan.\n\nRegards,\nFLEETX AI AGENT' };
  if (t.cat === 'Route Deviation') return { subject: 'Route deviation · ' + tr.vehicle,
    body: 'Dear ' + P.person + ',\n\n' + head + '.\n\nThe vehicle is off the approved route (' + t.mText + (t.mSub ? ', ' + t.mSub : '') + '). Please confirm the reason and when it will be back on the approved corridor.\n\nRegards,\nFLEETX AI AGENT' };
  return { subject: 'Delay notice · revised ETA requested · ' + tr.vehicle,
    body: 'Dear ' + P.person + ',\n\n' + head + '.\n\nThe vehicle is ' + t.mText + ' (planned arrival ' + fmtDT(c.arrival) + '). Please share the current position and a revised ETA.\n\nRegards,\nFLEETX AI AGENT' };
}
function replyFor(t, outcome, atMs) {
  var tr = t.trip, h = hash(t.id);
  var when = fmtTime(Math.ceil((atMs + (2 + h % 5) * HOUR) / (30 * 60000)) * 30 * 60000);
  var R = {
    customer: {
      commit: ['Noted. Bay is running full since morning, ' + tr.vehicle + ' ko next slot de rahe hain. Unloading ' + when + ' tak complete ho jayegi, will confirm.', 'Hi, we have checked with the yard. Vehicle will be unloaded by ' + when + ' today. Please ask driver to stay near bay.'],
      refusal: ['We cannot commit a time today. Stock is not cleared from the silo, kal subah dekhte hain.', 'Sorry, no unloading slot available today. Please do not raise detention, we will revert tomorrow.']
    },
    transporter: {
      eta: ['Driver se baat ho gayi hai. Revised ETA ' + when + ' hai, will keep you posted.', 'Noted. Vehicle is moving now, expected at site by ' + when + '.'],
      reason: ['Driver ko call kiya, he took the detour to avoid a jam. Wapas approved route pe aa raha hai.', 'Noted. Driver will rejoin the approved route within the hour, we have instructed him.'],
      doc: ['PFA the scanned POD for DI ' + tr.di + '. Original copy will be couriered.', 'Please find the signed POD attached. Sorry for the delay.'],
      refusal: ['We are not able to reach the driver right now. Will update once we get through.', 'Driver phone is not reachable. We will check and revert.']
    }
  };
  var P = partyFor(t), pick = function (a) { return a[h % a.length]; };
  var body = P.kind === 'customer' ? (outcome === 'refusal' ? pick(R.customer.refusal) : pick(R.customer.commit))
    : outcome === 'doc' ? pick(R.transporter.doc) : outcome === 'refusal' ? pick(R.transporter.refusal) : t.cat === 'Route Deviation' ? pick(R.transporter.reason) : pick(R.transporter.eta);
  var note = outcome === 'commit' ? 'Reply read · commitment captured: unloading by ' + when
    : outcome === 'eta' ? (t.cat === 'Route Deviation' ? 'Reply read · reason captured, return to route committed' : 'Reply read · ETA given: ' + when)
    : outcome === 'doc' ? 'Reply read · document attached: POD_' + tr.di + '.pdf'
    : 'Reply read · refusal, handed back to the Control Tower';
  return { body: body + '\n\nRegards,\n' + P.person + ', ' + P.name, note: note, intent: outcome === 'refusal' ? 'NOT_RESOLVED' : outcome === 'doc' ? 'DOCUMENT_ATTACHED' : outcome === 'commit' ? 'COMMITMENT' : 'ETA_GIVEN', when: when,
    attachment: outcome === 'doc' ? 'POD_' + tr.di + '.pdf' : null };
}
function replyOutcome(t) {
  var h = hash(t.id + '|reply') % 20;
  if (t.cat === 'ePOD Delay') return h < 13 ? 'doc' : h < 16 ? 'refusal' : 'none';
  if (t.cat === 'Customer Detention' || t.cat === 'Unloading Detection') return h < 12 ? 'commit' : h < 16 ? 'refusal' : 'none';
  return h < 13 ? 'eta' : h < 16 ? 'refusal' : 'none';
}
function sendEmail(S, t, nowClock, opts) {
  opts = opts || {};
  var nowMs = RAW.anchor + nowClock * 60000, P = partyFor(t), o = outboundText(t, null, nowMs);
  var thread = S.emails[t.id] = S.emails[t.id] || [];
  var prev = thread[thread.length - 1];
  var msg = { id: t.id + '-M' + (thread.length + 1), issueId: t.di, fromName: CONFIG.agentEmail.name, fromEmail: CONFIG.agentEmail.address,
    toEmails: P.name + ' <' + P.email + '>', subject: prev ? 'Re: ' + thread[0].subject : o.subject, messageText: o.body + quote(prev),
    receivedAt: isoIST(nowMs), detectedIntent: null, statusUpdated: true, actionNote: opts.note || 'Sent by agent · ' + (opts.why || 'awaiting reply') };
  thread.push(msg);
  var outcome = opts.outcome || replyOutcome(t);
  var rm = CONFIG.verifyAfterMin.replyMin, delay = rm[0] + hash(t.id + '|d') % (rm[1] - rm[0] + 1);
  if (outcome !== 'none') (S.pendingReplies = S.pendingReplies || []).push({ ticket: t.id, at: nowClock + delay, outcome: outcome });
  addEvent(S, { t: nowClock, kind: 'email', actorType: 'AI agent', actor: CONFIG.agentEmail.name, ticket: t.id, di: t.di, text: 'Emailed ' + P.name + ': ' + msg.subject });
  return msg;
}
function deliverReply(S, t, outcome, atClock) {
  var atMs = RAW.anchor + atClock * 60000, P = partyFor(t);
  var thread = S.emails[t.id] = S.emails[t.id] || [];
  var prev = thread[thread.length - 1];
  var r = replyFor(t, outcome, atMs);
  thread.push({ id: t.id + '-M' + (thread.length + 1), issueId: t.di, fromName: P.person + ', ' + P.name, fromEmail: P.email, toEmails: CONFIG.agentEmail.address,
    subject: 'Re: ' + (thread[0] ? thread[0].subject.replace(/^Re: /, '') : ''), messageText: r.body + quote(prev), receivedAt: isoIST(atMs),
    detectedIntent: r.intent, statusUpdated: outcome !== 'refusal', actionNote: r.note, attachment: r.attachment });
  addEvent(S, { t: atClock, kind: 'reply', actorType: 'Stakeholder', actor: P.name, ticket: t.id, di: t.di, text: r.note });
  return r;
}
FX.thread = function (caseId) {
  var th = STATE && STATE.emails[caseId];
  if (!th || !th.length) return null;
  return th.map(function (m) { return Object.assign({}, m); });
};

/* ---------------------------------------------------------------
   Verification
   --------------------------------------------------------------- */
function criteriaFor(t, via, clock, reason) {
  var off = CONFIG.verifyAfterMin, cat = t.cat, spread = hash(t.id + 'g') % (off.gpsSpread + 1);
  var c = [];
  var said = t.tx && !t.tx.noAnswer;
  if (cat === 'Customer Detention' || cat === 'Unloading Detection') {
    c.push({ k: 'commit', label: 'Unloading commitment from site', met: false });
    c.push({ k: 'gps', label: 'GPS exit from the customer geofence', due: clock + off.gps[cat] + spread, met: false });
  } else if (cat === 'In-transit Delay') {
    c.push({ k: 'commit', label: 'Revised ETA captured', met: false });
    c.push({ k: 'eta', label: 'Site and sales told the revised ETA', met: !!(STATE.etaSent[t.id]) });
    c.push({ k: 'gps', label: 'GPS movement on the planned corridor', due: clock + off.gps[cat] + spread, met: false });
  } else if (cat === 'Route Deviation') {
    c.push({ k: 'commit', label: 'Deviation reason captured', met: false });
    if (t.tx && t.tx.etaChange) c.push({ k: 'eta', label: 'Site and sales told the revised ETA', met: !!(STATE.etaSent[t.id]) });
    c.push({ k: 'gps', label: 'Back on approved corridor for 15 min', due: clock + off.gps[cat] + Math.round(spread / 6), met: false });
  } else {
    c.push({ k: 'doc', label: 'ePOD document received', met: false });
    c.push({ k: 'match', label: 'ePOD fields matched to the DI', met: false });
  }
  // Evidence already in hand.
  if (said && (t.tx.commit || cat === 'Route Deviation')) { c[0].met = true; c[0].metAt = clock; c[0].note = 'From the agent call: ' + (t.tx.commit ? t.tx.commit : 'reason stated'); }
  if (via === 'manual' || via === 'call') { if (c[0].k !== 'doc') { c[0].met = true; c[0].metAt = clock; c[0].note = via === 'manual' ? 'Reason recorded: ' + reason : 'Call logged as answered'; } }
  if (via === 'manual' && c[0].k === 'doc') { c[0].met = true; c[0].metAt = clock; c[0].note = 'Recorded by user: ' + reason; c[1].due = clock + off.podMatch; }
  c.forEach(function (x) { if (x.k === 'eta' && x.met) { x.metAt = clock; x.note = 'Sent at ' + fmtTime(RAW.anchor + STATE.etaSent[t.id].at * 60000); } });
  return c;
}
/* Agent call on a ticket: kept in the store, logged as an event and, when the ticket is open in the drawer, in its audit trail. */
function recordCall(S, t, lib, at, eta) {
  if (!LIB[lib]) return;
  (S.calls[t.id] = S.calls[t.id] || []).push(eta ? { lib: lib, at: at, eta: eta } : { lib: lib, at: at });
  var tx = txFor(t.trip || t, lib, eta), L = LIB[lib];
  addEvent(S, { t: at, kind: 'call', actorType: 'AI agent', actor: 'AI calling agent', ticket: t.id, di: t.di, text: 'Called ' + tx.party + ' in Hindi · ' + L.outcome, lib: lib, eta: eta || null, cat: t.cat });
  appendAudit(S, t.id, { actor: 'AI calling agent', actorType: 'AI agent', action: 'Called ' + tx.party + ' in Hindi · ' + L.outcome, transcript: tx }, at);
}
function appendAudit(S, id, entry, at) {
  var cs = S.ct.cases, i = cs.findIndex(function (c) { return c.id === id; });
  if (i < 0) return;
  var c = Object.assign({}, cs[i]);
  c.auditTrail = c.auditTrail.concat([Object.assign({ id: 'AU-' + id + '-C' + (c.auditTrail.length + 1), time: fmtTime(RAW.anchor + at * 60000), tripId: c.tripIds[0] || null }, entry)]);
  var next = cs.slice(); next[i] = c;
  S.ct = Object.assign({}, S.ct, { rev: (S.ct.rev || 0) + 1, cases: next });
}
/* Revised ETA: the agent tells the unloading site and the sales officer, by email and by call. */
function etaUpdate(S, t, eta, at) {
  if (S.etaSent[t.id]) return;
  S.etaSent[t.id] = { at: at, eta: eta };
  var tr = t.trip || t, siteEmail = slug(tr.dest) + '@sites.fleetx.io', salesEmail = 'sales.' + slug(tr.depot || tr.dest) + '@ultratech-sales.fleetx.io';
  var thread = S.emails[t.id] = S.emails[t.id] || [], prev = thread[thread.length - 1], atMs = RAW.anchor + at * 60000;
  thread.push({ id: t.id + '-M' + (thread.length + 1), issueId: tr.di, fromName: CONFIG.agentEmail.name, fromEmail: CONFIG.agentEmail.address,
    toEmails: 'Site in-charge, ' + tr.dest + ' <' + siteEmail + '>; Sales officer, ' + (tr.depot || tr.dest) + ' <' + salesEmail + '>',
    subject: prev ? 'Re: ' + thread[0].subject.replace(/^Re: /, '') : 'Revised arrival · ' + tr.vehicle + ' to ' + tr.dest,
    messageText: 'Dear Site in-charge and Sales officer,\n\nDI ' + tr.di + ' · Vehicle ' + tr.vehicle + ' · ' + plantShort(tr.plant) + ' to ' + tr.dest + '.\n\nThe arrival time has changed. Driver / transporter update: ' + eta + '. Please plan the unloading bay and keep the customer informed.\n\nRegards,\nFLEETX AI AGENT' + quote(prev),
    receivedAt: isoIST(atMs), detectedIntent: null, statusUpdated: true, actionNote: 'Revised ETA sent to site and sales' });
  addEvent(S, { t: at, kind: 'eta', actorType: 'AI agent', actor: CONFIG.agentEmail.name, ticket: t.id, di: tr.di, text: 'Revised ETA (' + eta + ') emailed to the site in-charge and sales officer, ' + tr.dest });
  appendAudit(S, t.id, { actor: CONFIG.agentEmail.name, actorType: 'AI agent', action: 'Revised ETA (' + eta + ') emailed to site in-charge and sales officer' }, at);
  recordCall(S, t, 'eta1', at + 2, eta);
  recordCall(S, t, 'eta2', at + 4, eta);
  var o = S.tk[t.id];
  if (o && o.criteria) o.criteria.forEach(function (x) { if (x.k === 'eta' && !x.met) { x.met = true; x.metAt = at; x.note = 'Sent at ' + fmtTime(atMs); } });
  syncCase(S, t.id, { escalated: true }, null);
}
FX.etaSent = function (id) { return STATE.etaSent[id] || null; };
function startVerify(S, t, via, actor, reason) {
  var cur = S.tk[t.id];
  if (cur && (cur.phase === 'verify' || cur.phase === 'closed')) return false;
  S.tk[t.id] = { phase: 'verify', since: S.clockMin, via: via, actor: actor, reason: reason || null, criteria: criteriaFor(t, via, S.clockMin, reason), lane: cur && cur.lane };
  addEvent(S, { kind: 'verify', actorType: via === 'manual' || via === 'call' ? 'Human' : 'System', actor: actor, ticket: t.id, di: t.di,
    text: 'Moved to verification after ' + (via === 'manual' ? 'manual update' + (reason ? ' · ' + reason : '') : via === 'call' ? 'a logged call' : via === 'approval' ? 'approved agent action' : reason === 'Agent call' ? 'agent call' : 'agent email') });
  var cr = S.tk[t.id].criteria;
  if (cr[0].met && cr.some(function (x) { return x.k === 'eta' && !x.met; })) etaUpdate(S, t, (t.tx && t.tx.commit) || 'revised time recorded by the control tower', S.clockMin + 1);
  var vp = { status: 'Awaiting verification' }; if (S.emails[t.id]) vp.escalated = true;
  syncCase(S, t.id, vp, 'Verification started · ' + S.tk[t.id].criteria.map(function (c) { return c.label; }).join(', '));
  return true;
}
function closeTicket(S, t) {
  var o = S.tk[t.id];
  o.phase = 'closed'; o.closedAt = S.clockMin;
  o.evidence = o.criteria.map(function (c) { return c.label + (c.note ? ' — ' + c.note : ''); });
  if (t.cat === 'Customer Detention' || t.cat === 'Unloading Detection' || t.cat === 'In-transit Delay') S.released[t.di] = S.clockMin;
  addEvent(S, { kind: 'close', actorType: o.via === 'manual' || o.via === 'call' ? 'Human' : 'AI agent', actor: o.via === 'manual' || o.via === 'call' ? o.actor : 'Verification agent', ticket: t.id, di: t.di,
    text: 'Closed on evidence: ' + o.criteria.map(function (c) { return c.label; }).join(' · ') });
  syncCase(S, t.id, { status: 'Closed', closedAt: fmtTime(RAW.anchor + S.clockMin * 60000), nextAction: 'Closed on evidence' }, 'Closed on evidence: ' + o.evidence.join(' · '));
}
function reopenToLane(S, t, note) {
  var o = S.tk[t.id];
  S.tk[t.id] = { phase: 'open', lane: 'action', note: note, history: (o && o.history || []).concat([note]) };
  addEvent(S, { kind: 'handback', actorType: 'AI agent', actor: 'Verification agent', ticket: t.id, di: t.di, text: note });
  syncCase(S, t.id, { status: 'Action in progress', nextAction: note }, note);
}
/* Keep the application ticket (drawer) in step with the store. */
function syncCase(S, id, patch, auditText) {
  var cs = S.ct.cases, i = cs.findIndex(function (c) { return c.id === id; });
  if (i < 0) return;
  var c = Object.assign({}, cs[i], patch);
  Object.keys(patch).forEach(function (k) { if (patch[k] === undefined) delete c[k]; });
  if (auditText) c.auditTrail = c.auditTrail.concat([{ id: 'AU-' + id + '-FX' + (c.auditTrail.length + 1), time: fmtTime(RAW.anchor + S.clockMin * 60000), actor: patch.status === 'Closed' ? 'Verification agent' : 'Control Tower', actorType: 'System', tripId: c.tripIds[0] || null, action: auditText }]);
  var next = cs.slice(); next[i] = c;
  S.ct = Object.assign({}, S.ct, { rev: (S.ct.rev || 0) + 1, cases: next });
}

/* ---------------------------------------------------------------
   Materialise a derived ticket so the application drawer can open it
   --------------------------------------------------------------- */
function materialize(S, t) {
  if (S.ct.cases.some(function (c) { return c.id === t.id; })) return;
  var tr = t.trip, c = t.calc;
  var stageIdx = { 'AT PLANT': 1, 'IN TRANSIT': 2, 'AT CUSTOMER': 3 }[tr.stage] || 2;
  var isRd = t.cat === 'Route Deviation';
  var detected = isRd ? FX.now() - t.slaH * HOUR : c.arrival + S.guardrails[t.cat === 'Customer Detention' ? 'Customer Detention' : 'In-transit Delay'].trigger * HOUR;
  var raw = {
    id: t.id, category: t.cat, subReason: t.sub, lane: t.lane === 'ai' ? 'followup' : t.lane,
    metric: isRd ? { kind: 'route', km: t.rdKm } : { kind: 'detention', hours: Math.round(t.m) },
    stats: statsFor(tr, isRd ? t.rdKm : 0),
    vehicleTags: [tr.segment, tr.product].filter(Boolean), reportedOn: fmtDT(detected) + ' IST', journeyStage: stageIdx,
    description: isRd ? 'Vehicle left the approved corridor to ' + tr.dest + ': ' + t.rdKm + ' km extra over ' + t.rdTrav + ' km travelled (' + Math.round(t.m) + '%).' : t.cat === 'Customer Detention'
      ? 'Vehicle has been at ' + tr.dest + ' for ' + c.siteH.toFixed(1) + ' hours since the planned arrival at ' + fmtDT(c.arrival) + '. Free time is ' + CONFIG.cost.freeHours + ' hours.'
      : 'Vehicle is ' + c.lateH.toFixed(1) + ' hours behind the planned arrival of ' + fmtDT(c.arrival) + ' for a lead of ' + tr.km + ' km.',
    assigneePhone: '', driverPhone: tr.mobile ? '+91 ' + tr.mobile : '', transporterPhone: '', customer: tr.dest, customerPhone: '',
    jobName: tr.di, origin: tr.plant, destination: tr.dest, vehicleNumber: tr.vehicle, vehicleId: '', transporter: tr.transporter, transporterId: '', driver: tr.driver,
    severity: t.prio === 'red' ? 'Critical' : t.prio === 'amber' ? 'High' : 'Medium', site: tr.dest, tripIds: [tr.di], owner: CONFIG.users[2].name,
    playbook: t.cat === 'Customer Detention' ? 'CASE-DETENTION' : 'CASE-ROUTE', detectedAt: fmtTime(detected), due: '', nextAction: t.lane === 'action' ? 'Needs a person' : 'Agent working',
    evidence: [t.mText]
  };
  var cs = I.makeCase(raw);
  (S.calls[t.id] || []).forEach(function (cl, i) {
    var tx = txFor(tr, cl.lib, cl.eta);
    cs.auditTrail.push({ id: 'AU-' + t.id + '-CALL' + i, time: fmtTime(RAW.anchor + cl.at * 60000), actor: 'AI calling agent', actorType: 'AI agent', tripId: tr.di, action: 'Called ' + tx.party + ' in Hindi · ' + LIB[cl.lib].outcome, transcript: tx });
  });
  if (S.etaSent[t.id]) cs.auditTrail.push({ id: 'AU-' + t.id + '-ETA', time: fmtTime(RAW.anchor + S.etaSent[t.id].at * 60000), actor: CONFIG.agentEmail.name, actorType: 'AI agent', tripId: tr.di, action: 'Revised ETA (' + S.etaSent[t.id].eta + ') emailed to site in-charge and sales officer' });
  cs.auditTrail.sort(function (a, b) { return a.time.localeCompare(b.time); });
  S.ct = Object.assign({}, S.ct, { rev: (S.ct.rev || 0) + 1, cases: S.ct.cases.concat([cs]) });
}

/* ---------------------------------------------------------------
   Seed: email threads that already exist for follow-up tickets
   --------------------------------------------------------------- */
function seedHistory() {
  var d = derive();
  var base = -95;
  (STATE.ct.cases || []).forEach(function (c, i) {
    if (c.lane !== 'followup' && !c.escalated) return;
    var t = d.all.find(function (x) { return x.id === c.id; });
    if (!t) return;
    var sent = base + (i * 7) % 40;
    sendEmail(STATE, t, sent, { outcome: 'none', why: 'follow-up threshold crossed' });
    // A reply that restates only what the contact said on the call.
    if (t.tx && !t.tx.noAnswer) {
      var thread = STATE.emails[t.id], prev = thread[thread.length - 1], P = partyFor(t);
      var atMs = RAW.anchor + (sent + 9) * 60000;
      thread.push({ id: t.id + '-M' + (thread.length + 1), issueId: t.di, fromName: P.person + ', ' + P.name, fromEmail: P.email, toEmails: CONFIG.agentEmail.address,
        subject: 'Re: ' + thread[0].subject, messageText: 'As discussed on call: ' + t.tx.said.join(' ') + '\n\nRegards,\n' + P.person + quote(prev), receivedAt: isoIST(atMs),
        detectedIntent: t.tx.commit ? 'COMMITMENT' : 'OTHER', statusUpdated: !!t.tx.commit, actionNote: t.tx.commit ? 'Reply read · commitment captured: ' + t.tx.commit : 'Reply read · reason captured, no commitment yet' });
      addEvent(STATE, { t: sent + 9, kind: 'reply', actorType: 'Stakeholder', actor: P.name, ticket: t.id, di: t.di, text: t.tx.commit ? 'Reply read · commitment captured: ' + t.tx.commit : 'Reply read · reason captured' });
    }
    syncCase(STATE, c.id, { escalated: true }, null);
  });
  // Agent call records already on the tickets.
  (STATE.ct.cases || []).forEach(function (c) {
    if (c.lane === undefined) return;
    var a = c.auditTrail.find(function (x) { return x.transcript; });
    if (!a) return;
    var tx = readTranscript(a.transcript), at = -120 + (hash(c.id) % 60);
    addEvent(STATE, { t: at, kind: 'call', actorType: 'AI agent', actor: 'AI calling agent', ticket: c.id, di: c.tripIds[0], text: 'Called ' + a.transcript.party + ' in Hindi · ' + tx.outcome, caseId: c.id, lib: a.transcript.lib || a.transcript.audio, cat: c.category });
    var t = d.all.find(function (x) { return x.id === c.id; });
    if (t && tx.etaChange) etaUpdate(STATE, t, tx.commit, at + 4);
    var g = STATE.guardrails[c.category];
    if (t && g && !t.escTag.length && (tx.result === 'eta' || tx.result === 'commit') && (g.escalation == null || t.m < g.escalation)) {
      DER = null; var t3 = derive().all.find(function (x) { return x.id === c.id; });
      if (t3 && t3.phase === 'open' && startVerify(STATE, t3, 'agent', 'AI calling agent', 'Agent call') !== false) STATE.tk[c.id].since = at + 2;
    }
  });
  // Calls the agents have already made on tickets raised from trip timings: every ticket that has
  // reached a person, and part of those the agents are still working.
  d.tickets.forEach(function (t) {
    if (t.src !== 'derived' || t.phase !== 'open') return;
    var h = hash(t.id + 'seed') % 100;
    if (t.lane === 'ai' && h >= 45) return;
    // Past follow-up, about half the calls still get a usable commitment; the rest stay with a person.
    var pl = t.lane === 'followup' ? (hash(t.id + 'fu') % 100 < 72 ? 'action' : 'ai') : t.lane;
    var lib = pickLib(t.cat, null, pl, t.id), at = -Math.round(clamp(t.slaH * 60 * 0.5, 8, 600) + hash(t.id + 'off') % 40);
    if (!lib) return;
    recordCall(STATE, t, lib, at);
    var L = LIB[lib];
    if (L.etaChange) etaUpdate(STATE, t, L.commit, at + 4);
    // A usable commitment goes to verification with the agent; only past the escalation threshold does it stay with a person.
    if (t.lane !== 'action' && (L.result === 'commit' || L.result === 'eta')) {
      DER = null; var t2 = derive().all.find(function (x) { return x.id === t.id; });
      startVerify(STATE, t2, 'agent', 'AI calling agent', 'Agent call');
      var o = STATE.tk[t.id], dl = at + 2 - STATE.clockMin; o.since = at + 2;
      (o.criteria || []).forEach(function (x) { if (x.metAt != null) x.metAt += dl; });
      for (var ei = STATE.events.length - 1; ei >= 0; ei--) { var ev = STATE.events[ei]; if (ev.ticket === t.id && ev.kind === 'verify') { ev.t = at + 2; break; } }
      // Older commitments that GPS has since confirmed are already closed on evidence.
      var ct = at + 45 + hash(t.id + 'ct') % 75;
      if (ct < -10 && hash(t.id + 'cl') % 100 < 60) {
        var keep = STATE.clockMin; STATE.clockMin = ct;
        o.criteria.forEach(function (x) { if (!x.met) { x.met = true; x.metAt = ct; x.note = x.k === 'gps' ? 'Signal confirmed at ' + fmtTime(RAW.anchor + ct * 60000) : x.note; } });
        closeTicket(STATE, t2);
        STATE.clockMin = keep;
      }
    }
  });
}

/* ---------------------------------------------------------------
   Writes coming from the application (drawer, call, close modal)
   --------------------------------------------------------------- */
FX.getCT = function () { return STATE.ct; };
FX.setCT = function (next) {
  var prev = STATE.ct;
  if (next === prev) return;
  var toast = null;
  commit(function (S) {
    var prevMap = {}; (prev.cases || []).forEach(function (c) { prevMap[c.id] = c; });
    var cases = next.cases.slice(), changed = false;
    S.ct = next;
    cases.forEach(function (c, i) {
      var p = prevMap[c.id]; if (!p) return;
      var added = c.auditTrail.slice(p.auditTrail.length);
      var t = derive().all.find(function (x) { return x.id === c.id; });
      var logAdded = function () { added.forEach(function (a) { addEvent(S, { kind: 'human', actorType: a.actorType || 'Human', actor: a.actor, ticket: c.id, di: c.tripIds[0], text: a.action }); }); };
      if (!t) { logAdded(); return; }
      // Closing from the application: only with a valid reason, and only through verification.
      if (c.status === 'Closed' && p.status !== 'Closed' && !(S.tk[c.id] && S.tk[c.id].phase === 'closed')) {
        var last = added.map(function (a) { return a.action; }).join(' | ');
        var m = last.match(/Reason: ([^·|]+)/);
        var reason = m ? m[1].trim() : null;
        if (reason && CONFIG.validCloseReasons.indexOf(reason) >= 0) {
          cases[i] = Object.assign({}, c, { status: 'Awaiting verification', closedAt: null }); changed = true;
          S.ct = Object.assign({}, S.ct, { cases: cases });
          logAdded(); added = [];
          startVerify(S, t, 'manual', CONFIG.users[2].name, reason);
          cases = S.ct.cases.slice();
          toast = 'Closure reason accepted · verifying before the ticket closes';
        } else {
          added = added.map(function (a) { return /^Set the issue to Closed|^Closed the issue/.test(a.action) ? Object.assign({}, a, { action: 'Closure rejected · ' + (reason ? reason + ' is not a closure outcome' : 'no reason selected') }) : a; });
          cases[i] = Object.assign({}, c, { status: p.status, closedAt: p.closedAt, issueStatus: p.issueStatus, auditTrail: p.auditTrail.concat(added) }); changed = true;
          toast = (reason ? '"' + reason + '" is not a closure outcome' : 'Select a closure reason') + ' · the ticket stays open';
        }
        logAdded();
        return;
      }
      logAdded();
      if (c.status === 'Awaiting verification' && p.status !== 'Awaiting verification' && !(S.tk[c.id] && S.tk[c.id].phase !== 'open')) {
        var mm = added.map(function (a) { return a.action; }).join(' | ').match(/Reason: ([^·|]+)/);
        S.ct = Object.assign({}, S.ct, { cases: cases });
        startVerify(S, t, 'manual', CONFIG.users[2].name, mm ? mm[1].trim() : 'Marked resolved');
        cases = S.ct.cases.slice();
        return;
      }
      if (added.some(function (a) { return /^Called .* · answered/i.test(a.action); })) {
        S.ct = Object.assign({}, S.ct, { cases: cases });
        startVerify(S, t, 'call', CONFIG.users[2].name, 'Call answered');
        cases = S.ct.cases.slice();
      }
    });
    if (changed) S.ct = Object.assign({}, S.ct, { cases: cases });
  });
  if (toast && window.__FXBridge) setTimeout(function () { window.__FXBridge.toast(toast); }, 0);
};

/* Open a ticket in the application drawer (materialising it first when needed). */
FX.openTicket = function (id, tab) {
  var t = FX.ticket(id); if (!t) return;
  if (!STATE.ct.cases.some(function (c) { return c.id === id; })) commit(function (S) { materialize(S, t); });
  if (window.__FXBridge) window.__FXBridge.open(id, tab);
};
FX.ticketAction = function (id, kind) {
  var t = FX.ticket(id); if (!t) return;
  if (!STATE.ct.cases.some(function (c) { return c.id === id; })) commit(function (S) { materialize(S, t); });
  if (window.__FXBridge) setTimeout(function () { window.__FXBridge.action(kind, id); }, 0);
};

/* ---------------------------------------------------------------
   Decision cards and approvals
   --------------------------------------------------------------- */
function days(n) { return n + (n === 1 ? ' day' : ' days'); }
FX.days = days;
/* ---------------------------------------------------------------
   Approvals: requests raised by the control tower and decisions the
   tower proposes, routed by CONFIG.approvalTypes to the Plant Head or
   the Logistics Head.
   --------------------------------------------------------------- */
var TYPES = CONFIG.approvalTypes;
function approverOf(type) { return TYPES[type].to === 'plant' ? CONFIG.users[1] : CONFIG.users[0]; }
FX.approverOf = function (type) { var u = approverOf(type); return u.name + ', ' + u.title; };
FX.approvalTypesFor = function (cat) {
  return Object.keys(TYPES).filter(function (k) { return TYPES[k].cats.indexOf(cat) >= 0; }).map(function (k) { return { key: k, label: TYPES[k].label, to: TYPES[k].to, group: TYPES[k].group, approver: FX.approverOf(k) }; });
};
FX.requestApproval = function (ticketId, type, note, actor) {
  var id = null;
  commit(function (S) {
    var t = derive().all.find(function (x) { return x.id === ticketId; }); if (!t || !TYPES[type]) return;
    materialize(S, t);
    id = 'AP-' + (S.requests.length + 1001);
    var req = { id: id, key: 'ct|' + id, type: type, to: TYPES[type].to, plant: t.plant, tickets: [t.id], source: 'ct', scope: type === 'penalty' ? t.transporter : t.dest,
      title: TYPES[type].label + ' · ' + t.vehicle, rs: (t.acc || 0) + t.rs, why: note || (t.cat + ' · ' + t.mText + (t.tx ? ' · ' + t.tx.outcome : '')),
      raisedBy: actor || CONFIG.users[2].name, raisedRole: CONFIG.users[2].title, at: S.clockMin, status: 'pending' };
    S.requests.push(req);
    S.tk[t.id] = Object.assign({}, S.tk[t.id] || {}, { phase: 'approval', since: S.clockMin, request: id, lane: t.lane });
    addEvent(S, { kind: 'approval-req', actorType: 'Human', actor: req.raisedBy, ticket: t.id, di: t.di, text: 'Sent for approval to ' + FX.approverOf(type) + ': ' + TYPES[type].label });
    syncCase(S, t.id, { nextAction: 'Awaiting approval from ' + FX.approverOf(type) }, 'Sent for approval to ' + FX.approverOf(type) + ': ' + TYPES[type].label + (note ? ' · ' + note : ''));
  });
  return id;
};
/* Decisions the tower proposes from the live position. */
function proposals() {
  var d = derive(), R = CONFIG.approvalRules, out = [], open = d.tickets.filter(function (t) { return t.phase === 'open'; });
  var calcs = d.calcs;
  // Logistics Head: detention claim on the customer holding the most chargeable detention.
  var byDest = {};
  var riskBy = {}; open.forEach(function (t) { if (t.cat === 'Customer Detention') riskBy[t.dest] = (riskBy[t.dest] || 0) + t.rs; });
  calcs.forEach(function (c) { if (c.t.stage === 'AT CUSTOMER' && c.siteH > CONFIG.cost.freeHours) { var k = c.t.dest; byDest[k] = byDest[k] || { det: 0, n: 0, plants: {} }; byDest[k].det += c.det; byDest[k].n++; byDest[k].plants[c.t.plant] = 1; } });
  Object.keys(byDest).forEach(function (k) { byDest[k].det += riskBy[k] || 0; });
  Object.keys(byDest).filter(function (k) { return byDest[k].n >= R.claimMinTrucks && byDest[k].det >= R.claimMin; }).sort(function (a, b) { return byDest[b].det - byDest[a].det; }).slice(0, 2).forEach(function (k) {
    var x = byDest[k], tk = open.filter(function (t) { return t.dest === k && t.cat === 'Customer Detention'; });
    out.push({ key: 'claim|' + k, type: 'claim', to: 'clo', plant: Object.keys(x.plants)[0], scope: k, tickets: tk.map(function (t) { return t.id; }).slice(0, 15), rs: x.det,
      title: 'Raise a detention claim of ' + inrS(x.det) + ' on ' + k, why: x.n + ' trucks past the ' + CONFIG.cost.freeHours + ' h free time at this customer; ' + inrS(x.det) + ' accrued and expected on the trucks still there, at ₹' + CONFIG.cost.ratePerDay.toLocaleString('en-IN') + ' a truck-day.',
      action: 'Debit-note intimation to the customer and the regional sales head; tracked against the next invoice.', source: 'tower' });
  });
  // Logistics Head: performance notice to the transporter with the most open road exceptions.
  var byTr = by(open.filter(function (t) { return t.cat === 'In-transit Delay' || t.cat === 'Route Deviation'; }), function (t) { return t.transporter; });
  Object.keys(byTr).filter(function (k) { return byTr[k].length >= R.penaltyMinOpen; }).sort(function (a, b) { return byTr[b].length - byTr[a].length; }).slice(0, 1).forEach(function (k) {
    var list = byTr[k], late = sum(list, function (t) { return t.calc && t.calc.lateH > 0 ? t.calc.lateH : 0; });
    out.push({ key: 'penalty|' + k, type: 'penalty', to: 'clo', plant: list[0].plant, scope: k, tickets: list.map(function (t) { return t.id; }).slice(0, 15), rs: 0,
      title: 'Performance notice to ' + k + ' and 10% cut in next week’s allocation', why: list.length + ' open delay and route exceptions on this transporter, ' + Math.round(late) + ' truck-hours behind plan.',
      action: 'Formal notice by email; allocation share reduced for the next dispatch cycle.', source: 'tower' });
  });
  // Logistics Head: budget extension for plants running over pace.
  RAW.plants.forEach(function (p) {
    var M = FX.metrics(p); if (M.pace < 1) return;
    var over = Math.max(CONFIG.budget.roundTo, Math.round((M.det / Math.max(0.05, M.month.share) - M.budget) / CONFIG.budget.roundTo) * CONFIG.budget.roundTo);
    out.push({ key: 'budget|' + p + '|' + M.month.startDay, type: 'budget', to: 'clo', plant: p, scope: p, tickets: [], rs: over,
      title: 'Extend ' + plantShort(p) + ' detention budget by ' + inrS(over) + ' this month', why: plantShort(p) + ' has used ' + Math.round(M.burn * 100) + '% of its budget with ' + Math.round(M.month.share * 100) + '% of the month gone; at this pace it ends ' + inrS(over) + ' over.',
      action: 'Budget raised for this month; plant head asked for a recovery plan.', source: 'tower' });
  });
  // Logistics Head: escalate a key or trade account to the sales head.
  var keyAcc = {};
  calcs.forEach(function (c) { if (c.t.stage === 'AT CUSTOMER' && c.siteH > STATE.guardrails['Customer Detention'].followUp && /KEY|TRADE/.test(c.t.segment)) { (keyAcc[c.t.dest] = keyAcc[c.t.dest] || []).push(c); } });
  Object.keys(keyAcc).filter(function (k) { return keyAcc[k].length >= R.salesEscMinTrucks; }).sort(function (a, b) { return keyAcc[b].length - keyAcc[a].length; }).slice(0, 1).forEach(function (k) {
    var tk = open.filter(function (t) { return t.dest === k && (t.cat === 'Customer Detention' || t.cat === 'Unloading Detection'); });
    out.push({ key: 'sales-esc|' + k, type: 'sales-esc', to: 'clo', plant: keyAcc[k][0].t.plant, scope: k, tickets: tk.map(function (t) { return t.id; }).slice(0, 10), rs: sum(tk, function (t) { return t.rs; }),
      title: 'Escalate ' + k + ' to the regional sales head', why: keyAcc[k].length + ' trucks held over ' + STATE.guardrails['Customer Detention'].followUp + ' h at a ' + keyAcc[k][0].t.segment.toLowerCase() + ' account; site calls have not cleared them.',
      action: 'Sales head asked to secure unloading slots; agents verify each release.', source: 'tower' });
  });
  // Plant Head: hold dispatch to a customer that cannot unload.
  RAW.plants.forEach(function (p) {
    var g = {};
    calcs.forEach(function (c) { if (c.t.plant === p && c.t.stage === 'AT CUSTOMER' && c.siteH > CONFIG.cost.freeHours) g[c.t.dest] = (g[c.t.dest] || 0) + 1; });
    Object.keys(g).filter(function (k) { return g[k] >= R.holdMinTrucks; }).sort(function (a, b) { return g[b] - g[a]; }).slice(0, 1).forEach(function (k) {
      var queued = calcs.filter(function (c) { return c.t.plant === p && c.t.stage === 'AT PLANT' && c.t.dest === k; }).length;
      out.push({ key: 'hold-dispatch|' + p + '|' + k, type: 'hold-dispatch', to: 'plant', plant: p, scope: k, tickets: [], rs: 0,
        title: 'Hold dispatch to ' + k + ' until unloading resumes', why: g[k] + ' trucks already past free time there; ' + queued + ' more DIs for this customer at the plant.',
        action: 'DIs for this customer held at the gate; sales officer informed; released when the site clears.', source: 'tower' });
    });
  });
  // Plant Head: replacement truck where the transporter reports a breakdown.
  open.filter(function (t) { return t.cat === 'In-transit Delay' && t.tx && (t.tx.audio === 'td4' || (t.tx.tags || []).join(' ').indexOf('Breakdown') >= 0); }).slice(0, 3).forEach(function (t) {
    out.push({ key: 'replacement|' + t.id, type: 'replacement', to: 'plant', plant: t.plant, scope: t.vehicle, tickets: [t.id], rs: 0,
      title: 'Authorise replacement truck for ' + t.vehicle, why: 'Breakdown reported by the transporter; load is ' + t.mText + '.', action: 'Transporter sends a replacement and transships the load; agents track the new truck.', source: 'tower' });
  });
  return out;
}
function inrS(n) { n = Math.round(n); return n >= 1e5 ? '₹' + (n / 1e5).toFixed(2) + ' L' : '₹' + n.toLocaleString('en-IN'); }
/* Pending approvals for a role (and plant, for the Plant Head). */
FX.approvals = function (role, plant) {
  var to = role === 'plant' ? 'plant' : 'clo';
  var decided = {}; STATE.requests.forEach(function (r) { decided[r.key] = r; });
  var stored = STATE.requests.filter(function (r) { return r.to === to && r.status === 'pending' && (!plant || r.plant === plant); });
  var prop = proposals().filter(function (p) { return p.to === to && !decided[p.key] && (!plant || p.plant === plant); });
  return stored.concat(prop.map(function (p) { return Object.assign({ status: 'pending', at: STATE.clockMin }, p); }));
};
FX.decided = function (role, plant) {
  var to = role === 'plant' ? 'plant' : role === 'clo' ? 'clo' : null;
  return STATE.requests.filter(function (r) { return r.status !== 'pending' && (!to || r.to === to) && (!plant || r.plant === plant); }).sort(function (a, b) { return b.decidedAt - a.decidedAt; });
};
FX.requestsFrom = function () { return STATE.requests.filter(function (r) { return r.source === 'ct'; }).sort(function (a, b) { return b.at - a.at; }); };
FX.decide = function (key, decision, actor, comment) {
  var res = null;
  commit(function (S) {
    var req = S.requests.find(function (r) { return r.key === key; });
    if (!req) { var p = proposals().find(function (x) { return x.key === key; }); if (!p) return; req = Object.assign({ id: 'AP-' + (S.requests.length + 1001), status: 'pending', at: S.clockMin }, p); S.requests.push(req); }
    if (req.status !== 'pending') return;
    req.status = decision; req.decidedBy = actor; req.decidedAt = S.clockMin; req.comment = comment || '';
    addEvent(S, { kind: 'approval', actorType: 'Human', actor: actor, ticket: req.tickets[0] || null, di: req.tickets[0] ? (derive().all.find(function (x) { return x.id === req.tickets[0]; }) || {}).di : null,
      text: (decision === 'approved' ? 'Approved: ' : 'Rejected: ') + req.title + (comment ? ' · ' + comment : '') });
    if (decision === 'approved') applyApproval(S, req, actor);
    else req.tickets.forEach(function (id) {
      var o = S.tk[id];
      if (o && o.phase === 'approval') { S.tk[id] = { phase: 'open', lane: 'action', note: 'Rejected by ' + actor + (comment ? ': ' + comment : '') }; syncCase(S, id, { nextAction: 'Rejected by ' + actor }, 'Approval rejected by ' + actor + (comment ? ': ' + comment : '')); }
    });
    res = req;
  });
  return res;
};
function applyApproval(S, req, actor) {
  var d = derive(), tks = req.tickets.map(function (id) { return d.all.find(function (x) { return x.id === id; }); }).filter(Boolean);
  if (req.type === 'budget') { S.budgetAdj[req.plant] = (S.budgetAdj[req.plant] || 0) + req.rs; addEvent(S, { kind: 'approval', actorType: 'System', actor: 'Budget', text: plantShort(req.plant) + ' detention budget raised by ' + inrS(req.rs) }); return; }
  if (req.type === 'hold-dispatch') { S.holds[req.plant + '|' + req.scope] = { at: S.clockMin, by: actor }; addEvent(S, { kind: 'approval', actorType: 'AI agent', actor: CONFIG.agentEmail.name, text: 'Dispatch to ' + req.scope + ' held at ' + plantShort(req.plant) + '; sales officer informed' }); }
  if (req.type === 'claim') addEvent(S, { kind: 'email', actorType: 'AI agent', actor: CONFIG.agentEmail.name, text: 'Detention claim intimation of ' + inrS(req.rs) + ' sent to ' + req.scope + ' and the regional sales head' });
  if (req.type === 'penalty') addEvent(S, { kind: 'email', actorType: 'AI agent', actor: CONFIG.agentEmail.name, text: 'Performance notice sent to ' + req.scope + '; allocation cut recorded' });
  tks.forEach(function (t) {
    if (t.phase === 'closed' || t.phase === 'verify') return;
    materialize(S, t);
    if (S.tk[t.id] && S.tk[t.id].phase === 'approval') S.tk[t.id].phase = 'open';
    if (req.type === 'claim' || req.type === 'penalty') { appendAudit(S, t.id, { actor: actor, actorType: 'Human', action: 'Approved: ' + req.title }, S.clockMin); return; }
    sendEmail(S, t, S.clockMin, { why: 'approved by ' + actor });
    DER = null;
    startVerify(S, derive().all.find(function (x) { return x.id === t.id; }), 'approval', actor, req.title);
    syncCase(S, t.id, { escalated: true }, 'Approved by ' + actor + ': ' + req.title);
  });
}
FX.holds = function (plant) { var o = {}; Object.keys(STATE.holds).forEach(function (k) { var p = k.split('|'); if (!plant || p[0] === plant) o[p[1]] = STATE.holds[k]; }); return o; };

/* ---------------------------------------------------------------
   Guardrails and weights
   --------------------------------------------------------------- */
FX.setGuardrail = function (cat, key, value) {
  commit(function (S) {
    var g = S.guardrails[cat];
    g[key] = value;
    if (g.followUp != null && g.followUp < g.trigger) g.followUp = g.trigger;
    if (g.escalation != null && g.escalation < g.followUp) g.escalation = g.followUp;
    addEvent(S, { kind: 'config', actorType: 'Human', actor: CONFIG.users[0].name, text: cat + ' ' + key + ' set to ' + value + (g.unit === '%' ? '%' : ' ' + g.unit) });
  });
};
FX.setWeight = function (k, v) { commit(function (S) { S.weights[k] = v; }); };

/* ---------------------------------------------------------------
   Live feed: the store clock advances; trips cross thresholds, agents act,
   replies arrive and verification checks complete.
   --------------------------------------------------------------- */
var liveTimer = null;
FX.startLive = function () {
  if (liveTimer) return;
  liveTimer = setInterval(FX.tick, CONFIG.live.tickMs);
};
FX.stopLive = function () { clearInterval(liveTimer); liveTimer = null; };
FX.tick = function (minutes) {
  commit(function (S) {
    if (minutes) S.skewMin = (S.skewMin || 0) + minutes;   // only used to fast-forward in checks
    S.clockMin = realClock();
    S.tick = (S.tick || 0) + 1;
    DER = null; S.rev++;
    var d = derive();
    // New exceptions arriving.
    d.tickets.forEach(function (t) {
      if (S.seen[t.id]) return;
      S.seen[t.id] = 1;
      addEvent(S, { kind: 'detect', actorType: 'System', actor: t.cat + ' agent', ticket: t.id, di: t.di, text: 'Picked up ' + t.cat.toLowerCase() + ' · ' + t.mText + ' · ' + t.vehicle });
    });
    // Agent works the AI lane in order of value.
    if (S.tick % CONFIG.live.agentActionEvery === 0) {
      var next = d.tickets.filter(function (t) { return t.phase === 'open' && t.lane === 'ai' && !(S.tk[t.id] && S.tk[t.id].touched); })
        .sort(function (a, b) { return b.rs - a.rs || b.slaH - a.slaH; })[0];
      if (next) {
        S.tk[next.id] = Object.assign({}, S.tk[next.id] || {}, { touched: S.clockMin });
        var hadCall = (S.calls[next.id] || []).length || next.src === 'case';
        if (!hadCall) {
          var lib = pickLib(next.cat, null, hash(next.id + 'live') % 100 < 20 ? 'action' : 'ai', next.id + 'live'), L = LIB[lib];
          recordCall(S, next, lib, S.clockMin);
          DER = null;
          var nx = derive().all.find(function (x) { return x.id === next.id; });
          if (L.result === 'commit' || L.result === 'eta') { startVerify(S, nx, 'agent', 'AI calling agent', 'Agent call'); if (L.etaChange) etaUpdate(S, nx, L.commit, S.clockMin + 1); }
          else { S.tk[next.id] = Object.assign({}, S.tk[next.id], { phase: 'open', lane: 'action', note: 'Agent call: ' + L.outcome }); addEvent(S, { kind: 'handback', actorType: 'AI agent', actor: 'AI calling agent', ticket: next.id, di: next.di, text: 'Handed to the control tower · ' + L.outcome }); }
        } else {
          materialize(S, next);
          sendEmail(S, next, S.clockMin, { why: 'agent follow-up' });
          startVerify(S, next, 'agent', 'AI agent', 'Agent email');
        }
      }
    }
    // Replies due.
    var due = (S.pendingReplies || []).filter(function (r) { return r.at <= S.clockMin; });
    S.pendingReplies = (S.pendingReplies || []).filter(function (r) { return r.at > S.clockMin; });
    due.forEach(function (r) {
      var t = derive().all.find(function (x) { return x.id === r.ticket; }); if (!t) return;
      var res = deliverReply(S, t, r.outcome, r.at);
      var o = S.tk[t.id];
      if (!o || o.phase !== 'verify') return;
      if (r.outcome === 'refusal') { reopenToLane(S, t, 'Refused by ' + partyFor(t).name + ' · needs a person'); return; }
      var c0 = o.criteria[0];
      if (!c0.met) { c0.met = true; c0.metAt = r.at; c0.note = res.note.replace(/^Reply read · /, ''); }
      if (o.criteria.some(function (x) { return x.k === 'eta' && !x.met; })) etaUpdate(S, t, res.when ? 'arrival by ' + res.when : 'revised time from transporter', r.at + 1);
      if (c0.k === 'doc' && !o.criteria[1].due) o.criteria[1].due = r.at + CONFIG.verifyAfterMin.podMatch;
      syncCase(S, t.id, {}, res.note);
    });
    // Verification checks.
    Object.keys(S.tk).forEach(function (id) {
      var o = S.tk[id]; if (o.phase !== 'verify') return;
      var t = derive().all.find(function (x) { return x.id === id; }); if (!t) return;
      var first = o.criteria[0], failed = null;
      o.criteria.forEach(function (c, i) {
        if (failed || c.met || i === 0 || c.k === 'eta') return;
        if (c.due != null && S.clockMin >= c.due && first.met && c.k === 'gps' && o.via === 'agent' && hash(id + 'gpsfail') % 100 < CONFIG.verifyFailPct) { failed = c; return; }
        if (c.due != null && S.clockMin >= c.due && first.met) {
          c.met = true; c.metAt = S.clockMin;
          c.note = c.k === 'gps' ? 'Signal confirmed at ' + fmtTime(RAW.anchor + S.clockMin * 60000) : 'Fields matched';
          addEvent(S, { kind: 'check', actorType: 'System', actor: 'Verification agent', ticket: id, di: t.di, text: c.label + ' · met' });
        }
      });
      if (failed) { reopenToLane(S, t, 'Verification failed · ' + failed.label.toLowerCase() + ' not seen at ' + fmtTime(RAW.anchor + S.clockMin * 60000) + ' · commitment missed'); return; }
      if (!first.met && S.clockMin - o.since >= CONFIG.verifyAfterMin.noReplyMin && !(S.pendingReplies || []).some(function (r) { return r.ticket === id; })) {
        reopenToLane(S, t, 'No reply within ' + CONFIG.verifyAfterMin.noReplyMin + ' min · needs a person');
        return;
      }
      if (o.criteria.every(function (c) { return c.met; })) closeTicket(S, t);
    });
    DER = null;
  });
};

/* Session */
FX.session = function () { try { return JSON.parse(localStorage.getItem(CONFIG.sessionKey) || 'null'); } catch (e) { return null; } };
/* Synchronous SHA-256 (hex). Used instead of crypto.subtle because the single-file build is
   opened over file://, where the Web Crypto subtle API is not available. */
FX.sha256 = function (msg) {
  var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  var s = String(msg), bytes = [], i, c;
  for (i = 0; i < s.length; i++) {
    c = s.charCodeAt(i);
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  var bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  bytes.push(0, 0, 0, 0, (bitLen >>> 24) & 255, (bitLen >>> 16) & 255, (bitLen >>> 8) & 255, bitLen & 255);
  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }
  var w = new Array(64), off, t;
  for (off = 0; off < bytes.length; off += 64) {
    for (t = 0; t < 16; t++) w[t] = (bytes[off + t * 4] << 24) | (bytes[off + t * 4 + 1] << 16) | (bytes[off + t * 4 + 2] << 8) | bytes[off + t * 4 + 3];
    for (t = 16; t < 64; t++) {
      var s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      var s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }
    var a = H[0], b = H[1], cc = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (t = 0; t < 64; t++) {
      var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      var ch = (e & f) ^ (~e & g);
      var t1 = (h + S1 + ch + K[t] + w[t]) | 0;
      var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      var mj = (a & b) ^ (a & cc) ^ (b & cc);
      var t2 = (S0 + mj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = cc; cc = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + cc) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  return H.map(function (x) { return ('00000000' + (x >>> 0).toString(16)).slice(-8); }).join('');
};
FX.login = function (username, password) {
  var name = String(username == null ? '' : username).trim().toLowerCase();
  var digest = FX.sha256(CONFIG.pwSalt + String(password == null ? '' : password));
  var u = CONFIG.users.find(function (x) { return x.username.toLowerCase() === name && x.pwHash === digest; });
  if (!u) return null;
  var s = { role: u.role, name: u.name, title: u.title, at: Date.now() };
  localStorage.setItem(CONFIG.sessionKey, JSON.stringify(s));
  return s;
};
FX.logout = function () { otpFails = 0; localStorage.removeItem(CONFIG.sessionKey); };

/* OTP sign-in. The accepted codes ship as salted digests only, and wrong tries are capped so a
   four-digit code cannot be walked through. */
var OTP_HASHES = [
  '4cf10fa7e8b16b433939bd8fe2ae14017a8d388affdb9036473caf554ef87312',
  '85d4119058c986624911c7f87aac57343d8f98c8a5a5d47a710e887fd85dc1fd',
  'f17104abaa16a80db6433ee0594222a78df5598a629aaf78ac27b4849fc56fec',
  '27832f29f1703a4c9a2a12a52982e97ec8d8ed9e41760f3ecaf29d92a1f33655'
];
var otpFails = 0;
FX.otpAccount = function (phone) { return CONFIG.otpAccounts[String(phone == null ? '' : phone).replace(/\D/g, '').slice(-10)] || null; };
FX.otpRemaining = function () { return Math.max(0, CONFIG.otpMaxAttempts - otpFails); };
FX.otpReset = function () { otpFails = 0; };
FX.loginOtp = function (phone, code) {
  var role = FX.otpAccount(phone);
  if (!role || otpFails >= CONFIG.otpMaxAttempts) return null;
  if (OTP_HASHES.indexOf(FX.sha256(CONFIG.otpSalt + String(code == null ? '' : code).trim())) < 0) { otpFails++; return null; }
  var u = CONFIG.users.find(function (x) { return x.role === role; });
  if (!u) return null;
  otpFails = 0;
  var s = { role: u.role, name: u.name, title: u.title, at: Date.now() };
  localStorage.setItem(CONFIG.sessionKey, JSON.stringify(s));
  return s;
};
FX.audioFor = function (cat) { return I && I.audioFor ? I.audioFor(cat) : null; };
FX.internals = function () { return I; };

