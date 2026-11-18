// @ts-nocheck
/* FX screens: every view is a render function of the store. Ported from v7 (fx layer, part 2);
   earlier overridden copies of 17 functions were dropped (only the last declaration ever ran). */
import FX_MAP from '@/data/india-map.json';
import { FX_ASSETS } from '@/fx/assets';
import { RECORDINGS, recordingUrl } from '@/fx/recordings';

/* =====================================================================
   UTCL Command — screens. Every view is a render function of the store.
   ===================================================================== */
var FX = window.FX, C = window.FX_CONFIG, U = FX.util, A = FX_ASSETS || {}, MAP = FX_MAP;
var UI = window.FXUI = {};
var root, mainEl;
var ui = loadUi();
var renderQueued = false;
var handlers = {};
UI.on = function (name, fn) { handlers[name] = fn; };

/* ---------- formatting ---------- */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function inr(n, full) {
  n = Math.round(n || 0);
  if (!full && Math.abs(n) >= 1e7) return '₹' + (n / 1e7).toFixed(2) + ' Cr';
  if (!full && Math.abs(n) >= 1e5) return '₹' + (n / 1e5).toFixed(2) + ' L';
  return '₹' + n.toLocaleString('en-IN');
}
function n0(n) { return Math.round(n || 0).toLocaleString('en-IN'); }
function pct(x) { return isFinite(x) ? Math.round(x * 100) + '%' : '–'; }
function hrs(h) { if (h == null || !isFinite(h)) return '–'; if (Math.abs(h) < 1) return Math.round(h * 60) + ' min'; return (Math.abs(h) < 10 ? h.toFixed(1) : n0(h)) + ' h'; }
function ps(p) { return U.plantShort(p); }
function paceTone(x) { return x >= C.burn.redAt ? 'red' : x >= C.burn.amberAt ? 'amber' : 'green'; }
function laneTone(t) { return t.phase === 'closed' ? 'p-gn' : t.phase === 'verify' ? 'p-ai' : t.lane === 'action' ? 'p-rd' : t.lane === 'followup' ? 'p-y' : 'p-mu'; }
function initials(n) { return String(n).split(/\s+/).map(function (x) { return x[0]; }).join('').slice(0, 2).toUpperCase(); }
function plural(n, w) { return n0(n) + ' ' + w + (Math.round(n) === 1 ? '' : 's'); }
var ICON = {
  chev: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  out: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>',
  x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  play: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"/></svg>',
  pause: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
  send: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>',
  tick: '<svg viewBox="0 0 10 10" width="9" height="9" fill="none" stroke="#fff" stroke-width="1.8"><path d="M2 5.2l2 2 4-4.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  search: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="9" r="6"/><path d="M14 14l4 4" stroke-linecap="round"/></svg>',
  overview: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 12h4l3-7 4 14 3-7h4" stroke-linejoin="round"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/></svg>',
  replay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>',
  plant: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 21V10l5 3V10l5 3V5h4v16zM21 21H2"/></svg>',
  trips: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M2 7h11v9H2zM13 10h5l4 4v2h-9"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>',
  ops: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 14v-2a8 8 0 0116 0v2"/><rect x="2.5" y="13" width="4" height="6" rx="1.5"/><rect x="17.5" y="13" width="4" height="6" rx="1.5"/><path d="M20 19c0 1.5-2 2.5-5 2.5"/></svg>',
  rails: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>'
};

/* ---------- ui state (per role, survives refresh) ---------- */
function loadUi() { try { return JSON.parse(sessionStorage.getItem('utcl-ui-v5') || 'null') || {}; } catch (e) { return {}; } }
function saveUi() { try { sessionStorage.setItem('utcl-ui-v5', JSON.stringify(ui)); } catch (e) {} }
function uiFor(role) { ui[role] = ui[role] || {}; return ui[role]; }

/* ---------- slot diffing ---------- */
function slot(id, html, after) {
  var el = document.getElementById(id);
  if (!el) return null;
  if (el.__h !== html) { el.innerHTML = html; el.__h = html; if (after) after(el); }
  return el;
}

/* ---------- odometer KPIs ---------- */
function odoHtml(text) {
  return String(text).split('').map(function (ch) {
    if (/\d/.test(ch)) return '<span class="dg"><span style="transform:translateY(0em)">' + '0123456789'.split('').map(function (x) { return '<i>' + x + '</i>'; }).join('') + '</span></span>';
    return '<span>' + (ch === ' ' ? '&nbsp;' : esc(ch)) + '</span>';
  }).join('');
}
function setOdo(el, text) {
  text = String(text);
  if (el.__v === text) return;
  var shape = text.replace(/\d/g, '0');
  if (el.__shape !== shape) { el.innerHTML = odoHtml(text); el.__shape = shape; el.offsetWidth; }
  var digits = el.querySelectorAll('.dg>span'), k = 0;
  text.split('').forEach(function (ch) { if (/\d/.test(ch)) { digits[k].style.transform = 'translateY(-' + (Number(ch) * 1.1) + 'em)'; k++; } });
  el.__v = text;
}

/* ---------- charts ---------- */
function niceMax(v) { if (v <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
/* Daily bars with an optional plan line and reference line. o.act makes bars open a detail. */

/* ---------- map of plants ---------- */
function proj(lat, lon) { var p = MAP.proj; return [(lon - p[0]) * p[2] * p[3], (p[1] - lat) * p[3]]; }
UI.proj = proj;
/* Plant bubbles: colour = detention budget pace, size = open exceptions. */
function mapSvg(sel, opts) {
  opts = opts || {};
  var R = FX.raw(), G = R.geo, s = '<svg viewBox="40 60 900 1040" role="img" aria-label="Plants by open exceptions"><path class="o" d="' + MAP.outline + '"/><path class="i" d="' + MAP.inner + '"/>';
  var rows = R.plants.map(function (p) { var M = FX.metrics(p); return { p: p, M: M, g: G[p] }; }).filter(function (r) { return r.g; });
  var maxOpen = Math.max.apply(null, rows.map(function (r) { return r.M.open; }).concat([1]));
  rows.forEach(function (r) { var xy = proj(r.g.lat, r.g.lon); if (r.g.offset) { xy[0] += r.g.offset[0]; xy[1] += r.g.offset[1]; } r.xy = xy; r.rad = 14 + 34 * Math.sqrt(r.M.open / maxOpen); r.base = proj(r.g.lat, r.g.lon); });
  // Label side: right unless it would run into another bubble, then left, then below.
  rows.forEach(function (r) {
    var name = ps(r.p).replace(/ Cement Works$/, ''), w = name.length * 8.4 + 8;
    function hits(x0, x1, y0, y1) { return rows.some(function (o) { return o !== r && o.xy[0] + o.rad > x0 && o.xy[0] - o.rad < x1 && o.xy[1] + o.rad > y0 && o.xy[1] - o.rad < y1; }); }
    var y0 = r.xy[1] - 10, y1 = r.xy[1] + 10;
    if (!hits(r.xy[0] + r.rad + 4, r.xy[0] + r.rad + 4 + w, y0, y1) && r.xy[0] + r.rad + w < 930) r.lab = { x: r.xy[0] + r.rad + 6, y: r.xy[1] + 5, a: 'start' };
    else if (!hits(r.xy[0] - r.rad - 4 - w, r.xy[0] - r.rad - 4, y0, y1)) r.lab = { x: r.xy[0] - r.rad - 6, y: r.xy[1] + 5, a: 'end' };
    else r.lab = { x: r.xy[0], y: r.xy[1] + r.rad + 18, a: 'middle' };
    r.name = name;
  });
  rows.sort(function (a, b) { return b.M.open - a.M.open; }).forEach(function (r) {
    var xy = r.xy, rad = r.rad, tone = paceTone(r.M.pace);
    var col = tone === 'red' ? 'var(--rd)' : tone === 'amber' ? '#E6A800' : 'var(--gn)';
    s += '<g class="pl' + (sel === r.p ? ' sel' : '') + '" data-act="map-plant" data-arg="' + esc(r.p) + '"><title>' + esc(ps(r.p) + ' · ' + r.g.place + ' · ' + r.M.open + ' open exceptions · ' + pct(r.M.burn) + ' of detention budget used') + '</title>' +
      (r.g.offset ? '<line x1="' + r.base[0] + '" y1="' + r.base[1] + '" x2="' + xy[0] + '" y2="' + xy[1] + '" stroke="var(--tx)" stroke-width="1.2" stroke-dasharray="3 3" opacity=".5"/>' : '') +
      (tone === 'red' ? '<circle class="ring" cx="' + xy[0] + '" cy="' + xy[1] + '" r="' + rad + '" stroke="' + col + '"/>' : '') +
      '<circle class="b" cx="' + xy[0] + '" cy="' + xy[1] + '" r="' + rad + '" fill="' + col + '" fill-opacity=".88"/><text class="c" x="' + xy[0] + '" y="' + (xy[1] + 5) + '" text-anchor="middle">' + r.M.open + '</text>' +
      '<text x="' + r.lab.x + '" y="' + r.lab.y + '" text-anchor="' + r.lab.a + '">' + esc(r.name) + '</text></g>';
  });
  return s + '</svg><div class="mleg"><span><i style="background:var(--rd)"></i>Over budget pace</span><span><i style="background:#E6A800"></i>Near pace</span><span><i style="background:var(--gn)"></i>Within pace</span><span>Bubble size: open exceptions</span></div>' +
    '<div class="mcap"><b>' + n0(U.sum(rows, function (r) { return r.M.open; })) + '</b>open exceptions across ' + rows.length + ' plants</div>';
}
/* Exceptions at one plant, grouped by reason, then sub-reason. */
function plantReasons(p, u) {
  var M = FX.metrics(p), open = M.openTickets, g = {};
  open.forEach(function (t) { var k = t.cat; g[k] = g[k] || { n: 0, ai: 0, fu: 0, act: 0, vf: 0, sub: {} }; g[k].n++; if (t.phase === 'verify') g[k].vf++; else if (t.lane === 'action') g[k].act++; else if (t.lane === 'followup') g[k].fu++; else g[k].ai++; g[k].sub[t.sub || '—'] = (g[k].sub[t.sub || '—'] || 0) + 1; });
  var geo = FX.raw().geo[p] || {};
  u.mopen = u.mopen || {};
  var h = '<div class="kv"><div><b>' + n0(M.open) + '</b><span>Open exceptions</span></div><div><b>' + n0(M.lanes.ai + M.lanes.verify) + '</b><span>With agents</span></div><div><b class="c-' + paceTone(M.pace) + '">' + pct(M.burn) + '</b><span>Detention budget used</span></div></div>';
  h += Object.keys(g).sort(function (a, b) { return g[b].n - g[a].n; }).map(function (k) {
    var x = g[k], on = !!u.mopen[k], tot = Math.max(1, x.n);
    return '<div class="grp-r"><button data-act="mgrp" data-arg="' + esc(k) + '"><span class="chev' + (on ? ' o' : '') + '">' + ICON.chev + '</span><span><b>' + esc(k) + '</b> <span class="muted">· ' + x.n + '</span></span><span class="lanebar" title="Agent / follow-up / action / verifying"><i style="width:' + (x.ai / tot * 100) + '%;background:var(--ai)"></i><i style="width:' + (x.vf / tot * 100) + '%;background:#7FC4D6"></i><i style="width:' + (x.fu / tot * 100) + '%;background:#E6A800"></i><i style="width:' + (x.act / tot * 100) + '%;background:var(--rd)"></i></span></button>' +
      (on ? '<div class="sub">' + Object.keys(x.sub).sort(function (a, b) { return x.sub[b] - x.sub[a]; }).map(function (s) { return '<div><span>' + esc(s) + '</span><b>' + x.sub[s] + '</b></div>'; }).join('') + '<div><span class="muted">With agents ' + (x.ai + x.vf) + ' · follow up ' + x.fu + ' · action ' + x.act + '</span></div></div>' : '') + '</div>';
  }).join('');
  if (!open.length) h += '<div class="empty">No open exceptions at this plant.</div>';
  return '<div class="muted" style="margin-bottom:6px">' + esc(geo.place || '') + '</div>' + h;
}
UI.on('mgrp', function (d) { var u = uiFor(session().role); u.mopen = u.mopen || {}; u.mopen[d.arg] = !u.mopen[d.arg]; saveUi(); render(); if (UI.detailOpen) UI.detailOpen.refresh(); });

/* ---------- detail drawer (one level of drill) ---------- */
UI.detail = function (title, sub, build) {
  UI.closeDetail();
  if (ui.chatOpen) { ui.chatOpen = false; saveUi(); var ch = document.getElementById('fx-chat'); if (ch) ch.classList.remove('on'); }
  var bg = document.createElement('div'); bg.className = 'dr-bg'; bg.id = 'fx-drbg'; bg.setAttribute('data-act', 'dr-close');
  var dr = document.createElement('aside'); dr.className = 'dr'; dr.id = 'fx-dr';
  function paint() { dr.innerHTML = '<button class="x" data-act="dr-close" aria-label="Close">' + ICON.x + '</button><h3>' + esc(title) + '</h3><div class="sub">' + sub + '</div>' + build(); }
  paint();
  root.appendChild(bg); root.appendChild(dr);
  UI.detailOpen = { refresh: paint };
};
UI.closeDetail = function () { ['fx-dr', 'fx-drbg'].forEach(function (id) { var e = document.getElementById(id); if (e) e.remove(); }); UI.detailOpen = null; };
UI.on('dr-close', function () { UI.closeDetail(); });
/* Generic trip list for a detail drawer. */
function tripTable(calcs, opts) {
  opts = opts || {};
  var d = FX.derive(), tk = {};
  d.tickets.forEach(function (t) { if (!tk[t.di] || (tk[t.di].phase === 'closed' && t.phase !== 'closed')) tk[t.di] = t; });
  var rows = calcs.slice(0, opts.limit || 150);
  return '<div class="tsc"><table class="tbl"><tr><th>Vehicle · DI</th><th>Destination</th><th>Transporter</th><th class="r">' + esc(opts.metricLabel || 'Timing') + '</th><th>Status</th></tr>' +
    rows.map(function (c) { var t = c.t, x = tk[t.di]; return '<tr data-act="trip" data-arg="' + esc(t.di) + '"><td><b>' + esc(t.vehicle) + '</b><div class="muted" style="font-size:12px">' + esc(t.di) + '</div></td><td>' + esc(t.dest) + '</td><td style="font-size:12px">' + esc(t.transporter) + '</td><td class="r">' + (opts.metric ? opts.metric(c) : tripTiming(c)) + '</td><td>' + (x ? '<span class="pill ' + laneTone(x) + '">' + esc(x.status) + '</span>' : '<span class="muted">—</span>') + '</td></tr>'; }).join('') +
    '</table></div>' + (calcs.length > rows.length ? '<p class="note">Showing ' + rows.length + ' of ' + n0(calcs.length) + '.</p>' : '');
}
function tripTiming(c) {
  var t = c.t;
  if (t.stage === 'AT PLANT') return hrs(c.plantH) + ' at plant';
  if (t.stage === 'IN TRANSIT') return c.lateH > 0 ? hrs(c.lateH) + ' late' : 'On plan';
  return hrs(c.siteH) + ' at customer';
}
UI.tripTable = tripTable; UI.tripTiming = tripTiming;

/* ---------- ticket helpers ---------- */
function rankTickets(list) { return list.slice().sort(function (a, b) { return b.score - a.score || b.slaH - a.slaH || (b.repeat ? 1 : 0) - (a.repeat ? 1 : 0); }); }

/* ---------- shell ---------- */
var NAV = {
  clo: [['home', 'Overview', 'overview'], ['map', 'Network map', 'map'], ['replay', 'Trip replay', 'replay']],
  plant: [['home', 'Plant', 'plant'], ['trips', 'Trips', 'trips']],
  ct: [['home', 'Exceptions', 'ops'], ['map', 'Network map', 'map'], ['trips', 'Trips', 'trips'], ['guardrails', 'Guardrails', 'rails']]
};
var TITLES = { clo: 'Logistics command', plant: 'Plant operations', ct: 'Control tower operations' };
UI.start = function () {
  root = document.getElementById('fx-app');
  document.title = C.customerName + ' · ' + C.productName;
  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  root.addEventListener('input', onInput);
  root.addEventListener('submit', onSubmit);
  root.addEventListener('focusout', function () { if (renderQueued) setTimeout(render, 0); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') UI.closeDetail(); if (e.key === '/' && document.activeElement === document.body) { var s = document.getElementById('fx-search'); if (s) { e.preventDefault(); s.focus(); } } });
  FX.subscribe(function () { schedule(); });
  setInterval(clockTick, 1000);
  mount();
};
function session() { return FX.session(); }
function schedule() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(function () {
    var a = document.activeElement;
    if (a && root.contains(a) && /INPUT|SELECT|TEXTAREA/.test(a.tagName) && a.type !== 'range' && a.type !== 'checkbox' && a.id !== 'fx-search') return;
    render();
  });
}
UI.render = render;
UI.go = function (view, patch) {
  var s = session(); if (!s) return;
  var u = uiFor(s.role);
  if (patch) Object.keys(patch).forEach(function (k) { u[k] = patch[k]; });
  UI.closeDetail();
  if (view && view !== u.view && UI.views[s.role][view]) { u.view = view; saveUi(); mount(); }
  else { saveUi(); render(); }
  if (patch && patch.scrollTo) setTimeout(function () { var el = document.getElementById(patch.scrollTo); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); u.scrollTo = null; }, 80);
};

/* ---------- login ---------- */

/* ---------- events ---------- */
function onClick(e) {
  var a = e.target.closest('[data-act]');
  if (!a || !root.contains(a)) { var sr = document.getElementById('fx-sres'); if (sr && !e.target.closest('.search')) sr.classList.add('hide'); return; }
  var fn = handlers[a.getAttribute('data-act')];
  if (fn) { e.preventDefault(); fn({ arg: a.getAttribute('data-arg'), kind: a.getAttribute('data-kind'), tab: a.getAttribute('data-tab'), el: a }, a, e); }
}
function onChange(e) { var a = e.target.closest('[data-chg]'); if (a && handlers[a.getAttribute('data-chg')]) handlers[a.getAttribute('data-chg')]({ arg: a.getAttribute('data-arg'), k: a.getAttribute('data-k') }, a, e); }
function onInput(e) { var a = e.target.closest('[data-inp]'); if (a && handlers[a.getAttribute('data-inp')]) handlers[a.getAttribute('data-inp')]({ arg: a.getAttribute('data-arg') }, a, e); }
function onSubmit(e) { var f = e.target.closest('[data-form]'); if (f && handlers['form-' + f.getAttribute('data-form')]) { e.preventDefault(); handlers['form-' + f.getAttribute('data-form')](f); } }

UI.on('lrole', function (d) { ui.loginRole = d.arg; saveUi(); root.innerHTML = loginHtml(); var p = root.querySelector('input[name=p]'); if (p) p.focus(); });
UI.on('form-login', function (f) {
  var s = FX.login(f.u.value, f.p.value);
  if (!s) { document.getElementById('lg-err').textContent = 'Username or password is not right.'; return; }
  mount();
});
UI.on('logout', function () { FX.logout(); ui.chatOpen = false; saveUi(); mount(); });
UI.on('nav', function (d) { UI.go(d.arg); });
UI.on('go', function (d) { UI.navigate(d.arg); });
UI.on('chat', function () { ui.chatOpen = !ui.chatOpen; saveUi(); var c = document.getElementById('fx-chat'); if (c) c.classList.toggle('on', ui.chatOpen); if (ui.chatOpen) UI.chat.focus(); });
UI.on('tk-open', function (d) { UI.closeDetail(); FX.openTicket(d.arg, d.tab); });
UI.on('tk-call', function (d) { UI.closeDetail(); FX.ticketAction(d.arg, d.kind); });
UI.on('trip', function (d) { UI.tripPanel(d.arg); });

/* Global search across trips, plants, transporters and sites. */
UI.on('search', function (d, el) {
  var q = el.value.trim().toLowerCase(), box = document.getElementById('fx-sres');
  if (q.length < 2) { box.classList.add('hide'); return; }
  var s = session(), R = FX.raw(), scope = s.role === 'plant' ? C.plantHeadPlant : null;
  var trips = R.trips.filter(function (t) { return (!scope || t.plant === scope) && (t.di + ' ' + t.vehicle + ' ' + t.dest + ' ' + t.transporter + ' ' + t.driver).toLowerCase().indexOf(q) >= 0; }).slice(0, 7);
  var plants = s.role === 'plant' ? [] : R.plants.filter(function (p) { return ps(p).toLowerCase().indexOf(q) >= 0; }).slice(0, 3);
  box.innerHTML = '<div class="hd">' + (trips.length + plants.length ? 'Results' : 'No match') + '</div>' +
    plants.map(function (p) { return '<button data-act="search-plant" data-arg="' + esc(p) + '"><span class="pill p-y">Plant</span><b>' + esc(ps(p)) + '</b><span class="m">' + n0(FX.metrics(p).open) + ' open</span></button>'; }).join('') +
    trips.map(function (t) { return '<button data-act="search-trip" data-arg="' + esc(t.di) + '"><span class="pill p-mu">' + esc(t.stage.replace('AT ', '').toLowerCase()) + '</span><span><b>' + esc(t.vehicle) + '</b> <span class="m">DI ' + esc(t.di) + ' · ' + esc(t.dest) + '</span></span><span class="m">' + esc(ps(t.plant)) + '</span></button>'; }).join('');
  box.classList.remove('hide');
});
UI.on('search-trip', function (d) { document.getElementById('fx-sres').classList.add('hide'); UI.tripPanel(d.arg); });
UI.on('search-plant', function (d) {
  document.getElementById('fx-sres').classList.add('hide');
  var s = session();
  if (s.role === 'clo') UI.go('home', { plant: d.arg, scrollTo: 'sec-top' }); else UI.mapPlant(d.arg);
});

/* Navigation targets used by KPI tiles, chat answers and links: "view[:key=value,...]" */
UI.navigate = function (target) {
  var s = session(); if (!s) return;
  if (/^tk:/.test(target)) { FX.openTicket(target.slice(3)); return; }
  if (/^trip:/.test(target)) { UI.tripPanel(target.slice(5)); return; }
  var parts = String(target).split(':'), view = parts[0], patch = {};
  (parts[1] || '').split(',').filter(Boolean).forEach(function (kv) { var i = kv.indexOf('='); patch[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); });
  if ('path' in patch) patch.path = patch.path ? patch.path.split('|') : [];
  if (patch.plant === '') patch.plant = null;
  if (!UI.views[s.role][view]) view = uiFor(s.role).view;
  UI.go(view, patch);
};

/* Plant detail from the map: exceptions grouped by reason. */
UI.mapPlant = function (p) {
  var s = session(), u = uiFor(s.role);
  UI.detail(ps(p), 'Open exceptions by reason. Select a reason for its sub-reasons.', function () {
    return plantReasons(p, u) + '<div style="margin-top:14px;display:flex;gap:8px">' + (s.role === 'clo' ? '<button class="btn y sm" data-act="go" data-arg="home:plant=' + encodeURIComponent(p) + ',scrollTo=sec-top">Filter overview to this plant</button>' : '<button class="btn y sm" data-act="go" data-arg="home:qplant=' + encodeURIComponent(p) + '">Show its tickets in the queue</button>') + '</div>';
  });
};
UI.on('map-plant', function (d) {
  var s = session(), u = uiFor(s.role);
  if (u.view === 'map') { u.mapSel = d.arg; saveUi(); render(); return; }
  UI.mapPlant(d.arg);
});

/* Trip panel: trips with an exception open the full issue drawer; others get a fact sheet. */
UI.tripPanel = function (di) {
  var d = FX.derive(), c = d.calcByDi[di]; if (!c) return;
  var t = c.t, tickets = d.tickets.filter(function (x) { return x.di === di; });
  if (tickets.length) { UI.closeDetail(); FX.openTicket(rankTickets(tickets)[0].id); return; }
  UI.detail(t.vehicle, 'DI ' + esc(t.di) + ' · no open exception on this trip', function () {
    var rows = [['Trip', t.tripId], ['Driver', t.driver], ['Transporter', t.transporter], ['Plant', ps(t.plant)], ['Destination', t.dest], ['Segment', t.segment], ['Product', t.product], ['Lead distance', t.km + ' km'], ['Fleet', FX.dedicated(t) ? 'Dedicated' : 'Market'],
      ['DI raised', U.fmtDT(t.start)], ['Planned gate-out', U.fmtDT(c.gateOut)], ['Planned arrival', U.fmtDT(c.arrival)], ['Stage', t.stage], ['Timing', tripTiming(c)], ['Detention accrued', inr(c.det)]];
    return '<div class="facts">' + rows.map(function (r) { return '<div><span>' + r[0] + '</span><b>' + esc(r[1]) + '</b></div>'; }).join('') + '</div>';
  });
};

UI.h = { esc: esc, inr: inr, n0: n0, pct: pct, hrs: hrs, ps: ps, plural: plural, paceTone: paceTone, laneTone: laneTone, slot: slot, kpiStrip: kpiStrip, dayChart: dayChart, hbars: hbars, lineSmall: lineSmall,
  mapSvg: mapSvg, plantReasons: plantReasons, rankTickets: rankTickets, ICON: ICON, uiFor: uiFor, saveUi: saveUi, session: session };
UI.views = { clo: {}, plant: {}, ct: {} };

/* =================== shared sections =================== */
var CATS = ['Route Deviation', 'In-transit Delay', 'Customer Detention', 'Unloading Detection', 'ePOD Delay'];
var CAT_COLOR = { 'Route Deviation': '#6B4FD0', 'In-transit Delay': 'var(--ai)', 'Customer Detention': 'var(--rd)', 'Unloading Detection': 'var(--am)', 'ePOD Delay': '#C99A00' };
var DAY = 86400000;
function dayLabel(k) { return U.fmtDay(U.dayStart(k) + 6 * 3600000); }
function monthKeys() { var mi = FX.monthInfo(), today = U.dayKey(FX.now()), out = []; for (var k = mi.startDay; k <= today; k++) out.push(k); return { keys: out, today: today, mi: mi }; }
function info(text, left) { return '<i class="info' + (left ? ' l' : '') + '" tabindex="0" data-tip="' + esc(text) + '">i</i>'; }
UI.info = info;
function card(id, title, as, inner, extra, tip) { return cardHtml(id, title, as, extra, tip) + inner + '</div></div>'; }
function cardHtml(id, title, as, extra, tip) { return '<div class="card"' + (id ? ' id="' + id + '"' : '') + '><div class="ch"><h2>' + title + (tip ? info(tip) : '') + '</h2>' + (extra || '') + (as ? '<span class="as">' + as + '</span>' : '') + '</div><div class="cb">'; }

/* Plant filter chips */
function plantChips(u) {
  var R = FX.raw();
  var all = '<button class="plb' + (!u.plant ? ' on' : '') + '" data-act="plant-f" data-arg=""><span class="dot neutral"></span><span><b>All plants</b><span>' + R.plants.length + ' plants</span></span></button>';
  return all + R.plants.map(function (p) {
    var M = FX.metrics(p);
    return '<button class="plb' + (u.plant === p ? ' on' : '') + '" data-act="plant-f" data-arg="' + esc(p) + '"><span class="dot ' + paceTone(M.pace) + '"></span><span><b>' + esc(ps(p).replace(/ Cement Works$/, '')) + '</b><span>' + n0(M.open) + ' open · ' + pct(M.burn) + ' budget</span></span></button>';
  }).join('');
}
UI.on('plant-f', function (d) { var u = uiFor(session().role); u.plant = d.arg || null; u.path = []; saveUi(); render(); });

/* Detention by day (hours or rupees) and dispatch plan vs actual. Bars open the trips behind them. */
function planChart(plant, mode, unit, narrow) {
  var M = FX.metrics(plant), D = monthKeys(), html, summary;
  if (mode === 'disp') {
    var dd = FX.dispatchDaily(plant);
    var days = D.keys.map(function (k, i) { var a = dd.actual[k] || 0, p = dd.plan[k] || 0; return { key: k, v: a, plan: k === D.today ? null : p, partial: k === D.today, tick: i % 4 === 0 ? dayLabel(k) : '', tip: dayLabel(k) + ' · ' + a + ' of ' + p + ' DIs raised that day have left the plant' }; });
    summary = 'Month to date <b>' + n0(M.dispatched) + '</b> of <b>' + n0(M.mtdTrips) + '</b> DIs dispatched (' + pct(M.dispatched / Math.max(1, M.mtdTrips)) + '). Select a day for its DIs.';
    html = dayChart({ w: narrow ? 560 : 0, h: narrow ? 240 : 0, days: days, label: 'Dispatch plan vs actual', fmt: n0, color: 'var(--y)', planLine: true, act: 'day-disp' }) +
      '<div class="legend"><span><i style="background:var(--y)"></i>Dispatched</span><span><i style="background:none;border-top:2px dashed var(--tx);height:0;border-radius:0"></i>DIs raised (plan)</span></div>';
  } else {
    var rateH = C.cost.ratePerDay / 24, hrsMode = unit !== 'rs';
    var days2 = D.keys.map(function (k, i) { var rs = M.daily[k] || 0, h = rs / rateH; return { key: k, v: hrsMode ? h : rs, partial: k === D.today, tick: i % 4 === 0 ? dayLabel(k) : '', tip: dayLabel(k) + ' · ' + n0(h) + ' chargeable truck-hours · ' + inr(rs) }; });
    var dailyBudget = M.budget / M.month.dim;
    summary = 'Month to date <b>' + n0(M.detHours) + ' chargeable truck-hours</b>, costing <b>' + inr(M.det) + '</b> against a budget of ' + inr(M.budget) + ' (' + pct(M.burn) + ' used, ' + pct(M.month.share) + ' of the month gone).';
    html = dayChart({ w: narrow ? 560 : 0, h: narrow ? 240 : 0, days: days2, label: 'Detention by day', fmt: hrsMode ? function (v) { return n0(v) + ' h'; } : inr, color: 'var(--am)', act: 'day-det',
      ref: { value: hrsMode ? dailyBudget / rateH : dailyBudget, label: 'Daily budget ' + (hrsMode ? n0(dailyBudget / rateH) + ' h' : inr(dailyBudget)) } }) +
      '<div class="legend"><span><i style="background:var(--am)"></i>Detention ' + (hrsMode ? 'hours beyond free time (hover for cost)' : 'cost (hover for hours)') + '</span><span><i style="background:none;border-top:2px dotted var(--rd);height:0;border-radius:0"></i>Daily budget</span></div>';
  }
  return '<div class="chart">' + html + '</div>';
}
UI.on('chart-mode', function (d) { var u = uiFor(session().role); u.chart = d.arg; saveUi(); render(); });
UI.on('det-unit', function (d) { var u = uiFor(session().role); u.detUnit = d.arg; saveUi(); render(); });
function scopeOf() { var s = session(), u = uiFor(s.role); return s.role === 'plant' ? C.plantHeadPlant : (u.plant || null); }
UI.on('day-disp', function (d) {
  var k = Number(d.arg), p = scopeOf(), calcs = FX.derive().calcs.filter(function (c) { return (!p || c.t.plant === p) && U.dayKey(c.t.start) === k; });
  var left = calcs.filter(function (c) { return c.t.stage !== 'AT PLANT'; }).length;
  UI.detail('DIs raised on ' + dayLabel(k), n0(left) + ' of ' + n0(calcs.length) + ' have left the plant' + (p ? ' · ' + esc(ps(p)) : ''), function () { return UI.tripTable(calcs.sort(function (a, b) { return a.t.stage === 'AT PLANT' ? -1 : 1; })); });
});
UI.on('day-det', function (d) {
  var k = Number(d.arg), p = scopeOf(), s0 = U.dayStart(k), s1 = s0 + DAY, now = FX.now();
  var rows = FX.derive().calcs.filter(function (c) { return (!p || c.t.plant === p) && c.t.stage === 'AT CUSTOMER'; }).map(function (c) {
    var end = FX.state().released[c.t.di] != null ? Math.min(now, FX.timeOf(FX.state().released[c.t.di])) : now;
    var h = Math.max(0, (Math.min(end, s1) - Math.max(c.freeEnds, s0)) / 3600000); return { c: c, h: h };
  }).filter(function (r) { return r.h > 0; }).sort(function (a, b) { return b.h - a.h; });
  var tot = U.sum(rows, function (r) { return r.h; });
  UI.detail('Detention on ' + dayLabel(k), plural(rows.length, 'truck') + ' charged · ' + n0(tot) + ' h · ' + inr(tot * C.cost.ratePerDay / 24), function () {
    var map = {}; rows.forEach(function (r) { map[r.c.t.di] = r.h; });
    return UI.tripTable(rows.map(function (r) { return r.c; }), { metricLabel: 'Hours that day', metric: function (c) { return hrs(map[c.t.di]) + ' · ' + inr(map[c.t.di] * C.cost.ratePerDay / 24); } });
  });
});

/* In-plant turnaround: stages inside the plant for trucks still at the plant. */
UI.on('tat-stage', function (d) {
  var p = scopeOf(), Y = FX.yard(p), s = d.arg === 'held' ? Y.held : Y.stages[Number(d.arg)];
  UI.detail(s.name, plural(s.trips.length, 'truck') + (p ? ' · ' + esc(ps(p)) : ' · all plants') + (s.norm ? ' · norm ' + s.norm + ' min' : ''), function () {
    return UI.tripTable(s.trips.slice().sort(function (a, b) { return b.plantH - a.plantH; }), { metricLabel: 'Time at plant', metric: function (c) { return hrs(c.plantH); } });
  });
});

/* Where the problem is: plant → customer → transporter → trips */
UI.on('drill', function (d) {
  var s = session(), u = uiFor(s.role), parts = d.arg.split('|'), depth = Number(parts[0]), v = parts.slice(1).join('|');
  var path = (u.path || []).slice(0, v ? depth - 1 : depth);
  if (v) path[depth - 1] = v;
  if (s.role === 'plant') path[0] = C.plantHeadPlant;
  u.path = path; saveUi(); render();
});
UI.on('drill-type', function (d) { var u = uiFor(session().role); u.cloType = d.arg || null; saveUi(); render(); });

/* Approvals: decisions that belong to this role (tower proposals and control tower requests). */
var GROUP_PILL = { Commercial: 'p-rd', Vendor: 'p-am', Budget: 'p-y', Escalation: 'p-ai', Dispatch: 'p-y', Fleet: 'p-ai', Route: 'p-ai', Documents: 'p-mu' };
function findApproval(key) { return FX.approvals('clo', null).concat(FX.approvals('plant', null), FX.decided(null, null)).find(function (x) { return x.key === key; }); }
UI.on('apr-open', function (d) { var u = uiFor(session().role); u.aopen = u.aopen || {}; u.aopen[d.arg] = !u.aopen[d.arg]; saveUi(); render(); });
UI.on('apr-reject', function (d) { var u = uiFor(session().role); u.arej = u.arej || {}; u.arej[d.arg] = !u.arej[d.arg]; saveUi(); render(); });
UI.on('apr-note', function (d, el) { var u = uiFor(session().role); u.arejText = u.arejText || {}; u.arejText[d.arg] = el.value; saveUi(); });
UI.on('apr-ok', function (d) { var s = session(), r = FX.decide(d.arg, 'approved', s.name, ''); if (r && window.__FXBridge) window.__FXBridge.toast('Approved · ' + r.title); });
UI.on('apr-reject-go', function (d) {
  var s = session(), u = uiFor(s.role), note = (u.arejText && u.arejText[d.arg]) || '';
  if (u.arej) delete u.arej[d.arg]; saveUi();
  var r = FX.decide(d.arg, 'rejected', s.name, note);
  if (r && window.__FXBridge) window.__FXBridge.toast('Rejected · ' + r.title);
});
UI.on('apr-tickets', function (d) {
  var r = findApproval(d.arg); if (!r) return;
  var list = r.tickets.map(function (id) { return FX.ticket(id); }).filter(Boolean);
  UI.detail(r.title, plural(list.length, 'ticket'), function () { return ticketList(list); });
});
var APR_TIP = 'Decisions that sit with you under the approval matrix. The tower raises some from live exceptions; the control tower sends cases it cannot settle within its authority. Approving starts the agreed action; rejecting returns the case to the control tower with your reason.';

/* Exceptions by stage and by type; a bar opens plant and customer detail */
function excBars(plant) {
  var M = FX.metrics(plant);
  var stages = [['Plant / loading', M.stageCounts.Plant], ['In transit', M.stageCounts['In transit']], ['Unloading', M.stageCounts.Unloading], ['ePOD', M.stageCounts.ePOD]];
  return '<div class="g g2"><div><div class="muted" style="font-size:12.5px;margin-bottom:8px">By stage</div>' +
    hbars(stages.map(function (s) { return { label: s[0], value: s[1], text: n0(s[1]), color: 'var(--tx)', act: 'exc-detail', arg: 'stage|' + s[0] }; })) +
    '</div>' +
    '<div><div class="muted" style="font-size:12.5px;margin-bottom:8px">By type</div>' + hbars(CATS.map(function (c) { return { label: c, value: M.byType[c] || 0, text: n0(M.byType[c] || 0), color: CAT_COLOR[c], act: 'exc-detail', arg: 'type|' + c }; })) + '</div></div>';
}
UI.on('exc-detail', function (d) {
  var parts = d.arg.split('|'), kind = parts[0], val = parts[1], p = scopeOf(), dd = FX.derive();
  var items, unitLabel = 'exceptions';
  if (kind === 'stage' && val === 'Plant / loading') { items = dd.calcs.filter(function (c) { return c.t.stage === 'AT PLANT' && c.overNormH > 0 && (!p || c.t.plant === p); }).map(function (c) { return { plant: c.t.plant, dest: c.t.dest, ai: true, c: c }; }); unitLabel = 'trucks'; }
  else items = dd.open.filter(function (t) { return (!p || t.plant === p) && (kind === 'type' ? t.cat === val : t.stage === val); }).map(function (t) { return { plant: t.plant, dest: t.dest, ai: t.phase === 'verify' || t.lane === 'ai', t: t }; });
  function table(key, label, lim) {
    var g = {}; items.forEach(function (x) { var k = x[key]; g[k] = g[k] || { n: 0, ai: 0 }; g[k].n++; if (x.ai) g[k].ai++; });
    var rows = Object.keys(g).map(function (k) { return [k, g[k]]; }).sort(function (a, b) { return b[1].n - a[1].n; }).slice(0, lim);
    return '<table class="tbl"><tr><th>' + label + '</th><th class="r">' + unitLabel + '</th>' + (unitLabel === 'exceptions' ? '<th class="r">With agents</th><th class="r">Need a person</th>' : '') + '</tr>' +
      rows.map(function (r) { return '<tr><td>' + esc(key === 'plant' ? ps(r[0]) : r[0]) + '</td><td class="r"><b>' + n0(r[1].n) + '</b></td>' + (unitLabel === 'exceptions' ? '<td class="r">' + n0(r[1].ai) + '</td><td class="r">' + n0(r[1].n - r[1].ai) + '</td>' : '') + '</tr>'; }).join('') + '</table>';
  }
  UI.detail(val, plural(items.length, unitLabel === 'trucks' ? 'truck' : 'open exception') + (p ? ' · ' + esc(ps(p)) : ' · all plants'), function () {
    return (p ? '' : '<div class="sec">By plant</div>' + table('plant', 'Plant', 20)) + '<div class="sec">By customer</div>' + table('dest', 'Customer (destination)', 15);
  });
});

/* =================== Logistics head =================== */
UI.views.clo.home = {
  layout: function () {
    return '<div id="sec-top"></div><div class="pls" id="c-pls"></div><div class="kpis" id="k-clo"></div>' +
      '<div class="g g32"><div class="card"><div class="ch"><h2>Network, live' + info('Each bubble is a plant. Colour is detention spend against the plant\'s budget pace for the month: red above 110%, amber 90 to 110%, green below 90%. Bubble size is the number of open exceptions on the plant\'s trips. Select a bubble for its exceptions by reason.') + '</h2></div><div class="mapw" id="c-map"></div></div>' +
      '<div class="g" style="align-content:start">' + card('sec-d', 'Decisions for you', '<span id="c-dec-n"></span>', '<div id="c-dec"></div>', '', APR_TIP + ' Logistics head: transporter claims and penalties, budget extensions, customer escalations through sales.') +
      card('', 'Trucks waiting at customers', '', '<div id="c-wait"></div>', '', 'Customer sites holding trucks beyond the ' + C.cost.freeHours + ' h free time, ranked by number of trucks. Hover a row for the detention accrued; select it for the trucks.') + '</div></div>' +
      '<div class="mt">' + card('sec-b', 'Plan vs actual', '', '<div id="c-plan"></div>', '<div id="c-tog" style="display:flex;gap:6px"></div>', 'Detention: chargeable truck-hours beyond free time per day (or the ₹ value at the contracted rate). Earlier days come from the closed dispatch ledger, today from live trips. The dotted line is the daily budget (monthly budget divided by days in the month). Dispatch: DIs raised (plan) against DIs that left the plant. Select a bar for the day\'s detail.') + '</div>' +
      '<div class="mt">' + card('', 'In-plant turnaround', '<span id="c-tat-as"></span>', '<div id="c-tat"></div>', '', 'Trucks inside the plant now, by stage from reporting to gate-out. Each tile shows trucks in the stage and their average time in it against the stage norm. Trucks past the full DI-to-gate-out norm count as held beyond norm. Select a stage for its trucks.') + '</div>' +
      '<div class="mt">' + card('sec-c', 'Where the problem is', '', '<div id="c-drill"></div>', '', 'Plants ranked by detention budget pace: month-to-date spend divided by the budget for the share of the month gone. The bar shows spend, the shaded part the value at risk on open exceptions, the tick where spend should be today. Select a plant, then a customer, then a transporter, then a trip.') + '</div>' +
      '<div class="mt">' + card('sec-e', 'Exceptions by stage and type', '', '<div id="c-exc"></div>', '', 'Open exceptions by where they sit in the journey and by type. Plant / loading counts trucks held beyond the ' + C.norms.loadingHours + ' h DI-to-gate-out norm; the other stages count open exceptions. Select a bar for the plants and customers behind it.') + '</div>';
  },
  update: function (u) {
    var p = u.plant || null, M = FX.metrics(p), all = FX.metrics(null);
    slot('c-pls', plantChips(u));
    kpiStrip('k-clo', cloKpis(M, p));
    slot('c-map', mapSvg(p));
    var ap = FX.approvals('clo', p); slot('c-dec-n', ap.length ? ap.length + ' pending' : '');
    slot('c-dec', approvalsHtml('clo', p, u));
    var w = {}; M.atCustomer.forEach(function (c) { if (c.siteH > C.cost.freeHours) { var k = c.t.dest; w[k] = w[k] || { n: 0, det: 0 }; w[k].n++; w[k].det += c.det; } });
    slot('c-wait', hbars(Object.keys(w).map(function (k) { return { label: k, value: w[k].n, text: plural(w[k].n, 'truck'), title: k + ' · ' + inr(w[k].det) + ' accrued', color: 'var(--am)', act: 'wait-site', arg: k }; }).sort(function (a, b) { return b.value - a.value; }).slice(0, 7), { empty: 'No truck past free time.' }));
    var mode = u.chart || 'det';
    slot('c-tog', '<div class="seg"><button data-act="chart-mode" data-arg="det" class="' + (mode === 'det' ? 'on' : '') + '">Detention</button><button data-act="chart-mode" data-arg="disp" class="' + (mode === 'disp' ? 'on' : '') + '">Dispatch</button></div>' +
      (mode === 'det' ? '<div class="seg"><button data-act="det-unit" data-arg="h" class="' + (u.detUnit !== 'rs' ? 'on' : '') + '">Hours</button><button data-act="det-unit" data-arg="rs" class="' + (u.detUnit === 'rs' ? 'on' : '') + '">₹ value</button></div>' : ''));
    slot('c-plan', planChart(p, mode, u.detUnit));
    var T = tatWidget(p); slot('c-tat', T.html); slot('c-tat-as', esc(T.as));
    slot('c-drill', drill(Object.assign({}, u, { path: p ? [p].concat((u.path || []).slice(1)) : u.path })));
    slot('c-exc', excBars(p));
  }
};
UI.on('wait-site', function (d) {
  var p = scopeOf(), calcs = FX.derive().calcs.filter(function (c) { return c.t.stage === 'AT CUSTOMER' && c.t.dest === d.arg && c.siteH > C.cost.freeHours && (!p || c.t.plant === p); }).sort(function (a, b) { return b.siteH - a.siteH; });
  UI.detail(d.arg, plural(calcs.length, 'truck') + ' past free time · ' + inr(U.sum(calcs, function (c) { return c.det; })) + ' accrued', function () { return UI.tripTable(calcs, { metricLabel: 'At site · detention', metric: function (c) { return hrs(c.siteH) + ' · ' + inr(c.det); } }); });
});
/* KPI tiles open the records behind them (one level). */
UI.on('kpi', function (d) {
  var p = scopeOf(), M = FX.metrics(p), dd = FX.derive();
  var where = p ? ' · ' + esc(ps(p)) : ' · all plants';
  var tk = function (list, title, sub) { UI.detail(title, sub, function () { return ticketList(list); }); };
  switch (d.arg) {
    case 'trips': UI.detail('Trips in cycle', n0(M.trips) + ' trips' + where, function () { return UI.tripTable(M.calcs.slice().sort(function (a, b) { return b.ageH - a.ageH; })); }); break;
    case 'disp': UI.detail('DIs still at the plant', n0(M.mtdTrips - M.dispatched) + ' of ' + n0(M.mtdTrips) + ' not yet dispatched' + where, function () { return UI.tripTable(M.atPlant.slice().sort(function (a, b) { return b.plantH - a.plantH; }), { metricLabel: 'Time at plant', metric: function (c) { return hrs(c.plantH); } }); }); break;
    case 'pod': tk(M.openTickets.filter(function (t) { return t.cat === 'ePOD Delay'; }), 'Open ePODs', n0(M.podOpen) + ' waiting' + where); break;
    case 'open': tk(M.openTickets, 'Open exceptions', n0(M.open) + where); break;
    case 'ev': tk(M.tickets.filter(function (t) { return t.phase === 'closed'; }), 'Closed on evidence', n0(M.closedEv) + where); break;
    case 'det': UI.detail('Detention this month', n0(M.detHours) + ' h · ' + inr(M.det) + ' of ' + inr(M.budget) + where, function () { return UI.tripTable(M.atCustomer.filter(function (c) { return c.det > 0; }).sort(function (a, b) { return b.det - a.det; }), { metricLabel: 'Detention', metric: function (c) { return hrs(c.detH) + ' · ' + inr(c.det); } }); }); break;
    case 'yard': UI.detail('Trucks at the plant', n0(M.atPlant.length) + where, function () { return UI.tripTable(M.atPlant.slice().sort(function (a, b) { return b.plantH - a.plantH; }), { metricLabel: 'Time at plant', metric: function (c) { return hrs(c.plantH); } }); }); break;
  }
});
function ticketList(list) {
  if (!list.length) return '<div class="empty">None.</div>';
  var rows = rankTickets(list).slice(0, 150);
  return '<div class="tsc"><table class="tbl"><tr><th>Vehicle · DI</th><th>Exception</th><th>Measure</th><th>Status</th></tr>' + rows.map(function (t) {
    return '<tr data-act="tk-open" data-arg="' + esc(t.id) + '"><td><b>' + esc(t.vehicle) + '</b><div class="muted" style="font-size:12px">' + esc(t.di) + ' · ' + esc(ps(t.plant)) + '</div></td><td>' + esc(t.cat) + '<div class="muted" style="font-size:12px">' + esc(t.sub || '') + '</div></td><td>' + esc(t.mText) + '</td><td><span class="pill ' + laneTone(t) + '">' + esc(t.status) + '</span></td></tr>';
  }).join('') + '</table></div>' + (list.length > rows.length ? '<p class="note">Showing ' + rows.length + ' of ' + n0(list.length) + ', highest priority first.</p>' : '');
}
UI.ticketList = ticketList;

/* Network map page (Logistics head and Control tower) */
function mapView(role) {
  return {
    layout: function () {
      return '<div class="g g32"><div class="card"><div class="ch"><h2>Network map</h2><span class="as">Colour: detention budget pace. Size: open exceptions. Select a plant.</span></div><div class="mapw" id="m-map"></div></div>' +
        '<div class="g" style="align-content:start">' + card('', '<span id="m-title"></span>', 'Open exceptions by reason', '<div id="m-detail"></div>') +
        card('', 'Plants', 'Highest pace first', '<div id="m-list"></div>') + '</div></div>';
    },
    update: function (u) {
      var R = FX.raw();
      if (!u.mapSel) u.mapSel = R.plants.slice().sort(function (a, b) { return FX.metrics(b).open - FX.metrics(a).open; })[0];
      slot('m-map', mapSvg(u.mapSel));
      slot('m-title', esc(ps(u.mapSel)));
      slot('m-detail', plantReasons(u.mapSel, u) + '<div style="margin-top:12px">' + (role === 'clo' ? '<button class="btn y sm" data-act="go" data-arg="home:plant=' + encodeURIComponent(u.mapSel) + ',scrollTo=sec-top">Open overview for this plant</button>' : '<button class="btn y sm" data-act="go" data-arg="home:qplant=' + encodeURIComponent(u.mapSel) + '">Show its tickets in the queue</button>') + '</div>');
      slot('m-list', hbars(R.plants.map(function (p) { var M = FX.metrics(p), tone = paceTone(M.pace); return { label: ps(p), value: M.open, text: n0(M.open) + ' open', color: tone === 'red' ? 'var(--rd)' : tone === 'amber' ? '#E6A800' : 'var(--gn)', act: 'map-plant', arg: p, pace: M.pace }; }).sort(function (a, b) { return b.pace - a.pace; })));
    }
  };
}
UI.views.clo.map = mapView('clo');
UI.views.ct.map = mapView('ct');

UI.views.clo.replay = {
  layout: function () { return card('', 'Trip replay', '', '<div id="f-body"></div>', '', 'One trip end to end: the plan (gate-out, arrival, free time) against what happened, then every agent call with its Hindi recording and transcript, every email and reply, human action, approval, check and closure, in time order. Press play to step through.'); },
  update: function (u) { UI.replay.render('f-body', u); }
};

/* =================== Plant head =================== */
function plantKpis(M) {
  var dispR = M.dispatched / Math.max(1, M.mtdTrips), Y = FX.yard(C.plantHeadPlant);
  return [
    { key: 'disp', label: 'Dispatched vs plan', value: n0(M.dispatched) + '/' + n0(M.mtdTrips), tone: dispR >= 0.9 ? 'green' : dispR >= 0.75 ? 'amber' : 'red', sub: pct(dispR) + ' of DIs raised this month have left', act: 'kpi', arg: 'disp' },
    { key: 'tat', label: 'In-plant time', value: n0(Y.avgH), unit: 'h', tone: Y.avgH * 60 > Y.totalNorm * 2 ? 'red' : Y.avgH * 60 > Y.totalNorm ? 'amber' : 'green', sub: 'Trucks at plant · norm ' + Y.totalNorm + ' min DI to gate-out', act: 'kpi', arg: 'yard' },
    { key: 'yard', label: 'Trucks at plant', value: n0(M.atPlant.length), sub: n0(Y.held.trips.length) + ' held beyond norm', act: 'kpi', arg: 'yard' },
    { key: 'det', label: 'Detention vs plant budget', value: inr(M.det), tone: paceTone(M.pace), sub: n0(M.detHours) + ' h · ' + pct(M.burn) + ' of ' + inr(M.budget), act: 'kpi', arg: 'det' },
    { key: 'open', label: 'Open exceptions', value: n0(M.open), tone: (M.lanes.action + M.lanes.followup) / Math.max(1, M.open) > 0.3 ? 'red' : 'green', sub: n0(M.lanes.ai + M.lanes.verify) + ' with agents · ' + n0(M.lanes.action + M.lanes.followup) + ' need a person', act: 'kpi', arg: 'open' }
  ];
}
/* Trucks at plant over the next hours: arrivals by hour-of-day minus the recent dispatch rate (last 72 h of DIs). */
function queueForecast(plant) {
  var d = FX.derive(), now = FX.now(), from = now - 72 * 3600000;
  var trips = d.calcs.filter(function (c) { return c.t.plant === plant; });
  var recent = trips.filter(function (c) { return c.t.start > from && c.t.start <= now; });
  var arrByHod = {}; recent.forEach(function (c) { var h = new Date(c.t.start + 19800000).getUTCHours(); arrByHod[h] = (arrByHod[h] || 0) + 1 / 3; });
  var depRate = recent.filter(function (c) { return c.t.stage !== 'AT PLANT'; }).length / 72;
  var yard = trips.filter(function (c) { return c.t.stage === 'AT PLANT'; }).length;
  var pts = [{ label: 'Now', v: yard, lo: yard, hi: yard }], cum = yard, varSum = 0;
  for (var i = 1; i <= 6; i++) {
    var hod = new Date(now + i * 3600000 + 19800000).getUTCHours(), a = arrByHod[hod] || 0;
    cum = Math.max(0, cum + a - depRate); varSum += a + depRate;
    var b = 1.28 * Math.sqrt(varSum);
    pts.push({ label: '+' + i + ' h', v: cum, lo: Math.max(0, cum - b), hi: cum + b });
  }
  return { pts: pts, arr: U.sum(Object.keys(arrByHod).map(function (k) { return arrByHod[k]; })) / 24, dep: depRate };
}
/* Dedicated fleet from this plant: where the trucks are now. */
UI.on('fleet', function (d) {
  var p = C.plantHeadPlant, dd = FX.derive(), trig = FX.state().guardrails['Customer Detention'].trigger;
  var ded = dd.calcs.filter(function (c) { return c.t.plant === p && FX.dedicated(c.t); });
  var f = { plant: function (c) { return c.t.stage === 'AT PLANT'; }, road: function (c) { return c.t.stage === 'IN TRANSIT'; }, site: function (c) { return c.t.stage === 'AT CUSTOMER' && !c.released; }, ret: function (c) { return c.t.stage === 'AT CUSTOMER' && c.released; } }[d.arg];
  var list = ded.filter(f), title = { plant: 'Dedicated trucks at the plant', road: 'Dedicated trucks loaded, to site', site: 'Dedicated trucks at site', ret: 'Dedicated trucks released' }[d.arg];
  UI.detail(title, plural(list.length, 'truck') + ' · ' + esc(ps(p)), function () { return UI.tripTable(list.sort(function (a, b) { return b.ageH - a.ageH; })); });
});
function chokeTiles(plant) {
  var M = FX.metrics(plant);
  var over = M.atPlant.filter(function (c) { return c.overNormH > 0; });
  var late = M.openTickets.filter(function (t) { return t.stage === 'In transit'; });
  var site = M.atCustomer.filter(function (c) { return c.siteH > C.cost.freeHours; });
  function top(list, key, val) { var g = {}; list.forEach(function (x) { var k = key(x); g[k] = (g[k] || 0) + val(x); }); return Object.keys(g).map(function (k) { return [k, g[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 3); }
  var tiles = [
    { k: 'plant', t: 'Plant-side', n: over.length, unit: 'trucks held beyond the ' + C.norms.loadingHours + ' h gate-out norm', lost: U.sum(over, function (c) { return c.overNormH; }), top: top(over, function (c) { return c.t.transporter; }, function (c) { return c.overNormH; }), lbl: 'transporters' },
    { k: 'transit', t: 'In transit', n: late.length, unit: 'open exceptions on the road', lost: U.sum(late, function (t) { return t.calc && t.calc.lateH > 0 ? t.calc.lateH : 0; }), top: top(late, function (t) { return t.transporter; }, function (t) { return t.calc && t.calc.lateH > 0 ? t.calc.lateH : 0; }), lbl: 'transporters' },
    { k: 'customer', t: 'Customer-side', n: site.length, unit: 'trucks past free time', lost: U.sum(site, function (c) { return c.siteH - C.cost.freeHours; }), top: top(site, function (c) { return c.t.dest; }, function (c) { return c.siteH - C.cost.freeHours; }), lbl: 'customers' }
  ];
  return '<div class="g g3">' + tiles.map(function (x) {
    return '<button class="chk" data-act="choke" data-arg="' + x.k + '"><span class="nm">' + x.t + '</span><span class="c">' + n0(x.n) + '</span><span class="u">' + x.unit + '</span><span class="u"><b>' + n0(x.lost) + ' h</b> lost</span>' +
      '<span class="tl">' + x.top.map(function (r) { return '<span class="r"><span class="k" title="' + esc(r[0]) + '">' + esc(r[0]) + '</span><b>' + n0(r[1]) + ' h</b></span>'; }).join('') + '</span><span class="u ft">Top ' + x.lbl + ' by hours lost</span></button>';
  }).join('') + '</div>';
}
UI.on('choke', function (d) {
  var M = FX.metrics(C.plantHeadPlant);
  if (d.arg === 'plant') UI.detail('Plant-side: held beyond norm', esc(ps(C.plantHeadPlant)), function () { return UI.tripTable(M.atPlant.filter(function (c) { return c.overNormH > 0; }).sort(function (a, b) { return b.overNormH - a.overNormH; }), { metricLabel: 'Over norm', metric: function (c) { return hrs(c.overNormH); } }); });
  if (d.arg === 'transit') UI.detail('In transit exceptions', esc(ps(C.plantHeadPlant)), function () { return ticketList(M.openTickets.filter(function (t) { return t.stage === 'In transit'; })); });
  if (d.arg === 'customer') UI.detail('Customer-side: past free time', esc(ps(C.plantHeadPlant)), function () { return UI.tripTable(M.atCustomer.filter(function (c) { return c.siteH > C.cost.freeHours; }).sort(function (a, b) { return b.siteH - a.siteH; }), { metricLabel: 'At site · detention', metric: function (c) { return hrs(c.siteH) + ' · ' + inr(c.det); } }); });
});
UI.on('det-by', function (d) {
  var parts = d.arg.split('|'), key = parts[0], v = parts.slice(1).join('|'), M = FX.metrics(C.plantHeadPlant);
  var list = M.calcs.filter(function (c) { return c.det > 0 && (key === 'dest' ? c.t.dest : c.t.transporter) === v; }).sort(function (a, b) { return b.det - a.det; });
  UI.detail(v, 'Detention on trucks in cycle · ' + inr(U.sum(list, function (c) { return c.det; })) + ' on ' + plural(list.length, 'truck'), function () { return UI.tripTable(list, { metricLabel: 'Detention', metric: function (c) { return hrs(c.detH) + ' · ' + inr(c.det); } }); });
});
UI.views.plant.home = {
  layout: function () {
    return '<div class="kpis" id="k-plant"></div>' +
      card('', 'In-plant turnaround, stage by stage', '<span id="p-tat-as"></span>', '<div id="p-tat"></div>', '', 'Trucks inside the plant now, by stage from reporting to gate-out. Each tile shows trucks in the stage and their average time in it against the stage norm. Trucks past the full DI-to-gate-out norm count as held beyond norm. Select a stage for its trucks.') +
      '<div class="g g2 mt">' + card('pc-cards', 'Decisions for you', '<span id="p-dec-n"></span>', '<div id="p-dec"></div>', '', APR_TIP + ' Plant head: holding dispatch to a customer, alternate unloading sites, replacement trucks, diversion routes and weighbridge re-weighs.') +
      card('', 'Dedicated fleet from this plant', '', '<div id="p-fleet"></div>', '', 'Trucks attached to this plant on dedicated contracts and where each one is now: at the plant, on the road, at a customer or returning. Select a group for its trucks.') + '</div>' +
      '<div class="g g2 mt">' + card('', 'Trucks at plant, next 6 hours', '<span id="p-q-as"></span>', '<div class="chart" id="p-q"></div>', '', 'Projected trucks inside the plant for the next six hours: today\'s DI arrivals per hour minus the dispatch rate of the last three hours. The band covers 80% of expected variation.') +
      card('', 'Choke points', '', '<div id="p-choke"></div>', '', 'Where hours are being lost now: trucks past the loading norm at the plant, delay and route exceptions on the road, and trucks past free time at customers. The top names are ranked by hours lost. Select a tile for the trucks.') + '</div>' +
      '<div class="g g2 mt">' + card('', 'Dispatch plan vs actual', '', '<div id="p-disp"></div>', '', 'DIs raised each day (plan) against DIs that left the plant. Earlier days come from the dispatch ledger, today from live trips. Select a day for its DIs.') +
      card('', 'Detention by day', '', '<div id="p-det"></div>', '<div class="seg" id="p-tog"></div>', 'Chargeable truck-hours beyond the ' + C.cost.freeHours + ' h free time per day, or the ₹ value at the contracted rate. The dotted line is the plant\'s daily budget. Select a day for the trucks.') + '</div>' +
      '<div class="g g2 mt">' + card('', 'Detention by customer, trucks in cycle', '', '<div id="p-cust"></div>', '', 'Detention accrued on this plant\'s trucks still in cycle (not yet released), by customer site. Month-to-date totals for released trucks are in Detention by day. Hover for hours; select a customer for the trucks.') +
      card('', 'Detention by transporter, trucks in cycle', '', '<div id="p-tr"></div>', '', 'Detention accrued on this plant\'s trucks still in cycle (not yet released), by transporter. Hover for hours; select a transporter for the trucks.') + '</div>';
  },
  update: function (u) {
    var p = C.plantHeadPlant, M = FX.metrics(p);
    kpiStrip('k-plant', plantKpis(M));
    var T = tatWidget(p); slot('p-tat', T.html); slot('p-tat-as', esc(T.as));
    slot('p-fleet', fleetWidget(p));
    var q = queueForecast(p);
    slot('p-q', lineSmall(q.pts)); slot('p-q-as', q.arr.toFixed(1) + ' in / ' + q.dep.toFixed(1) + ' out per hour');
    slot('p-choke', chokeTiles(p));
    var ap = FX.approvals('plant', p); slot('p-dec-n', ap.length ? ap.length + ' pending' : '');
    slot('p-dec', approvalsHtml('plant', p, u));
    function detBy(key) { var g = {}; M.calcs.forEach(function (c) { if (c.det > 0) { var k = key === 'dest' ? c.t.dest : c.t.transporter; g[k] = g[k] || { rs: 0, h: 0 }; g[k].rs += c.det; g[k].h += c.detH; } }); return Object.keys(g).map(function (k) { return { label: k, value: g[k].rs, text: inr(g[k].rs), title: k + ' · ' + n0(g[k].h) + ' h', color: 'var(--am)', act: 'det-by', arg: key + '|' + k }; }).sort(function (a, b) { return b.value - a.value; }).slice(0, 8); }
    slot('p-cust', hbars(detBy('dest'), { empty: 'No detention this month.' }));
    slot('p-tr', hbars(detBy('tr'), { empty: 'No detention this month.' }));
    slot('p-disp', planChart(p, 'disp', null, true));
    slot('p-tog', '<button data-act="det-unit" data-arg="h" class="' + (u.detUnit !== 'rs' ? 'on' : '') + '">Hours</button><button data-act="det-unit" data-arg="rs" class="' + (u.detUnit === 'rs' ? 'on' : '') + '">₹ value</button>');
    slot('p-det', planChart(p, 'det', u.detUnit, true));
  }
};
UI.views.plant.trips = { layout: function () { return tripsLayout(); }, update: function (u) { tripsUpdate(u, C.plantHeadPlant); } };

/* =================== Trips table =================== */
function tripsLayout() { return card('', 'Trips in cycle', 'Filter, sort and open any row', '<div id="tt-f"></div><div id="tt-b"></div>'); }
function tripsUpdate(u, plant) {
  var d = FX.derive(), tf = u.tf = u.tf || { sort: 'age', dir: -1, limit: 80 };
  var calcs = d.calcs.filter(function (c) { return (!plant || c.t.plant === plant) && (!tf.plant || c.t.plant === tf.plant); });
  var tk = {}; d.tickets.forEach(function (t) { if (!tk[t.di] || (tk[t.di].phase === 'closed' && t.phase !== 'closed') || (t.phase !== 'closed' && t.score > tk[t.di].score)) tk[t.di] = t; });
  var transporters = Array.from(new Set(calcs.map(function (c) { return c.t.transporter; }))).sort();
  function sel(k, opts, v) { return '<select data-chg="tf" data-k="' + k + '">' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + ((v || '') === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'; }
  slot('tt-f', '<div class="qtools"><input placeholder="Search DI, vehicle, destination" data-chg="tf" data-k="q" value="' + esc(tf.q || '') + '">' +
    (plant ? '' : sel('plant', [['', 'All plants']].concat(FX.raw().plants.map(function (p) { return [p, ps(p)]; })), tf.plant)) +
    sel('stage', [['', 'All stages'], ['AT PLANT', 'At plant'], ['IN TRANSIT', 'In transit'], ['AT CUSTOMER', 'At customer']], tf.stage) +
    sel('type', [['', 'All exception types'], ['open', 'Any open exception'], ['none', 'No exception']].concat(CATS.map(function (c) { return [c, c]; })), tf.type) +
    sel('transporter', [['', 'All transporters']].concat(transporters.map(function (x) { return [x, x]; })), tf.transporter) + '</div>');
  var rows = calcs.filter(function (c) {
    var t = c.t, x = tk[t.di];
    if (tf.stage && t.stage !== tf.stage) return false;
    if (tf.transporter && t.transporter !== tf.transporter) return false;
    if (tf.type === 'none' && x && x.phase !== 'closed') return false;
    if (tf.type === 'open' && !(x && x.phase !== 'closed')) return false;
    if (tf.type && CATS.indexOf(tf.type) >= 0 && !d.tickets.some(function (y) { return y.di === t.di && y.cat === tf.type && y.phase !== 'closed'; })) return false;
    if (tf.q) { var q = tf.q.toLowerCase(); if ((t.di + ' ' + t.vehicle + ' ' + t.dest + ' ' + t.transporter).toLowerCase().indexOf(q) < 0) return false; }
    return true;
  });
  var key = { di: function (c) { return c.t.di; }, veh: function (c) { return c.t.vehicle; }, pl: function (c) { return c.t.plant; }, tr: function (c) { return c.t.transporter; }, dest: function (c) { return c.t.dest; }, stage: function (c) { return c.t.stage; }, age: function (c) { return c.ageH; }, det: function (c) { return c.det; } }[tf.sort] || function (c) { return c.ageH; };
  rows.sort(function (a, b) { var A = key(a), B = key(b); return (A > B ? 1 : A < B ? -1 : 0) * tf.dir; });
  var cols = [['di', 'DI'], ['veh', 'Vehicle'], ['pl', 'Plant'], ['tr', 'Transporter'], ['dest', 'Destination'], ['stage', 'Stage'], ['age', 'In cycle'], [null, 'Timing'], ['det', 'Detention'], [null, 'Exception']];
  var shown = rows.slice(0, tf.limit);
  slot('tt-b', '<div class="muted" style="font-size:12.5px;margin-bottom:6px">' + n0(rows.length) + ' trips</div><div class="tsc"><table class="tbl"><tr>' + cols.map(function (c) { return '<th' + (c[0] ? ' data-act="tsort" data-arg="' + c[0] + '"' : '') + ' class="' + (c[0] ? 's ' : '') + (/age|det/.test(c[0]) ? 'r ' : '') + (tf.sort === c[0] ? 'on' : '') + '">' + c[1] + (tf.sort === c[0] ? (tf.dir > 0 ? ' ↑' : ' ↓') : '') + '</th>'; }).join('') + '</tr>' +
    shown.map(function (c) { var t = c.t, x = tk[t.di]; return '<tr data-act="trip" data-arg="' + esc(t.di) + '"><td class="n">' + esc(t.di) + '</td><td><b>' + esc(t.vehicle) + '</b></td><td>' + esc(ps(t.plant)) + '</td><td style="font-size:12.5px">' + esc(t.transporter) + '</td><td>' + esc(t.dest) + '</td><td>' + esc(t.stage) + '</td><td class="r">' + hrs(c.ageH) + '</td><td>' + UI.tripTiming(c) + '</td><td class="r">' + inr(c.det) + '</td><td>' + (x ? '<span class="pill ' + laneTone(x) + '">' + esc(x.cat) + ' · ' + esc(x.status) + '</span>' : '') + '</td></tr>'; }).join('') +
    '</table></div>' + (rows.length > tf.limit ? '<button class="fxmore" data-act="tmore">Show ' + Math.min(80, rows.length - tf.limit) + ' more</button>' : ''));
}
UI.on('tf', function (d, el) { var u = uiFor(session().role); u.tf[d.k] = el.value; u.tf.limit = 80; saveUi(); render(); });
UI.on('tsort', function (d) { var u = uiFor(session().role); if (u.tf.sort === d.arg) u.tf.dir *= -1; else { u.tf.sort = d.arg; u.tf.dir = -1; } saveUi(); render(); });
UI.on('tmore', function () { var u = uiFor(session().role); u.tf.limit += 80; saveUi(); render(); });

/* =================== Control tower =================== */
var AGENT_DESC = { 'Route Deviation': 'Calls the driver when the truck leaves the approved corridor', 'In-transit Delay': 'Asks the transporter for a revised ETA', 'Customer Detention': 'Gets an unloading time from the site', 'Unloading Detection': 'Confirms unloading against the gate', 'ePOD Delay': 'Chases the signed POD' };
UI.views.ct.home = {
  layout: function () {
    return '<div class="shift" id="t-shift"></div>' +
      card('', 'AI agents on shift', '', '<div class="agents" id="t-ag"></div>', '', 'One agent per exception type. Each picks up a ticket when it crosses the pick-up threshold the logistics head sets in Priority & guardrails, calls the driver, transporter or site in Hindi, emails where needed, and hands the case to you at the follow-up threshold or when a call fails.') +
      '<div class="ops mt"><div class="card"><div class="ch"><h2>Cases that need a person' + info('Open exceptions agents could not settle: past the follow-up threshold, a failed or refused call, or a commitment missed. Ranked by priority score (value at risk, then SLA age, then repeat offender); #1 is the case to work first. Grouped by exception type. Use Approval to send a case to the plant head or logistics head when the fix is outside your authority.') + '</h2><span class="as" id="t-qas"></span></div><div id="t-q" style="margin-top:8px"></div></div>' +
      '<div class="g" style="align-content:start"><div id="t-feedc"></div>' +
      '<div class="card"><div class="ch"><h2>Sent for approval' + info('Cases you sent to the plant head or logistics head, with their decision. Approved cases move to verification; rejected cases return to your queue with the reason.') + '</h2><span class="as" id="t-sent-n"></span></div><div id="t-sent" style="margin-top:8px"></div></div>' +
      '<div class="card"><div class="ch"><h2>Actioned, awaiting verification' + info('Cases where an agent or a person has acted. Each closes itself only when every check is met: GPS shows the truck moving or released, the site or sales confirm, the POD matches. Checks show their due time.') + '</h2></div><div id="t-vf" style="margin-top:10px"></div></div>' +
      '<div class="card"><div class="ch"><h2>What the agents and team just did</h2></div><div style="padding:8px 0 4px"><ul class="feed" id="t-feed"></ul></div></div></div></div>';
  },
  update: function (u) {
    var M = FX.metrics(null), S = FX.state();
    var ai = M.lanes.ai + M.lanes.verify, you = M.lanes.action + M.lanes.followup, tot = Math.max(1, ai + you);
    var sent = FX.requestsFrom(), pend = sent.filter(function (r) { return r.status === 'pending'; }).length;
    slot('t-sent-n', pend ? pend + ' awaiting decision' : '');
    slot('t-sent', sent.length ? sent.slice(0, u.slim || 6).map(function (r) {
      var st = r.status === 'pending' ? '<span class="pill p-y">Awaiting ' + esc(r.to === 'plant' ? 'plant head' : 'logistics head') + '</span>' : r.status === 'approved' ? '<span class="pill p-gn">Approved</span>' : '<span class="pill p-rd">Rejected</span>';
      return '<div class="sent" data-act="tk-open" data-arg="' + esc(r.tickets[0]) + '"><div><b>' + esc(C.approvalTypes[r.type].label) + '</b><div class="muted" style="font-size:12px">' + esc(r.title.split(' · ').pop()) + ' · ' + esc(ps(r.plant)) + ' · ' + U.fmtTime(FX.timeOf(r.at)) + (r.status !== 'pending' ? ' · ' + esc(r.decidedBy) + (r.comment ? ': ' + esc(r.comment) : '') : '') + '</div></div>' + st + '</div>';
    }).join('') : '<div class="empty" style="padding:14px 16px">No cases sent for approval this shift.</div>');
    slot('t-shift', [['Plant / loading', M.stageCounts.Plant, 'trucks held beyond norm'], ['In transit', M.stageCounts['In transit'], 'open exceptions'], ['Unloading', M.stageCounts.Unloading, 'open exceptions'], ['ePOD', M.stageCounts.ePOD, 'open exceptions']]
      .map(function (s) { return '<div><div class="l">' + s[0] + '</div><div class="v">' + n0(s[1]) + '</div><div class="d">' + s[2] + '</div></div>'; }).join('') +
      '<div><div class="l">Handled by AI agents vs needs you</div><div class="split"><i style="width:' + (ai / tot * 100) + '%;background:var(--ai)"></i><i style="width:' + (you / tot * 100) + '%;background:var(--rd)"></i></div>' +
      '<div class="d" style="display:flex;justify-content:space-between"><span><b style="color:var(--ai);font-size:15px">' + pct(ai / tot) + '</b> agents · ' + n0(ai) + '</span><span><b style="color:var(--rd);font-size:15px">' + pct(you / tot) + '</b> you · ' + n0(you) + '</span></div>' +
      '<div class="d" style="margin-top:4px">Trips with issues ' + n0(M.tripsWithIssues) + ' = agents ' + n0(M.tripsMonitored) + ' + awaiting action ' + n0(M.tripsAwaiting) + '</div></div>');
    var d = FX.derive();
    slot('t-ag', Object.keys(S.guardrails).map(function (cat) {
      var g = S.guardrails[cat], list = d.tickets.filter(function (t) { return t.cat === cat; });
      var withAg = list.filter(function (t) { return t.phase === 'verify' || (t.phase === 'open' && t.lane === 'ai'); }).length, needs = list.filter(function (t) { return t.phase === 'open' && t.lane !== 'ai'; }).length, closed = list.filter(function (t) { return t.phase === 'closed'; }).length;
      return '<div class="ag"><div class="nm"><i' + (g.active ? '' : ' class="off"') + '></i>' + esc(cat) + '</div><div class="ds">' + esc(AGENT_DESC[cat]) + '</div><div class="st2"><span>With agent <b>' + n0(withAg) + '</b></span><span>You <b>' + n0(needs) + '</b></span><span>Closed <b>' + n0(closed) + '</b></span></div></div>';
    }).join(''));
    queueHtml(u, M);
    var vf = M.openTickets.filter(function (t) { return t.phase === 'verify'; }).sort(function (a, b) { return (b.o.since || 0) - (a.o.since || 0); });
    var vlim = u.vlim || 8;
    slot('t-vf', (vf.slice(0, vlim).map(function (t) {
      var o = t.o || {}, via = o.via === 'agent' && o.reason === 'Agent call' ? 'Agent call' : { manual: 'Manual update', call: 'Call logged', approval: 'Approved action', agent: 'Agent email' }[o.via] || 'Action';
      return '<div class="vf"><div><b>' + esc(t.vehicle) + '</b> <span class="muted">· ' + esc(t.cat) + ' · ' + esc(t.dest) + '</span><div class="muted" style="font-size:12px">' + via + (o.actor ? ' by ' + esc(o.actor) : '') + ' at ' + U.fmtTime(FX.timeOf(o.since || 0)) + '</div>' +
        '<ul class="ev">' + (o.criteria || []).map(function (c) { return '<li class="' + (c.met ? 'ok' : '') + '" title="' + esc(c.note || (c.due != null ? 'Check at ' + U.fmtTime(FX.timeOf(c.due)) : 'Waiting')) + '"><span class="bx">' + (c.met ? ICON.tick : '') + '</span>' + esc(c.label) + (c.met ? '' : c.due != null ? ' · ' + U.fmtTime(FX.timeOf(c.due)) : '') + '</li>'; }).join('') + '</ul></div>' +
        '<button class="btn sm" data-act="tk-open" data-arg="' + esc(t.id) + '" data-tab="' + (FX.thread(t.id) ? 'responses' : 'audit') + '">Open</button></div>';
    }).join('') || '<div class="empty" style="padding:14px 16px">Nothing being verified.</div>') + (vf.length > vlim ? '<button class="fxmore" data-act="vmore">Show ' + (vf.length - vlim) + ' more</button>' : ''));
    var agentClosed = M.tickets.filter(function (t) { return t.phase === 'closed' && t.o && t.o.via !== 'manual' && t.o.via !== 'call'; }).length;
    slot('t-feedc', '<div class="feedc"><div class="s">Live</div><div class="v">' + n0(ai + agentClosed) + '</div><div class="s">handled by AI agents · ' + n0(M.lanes.ai) + ' working, ' + n0(M.lanes.verify) + ' verifying, ' + n0(agentClosed) + ' closed</div></div>');
    var last = u.feedSeen || 0;
    slot('t-feed', S.events.filter(function (e) { return e.kind !== 'config'; }).slice().sort(function (a, b) { return b.t - a.t; }).slice(0, 25).map(function (e) {
      return '<li class="' + (e.t > last ? 'new' : '') + '"' + (e.ticket ? ' data-act="tk-open" data-arg="' + esc(e.ticket) + '"' : '') + '><span class="t">' + U.fmtTime(FX.timeOf(e.t)) + '</span><span><b>' + esc(e.actor) + '</b> · ' + esc(e.text) + '</span></li>';
    }).join(''));
    u.feedSeen = S.clockMin;
  }
};
/* One ranked queue of cases that need a person, grouped by reason (exception type). */
UI.on('qgrp', function (d) { var u = uiFor('ct'); u.gopen = u.gopen || {}; u.gopen[d.arg] = d.el.getAttribute('data-open') !== '1'; saveUi(); render(); });
UI.on('qlim', function (d) { var u = uiFor('ct'); u.glim = u.glim || {}; u.glim[d.arg] = (u.glim[d.arg] || 10) + 20; saveUi(); render(); });
UI.on('gshow', function () { var u = uiFor('ct'); u.gshow = (u.gshow || 2) + 5; saveUi(); render(); });
UI.on('qplant', function (d) { var u = uiFor('ct'); u.qplant = d.arg || null; saveUi(); render(); });
UI.on('vmore', function () { var u = uiFor('ct'); u.vlim = (u.vlim || 8) + 20; saveUi(); render(); });
UI.views.ct.trips = { layout: function () { return tripsLayout(); }, update: function (u) { tripsUpdate(u, null); } };

/* =================== Priority & guardrails =================== */
UI.views.ct.guardrails = {
  layout: function () {
    return card('', 'Agent thresholds', '', '<div id="gr-body"></div>', '', 'Per exception type: when the agent picks a ticket up, when a person follows up, and when it escalates. Changes apply to every login at once and re-sort the queues.') +
      '<div class="mt">' + card('', 'Value-based priority', '', '<div id="gr-w"></div>', '', 'Score = weighted share of the highest value at risk, the longest SLA age and the repeat-offender flag (transporter with ' + C.repeatOffender.minOpen + '+ open cases). Red at ' + C.priority.redAt + ', amber at ' + C.priority.amberAt + '. The control tower queue is ranked by this score.') + '</div>';
  },
  update: function (u) {
    var S = FX.state(), d = FX.derive();
    u.prev = u.prev || {};
    slot('gr-body', Object.keys(S.guardrails).map(function (cat) {
      var g = S.guardrails[cat], all = d.all.filter(function (t) { return t.cat === cat && t.phase === 'open'; });
      var picked = all.filter(function (t) { return t.picked; });
      var c = { ai: 0, followup: 0, action: 0 }; picked.forEach(function (t) { c[t.lane]++; });
      var prev = u.prev[cat], delta = prev != null && prev !== picked.length ? '<span class="delta ' + (picked.length > prev ? 'up' : 'dn') + '">' + (picked.length > prev ? '+' : '') + (picked.length - prev) + '</span>' : '';
      var unit = g.unit === '%' ? '%' : g.unit === 'h' ? 'hours' : 'minutes';
      function inp(k, lbl) { return g[k] == null ? '<div></div>' : '<div><label>' + lbl + ' (' + unit + ')</label><input type="number" min="0" step="1" value="' + g[k] + '" data-chg="gr" data-arg="' + esc(cat) + '" data-k="' + k + '"></div>'; }
      return '<div class="gr"><div class="nm"><b>' + esc(cat) + ' agent</b><span>' + esc(g.measure) + '</span><div style="margin-top:6px;display:flex;align-items:center;gap:8px;font-size:12px"><button class="sw ' + (g.active ? 'on' : '') + '" data-act="gr-act" data-arg="' + esc(cat) + '" aria-label="Agent on or off"></button>' + (g.active ? 'Active' : 'Paused') + '</div></div>' +
        inp('trigger', 'Pick up at') + inp('followUp', 'Person follows up at') + inp('escalation', 'Escalate at') +
        '<div><label>Picked up now ' + delta + '</label><div class="pick"><b style="font-size:20px;font-stretch:115%">' + n0(picked.length) + '</b><span class="muted" style="font-size:12px">of ' + n0(all.length) + ' candidates</span></div><div class="pick" style="margin-top:4px"><span class="pill p-ai">' + c.ai + ' agent</span><span class="pill p-y">' + c.followup + ' follow up</span><span class="pill p-rd">' + c.action + ' action</span></div></div></div>';
    }).join(''));
    var W = S.weights, open = d.tickets.filter(function (t) { return t.phase === 'open'; });
    var pr = { red: 0, amber: 0, green: 0 }; open.forEach(function (t) { pr[t.prio]++; });
    slot('gr-w', [['rupees', 'Value at risk'], ['sla', 'SLA age'], ['repeat', 'Repeat offender']].map(function (w) {
      return '<div class="wt"><span>' + w[1] + '</span><input type="range" min="0" max="1" step="0.05" value="' + W[w[0]] + '" data-chg="wt" data-k="' + w[0] + '"><b class="n">' + W[w[0]].toFixed(2) + '</b></div>';
    }).join('') +
      '<div class="chips" style="margin-top:8px"><span class="pill p-rd">' + pr.red + ' red</span><span class="pill p-y">' + pr.amber + ' amber</span><span class="pill p-gn">' + pr.green + ' green</span></div>');
  }
};
UI.on('gr', function (d, el) { snapPrev(); var v = Math.max(0, Number(el.value) || 0); el.blur(); FX.setGuardrail(d.arg, d.k, v); });
UI.on('gr-act', function (d) { snapPrev(); FX.setGuardrail(d.arg, 'active', !FX.state().guardrails[d.arg].active); });
UI.on('wt', function (d, el) { FX.setWeight(d.k, Number(el.value)); });

/* Control tower: send a case for approval to the plant head or logistics head. */
UI.on('apr-new', function (d) {
  var t = FX.ticket(d.arg); if (!t) return;
  var types = FX.approvalTypesFor(t.cat); if (!types.length) return;
  var u = uiFor('ct'); u.af = { id: t.id, type: types[0].key, note: '' }; saveUi();
  UI.detail('Send for approval', esc(t.vehicle) + ' · ' + esc(t.cat) + ' · ' + esc(ps(t.plant)) + ' → ' + esc(t.dest), function () {
    var f = uiFor('ct').af || {}, tt = FX.approvalTypesFor(t.cat), cur = tt.find(function (x) { return x.key === f.type; }) || tt[0];
    return '<div class="form"><label>Decision needed<select data-chg="af-type">' + tt.map(function (x) { return '<option value="' + x.key + '"' + (x.key === cur.key ? ' selected' : '') + '>' + esc(x.label) + '</option>'; }).join('') + '</select></label>' +
      '<div class="who2">Goes to <b>' + esc(cur.approver) + '</b></div>' +
      '<label>Note for the approver<textarea rows="4" data-inp="af-note" placeholder="What you have tried and why this needs approval">' + esc(f.note || '') + '</textarea></label>' +
      '<div class="sec">Case</div><dl class="kv2"><dt>DI</dt><dd>' + esc(t.di) + '</dd><dt>Transporter</dt><dd>' + esc(t.transporter) + '</dd><dt>Position</dt><dd>' + esc(t.mText) + '</dd><dt>SLA age</dt><dd>' + hrs(t.slaH) + '</dd>' + (t.tx ? '<dt>Last call</dt><dd>' + esc(t.tx.outcome || '') + '</dd>' : '') + '</dl>' +
      '<div class="bt" style="display:flex;gap:8px;margin-top:16px"><button class="btn y" data-act="af-send">Send for approval</button><button class="btn" data-act="dr-close">Cancel</button></div></div>';
  });
});
UI.on('af-type', function (d, el) { var u = uiFor('ct'); u.af.type = el.value; saveUi(); if (UI.detailOpen) UI.detailOpen.refresh(); });
UI.on('af-note', function (d, el) { var u = uiFor('ct'); u.af.note = el.value; saveUi(); });
UI.on('af-send', function () {
  var u = uiFor('ct'), f = u.af; if (!f) return;
  var id = FX.requestApproval(f.id, f.type, (f.note || '').trim(), session().name);
  u.af = null; saveUi(); UI.closeDetail && UI.closeDetail();
  if (id && window.__FXBridge) window.__FXBridge.toast('Sent to ' + FX.approverOf(f.type) + ' · ' + id);
});

/* =================== Trip replay =================== */
UI.replay = {};
var rpTimer = null, rpAudio = null;
function defaultReplayTrip() {
  var d = FX.derive(), S = FX.state();
  var best = null, bestScore = -1;
  d.all.forEach(function (t) {
    if (t.src !== 'case' || !t.tx || t.tx.noAnswer) return;
    if (['Route Deviation', 'Customer Detention', 'ePOD Delay'].indexOf(t.cat) < 0) return;
    var th = S.emails[t.id]; if (!th || th.length < 2) return;
    var score = th.length * 10 + S.events.filter(function (e) { return e.di === t.di; }).length + (t.cat === 'Customer Detention' ? 5 : 0);
    if (score > bestScore) { bestScore = score; best = t.di; }
  });
  return best || (d.tickets[0] && d.tickets[0].di);
}
function replaySteps(di) {
  var d = FX.derive(), S = FX.state(), c = d.calcByDi[di]; if (!c) return [];
  var t = c.t, steps = [];
  var actual = t.stage === 'AT PLANT' ? 'Still at plant · ' + hrs(c.plantH) + ' since DI' : t.stage === 'IN TRANSIT' ? (c.lateH > 0 ? 'In transit · ' + hrs(c.lateH) + ' behind plan' : 'In transit · on plan') : 'At customer · ' + hrs(c.siteH) + ' on site';
  steps.push({ ms: t.start, kind: 'plan', title: 'DI ' + t.di + ' raised at ' + ps(t.plant), html: '<div class="rp-pv"><div><span class="muted">Planned gate-out</span><br><b>' + U.fmtDT(c.gateOut) + '</b></div><div><span class="muted">Planned arrival</span><br><b>' + U.fmtDT(c.arrival) + '</b></div><div><span class="muted">Free time ends</span><br><b>' + U.fmtDT(c.freeEnds) + '</b></div><div><span class="muted">Actual now</span><br><b>' + esc(actual) + '</b></div></div>' });
  if (t.stage !== 'AT PLANT') steps.push({ ms: c.gateOut, kind: 'plan', title: 'Planned gate-out', html: '<div class="meta">Lead ' + t.km + ' km at ' + C.norms.transitKmPerDay + ' km a day</div>' });
  if (t.stage === 'AT CUSTOMER') steps.push({ ms: c.arrival, kind: 'plan', title: 'Planned arrival at ' + t.dest, html: '<div class="meta">Detention starts after ' + C.cost.freeHours + ' h of free time</div>' });
  if (t.stage === 'AT CUSTOMER' && c.siteH > C.cost.freeHours) steps.push({ ms: c.freeEnds, kind: 'detect', title: 'Free time over · detention charging', html: '<div class="meta">' + inr(c.det) + ' accrued so far at ₹' + n0(C.cost.ratePerDay) + ' a day</div>' });
  var tickets = d.all.filter(function (x) { return x.di === di; });
  var caseById = {}; S.ct.cases.forEach(function (cs) { caseById[cs.id] = cs; });
  S.events.filter(function (e) { return e.di === di; }).forEach(function (e) {
    var ms = FX.timeOf(e.t), html = '<div class="meta">' + esc(e.actorType) + ' · ' + esc(e.actor) + '</div>', title = e.text;
    var tx = null;
    if (e.kind === 'call' && e.lib) tx = FX.txFor({ trip: t }, e.lib, e.eta);
    else if (e.kind === 'call' && e.caseId && caseById[e.caseId]) { var a = caseById[e.caseId].auditTrail.find(function (x) { return x.transcript; }); if (a) tx = a.transcript; }
    if (tx) {
      title = 'AI call · ' + tx.party + ' · ' + tx.language;
      html += '<div class="rp-audio"><button class="btn sm" data-act="rp-audio" data-arg="' + esc(tx.audio || e.cat) + '" data-lib="' + (tx.audio ? 1 : 0) + '">Play recording</button><progress max="1" value="0"></progress>' + (tx.duration ? '<span class="muted n" style="font-size:12px">' + Math.floor(tx.duration / 60) + ':' + ('0' + Math.round(tx.duration % 60)).slice(-2) + '</span>' : '') + '</div>' +
        '<div class="rp-tx">' + tx.lines.map(function (l, i) { return '<p data-i="' + i + '"' + (l.t != null ? ' data-t="' + l.t + '"' : '') + '><em>' + esc(l.speaker) + '</em>' + esc(l.text || l.translation) + (l.text && l.translation && l.text !== l.translation ? '<span class="tr">' + esc(l.translation) + '</span>' : '') + '</p>'; }).join('') + '</div>' +
        '<div class="meta" style="margin-top:6px"><b>Outcome</b> · ' + esc(tx.outcome || FX.readTranscript(tx).outcome) + '</div>';
    }
    if ((e.kind === 'email' || e.kind === 'reply' || e.kind === 'eta') && e.ticket && S.emails[e.ticket]) {
      if (e.kind === 'eta') title = 'Revised ETA sent to site and sales';
      var msg = S.emails[e.ticket].filter(function (m) { return Math.abs(Date.parse(m.receivedAt) - ms) < 61000 && (e.kind !== 'reply' ? m.fromEmail === C.agentEmail.address : m.fromEmail !== C.agentEmail.address); })[0];
      if (msg) html += '<div class="rp-mail"><b>' + esc(msg.fromName || msg.fromEmail) + '</b> → ' + esc(msg.toEmails) + '\n' + esc(msg.messageText.split('\n\nOn ')[0]) + '</div>' + (msg.actionNote && e.kind === 'reply' ? '<div class="meta" style="margin-top:4px"><b>' + esc(msg.actionNote) + '</b></div>' : '');
    }
    steps.push({ ms: ms, kind: e.kind, title: title, html: html });
  });
  tickets.forEach(function (x) {
    if (x.phase === 'verify') steps.push({ ms: FX.now(), kind: 'verify', title: 'Now · verifying ' + x.cat.toLowerCase(), html: '<ul class="ev">' + x.o.criteria.map(function (cc) { return '<li class="' + (cc.met ? 'ok' : '') + '"><span class="bx">' + (cc.met ? ICON.tick : '') + '</span>' + esc(cc.label) + '</li>'; }).join('') + '</ul>' });
    else if (x.phase === 'open' && x.visible) steps.push({ ms: FX.now(), kind: 'detect', title: 'Now · ' + x.status + ' · ' + x.cat, html: '<div class="meta">' + esc(x.mText) + (x.acc ? ' · ' + inr(x.acc) + ' detention accrued' : '') + (x.rs ? ' · ' + inr(x.rs) + ' more expected before release' : '') + '</div>' });
  });
  steps.sort(function (a, b) { return a.ms - b.ms; });
  return steps;
}
UI.replay.render = function (slotId, u) {
  var S = FX.state(), d = FX.derive();
  if (!u.rpTrip || !d.calcByDi[u.rpTrip]) u.rpTrip = defaultReplayTrip();
  var di = u.rpTrip, c = d.calcByDi[di];
  if (!c) { slot(slotId, '<div class="empty">No trips to replay.</div>'); return; }
  var steps = replaySteps(di), t = c.t;
  var withEv = {}; S.events.forEach(function (e) { if (e.di) withEv[e.di] = (withEv[e.di] || 0) + 1; });
  var opts = Object.keys(withEv).filter(function (k) { return d.calcByDi[k]; }).sort(function (a, b) { return withEv[b] - withEv[a]; }).slice(0, 80);
  if (opts.indexOf(di) < 0) opts.unshift(di);
  var html = '<div class="rp"><div class="rp-side"><select class="rp-pick" data-chg="rp-trip">' + opts.map(function (k) { var x = d.calcByDi[k].t; return '<option value="' + esc(k) + '"' + (k === di ? ' selected' : '') + '>' + esc(x.vehicle + ' · DI ' + k) + '</option>'; }).join('') + '</select>' +
    '<div class="facts">' + [['Vehicle', t.vehicle], ['Driver', t.driver], ['Transporter', t.transporter], ['Plant', ps(t.plant)], ['Destination', t.dest], ['Lead', t.km + ' km'], ['Stage', t.stage], ['Detention', inr(c.det)]].map(function (r) { return '<div><span>' + r[0] + '</span><b>' + esc(r[1]) + '</b></div>'; }).join('') + '</div>' +
    '</div>' +
    '<div><div class="rp-ctl"><button class="rp-play" data-act="rp-play" aria-label="Play">' + ICON.play + '</button><input type="range" min="0" max="' + (steps.length - 1) + '" value="0" data-inp="rp-scrub"><span class="muted n" id="rp-pos" style="font-size:12px;min-width:56px;text-align:right"></span></div>' +
    '<div class="rp-steps">' + steps.map(function (s, i) {
      return '<div class="rp-step" data-i="' + i + '"><div class="rp-time">' + U.fmtDay(s.ms) + '<br>' + U.fmtTime(s.ms) + '</div><div class="rp-rail"><i class="k-' + s.kind + '"></i></div><div class="rp-body"><b>' + esc(s.title) + '</b>' + s.html + '</div></div>';
    }).join('') + '</div></div></div>';
  var el = slot(slotId, html, function () { stopReplay(); });
  if (el) applyRp(el, u.rpIdx == null ? steps.length - 1 : Math.min(u.rpIdx, steps.length - 1), false);
};
function applyRp(el, idx, scroll) {
  var steps = el.querySelectorAll('.rp-step');
  steps.forEach(function (s, i) { s.classList.toggle('shown', i <= idx); s.classList.toggle('cur', i === idx); });
  var r = el.querySelector('[data-inp="rp-scrub"]'); if (r) r.value = idx;
  var pos = el.querySelector('#rp-pos'); if (pos) pos.textContent = (idx + 1) + ' / ' + steps.length;
  if (scroll && steps[idx]) { var box = el.querySelector('.rp-steps'); box.scrollTop = steps[idx].offsetTop - box.offsetTop - 60; }
}
function rpHost() { var r = document.querySelector('.rp'); return r && r.parentNode; }
function stopReplay() { clearInterval(rpTimer); rpTimer = null; var b = document.querySelector('.rp-play'); if (b) b.innerHTML = ICON.play; if (rpAudio) rpAudio.pause(); }
UI.on('rp-trip', function (d, el) { var u = uiFor(session().role); u.rpTrip = el.value; u.rpIdx = null; stopReplay(); saveUi(); render(); });
UI.on('rp-scrub', function (d, el) { var u = uiFor(session().role); u.rpIdx = Number(el.value); stopReplay(); applyRp(rpHost(), u.rpIdx, true); saveUi(); });
UI.on('rp-play', function (d, btn) {
  var u = uiFor(session().role), host = rpHost(), n = host.querySelectorAll('.rp-step').length;
  if (rpTimer) { stopReplay(); return; }
  if (u.rpIdx == null || u.rpIdx >= n - 1) u.rpIdx = -1;
  btn.innerHTML = ICON.pause;
  var stepFn = function () {
    if (rpAudio && !rpAudio.paused) return;
    u.rpIdx++;
    if (u.rpIdx >= n) { u.rpIdx = n - 1; stopReplay(); saveUi(); return; }
    applyRp(host, u.rpIdx, true);
    var cur = host.querySelectorAll('.rp-step')[u.rpIdx], ab = cur && cur.querySelector('[data-act="rp-audio"]');
    if (ab) playAudio(ab);
    saveUi();
  };
  stepFn();
  rpTimer = setInterval(stepFn, 1700);
});
function playAudio(btn) {
  var arg = btn.getAttribute('data-arg'), url = btn.getAttribute('data-lib') === '1' ? FX.audioUrl(arg) : FX.audioFor(arg);
  var body = btn.closest('.rp-body'), prog = body.querySelector('progress'), lines = body.querySelectorAll('.rp-tx p');
  if (rpAudio) rpAudio.pause();
  if (!url) { btn.textContent = 'No recording'; return; }
  rpAudio = new Audio(url);
  btn.textContent = 'Playing…';
  rpAudio.ontimeupdate = function () {
    var cur = rpAudio.currentTime, f = rpAudio.duration ? cur / rpAudio.duration : 0, k = 0;
    prog.value = f;
    if (lines[0] && lines[0].hasAttribute('data-t')) lines.forEach(function (p, i) { if (Number(p.getAttribute('data-t')) <= cur + 0.05) k = i; });
    else k = Math.min(lines.length - 1, Math.floor(f * lines.length));
    lines.forEach(function (p, i) { p.classList.toggle('hl', i === k); });
  };
  rpAudio.onended = function () { btn.textContent = 'Play recording'; lines.forEach(function (p) { p.classList.remove('hl'); }); };
  rpAudio.onpause = function () { if (!rpAudio.ended) btn.textContent = 'Play recording'; };
  rpAudio.play().catch(function () { btn.textContent = 'Play recording'; });
}
UI.on('rp-audio', function (d, btn) { if (rpAudio && !rpAudio.paused && btn.textContent === 'Playing…') { rpAudio.pause(); return; } playAudio(btn); });

/* =================== Ask AI =================== */
UI.chat = {};
var chatBox, chatScope = null;
function chatLog() { var u = uiFor(session().role); u.chat = u.chat || []; return u.chat; }
UI.chat.mount = function (el, s) {
  chatScope = s.role === 'plant' ? C.plantHeadPlant : null;
  el.innerHTML = '<div class="chat-h"><span class="ask-btn" style="pointer-events:none;background:var(--y);color:var(--y-ink)"><i style="background:var(--y-ink)"></i>Ask AI</span><div><b>' + (chatScope ? esc(ps(chatScope)) : 'All plants') + '</b><br><span>Answers computed from the live data</span></div><button class="icon-btn" data-act="chat" aria-label="Close">' + ICON.x + '</button></div>' +
    '<div class="chat-m" id="chat-m"></div><div class="sugg chips" id="chat-s"></div><form class="chat-f" data-form="chat"><input name="q" placeholder="Ask about plants, customers, transporters or a DI" autocomplete="off"><button class="btn k" type="submit" aria-label="Send">' + ICON.send + '</button></form>';
  chatBox = el.querySelector('#chat-m');
  var log = chatLog();
  if (!log.length) log.push({ r: 'a', h: '<p>Ask about detention budget, plan against actual, detention by plant, customer or transporter, what the agents closed, what needs your approval, or any DI or vehicle.</p>' });
  chatBox.innerHTML = log.map(function (m) { return '<div class="msg ' + m.r + '">' + m.h + '</div>'; }).join('');
  el.querySelector('#chat-s').innerHTML = INTENTS.filter(function (x) { return x.sugg; }).slice(0, 6).map(function (x) { return '<button class="chip" data-act="ask" data-arg="' + esc(x.sugg) + '">' + esc(x.sugg) + '</button>'; }).join('');
  chatBox.scrollTop = chatBox.scrollHeight;
};
UI.chat.focus = function () { var i = document.querySelector('.chat-f input'); if (i) setTimeout(function () { i.focus(); }, 220); };
UI.on('form-chat', function (f) { var q = f.q.value.trim(); if (!q) return; f.q.value = ''; ask(q); });
UI.on('ask', function (d) { ask(d.arg); });
UI.on('chat-go', function (d) { UI.navigate(d.arg); });
UI.ask = function (q) { return answer(q); };
function ask(q) {
  var log = chatLog();
  log.push({ r: 'u', h: esc(q) });
  var u = document.createElement('div'); u.className = 'msg u'; u.textContent = q; chatBox.appendChild(u);
  var a = answer(q);
  log.push({ r: 'a', h: a.html });
  if (log.length > 40) log.splice(1, log.length - 40);
  saveUi();
  var m = document.createElement('div'); m.className = 'msg a'; chatBox.appendChild(m);
  stream(m, a.html);
}
function stream(el, html) {
  var tmp = document.createElement('div'); tmp.innerHTML = html;
  var text = tmp.textContent, i = 0, step = Math.max(2, Math.round(text.length / 90));
  var t = setInterval(function () {
    i += step;
    if (i >= text.length) { clearInterval(t); el.innerHTML = html; chatBox.scrollTop = chatBox.scrollHeight; return; }
    el.innerHTML = esc(text.slice(0, i)) + '<span class="caret"></span>';
    chatBox.scrollTop = chatBox.scrollHeight;
  }, 16);
}
function goBtn(to, label) { return '<button class="go" data-act="chat-go" data-arg="' + esc(to) + '">' + esc(label || 'Open') + ' ›</button>'; }
function role() { return session().role; }
function plantsInScope() { return chatScope ? [chatScope] : FX.raw().plants; }
function findPlant(q) {
  var ql = q.toLowerCase(), hit = null;
  FX.raw().plants.forEach(function (p) {
    var name = ps(p).toLowerCase(), core = name.replace(/ plant.*$| cement works.*$/, '');
    var two = /-2\b|plant 2|plant two|second/.test(ql);
    if (ql.indexOf(core) >= 0) { if ((/-2$/.test(name) && two) || (!/-2$/.test(name) && !two) || !hit) hit = p; }
  });
  return hit;
}
var INTENTS = [
  { id: 'budget', sugg: 'Which plants are over their detention budget?', kw: [/budget/, /breach/, /exceed/, /over budget/, /overshoot/, /burn/], fn: function () {
    var rows = plantsInScope().map(function (p) { return { p: p, M: FX.metrics(p) }; }).sort(function (a, b) { return b.M.pace - a.M.pace; });
    var over = rows.filter(function (r) { return r.M.pace >= C.burn.redAt; });
    return '<p>' + (over.length ? over.length + ' of ' + rows.length + ' plants are running over their detention budget pace' : 'No plant is over its detention budget pace') + ' with ' + pct(rows[0].M.month.share) + ' of the month gone:</p><ul>' +
      rows.slice(0, 8).map(function (r) { var tone = paceTone(r.M.pace); return '<li><b>' + esc(ps(r.p)) + '</b>: ' + inr(r.M.det) + ' of ' + inr(r.M.budget) + ' (' + pct(r.M.burn) + ' used) · <span class="c-' + tone + '">pace ' + pct(r.M.pace) + '</span></li>'; }).join('') + '</ul>' +
      goBtn(role() === 'clo' ? 'home:path=,scrollTo=sec-c' : role() === 'ct' ? 'map' : 'home', 'Open plant ranking');
  } },
  { id: 'why', sugg: null, kw: [/\bwhy\b/, /reason/, /so high|too high|is high|high detention/], needPlant: true, fn: function (q) {
    var p = findPlant(q) || chatScope || FX.raw().plants.map(function (x) { return [x, FX.metrics(x).det]; }).sort(function (a, b) { return b[1] - a[1]; })[0][0];
    var M = FX.metrics(p), site = M.atCustomer, past = site.filter(function (c) { return c.siteH > C.cost.freeHours; });
    var g = {}; site.forEach(function (c) { var k = c.t.dest; g[k] = g[k] || { det: 0, n: 0, h: 0 }; g[k].det += c.det; g[k].n++; g[k].h += c.siteH; });
    var top = Object.keys(g).map(function (k) { return [k, g[k]]; }).sort(function (a, b) { return b[1].det - a[1].det; }).slice(0, 3);
    var share = M.det ? U.sum(top, function (x) { return x[1].det; }) / M.det : 0;
    var avg = site.length ? U.sum(site, function (c) { return c.siteH; }) / site.length : 0;
    return '<p><b>' + esc(ps(p)) + '</b> has ' + n0(M.detHours) + ' chargeable truck-hours of detention this month, ' + inr(M.det) + ' against a budget of ' + inr(M.budget) + ' (' + pct(M.burn) + ').</p>' +
      '<p>' + n0(site.length) + ' of its trucks are at customers, averaging ' + hrs(avg) + ' on site; ' + n0(past.length) + ' are past the ' + C.cost.freeHours + ' h free time.</p>' +
      '<p>The top three customers account for ' + pct(share) + ' of it:</p><ul>' + top.map(function (x) { return '<li>' + esc(x[0]) + ': ' + inr(x[1].det) + ', ' + x[1].n + ' trucks, avg ' + hrs(x[1].h / x[1].n) + '</li>'; }).join('') + '</ul>' +
      goBtn(role() === 'clo' ? 'home:plant=' + encodeURIComponent(p) + ',scrollTo=sec-c' : role() === 'plant' ? 'home' : 'trips', 'Open ' + ps(p));
  } },
  { id: 'transporters', sugg: 'Which transporters cause the most detention?', kw: [/transporter/, /carrier/, /vendor/, /fleet owner/, /transporters/], fn: function () {
    var d = FX.derive(), g = {};
    d.calcs.forEach(function (c) { if (chatScope && c.t.plant !== chatScope) return; if (c.t.stage !== 'AT CUSTOMER') return; var k = c.t.transporter; g[k] = g[k] || { det: 0, n: 0, h: 0 }; g[k].det += c.det; g[k].h += c.detH; if (c.det > 0) g[k].n++; });
    var top = Object.keys(g).map(function (k) { return [k, g[k]]; }).sort(function (a, b) { return b[1].det - a[1].det; }).slice(0, 5);
    return '<p>Detention accrues at customer sites; these are the transporters whose trucks are being held there:</p><ul>' + top.map(function (x) { return '<li><b>' + esc(x[0]) + '</b>: ' + n0(x[1].h) + ' h, ' + inr(x[1].det) + ' on ' + x[1].n + ' trucks</li>'; }).join('') + '</ul>' + goBtn(role() === 'clo' ? 'home:scrollTo=sec-c' : 'trips', 'Open');
  } },
  { id: 'overnight', sugg: 'What did the agents close overnight?', kw: [/overnight/, /last night/, /closed?/, /resolv/, /agents? (did|do|done)/, /since yesterday/], fn: function () {
    var S = FX.state(), from = S.clockMin - 12 * 60, d = FX.derive();
    var ev = S.events.filter(function (e) { return e.t >= from && (!chatScope || !e.di || (d.calcByDi[e.di] && d.calcByDi[e.di].t.plant === chatScope)); });
    var closed = ev.filter(function (e) { return e.kind === 'close'; }), byAgent = closed.filter(function (e) { return e.actorType !== 'Human'; });
    var emails = ev.filter(function (e) { return e.kind === 'email'; }).length, calls = ev.filter(function (e) { return e.kind === 'call'; }).length, replies = ev.filter(function (e) { return e.kind === 'reply'; }).length;
    var verifying = d.tickets.filter(function (t) { return t.phase === 'verify' && (!chatScope || t.plant === chatScope); }).length;
    var h = '<p>In the last 12 hours (' + U.fmtDT(FX.timeOf(from)) + ' to now): <b>' + closed.length + '</b> exceptions closed on evidence, <b>' + byAgent.length + '</b> of them by the agents without a person.</p>';
    if (closed.length) h += '<ul>' + closed.slice(-5).reverse().map(function (e) { var t = FX.ticket(e.ticket); return '<li>' + esc(t ? t.vehicle + ' · ' + t.cat : e.ticket) + ' at ' + U.fmtTime(FX.timeOf(e.t)) + '</li>'; }).join('') + '</ul>';
    h += '<p>Agents sent ' + emails + ' emails, placed ' + calls + ' calls and read ' + replies + ' replies. ' + verifying + ' tickets are being verified now.</p>';
    return h + goBtn(role() === 'ct' ? 'home' : role() === 'clo' ? 'replay' : 'home', 'Open activity');
  } },
  { id: 'approvals', sugg: 'What needs my approval?', kw: [/approv/, /decision/, /decide/, /sign.?off/, /need(s)? me/, /my action/], fn: function () {
    var r = role() === 'plant' ? 'plant' : role() === 'clo' ? 'clo' : null;
    if (!r) { var sent = FX.requestsFrom().filter(function (x) { return x.status === 'pending'; }); return sent.length ? '<p>' + sent.length + ' cases you sent are awaiting a decision:</p><ul>' + sent.map(function (x) { return '<li><b>' + esc(x.title) + '</b> · with ' + esc(FX.approverOf(x.type)) + '</li>'; }).join('') + '</ul>' : '<p>No cases are waiting on an approver. Approvals sit with the plant head and the logistics head; use Approval on a queue row to send one.</p>'; }
    var list = FX.approvals(r, r === 'plant' ? C.plantHeadPlant : chatScope);
    if (!list.length) return '<p>Nothing is waiting for your decision right now.</p>';
    return '<p>' + list.length + ' decisions are waiting for you:</p><ul>' + list.map(function (c) { return '<li><b>' + esc(c.title) + '</b>' + (c.rs > 0 ? ' · ' + inr(c.rs) : '') + (c.source === 'ct' ? ' · from ' + esc(c.raisedBy) : '') + '</li>'; }).join('') + '</ul>' + goBtn('home:scrollTo=' + (r === 'clo' ? 'sec-d' : 'pc-cards'), 'Open decisions');
  } },
  { id: 'plan', sugg: 'How are we against plan?', kw: [/plan/, /target/, /on track/, /how are we/, /dispatch/, /month.?end/], fn: function () {
    var M = FX.metrics(chatScope), dd = FX.dispatchDaily(chatScope), y = U.dayKey(FX.now()) - 1;
    return '<p>Month to date, <b>' + n0(M.dispatched) + '</b> of <b>' + n0(M.mtdTrips) + '</b> DIs raised have left the plant (' + pct(M.dispatched / Math.max(1, M.mtdTrips)) + '). Yesterday ' + n0(dd.actual[y] || 0) + ' of ' + n0(dd.plan[y] || 0) + ' DIs raised were dispatched.</p>' +
      '<p>Detention is ' + n0(M.detHours) + ' h, ' + inr(M.det) + ' against ' + inr(M.budget) + ' with ' + pct(M.month.share) + ' of the month gone (pace ' + pct(M.pace) + ').</p>' +
      '<p>' + n0(M.open) + ' exceptions are open; ' + n0(M.lanes.action + M.lanes.followup) + ' need a person.</p>' + goBtn(role() === 'clo' ? 'home:chart=disp,scrollTo=sec-b' : 'home', 'Open plan vs actual');
  } },
  { id: 'customers', sugg: 'Which customers hold trucks the longest?', kw: [/customer/, /site/, /unload/, /hold/, /longest/, /waiting/], fn: function () {
    var d = FX.derive(), g = {};
    d.calcs.forEach(function (c) { if (c.t.stage !== 'AT CUSTOMER' || (chatScope && c.t.plant !== chatScope)) return; var k = c.t.dest; g[k] = g[k] || { h: 0, n: 0, det: 0 }; g[k].h += c.siteH; g[k].n++; g[k].det += c.det; });
    var top = Object.keys(g).filter(function (k) { return g[k].n >= 3; }).map(function (k) { return [k, g[k]]; }).sort(function (a, b) { return b[1].h / b[1].n - a[1].h / a[1].n; }).slice(0, 5);
    return '<p>Customers with three or more trucks on site, by average wait:</p><ul>' + top.map(function (x) { return '<li><b>' + esc(x[0]) + '</b>: avg ' + hrs(x[1].h / x[1].n) + ' across ' + x[1].n + ' trucks, ' + inr(x[1].det) + ' detention</li>'; }).join('') + '</ul>' + goBtn(role() === 'ct' ? 'trips' : 'home:scrollTo=' + (role() === 'clo' ? 'sec-c' : 'p-cust'), 'Open');
  } },
  { id: 'open', sugg: 'How many exceptions are open?', kw: [/how many/, /open exception/, /exceptions?/, /backlog/, /queue/, /count/], fn: function () {
    var M = FX.metrics(chatScope);
    return '<p><b>' + n0(M.open) + '</b> exceptions are open: ' + n0(M.lanes.ai) + ' with agents, ' + n0(M.lanes.verify) + ' being verified, ' + n0(M.lanes.followup) + ' follow-up and ' + n0(M.lanes.action) + ' action required. Agents hold ' + pct((M.lanes.ai + M.lanes.verify) / Math.max(1, M.open)) + '.</p><ul>' +
      CATS.map(function (c) { return '<li>' + c + ': ' + n0(M.byType[c] || 0) + '</li>'; }).join('') + '</ul><p>Trips with issues: ' + n0(M.tripsWithIssues) + ' (' + n0(M.tripsMonitored) + ' with agents, ' + n0(M.tripsAwaiting) + ' awaiting action).</p>' + goBtn(role() === 'ct' ? 'home' : 'home:scrollTo=' + (role() === 'clo' ? 'sec-e' : 'p-choke'), 'Open exceptions');
  } },
  { id: 'risk', sugg: 'What should we work on first?', kw: [/risk/, /exposure/, /rupee/, /money/, /costliest/, /most expensive/, /work on first|first/, /priority/], fn: function () {
    var open = FX.derive().tickets.filter(function (t) { return t.phase === 'open' && t.lane !== 'ai' && (!chatScope || t.plant === chatScope); });
    var top = rankTickets(open).slice(0, 5), tot = U.sum(open, function (t) { return t.rs; }), acc = U.sum(open, function (t) { return t.acc || 0; });
    return '<p>' + n0(open.length) + ' cases need a person: ' + inr(acc) + ' of detention already accrued on them and ' + inr(tot) + ' more expected before the trucks are released. Top of the ranking:</p><ul>' + top.map(function (t, i) { return '<li>#' + (i + 1) + ' <b>' + esc(t.vehicle) + '</b> at ' + esc(t.dest) + ': ' + esc(t.mText) + ' (' + esc(t.status) + ')</li>'; }).join('') + '</ul>' + (top[0] ? goBtn('tk:' + top[0].id, 'Open ' + top[0].vehicle) : '');
  } },
  { id: 'trip', sugg: null, kw: [], test: function (q) { return /\b\d{10}\b/.test(q) || /\b[A-Z]{2}\s?\d{1,2}\s?[A-Z]{0,3}\s?\d{3,4}\b/i.test(q); }, fn: function (q) {
    var R = FX.raw(), d = FX.derive(), di = (q.match(/\b\d{10}\b/) || [])[0], veh = (q.match(/\b[A-Z]{2}\s?\d{1,2}\s?[A-Z]{0,3}\s?\d{3,4}\b/i) || [])[0];
    var t = di ? R.byDi[di] : R.trips.find(function (x) { return x.vehicle.replace(/\s/g, '').toUpperCase() === String(veh).replace(/\s/g, '').toUpperCase(); });
    if (!t) return '<p>I could not find ' + esc(di || veh) + ' among the trips in cycle.</p>';
    if (chatScope && t.plant !== chatScope) return '<p>' + esc(di || veh) + ' belongs to ' + esc(ps(t.plant)) + ', outside your plant.</p>';
    var c = d.calcByDi[t.di], tk = d.tickets.filter(function (x) { return x.di === t.di; });
    return '<p><b>' + esc(t.vehicle) + '</b> · DI ' + esc(t.di) + ' · ' + esc(ps(t.plant)) + ' to ' + esc(t.dest) + ' · ' + esc(t.transporter) + '.</p><p>Stage ' + esc(t.stage) + ': ' + UI.tripTiming(c) + '. Detention accrued ' + inr(c.det) + '.</p>' +
      (tk.length ? '<ul>' + tk.map(function (x) { return '<li>' + esc(x.cat) + ': ' + esc(x.status) + '</li>'; }).join('') + '</ul>' : '<p>No exception on this trip.</p>') +
      (role() === 'clo' ? goBtn('replay:rpTrip=' + t.di, 'Replay trip') : tk.length ? goBtn('tk:' + rankTickets(tk)[0].id, 'Open ticket') : goBtn('trip:' + t.di, 'Open trip'));
  } }
];
function answer(q) {
  var ql = q.toLowerCase(), best = null, bestS = 0;
  INTENTS.forEach(function (it) {
    var s = 0;
    if (it.test && it.test(q)) s += 5;
    it.kw.forEach(function (k) { if (k.test(ql)) s += 1; });
    if (it.needPlant && findPlant(q)) s += 1.5;
    if (s > bestS) { bestS = s; best = it; }
  });
  if (!best || bestS < 1) return { id: null, html: '<p>I only answer from the live data, and that question is outside what I cover. I can tell you:</p><ul>' + INTENTS.map(function (x) { return '<li>' + (x.sugg ? esc(x.sugg) : x.id === 'why' ? 'Why a plant\'s detention is high' : 'The status of a DI or vehicle number') + '</li>'; }).join('') + '</ul>' };
  try { return { id: best.id, html: best.fn(q) }; } catch (e) { console.error(e); return { id: best.id, html: '<p>I could not compute that just now.</p>' }; }
}

/* =====================================================================
   Command Centre: presentation layer (v4).
   Layout, wording and rendering only. Every number below is read from the
   same store functions as before; no calculation, threshold, ordering or
   workflow is changed here. Later declarations override earlier ones in
   this closure.
   ===================================================================== */
var PRODUCT = 'UltraTech Command Centre';
TITLES = { clo: 'Logistics Command Centre', plant: 'Plant Command Centre', ct: 'Exceptions Command Centre' };
var VIEW_TITLE = {
  clo: { home: 'Overview', map: 'Network map', replay: 'Trip replay' },
  plant: { home: 'Plant overview', trips: 'Trips' },
  ct: { home: 'Exceptions workspace', map: 'Network map', trips: 'Trips', guardrails: 'Priority & guardrails' }
};
ICON.more = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>';
ICON.ok = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
ICON.warn = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4 2.5 20h19z"/><path d="M12 10v4M12 17.2v.1"/></svg>';
ICON.clockI = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>';
ICON.dotI = '<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" fill="currentColor"/></svg>';
ICON.hold = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 6v12M15 6v12"/></svg>';
ICON.back = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
ICON.phone = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>';

/* ---------- shared helpers ---------- */
function aiBadge() { return '<span class="aib" title="Action taken by an AI agent">AI</span>'; }
function isAiActor(e) { return e && (e.actorType === 'AI agent' || /agent/i.test(e.actor || '') && e.actorType !== 'Human'); }
/* Status of a ticket, as text plus icon; colour is supplementary. */
function statusOf(t) {
  var o = t.o || {}, note = o.note || '';
  if (t.phase === 'closed') return { cls: 's-closed', icon: ICON.ok, text: 'Closed on evidence' };
  if (t.phase === 'verify') return { cls: 's-verify', icon: ICON.clockI, text: 'Awaiting verification' };
  if (t.phase === 'approval') return { cls: 's-approval', icon: ICON.hold, text: 'Awaiting approval' };
  if (/^Verification failed|^No reply within/.test(note)) return { cls: 's-reopen', icon: ICON.warn, text: 'Reopened · verification failed' };
  if (/^Rejected by|^Approval rejected/.test(note)) return { cls: 's-reopen', icon: ICON.warn, text: 'Returned · approval rejected' };
  if (t.lane === 'action') return { cls: 's-action', icon: ICON.warn, text: 'Action required' };
  if (t.lane === 'followup') return { cls: 's-follow', icon: ICON.dotI, text: 'Follow-up' };
  return { cls: 's-agent', icon: ICON.dotI, text: 'With AI agent' };
}
function statusBadge(t) { var s = statusOf(t); return '<span class="sbadge ' + s.cls + '">' + s.icon + s.text + '</span>'; }
UI.statusBadge = statusBadge;
function toneWord(tone) { return tone === 'red' ? 'Off track' : tone === 'amber' ? 'Watch' : tone === 'green' ? 'On track' : ''; }

/* ---------- tabs (UI state only; every panel stays in the DOM so live updates keep working) ---------- */
function tabsHtml(group, tabs) {
  return '<div class="tabs" role="tablist" data-tabs="' + group + '">' + tabs.map(function (t, i) {
    return '<button role="tab" class="tab" id="tab-' + group + '-' + t[0] + '" data-act="tab" data-arg="' + group + '|' + t[0] + '" aria-controls="tp-' + group + '-' + t[0] + '">' + t[1] + (t[2] ? ' <span class="tc" id="' + t[2] + '"></span>' : '') + '</button>';
  }).join('') + '</div>';
}
function tabPanel(group, key, inner) { return '<div class="tabpanel" role="tabpanel" id="tp-' + group + '-' + key + '" data-tp="' + group + '|' + key + '" aria-labelledby="tab-' + group + '-' + key + '">' + inner + '</div>'; }
function applyTabs(u) {
  u.tabs = u.tabs || {};
  document.querySelectorAll('#fx-app [data-tabs]').forEach(function (tl) {
    var g = tl.getAttribute('data-tabs'), btns = tl.querySelectorAll('[role=tab]');
    var cur = u.tabs[g] || (btns[0] && btns[0].getAttribute('data-arg').split('|')[1]);
    btns.forEach(function (b) { var on = b.getAttribute('data-arg').split('|')[1] === cur; b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; b.classList.toggle('on', on); });
    document.querySelectorAll('#fx-app [data-tp^="' + g + '|"]').forEach(function (p) { p.hidden = p.getAttribute('data-tp') !== g + '|' + cur; });
  });
}
UI.on('tab', function (d) { var u = uiFor(session().role), p = d.arg.split('|'); u.tabs = u.tabs || {}; u.tabs[p[0]] = p[1]; saveUi(); applyTabs(u); render(); });
/* Arrow-key movement between tabs. */
function tabKeys(e) {
  var t = e.target; if (!t || t.getAttribute('role') !== 'tab' || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
  var list = Array["proto"+"type"].slice.call(t.parentNode.querySelectorAll('[role=tab]')), i = list.indexOf(t);
  var n = list[(i + (e.key === 'ArrowRight' ? 1 : list.length - 1)) % list.length]; n.focus(); n.click(); e.preventDefault();
}
/* Accordion sections (UI state). */
function accHtml(key, title, summaryId, inner, u, tip) {
  var open = !!(u.acc && u.acc[key]);
  return '<section class="card acc' + (open ? ' open' : '') + '" id="acc-' + key + '"><button class="acc-h" data-act="acc" data-arg="' + key + '" aria-expanded="' + open + '" aria-controls="accb-' + key + '"><span class="chev' + (open ? ' o' : '') + '">' + ICON.chev + '</span><span class="acc-t">' + title + '</span><span class="acc-s" id="' + summaryId + '"></span><span class="acc-x">' + (open ? 'Hide' : 'Show') + '</span></button>' + (tip ? '<span class="acc-i">' + info(tip, true) + '</span>' : '') + '<div class="acc-b" id="accb-' + key + '"' + (open ? '' : ' hidden') + '>' + inner + '</div></section>';
}
UI.on('acc', function (d) {
  var u = uiFor(session().role); u.acc = u.acc || {}; u.acc[d.arg] = !u.acc[d.arg]; saveUi();
  var sec = document.getElementById('acc-' + d.arg); if (!sec) return;
  var open = u.acc[d.arg], b = sec.querySelector('.acc-h');
  sec.classList.toggle('open', open); b.setAttribute('aria-expanded', open); sec.querySelector('.acc-b').hidden = !open;
  sec.querySelector('.chev').classList.toggle('o', open); sec.querySelector('.acc-x').textContent = open ? 'Hide' : 'Show';
});
/* Sub-section heading inside a tab panel. */
function subHead(title, as, extra, tip) { return '<div class="sh"><h3>' + title + (tip ? info(tip) : '') + '</h3>' + (extra || '') + (as ? '<span class="as">' + as + '</span>' : '') + '</div>'; }

/* ---------- shell ---------- */
function scopeText(s, u) {
  if (s.role === 'plant') return esc(ps(C.plantHeadPlant));
  if (s.role === 'clo') return u.plant ? esc(ps(u.plant)) : 'All plants';
  return u.qplant ? esc(ps(u.qplant)) : 'All plants';
}
UI.render = render;
var _go = UI.go;
UI.go = function (view, patch) {
  var s = session();
  if (s && patch && patch.scrollTo) {
    var u = uiFor(s.role); u.tabs = u.tabs || {};
    var owner = SCROLL_TAB[s.role + ':' + patch.scrollTo]; if (owner) { var p = owner.split('|'); u.tabs[p[0]] = p[1]; }
  }
  _go(view, patch);
};
/* Sections that now sit inside a tab: opening them from Ask AI selects the tab first. */
var SCROLL_TAB = { 'plant:p-cust': 'pl-sec|det', 'clo:sec-e': 'clo-sec|exc' };


/* ---------- KPI tiles: static values (no rolling digits); primary and contextual tiles ---------- */
function kpiStrip(id, tiles) {
  var el = document.getElementById(id); if (!el) return;
  var keys = tiles.map(function (t) { return t.key + (t.act ? '+' : '') + (t.minor ? 'm' : ''); }).join('|');
  if (el.__keys !== keys) {
    var major = tiles.filter(function (t) { return !t.minor; }), minor = tiles.filter(function (t) { return t.minor; });
    el.style.setProperty('--n', major.length);
    el.classList.toggle('has-minor', minor.length > 0);
    function tile(t) {
      var tag = t.act ? 'button' : 'div';
      return '<' + tag + ' class="kpi" data-k="' + t.key + '"' + (t.act ? ' data-act="' + t.act + '" data-arg="' + esc(t.arg || '') + '" aria-label="' + esc(t.label) + ': open details"' : '') + '><div class="l"><span>' + esc(t.label) + '</span>' + (t.act ? '<i aria-hidden="true">Details ›</i>' : '') + '</div><div class="v"><span class="odo"></span><small class="u"></small><span class="kst"></span></div><div class="d"></div></' + tag + '>';
    }
    el.innerHTML = '<div class="kmaj">' + major.map(tile).join('') + '</div>' + (minor.length ? '<div class="kmin">' + minor.map(tile).join('') + '</div>' : '');
    el.__keys = keys;
  }
  tiles.forEach(function (t) {
    var k = el.querySelector('[data-k="' + t.key + '"]');
    k.className = 'kpi ' + (t.tone || '') + (t.minor ? ' minor' : '');
    var o = k.querySelector('.odo'); if (o.__v !== String(t.value)) { o.textContent = t.value; o.__v = String(t.value); }
    var u = k.querySelector('.u'); if (u.textContent !== (t.unit || '')) u.textContent = t.unit || '';
    var st = k.querySelector('.kst'), w = t.tone && !t.minor ? toneWord(t.tone) : ''; if (st.textContent !== w) st.textContent = w;
    var sub = k.querySelector('.d'); if (sub.__h !== t.sub) { sub.innerHTML = t.sub; sub.__h = t.sub; }
  });
}
UI.h.kpiStrip = kpiStrip;

/* ---------- charts (same series; clearer rendering) ---------- */
function dayChart(o) {
  var W = o.w || 980, H = o.h || 270, L = o.w ? 58 : 66, R = 16, T = 18, B = 36;
  var days = o.days, n = days.length, fs = o.w ? 12.5 : 13;
  var vmax = 0;
  days.forEach(function (d) { [d.v, d.plan].forEach(function (v) { if (v != null && v > vmax) vmax = v; }); });
  if (o.ref) vmax = Math.max(vmax, o.ref.value);
  vmax = niceMax(vmax * 1.08);
  var cw = (W - L - R) / n, y = function (v) { return T + (H - T - B) * (1 - v / vmax); }, x = function (i) { return L + i * cw + cw / 2; };
  var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.label) + '" style="--fs:' + fs + 'px">';
  for (var g = 0; g <= 4; g++) {
    var gv = vmax * g / 4, gy = y(gv);
    s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + gy + '" y2="' + gy + '" stroke="' + (g === 0 ? 'var(--line2)' : 'var(--grid)') + '" stroke-width="1"/>';
    s += '<text x="' + (L - 8) + '" y="' + (gy + 4) + '" text-anchor="end">' + esc(o.fmt(gv)) + '</text>';
  }
  days.forEach(function (d, i) {
    if (d.v == null) return;
    var top = y(d.v);
    s += '<rect x="' + (L + i * cw + cw * 0.18) + '" y="' + top + '" width="' + (cw * 0.64) + '" height="' + Math.max(0, H - B - top) + '" rx="2" fill="' + o.color + '"' + (d.partial ? ' class="partial"' : '') +
      (o.act ? ' data-act="' + o.act + '" data-arg="' + d.key + '" tabindex="0"' : '') + '><title>' + esc(d.tip) + (d.partial ? ' (today, so far)' : '') + '</title></rect>';
  });
  if (o.planLine) {
    var pts = days.map(function (d, i) { return d.plan == null ? null : [x(i), y(d.plan)]; }).filter(Boolean);
    if (pts.length > 1) s += '<polyline points="' + pts.map(function (p) { return p.join(','); }).join(' ') + '" fill="none" stroke="var(--tx)" stroke-width="1.8" stroke-dasharray="5 4" stroke-linejoin="round"/>';
    pts.forEach(function (p) { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.6" fill="var(--s1)" stroke="var(--tx)" stroke-width="1.5"/>'; });
  }
  if (o.ref) s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(o.ref.value) + '" y2="' + y(o.ref.value) + '" stroke="var(--rd)" stroke-width="1.5" stroke-dasharray="3 4"/><text class="ref" x="' + (W - R - 4) + '" y="' + (y(o.ref.value) - 7) + '" text-anchor="end">' + esc(o.ref.label) + '</text>';
  days.forEach(function (d, i) { if (d.tick) s += '<text x="' + x(i) + '" y="' + (H - B + 20) + '" text-anchor="middle">' + esc(d.tick) + '</text>'; });
  return s + '</svg>';
}
UI.h.dayChart = dayChart;
function hbars(rows, o) {
  o = o || {};
  if (!rows.length) return '<div class="empty">' + esc(o.empty || 'Nothing to show.') + '</div>';
  var max = Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1e-9]));
  return '<div class="hb">' + rows.map(function (r) {
    var tag = r.act ? 'button' : 'div';
    return '<' + tag + ' class="row"' + (r.act ? ' data-act="' + r.act + '" data-arg="' + esc(r.arg) + '"' : '') + ' title="' + esc(r.title || r.label) + '"><span class="k">' + esc(r.label) + '</span><span class="bar"><i style="width:' + (r.value / max * 100).toFixed(1) + '%;background:' + (r.color || 'var(--y)') + '"></i></span><span class="v">' + esc(r.text) + '</span></' + tag + '>';
  }).join('') + '</div>';
}
UI.h.hbars = hbars;
/* Six-hour forecast: "Now" marked, future dashed, shaded approximate range, axis titled. */
function lineSmall(points) {
  var W = 820, H = 280, L = 60, R = 18, T = 18, B = 34;
  var vmax = niceMax(Math.max.apply(null, points.map(function (p) { return p.hi != null ? p.hi : p.v; }).concat([1])) * 1.1);
  var x = function (i) { return L + i * (W - L - R) / Math.max(1, points.length - 1); }, y = function (v) { return T + (H - T - B) * (1 - v / vmax); };
  var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Trucks at plant, now and the next six hours" style="--fs:12.5px">';
  for (var g = 0; g <= 4; g++) { var gy = y(vmax * g / 4); s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + gy + '" y2="' + gy + '" stroke="' + (g === 0 ? 'var(--line2)' : 'var(--grid)') + '"/><text x="' + (L - 8) + '" y="' + (gy + 4) + '" text-anchor="end">' + Math.round(vmax * g / 4) + '</text>'; }
  s += '<text class="ax" transform="translate(14 ' + ((T + H - B) / 2) + ') rotate(-90)" text-anchor="middle">Trucks at plant</text>';
  s += '<path d="M' + points.map(function (p, i) { return x(i) + ',' + y(p.hi); }).join('L') + 'L' + points.map(function (p, i) { return x(i) + ',' + y(p.lo); }).reverse().join('L') + 'Z" fill="var(--y-soft)"/>';
  s += '<line x1="' + x(0) + '" x2="' + x(0) + '" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--tx)" stroke-width="1" stroke-dasharray="2 3"/>';
  s += '<polyline points="' + points.map(function (p, i) { return x(i) + ',' + y(p.v); }).join(' ') + '" fill="none" stroke="#A67C00" stroke-width="2.2" stroke-dasharray="6 4"/>';
  points.forEach(function (p, i) {
    var now = i === 0;
    s += '<circle cx="' + x(i) + '" cy="' + y(p.v) + '" r="' + (now ? 5 : 3.5) + '" fill="' + (now ? 'var(--tx)' : 'var(--s1)') + '" stroke="' + (now ? 'var(--tx)' : '#A67C00') + '" stroke-width="2"><title>' + esc(p.label + ': ' + Math.round(p.v) + ' trucks' + (now ? '' : ' (range ' + Math.round(p.lo) + '–' + Math.round(p.hi) + ')')) + '</title></circle>' +
      '<text class="pv" x="' + x(i) + '" y="' + (y(p.v) - 10) + '" text-anchor="middle">' + Math.round(p.v) + '</text>' +
      '<text x="' + x(i) + '" y="' + (H - 10) + '" text-anchor="middle"' + (now ? ' class="now"' : '') + '>' + esc(p.label) + '</text>';
  });
  return s + '</svg><div class="legend"><span><i class="lg-now"></i>Now (trucks at plant)</span><span><i class="lg-dash"></i>Projected</span><span><i style="background:var(--y-soft)"></i>Approximate range</span></div>';
}
UI.h.lineSmall = lineSmall;

/* ---------- detail drawer: dialog semantics, focus in and back ---------- */
var _lastFocus = null;
UI.detail = function (title, sub, build) {
  var keepFocus = document.activeElement;
  UI.closeDetail();
  _lastFocus = keepFocus;
  closeMenu();
  if (ui.chatOpen) { ui.chatOpen = false; saveUi(); var ch = document.getElementById('fx-chat'); if (ch) ch.classList.remove('on'); }
  var bg = document.createElement('div'); bg.className = 'dr-bg'; bg.id = 'fx-drbg'; bg.setAttribute('data-act', 'dr-close');
  var dr = document.createElement('aside'); dr.className = 'dr'; dr.id = 'fx-dr'; dr.setAttribute('role', 'dialog'); dr.setAttribute('aria-modal', 'true'); dr.setAttribute('aria-labelledby', 'fx-dr-t');
  function paint() { dr.innerHTML = '<div class="dr-h"><div><h3 id="fx-dr-t">' + esc(title) + '</h3><div class="sub">' + sub + '</div></div><button class="x" data-act="dr-close" aria-label="Close panel">' + ICON.x + '</button></div><div class="dr-b">' + build() + '</div>'; }
  paint();
  root.appendChild(bg); root.appendChild(dr);
  UI.detailOpen = { refresh: paint };
  var x = dr.querySelector('.x'); if (x) x.focus();
};
UI.closeDetail = function () {
  var had = !!document.getElementById('fx-dr');
  ['fx-dr', 'fx-drbg'].forEach(function (id) { var e = document.getElementById(id); if (e) e.remove(); });
  UI.detailOpen = null;
  if (had && _lastFocus && document.contains(_lastFocus)) { try { _lastFocus.focus(); } catch (e) {} }
  _lastFocus = null;
};

/* ---------- contextual menu (floats outside live-updated slots, so it survives refreshes) ---------- */
function closeMenu() { var m = document.getElementById('fx-menu'); if (m) { var b = m.__btn; m.remove(); if (b) b.setAttribute('aria-expanded', 'false'); } }
function openMenu(btn, html) {
  closeMenu();
  var m = document.createElement('div'); m.id = 'fx-menu'; m.className = 'menu'; m.setAttribute('role', 'menu'); m.innerHTML = html; m.__btn = btn;
  root.appendChild(m);
  var r = btn.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
  var left = Math.max(8, Math.min(window.innerWidth - mw - 8, r.right - mw)), top = r.bottom + 6;
  if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
  m.style.left = left + 'px'; m.style.top = top + 'px';
  btn.setAttribute('aria-expanded', 'true');
  var first = m.querySelector('button'); if (first) first.focus();
}
document.addEventListener('click', function (e) { var m = document.getElementById('fx-menu'); if (m && !m.contains(e.target) && !(m.__btn && m.__btn.contains(e.target))) closeMenu(); }, true);
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') { var m = document.getElementById('fx-menu'); if (m) { var b = m.__btn; closeMenu(); if (b) b.focus(); e.stopPropagation(); } }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { var mm = document.getElementById('fx-menu'); if (mm && mm.contains(document.activeElement)) { var it = Array["proto"+"type"].slice.call(mm.querySelectorAll('button')), i = it.indexOf(document.activeElement); it[(i + (e.key === 'ArrowDown' ? 1 : it.length - 1)) % it.length].focus(); e.preventDefault(); } }
  tabKeys(e);
}, true);
window.addEventListener('scroll', function () { closeMenu(); }, true);
window.addEventListener('resize', function () { closeMenu(); schedule(); });
/* Actions for one case: the same handlers and arguments as the original row buttons. */
function caseActionsHtml(t) {
  var id = esc(t.id), types = FX.approvalTypesFor(t.cat);
  return '<button role="menuitem" data-act="tk-call" data-kind="call-driver" data-arg="' + id + '">' + ICON.phone + 'Call driver</button>' +
    '<button role="menuitem" data-act="tk-call" data-kind="call-transporter" data-arg="' + id + '">' + ICON.phone + 'Call transporter</button>' +
    '<button role="menuitem" data-act="tk-call" data-kind="close" data-arg="' + id + '">' + ICON.ok + 'Resolve…</button>' +
    (types.length ? '<button role="menuitem" data-act="apr-new" data-arg="' + id + '">' + ICON.hold + 'Send for approval…</button>' : '') +
    '<button role="menuitem" data-act="tk-open" data-arg="' + id + '">Full case record (comments, emails, audit)</button>';
}
UI.on('qmenu', function (d, el) {
  var m = document.getElementById('fx-menu'); if (m && m.__btn === el) { closeMenu(); return; }
  var t = FX.ticket(d.arg); if (!t) return;
  openMenu(el, '<div class="mh">' + esc(t.vehicle) + ' · ' + esc(t.cat) + '</div>' + caseActionsHtml(t));
});
var _tkCall = handlers['tk-call'], _tkOpen = handlers['tk-open'], _aprNew = handlers['apr-new'];
UI.on('tk-call', function (d, el, e) { closeMenu(); _tkCall(d, el, e); });
UI.on('tk-open', function (d, el, e) { closeMenu(); _tkOpen(d, el, e); });
UI.on('apr-new', function (d, el, e) { closeMenu(); _aprNew(d, el, e); });

/* =================== Decisions (approval cards) =================== */
function approvalsHtml(role, plant, u) {
  var list = FX.approvals(role, plant), types = C.approvalTypes;
  u.aopen = u.aopen || {}; u.arej = u.arej || {};
  var html = list.length ? list.map(function (r) {
    var ty = types[r.type] || { group: 'Other' }, open = u.aopen[r.key], rej = u.arej[r.key];
    var from = r.source === 'ct' ? 'Sent by ' + esc(r.raisedBy) + ' (control tower) · ' + U.fmtTime(FX.timeOf(r.at)) : 'Raised by the tower from live exceptions';
    var entity = r.type === 'budget' ? ps(r.plant) : (r.scope || '') + (r.plant && r.type !== 'budget' ? ' · ' + ps(r.plant) : '');
    var val = r.rs > 0 ? '<div class="val">' + inr(r.rs) + '<small>' + (r.type === 'claim' ? 'Claim value' : r.type === 'budget' ? 'Extension' : 'Detention at stake') + '</small></div>' : '';
    var short = String(r.why || '').split(/(?<=\.)\s/)[0];
    return '<article class="apr' + (open ? ' open' : '') + (r.source === 'ct' ? ' ct' : '') + '" aria-label="' + esc(r.title) + '"><div class="hd"><div class="mn"><div class="meta"><span class="pill ' + (GROUP_PILL[ty.group] || 'p-mu') + '">' + esc(ty.group) + '</span><span class="sbadge s-approval">' + ICON.hold + 'Awaiting your decision</span></div><h4>' + esc(r.title) + '</h4>' +
      (entity ? '<div class="ent">' + esc(entity) + '</div>' : '') + (open ? '' : '<p class="why">' + esc(short) + '</p>') + '</div>' + val + '</div>' +
      (open ? '<dl><dt>Why</dt><dd>' + esc(r.why) + '</dd>' + (r.note ? '<dt>Note</dt><dd>' + esc(r.note) + '</dd>' : '') + (r.action ? '<dt>On approval</dt><dd>' + esc(r.action) + ' Approval starts this action; the case closes only after verification.</dd>' : '') + '<dt>Raised</dt><dd>' + from + '</dd>' + (r.tickets && r.tickets.length ? '<dt>Affected trips</dt><dd>' + plural(r.tickets.length, 'ticket') + ' · <button class="dlink" data-act="apr-tickets" data-arg="' + esc(r.key) + '">View trips</button></dd>' : '') + '</dl>' +
        '<div class="bt">' + (rej ? '<label class="rj"><span>Reason for rejecting</span><input placeholder="Reason for rejecting" data-inp="apr-note" data-arg="' + esc(r.key) + '" value="' + esc(u.arejText && u.arejText[r.key] || '') + '"></label><button class="btn sm k" data-act="apr-reject-go" data-arg="' + esc(r.key) + '">Confirm reject</button><button class="btn sm" data-act="apr-reject" data-arg="' + esc(r.key) + '">Cancel</button>' :
          '<button class="btn y sm" data-act="apr-ok" data-arg="' + esc(r.key) + '">Approve</button><button class="btn sm" data-act="apr-reject" data-arg="' + esc(r.key) + '">Reject…</button>') +
        '<button class="dlink" data-act="apr-open" data-arg="' + esc(r.key) + '">Close review</button></div>'
        : '<div class="bt"><button class="btn sm" data-act="apr-open" data-arg="' + esc(r.key) + '" aria-expanded="false">Review decision</button><span class="by">' + (r.source === 'ct' ? 'Sent by ' + esc(r.raisedBy) : 'Raised by the tower') + '</span></div>') + '</article>';
  }).join('') : '<div class="empty">Nothing waiting for your decision.</div>';
  var done = FX.decided(role, plant).slice(0, 4);
  if (done.length) html += '<div class="aprdone"><div class="lbl">Recent decisions</div>' + done.map(function (r) { return '<div>' + (r.status === 'approved' ? '<span class="sbadge s-closed">' + ICON.ok + 'Approved · action initiated</span>' : '<span class="sbadge s-reopen">' + ICON.warn + 'Rejected</span>') + ' <span>' + esc(r.title) + ' · ' + U.fmtTime(FX.timeOf(r.decidedAt)) + '</span></div>'; }).join('') + '</div>';
  return html;
}

/* =================== Where the problem is: spent vs further expected =================== */
function drill(u, fixedPlant) {
  var path = (u.path || []).slice();
  if (fixedPlant) path[0] = fixedPlant;
  var d = FX.derive(), type = u.cloType || null;
  var crumbs = '<nav class="crumbs" aria-label="Drill path">' + (fixedPlant ? '<b>' + esc(ps(fixedPlant)) + '</b>' : (path.length ? '<button data-act="drill" data-arg="0|">All plants</button>' : '<b>All plants</b>'));
  for (var i = 0; i < path.length; i++) {
    if (fixedPlant && i === 0) continue;
    var label = i === 0 ? ps(path[0]) : path[i];
    crumbs += '<span class="sep" aria-hidden="true">›</span>' + (i === path.length - 1 ? '<b>' + esc(label) + '</b>' : '<button data-act="drill" data-arg="' + (i + 1) + '|">' + esc(label) + '</button>');
  }
  if (type) crumbs += '<span class="pill p-y" style="margin-left:6px">' + esc(type) + ' <button data-act="drill-type" data-arg="" aria-label="Clear exception type filter">×</button></span>';
  crumbs += '<span class="lv-hint">' + ['Plant', 'Customer', 'Transporter', 'Trips'][Math.min(3, path.length)] + ' level · select a row to go deeper</span></nav>';
  var calcs = d.calcs, open = d.tickets.filter(function (t) { return t.phase !== 'closed' && (!type || t.cat === type); });
  if (path[0]) { calcs = calcs.filter(function (c) { return c.t.plant === path[0]; }); open = open.filter(function (t) { return t.plant === path[0]; }); }
  if (path[1]) { calcs = calcs.filter(function (c) { return c.t.dest === path[1]; }); open = open.filter(function (t) { return t.dest === path[1]; }); }
  if (path[2]) { calcs = calcs.filter(function (c) { return c.t.transporter === path[2]; }); open = open.filter(function (t) { return t.transporter === path[2]; }); }
  var body;
  if (!path[0]) {
    var rows = FX.raw().plants.map(function (p) { return { p: p, M: FX.metrics(p), typeN: open.filter(function (t) { return t.plant === p; }).length }; })
      .sort(function (a, b) { return type ? b.typeN - a.typeN : b.M.pace - a.M.pace; });
    body = '<div class="blg"><span><i class="sw-a"></i>Spent month to date</span><span><i class="sw-r"></i>Further expected on open exceptions</span><span><i class="sw-p"></i>Where spend should be today (budget pace)</span></div>' +
      '<div class="tsc"><table class="tbl rank"><thead><tr><th scope="col">Plant</th><th scope="col" style="width:30%">Detention budget used</th><th scope="col" class="r">Spent MTD</th><th scope="col" class="r">Monthly budget</th><th scope="col" class="r">Further expected</th><th scope="col" class="r">' + (type ? esc(type) : 'Open exceptions') + '</th><th scope="col">Budget pace</th></tr></thead><tbody>' +
      rows.map(function (r) {
        var M = r.M, tone = paceTone(M.pace), w = Math.min(100, M.burn * 100), rw = Math.min(100 - w, M.atRisk / M.budget * 100), col = tone === 'red' ? 'var(--rd)' : tone === 'amber' ? '#D99A00' : 'var(--gn)';
        var tag = tone === 'red' ? '<span class="sbadge s-action">' + ICON.warn + 'Over pace</span>' : tone === 'amber' ? '<span class="sbadge s-follow">' + ICON.dotI + 'Near pace</span>' : '<span class="sbadge s-closed">' + ICON.ok + 'Within pace</span>';
        return '<tr data-act="drill" data-arg="1|' + esc(r.p) + '" tabindex="0"><td><b>' + esc(ps(r.p)) + '</b><div class="muted sm">' + n0(M.trips) + ' trips in cycle</div></td>' +
          '<td><div class="burn" title="' + pct(M.burn) + ' of the monthly budget spent; further expected ' + inr(M.atRisk) + '; ' + pct(M.month.share) + ' of the month gone"><span class="a" style="width:' + w + '%;background:' + col + '"></span><span class="rk" style="left:' + w + '%;width:' + rw + '%;--c:' + col + '"></span><span class="pace" style="left:' + Math.min(100, M.month.share * 100) + '%"></span></div><div class="sm c-' + tone + '" style="margin-top:4px"><b>' + pct(M.burn) + '</b> used · pace ' + pct(M.pace) + '</div></td>' +
          '<td class="r"><b>' + inr(M.det) + '</b></td><td class="r">' + inr(M.budget) + '</td><td class="r exp">' + inr(M.atRisk) + '</td><td class="r">' + n0(type ? r.typeN : M.open) + '</td><td>' + tag + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  } else if (!path[1]) body = groupTable(calcs, open, function (c) { return c.t.dest; }, function (t) { return t.dest; }, 'Customer (destination)', 2);
  else if (!path[2]) body = groupTable(calcs, open, function (c) { return c.t.transporter; }, function (t) { return t.transporter; }, 'Transporter', 3);
  else body = UI.tripTable(calcs.sort(function (a, b) { return b.det - a.det; }), { metricLabel: 'Timing' });
  return crumbs + body;
}
function groupTable(calcs, open, keyC, keyT, title, depth) {
  var g = {};
  calcs.forEach(function (c) { var k = keyC(c); var x = g[k] = g[k] || { k: k, n: 0, site: 0, siteN: 0, det: 0, rs: 0, open: 0 }; x.n++; x.det += c.det; if (c.t.stage === 'AT CUSTOMER') { x.site += c.siteH; x.siteN++; } });
  open.forEach(function (t) { var x = g[keyT(t)]; if (x) { x.rs += t.rs; x.open++; } });
  var rows = Object.keys(g).map(function (k) { return g[k]; }).sort(function (a, b) { return (b.det + b.rs) - (a.det + a.rs) || b.open - a.open; }).slice(0, 25);
  return '<div class="tsc"><table class="tbl"><thead><tr><th scope="col">' + title + '</th><th scope="col" class="r">Trips in cycle</th><th scope="col" class="r">Avg wait at customer</th><th scope="col" class="r">Detention accrued (trips in cycle)</th><th scope="col" class="r">Further expected</th><th scope="col" class="r">Open exceptions</th></tr></thead><tbody>' +
    rows.map(function (r) { return '<tr data-act="drill" data-arg="' + depth + '|' + esc(r.k) + '" tabindex="0"><td><b>' + esc(r.k) + '</b></td><td class="r">' + n0(r.n) + '</td><td class="r">' + (r.siteN ? hrs(r.site / r.siteN) : '—') + '</td><td class="r ' + (r.det > 0 ? 'c-red' : '') + '">' + inr(r.det) + '</td><td class="r exp">' + inr(r.rs) + '</td><td class="r">' + n0(r.open) + '</td></tr>'; }).join('') + '</tbody></table></div>';
}

/* =================== In-plant turnaround: equal stage tiles with norm comparison =================== */
function tatWidget(plant) {
  var Y = FX.yard(plant);
  var tiles = Y.stages.map(function (s, i) {
    var hot = s.trips.length && s.avg > s.norm * 0.85, over = s.trips.length && s.avg > s.norm;
    var scale = Math.max(s.norm, s.avg) * 1.25 || 1;
    var state = !s.trips.length ? 'No trucks' : over ? 'Above norm' : hot ? 'Near norm' : 'Within norm';
    return '<li><button class="stg-t' + (hot ? ' hot' : '') + (over ? ' over' : '') + '" data-act="tat-stage" data-arg="' + i + '" aria-label="' + esc(s.name + ': ' + s.trips.length + ' trucks, average ' + Math.round(s.avg) + ' minutes against a ' + s.norm + ' minute norm') + '">' +
      '<span class="nm">' + esc(s.name) + '</span><span class="c">' + s.trips.length + '<small>trucks</small></span>' +
      '<span class="tm">Avg <b>' + Math.round(s.avg) + ' min</b> · norm ' + s.norm + ' min</span>' +
      '<span class="nb" aria-hidden="true"><i style="width:' + Math.min(100, s.avg / scale * 100).toFixed(1) + '%"></i><em style="left:' + (s.norm / scale * 100).toFixed(1) + '%"></em></span>' +
      '<span class="stt">' + (over ? ICON.warn : hot ? ICON.dotI : ICON.ok) + state + '</span></button></li>';
  }).join('');
  var held = '<button class="stg-held' + (Y.held.trips.length ? ' on' : '') + '" data-act="tat-stage" data-arg="held"><span class="nm">Held beyond the ' + Y.totalNorm + ' min norm</span><span class="c">' + n0(Y.held.trips.length) + '<small>trucks</small></span><span class="tm">Avg <b>' + hrs(Y.held.avgH) + '</b> over norm</span><span class="tm">' + pct(Y.held.trips.length / Math.max(1, Y.count)) + ' of ' + n0(Y.count) + ' trucks at plant</span></button>';
  return { html: '<div class="stgw"><ol class="stg2" aria-label="In-plant stages in sequence">' + tiles + '</ol>' + held + '</div><div class="legend"><span><i class="lg-bar"></i>Average time in stage</span><span><i class="lg-norm"></i>Stage norm</span></div>',
    as: n0(Y.count) + ' trucks at plant · avg ' + hrs(Y.avgH) + ' since DI' + (Y.held.trips.length ? ' · ' + n0(Y.held.trips.length) + ' beyond norm' : ' · all within norm') };
}

/* =================== Dedicated fleet: labelled segmented bar =================== */
function fleetWidget(plant) {
  var d = FX.derive(), S = FX.state(), trig = S.guardrails['Customer Detention'].trigger;
  var ded = d.calcs.filter(function (c) { return c.t.plant === plant && FX.dedicated(c.t); });
  var at = ded.filter(function (c) { return c.t.stage === 'AT PLANT'; }), road = ded.filter(function (c) { return c.t.stage === 'IN TRANSIT'; });
  var site = ded.filter(function (c) { return c.t.stage === 'AT CUSTOMER' && !c.released; }), ret = ded.filter(function (c) { return c.t.stage === 'AT CUSTOMER' && c.released; });
  var long = site.filter(function (c) { return c.siteH > trig; }), tot = Math.max(1, ded.length);
  var avgCycle = ded.length ? U.sum(ded, function (c) { return c.ageH; }) / ded.length : 0;
  var segs = [['plant', 'At the plant', at.length, 'f-plant'], ['road', 'Loaded, to site', road.length, 'f-road'], ['site', 'At site, up to ' + trig + ' h', site.length - long.length, 'f-site'], ['site', 'At site, over ' + trig + ' h', long.length, 'f-long'], ['ret', 'Released, returning', ret.length, 'f-ret']];
  return '<div class="fbar" role="group" aria-label="Dedicated trucks by position">' + segs.map(function (s) { return s[2] ? '<button class="' + s[3] + '" style="flex:' + s[2] + ' 1 0" data-act="fleet" data-arg="' + s[0] + '" title="' + esc(s[1] + ': ' + s[2] + ' trucks') + '"><b>' + s[2] + '</b></button>' : ''; }).join('') + '</div>' +
    '<div class="fkey">' + segs.map(function (s) { return '<button data-act="fleet" data-arg="' + s[0] + '"><i class="' + s[3] + '"></i><span>' + esc(s[1]) + '</span><b>' + s[2] + '</b></button>'; }).join('') + '</div>' +
    '<div class="fstats"><div><span>Dedicated trucks</span><b>' + ded.length + '</b><em>' + pct(ded.length / Math.max(1, d.calcs.filter(function (c) { return c.t.plant === plant; }).length)) + ' of trips in cycle</em></div>' +
    '<div><span>Avg time in cycle</span><b>' + n0(avgCycle) + ' h</b><em>Since DI, trucks in cycle</em></div>' +
    '<div><span>Waiting at sites</span><b>' + long.length + '</b><em>Over ' + trig + ' h, agents working each</em></div></div>';
}

/* =================== Logistics head =================== */
function cloKpis(M, p) {
  var dispR = M.dispatched / Math.max(1, M.mtdTrips);
  return [
    { key: 'det', label: 'Detention MTD vs budget', value: inr(M.det), tone: paceTone(M.pace), sub: n0(M.detHours) + ' h · ' + pct(M.burn) + ' of ' + inr(M.budget) + ' used', act: 'kpi', arg: 'det' },
    { key: 'disp', label: 'Dispatch vs plan (MTD)', value: pct(dispR), tone: dispR >= 0.9 ? 'green' : dispR >= 0.75 ? 'amber' : 'red', sub: n0(M.dispatched) + ' of ' + n0(M.mtdTrips) + ' DIs this month', act: 'kpi', arg: 'disp' },
    { key: 'pod', label: 'Open-ePOD wait (avg)', value: M.podAvgH == null ? '0' : String(Math.round(M.podAvgH)), unit: 'h', tone: M.podAvgH == null ? 'green' : M.podAvgH > FX.state().guardrails['ePOD Delay'].followUp ? 'red' : 'amber', sub: 'Average wait so far on ' + n0(M.podOpen) + ' open ePODs', act: 'kpi', arg: 'pod' },
    { key: 'ev', label: 'Closed on evidence', value: (function (x) { return x > 0 && x < 0.1 ? (x * 100).toFixed(1) + '%' : pct(x); })(M.closedEv / Math.max(1, M.raised)), sub: n0(M.closedEv) + ' of ' + n0(M.raised) + ' raised this cycle', act: 'kpi', arg: 'ev' },
    { key: 'trips', minor: true, label: 'Trips in cycle', value: n0(M.trips), sub: n0(M.atPlant.length) + ' at plant · ' + n0(M.inTransit.length) + ' on road · ' + n0(M.atCustomer.length) + ' at customer', act: 'kpi', arg: 'trips' },
    { key: 'open', minor: true, label: 'Open exceptions', value: n0(M.open), tone: (M.lanes.action + M.lanes.followup) / Math.max(1, M.open) > 0.3 ? 'red' : 'green', sub: n0(M.lanes.ai + M.lanes.verify) + ' with agents · ' + n0(M.lanes.action + M.lanes.followup) + ' need a person', act: 'kpi', arg: 'open' }
  ];
}
var TIP = {
  map: 'Each bubble is a plant. Colour is detention spend against the plant\'s budget pace for the month: red above 110%, amber 90 to 110%, green below 90%. Bubble size is the number of open exceptions on the plant\'s trips. Select a bubble for its exceptions by reason.',
  wait: 'Customer sites holding trucks beyond the ' + C.cost.freeHours + ' h free time, ranked by number of trucks. Hover a row for the detention accrued; select it for the trucks.',
  plan: 'Detention: chargeable truck-hours beyond free time per day (or the ₹ value at the contracted rate). Earlier days come from the closed dispatch ledger, today from live trips. The dotted line is the daily budget (monthly budget divided by days in the month). Dispatch: DIs raised (plan, dashed) against DIs that left the plant (bars); today is shown so far and has no plan point. Select a bar for the day\'s detail.',
  tat: 'Trucks inside the plant now, by stage from reporting to gate-out. Each tile shows trucks in the stage and their average time in it against the stage norm. Trucks past the full DI-to-gate-out norm count as held beyond norm. Select a stage for its trucks.',
  drill: 'Plants ranked by detention budget pace: month-to-date spend divided by the budget for the share of the month gone. The solid bar is spend to date; the hatched part is further detention expected on open exceptions before release (not yet spent); the tick marks where spend should be today. Select a plant, then a customer, then a transporter, then a trip.',
  exc: 'Open exceptions by where they sit in the journey and by type. Plant / loading counts trucks held beyond the ' + C.norms.loadingHours + ' h DI-to-gate-out norm (a count of trucks); the other stages count open exceptions. Select a bar for the plants and customers behind it.'
};
UI.views.clo.home = {
  layout: function () {
    return '<div id="sec-top"></div><div class="scopebar"><span class="lbl">Scope</span><div class="pls" id="c-pls" role="group" aria-label="Plant scope"></div></div><div class="kpis" id="k-clo"></div>' +
      '<div class="g g64">' + card('sec-b', 'Plan vs actual', '', '<div id="c-plan"></div>', '<div id="c-tog" class="tog"></div>', TIP.plan) +
      card('sec-d', 'Decisions for you', '<span id="c-dec-n"></span>', '<div id="c-dec" class="decs"></div>', '', APR_TIP + ' Logistics head: transporter claims and penalties, budget extensions, customer escalations through sales.') + '</div>' +
      '<div class="mt">' + card('sec-c', 'Where the problem is', '', '<div id="c-drill"></div>', '', TIP.drill) + '</div>' +
      '<section class="card mt tabcard" id="sec-e" aria-label="Supporting analysis">' + tabsHtml('clo-sec', [['perf', 'Performance'], ['exc', 'Exception breakdown'], ['net', 'Network']]) +
      tabPanel('clo-sec', 'perf', '<div class="cb">' + subHead('In-plant turnaround', '<span id="c-tat-as"></span>', '', TIP.tat) + '<div id="c-tat"></div>' +
        '<div class="mt2">' + subHead('Trucks waiting at customers', '', '', TIP.wait) + '<div id="c-wait"></div></div></div>') +
      tabPanel('clo-sec', 'exc', '<div class="cb">' + subHead('Exceptions by stage and type', '', '', TIP.exc) + '<div id="c-exc"></div></div>') +
      tabPanel('clo-sec', 'net', '<div class="cb">' + subHead('Network, live', 'Full view in Network map', '', TIP.map) + '<div class="mapw sm" id="c-map"></div></div>') + '</section>';
  },
  update: function (u) {
    var p = u.plant || null, M = FX.metrics(p);
    slot('c-pls', plantChips(u));
    kpiStrip('k-clo', cloKpis(M, p));
    slot('c-map', mapSvg(p));
    var ap = FX.approvals('clo', p); slot('c-dec-n', ap.length ? ap.length + ' pending' : 'None pending');
    slot('c-dec', approvalsHtml('clo', p, u));
    var w = {}; M.atCustomer.forEach(function (c) { if (c.siteH > C.cost.freeHours) { var k = c.t.dest; w[k] = w[k] || { n: 0, det: 0 }; w[k].n++; w[k].det += c.det; } });
    slot('c-wait', hbars(Object.keys(w).map(function (k) { return { label: k, value: w[k].n, text: plural(w[k].n, 'truck'), title: k + ' · ' + inr(w[k].det) + ' detention accrued', color: 'var(--am)', act: 'wait-site', arg: k }; }).sort(function (a, b) { return b.value - a.value; }).slice(0, 7), { empty: 'No truck past free time.' }));
    var mode = u.chart || 'det';
    slot('c-tog', '<div class="seg" role="group" aria-label="Chart"><button data-act="chart-mode" data-arg="det" aria-pressed="' + (mode === 'det') + '" class="' + (mode === 'det' ? 'on' : '') + '">Detention</button><button data-act="chart-mode" data-arg="disp" aria-pressed="' + (mode === 'disp') + '" class="' + (mode === 'disp' ? 'on' : '') + '">Dispatch</button></div>' +
      (mode === 'det' ? '<div class="seg" role="group" aria-label="Unit"><button data-act="det-unit" data-arg="h" aria-pressed="' + (u.detUnit !== 'rs') + '" class="' + (u.detUnit !== 'rs' ? 'on' : '') + '">Hours</button><button data-act="det-unit" data-arg="rs" aria-pressed="' + (u.detUnit === 'rs') + '" class="' + (u.detUnit === 'rs' ? 'on' : '') + '">₹ value</button></div>' : ''));
    slot('c-plan', planChart(p, mode, u.detUnit));
    var T = tatWidget(p); slot('c-tat', T.html); slot('c-tat-as', esc(T.as));
    slot('c-drill', drill(Object.assign({}, u, { path: p ? [p].concat((u.path || []).slice(1)) : u.path })));
    slot('c-exc', excBars(p));
  }
};

/* =================== Plant head =================== */
UI.views.plant.home = {
  layout: function () {
    return '<div class="kpis" id="k-plant"></div>' +
      card('', 'In-plant turnaround, stage by stage', '<span id="p-tat-as"></span>', '<div id="p-tat"></div>', '', TIP.tat) +
      '<div class="g g64 mt">' + card('', 'Trucks at plant, next 6 hours', '<span id="p-q-as"></span>', '<div class="chart" id="p-q"></div>', '', 'Projected trucks inside the plant for the next six hours. Arrivals per hour use the average DIs raised in that hour of the day over the last 72 hours; departures use the average dispatch rate over the same 72 hours. The shaded range is ±1.28 standard deviations, assuming arrivals and departures vary randomly; it is approximate. Hover a point for its values.') +
      card('pc-cards', 'Decisions for you', '<span id="p-dec-n"></span>', '<div id="p-dec" class="decs"></div>', '', APR_TIP + ' Plant head: holding dispatch to a customer, alternate unloading sites, replacement trucks, diversion routes and weighbridge re-weighs.') + '</div>' +
      '<section class="card mt tabcard" aria-label="Flow, trends and detention">' + tabsHtml('pl-sec', [['flow', 'Flow & fleet'], ['trend', 'Trends'], ['det', 'Detention breakdown']]) +
      tabPanel('pl-sec', 'flow', '<div class="cb">' + subHead('Dedicated fleet from this plant', '', '', 'Trucks attached to this plant on dedicated contracts and where each one is now: at the plant, on the road, at a customer or returning. Select a segment for its trucks.') + '<div id="p-fleet"></div>' +
        '<div class="mt2">' + subHead('Choke points', '', '', 'Where hours are being lost now: trucks held beyond the ' + C.norms.loadingHours + ' h DI-to-gate-out norm at the plant (the same count as Held beyond norm), delay and route exceptions on the road, and trucks past free time at customers. Top names are ranked by hours lost. Select a tile for the trucks.') + '<div id="p-choke"></div></div></div>') +
      tabPanel('pl-sec', 'trend', '<div class="cb g g2">' + '<div>' + subHead('Dispatch plan vs actual', 'This month', '', 'DIs raised each day (plan, dashed) against DIs that left the plant (bars). Earlier days come from the dispatch ledger, today from live trips; today has no plan point. Select a day for its DIs.') + '<div id="p-disp"></div></div>' +
        '<div>' + subHead('Detention by day', 'This month', '<div class="seg" id="p-tog" role="group" aria-label="Unit"></div>', 'Chargeable truck-hours beyond the ' + C.cost.freeHours + ' h free time per day, or the ₹ value at the contracted rate. The dotted line is the plant\'s daily budget. Select a day for the trucks.') + '<div id="p-det"></div></div></div>') +
      tabPanel('pl-sec', 'det', '<div class="cb g g2">' + '<div id="p-cust-w">' + subHead('Detention by customer', 'Trucks in cycle', '', 'Detention accrued on this plant\'s trucks still in cycle (not yet released), by customer site. Month-to-date totals including released trucks are in Trends › Detention by day. Hover for hours; select a customer for the trucks.') + '<div id="p-cust"></div></div>' +
        '<div>' + subHead('Detention by transporter', 'Trucks in cycle', '', 'Detention accrued on this plant\'s trucks still in cycle (not yet released), by transporter. Hover for hours; select a transporter for the trucks.') + '<div id="p-tr"></div></div></div>') + '</section>';
  },
  update: function (u) {
    var p = C.plantHeadPlant, M = FX.metrics(p);
    kpiStrip('k-plant', plantKpis(M));
    var T = tatWidget(p); slot('p-tat', T.html); slot('p-tat-as', esc(T.as));
    slot('p-fleet', fleetWidget(p));
    var q = queueForecast(p);
    slot('p-q', lineSmall(q.pts)); slot('p-q-as', q.arr.toFixed(1) + ' DIs in / ' + q.dep.toFixed(1) + ' trucks out per hour (72 h average)');
    slot('p-choke', chokeTiles(p));
    var ap = FX.approvals('plant', p); slot('p-dec-n', ap.length ? ap.length + ' pending' : 'None pending');
    slot('p-dec', approvalsHtml('plant', p, u));
    function detBy(key) { var g = {}; M.calcs.forEach(function (c) { if (c.det > 0) { var k = key === 'dest' ? c.t.dest : c.t.transporter; g[k] = g[k] || { rs: 0, h: 0 }; g[k].rs += c.det; g[k].h += c.detH; } }); return Object.keys(g).map(function (k) { return { label: k, value: g[k].rs, text: inr(g[k].rs), title: k + ' · ' + n0(g[k].h) + ' h accrued', color: 'var(--am)', act: 'det-by', arg: key + '|' + k }; }).sort(function (a, b) { return b.value - a.value; }).slice(0, 8); }
    slot('p-cust', hbars(detBy('dest'), { empty: 'No detention on trucks in cycle.' }));
    slot('p-tr', hbars(detBy('tr'), { empty: 'No detention on trucks in cycle.' }));
    slot('p-disp', planChart(p, 'disp', null, true));
    slot('p-tog', '<button data-act="det-unit" data-arg="h" aria-pressed="' + (u.detUnit !== 'rs') + '" class="' + (u.detUnit !== 'rs' ? 'on' : '') + '">Hours</button><button data-act="det-unit" data-arg="rs" aria-pressed="' + (u.detUnit === 'rs') + '" class="' + (u.detUnit === 'rs' ? 'on' : '') + '">₹ value</button>');
    slot('p-det', planChart(p, 'det', u.detUnit, true));
  }
};

/* =================== Control tower workspace =================== */
function ctWide() { return mainEl && mainEl.clientWidth >= 1180; }
UI.views.ct.home = {
  layout: function (u) {
    return '<div class="shift2" id="t-shift"></div>' +
      '<div class="work" id="t-work"><section class="card qcard" aria-labelledby="q-h"><div class="ch"><h2 id="q-h">Cases that need a person' + info('Open exceptions agents could not settle: past the follow-up threshold, a failed or refused call, a missed commitment, or a failed verification. Ranked by priority score (value at risk, then SLA age, then repeat offender); #1 is the case to work first. Grouped by exception type. Open a case to see what has happened and act on it.') + '</h2><span class="as" id="t-qas"></span></div><div id="t-q"></div></section>' +
      '<section class="card case" id="t-case" aria-label="Selected case"></section></div>' +
      '<div class="g g2 mt ftrow"><section class="card"><div class="ch"><h2>Awaiting verification' + info('Cases where an agent or a person has acted. Each closes itself only when every check is met: GPS shows the truck moving or released, the site or sales confirm, the POD matches. Checks show their due time. A failed check reopens the case to your queue.') + '</h2><span class="as" id="t-vf-n"></span></div><div id="t-vf" class="vfl"></div></section>' +
      '<section class="card"><div class="ch"><h2>Sent for approval' + info('Cases you sent to the plant head or logistics head, with their decision. Approved cases move to verification; rejected cases return to your queue with the reason.') + '</h2><span class="as" id="t-sent-n"></span></div><div id="t-sent" class="sentl"></div></section></div>' +
      '<div class="mt">' + accHtml('roster', 'AI agents on shift', 't-ag-s', '<div class="agents" id="t-ag"></div>', u, 'One agent per exception type. Each picks up a ticket when it crosses the pick-up threshold the logistics head sets in Priority & guardrails, calls the driver, transporter or site in Hindi, emails where needed, and hands the case to you at the follow-up threshold or when a call fails.') + '</div>' +
      '<div class="mt">' + accHtml('feed', 'Activity: what the agents and team just did', 't-feed-s', '<ul class="feed" id="t-feed"></ul>', u) + '</div>';
  },
  update: function (u) {
    var M = FX.metrics(null), S = FX.state(), d = FX.derive();
    var ai = M.lanes.ai + M.lanes.verify, you = M.lanes.action + M.lanes.followup, tot = Math.max(1, ai + you);
    var agentClosed = M.tickets.filter(function (t) { return t.phase === 'closed' && t.o && t.o.via !== 'manual' && t.o.via !== 'call'; }).length;
    slot('t-shift', [['Plant / loading', M.stageCounts.Plant, 'trucks held beyond norm'], ['In transit', M.stageCounts['In transit'], 'open exceptions'], ['Unloading', M.stageCounts.Unloading, 'open exceptions'], ['ePOD', M.stageCounts.ePOD, 'open exceptions']]
      .map(function (s) { return '<div class="sc"><span class="l">' + s[0] + '</span><b>' + n0(s[1]) + '</b><span class="d">' + s[2] + '</span></div>'; }).join('') +
      '<div class="sc spl"><span class="l">Open exceptions: AI agents vs needs you</span><div class="splitbar" aria-hidden="true"><i style="width:' + (ai / tot * 100) + '%" class="a"></i><i style="width:' + (you / tot * 100) + '%" class="y"></i></div>' +
      '<span class="d"><b>' + pct(ai / tot) + '</b> with agents (' + n0(M.lanes.ai) + ' working, ' + n0(M.lanes.verify) + ' verifying) · <b>' + pct(you / tot) + '</b> need you (' + n0(you) + ') · ' + n0(agentClosed) + ' closed by agents</span>' +
      '<span class="d">Trips with issues ' + n0(M.tripsWithIssues) + ' = agents ' + n0(M.tripsMonitored) + ' + awaiting action ' + n0(M.tripsAwaiting) + '</span></div>');
    var ranked = queueHtml(u, M);
    // Selected case: keep the user's choice; default to the top of the ranking.
    if (!u.sel || !FX.ticket(u.sel)) u.sel = ranked[0] ? ranked[0].id : null;
    var wide = ctWide();
    var work = document.getElementById('t-work'); if (work) work.classList.toggle('is-wide', wide);
    if (wide) casePane('t-case', u); else slot('t-case', '');
    if (!wide && UI.detailOpen && UI.detailOpen.caseId) { /* drawer keeps its snapshot until reopened */ }
    // Verification list
    var vf = M.openTickets.filter(function (t) { return t.phase === 'verify'; }).sort(function (a, b) { return (b.o.since || 0) - (a.o.since || 0); });
    var vlim = u.vlim || 8;
    slot('t-vf-n', n0(vf.length) + ' in verification');
    slot('t-vf', (vf.slice(0, vlim).map(function (t) {
      var o = t.o || {}, via = o.via === 'agent' && o.reason === 'Agent call' ? 'Agent call' : { manual: 'Manual update', call: 'Call logged', approval: 'Approved action', agent: 'Agent email' }[o.via] || 'Action';
      var met = (o.criteria || []).filter(function (c) { return c.met; }).length;
      return '<div class="vf"><div class="vh"><button class="lnk" data-act="case-open" data-arg="' + esc(t.id) + '"><b>' + esc(t.vehicle) + '</b></button> <span class="muted">' + esc(t.cat) + ' · ' + esc(t.dest) + '</span><span class="sbadge s-verify">' + ICON.clockI + met + ' of ' + (o.criteria || []).length + ' checks met</span></div><div class="muted sm">' + via + (o.actor ? ' by ' + esc(o.actor) : '') + ' at ' + U.fmtTime(FX.timeOf(o.since || 0)) + '</div>' +
        '<ul class="ev">' + (o.criteria || []).map(function (c) { return '<li class="' + (c.met ? 'ok' : '') + '" title="' + esc(c.note || (c.due != null ? 'Check at ' + U.fmtTime(FX.timeOf(c.due)) : 'Waiting')) + '"><span class="bx">' + (c.met ? ICON.tick : '') + '</span>' + esc(c.label) + '<em>' + (c.met ? 'Met' : c.due != null ? 'Due ' + U.fmtTime(FX.timeOf(c.due)) : 'Waiting') + '</em></li>'; }).join('') + '</ul></div>';
    }).join('') || '<div class="empty">Nothing being verified.</div>') + (vf.length > vlim ? '<button class="fxmore" data-act="vmore">Show ' + (vf.length - vlim) + ' more</button>' : ''));
    // Sent for approval
    var sent = FX.requestsFrom(), pend = sent.filter(function (r) { return r.status === 'pending'; }).length;
    slot('t-sent-n', pend ? pend + ' awaiting decision' : sent.length ? sent.length + ' decided' : '');
    slot('t-sent', sent.length ? sent.slice(0, u.slim || 6).map(function (r) {
      var st = r.status === 'pending' ? '<span class="sbadge s-approval">' + ICON.hold + 'Awaiting ' + esc(r.to === 'plant' ? 'plant head' : 'logistics head') + '</span>' : r.status === 'approved' ? '<span class="sbadge s-closed">' + ICON.ok + 'Approved · action initiated</span>' : '<span class="sbadge s-reopen">' + ICON.warn + 'Rejected · back in queue</span>';
      return '<button class="sent" data-act="case-open" data-arg="' + esc(r.tickets[0]) + '"><span><b>' + esc(C.approvalTypes[r.type].label) + '</b><span class="muted sm">' + esc(r.title.split(' · ').pop()) + ' · ' + esc(ps(r.plant)) + ' · ' + U.fmtTime(FX.timeOf(r.at)) + (r.status !== 'pending' ? ' · ' + esc(r.decidedBy) + (r.comment ? ': ' + esc(r.comment) : '') : '') + '</span></span>' + st + '</button>';
    }).join('') : '<div class="empty">No cases sent for approval this shift.</div>');
    // Agents roster (collapsed by default)
    var agTot = { w: 0, y: 0, c: 0 };
    slot('t-ag', Object.keys(S.guardrails).map(function (cat) {
      var g = S.guardrails[cat], list = d.tickets.filter(function (t) { return t.cat === cat; });
      var withAg = list.filter(function (t) { return t.phase === 'verify' || (t.phase === 'open' && t.lane === 'ai'); }).length, needs = list.filter(function (t) { return t.phase === 'open' && t.lane !== 'ai'; }).length, closed = list.filter(function (t) { return t.phase === 'closed'; }).length;
      agTot.w += withAg; agTot.y += needs; agTot.c += closed;
      return '<div class="ag"><div class="nm"><span class="sbadge ' + (g.active ? 's-closed' : 's-reopen') + '">' + (g.active ? 'Active' : 'Paused') + '</span>' + aiBadge() + esc(cat) + '</div><div class="ds">' + esc(AGENT_DESC[cat]) + '</div><div class="st2"><span>With agent <b>' + n0(withAg) + '</b></span><span>Needs you <b>' + n0(needs) + '</b></span><span>Closed <b>' + n0(closed) + '</b></span></div></div>';
    }).join(''));
    slot('t-ag-s', Object.keys(S.guardrails).length + ' agents · ' + n0(agTot.w) + ' with agents · ' + n0(agTot.y) + ' need you · ' + n0(agTot.c) + ' closed');
    var last = u.feedSeen || 0, evs = S.events.filter(function (e) { return e.kind !== 'config'; }).slice().sort(function (a, b) { return b.t - a.t; }).slice(0, 25);
    slot('t-feed', evs.map(function (e) {
      return '<li class="' + (e.t > last ? 'new' : '') + '">' + (e.ticket ? '<button data-act="case-open" data-arg="' + esc(e.ticket) + '">' : '<span class="nb">') + '<span class="t">' + U.fmtTime(FX.timeOf(e.t)) + '</span><span>' + (isAiActor(e) ? aiBadge() : '') + '<b>' + esc(e.actor) + '</b> · ' + esc(e.text) + '</span>' + (e.ticket ? '</button>' : '</span>') + '</li>';
    }).join(''));
    slot('t-feed-s', evs[0] ? 'Latest ' + U.fmtTime(FX.timeOf(evs[0].t)) + ' · ' + esc(evs[0].actor) : '');
    u.feedSeen = S.clockMin;
  }
};
/* One ranked queue of cases that need a person, grouped by reason. Ranking, grouping and limits as before; every group header shown. */
function queueHtml(u, M) {
  var need = M.openTickets.filter(function (t) { return t.phase === 'open' && t.lane !== 'ai' && (!u.qplant || t.plant === u.qplant); });
  var ranked = rankTickets(need), rank = {}; ranked.forEach(function (t, i) { rank[t.id] = i + 1; });
  var groups = {}; ranked.forEach(function (t) { (groups[t.cat] = groups[t.cat] || []).push(t); });
  var gl = Object.keys(groups).sort(function (a, b) { return rank[groups[a][0].id] - rank[groups[b][0].id]; });
  u.gopen = u.gopen || {}; u.glim = u.glim || {};
  slot('t-qas', n0(need.length) + ' cases · ' + gl.length + ' reasons' + (u.qplant ? ' · ' + esc(ps(u.qplant)) : ''));
  var html = u.qplant ? '<div class="rule"><span class="pill p-y">' + esc(ps(u.qplant)) + ' <button data-act="qplant" data-arg="" aria-label="Clear plant filter">×</button></span></div>' : '';
  html += gl.map(function (cat, gi) {
    var list = groups[cat], open = u.gopen[cat] != null ? u.gopen[cat] : gi === 0, lim = u.glim[cat] || 10;
    var act = list.filter(function (t) { return t.lane === 'action'; }).length;
    return '<div class="rgrp"><button class="gh" data-act="qgrp" data-arg="' + esc(cat) + '" data-open="' + (open ? 1 : 0) + '" aria-expanded="' + open + '"><span class="chev' + (open ? ' o' : '') + '">' + ICON.chev + '</span><span class="gt"><b>' + esc(cat) + '</b> <span class="muted">· top case #' + rank[list[0].id] + ' ' + esc(list[0].vehicle) + '</span></span><span class="cnt"><b>' + list.length + '</b> cases</span><span class="cnt"><b class="c-red">' + act + '</b> action · <b>' + (list.length - act) + '</b> follow up</span></button>' +
      (open ? '<div class="qhead" aria-hidden="true"><span>Rank</span><span>Case</span><span>Plant → site · transporter</span><span>SLA age · level · actions</span></div>' + list.slice(0, lim).map(function (t) { return qRow(t, rank[t.id], u.sel === t.id); }).join('') + (list.length > lim ? '<button class="fxmore" data-act="qlim" data-arg="' + esc(cat) + '">Show ' + Math.min(20, list.length - lim) + ' more of ' + list.length + '</button>' : '') : '') + '</div>';
  }).join('');
  if (!need.length) html += '<div class="empty" style="padding:14px 16px">Nothing needs a person right now.</div>';
  slot('t-q', html);
  return ranked;
}
function qRow(t, rk, sel) {
  var sla = t.slaH, cls = sla > 48 ? 'bad' : sla > 12 ? 'warn' : 'ok', s = statusOf(t);
  return '<div class="qrow' + (rk === 1 ? ' first' : '') + (sel ? ' sel' : '') + '" data-tid="' + esc(t.id) + '"><span class="rk">#' + rk + (rk === 1 ? '<small>First</small>' : '') + '</span>' +
    '<span class="qc"><span class="ty">' + esc(t.vehicle) + (t.repeat ? '<span class="rep" title="Transporter has ' + C.repeatOffender.minOpen + '+ open cases">REPEAT</span>' : '') + '</span><span class="sb">DI ' + esc(t.di) + '</span><span class="sb" title="' + esc(t.mText + ' · ' + (t.sub || '')) + '">' + esc(t.mText) + (t.sub ? ' · ' + esc(t.sub) : '') + '</span></span>' +
    '<span class="qr"><span class="sb w" title="' + esc(ps(t.plant) + ' → ' + t.dest) + '">' + esc(ps(t.plant).replace(/ Cement Works$/, '')) + ' → ' + esc(t.dest) + '</span><span class="sb" title="' + esc(t.transporter) + '">' + esc(t.transporter) + '</span></span>' +
    '<span class="qe"><span class="ql"><span class="sla ' + cls + '" title="SLA age">' + hrs(sla) + '</span><span class="lv ' + (t.lane === 'action' ? 'lv3' : 'lv1') + '">' + (t.lane === 'action' ? 'Action' : 'Follow up') + '</span>' + (s.cls === 's-reopen' ? '<span class="sbadge s-reopen sm">' + ICON.warn + 'Reopened</span>' : '') + '</span>' +
    '<span class="acts"><button class="btn sm y" data-act="case-open" data-arg="' + esc(t.id) + '">Open case</button><button class="btn sm km" data-act="qmenu" data-arg="' + esc(t.id) + '" aria-haspopup="menu" aria-expanded="false" aria-label="Actions for ' + esc(t.vehicle) + ': call driver, call transporter, resolve, send for approval" title="Actions: call, resolve, approval"><span class="mlbl">More</span>' + ICON.more + '</button></span></span></div>';
}
UI.on('case-open', function (d) {
  var s = session(), u = uiFor(s.role); u.sel = d.arg; saveUi(); closeMenu();
  if (s.role === 'ct' && u.view === 'home' && ctWide()) { UI.closeDetail(); render(); var p = document.getElementById('t-case'); if (p) { var r = p.getBoundingClientRect(); if (r.top < 70 || r.top > window.innerHeight - 120) p.scrollIntoView({ block: 'start', behavior: 'smooth' }); var h = p.querySelector('h2'); if (h) h.focus({ preventScroll: true }); } return; }
  var t = FX.ticket(d.arg); if (!t) return;
  var id = d.arg;
  UI.detail(t.vehicle + ' · ' + t.cat, 'Press Esc or Close to return to the same place in the queue', function () { return '<div class="case in-drawer">' + casePaneBody(FX.ticket(id) || t, uiFor('ct')) + '</div>'; });
  if (UI.detailOpen) UI.detailOpen.caseId = d.arg;
});
UI.on('ctab', function (d) {
  var u = uiFor('ct'); u.ctab = d.arg; saveUi();
  if (UI.detailOpen && UI.detailOpen.caseId) { UI.detailOpen.refresh(); var dr = document.getElementById('fx-dr'); var b = dr && dr.querySelector('[data-act=ctab][data-arg="' + d.arg + '"]'); if (b) b.focus(); return; }
  render(); var bb = document.querySelector('#t-case [data-act=ctab][data-arg="' + d.arg + '"]'); if (bb) bb.focus();
});
UI.on('ctx', function (d) {
  var u = uiFor('ct'); u.ctx = u.ctx || {}; u.ctx[d.arg] = !u.ctx[d.arg]; saveUi();
  if (UI.detailOpen && UI.detailOpen.caseId) { UI.detailOpen.refresh(); return; }
  render();
});

/* Selected case: identity and status header, actions, then tabs over existing content. */
function casePane(id, u) {
  var t = u.sel && FX.ticket(u.sel);
  if (!t) { slot(id, '<div class="empty" style="padding:20px">Select a case to see what has happened and act on it.</div>'); return; }
  slot(id, '<div id="t-case-h"></div><div id="t-case-b" class="cs-b" role="tabpanel"></div>');
  var parts = caseParts(t, u); slot('t-case-h', parts.head); slot('t-case-b', parts.body);
}
function casePaneBody(t, u) { var p = caseParts(t, u); return p.head + '<div class="cs-b" role="tabpanel">' + p.body + '</div>'; }
function caseParts(t, u) {
  var tab = u.ctab || 'trip', o = t.o || {}, calcs = FX.derive().calcByDi, c = calcs[t.di];
  var tabs = [['trip', 'Trip details'], ['calls', 'Calls & responses'], ['timeline', 'Timeline'], ['verify', 'Verification']];
  var calls = caseCalls(t), mails = FX.thread(t.id) || [], rec = recordingFor(t);
  var counts = { calls: calls.length + mails.length + (rec ? 1 : 0), timeline: FX.state().events.filter(function (e) { return e.ticket === t.id; }).length, verify: (o.criteria || []).length };
  var head = '<div class="cs-h"><div class="cs-id"><h2 tabindex="-1">' + esc(t.vehicle) + (t.repeat ? '<span class="rep">REPEAT</span>' : '') + '</h2>' + statusBadge(t) + '</div>' +
    '<div class="cs-sub">DI ' + esc(t.di) + ' · ' + esc(t.cat) + (t.sub ? ' · ' + esc(t.sub) : '') + '</div>' +
    '<div class="cs-m"><div><span>Current measure</span><b>' + esc(t.mText) + '</b>' + (t.mSub ? '<em>' + esc(t.mSub) + '</em>' : '') + '</div><div><span>SLA age</span><b>' + hrs(t.slaH) + '</b></div><div><span>Level</span><b>' + (t.phase === 'open' ? (t.lane === 'action' ? 'Action' : t.lane === 'followup' ? 'Follow up' : 'Agent') : esc(t.status)) + '</b></div></div>' +
    '<div class="cs-a" role="group" aria-label="Case actions"><button class="btn sm" data-act="tk-call" data-kind="call-driver" data-arg="' + esc(t.id) + '">' + ICON.phone + 'Call driver</button><button class="btn sm" data-act="tk-call" data-kind="call-transporter" data-arg="' + esc(t.id) + '">' + ICON.phone + 'Call transporter</button><button class="btn sm" data-act="tk-call" data-kind="close" data-arg="' + esc(t.id) + '">Resolve…</button>' +
    (FX.approvalTypesFor(t.cat).length ? '<button class="btn sm" data-act="apr-new" data-arg="' + esc(t.id) + '">Send for approval…</button>' : '') + '<button class="btn sm k" data-act="tk-open" data-arg="' + esc(t.id) + '">Full case record</button></div>' +
    '<div class="tabs sm" role="tablist" aria-label="Case sections">' + tabs.map(function (x) { return '<button role="tab" class="tab' + (tab === x[0] ? ' on' : '') + '" aria-selected="' + (tab === x[0]) + '" data-act="ctab" data-arg="' + x[0] + '">' + x[1] + (counts[x[0]] ? ' <span class="tc">' + counts[x[0]] + '</span>' : '') + '</button>'; }).join('') + '</div></div>';
  var body = '';
  if (tab === 'trip') {
    var tr = t.trip;
    var rows = [['Plant', ps(t.plant)], ['Destination', t.dest], ['Transporter', t.transporter], ['Driver', t.driver], ['Lead distance', tr.km + ' km'], ['Stage', tr.stage], ['DI raised', U.fmtDT(tr.start)], ['Planned gate-out', c ? U.fmtDT(c.gateOut) : '—'], ['Planned arrival', c ? U.fmtDT(c.arrival) : '—'], ['Segment', tr.segment], ['Product', tr.product], ['Fleet', FX.dedicated(tr) ? 'Dedicated' : 'Market']];
    body = '<dl class="facts2">' + rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>' + (c ? '<div class="cs-tm"><span>Timing</span>' + tripTiming(c) + '</div>' : '') +
      (o.note ? '<div class="cs-note">' + ICON.warn + '<span><b>Latest note</b> ' + esc(o.note) + '</span></div>' : '');
  } else if (tab === 'calls') {
    u.ctx = u.ctx || {};
    body = (rec ? '<h4 class="cs-s">Call recording</h4><div class="call" data-callkey="rec:' + esc(t.cat) + '"><div class="call-h"><b>' + esc(rec.label) + '</b><span class="muted">' + Math.floor(rec.seconds / 60) + ':' + ('0' + Math.round(rec.seconds % 60)).slice(-2) + '</span></div>' +
      '<div class="call-o"><span>Transcript</span> Not transcribed yet</div>' +
      '<div class="call-c"><button class="btn sm" data-act="pane-play" data-arg="rec:' + esc(t.cat) + '" aria-label="Play recording">' + ICON.play + 'Play recording</button><progress max="1" value="0" aria-label="Playback progress"></progress></div></div>' : '') +
      (calls.length ? '<h4 class="cs-s">Agent calls (' + calls.length + ')</h4>' + calls.map(function (cl, i) {
      var k = 'c' + i + t.id, open = u.ctx[k], tx = cl.tx;
      return '<div class="call" data-callkey="' + esc(tx.audio || '') + '"><div class="call-h">' + aiBadge() + '<b>' + esc(tx.party) + '</b><span class="muted">' + esc(tx.language) + ' · ' + esc(cl.when) + (tx.duration ? ' · ' + Math.floor(tx.duration / 60) + ':' + ('0' + Math.round(tx.duration % 60)).slice(-2) : '') + '</span></div>' +
        '<div class="call-o"><span>Outcome</span> ' + esc(tx.outcome || FX.readTranscript(tx).outcome) + '</div>' +
        '<div class="call-c">' + (tx.audio ? '<button class="btn sm" data-act="pane-play" data-arg="' + esc(tx.audio) + '" aria-label="Play recording">' + ICON.play + 'Play recording</button><progress max="1" value="0" aria-label="Playback progress"></progress>' : '') + '<button class="dlink" data-act="ctx" data-arg="' + esc(k) + '" aria-expanded="' + !!open + '">' + (open ? 'Hide transcript' : 'Show transcript (' + tx.lines.length + ' lines)') + '</button></div>' +
        (open ? '<div class="rp-tx">' + tx.lines.map(function (l, j) { return '<p data-i="' + j + '"' + (l.t != null ? ' data-t="' + l.t + '"' : '') + '><em>' + esc(l.speaker) + '</em>' + esc(l.text || l.translation) + (l.text && l.translation && l.text !== l.translation ? '<span class="tr">' + esc(l.translation) + '</span>' : '') + '</p>'; }).join('') + '</div>' : '') + '</div>';
    }).join('') : '<p class="empty">No agent calls on this case.</p>') +
      (mails.length ? '<h4 class="cs-s">Emails and replies (' + mails.length + ')</h4>' + mails.map(function (m, i) {
        var k = 'm' + i + t.id, open = u.ctx[k], agent = m.fromEmail === C.agentEmail.address;
        return '<div class="mail"><div class="call-h">' + (agent ? aiBadge() : '') + '<b>' + esc(m.fromName || m.fromEmail) + '</b><span class="muted">' + esc(U.fmtDT(Date.parse(m.receivedAt))) + '</span></div><div class="muted sm">To ' + esc(m.toEmails) + '</div><div class="mail-s">' + esc(m.subject || '') + '</div>' +
          (m.actionNote ? '<div class="call-o"><span>Read as</span> ' + esc(m.actionNote) + '</div>' : '') +
          '<button class="dlink" data-act="ctx" data-arg="' + esc(k) + '" aria-expanded="' + !!open + '">' + (open ? 'Hide message' : 'Show message') + '</button>' + (open ? '<pre class="mail-b">' + esc(m.messageText.split('\n\nOn ')[0]) + '</pre>' : '') + '</div>';
      }).join('') : '');
  } else if (tab === 'timeline') {
    var evs = FX.state().events.filter(function (e) { return e.ticket === t.id; }).slice().sort(function (a, b) { return a.t - b.t; });
    var all = u.ctx && u.ctx['tl' + t.id], shown = all ? evs : evs.slice(-8);
    body = evs.length ? (evs.length > shown.length ? '<button class="dlink" data-act="ctx" data-arg="tl' + esc(t.id) + '">Show all ' + evs.length + ' events</button>' : '') + '<ol class="tl">' + shown.map(function (e) {
      return '<li class="k-' + esc(e.kind) + '"><span class="tt">' + U.fmtDay(FX.timeOf(e.t)) + ' ' + U.fmtTime(FX.timeOf(e.t)) + '</span><span class="tb">' + (isAiActor(e) ? aiBadge() : '') + '<b>' + esc(e.actor) + '</b> <span class="muted">' + esc(e.actorType) + '</span><span class="tx">' + esc(e.text) + '</span></span></li>';
    }).join('') + '</ol>' + (all && evs.length > 8 ? '<button class="dlink" data-act="ctx" data-arg="tl' + esc(t.id) + '">Show latest 8 only</button>' : '') : '<p class="empty">No events recorded on this case yet.</p>';
  } else {
    if (o.criteria && o.criteria.length) {
      var met = o.criteria.filter(function (x) { return x.met; }).length;
      body = '<div class="vsum">' + statusBadge(t) + '<span>' + met + ' of ' + o.criteria.length + ' checks met' + (o.since != null ? ' · since ' + U.fmtTime(FX.timeOf(o.since)) : '') + (o.actor ? ' · ' + esc(o.actor) : '') + '</span></div>' +
        '<ul class="ev big">' + o.criteria.map(function (cc) { return '<li class="' + (cc.met ? 'ok' : '') + '"><span class="bx">' + (cc.met ? ICON.tick : '') + '</span><span><b>' + esc(cc.label) + '</b><span class="muted sm">' + (cc.met ? 'Met' + (cc.metAt != null ? ' at ' + U.fmtTime(FX.timeOf(cc.metAt)) : '') + (cc.note ? ' · ' + esc(cc.note) : '') : cc.due != null ? 'Due ' + U.fmtTime(FX.timeOf(cc.due)) : 'Waiting for evidence') + '</span></span></li>'; }).join('') + '</ul>' +
        (o.evidence ? '<div class="cs-note">' + ICON.ok + '<span><b>Closed on evidence</b> ' + esc(o.evidence.join(' · ')) + '</span></div>' : '');
    } else body = '<p class="empty">This case is not in verification. Status: ' + esc(t.status) + '.</p>';
    if (o.history && o.history.length) body += '<h4 class="cs-s">History</h4><ul class="hist">' + o.history.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ul>';
  }
  return { head: head, body: body };
}
/* Calls on a ticket, from the store (agent calls) or the ticket's own record. */
/* Real call recordings (src/fx/recordings.ts) sit on the top-ranked case of their type, ranked
   exactly as in "Cases that need a person". Audio only: no transcript is attached yet. */
function recordingFor(t) {
  var r = RECORDINGS[t.cat]; if (!r) return null;
  var need = FX.metrics().openTickets.filter(function (x) { return x.phase === 'open' && x.lane !== 'ai' && x.cat === t.cat; });
  var top = rankTickets(need)[0];
  return top && top.id === t.id ? r : null;
}
function caseCalls(t) {
  var S = FX.state(), out = [];
  (S.calls[t.id] || []).forEach(function (cl) { out.push({ tx: FX.txFor(t, cl.lib, cl.eta), when: U.fmtDT(FX.timeOf(cl.at)) }); });
  if (!out.length) { var cs = FX.getCT().cases.find(function (c) { return c.id === (t.caseId || t.id); }); if (cs) cs.auditTrail.forEach(function (a) { if (a.transcript) out.push({ tx: a.transcript, when: a.time }); }); }
  return out;
}
/* Pane audio: one player; lines highlight by their start times. */
var paneAudio = null, paneKey = null;
UI.on('pane-play', function (d, btn) {
  if (paneAudio && paneKey === d.arg && !paneAudio.paused) { paneAudio.pause(); btn.innerHTML = ICON.play + 'Play recording'; return; }
  if (paneAudio) paneAudio.pause();
  var url = /^rec:/.test(d.arg) ? recordingUrl(d.arg.slice(4)) : FX.audioUrl(d.arg); if (!url) { btn.textContent = 'No recording'; return; }
  paneAudio = new Audio(url); paneKey = d.arg;
  btn.innerHTML = ICON.pause + 'Pause';
  function box() { return document.querySelector('#fx-app [data-callkey="' + CSS.escape(d.arg) + '"]'); }
  paneAudio.ontimeupdate = function () {
    var b = box(); if (!b) return;
    var pr = b.querySelector('progress'); if (pr && paneAudio.duration) pr.value = paneAudio.currentTime / paneAudio.duration;
    var lines = b.querySelectorAll('.rp-tx p'), k = 0, cur = paneAudio.currentTime;
    lines.forEach(function (p, i) { if (Number(p.getAttribute('data-t')) <= cur + 0.05) k = i; });
    lines.forEach(function (p, i) { p.classList.toggle('hl', i === k); });
  };
  paneAudio.onended = paneAudio.onpause = function () { var b = box(); var bt = b && b.querySelector('[data-act=pane-play]'); if (bt) bt.innerHTML = ICON.play + 'Play recording'; };
  paneAudio.play().catch(function () { btn.innerHTML = ICON.play + 'Play recording'; });
});

/* =================== Trip replay: collapsible transcripts and emails, AI badges =================== */
var _rpRender = UI.replay.render;
UI.replay.render = function (slotId, u) {
  _rpRender(slotId, u);
  var host = document.getElementById(slotId); if (!host) return;
  u.rpx = u.rpx || {};
  host.querySelectorAll('.rp-step').forEach(function (st, i) {
    var body = st.querySelector('.rp-body'); if (!body || body.__fx) return; body.__fx = 1;
    var key = (u.rpTrip || '') + ':' + i, has = body.querySelector('.rp-tx, .rp-mail');
    var meta = body.querySelector('.meta'); if (meta && /AI agent|System/.test(meta.textContent)) meta.insertAdjacentHTML('afterbegin', aiBadge());
    if (!has) return;
    var isTx = !!body.querySelector('.rp-tx');
    var b = document.createElement('button'); b.className = 'dlink rp-tog'; b.setAttribute('data-act', 'rp-x'); b.setAttribute('data-arg', key);
    var open = !!u.rpx[key]; b.setAttribute('aria-expanded', open); b.textContent = open ? (isTx ? 'Hide transcript' : 'Hide email') : (isTx ? 'Show transcript' : 'Show email');
    body.classList.toggle('x-open', open);
    (body.querySelector('.rp-audio') || body.querySelector('b')).insertAdjacentElement('afterend', b);
  });
};
UI.on('rp-x', function (d, btn) {
  var u = uiFor(session().role); u.rpx = u.rpx || {}; u.rpx[d.arg] = !u.rpx[d.arg]; saveUi();
  var body = btn.closest('.rp-body'), isTx = !!body.querySelector('.rp-tx');
  body.classList.toggle('x-open', u.rpx[d.arg]); btn.setAttribute('aria-expanded', u.rpx[d.arg]);
  btn.textContent = u.rpx[d.arg] ? (isTx ? 'Hide transcript' : 'Hide email') : (isTx ? 'Show transcript' : 'Show email');
});
/* Expand a step's transcript automatically while its recording plays. */
var _rpAudio = handlers['rp-audio'];
UI.on('rp-audio', function (d, btn, e) { var body = btn.closest('.rp-body'); if (body) { body.classList.add('x-open'); var t = body.querySelector('.rp-tog'); if (t) { t.setAttribute('aria-expanded', 'true'); t.textContent = 'Hide transcript'; } } _rpAudio(d, btn, e); });

/* Exceptions map page: legend always visible (no change to markers). */
var _mapView = mapView;

/* =====================================================================
   v5: header, AI agents module, activity stream, KPI sparklines.
   Presentation only; reads the same store.
   ===================================================================== */
ICON.ai = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>';
ICON.pin = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
NAV.clo.splice(1, 0, ['agents', 'AI agents', 'ai']);
NAV.plant.splice(1, 0, ['agents', 'AI agents', 'ai']);
NAV.ct.splice(1, 0, ['agents', 'AI agents', 'ai']);
VIEW_TITLE.clo.agents = VIEW_TITLE.plant.agents = VIEW_TITLE.ct.agents = 'AI agents at work';

/* ---------- header: place, time (HH:MM), compact profile ---------- */
function placeText(s, u) {
  var R = FX.raw();
  function geo(p) { var g = R.geo[p] || {}; return g.place || g.state || ''; }
  if (s.role === 'plant') return '<b>' + esc(ps(C.plantHeadPlant)) + '</b>' + (geo(C.plantHeadPlant) ? '<span>' + esc(geo(C.plantHeadPlant)) + '</span>' : '');
  var p = s.role === 'clo' ? u.plant : u.qplant;
  if (p) return '<b>' + esc(ps(p)) + '</b>' + (geo(p) ? '<span>' + esc(geo(p)) + '</span>' : '');
  return '<b>All plants</b><span>' + R.plants.length + ' plants · India</span>';
}
function clockTick() {
  var el = document.getElementById('fx-clock'); if (!el) return;
  var d = new Date(Date.now() + 19800000), t = String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0');
  if (el.textContent !== t) el.textContent = t;
}
function mount() {
  var s = session();
  UI.closeDetail && root && UI.closeDetail();
  closeMenu();
  document.title = PRODUCT;
  if (!s) { FX.stopLive(); if (window.__FXBridge) window.__FXBridge.close(); root.innerHTML = loginHtml(); return; }
  var u = uiFor(s.role);
  if (!UI.views[s.role][u.view]) u.view = 'home';
  root.innerHTML = '<a class="skip" href="#fx-main">Skip to content</a><div class="shell"><nav class="rail" aria-label="Sections"><div class="logo"><img src="' + A.ut + '" alt="UltraTech"></div>' +
    NAV[s.role].map(function (n) { return '<button class="ri' + (u.view === n[0] ? ' on' : '') + (n[0] === 'agents' ? ' ri-ai' : '') + '" data-act="nav" data-arg="' + n[0] + '"' + (u.view === n[0] ? ' aria-current="page"' : '') + '>' + ICON[n[2]] + '<span>' + n[1] + '</span></button>'; }).join('') +
    '<div class="sp"></div><div class="eng" id="fx-eng"></div></nav>' +
    '<div class="col"><header class="top"><div class="who-t"><div class="r">' + PRODUCT + '</div><h1>' + esc(VIEW_TITLE[s.role][u.view] || TITLES[s.role]) + '</h1></div>' +
    '<span class="place" id="fx-place" title="Plant or geography in view">' + ICON.pin + '<span id="fx-place-t"></span></span>' +
    '<div class="search">' + ICON.search + '<input id="fx-search" type="text" placeholder="Search DI, truck, plant, site, transporter" aria-label="Search trips, trucks, plants, sites or transporters" autocomplete="off" data-inp="search"><kbd>/</kbd><div class="sres hide" id="fx-sres"></div></div>' +
    '<span class="clock" id="fx-clock" aria-label="Current time, IST" title="Current time, IST"></span>' +
    '<button class="ask-btn" data-act="chat" aria-label="Ask AI about the live data"><i></i>Ask AI</button>' +
    '<div class="user" title="' + esc(s.name + ', ' + s.title) + '"><span class="av" aria-hidden="true">' + initials(s.name) + '</span><span class="ut">' + esc(s.title) + '</span><button class="icon-btn" data-act="logout" title="Sign out" aria-label="Sign out ' + esc(s.name) + '">' + ICON.out + '</button></div></header>' +
    '<main id="fx-main" class="v-' + s.role + '-' + u.view + '" tabindex="-1"></main><div class="foot"><span id="fx-foot"></span><span>Powered by<img src="' + A.fx + '" alt="Fleetx"></span></div></div></div>' +
    '<aside class="chat' + (ui.chatOpen ? ' on' : '') + '" id="fx-chat" aria-label="Ask AI"></aside>';
  mainEl = document.getElementById('fx-main');
  mainEl.innerHTML = UI.views[s.role][u.view].layout(u);
  UI.chat.mount(document.getElementById('fx-chat'), s);
  clockTick();
  FX.startLive();
  render();
}
function render() {
  renderQueued = false;
  var s = session(); if (!s || !mainEl) return;
  var u = uiFor(s.role);
  var M = FX.metrics(s.role === 'plant' ? C.plantHeadPlant : null);
  slot('fx-eng', '<b>' + n0(M.trips) + '</b><span>trips in cycle</span><b>' + n0(M.open) + '</b><span>open exceptions</span>');
  slot('fx-place-t', placeText(s, u));
  slot('fx-foot', '<span class="ldot"></span>Live · refreshed every ' + Math.round(C.live.tickMs / 1000) + ' s');
  try { UI.views[s.role][u.view].update(u); } catch (e) { console.error(e); }
  applyTabs(u);
}
UI.render = render;

/* ---------- agent activity: channels, scope, counts ---------- */
var CHANNEL = {
  call: ['Call', 'ch-call'], email: ['Email', 'ch-mail'], reply: ['Email reply', 'ch-mail'], eta: ['ETA update', 'ch-eta'], verify: ['Verification', 'ch-ver'],
  check: ['GPS check', 'ch-sys'], close: ['Closed on evidence', 'ch-ok'], handback: ['Handed to team', 'ch-hand'], detect: ['Picked up', 'ch-sys'],
  approval: ['Approval', 'ch-apr'], 'approval-req': ['Approval request', 'ch-apr'], human: ['Manual', 'ch-sys']
};
function chOf(e) { return CHANNEL[e.kind] || ['Update', 'ch-sys']; }
function actorLabel(e) { if (/FLEETX AI AGENT/i.test(e.actor || '')) return 'AI email agent'; return e.actor || ''; }
function evPlant(e) { var R = FX.raw(), t = e.di && R.byDi[e.di]; if (t) return t.plant; var tk = e.ticket && FX.ticket(e.ticket); return tk ? tk.plant : null; }
function scopedEvents(plant, sinceMin) {
  var S = FX.state();
  return S.events.filter(function (e) { return e.kind !== 'config' && (sinceMin == null || e.t >= sinceMin) && (!plant || evPlant(e) === plant); });
}
function agentCounts(plant) {
  var S = FX.state(), ev = scopedEvents(plant, S.clockMin - 1440), c = { call: 0, email: 0, reply: 0, eta: 0, close: 0, handback: 0, detect: 0 };
  ev.forEach(function (e) {
    if (e.kind === 'call' && e.actorType !== 'Human') c.call++;
    else if (e.kind === 'email' && e.actorType !== 'Human') c.email++;
    else if (e.kind === 'reply') c.reply++;
    else if (e.kind === 'eta') c.eta++;
    else if (e.kind === 'close' && e.actorType !== 'Human') c.close++;
    else if (e.kind === 'handback') c.handback++;
    else if (e.kind === 'detect') c.detect++;
  });
  return c;
}
/* Activity stream row (time · actor · channel, then the text). */
function ctxLine(e) {
  var t = e.ticket && FX.ticket(e.ticket); if (!t) return '';
  if (e.text.indexOf(t.vehicle) >= 0) return '<span class="st-c">' + esc(t.cat) + ' · ' + esc(ps(t.plant)) + ' → ' + esc(t.dest) + '</span>';
  return '<span class="st-c"><b>' + esc(t.vehicle) + '</b> · ' + esc(t.cat) + ' · ' + esc(ps(t.plant)) + ' → ' + esc(t.dest) + '</span>';
}
function streamRow(e, last) {
  var ch = chOf(e), ai = e.actorType !== 'Human';
  var inner = '<span class="st-t">' + U.fmtTime(FX.timeOf(e.t)) + '</span><span class="st-b"><span class="st-a">' + (ai ? aiBadge() : '') + esc(actorLabel(e)) + '<span class="chp ' + ch[1] + '">' + ch[0] + '</span></span><span class="st-x">' + esc(e.text) + '</span>' + ctxLine(e) + '</span>';
  return '<li class="' + (e.t > last ? 'new' : '') + '">' + (e.ticket ? '<button data-act="case-or-ticket" data-arg="' + esc(e.ticket) + '">' + inner + '</button>' : '<div>' + inner + '</div>') + '</li>';
}
UI.on('case-or-ticket', function (d, el, ev) {
  var s = session();
  if (s.role === 'ct') { handlers['case-open'](d, el, ev); return; }
  closeMenu(); UI.closeDetail(); FX.openTicket(d.arg);
});
function streamHtml(list, last) { return list.length ? '<ul class="stream">' + list.map(function (e) { return streamRow(e, last); }).join('') + '</ul>' : '<div class="empty">No agent activity in this scope yet.</div>'; }

/* ---------- live strip on the overviews ---------- */
function agentStrip(prefix) {
  return '<section class="aistrip" aria-label="AI agents, live"><div class="ais-h"><span class="ais-ic">' + ICON.ai + '</span><div><b>AI agents, live</b><span id="' + prefix + '-ais-s"></span></div></div>' +
    '<div class="ais-n" id="' + prefix + '-ais-n"></div><ul class="ais-tk" id="' + prefix + '-ais-tk" aria-live="off"></ul><button class="ais-go" data-act="nav" data-arg="agents">See what they did ›</button></section>';
}
function agentStripUpdate(prefix, plant) {
  var S = FX.state(), c = agentCounts(plant), M = FX.metrics(plant), share = (M.lanes.ai + M.lanes.verify) / Math.max(1, M.open);
  slot(prefix + '-ais-s', pct(share) + ' of open exceptions with agents · last 24 h');
  slot(prefix + '-ais-n', [[c.call, 'Calls in Hindi'], [c.email, 'Emails sent'], [c.eta, 'Revised ETAs shared'], [c.close, 'Closed on evidence']].map(function (x) { return '<div><b>' + n0(x[0]) + '</b><span>' + x[1] + '</span></div>'; }).join(''));
  var all = scopedEvents(plant, null).filter(function (e) { return e.actorType !== 'Human'; }).sort(function (a, b) { return b.t - a.t; }), ev = [];
  [['call'], ['eta', 'email', 'reply'], ['close', 'handback']].forEach(function (ks) { var x = all.find(function (e) { return ks.indexOf(e.kind) >= 0; }); if (x) ev.push(x); });
  ev.sort(function (a, b) { return b.t - a.t; });
  slot(prefix + '-ais-tk', ev.map(function (e) { var ch = chOf(e); return '<li><span class="st-t">' + U.fmtTime(FX.timeOf(e.t)) + '</span><span class="chp ' + ch[1] + '">' + ch[0] + '</span><span class="tx">' + esc(e.text) + '</span></li>'; }).join(''));
}
var _cloLayout = UI.views.clo.home.layout, _cloUpdate = UI.views.clo.home.update;
UI.views.clo.home.layout = function (u) { return _cloLayout(u).replace('<div class="kpis" id="k-clo"></div>', '<div class="kpis" id="k-clo"></div>' + agentStrip('c')); };
UI.views.clo.home.update = function (u) { _cloUpdate(u); agentStripUpdate('c', u.plant || null); };
var _plLayout = UI.views.plant.home.layout, _plUpdate = UI.views.plant.home.update;
UI.views.plant.home.layout = function (u) { return _plLayout(u).replace('<div class="kpis" id="k-plant"></div>', '<div class="kpis" id="k-plant"></div>' + agentStrip('p')); };
UI.views.plant.home.update = function (u) { _plUpdate(u); agentStripUpdate('p', C.plantHeadPlant); };

/* ---------- AI agents module ---------- */
var AGENT_ICON = { 'Route Deviation': 'M4 19c4-1 3-7 8-8s4-6 8-7', 'In-transit Delay': 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18', 'Customer Detention': 'M3 21V9l9-6 9 6v12M9 21v-6h6v6', 'Unloading Detection': 'M3 7h11v9H3zM14 10h4l3 3v3h-7', 'ePOD Delay': 'M6 3h9l4 4v14H6zM9 12h7M9 16h5' };
function agentsLayout(role) {
  return function (u) {
    return '<section class="aihero"><div class="aih-l"><div class="aih-k"><span class="ldot"></span>Live · ' + '<span id="ag-scope"></span></div><h2>Five AI agents work every exception first.</h2><p>They call drivers, transporters and sites in Hindi, email and read replies, share revised arrival times with the site and sales, and close a case only when the evidence is in. What they cannot settle comes to your team.</p></div>' +
      '<div class="aih-n" id="ag-n"></div></section>' +
      '<div class="g ag-g mt"><section class="card"><div class="ch"><h2>The agents' + info('One agent per exception type. Counts are open exceptions now: with the agent (working or verifying), needing a person, and closed on evidence this cycle.') + '</h2></div><div class="cb"><div class="agc" id="ag-cards"></div></div></section>' +
      '<section class="card"><div class="ch"><h2>Latest call</h2><span class="as">Recorded in Hindi, with translation</span></div><div class="cb" id="ag-call"></div></section></div>' +
      '<section class="card mt"><div class="ch"><h2>Activity stream' + info('Everything the agents and your team did, newest first, in this scope. Select a row to open the case.') + '</h2><div class="chips" id="ag-f" role="group" aria-label="Filter by channel"></div></div><div class="cb" id="ag-stream"></div></section>';
  };
}
function agentsUpdate(role) {
  return function (u) {
    var plant = role === 'plant' ? C.plantHeadPlant : role === 'clo' ? (u.plant || null) : (u.qplant || null);
    var S = FX.state(), d = FX.derive(), c = agentCounts(plant), M = FX.metrics(plant);
    slot('ag-scope', esc(plant ? ps(plant) : 'All plants') + ' · last 24 hours');
    var share = (M.lanes.ai + M.lanes.verify) / Math.max(1, M.open);
    slot('ag-n', '<div class="big"><b>' + pct(share) + '</b><span>of open exceptions are with agents now</span><i><em style="width:' + (share * 100).toFixed(1) + '%"></em></i><small>' + n0(M.lanes.ai) + ' working · ' + n0(M.lanes.verify) + ' verifying · ' + n0(M.lanes.action + M.lanes.followup) + ' with your team</small></div>' +
      [[c.call, 'Calls placed', 'in Hindi'], [c.email, 'Emails sent', 'to sites and transporters'], [c.reply, 'Replies read', 'and acted on'], [c.eta, 'Revised ETAs', 'shared with site and sales'], [c.close, 'Closed on evidence', 'by agents'], [c.handback, 'Handed to your team', 'when agents could not settle']]
        .map(function (x) { return '<div class="cnt"><b>' + n0(x[0]) + '</b><span>' + x[1] + '</span><small>' + x[2] + '</small></div>'; }).join(''));
    var tks = d.tickets.filter(function (t) { return !plant || t.plant === plant; });
    slot('ag-cards', Object.keys(S.guardrails).map(function (cat) {
      var g = S.guardrails[cat], list = tks.filter(function (t) { return t.cat === cat; });
      var work = list.filter(function (t) { return t.phase === 'open' && t.lane === 'ai'; }).length, ver = list.filter(function (t) { return t.phase === 'verify'; }).length, you = list.filter(function (t) { return t.phase === 'open' && t.lane !== 'ai'; }).length, done = list.filter(function (t) { return t.phase === 'closed'; }).length, tot = Math.max(1, work + ver + you + done);
      var last = scopedEvents(plant, null).filter(function (e) { var t = e.ticket && FX.ticket(e.ticket); return t && t.cat === cat && e.actorType !== 'Human'; }).sort(function (a, b) { return b.t - a.t; })[0];
      return '<article class="agcard"><div class="agh"><span class="agi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="' + AGENT_ICON[cat] + '"/></svg></span><div><b>' + esc(cat) + ' agent</b><span class="sbadge ' + (g.active ? 's-closed' : 's-reopen') + ' sm">' + (g.active ? 'Active' : 'Paused') + '</span></div></div>' +
        '<p>' + esc(AGENT_DESC[cat]) + '</p><div class="agbar" aria-hidden="true"><i class="w" style="flex:' + work + '"></i><i class="v" style="flex:' + ver + '"></i><i class="y" style="flex:' + you + '"></i><i class="c" style="flex:' + done + '"></i>' + (tot === 1 && !work && !ver && !you && !done ? '<i style="flex:1;background:var(--s3)"></i>' : '') + '</div>' +
        '<dl><div><dt>Working</dt><dd>' + work + '</dd></div><div><dt>Verifying</dt><dd>' + ver + '</dd></div><div><dt>Your team</dt><dd>' + you + '</dd></div><div><dt>Closed</dt><dd>' + done + '</dd></div></dl>' +
        (last ? '<div class="aglast"><span class="st-t">' + U.fmtTime(FX.timeOf(last.t)) + '</span>' + esc(last.text) + '</div>' : '<div class="aglast muted">No action in this scope yet.</div>') + '</article>';
    }).join(''));
    // Latest call spotlight
    var lastCall = scopedEvents(plant, null).filter(function (e) { return e.kind === 'call' && e.lib; }).sort(function (a, b) { return b.t - a.t; })[0];
    if (lastCall) {
      var trip = FX.raw().byDi[lastCall.di], tx = trip && FX.txFor({ trip: trip }, lastCall.lib, lastCall.eta);
      u.ctx = u.ctx || {};
      var key = 'agcall', open = u.ctx[key] !== false;
      slot('ag-call', tx ? '<div class="call spot" data-callkey="' + esc(tx.audio) + '"><div class="call-h">' + aiBadge() + '<b>' + esc(tx.party) + '</b><span class="muted">' + esc(trip.vehicle) + ' · ' + U.fmtTime(FX.timeOf(lastCall.t)) + ' · Hindi · ' + Math.floor(tx.duration / 60) + ':' + ('0' + Math.round(tx.duration % 60)).slice(-2) + '</span></div>' +
        '<div class="call-o"><span>Outcome</span> ' + esc(tx.outcome) + '</div><div class="call-c"><button class="btn sm y" data-act="pane-play" data-arg="' + esc(tx.audio) + '">' + ICON.play + 'Play recording</button><progress max="1" value="0" aria-label="Playback progress"></progress><button class="dlink" data-act="agx" data-arg="' + key + '">' + (open ? 'Hide transcript' : 'Show transcript') + '</button></div>' +
        (open ? '<div class="rp-tx">' + tx.lines.map(function (l, j) { return '<p data-i="' + j + '" data-t="' + l.t + '"><em>' + esc(l.speaker) + '</em>' + esc(l.text) + '<span class="tr">' + esc(l.translation) + '</span></p>'; }).join('') + '</div>' : '') + '</div>' : '<div class="empty">No calls yet.</div>');
    } else slot('ag-call', '<div class="empty">No calls in this scope yet.</div>');
    // Stream with channel filter
    var F = [['all', 'All'], ['call', 'Calls'], ['mail', 'Emails'], ['eta', 'ETA updates'], ['ver', 'Verification'], ['hand', 'Handed to team'], ['team', 'Team actions']];
    var f = u.agf || 'all';
    slot('ag-f', F.map(function (x) { return '<button class="chip' + (f === x[0] ? ' on' : '') + '" aria-pressed="' + (f === x[0]) + '" data-act="agf" data-arg="' + x[0] + '">' + x[1] + '</button>'; }).join(''));
    var ev = scopedEvents(plant, null).filter(function (e) {
      if (f === 'all') return true; if (f === 'team') return e.actorType === 'Human';
      var k = e.kind; return f === 'call' ? k === 'call' : f === 'mail' ? (k === 'email' || k === 'reply') : f === 'eta' ? k === 'eta' : f === 'ver' ? (k === 'verify' || k === 'check' || k === 'close') : k === 'handback';
    }).sort(function (a, b) { return b.t - a.t; });
    var lim = u.aglim || 15;
    slot('ag-stream', streamHtml(ev.slice(0, lim), u.agSeen || 0) + (ev.length > lim ? '<button class="fxmore" data-act="aglim">Show ' + Math.min(30, ev.length - lim) + ' more of ' + n0(ev.length) + '</button>' : ''));
    u.agSeen = S.clockMin;
  };
}
UI.on('agf', function (d) { var u = uiFor(session().role); u.agf = d.arg; u.aglim = 15; saveUi(); render(); });
UI.on('aglim', function () { var u = uiFor(session().role); u.aglim = (u.aglim || 15) + 30; saveUi(); render(); });
UI.on('agx', function (d) { var u = uiFor(session().role); u.ctx = u.ctx || {}; u.ctx[d.arg] = u.ctx[d.arg] === false; saveUi(); render(); });
['clo', 'plant', 'ct'].forEach(function (r) { UI.views[r].agents = { layout: agentsLayout(r), update: agentsUpdate(r) }; });

/* ---------- control tower feed: same stream style ---------- */
var _ctUpdate = UI.views.ct.home.update;
UI.views.ct.home.update = function (u) {
  var seen = u.feedSeen || 0;
  _ctUpdate(u);
  var S = FX.state(), evs = S.events.filter(function (e) { return e.kind !== 'config'; }).slice().sort(function (a, b) { return b.t - a.t; }).slice(0, 25);
  slot('t-feed', evs.map(function (e) { return streamRow(e, seen); }).join(''));
};
var _ctLayout = UI.views.ct.home.layout;
UI.views.ct.home.layout = function (u) { return _ctLayout(u).replace('<ul class="feed" id="t-feed"></ul>', '<ul class="stream" id="t-feed"></ul>'); };

/* ---------- KPI sparklines from the existing daily series ---------- */
function spark(vals, color) {
  vals = vals.filter(function (v) { return v != null; }); if (vals.length < 2) return '';
  var W = 96, H = 26, max = Math.max.apply(null, vals.concat([1e-9])), min = 0;
  var pts = vals.map(function (v, i) { return (i * W / (vals.length - 1)).toFixed(1) + ',' + (H - 2 - (v - min) / (max - min || 1) * (H - 4)).toFixed(1); });
  return '<svg class="spk" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true"><polyline points="' + pts.join(' ') + '" fill="none" stroke="' + color + '" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/><circle cx="' + pts[pts.length - 1].split(',')[0] + '" cy="' + pts[pts.length - 1].split(',')[1] + '" r="2.2" fill="' + color + '"/></svg>';
}
function dailyVals(plant, key) {
  var D = monthKeys(), M = FX.metrics(plant), dd = FX.dispatchDaily(plant), keys = D.keys.filter(function (k) { return k !== D.today; }).slice(-14);
  return keys.map(function (k) { return key === 'det' ? (M.daily[k] || 0) : (dd.actual[k] || 0); });
}
var _kpiStrip = kpiStrip;
function sparkFor(id, k) {
  var s = session(); if (!s) return '';
  var plant = s.role === 'plant' ? C.plantHeadPlant : (uiFor(s.role).plant || null);
  if (k === 'det') return '<span class="spw" title="Detention per day, last 14 full days">' + spark(dailyVals(plant, 'det'), '#B35400') + '<em>14 days</em></span>';
  if (k === 'disp') return '<span class="spw" title="DIs dispatched per day, last 14 full days">' + spark(dailyVals(plant, 'disp'), '#A67C00') + '<em>14 days</em></span>';
  return '';
}
kpiStrip = function (id, tiles) {
  _kpiStrip(id, tiles);
  var el = document.getElementById(id); if (!el) return;
  tiles.forEach(function (t) {
    var k = el.querySelector('[data-k="' + t.key + '"]'); if (!k || t.minor) return;
    var html = sparkFor(id, t.key), box = k.querySelector('.spx');
    if (!box) { box = document.createElement('span'); box.className = 'spx'; k.appendChild(box); }
    if (box.__h !== html) { box.innerHTML = html; box.__h = html; }
  });
};
UI.h.kpiStrip = kpiStrip;

/* ---------- guardrails belong to the logistics head ---------- */
NAV.ct = NAV.ct.filter(function (n) { return n[0] !== 'guardrails'; });
NAV.clo.push(['guardrails', 'Guardrails', 'rails']);
UI.views.clo.guardrails = UI.views.ct.guardrails;
delete UI.views.ct.guardrails;
VIEW_TITLE.clo.guardrails = 'Priority & guardrails';
delete VIEW_TITLE.ct.guardrails;
function snapPrev() { var u = uiFor(session().role), dd = FX.derive(); u.prev = {}; Object.keys(FX.state().guardrails).forEach(function (cat) { u.prev[cat] = dd.all.filter(function (t) { return t.cat === cat && t.phase === 'open' && t.picked; }).length; }); }

/* ---------- sign-in: account decides the workspace; password, OTP and forgot-password ---------- */
/* OTP sign-in: the number-to-workspace map and the accepted codes live in the engine, which
   keeps only salted digests of the codes and caps wrong attempts. */
function loginHtml() {
  var mode = ui.loginMode || 'pwd', form;
  if (mode === 'otp') {
    var sent = !!ui.otpPhone;
    form = '<form class="lg-card" data-form="otp" novalidate><h2>Sign in with OTP</h2><p class="muted">' + (sent ? 'Enter the 4-digit code sent to <b>+91 ' + esc(ui.otpPhone.replace(/(\d{5})(\d{5})/, '$1 $2')) + '</b>.' : 'We will send a one-time code to your registered mobile number.') + '</p>' +
      (sent ? '<label class="fld"><span>One-time code</span><input name="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="4" placeholder="• • • •" class="otp"></label>' +
        '<div class="lg-err" id="lg-err" role="alert"></div><button class="btn y w" type="submit">Verify and sign in</button>' +
        '<div class="lg-row"><button type="button" class="lg-link" data-act="otp-change">Change number</button><button type="button" class="lg-link" data-act="otp-resend">Resend code</button></div>'
        : '<label class="fld"><span>Mobile number</span><span class="ph"><em>+91</em><input name="ph" inputmode="numeric" autocomplete="tel-national" maxlength="10" placeholder="10-digit mobile number"></span></label>' +
        '<div class="lg-err" id="lg-err" role="alert"></div><button class="btn y w" type="submit">Send OTP</button>') +
      '<div class="lg-alt"><span>or</span></div><button type="button" class="btn w lg-sec" data-act="lg-mode" data-arg="pwd">Sign in with email and password</button></form>';
  } else if (mode === 'forgot') {
    form = '<form class="lg-card" data-form="forgot" novalidate><h2>Reset your password</h2>' + (ui.resetSent ? '<div class="lg-ok" role="status">If <b>' + esc(ui.resetSent) + '</b> is registered, a reset link is on its way. It expires in 30 minutes.</div><button type="button" class="btn y w" data-act="lg-mode" data-arg="pwd">Back to sign in</button>' :
      '<p class="muted">Enter your work email and we will send you a link to set a new password.</p><label class="fld"><span>Work email</span><input name="u" type="email" autocomplete="username" placeholder="name@fleetx.io"></label><div class="lg-err" id="lg-err" role="alert"></div><button class="btn y w" type="submit">Send reset link</button>' +
      '<div class="lg-row"><button type="button" class="lg-link" data-act="lg-mode" data-arg="pwd">' + ICON.back + 'Back to sign in</button></div>') + '</form>';
  } else {
    form = '<form class="lg-card" data-form="login" novalidate><h2>Sign in</h2><p class="muted">Use your work account. Your workspace opens based on your role.</p>' +
      '<label class="fld"><span>Work email</span><input name="u" type="email" autocomplete="username" placeholder="name@fleetx.io"></label>' +
      '<label class="fld"><span class="fl2">Password<button type="button" class="lg-link" data-act="lg-mode" data-arg="forgot">Forgot password?</button></span><input name="p" type="password" autocomplete="current-password" placeholder="Password"></label>' +
      '<div class="lg-err" id="lg-err" role="alert"></div><button class="btn y w" type="submit">Sign in</button>' +
      '<div class="lg-alt"><span>or</span></div><button type="button" class="btn w lg-sec" data-act="lg-mode" data-arg="otp">Sign in with OTP</button></form>';
  }
  return '<div class="lg"><section class="lg-art"><svg class="mapbg" viewBox="40 60 900 1040" aria-hidden="true"><path class="o" d="' + MAP.outline + '"/><path class="i" d="' + MAP.inner + '"/></svg>' +
    '<div class="lg-brand"><img src="' + A.ut + '" alt="UltraTech"><span><b>' + PRODUCT + '</b>Logistics operations</span></div>' +
    '<div class="lg-copy"><h1>Every exception acted on. <em>Only decisions reach you.</em></h1><p>Plan against actual, where it is breaking and what to do next. Agents act first, within the guardrails you set.</p></div>' +
    '</section><section class="lg-form">' + form + '<div class="lg-pow">Powered by <img src="' + A.fx + '" alt="Fleetx"></div></section></div>';
}
function relogin(focusSel) { root.innerHTML = loginHtml(); var f = root.querySelector(focusSel || 'input'); if (f) f.focus(); }
function lgErr(t) { var e = document.getElementById('lg-err'); if (e) e.textContent = t; }
UI.on('lg-mode', function (d) { ui.loginMode = d.arg; ui.otpPhone = null; ui.resetSent = null; saveUi(); relogin(); });
UI.on('otp-change', function () { ui.otpPhone = null; FX.otpReset(); saveUi(); relogin(); });
UI.on('otp-resend', function () { lgErr(''); var e = document.getElementById('lg-err'); if (e) { e.textContent = 'A new code has been sent.'; e.className = 'lg-err ok'; } });
UI.on('form-login', function (f) {
  var u = f.u.value.trim(), p = f.p.value;
  if (!u || !p) { lgErr('Enter your work email and password.'); return; }
  var s = FX.login(u, p);
  if (!s) { lgErr('Email or password is not right.'); return; }
  ui.loginMode = 'pwd'; saveUi(); mount();
});
UI.on('form-otp', function (f) {
  if (!ui.otpPhone) {
    var ph = f.ph.value.replace(/\D/g, '').slice(-10);
    if (ph.length !== 10) { lgErr('Enter a 10-digit mobile number.'); return; }
    if (!FX.otpAccount(ph)) { lgErr('No account is linked to this number.'); return; }
    ui.otpPhone = ph; FX.otpReset(); saveUi(); relogin('input[name=otp]'); return;
  }
  if (FX.otpRemaining() <= 0) { ui.otpPhone = null; saveUi(); relogin(); lgErr('Too many wrong codes. Start again with your mobile number.'); return; }
  var s = FX.loginOtp(ui.otpPhone, f.otp.value);
  if (!s) {
    if (FX.otpRemaining() <= 0) { ui.otpPhone = null; saveUi(); relogin(); lgErr('Too many wrong codes. Start again with your mobile number.'); return; }
    lgErr('That code is not right. Check the SMS and try again.'); return;
  }
  ui.loginMode = 'pwd'; ui.otpPhone = null; saveUi(); mount();
});
UI.on('form-forgot', function (f) {
  var u = f.u.value.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(u)) { lgErr('Enter a valid work email.'); return; }
  ui.resetSent = u; saveUi(); relogin('button');
});


