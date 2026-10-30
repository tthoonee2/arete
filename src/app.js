
// ---------- PRICING START ----------
const TICKET = 25, QUOTE_SECONDS = 60, R = { "$": 0.04, "€": 0.02, "£": 0.04 };
const CCY = { "$": "US dollars", "€": "euros", "£": "British pounds" };
const CATS = [["oil", "Crude & diesel"], ["prod", "Refined products"], ["gas", "Gas & carbon"], ["spreads", "Regional spreads"], ["metals", "Metals"], ["food", "Food & crops"]];
// All contracts are quoted in the unit a business uses (litre, kg, MWh); conversions from exchange units are in the hint.
// F: front price. slope: annual curve drift. seas: winter premium. vol0/volL: short/long dated volatility.
// skew/curv: smile. dvol: half bid/ask in volatility. All payouts are 1 cash unit per price unit per volume unit.
const U = {
  oil: [
    { id: "brent", name: "Crude oil (Brent)", src: "ICE Brent", ccy: "$", unit: "barrel", units: "barrels", dp: 2, step: 0.5, F: 66.0, slope: -0.05, seas: 0, vol0: 0.32, volL: 0.27, skew: -0.15, curv: 0.10, dvol: 0.015, usage: 10000, qstep: 500, hint: "Follows ICE Brent, the world’s main oil price." },
    { id: "wti", name: "Crude oil (WTI)", src: "ICE WTI", ccy: "$", unit: "barrel", units: "barrels", dp: 2, step: 0.5, F: 62.3, slope: -0.04, seas: 0, vol0: 0.34, volL: 0.28, skew: -0.15, curv: 0.10, dvol: 0.015, usage: 10000, qstep: 500, hint: "Follows ICE WTI, the main US oil price." },
    { id: "diesel", name: "Diesel & heating oil", src: "ICE Gasoil", ccy: "$", unit: "litre", units: "litres", dp: 3, step: 0.005, F: 0.583, slope: -0.06, seas: 0.03, vol0: 0.30, volL: 0.26, skew: -0.08, curv: 0.12, dvol: 0.02, usage: 200000, qstep: 5000, hint: "Wholesale price, excluding taxes." }
  ],
  gas: [
    { id: "ttf", name: "Natural gas (Europe)", src: "ICE TTF", ccy: "€", unit: "MWh", units: "MWh", dp: 2, step: 0.5, F: 32.0, slope: -0.08, seas: 0.10, vol0: 0.50, volL: 0.38, skew: 0.20, curv: 0.15, dvol: 0.03, usage: 2000, qstep: 50, hint: "Follows ICE TTF, the main European gas price. Winter months usually cost more." },
    { id: "nbp", name: "Natural gas (UK)", src: "ICE NBP", ccy: "£", unit: "MWh", units: "MWh", dp: 2, step: 0.25, F: 27.3, slope: -0.08, seas: 0.12, vol0: 0.50, volL: 0.38, skew: 0.20, curv: 0.15, dvol: 0.03, usage: 2000, qstep: 50, hint: "Follows ICE NBP, the UK gas price, converted from pence per therm to pounds per MWh." },
    { id: "eua", name: "Carbon allowances (EU)", src: "ICE EUA", ccy: "€", unit: "tonne of CO₂", units: "tonnes of CO₂", dp: 2, step: 0.5, F: 75.0, slope: 0.03, seas: 0, vol0: 0.40, volL: 0.36, skew: -0.05, curv: 0.10, dvol: 0.02, usage: 1000, qstep: 50, hint: "For businesses in the EU emissions scheme that buy allowances." }
  ],
  prod: [
    { id: "diesel10", name: "Diesel 10ppm (NWE)", src: "Platts diesel 10ppm FOB ARA barges", ccy: "$", unit: "tonne", units: "tonnes", dp: 0, step: 5, F: 705, slope: -0.06, seas: 0.03, vol0: 0.30, volL: 0.26, skew: -0.08, curv: 0.12, dvol: 0.02, usage: 500, qstep: 10 },
    { id: "jet", name: "Jet fuel (NWE)", src: "Platts jet CIF NWE cargoes", ccy: "$", unit: "tonne", units: "tonnes", dp: 0, step: 5, F: 735, slope: -0.05, seas: -0.02, vol0: 0.30, volL: 0.26, skew: -0.06, curv: 0.12, dvol: 0.02, usage: 500, qstep: 10 },
    { id: "gasoline", name: "Gasoline (Eurobob)", src: "Platts Eurobob FOB AR barges", ccy: "$", unit: "tonne", units: "tonnes", dp: 0, step: 5, F: 715, slope: -0.04, seas: -0.05, vol0: 0.30, volL: 0.27, skew: -0.05, curv: 0.12, dvol: 0.02, usage: 500, qstep: 10 },
    { id: "vlsfo", name: "Marine fuel 0.5%", src: "Platts 0.5% FOB Rotterdam barges", ccy: "$", unit: "tonne", units: "tonnes", dp: 0, step: 5, F: 470, slope: -0.05, seas: 0, vol0: 0.28, volL: 0.25, skew: -0.08, curv: 0.12, dvol: 0.02, usage: 1000, qstep: 25 },
    { id: "hsfo", name: "Fuel oil 3.5%", src: "Platts 3.5% FOB Rotterdam barges", ccy: "$", unit: "tonne", units: "tonnes", dp: 0, step: 5, F: 405, slope: -0.06, seas: 0, vol0: 0.30, volL: 0.27, skew: -0.08, curv: 0.12, dvol: 0.025, usage: 1000, qstep: 25 },
    { id: "propane", name: "Propane (LPG)", src: "Argus propane CIF ARA", ccy: "$", unit: "tonne", units: "tonnes", dp: 0, step: 5, F: 480, slope: -0.04, seas: 0.10, vol0: 0.35, volL: 0.30, skew: 0.05, curv: 0.12, dvol: 0.03, usage: 200, qstep: 10 }
  ],
  spreads: [
    { id: "psv", name: "Italy gas premium", src: "ICE Endex PSV minus TTF", model: "normal", ccy: "€", unit: "MWh", units: "MWh", dp: 2, step: 0.05, F: 2.10, slope: 0, seas: 0.15, vol0: 2.2, volL: 1.6, skew: 0, curv: 0, dvol: 0.15, usage: 2000, qstep: 50, note: "Pays on the gap between Italian and Dutch gas. Combine it with a TTF protection to cover an Italian gas bill." },
    { id: "the", name: "Germany gas premium", src: "ICE Endex THE minus TTF", model: "normal", ccy: "€", unit: "MWh", units: "MWh", dp: 2, step: 0.05, F: 0.70, slope: 0, seas: 0.15, vol0: 1.2, volL: 0.9, skew: 0, curv: 0, dvol: 0.10, usage: 2000, qstep: 50, note: "Pays on the gap between German and Dutch gas. It can go negative." },
    { id: "peg", name: "France gas premium", src: "ICE Endex PEG minus TTF", model: "normal", ccy: "€", unit: "MWh", units: "MWh", dp: 2, step: 0.05, F: 0.40, slope: 0, seas: 0.15, vol0: 1.0, volL: 0.8, skew: 0, curv: 0, dvol: 0.10, usage: 2000, qstep: 50, note: "Pays on the gap between French and Dutch gas. It can go negative." },
    { id: "dmed", name: "Diesel Med vs NWE", src: "Platts diesel 10ppm Med minus NWE", model: "normal", ccy: "$", unit: "tonne", units: "tonnes", dp: 1, step: 0.5, F: 10, slope: 0, seas: 0, vol0: 14, volL: 11, skew: 0, curv: 0, dvol: 1.0, usage: 500, qstep: 10, note: "For buyers priced off the Mediterranean. Pays on the gap over Rotterdam diesel." },
    { id: "jetreg", name: "Jet premium over gasoil", src: "Platts jet CIF NWE minus ICE Gasoil", model: "normal", ccy: "$", unit: "tonne", units: "tonnes", dp: 1, step: 0.5, F: 42, slope: 0, seas: 0, vol0: 30, volL: 22, skew: 0, curv: 0, dvol: 2.0, usage: 500, qstep: 10, note: "Covers the jet premium if you hedge flat price with gasoil." }
  ],
  metals: [
    { id: "copper", name: "Copper", src: "LME copper", ccy: "$", unit: "tonne", units: "tonnes", dp: 0, step: 50, F: 10000, slope: 0.02, seas: 0, vol0: 0.22, volL: 0.20, skew: 0.05, curv: 0.10, dvol: 0.015, usage: 20, qstep: 1, hint: "Follows the LME official price, the global benchmark for metals." },
    { id: "alu", name: "Aluminium", src: "LME aluminium", ccy: "$", unit: "tonne", units: "tonnes", dp: 0, step: 10, F: 2600, slope: 0.02, seas: 0, vol0: 0.20, volL: 0.18, skew: 0.05, curv: 0.10, dvol: 0.015, usage: 50, qstep: 1, hint: "Follows the LME official price, the global benchmark for metals." },
    { id: "zinc", name: "Zinc", src: "LME zinc", ccy: "$", unit: "tonne", units: "tonnes", dp: 0, step: 10, F: 2800, slope: 0.01, seas: 0, vol0: 0.24, volL: 0.22, skew: 0.05, curv: 0.10, dvol: 0.02, usage: 30, qstep: 1, hint: "Follows the LME official price, the global benchmark for metals." },
    { id: "nickel", name: "Nickel", src: "LME nickel", ccy: "$", unit: "tonne", units: "tonnes", dp: 0, step: 100, F: 15500, slope: 0.02, seas: 0, vol0: 0.32, volL: 0.28, skew: 0.10, curv: 0.12, dvol: 0.025, usage: 5, qstep: 1, hint: "Follows the LME official price, the global benchmark for metals." }
  ],
  food: [
    { id: "arabica", name: "Coffee (Arabica)", src: "ICE Arabica", ccy: "$", unit: "kg", units: "kg", dp: 2, step: 0.05, F: 8.38, slope: -0.10, seas: 0, vol0: 0.38, volL: 0.32, skew: 0.15, curv: 0.15, dvol: 0.03, usage: 20000, qstep: 500, hint: "Follows ICE Arabica coffee, converted from US cents per pound to dollars per kg." },
    { id: "robusta", name: "Coffee (Robusta)", src: "ICE Robusta", ccy: "$", unit: "kg", units: "kg", dp: 2, step: 0.05, F: 4.50, slope: -0.10, seas: 0, vol0: 0.40, volL: 0.34, skew: 0.12, curv: 0.15, dvol: 0.03, usage: 20000, qstep: 500, hint: "Follows ICE Robusta coffee, converted to dollars per kg." },
    { id: "cocoa", name: "Cocoa", src: "ICE London cocoa", ccy: "£", unit: "tonne", units: "tonnes", dp: 0, step: 25, F: 4800, slope: -0.12, seas: 0, vol0: 0.50, volL: 0.42, skew: 0.15, curv: 0.15, dvol: 0.035, usage: 20, qstep: 1, hint: "Follows ICE London cocoa." },
    { id: "sugar", name: "Sugar", src: "ICE Sugar No. 11", ccy: "$", unit: "tonne", units: "tonnes", dp: 0, step: 2, F: 353, slope: 0.02, seas: 0, vol0: 0.28, volL: 0.25, skew: 0.08, curv: 0.12, dvol: 0.02, usage: 200, qstep: 10, hint: "Follows ICE raw sugar, converted from US cents per pound to dollars per tonne." }
  ]
};
const ALL = Object.values(U).flat();
ALL.forEach(u => {
  u.mult = 1;
  const r = v => Number((Math.round(v / u.step) * u.step).toFixed(6));
  // Price range shown on the canvas and allowed for your prices.
  if (u.model === "normal") { u.lo = r(u.F - 1.4 * u.vol0); u.hi = r(u.F + 1.5 * u.vol0); }
  else { u.lo = r(u.F * Math.exp(-1.4 * u.vol0)); u.hi = r(u.F * Math.exp(1.5 * u.vol0)); }
});

function monthList(now = new Date()) {
  const out = [];
  for (let i = 1; i <= 12; i++) {
    const s = new Date(now.getFullYear(), now.getMonth() + i, 1), e = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    out.push({
      i, cal: s.getMonth(),
      m: s.toLocaleString("en-GB", { month: "short" }).slice(0, 3), y: String(s.getFullYear()).slice(2),
      label: s.toLocaleString("en-GB", { month: "short" }).slice(0, 3) + " " + String(s.getFullYear()).slice(2),
      t1: Math.max((s - now) / 31536e6, 1 / 365), t2: (e - now) / 31536e6
    });
  }
  return out;
}
const MONTHS = monthList();

function N(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x)), d = 0.3989422804 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}
function fwd(u, mo) {
  const tm = (mo.t1 + mo.t2) / 2, s = c => 1 + u.seas * Math.cos(2 * Math.PI * c / 12);
  return u.F * (1 + u.slope * tm) * s(mo.cal) / s(MONTHS[0].cal);
}
function atmVol(u, T) { return u.volL + (u.vol0 - u.volL) * Math.exp(-T / 0.5); }
function volAt(u, F, K, T) {
  if (u.model === "normal") return atmVol(u, T);
  const x = Math.log(K / F) / Math.sqrt(Math.max(T, 0.08));
  return atmVol(u, T) * Math.min(2.5, Math.max(0.6, 1 + u.skew * x + u.curv * x * x));
}
function black(F, K, v, df, type) {
  if (K <= 0) return type === "c" ? df * (F - K) : 0;
  const s = Math.sqrt(v);
  if (s < 1e-9) return df * Math.max(type === "c" ? F - K : K - F, 0);
  const d1 = (Math.log(F / K) + v / 2) / s, d2 = d1 - s;
  return type === "c" ? df * (F * N(d1) - K * N(d2)) : df * (K * N(-d2) - F * N(-d1));
}
// Per-unit value of an option on the monthly average. bump shifts vol (bid/ask).
function optVal(u, mo, F, K, type, bump = 0) {
  const T = (mo.t1 + mo.t2) / 2, sig = Math.max(0.01, volAt(u, F, K, T) + bump);
  const v = sig * sig * (mo.t1 + (mo.t2 - mo.t1) / 3), df = Math.exp(-R[u.ccy] * mo.t2);
  if (u.model === "normal") { // Bachelier: spreads can be negative
    const sd = Math.sqrt(v), d = (F - K) / sd, ph = 0.3989422804 * Math.exp(-d * d / 2);
    return type === "c" ? df * ((F - K) * N(d) + sd * ph) : df * ((K - F) * N(-d) + sd * ph);
  }
  return black(F, K, v, df, type);
}
// Skew-consistent probability the average ends above K: minus the strike derivative of the call, undiscounted.
function probAbove(u, mo, F, K) {
  const h = u.model === "normal" ? Math.max(u.vol0 * 0.005, 1e-6) : Math.max(F * 0.002, 1e-6), df = Math.exp(-R[u.ccy] * mo.t2);
  return Math.min(1, Math.max(0, (optVal(u, mo, F, K - h, "c") - optVal(u, mo, F, K + h, "c")) / (2 * h * df)));
}

// Full quote for a structure. s = { u, dir, mode, q, ms, K1, K2, Kx, shock }
function price(s) {
  const { u, q, ms } = s, up = s.dir === "up", t = up ? "c" : "p", ot = up ? "p" : "c", m = u.mult;
  let mid = 0, ask = 0, chance = 0, owe = 0; const vols = [], per = [];
  ms.forEach(mo => {
    const F = fwd(u, mo) * (1 + (s.shock || 0)), T = (mo.t1 + mo.t2) / 2;
    let a = optVal(u, mo, F, s.K1, t, u.dvol), md = optVal(u, mo, F, s.K1, t);
    if (s.K2 != null) { a -= optVal(u, mo, F, s.K2, t, -u.dvol); md -= optVal(u, mo, F, s.K2, t); }
    if (s.Kx != null) { a -= optVal(u, mo, F, s.Kx, ot, -u.dvol); md -= optVal(u, mo, F, s.Kx, ot); }
    ask += a * q * m; mid += md * q * m; per.push({ mo, F, cost: a * q * m + TICKET });
    const pa = probAbove(u, mo, F, s.K1); chance += up ? pa : 1 - pa;
    if (s.Kx != null) { const px = probAbove(u, mo, F, s.Kx); owe += up ? 1 - px : px; }
    vols.push(volAt(u, F, s.K1, T));
  });
  const fee = TICKET * ms.length, total = ask + fee, n = ms.length;
  return { mid, spread: ask - mid, fee, total, monthly: total / n, chance: chance / n, owe: owe / n, vol1: vols[0], volN: vols[n - 1], per };
}
// Zero-cost collar: scan the sold strike on the grid and take the one closest to zero net premium.
function solveCollar(base, ticks, toPx) {
  const up = base.dir === "up", k1 = Math.round((base.K1 - base.u.lo) / base.u.step);
  const range = up ? [...Array(Math.max(0, k1)).keys()].reverse() : [...Array(Math.max(0, ticks - k1)).keys()].map(i => k1 + 1 + i);
  let best = null;
  for (const i of range) {
    const Kx = toPx(i), p = price({ ...base, Kx });
    if (!best || Math.abs(p.total) < Math.abs(best.p.total)) best = { Kx, p };
    if (p.total < 0 && best.p.total < 0 && Math.abs(p.total) > Math.abs(best.p.total)) break;
  }
  // Infeasible only if even the sold strike next to the band start can't fund it. Grid rounding leaves a small residual, shown as upfront.
  if (!best || (best.p.total > 0 && best.Kx === toPx(range[0]))) return null;
  return best;
}
function settle(dir, K1, K2, Kx, x) {
  if (dir === "up") return Math.max(0, Math.min(x, K2 == null ? Infinity : K2) - K1) - (Kx == null ? 0 : Math.max(Kx - x, 0));
  return Math.max(0, K1 - Math.max(x, K2 == null ? -Infinity : K2)) - (Kx == null ? 0 : Math.max(x - Kx, 0));
}
// Seeded sample history (placeholder for ICE settlement data).
function sampleHistory(u) {
  let seed = [...u.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const g = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
  const lv = [0]; for (let i = 1; i < 25; i++) lv.push(lv[i - 1] + g() * u.vol0 / Math.sqrt(12));
  const shift = Math.log(u.F) - lv[24] + g() * 0.04;
  return lv.map(v => Math.exp(v + shift));
}
// ---------- PRICING END ----------

const $ = id => document.getElementById(id);
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
const state = { cat: "oil", id: "brent", dir: "up", mode: "band", limit: true, usage: 10000, pct: 80, s: 0, e: 5, anchor: null, k1: 0, k2: 0, shock: 0, expires: 0, user: store.get("pb:session"), portfolio: [], authMode: "signin", pendingBuy: false };

const fmtN = (v, dp) => v.toLocaleString("en-GB", { minimumFractionDigits: dp, maximumFractionDigits: dp });
const money = (v, c, dp = 0) => (v < 0 ? "−" : "") + c + fmtN(Math.abs(v), dp);
const moneyC = (v, c) => { const a = Math.abs(v), s = v < 0 ? "−" : ""; return a >= 1e6 ? s + c + fmtN(a / 1e6, 1) + "m" : a >= 1e4 ? s + c + fmtN(a / 1e3, 0) + "k" : money(v, c); };
const cur = () => ALL.find(u => u.id === state.id);
const ticks = u => Math.round((u.hi - u.lo) / u.step);
const pxOf = (u, i) => Number((u.lo + i * u.step).toFixed(6));
const fmtS = (u, v) => (v < 0 ? "−" : "") + u.ccy + fmtN(Math.abs(v), u.dp);
const fmtP = (u, v) => fmtS(u, v) + " per " + u.unit;
const fmtQ = (u, q) => fmtN(q, 0) + " " + u.units;
const noLimit = () => !state.limit;
const qty = () => { const u = cur(); return Math.max(u.qstep, Math.round(state.usage * state.pct / 100 / u.qstep) * u.qstep); };
const sel = () => MONTHS.slice(state.s, state.e + 1);
const avgFwd = u => { const f = sel().map(mo => fwd(u, mo)); return f.reduce((a, b) => a + b, 0) / f.length; };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function clampK2() {
  const n = ticks(cur());
  if (state.dir === "up") state.k2 = Math.min(n, Math.max(state.k1 + 1, state.k2));
  else state.k2 = Math.max(0, Math.min(state.k1 - 1, state.k2));
}
function setDefaults() {
  const u = cur(), n = ticks(u), up = state.dir === "up";
  const toTick = p => Math.min(n, Math.max(0, Math.round((p - u.lo) / u.step)));
  const at = a => u.model === "normal" ? u.F + a * u.vol0 : u.F * Math.exp(a * u.vol0);
  state.k1 = toTick(at((up ? 1 : -1) * 0.25));
  state.k2 = toTick(at((up ? 1 : -1) * 0.9));
  if (up) state.k1 = Math.min(state.k1, n - 1); else state.k1 = Math.max(state.k1, 1);
  clampK2();
}
function quote(mode = state.mode) {
  const u = cur(), base = { u, dir: state.dir, q: qty(), ms: sel(), K1: pxOf(u, state.k1), K2: noLimit() ? null : pxOf(u, state.k2), Kx: null, shock: state.shock };
  if (mode === "collar") {
    const c = solveCollar(base, ticks(u), i => pxOf(u, i));
    if (!c) return { ...base, p: price(base), infeasible: true };
    return { ...base, Kx: c.Kx, p: c.p };
  }
  return { ...base, p: price(base) };
}

// ---------- Rendering ----------
function renderAcct() {
  const u = state.user;
  $("acct").innerHTML = u
    ? `<div class="avatar" aria-hidden="true">${esc(u.company.slice(0, 2).toUpperCase())}</div><span class="acct-name">${esc(u.company)}</span><button class="btn ghost sm" id="signout">Sign out</button>`
    : `<button class="btn ghost sm" id="signin">Sign in</button><button class="btn sm" id="signup">Open account</button>`;
  state.portfolio = u ? (store.get("pb:pf:" + u.email) || []) : [];
  renderPortfolio();
}
function renderProducts() {
  $("cats").innerHTML = CATS.map(([id, nm]) => `<button class="tab" data-cat="${id}" aria-pressed="${id === state.cat}">${nm}</button>`).join("");
  $("tiles").innerHTML = U[state.cat].map(u => `<button class="tile" data-id="${u.id}" aria-pressed="${u.id === state.id}"><b>${u.name}</b><small>${fmtP(u, fwd(u, MONTHS[0]))}</small></button>`).join("");
  const u = cur();
  $("c-hint").textContent = `Follows ${u.src}. Paid in ${CCY[u.ccy]}.${u.id === "diesel" ? " " + u.hint : ""}${u.note ? " " + u.note : ""}`;
}
function winterRange() {
  const isW = c => c >= 10 || c <= 2, a = MONTHS.findIndex(mo => isW(mo.cal));
  if (a < 0) return null;
  let b = a; while (b + 1 < 12 && isW(MONTHS[b + 1].cal)) b++;
  return [a, b];
}
function renderPresets() {
  const u = cur(), P = [["Next month", 0, 0], ["Next 3 months", 0, 2], ["Next 6 months", 0, 5], ["Next 12 months", 0, 11]];
  const w = winterRange(); if (w && u.seas > 0) P.push(["Winter", w[0], w[1]]);
  $("presets").innerHTML = P.map(([nm, a, b]) => `<button class="chip" data-a="${a}" data-b="${b}" aria-pressed="${state.s === a && state.e === b}">${nm}</button>`).join("");
}

// ---------- Price canvas: months on x, price on y, one shared scale ----------
const GRIP = `<svg class="grip" viewBox="0 0 10 12" aria-hidden="true"><path d="M5 0 L9 4 H1 Z M5 12 L1 8 H9 Z" fill="currentColor"/></svg>`;
function geo() {
  const box = $("canvas"), W = Math.max(280, box.clientWidth), small = W < 520, u = cur();
  const H = small ? 300 : 340, L = small ? 46 : 58, R = 10, T = 14, B = 36, pw = W - L - R, ph = H - T - B;
  return { W, H, L, R, T, B, pw, ph, cw: pw / 12, small, lo: u.lo, hi: u.hi,
    Y: v => T + (u.hi - Math.min(u.hi, Math.max(u.lo, v))) / (u.hi - u.lo) * ph,
    V: y => u.hi - (y - T) / ph * (u.hi - u.lo) };
}
function tickLabel(u, v) { if (v < 0) return "−" + tickLabel(u, -v); if (Math.abs(v) < 1e-9) return u.ccy + "0"; if (v >= 10000) return u.ccy + fmtN(v / 1000, v % 1000 ? 1 : 0) + "k"; const dp = Math.abs(v - Math.round(v)) < 1e-9 ? 0 : Math.min(u.dp, Math.abs(v * 10 - Math.round(v * 10)) < 1e-9 ? 1 : 2) ; return u.ccy + fmtN(v, Math.max(dp, v < 10 && u.dp >= 2 ? 2 : dp)); }
function renderCanvas(Q) {
  const u = Q.u, g = geo(), { W, H, L, T, ph, cw, Y } = g, up = Q.dir === "up", bot = T + ph;
  state.geo = g;
  const X = i => L + i * cw, xs = X(state.s), xe = X(state.e + 1), sel = i => i >= state.s && i <= state.e;
  let o = `<defs><pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="var(--muted)" stroke-width="1.4" opacity=".35"/></pattern></defs>`;
  // grid + price axis
  const raw = (g.hi - g.lo) / 4, p10 = Math.pow(10, Math.floor(Math.log10(raw))), stp = [1, 2, 2.5, 5, 10].map(m => m * p10).find(m => m >= raw);
  for (let v = Math.ceil(g.lo / stp) * stp; v <= g.hi + 1e-9; v += stp) { const y = Y(v);
    o += `<line x1="${L}" x2="${W - g.R}" y1="${y}" y2="${y}" stroke="var(--line)"/><text x="${L - 8}" y="${y + 4}" text-anchor="end">${tickLabel(u, v)}</text>`; }
  // zones over the selected months
  const zone = (y1, y2, fill, op, label, color) => {
    const a = Math.min(y1, y2), h = Math.abs(y2 - y1); if (h < 1) return "";
    return `<rect x="${xs}" y="${a}" width="${xe - xs}" height="${h}" fill="${fill}" opacity="${op}" rx="4"/>` +
      (h > 24 && xe - xs > 70 ? `<text class="zlab" x="${(xs + xe) / 2}" y="${a + h / 2 + 4}" text-anchor="middle" style="fill:${color}">${label}</text>` : "");
  };
  const k1 = Y(Q.K1), k2 = Q.K2 == null ? (up ? T : bot) : Y(Q.K2);
  o += zone(k1, k2, "var(--accent)", .16, "We pay you here", "var(--accent)");
  if (Q.K2 != null) o += zone(k2, up ? T : bot, "url(#hatch)", 1, "Not covered", "var(--muted)");
  if (Q.Kx != null) o += zone(Y(Q.Kx), up ? bot : T, "var(--neg)", .13, "You pay us here", "var(--neg)");
  // month bars with likely range
  MONTHS.forEach((mo, i) => {
    const f = fwd(u, mo) * (1 + state.shock), tm = (mo.t1 + mo.t2) / 2, sd = atmVol(u, tm) * Math.sqrt(mo.t1 + (mo.t2 - mo.t1) / 3);
    const cx = X(i) + cw / 2, bw = Math.min(cw * .5, 34), on = sel(i), y = Y(f);
    o += `<rect x="${cx - bw / 2}" y="${y}" width="${bw}" height="${Math.max(0, bot - y)}" rx="3" fill="var(--ink)" opacity="${on ? .5 : .13}"/>`;
    const nm = u.model === "normal", r1 = Y(nm ? f + sd : f * Math.exp(sd)), r2 = Y(nm ? f - sd : f * Math.exp(-sd));
    o += `<g stroke="var(--ink)" stroke-width="1.5" opacity="${on ? .75 : .25}"><line x1="${cx}" x2="${cx}" y1="${r1}" y2="${r2}"/><line x1="${cx - 4}" x2="${cx + 4}" y1="${r1}" y2="${r1}"/><line x1="${cx - 4}" x2="${cx + 4}" y1="${r2}" y2="${r2}"/></g>`;
    if (cw >= 56 && on) o += `<text x="${cx}" y="${y - 6}" text-anchor="middle" style="font-size:11px">${tickLabel(u, f)}</text>`;
    const lab = cw < 26 ? mo.m[0] : mo.m;
    o += `<text class="${on ? "mlab" : ""}" x="${cx}" y="${bot + 16}" text-anchor="middle">${lab}</text>`;
    if (i === 0 || mo.cal === 0) o += `<text x="${cx}" y="${bot + 30}" text-anchor="middle" style="font-size:11px">${"20" + mo.y}</text>`;
  });
  // price lines across the whole chart
  const hl = (v, stroke, dash, w) => `<line x1="${L}" x2="${W - g.R}" y1="${Y(v)}" y2="${Y(v)}" stroke="${stroke}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
  o += hl(Q.K1, "var(--accent)", "", 2.5);
  if (Q.K2 != null) o += hl(Q.K2, "var(--accent)", "6 4", 1.6);
  if (Q.Kx != null) o += hl(Q.Kx, "var(--neg)", "6 4", 1.6);
  o += `<line x1="${L}" x2="${W - g.R}" y1="${bot}" y2="${bot}" stroke="var(--muted)"/>`;
  o += `<line id="xh" x1="${L}" x2="${W - g.R}" y1="0" y2="0" stroke="var(--ink)" stroke-dasharray="2 3" visibility="hidden"/>`;
  const svg = $("cv"); svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("height", H); svg.innerHTML = o;

  // draggable price handles (HTML so touch dragging works without blocking page scroll)
  const hs = [{ k: "k1", v: Q.K1, t: `${up ? "Your max" : "Your min"} ${fmtS(u, Q.K1)}`, drag: true }];
  if (Q.K2 != null) hs.push({ k: "k2", v: Q.K2, t: `Cover stops ${fmtS(u, Q.K2)}`, drag: true });
  if (Q.Kx != null) hs.push({ k: "kx", v: Q.Kx, t: `You pay ${up ? "below" : "above"} ${fmtS(u, Q.Kx)}`, drag: false });
  hs.forEach(h => h.y = Y(h.v));
  // Keep "your price" tag on its line; move other tags away from it if they collide.
  const y1 = hs[0].y;
  hs.slice(1).forEach(h => { if (Math.abs(h.y - y1) < 32) h.y = y1 + (h.v > hs[0].v ? -32 : 32); });
  $("handles").innerHTML = hs.map(h => h.drag
    ? `<button class="handle ${h.k}" data-k="${h.k}" style="top:${h.y}px" role="slider" aria-label="${h.k === "k1" ? (up ? "Your maximum price" : "Your minimum price") : "Price where cover stops"}" aria-valuetext="${fmtP(u, h.v)}">${GRIP}${h.t}</button>`
    : `<span class="handle kx" style="top:${h.y}px">${h.t}</span>`).join("");
  $("lg-owe").hidden = Q.Kx == null;
}
function tipAt(y) {
  const Q = window._lastQuote, g = state.geo, u = Q.u; if (!Q || !g) return;
  if (y < g.T || y > g.T + g.ph) { hideTip(); return; }
  const v = Math.round(g.V(y) / u.step) * u.step, s = settle(Q.dir, Q.K1, Q.K2, Q.Kx, v) * Q.q;
  const xh = document.getElementById("xh"); if (xh) { xh.setAttribute("y1", y); xh.setAttribute("y2", y); xh.setAttribute("visibility", "visible"); }
  const t = $("tip"); t.hidden = false; t.style.top = y + "px"; t.style.left = (g.L + 6) + "px";
  t.textContent = `If it averages ${fmtS(u, v)}: ${s > 0 ? "we pay you " + money(s, u.ccy) : s < 0 ? "you pay us " + money(-s, u.ccy) : "no payment"} a month`;
}
function hideTip() { $("tip").hidden = true; const xh = document.getElementById("xh"); if (xh) xh.setAttribute("visibility", "hidden"); }

function syncControls() {
  const u = cur(), up = state.dir === "up";
  $("dir-up").setAttribute("aria-pressed", up); $("dir-down").setAttribute("aria-pressed", !up);
  $("mode-band").setAttribute("aria-pressed", state.mode === "band"); $("mode-collar").setAttribute("aria-pressed", state.mode === "collar");
  $("verb").textContent = up ? "buy" : "sell";
  $("usage-unit").textContent = u.units;
  if (document.activeElement !== $("usage")) $("usage").value = state.usage;
  $("usage").step = u.qstep;
  $("pct-val").textContent = `${state.pct}%, ${fmtQ(u, qty())}`;
  $("blocks").innerHTML = Array.from({ length: 10 }, (_, i) => `<i class="${(i + 1) * 10 <= state.pct ? "on" : ""}">${i === 4 || i === 9 ? (i + 1) * 10 + "%" : ""}</i>`).join("");
  $("blocks").setAttribute("aria-valuenow", state.pct);
  const base = cur().usage, mk = [0.25, 0.5, 1, 2, 5].map(f => Math.max(u.qstep, Math.round(base * f / u.qstep) * u.qstep));
  const short = v => v >= 1e6 ? fmtN(v / 1e6, v % 1e6 ? 1 : 0) + "m" : v >= 1e4 ? fmtN(v / 1e3, v % 1e3 ? 1 : 0) + "k" : fmtN(v, 0);
  $("q-presets").innerHTML = mk.map(v => `<button class="chip" data-q="${v}" aria-pressed="${v === state.usage}">${short(v)}</button>`).join("");
  $("limit").checked = state.limit;
  $("cv-help").textContent = "Drag the tags to set prices. Drag across months to pick them.";
}

function renderTicket() {
  const Q = quote(), u = Q.u, p = Q.p, up = Q.dir === "up", c = u.ccy, n = Q.ms.length, collar = state.mode === "collar";
  window._lastQuote = Q;
  $("tk-title").textContent = u.name;
  $("tk-sub").textContent = `Follows ${u.src}`;
  const when = n === 1 ? `In ${Q.ms[0].label}` : `From ${Q.ms[0].label} to ${Q.ms[n - 1].label}`;
  let s = `${when}, in any month where the average price is <strong>${up ? "above" : "below"} ${fmtP(u, Q.K1)}</strong>, we pay you the difference on <strong>${fmtQ(u, Q.q)}</strong>${Q.K2 == null ? "" : `, until the price ${up ? "reaches" : "falls to"} ${fmtP(u, Q.K2)}`}.`;
  if (collar && Q.Kx != null) s += ` In any month where it averages <strong>${up ? "below" : "above"} ${fmtP(u, Q.Kx)}</strong>, you pay us the difference.`;
  $("sentence").innerHTML = s;

  const perUnit = p.total / (Q.q * n);
  let buyable = true;
  if (collar && Q.infeasible) {
    buyable = false;
    $("big").textContent = "Not available"; $("big-lbl").textContent = "";
    $("worst").innerHTML = `<small>Not possible at this price</small><b style="font-size:15px;font-weight:500">Move your price ${up ? "up" : "down"} or cap the cover.</b>`;
  } else if (collar) {
    const resid = Math.abs(p.total) < 0.5 ? 0 : p.total;
    $("big").textContent = resid === 0 ? "Free" : money(Math.abs(resid), c);
    $("big-lbl").textContent = resid === 0 ? "to set up" : resid < 0 ? "paid to you today" : "to pay today";
    $("worst").innerHTML = `<small>Your price stays between</small><b>${fmtS(u, Math.min(Q.Kx, Q.K1))} and ${fmtP(u, Math.max(Q.Kx, Q.K1))}</b>${Q.K2 == null ? "" : `<small>Cover stops ${up ? "above" : "below"} ${fmtP(u, Q.K2)}</small>`}`;
  } else {
    $("big").textContent = money(p.monthly, c);
    $("big-lbl").textContent = n > 1 ? `a month, ${money(p.total, c)} in total` : "in total";
    $("worst").innerHTML = `<small>${up ? "Most you’ll pay, cost included" : "Least you’ll get, after cost"}</small><b>${fmtP(u, up ? Q.K1 + perUnit : Q.K1 - perUnit)}</b>${Q.K2 == null ? "" : `<small>Up to ${fmtP(u, Q.K2)}</small>`}`;
  }
  renderCanvas(Q);
  renderShare(Q);
  const Qb = collar ? quote("band") : Q, Qc = collar ? Q : quote("collar");
  $("pay-band").innerHTML = `${money(Qb.p.monthly, c)}<small> a month</small>`;
  $("pay-band-sub").textContent = "Never owe more";
  if (Qc.infeasible) { $("pay-collar").textContent = "—"; $("pay-collar-sub").textContent = "Not possible at this price"; }
  else { const rc = Math.abs(Qc.p.total) < 0.5 ? 0 : Qc.p.total; $("pay-collar").innerHTML = rc === 0 ? "Free" : rc < 0 ? `+${money(-rc, c)}<small> to you</small>` : `${money(rc, c)}<small> today</small>`; $("pay-collar-sub").textContent = `You pay us ${up ? "below" : "above"} ${fmtS(u, Qc.Kx)}`; }

  const avg = avgFwd(u), edge = up ? u.hi : u.lo, far = up ? u.lo : u.hi;
  const pts = [Q.Kx != null ? (Q.Kx + far) / 2 : null, Q.Kx, avg, Q.K2 != null ? (Q.K1 + Q.K2) / 2 : (Q.K1 + edge) / 2, Q.K2 ?? edge, Q.K2 != null ? edge : null]
    .filter(v => v != null).map(v => Number((Math.round(v / u.step) * u.step).toFixed(u.dp))).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => up ? a - b : b - a);
  $("scen").innerHTML = pts.map(v => { const s = settle(Q.dir, Q.K1, Q.K2, Q.Kx, v) * Q.q; return `<tr><td>${fmtP(u, v)}${Math.abs(v - avg) < u.step ? " <span class=\"hint\">(today)</span>" : ""}</td><td class="${s < 0 ? "neg" : s > 0 ? "pos" : ""}">${s < 0 ? "You pay " + money(-s, c) : money(s, c)}</td></tr>`; }).join("");

  const pr = $("promise");
  if (collar) { pr.className = "promise warn"; pr.textContent = "You may owe us. Needs a credit check."; }
  else { pr.className = "promise"; pr.textContent = "You never owe more than this."; }
  $("dl").innerHTML = `<tr><td>Market value</td><td>${money(p.mid, c)}</td></tr><tr><td>Trading cost</td><td>${money(p.spread, c)}</td></tr><tr><td>Service fee, ${money(TICKET, c)} a month</td><td>${money(p.fee, c)}</td></tr><tr class="total"><td>${collar ? "Net to pay today" : "Your price"}</td><td>${money(p.total, c)}</td></tr><tr><td>Chance of a payout in any month</td><td>${Math.round(p.chance * 100)}%</td></tr>${collar && !Q.infeasible ? `<tr><td>Chance you pay us in any month</td><td>${Math.round(p.owe * 100)}%</td></tr>` : ""}`;
  $("method").textContent = `Black-76 on monthly averages, with forward curve, vol term structure and skew (${fmtN(p.vol1 * 100, 1)}% vol at your price).`;
  $("buy").disabled = !buyable;
  $("mb-lbl").textContent = collar ? "Today" : "Per month";
  $("mb-val").textContent = Q.infeasible ? "Not available" : collar ? $("big").textContent : money(p.monthly, c);
}

// Protection cost as a share of the full monthly volume at expected prices, in total and month by month.
function renderShare(Q) {
  const u = Q.u, c = u.ccy, use = state.usage, per = Q.p.per, up = Q.dir === "up";
  if (Q.infeasible || !per || !per.length || u.model === "normal") { $("share").innerHTML = ""; return; }
  const rows = per.map(r => ({ label: r.mo.label, cost: r.cost, spend: use * r.F }));
  rows.forEach(r => r.pct = r.cost / r.spend * 100);
  const spend = rows.reduce((a, r) => a + r.spend, 0), pct = Q.p.total / spend * 100, mx = Math.max(...rows.map(r => Math.abs(r.pct)), 1e-6);
  const f = v => (v <= -0.05 ? "−" : "") + fmtN(Math.abs(v), Math.abs(v) < 10 ? 1 : 0) + "%";
  $("share").innerHTML = `<div class="sh-head"><b>${f(pct)}</b><span>of your ${up ? "total bill" : "total sales"}</span></div>` +
    `<small>All ${fmtQ(u, use)} a month at expected prices: ${moneyC(spend, c)} over ${rows.length} month${rows.length > 1 ? "s" : ""}</small>` +
    (rows.length > 1 ? `<div class="sh-rows">${rows.map(r => `<div class="sh-row"><span>${r.label}</span><span class="sh-bar"><i class="${r.pct < 0 ? "neg" : ""}" style="width:${(Math.abs(r.pct) / mx * 100).toFixed(1)}%"></i></span><span class="num">${money(r.cost, c)}</span><span class="num">${f(r.pct)}</span></div>`).join("")}</div>` : "");
}

function renderBacktest(Q) {
  const u = Q.u, c = u.ccy, h = sampleHistory(u), F0 = fwd(u, MONTHS[0]), m0 = MONTHS[0];
  if (Q.infeasible) { $("bt-sum").innerHTML = ""; $("bt-chart").innerHTML = ""; $("bt-note").textContent = "Choose a setup that’s available to see this."; return; }
  const one = price({ ...Q, ms: [{ ...m0, t1: 1 / 12, t2: 2 / 12 }], shock: 0 }), prem = one.total - one.fee;
  const rows = [];
  for (let j = 1; j < 25; j++) {
    const r = h[j - 1] / F0, sc = v => v == null ? null : v * r;
    const pay = settle(Q.dir, sc(Q.K1), sc(Q.K2), sc(Q.Kx), h[j]) * Q.q, cost = prem * r + TICKET;
    rows.push({ pay, cost, net: pay - cost });
  }
  const tp = rows.reduce((a, r) => a + r.pay, 0), tc = rows.reduce((a, r) => a + r.cost, 0), hits = rows.filter(r => r.pay > 1e-6).length;
  $("bt-sum").innerHTML = [["Months it paid out", `${hits} of 24`], [state.mode === "collar" ? "Net received" : "You’d have received", money(tp, c)], [state.mode === "collar" ? "Fees" : "You’d have paid", money(tc, c)]]
    .map(([a, b]) => `<div><small>${a}</small><b class="${b.startsWith("−") ? "neg" : ""}">${b}</b></div>`).join("");
  const W = 560, H = 110, L = 6, Rr = 6, T = 8, Bm = 20, mx = Math.max(1, ...rows.map(r => Math.abs(r.net)));
  const bw = (W - L - Rr) / 24, y0 = T + (H - T - Bm) / 2, k = (H - T - Bm) / 2 / mx;
  const now = new Date(), lbl = i => new Date(now.getFullYear(), now.getMonth() - 24 + i, 1).toLocaleString("en-GB", { month: "short", year: "2-digit" }).replace("Sept", "Sep");
  $("bt-chart").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Result each month over two years">
    ${rows.map((r, i) => { const hh = Math.abs(r.net) * k; return `<rect x="${(L + i * bw + 2).toFixed(1)}" y="${(r.net >= 0 ? y0 - hh : y0).toFixed(1)}" width="${(bw - 4).toFixed(1)}" height="${Math.max(1, hh).toFixed(1)}" rx="2" fill="${r.net >= 0 ? "var(--pos)" : "var(--neg)"}" opacity=".85"/>`; }).join("")}
    <line x1="${L}" x2="${W - Rr}" y1="${y0}" y2="${y0}" stroke="var(--muted)"/>
    <text x="${L}" y="${H - 4}">${lbl(0)}</text><text x="${W - Rr}" y="${H - 4}" text-anchor="end">${lbl(23)}</text>
  </svg>`;
  const net = tp - tc;
  $("bt-note").textContent = `Overall ${net >= 0 ? "+" + money(net, c) : money(net, c)}. Example data, not real prices.`;
}

function renderPortfolio() {
  if (!state.user) { $("plist").innerHTML = `<div class="empty"><span>Sign in to see your protections.</span><button class="btn ghost sm" data-open-login>Sign in</button></div>`; return; }
  if (!state.portfolio.length) { $("plist").innerHTML = `<div class="empty"><span>Nothing here yet. Set up a protection above and confirm it.</span></div>`; return; }
  $("plist").innerHTML = `<table class="ptable"><thead><tr><th>Protection</th><th>Months</th><th class="r">Cost</th><th></th></tr></thead><tbody>${state.portfolio.map((p, i) => `<tr><td><b>${esc(p.title)}</b><small>${esc(p.detail)}</small></td><td>${esc(p.months)}</td><td class="r num">${esc(p.cost)}</td><td class="r"><button class="linkbtn neg" data-rm="${i}">Remove</button></td></tr>`).join("")}</tbody></table>`;
}
function savePortfolio() { if (state.user) store.set("pb:pf:" + state.user.email, state.portfolio); }

function newQuote() { state.expires = Date.now() + QUOTE_SECONDS * 1000; $("ticket").classList.remove("stale"); tick(); }
function tick() {
  const left = Math.max(0, Math.round((state.expires - Date.now()) / 1000));
  if (left <= 0) { $("ticket").classList.add("stale"); $("buy").textContent = "Get a new price"; $("timer").textContent = "This price has expired because markets move."; }
  else { $("buy").textContent = state.user ? "Get protected" : "Sign in to get protected"; $("timer").textContent = `Price held for 0:${String(left).padStart(2, "0")}`; }
}
setInterval(tick, 1000);
function render() { syncControls(); renderPresets(); renderTicket(); newQuote(); }
let raf = 0; const renderSoon = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); }); };

// ---------- Sign in ----------
function openLogin(mode = "signin", why) {
  state.authMode = mode;
  const up = mode === "signup";
  $("l-title").textContent = up ? "Open a business account" : "Sign in";
  $("l-why").textContent = why || (up ? "It takes a minute. We check your business before your first protection." : "Use your business account.");
  $("l-company-f").hidden = !up;
  $("l-go").textContent = up ? "Open account" : "Sign in";
  $("l-switch-t").textContent = up ? "Already have an account?" : "New here?";
  $("l-switch").textContent = up ? "Sign in" : "Open a business account";
  $("l-pass").autocomplete = up ? "new-password" : "current-password";
  $("l-err").textContent = "";
  $("login").hidden = false; (up ? $("l-company") : $("l-email")).focus();
}
function closeLogin() { $("login").hidden = true; state.pendingBuy = false; }
function doLogin(sso) {
  const email = $("l-email").value.trim(), pass = $("l-pass").value, up = state.authMode === "signup";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { $("l-err").textContent = "Enter a valid work email."; return; }
  if (!sso && pass.length < 8) { $("l-err").textContent = "Your password needs at least 8 characters."; return; }
  let company = up ? $("l-company").value.trim() : "";
  if (up && !company) { $("l-err").textContent = "Enter your company name."; return; }
  if (!company) { const d = email.split("@")[1].split(".")[0]; company = d.charAt(0).toUpperCase() + d.slice(1); }
  state.user = { email, company }; store.set("pb:session", state.user);
  $("l-pass").value = "";
  const go = state.pendingBuy; $("login").hidden = true; state.pendingBuy = false;
  renderAcct(); tick();
  if (go) openConfirm();
}

// ---------- Confirm ----------
function openConfirm() {
  const Q = window._lastQuote, u = Q.u, collar = state.mode === "collar";
  $("m-summary").innerHTML = $("sentence").innerHTML + (collar ? ` You pay <strong>${$("big").textContent}</strong> today.` : ` Your price: <strong>${money(Q.p.total, u.ccy)}</strong>, or ${money(Q.p.monthly, u.ccy)} a month.`);
  ["c1", "c2", "c3"].forEach(id => $(id).checked = false);
  $("c3-row").hidden = !collar;
  $("c3-t").textContent = collar ? `I understand my business pays the difference if the price goes ${Q.dir === "up" ? "below" : "above"} ${fmtP(u, Q.Kx)}.` : "";
  $("m-confirm").disabled = true;
  $("overlay").hidden = false; $("m-cancel").focus();
}
const closeModal = () => { $("overlay").hidden = true; $("buy").focus(); };
const canConfirm = () => $("c1").checked && $("c2").checked && (state.mode !== "collar" || $("c3").checked);

// ---------- Events ----------
function renderTicker() {
  const one = ALL.map(u => `<button class="tk-chip" data-pick="${u.id}"><b>${u.name}</b><span>${fmtP(u, fwd(u, MONTHS[0]))}</span></button>`).join("");
  $("ticker").innerHTML = one + one.replace(/<button /g, '<button tabindex="-1" aria-hidden="true" ');
  const count = $("n-markets");
  if (count) count.textContent = ALL.length;
}
function pickAnywhere(id) {
  const cat = Object.keys(U).find(k => U[k].some(u => u.id === id)); if (!cat) return;
  state.cat = cat; pick(id); go("price");
}
document.addEventListener("click", e => { const b = e.target.closest("[data-pick]"); if (b) pickAnywhere(b.dataset.pick); });
function pick(id) { state.id = id; state.usage = cur().usage; state.shock = 0; setDefaults(); renderProducts(); render(); }
$("cats").addEventListener("click", e => { const b = e.target.closest("[data-cat]"); if (!b) return; state.cat = b.dataset.cat; pick(U[state.cat][0].id); });
$("tiles").addEventListener("click", e => { const b = e.target.closest("[data-id]"); if (!b) return; pick(b.dataset.id); });
$("dir-up").addEventListener("click", () => { state.dir = "up"; setDefaults(); render(); });
$("dir-down").addEventListener("click", () => { state.dir = "down"; setDefaults(); render(); });
$("mode-band").addEventListener("click", () => { state.mode = "band"; render(); });
$("mode-collar").addEventListener("click", () => { state.mode = "collar"; render(); });
$("usage").addEventListener("input", e => { const v = Number(e.target.value); if (v > 0) { state.usage = v; render(); } });
const qStep = () => { const u = cur(); return Math.max(u.qstep, Math.round(state.usage * 0.1 / u.qstep) * u.qstep); };
$("q-minus").addEventListener("click", () => { const u = cur(); state.usage = Math.max(u.qstep, state.usage - qStep()); render(); });
$("q-plus").addEventListener("click", () => { state.usage += qStep(); render(); });
$("q-presets").addEventListener("click", e => { const b = e.target.closest("[data-q]"); if (!b) return; state.usage = Number(b.dataset.q); render(); });
const pctAt = e => { const r = $("blocks").getBoundingClientRect(); return Math.min(100, Math.max(10, Math.ceil((e.clientX - r.left) / r.width * 10) * 10)); };
$("blocks").addEventListener("pointerdown", e => { $("blocks").setPointerCapture(e.pointerId); state.pctDrag = true; state.pct = pctAt(e); renderSoon(); });
$("blocks").addEventListener("pointermove", e => { if (!state.pctDrag) return; const v = pctAt(e); if (v !== state.pct) { state.pct = v; renderSoon(); } });
["pointerup", "pointercancel"].forEach(t => $("blocks").addEventListener(t, () => { state.pctDrag = false; }));
$("blocks").addEventListener("keydown", e => { const d = { ArrowRight: 10, ArrowUp: 10, ArrowLeft: -10, ArrowDown: -10 }[e.key]; if (!d) return; e.preventDefault(); state.pct = Math.min(100, Math.max(10, state.pct + d)); render(); $("blocks").focus(); });
$("presets").addEventListener("click", e => { const b = e.target.closest("[data-a]"); if (!b) return; state.s = Number(b.dataset.a); state.e = Number(b.dataset.b); state.anchor = null; render(); });
// Canvas: drag across months to select them; drag the tags to set prices.
function colAt(e) { const g = state.geo, r = $("cv").getBoundingClientRect(); return Math.min(11, Math.max(0, Math.floor((e.clientX - r.left - g.L) / g.cw))); }
$("cv").addEventListener("pointerdown", e => {
  const g = state.geo, r = $("cv").getBoundingClientRect(), x = e.clientX - r.left;
  if (x < g.L) return;
  state.drag = { type: "m", a: colAt(e) }; state.s = state.e = state.drag.a; state.anchor = null;
  $("cv").setPointerCapture(e.pointerId); renderSoon();
});
$("cv").addEventListener("pointermove", e => {
  const r = $("cv").getBoundingClientRect();
  if (state.drag && state.drag.type === "m") { const c = colAt(e); state.s = Math.min(state.drag.a, c); state.e = Math.max(state.drag.a, c); renderSoon(); return; }
  tipAt(e.clientY - r.top);
});
["pointerup", "pointercancel"].forEach(t => $("cv").addEventListener(t, e => { if (state.drag && state.drag.type === "m") { state.drag = null; if (e.pointerType !== "mouse") tipAt(e.clientY - $("cv").getBoundingClientRect().top); } }));
$("cv").addEventListener("pointerleave", () => { if (!state.drag) hideTip(); });
function setK(which, tick) {
  const n = ticks(cur()), up = state.dir === "up";
  tick = Math.min(n, Math.max(0, tick));
  if (which === "k1") { state.k1 = state.limit ? (up ? Math.min(tick, n - 1) : Math.max(tick, 1)) : tick; clampK2(); }
  else { state.k2 = tick; clampK2(); }
}
$("handles").addEventListener("pointerdown", e => {
  const h = e.target.closest("[data-k]"); if (!h) return;
  e.preventDefault(); h.setPointerCapture(e.pointerId); state.drag = { type: "k", k: h.dataset.k }; hideTip();
});
$("handles").addEventListener("pointermove", e => {
  if (!state.drag || state.drag.type !== "k") return;
  const g = state.geo, u = cur(), y = e.clientY - $("cv").getBoundingClientRect().top;
  setK(state.drag.k, Math.round((g.V(y) - u.lo) / u.step)); renderSoon();
});
["pointerup", "pointercancel"].forEach(t => $("handles").addEventListener(t, () => { if (state.drag && state.drag.type === "k") state.drag = null; }));
$("handles").addEventListener("keydown", e => {
  const h = e.target.closest("[data-k]"); if (!h) return;
  const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 }[e.key]; if (!d) return;
  e.preventDefault(); const k = h.dataset.k; setK(k, state[k] + d); render();
  const nh = document.querySelector(`.handle[data-k="${k}"]`); if (nh) nh.focus();
});
new ResizeObserver(() => { if (window._lastQuote) renderCanvas(window._lastQuote); }).observe($("canvas"));
$("limit").addEventListener("change", e => { state.limit = e.target.checked; if (state.limit) { setK("k1", state.k1); } render(); });
$("buy").addEventListener("click", () => {
  if (Date.now() >= state.expires) { state.shock = (Math.random() - 0.5) * 0.008; render(); return; }
  if (!state.user) { state.pendingBuy = true; openLogin("signin", "Sign in to continue. Your price stays the same."); return; }
  openConfirm();
});
$("mb-go").addEventListener("click", () => $("ticket").scrollIntoView({ behavior: "smooth", block: "start" }));
$("m-cancel").addEventListener("click", closeModal);
$("overlay").addEventListener("click", e => { if (e.target === $("overlay")) closeModal(); });
["c1", "c2", "c3"].forEach(id => $(id).addEventListener("change", () => { $("m-confirm").disabled = !canConfirm(); }));
$("m-confirm").addEventListener("click", () => {
  const Q = window._lastQuote, u = Q.u, up = Q.dir === "up", n = Q.ms.length;
  state.portfolio.unshift({
    v: 2, id: u.id, dir: Q.dir, mode: state.mode, K1: Q.K1, K2: Q.K2, Kx: Q.Kx, q: Q.q, s: state.s, e: state.e, usage: state.usage, prem: Q.p.total, ccy: u.ccy, ts: Date.now(),
    title: `${u.name}: ${up ? "maximum" : "minimum"} price ${fmtP(u, Q.K1)}`,
    detail: `${fmtQ(u, Q.q)} a month${Q.K2 == null ? "" : `, cover stops at ${fmtP(u, Q.K2)}`}${Q.Kx != null ? `, you pay ${up ? "below" : "above"} ${fmtP(u, Q.Kx)}` : ""}`,
    months: n === 1 ? Q.ms[0].label : `${Q.ms[0].label} to ${Q.ms[n - 1].label}`,
    cost: state.mode === "collar" ? $("big").textContent : money(Q.p.total, u.ccy)
  });
  savePortfolio(); renderPortfolio(); closeModal();
  go("desk");
});

$("acct").addEventListener("click", e => {
  if (e.target.closest("#signin")) openLogin("signin");
  else if (e.target.closest("#signup")) openLogin("signup");
  else if (e.target.closest("#signout")) { state.user = null; store.del("pb:session"); renderAcct(); tick(); }
});
$("l-go").addEventListener("click", () => doLogin(false));
$("l-sso").addEventListener("click", () => doLogin(true));
$("l-switch").addEventListener("click", () => openLogin(state.authMode === "signin" ? "signup" : "signin"));
$("login").addEventListener("click", e => { if (e.target === $("login")) closeLogin(); });
["l-email", "l-pass", "l-company"].forEach(id => $(id).addEventListener("keydown", e => { if (e.key === "Enter") doLogin(false); }));
document.addEventListener("keydown", e => { if (e.key !== "Escape") return; if (!$("overlay").hidden) closeModal(); if (!$("login").hidden) closeLogin(); });


// ================= Pages (hash routing) =================
const VIEWS = ["home", "price", "markets", "desk", "basis", "developers", "institutions", "trust"];
function go(v) { if (location.hash !== "#" + v) location.hash = v; else showView(v); }
function showView(v, first) {
  if (!VIEWS.includes(v)) v = "home";
  const swap = () => {
    document.querySelectorAll(".view[data-view]").forEach(el => { const on = el.dataset.view === v; el.hidden = !on; el.classList.toggle("enter", on && !document.startViewTransition); });
    document.body.dataset.view = v;
    $("menu").hidden = true; $("menu-btn").setAttribute("aria-expanded", "false");
    document.querySelectorAll(".navlinks a, .menu a").forEach(a => { if (a.getAttribute("href") === "#" + v) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    window.scrollTo(0, 0);
    if (v === "price" && window._lastQuote) renderCanvas(window._lastQuote);
    if (v === "desk") renderDesk();
    if (PK.ready) { if (v === "home") { peakProgress(); PK.start && PK.start(); } else PK.stop && PK.stop(); }
    onScroll();
  };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!first && !reduce && document.startViewTransition) document.startViewTransition(swap); else swap();
}
window.addEventListener("hashchange", () => showView(location.hash.slice(1)));
$("menu-btn").addEventListener("click", () => { const m = $("menu"); m.hidden = !m.hidden; $("menu-btn").setAttribute("aria-expanded", String(!m.hidden)); });
document.addEventListener("click", e => { const b = e.target.closest("[data-scroll]"); if (b) document.getElementById(b.dataset.scroll).scrollIntoView({ behavior: "smooth" }); });

// ================= Markets page =================
function renderMarkets() {
  $("mk").innerHTML = CATS.map(([k, nm]) => `<div class="mk-cat"><h2>${nm}</h2><div class="mk-grid">${U[k].map(u => {
    // Same scale for every market: ±15% of today’s price (±half a year’s typical move for spreads).
    const fs = MONTHS.map(mo => fwd(u, mo)), band = u.model === "normal" ? u.vol0 * 0.5 : fs[0] * 0.15;
    const pts = fs.map((f, i) => `${(i / 11 * 200).toFixed(1)},${(21 - (f - fs[0]) / band * 18).toFixed(1)}`).join(" ");
    return `<button class="mk glass" data-pick="${u.id}"><b>${u.name}</b><small>${u.src}</small><span class="px">${fmtP(u, fs[0])}</span><svg viewBox="0 0 200 42" preserveAspectRatio="none" aria-hidden="true"><line x1="0" x2="200" y1="21" y2="21" stroke="var(--line)" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/><polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg><small>Next 12 months</small><span class="go">Get a price</span></button>`;
  }).join("")}</div></div>`).join("");
}

// ================= Scroll story =================
const ST = { W: 600, H: 380, L: 24, R: 16, T: 24, B: 112 };
function buildStory() {
  if (!$("story-svg")) return;
  ST.W = innerWidth < 600 ? 420 : 600; ST.small = innerWidth < 600;
  const { W, H, L, R, T, B } = ST, ph = H - T - B, n = 48, cap = 62;
  // Monthly knots, smoothed (Catmull-Rom) with a little noise: two spells above the max price.
  const K = [52, 49, 55, 60, 58, 67, 75, 70, 60, 56, 63, 73, 69];
  const cr = (p0, p1, p2, p3, t) => 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
  const val = i => { const m = Math.min(11, Math.floor(i / 4)), t = i / 4 - m; return cr(K[Math.max(0, m - 1)], K[m], K[m + 1], K[Math.min(12, m + 2)], t) + 0.7 * Math.sin(i * 1.9); };
  const vs = Array.from({ length: n + 1 }, (_, i) => val(i)), lo = 35, hi = 85;
  const X = i => L + i / n * (W - L - R), Y = v => T + (hi - v) / (hi - lo) * ph, cy = Y(cap);
  const d = vs.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const avg = Array.from({ length: 12 }, (_, m) => { const a = vs.slice(m * 4, m * 4 + 5); return a.reduce((x, y) => x + y, 0) / a.length; });
  const mw = (W - L - R) / 12, by = H - 54, labs = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  let bars = "";
  avg.forEach((a, m) => { const pay = Math.max(0, a - cap), h = pay * 3.2, x = L + m * mw + mw * .2;
    bars += `<rect class="sb" data-h="${h.toFixed(1)}" x="${x.toFixed(1)}" y="${by}" width="${(mw * .6).toFixed(1)}" height="0" rx="4" fill="var(--accent)"/>`;
    if (pay > 0.5 && !ST.small) bars += `<text class="sbl" x="${(x + mw * .3).toFixed(1)}" y="${by - h - 6}" text-anchor="middle" style="font-size:${ST.small ? 12 : 11}px;font-weight:600;fill:var(--accent)" opacity="0">+€${Math.round(pay * 1.4)}k</text>`;
    bars += `<text x="${(x + mw * .3).toFixed(1)}" y="${H - 34}" text-anchor="middle" style="font-size:${ST.small ? 14 : 13}px">${labs[m]}</text>`; });
  $("story-svg").setAttribute("viewBox", `0 0 ${W} ${H}`);
  $("story-svg").innerHTML = `
    <defs><clipPath id="st-above"><rect x="0" y="0" width="${W}" height="${cy}"/></clipPath>
      <linearGradient id="st-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".5"/><stop offset="1" stop-color="var(--accent)" stop-opacity=".12"/></linearGradient></defs>
    ${[0, 1, 2, 3].map(k => `<line x1="${L}" x2="${W - R}" y1="${T + k * ph / 3}" y2="${T + k * ph / 3}" stroke="var(--line)"/>`).join("")}
    <path id="st-fill" d="${d} L${X(n)},${T + ph} L${L},${T + ph} Z" fill="url(#st-g)" clip-path="url(#st-above)" opacity="0"/>
    <path id="st-line" d="${d}" fill="none" stroke="var(--ink)" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>
    <g id="st-cap" opacity="0"><line x1="${L}" x2="${W - R}" y1="${cy}" y2="${cy}" stroke="var(--accent)" stroke-width="3"/>
      <rect x="${L + 4}" y="${cy + 8}" width="128" height="26" rx="13" fill="var(--accent)"/><text x="${L + 68}" y="${cy + 25}" text-anchor="middle" style="fill:var(--accent-ink);font-weight:600">Your max price</text></g>
    <g id="st-pay" opacity="0"><text x="${L}" y="${by - 64}" style="font-weight:600;fill:var(--ink)">Paid to you each month</text></g>
    <line x1="${L}" x2="${W - R}" y1="${by}" y2="${by}" stroke="var(--line)"/>
    ${bars}`;
  const line = $("story-svg").querySelector("#st-line"), len = line.getTotalLength();
  line.style.strokeDasharray = len; ST.len = len; ST.cy = cy;
}
const clamp01 = x => Math.max(0, Math.min(1, x));
const ease = t => 1 - Math.pow(1 - t, 3);
function storyProgress(p) {
  const svg = $("story-svg"); if (!svg || !ST.len) return;
  const p1 = ease(clamp01(p * 4 / 0.9)), p2 = ease(clamp01(p * 4 - 1)), p3 = ease(clamp01(p * 4 - 2)), p4 = ease(clamp01(p * 4 - 3));
  svg.querySelector("#st-line").style.strokeDashoffset = ST.len * (1 - p1);
  const cap = svg.querySelector("#st-cap"); cap.setAttribute("opacity", p2); cap.setAttribute("transform", `translate(0 ${(-40 * (1 - p2)).toFixed(1)})`);
  svg.querySelector("#st-fill").setAttribute("opacity", p3);
  svg.querySelector("#st-pay").setAttribute("opacity", p4);
  const by = ST.H - 54;
  svg.querySelectorAll(".sb").forEach((b, i) => { const h = Number(b.dataset.h) * clamp01(p4 * 1.6 - i * 0.05); b.setAttribute("height", h.toFixed(1)); b.setAttribute("y", (by - h).toFixed(1)); });
  svg.querySelectorAll(".sbl").forEach(t => t.setAttribute("opacity", clamp01(p4 * 2 - 1)));
  const step = Math.min(3, Math.floor(p * 4));
  document.querySelectorAll("#steps li").forEach((li, i) => li.classList.toggle("on", i === step));
  document.querySelectorAll("#dots i").forEach((d, i) => d.style.setProperty("--f", clamp01(p * 4 - i)));
}
let sraf = 0;
function onScroll() {
  if (sraf) return;
  sraf = requestAnimationFrame(() => {
    sraf = 0;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, y = window.scrollY;
    if (!reduce) document.querySelectorAll(".alps .ly").forEach(l => l.style.transform = `translateY(${(Math.min(y, 700) * Number(l.dataset.k)).toFixed(1)}px)`);
    if (document.body.dataset.view !== "home") return;
    if (reduce) { storyProgress(1); document.querySelectorAll("#steps li").forEach(li => li.classList.add("on")); return; }
    const story = $("story");
    if (!story) return;
    const r = story.getBoundingClientRect(), span = r.height - window.innerHeight;
    storyProgress(clamp01(-r.top / Math.max(1, span)));
  });
}
window.addEventListener("scroll", onScroll, { passive: true });
let lastSmall = innerWidth < 600;
window.addEventListener("resize", () => { const sm = innerWidth < 600; if (sm !== lastSmall) { lastSmall = sm; buildStory(); } onScroll(); });


// ================= Hyper-real alp: eroded terrain + baked textures, sea of clouds, shadows =================
async function buildAlp(cv, A, small) {
  // Heights: zlib-compressed uint16 grid, decoded in the browser
  const bin = Uint8Array.from(atob(A.h.b64), c => c.charCodeAt(0));
  const raw = await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream("deflate"))).arrayBuffer();
  const q = new Uint16Array(raw), NH = A.h.n, S = A.h.size, HM = A.h.hmax / 65535;
  const Hs = (x, z) => {
    const fx = Math.min(NH - 1.001, Math.max(0, (x + S / 2) / S * (NH - 1))), fz = Math.min(NH - 1.001, Math.max(0, (z + S / 2) / S * (NH - 1)));
    const xi = fx | 0, zi = fz | 0, tx = fx - xi, tz = fz - zi, i = zi * NH + xi;
    return HM * ((q[i] * (1 - tx) + q[i + 1] * tx) * (1 - tz) + (q[i + NH] * (1 - tx) + q[i + NH + 1] * tx) * tz);
  };
  let top = { v: 0, i: 0 };
  for (let zi = NH * .3 | 0; zi < NH * .7; zi++) for (let xi = NH * .3 | 0; xi < NH * .7; xi++) { const v = q[zi * NH + xi]; if (v > top.v) top = { v, i: zi * NH + xi }; }
  const TOPX = (top.i % NH) / (NH - 1) * S - S / 2, TOPZ = Math.floor(top.i / NH) / (NH - 1) * S - S / 2, TOPY = top.v * HM;

  const R3 = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: "high-performance" });
  R3.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 1.75));
  R3.outputEncoding = THREE.sRGBEncoding; R3.toneMapping = THREE.ACESFilmicToneMapping; R3.toneMappingExposure = 1.06;
  R3.shadowMap.enabled = true; R3.shadowMap.type = THREE.PCFSoftShadowMap; R3.shadowMap.autoUpdate = false;
  const scene = new THREE.Scene(), HOR = new THREE.Color(0xcfdde8);
  scene.fog = new THREE.FogExp2(HOR, 0.000030);
  const cam = new THREE.PerspectiveCamera(50, 1, 10, 80000);
  const SUN = new THREE.Vector3(-0.86, 0.36, 0.36).normalize();

  // Sky with sun disc and glow
  const sky = new THREE.Mesh(new THREE.SphereGeometry(60000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { top: { value: new THREE.Color(0x4f86bd) }, hor: { value: HOR.clone() }, sun: { value: SUN } },
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform vec3 top; uniform vec3 hor; uniform vec3 sun; varying vec3 vP; void main(){ float h = max(vP.y, 0.0); vec3 c = mix(hor, top, pow(h, 0.45)); float s = max(dot(normalize(vP), sun), 0.0); c += vec3(1.0, 0.97, 0.9) * smoothstep(0.9995, 0.9998, s) * 2.0 + vec3(1.0, 0.92, 0.8) * pow(s, 12.0) * 0.25; gl_FragColor = vec4(c, 1.0); }"
  }));
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xcfe0f2, 0x5a5850, 0.38));
  const sunL = new THREE.DirectionalLight(0xfff0dc, 2.9);
  sunL.position.copy(SUN).multiplyScalar(9000); sunL.castShadow = true;
  const sc = sunL.shadow.camera; sc.left = -6200; sc.right = 6200; sc.top = 6200; sc.bottom = -6200; sc.near = 100; sc.far = 22000;
  sunL.shadow.mapSize.set(small ? 2048 : 4096, small ? 2048 : 4096); sunL.shadow.bias = -0.0004; sunL.shadow.normalBias = 6;
  scene.add(sunL, sunL.target);

  // Terrain
  const seg = small ? 383 : 767, g = new THREE.PlaneGeometry(S, S, seg, seg); g.rotateX(-Math.PI / 2);
  const P = g.attributes.position; for (let i = 0; i < P.count; i++) P.setY(i, Hs(P.getX(i), P.getZ(i)));
  g.computeVertexNormals();
  const TL = new THREE.TextureLoader(), aniso = R3.capabilities.getMaxAnisotropy();
  const tex = (src, srgb, rep) => { const t = TL.load(src); if (srgb) t.encoding = THREE.sRGBEncoding; t.anisotropy = aniso; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } return t; };
  const mat = new THREE.MeshStandardMaterial({ map: tex(A.albedo, true), normalMap: tex(A.normal), normalMapType: THREE.ObjectSpaceNormalMap, roughness: .92, metalness: 0 });
  const detail = tex(A.detail, false, true);
  mat.onBeforeCompile = sh => {
    sh.uniforms.detail = { value: detail };
    sh.fragmentShader = "uniform sampler2D detail;\n" + sh.fragmentShader.replace("#include <map_fragment>",
      "#include <map_fragment>\n float dd = texture2D(detail, vUv * 140.0).r * 0.55 + texture2D(detail, vUv * 900.0).r * 0.45; diffuseColor.rgb *= 0.8 + 0.4 * dd;");
  };
  const terrain = new THREE.Mesh(g, mat); terrain.castShadow = terrain.receiveShadow = true; scene.add(terrain);

  // Sea of clouds: two procedural layers drifting with the wind
  const CY = 1150, clouds = [];
  const cloudShader = (off, base) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { t: { value: 0 }, sun: { value: SUN }, hor: { value: HOR.clone() }, off: { value: off }, base: { value: base } },
    vertexShader: "varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: `uniform float t; uniform vec3 sun; uniform vec3 hor; uniform vec2 off; uniform float base; varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 6; i++) { s += a * n(p); p = p * 2.03 + 17.0; a *= 0.5; } return s; }
      void main(){
        vec2 p = vW.xz * 0.00042 + off + vec2(t * 0.012, t * 0.004);
        float f = fbm(p), f2 = fbm(p * 2.7 + 5.0);
        float d = smoothstep(base, base + 0.22, f);
        float dist = distance(cameraPosition, vW);
        vec3 lit = mix(vec3(0.72, 0.78, 0.86), vec3(1.0, 0.99, 0.97), smoothstep(0.35, 0.85, f2 * 0.6 + f * 0.6));
        lit = mix(lit, hor, smoothstep(6000.0, 40000.0, dist));
        float a = d * (1.0 - smoothstep(30000.0, 45000.0, dist));
        gl_FragColor = vec4(lit, a);
      }`
  });
  [[new THREE.Vector2(0, 0), .36, 0], [new THREE.Vector2(3.1, 7.7), .42, 90]].forEach(([o, b, dy]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(90000, 90000), cloudShader(o, b)); m.rotation.x = -Math.PI / 2; m.position.y = CY + dy; m.renderOrder = 2; scene.add(m); clouds.push(m);
  });
  // Wisps around the horn
  const cloudTex = () => { const c = document.createElement("canvas"); c.width = 256; c.height = 128; const x = c.getContext("2d");
    for (let i = 0; i < 18; i++) { const cx = 64 + Math.random() * 128, cy = 56 + Math.random() * 18, rr = Math.min(16 + Math.random() * 40, cx - 2, 254 - cx, cy - 2, 126 - cy), gr = x.createRadialGradient(cx, cy, 0, cx, cy, rr);
      gr.addColorStop(0, "rgba(255,255,255,.7)"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.fillRect(0, 0, 256, 128); }
    const tx = new THREE.CanvasTexture(c); tx.encoding = THREE.sRGBEncoding; return tx; };
  const wt = [cloudTex(), cloudTex(), cloudTex()], wisps = [];
  for (let i = 0; i < (small ? 10 : 18); i++) {
    const a = Math.random() * Math.PI * 2, r = 900 + Math.random() * 2600, m = new THREE.Sprite(new THREE.SpriteMaterial({ map: wt[i % 3], transparent: true, depthWrite: false, opacity: .35 + Math.random() * .3 }));
    m.position.set(TOPX + Math.cos(a) * r, 1700 + Math.random() * 1300, TOPZ + Math.sin(a) * r); const w = 700 + Math.random() * 900; m.scale.set(w, w * .4, 1); m.userData.s = 18 + Math.random() * 20; scene.add(m); wisps.push(m);
  }
  // Snow plume blown off the summit
  const ND = small ? 700 : 1600, sp = new Float32Array(ND * 3), sv = new Float32Array(ND);
  const spawn = i => { const a = Math.random() * Math.PI * 2, rr = Math.random() * 90; sp[i * 3] = TOPX + Math.cos(a) * rr; sp[i * 3 + 2] = TOPZ + Math.sin(a) * rr; sp[i * 3 + 1] = TOPY - 70 + Math.random() * 80; sv[i] = 90 + Math.random() * 160; };
  for (let i = 0; i < ND; i++) { spawn(i); sp[i * 3] += Math.random() * 900; }
  const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const dot = (() => { const c = document.createElement("canvas"); c.width = c.height = 32; const x = c.getContext("2d"), gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "rgba(255,255,255,.9)"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
  scene.add(new THREE.Points(dg, new THREE.PointsMaterial({ size: 9, map: dot, transparent: true, opacity: .55, depthWrite: false })));

  // Waypoints on the south face at rising altitude
  const findOnFace = (xo, target) => { for (let zz = TOPZ + 4200; zz > TOPZ; zz -= 10) { const x = TOPX + xo * (zz - TOPZ) / 4200; if (Hs(x, zz) >= target) return new THREE.Vector3(x, Hs(x, zz) + 40, zz); } return new THREE.Vector3(TOPX, TOPY, TOPZ); };
  const WP = [findOnFace(500, TOPY * .48), findOnFace(-420, TOPY * .7), findOnFace(250, TOPY * .88)];
  const pinTex = n => { const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d");
    x.fillStyle = "rgba(255,255,255,.4)"; x.beginPath(); x.arc(64, 64, 60, 0, 7); x.fill(); x.fillStyle = "#0A55D6"; x.beginPath(); x.arc(64, 64, 40, 0, 7); x.fill();
    x.fillStyle = "#fff"; x.font = "bold 50px system-ui, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(n, 64, 67); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; };
  const pins = WP.map((v, i) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: pinTex(i + 1), transparent: true, depthWrite: false, depthTest: false, fog: false })); m.position.copy(v); m.renderOrder = 5; scene.add(m); return m; });

  // Camera path: hovering over the cloud sea, past each waypoint, to above the summit
  const V = (x, y, z) => new THREE.Vector3(TOPX + x, y, TOPZ + z);
  const camCurve = new THREE.CatmullRomCurve3([V(700, 2350, 9200), V(1900, 2300, 5200), V(-2100, 2900, 4100), V(1600, 3500, 2700), V(-1500, TOPY + 520, 2300)]);
  const TOPV = new THREE.Vector3(TOPX, TOPY, TOPZ);
  const TG = [V(0, TOPY * .62, 0), WP[0].clone().lerp(TOPV, .35), WP[1].clone().lerp(TOPV, .35), WP[2].clone().lerp(TOPV, .3), V(600, TOPY - 250, -1500)];
  const tgt = new THREE.Vector3(), tmp = new THREE.Vector3();
  R3.shadowMap.needsUpdate = true;
  return {
    R3, scene, cam, WP,
    resize(w, h) { R3.setSize(w, h, false); cam.aspect = w / h; cam.fov = w / h < .8 ? 66 : 48; cam.updateProjectionMatrix(); },
    update(p, clock, dt, pointer) {
      const qv = p * 4, i = Math.min(3, Math.floor(qv)), f = qv - i, e = f * f * (3 - 2 * f);
      camCurve.getPoint(Math.min(1, p), cam.position);
      cam.position.x += Math.sin(clock * .21) * 14 + pointer.x * 42;
      cam.position.y += Math.sin(clock * .33) * 8 + pointer.y * 24;
      cam.position.y = Math.max(cam.position.y, Hs(cam.position.x, cam.position.z) + 180);
      tgt.copy(TG[i]).lerp(TG[i + 1], e); cam.lookAt(tgt); sky.position.copy(cam.position);
      clouds.forEach(c => c.material.uniforms.t.value = clock);
      for (const w of wisps) { w.position.x += w.userData.s * dt; if (w.position.x > TOPX + 4500) w.position.x = TOPX - 4500; }
      for (let k = 0; k < ND; k++) { sp[k * 3] += sv[k] * dt; sp[k * 3 + 1] += Math.sin(clock * 2 + k) * 8 * dt; sp[k * 3 + 2] += Math.sin(clock + k * .7) * 14 * dt; if (sp[k * 3] > TOPX + 1000) spawn(k); }
      dg.attributes.position.needsUpdate = true;
      const ps = cam.position.distanceTo(TOPV) * 0.022; pins.forEach(m => m.scale.set(ps, ps, 1));
      R3.render(scene, cam);
    },
    project(k, W, H) { tmp.copy(WP[k]).project(cam); return [(tmp.x + 1) / 2 * W, (1 - tmp.y) / 2 * H, tmp.z < 1]; }
  };
}

const PK = { p: 0, ps: 0, run: false, ready: false };
async function initPeak() {
  const peak = $("peak"), reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let gl = null; try { gl = document.createElement("canvas").getContext("webgl"); } catch (e) {}
  const can3d = typeof THREE !== "undefined" && !!gl && "DecompressionStream" in window && typeof PK_ASSETS !== "undefined";
  if (!can3d || reduce) {
    peak.classList.add("static"); if (!can3d) peak.classList.add("no3d");
    const row = document.createElement("div"); row.className = "wps-row"; peak.querySelectorAll(".wp").forEach(w => row.appendChild(w)); peak.querySelector(".peak-pin").appendChild(row);
    if (!can3d) return;
  }
  const small = innerWidth < 700, cv = $("peak-cv");
  let A;
  try { A = await buildAlp(cv, PK_ASSETS, small); }
  catch (e) { peak.classList.add("static", "no3d"); return; }
  const fit = () => { if (cv.clientWidth && cv.clientHeight) A.resize(cv.clientWidth, cv.clientHeight); };
  new ResizeObserver(fit).observe(cv); fit();
  cv.classList.add("on");
  const cards = [...document.querySelectorAll(".wp")], hero = $("pk-hero"), end = $("pk-end"), hint = $("pk-hint");
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  PK.pointer = pointer;
  if (!reduce && innerWidth >= 700 && matchMedia("(pointer: fine)").matches) {
    peak.addEventListener("pointermove", e => {
      const r = cv.getBoundingClientRect();
      pointer.tx = Math.max(-1, Math.min(1, (e.clientX - r.left) / r.width * 2 - 1));
      pointer.ty = Math.max(-1, Math.min(1, 1 - (e.clientY - r.top) / r.height * 2));
    }, { passive: true });
    peak.addEventListener("pointerleave", () => { pointer.tx = 0; pointer.ty = 0; });
  }
  let last = performance.now(), clock = 0;
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now; clock += dt;
    PK.ps += (PK.p - PK.ps) * Math.min(1, dt * 3.2);
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 2.4);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 2.4);
    const p = reduce ? 0.12 : PK.ps;
    A.update(p, clock, dt, pointer);
    if (!reduce) {
      const W = cv.clientWidth, Hh = cv.clientHeight, cl = x => Math.max(0, Math.min(1, x));
      hero.style.opacity = 1 - cl((p - .02) / .08); hero.style.transform = `translateY(calc(-46% - ${(p * 600).toFixed(0)}px))`; hero.style.pointerEvents = p < .08 ? "auto" : "none";
      hint.style.opacity = .9 * (1 - cl(p / .05));
      const eo = cl((p - .9) / .07); end.style.opacity = eo; end.style.pointerEvents = eo > .5 ? "auto" : "none";
      cards.forEach((c, k) => {
        const o = 1 - cl(Math.abs(p - (k + 1) * .25) / .1); c.style.opacity = o; if (o <= 0) return;
        let [x, y] = A.project(k, W, Hh); const cw = c.offsetWidth, ch = c.offsetHeight;
        if (W < 700) { x = (W - cw) / 2; y = Hh - ch - 90; } else { x = Math.min(W - cw - 24, Math.max(24, x + 40)); y = Math.min(Hh - ch - 24, Math.max(80, y - ch / 2)); }
        c.style.transform = `translate(${x.toFixed(0)}px, ${(y + (1 - o) * 20).toFixed(0)}px)`;
      });
    }
    if (PK.run && !reduce) requestAnimationFrame(frame);
  }
  PK.start = () => { if (PK.run) return; PK.run = true; last = performance.now(); requestAnimationFrame(frame); };
  PK.stop = () => { PK.run = false; };
  PK.ready = true;
  if (reduce) { requestAnimationFrame(frame); return; }
  new IntersectionObserver(es => es.forEach(en => (en.isIntersecting && document.body.dataset.view === "home") ? PK.start() : PK.stop())).observe(peak);
  if (document.body.dataset.view === "home") PK.start();
}
function peakProgress() {
  const r = $("peak").getBoundingClientRect(), span = r.height - innerHeight;
  PK.p = Math.max(0, Math.min(1, -r.top / Math.max(1, span)));
}
window.addEventListener("scroll", () => { if (document.body.dataset.view === "home") peakProgress(); }, { passive: true });
document.addEventListener("click", e => { const b = e.target.closest("[data-scroll-p]"); if (!b) return;
  const r = $("peak"), y = r.offsetTop + (r.offsetHeight - innerHeight) * Number(b.dataset.scrollP); window.scrollTo({ top: y, behavior: "smooth" }); });


// ================= Risk desk =================
const DESK = { shock: 0 };
const mkt = id => ALL.find(u => u.id === id);
const bookOf = () => (state.portfolio || []).filter(p => p.v === 2 && mkt(p.id));
function posValue(p, shock) {
  const u = mkt(p.id), ms = MONTHS.slice(p.s, p.e + 1);
  return price({ u, dir: p.dir, q: p.q, ms, K1: p.K1, K2: p.K2, Kx: p.Kx, shock });
}
function demoBook() {
  const mk = (id, dir, mode, a1, a2, s, e, usage, pct) => {
    const u = mkt(id), at = a => u.model === "normal" ? u.F + a * u.vol0 : u.F * Math.exp(a * u.vol0), rs = v => Number((Math.round(v / u.step) * u.step).toFixed(6));
    const q = Math.round(usage * pct / u.qstep) * u.qstep, ms = MONTHS.slice(s, e + 1);
    const base = { u, dir, q, ms, K1: rs(at(a1)), K2: a2 == null ? null : rs(at(a2)), Kx: null, shock: 0 };
    let Kx = null, p = price(base);
    if (mode === "collar") { const c = solveCollar(base, ticks(u), i => pxOf(u, i)); if (c) { Kx = c.Kx; p = c.p; } }
    return { v: 2, id, dir, mode, K1: base.K1, K2: base.K2, Kx, q, s, e, usage, prem: p.total, ccy: u.ccy, ts: Date.now(),
      title: `${u.name}: ${dir === "up" ? "maximum" : "minimum"} price ${fmtP(u, base.K1)}`, detail: `${fmtQ(u, q)} a month`, months: `${ms[0].label} to ${ms[ms.length - 1].label}`, cost: money(p.total, u.ccy) };
  };
  return [mk("diesel", "up", "band", .2, .8, 0, 5, 300000, .8), mk("copper", "up", "band", .25, 1, 0, 11, 40, .6), mk("ttf", "up", "collar", .3, null, 0, 4, 3000, .7), mk("arabica", "up", "band", .3, .9, 1, 6, 25000, .5), mk("psv", "up", "band", .3, .9, 0, 4, 3000, .7)];
}
function renderDesk() {
  const el = $("desk-body"); if (!el) return;
  if (!state.user) { el.innerHTML = `<div class="panel empty"><span>Sign in to see your book.</span><button class="btn sm" data-open-login>Sign in</button></div>`; return; }
  const book = bookOf();
  if (!book.length) { el.innerHTML = `<div class="panel empty"><span>No protections yet. Place one from the pricing page, or load a demo book to explore the desk.</span><span style="display:flex;gap:8px"><a class="btn ghost sm" href="#price">Get a price</a><button class="btn sm" id="demo-book">Load demo book</button></span></div>`; return; }
  const sh = DESK.shock, rows = book.map(p => {
    const u = mkt(p.id), now = posValue(p, 0), st = posValue(p, sh), F = fwd(u, MONTHS[p.s]) * (1 + sh);
    const pay = settle(p.dir, p.K1, p.K2, p.Kx, F) * p.q, notional = MONTHS.slice(p.s, p.e + 1).reduce((a, mo) => a + fwd(u, mo), 0) * p.q;
    const dist = u.model === "normal" ? (p.K1 - F) / u.vol0 : (p.K1 / F - 1);
    return { p, u, mtm: st.mid, mtm0: now.mid, pay, notional, F, dist };
  });
  // Totals in each currency, shown in the book's main currency when single, otherwise per position
  // Report totals in USD at indicative FX so the book adds up in one currency
  const FX = { "$": 1, "€": 1.08, "£": 1.27 }, usd = (r, v) => v * FX[r.u.ccy];
  const fmtTot = f => moneyC(rows.reduce((a, r) => a + usd(r, f(r)), 0), "$");
  const cover = rows.map(r => r.p.q / r.p.usage), avgCover = cover.reduce((a, b) => a + b, 0) / cover.length;
  const kpis = [
    ["NOTIONAL PROTECTED", fmtTot(r => r.notional), `${rows.length} positions`],
    ["PREMIUM PAID", fmtTot(r => r.p.prem), "Fixed at placement"],
    ["MARK-TO-MARKET", fmtTot(r => r.mtm), sh ? `At market ${sh > 0 ? "+" : ""}${Math.round(sh * 100)}%` : "Mid-market value"],
    ["PAYOUT THIS MONTH", fmtTot(r => r.pay), sh ? "Under the stress" : "If prices hold"],
    ["AVERAGE COVER", `${Math.round(avgCover * 100)}%`, "Of monthly volume · USD at indicative FX"]
  ];
  // Coverage heatmap: product rows x 12 months
  const prods = [...new Set(rows.map(r => r.p.id))];
  const heat = `<div class="heat" style="grid-template-columns:150px repeat(12, minmax(28px, 1fr))"><span></span>${MONTHS.map(m => `<span class="hm">${m.m[0]}</span>`).join("")}` +
    prods.map(id => { const u = mkt(id);
      return `<span class="hl">${u.name}</span>` + MONTHS.map((m, i) => { const c = rows.filter(r => r.p.id === id && i >= r.p.s && i <= r.p.e).reduce((a, r) => a + r.p.q / r.p.usage, 0);
        return `<span class="hc" style="background:color-mix(in srgb, var(--accent) ${Math.round(Math.min(1, c) * 85)}%, var(--sunk))" title="${u.name} ${m.label}: ${Math.round(c * 100)}% covered">${c ? Math.round(c * 100) : ""}</span>`; }).join(""); }).join("") + `</div>`;
  const alerts = rows.flatMap(r => { const a = [], u = r.u, near = u.model === "normal" ? Math.abs(r.dist) < 0.25 : Math.abs(r.dist) < 0.06;
    if (r.pay > 0) a.push(["w", `${u.name} is above your limit`, `Paying ${money(r.pay, u.ccy)} this month at ${fmtP(u, r.F)}.`]);
    else if (near) a.push(["w", `${u.name} is close to your limit`, `${fmtP(u, r.F)} against a limit of ${fmtP(u, r.p.K1)}.`]);
    if (r.p.Kx != null && (r.p.dir === "up" ? r.F < r.p.Kx * 1.05 : r.F > r.p.Kx * .95)) a.push(["w", `${u.name} is near your collar floor`, `You pay below ${fmtP(u, r.p.Kx)}.`]);
    if (r.p.e - r.p.s < 1 || r.p.s === 0 && r.p.e <= 1) a.push(["", `${u.name} protection ends soon`, `Last covered month ${MONTHS[r.p.e].label}. Roll it from the pricing page.`]);
    return a; });
  const tbl = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Position</th><th>Months</th><th class="r">Limit</th><th class="r">Market</th><th class="r">Premium</th><th class="r">MTM</th><th class="r">P&amp;L</th><th></th></tr></thead><tbody>${rows.map((r, i) => {
    const u = r.u, pl = r.mtm - r.p.prem;
    return `<tr><td><b>${u.name}</b><small>${r.p.mode === "collar" ? "Zero-cost collar" : r.p.dir === "up" ? "Ceiling" : "Floor"}, ${fmtQ(u, r.p.q)}/mo</small></td><td class="m">${MONTHS[r.p.s].label}–${MONTHS[r.p.e].label}</td><td class="r m">${fmtS(u, r.p.K1)}${r.p.K2 != null ? `<small>to ${fmtS(u, r.p.K2)}</small>` : ""}</td><td class="r m">${fmtS(u, r.F)}<small>${u.model === "normal" ? "" : (r.dist >= 0 ? "" : "+") + fmtN(-r.dist * 100, 1) + "% vs limit"}</small></td><td class="r m">${money(r.p.prem, u.ccy)}</td><td class="r m">${money(r.mtm, u.ccy)}</td><td class="r m ${pl >= 0 ? "pos" : "neg"}">${pl >= 0 ? "+" : ""}${money(pl, u.ccy)}</td><td class="r"><button class="linkbtn neg" data-rm="${state.portfolio.indexOf(r.p)}">Close</button></td></tr>`; }).join("")}</tbody></table></div>`;
  el.innerHTML = `<div class="kpis">${kpis.map(([a, b, c]) => `<div class="kpi"><small>${a}</small><b>${b}</b><span>${c}</span></div>`).join("")}</div>
    <div class="desk-grid">
      <div class="col">
        <div class="panel card"><div class="card-h"><h3>Coverage by month</h3><small>% OF MONTHLY VOLUME</small></div>${heat}</div>
        ${tbl}
      </div>
      <div class="col">
        <div class="panel card stress"><div class="card-h"><h3>Stress test</h3><small id="st-v">${sh > 0 ? "+" : ""}${Math.round(sh * 100)}%</small></div>
          <input type="range" id="st-r" min="-40" max="40" step="5" value="${Math.round(sh * 100)}" aria-label="Market move">
          <p class="hint">Move every market at once and see value and payouts reprice.</p></div>
        <div class="panel card"><div class="card-h"><h3>Alerts</h3><small>${alerts.length}</small></div><div class="alerts">${alerts.length ? alerts.map(([w, t, d]) => `<div class="alert"><i class="${w}"></i><div>${t}<small>${d}</small></div></div>`).join("") : `<p class="hint">Nothing needs attention.</p>`}</div></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn ghost sm" href="#price">Add protection</a><button class="btn ghost sm" id="csv">Export CSV</button></div>
      </div>
    </div>`;
}
function renderPortfolio() { renderDesk(); }
document.addEventListener("input", e => { if (e.target.id === "st-r") { DESK.shock = Number(e.target.value) / 100; renderDesk(); const r = $("st-r"); if (r) r.focus(); } });
document.addEventListener("click", e => {
  if (e.target.closest("#demo-book")) { state.portfolio = demoBook(); savePortfolio(); renderDesk(); }
  const rm = e.target.closest("#desk-body [data-rm]"); if (rm) { state.portfolio.splice(Number(rm.dataset.rm), 1); savePortfolio(); renderDesk(); }
  if (e.target.closest("#desk-body [data-open-login]")) openLogin("signin");
  if (e.target.closest("#csv")) {
    const lines = [["market", "side", "structure", "limit", "cap", "collar", "volume_per_month", "first_month", "last_month", "premium", "currency"].join(",")].concat(bookOf().map(p => [p.id, p.dir === "up" ? "ceiling" : "floor", p.mode, p.K1, p.K2 ?? "", p.Kx ?? "", p.q, MONTHS[p.s].label, MONTHS[p.e].label, p.prem.toFixed(2), p.ccy].join(",")));
    const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(lines.join("\n")); a.download = "arete-book.csv"; document.body.appendChild(a); a.click(); a.remove();
  }
});

// ================= Basis lab: minimum-variance hedge ratio on monthly % changes =================
function basisExample() {
  const r = mulberry(5), g = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
  let b = 640, y = 1.58, out = [];
  for (let i = 0; i < 30; i++) { const db = g() * 0.07; b *= Math.exp(db); y *= Math.exp(0.62 * db + g() * 0.018); out.push(`${y.toFixed(3)}, ${b.toFixed(0)}`); }
  return out.join("\n");
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function runBasis() {
  const out = $("b-out"), rowsTxt = $("b-data").value.trim().split(/\n+/).map(l => l.split(/[,;\t ]+/).map(Number)).filter(a => a.length >= 2 && a[0] > 0 && a[1] > 0);
  if (rowsTxt.length < 12) { out.innerHTML = `<div class="empty" style="padding:0">Need at least 12 months of both prices. Found ${rowsTxt.length}.</div>`; return; }
  const ys = rowsTxt.map(a => a[0]), bs = rowsTxt.map(a => a[1]), n = ys.length - 1;
  const ry = ys.slice(1).map((v, i) => Math.log(v / ys[i])), rb = bs.slice(1).map((v, i) => Math.log(v / bs[i]));
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length, my = mean(ry), mb = mean(rb);
  const cov = ry.reduce((a, v, i) => a + (v - my) * (rb[i] - mb), 0) / (n - 1), vy = ry.reduce((a, v) => a + (v - my) ** 2, 0) / (n - 1), vb = rb.reduce((a, v) => a + (v - mb) ** 2, 0) / (n - 1);
  const rho = cov / Math.sqrt(vy * vb), h = cov / vb, r2 = rho * rho, resid = Math.sqrt(Math.max(0, vy - h * h * vb)), volY = Math.sqrt(vy * 12), volR = resid * Math.sqrt(12);
  const u = mkt($("b-mkt").value), spend = Number($("b-vol").value) || 0, notional = h * spend, bLast = fwd(u, MONTHS[0]);
  const grade = r2 > .8 ? ["Strong", "pos"] : r2 > .5 ? ["Moderate", ""] : ["Weak", "neg"];
  // Charts: indexed prices, and scatter of monthly changes with the fitted line
  const W = 560, H = 200, L = 34, T = 10, B = 22, iy = ys.map(v => v / ys[0] * 100), ib = bs.map(v => v / bs[0] * 100);
  const lo = Math.min(...iy, ...ib) * .97, hi = Math.max(...iy, ...ib) * 1.03, X = i => L + i / (ys.length - 1) * (W - L - 6), Y = v => T + (hi - v) / (hi - lo) * (H - T - B);
  const path = a => a.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const lines = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Your price and the benchmark, indexed to 100"><line x1="${L}" x2="${W - 6}" y1="${Y(100)}" y2="${Y(100)}" stroke="var(--line)"/><text x="${L - 6}" y="${Y(100) + 4}" text-anchor="end">100</text><path d="${path(ib)}" fill="none" stroke="var(--faint)" stroke-width="1.5"/><path d="${path(iy)}" fill="none" stroke="var(--accent)" stroke-width="2"/><text x="${W - 6}" y="${H - 6}" text-anchor="end">INDEXED · BLUE = YOURS · GREY = BENCHMARK</text></svg>`;
  const S = 220, mx = Math.max(...rb.map(Math.abs), ...ry.map(Math.abs)) * 1.15, P = v => S / 2 + v / mx * (S / 2 - 12), Q = v => S / 2 - v / mx * (S / 2 - 12);
  const scatter = `<svg viewBox="0 0 ${S} ${S}" role="img" aria-label="Monthly changes, yours against the benchmark"><line x1="0" x2="${S}" y1="${S / 2}" y2="${S / 2}" stroke="var(--line)"/><line y1="0" y2="${S}" x1="${S / 2}" x2="${S / 2}" stroke="var(--line)"/>${rb.map((v, i) => `<circle cx="${P(v).toFixed(1)}" cy="${Q(ry[i]).toFixed(1)}" r="3" fill="var(--accent)" opacity=".7"/>`).join("")}<line x1="${P(-mx)}" y1="${Q(my + h * (-mx - mb))}" x2="${P(mx)}" y2="${Q(my + h * (mx - mb))}" stroke="var(--ink)" stroke-width="1.2"/><text x="6" y="14">YOURS Δ%</text><text x="${S - 6}" y="${S - 6}" text-anchor="end">BENCHMARK Δ%</text></svg>`;
  out.innerHTML = `<div class="card-h"><h3>Result for ${u.name}</h3><small>${n} MONTHLY CHANGES</small></div>
    <div class="stats">
      <div><small>CORRELATION</small><b>${rho.toFixed(2)}</b><span>Of monthly changes</span></div>
      <div><small>HEDGE EFFECTIVENESS</small><b class="${grade[1]}">${Math.round(r2 * 100)}%</b><span>${grade[0]} fit (R²)</span></div>
      <div><small>HEDGE RATIO</small><b>${h.toFixed(2)}</b><span>Minimum-variance</span></div>
      <div><small>YOUR PRICE VOL</small><b>${fmtN(volY * 100, 1)}%</b><span>Annualised</span></div>
      <div><small>LEFT AFTER HEDGE</small><b>${fmtN(volR * 100, 1)}%</b><span>Basis risk, annualised</span></div>
      <div><small>RISK REMOVED</small><b>${Math.round((1 - volR / volY) * 100)}%</b><span>Of volatility</span></div>
    </div>
    <div class="chartbox">${lines}</div>
    <div style="display:grid;grid-template-columns:minmax(0,220px) minmax(0,1fr);gap:18px;align-items:center" class="chartbox">${scatter}
      <div class="rec">Hedge about <b>${Math.round(h * 100)}%</b> of your monthly spend with ${u.name}: roughly <b>${moneyC(notional, "")}</b> of benchmark exposure a month${u.model === "normal" ? "" : `, or about <b>${fmtN(notional / bLast, 0)} ${u.units}</b> at today’s ${u.src} price (before currency conversion)`}.
      <p class="hint" style="margin-top:8px">${r2 > .5 ? "The benchmark explains most of your price moves." : "The benchmark explains little of your price. Consider a regional spread or a different benchmark."} The remaining ${fmtN(volR * 100, 1)}% a year is basis risk this hedge can’t remove.</p>
      <a class="btn sm" style="margin-top:12px" data-pick="${u.id}">Price this hedge →</a></div></div>`;
}

// ================= Developers: API console running the in-browser engine =================
const EPS = [
  { m: "GET", p: "/v1/markets", d: null },
  { m: "GET", p: "/v1/markets/{id}/curve", d: null, id: "brent" },
  { m: "POST", p: "/v1/quotes", d: { market: "brent", side: "ceiling", structure: "paid", limit: 72.5, cap: 88, volume_per_month: 8000, start_month: 1, months: 6 } },
  { m: "POST", p: "/v1/protections", d: { quote_id: "qt_…", idempotency_key: "8f1c…" } },
  { m: "GET", p: "/v1/protections", d: null },
  { m: "GET", p: "/v1/settlements", d: null }
];
let EPi = 2, LANG = "curl";
const API = "https://api.arete.example";
function epPath(e) { return e.p.replace("{id}", e.id || "brent"); }
function renderEps() {
  $("eps").innerHTML = EPS.map((e, i) => `<button class="ep" data-ep="${i}" aria-pressed="${i === EPi}"><span class="mth ${e.m === "POST" ? "post" : ""}">${e.m}</span><span class="pth">${e.p}</span></button>`).join("");
  const e = EPS[EPi]; $("req-line").innerHTML = `<span class="mono" style="color:${e.m === "POST" ? "var(--accent)" : "var(--pos)"}">${e.m}</span><span>${epPath(e)}</span>`;
  $("req-body").value = e.d ? JSON.stringify(e.d, null, 2) : ""; $("req-body").hidden = !e.d;
  $("res-body").textContent = ""; $("res-meta").innerHTML = "";
  renderSnippet();
}
function renderSnippet() {
  const e = EPS[EPi], body = e.d ? JSON.stringify(e.d) : null, url = API + epPath(e);
  const s = { curl: `curl ${e.m === "POST" ? "-X POST " : ""}${url} \\\n  -H "Authorization: Bearer $ARETE_KEY"${body ? ` \\\n  -H "Content-Type: application/json" \\\n  -d '${body}'` : ""}`,
    py: `import requests\n\nr = requests.${e.m.toLowerCase()}(\n    "${url}",\n    headers={"Authorization": f"Bearer {KEY}"},${body ? `\n    json=${body.replace(/"(\w+)":/g, '"$1": ')},` : ""}\n)\nprint(r.json())`,
    ts: `const res = await fetch("${url}", {\n  method: "${e.m}",\n  headers: { Authorization: \`Bearer \${KEY}\`${body ? `, "Content-Type": "application/json"` : ""} },${body ? `\n  body: JSON.stringify(${body}),` : ""}\n});\nconsole.log(await res.json());` };
  $("snippet").textContent = s[LANG];
}
function apiHandle(e, body) {
  const now = new Date().toISOString();
  if (e.p === "/v1/markets") return { data: ALL.map(u => ({ id: u.id, name: u.name, benchmark: u.src, currency: { "$": "USD", "€": "EUR", "£": "GBP" }[u.ccy], unit: u.unit, model: u.model || "lognormal", front: Number(fwd(u, MONTHS[0]).toFixed(u.dp)) })), as_of: now };
  if (e.p.includes("/curve")) { const u = mkt(e.id || "brent"); return { market: u.id, as_of: now, points: MONTHS.map(mo => ({ month: mo.label, forward: Number(fwd(u, mo).toFixed(u.dp)), atm_vol: Number(atmVol(u, (mo.t1 + mo.t2) / 2).toFixed(4)) })) }; }
  if (e.p === "/v1/quotes") {
    const u = mkt(body.market); if (!u) return { error: { type: "invalid_request", message: `Unknown market '${body.market}'` } };
    const dir = body.side === "floor" ? "down" : "up", s0 = Math.max(0, Math.min(11, (body.start_month || 1) - 1)), ms = MONTHS.slice(s0, Math.min(12, s0 + (body.months || 1)));
    const base = { u, dir, q: Number(body.volume_per_month) || u.usage, ms, K1: Number(body.limit), K2: body.cap == null ? null : Number(body.cap), Kx: null, shock: 0 };
    if (!(base.K1 > (u.model === "normal" ? -1e9 : 0))) return { error: { type: "invalid_request", message: "limit must be a number" } };
    let p = price(base), Kx = null;
    if (body.structure === "zero_cost") { const c = solveCollar(base, ticks(u), i => pxOf(u, i)); if (!c) return { error: { type: "unprocessable", message: "No zero-cost collar exists for this limit. Raise the limit or add a cap." } }; Kx = c.Kx; p = c.p; }
    return { id: "qt_" + Math.random().toString(36).slice(2, 12), object: "quote", market: u.id, side: body.side, structure: body.structure || "paid", limit: base.K1, cap: base.K2, collar_strike: Kx,
      volume_per_month: base.q, currency: { "$": "USD", "€": "EUR", "£": "GBP" }[u.ccy], premium: Number(p.total.toFixed(2)),
      breakdown: { mid: Number(p.mid.toFixed(2)), spread: Number(p.spread.toFixed(2)), fees: p.fee }, payout_probability: Number(p.chance.toFixed(3)),
      months: p.per.map(r => ({ month: r.mo.label, forward: Number(r.F.toFixed(u.dp)), premium: Number(r.cost.toFixed(2)) })), expires_at: new Date(Date.now() + 60000).toISOString() };
  }
  if (e.p === "/v1/protections" && e.m === "POST") return { id: "pr_" + Math.random().toString(36).slice(2, 12), object: "protection", status: "pending_signature", quote_id: body.quote_id, created_at: now, next: "Client signs the confirmation; status moves to active once premium is received." };
  if (e.p === "/v1/protections") return { data: bookOf().map((p, i) => ({ id: "pr_demo" + i, market: p.id, side: p.dir === "up" ? "ceiling" : "floor", structure: p.mode === "collar" ? "zero_cost" : "paid", limit: p.K1, cap: p.K2, volume_per_month: p.q, first_month: MONTHS[p.s].label, last_month: MONTHS[p.e].label, status: "active" })), has_more: false };
  if (e.p === "/v1/settlements") return { data: [{ id: "st_demo1", protection: "pr_demo0", month: "Oct 26", benchmark_average: 0.612, limit: 0.6, payout: 2880, currency: "USD", status: "paid" }], has_more: false };
}
function hl(json) { return json.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/("(?:\\.|[^"\\])*")(\s*:)?|\b(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b|\b(true|false|null)\b/g, (m, s, c, n, k) => s ? (c ? `<span class="k">${s}</span>${c}` : `<span class="s">${s}</span>`) : n ? `<span class="n">${n}</span>` : `<span class="n">${k}</span>`); }
function sendReq() {
  const e = EPS[EPi], t0 = performance.now(); let body = {};
  if (e.d) { try { body = JSON.parse($("req-body").value || "{}"); } catch (err) { $("res-meta").innerHTML = `<b style="color:var(--neg)">400</b><span>Invalid JSON</span>`; $("res-body").textContent = String(err.message); return; } }
  const res = apiHandle(e, body), ms = (performance.now() - t0).toFixed(1), ok = !res.error;
  $("res-meta").innerHTML = `<b style="color:${ok ? "var(--pos)" : "var(--neg)"}">${ok ? (e.m === "POST" ? "201 Created" : "200 OK") : "422"}</b><span>${ms} ms</span><span>sandbox · in-browser</span>`;
  $("res-body").innerHTML = hl(JSON.stringify(res, null, 2));
}

// ================= Institutions: embedded widget preview =================
const WG = { id: "diesel", k: 0.25 };
function renderWidget() {
  const u = mkt(WG.id), F = fwd(u, MONTHS[0]), K = u.model === "normal" ? F + WG.k * u.vol0 : F * Math.exp(WG.k * u.vol0), Kr = Number((Math.round(K / u.step) * u.step).toFixed(6));
  const p = price({ u, dir: "up", q: u.usage, ms: MONTHS.slice(0, 6), K1: Kr, K2: null, Kx: null, shock: 0 });
  $("wdg").innerHTML = `<div class="wh"><span>Northbank Business · Price cap</span><span class="mono">LIVE</span></div>
    <select id="wg-m" aria-label="Market">${["diesel", "ttf", "copper", "arabica", "jet"].map(id => `<option value="${id}" ${id === WG.id ? "selected" : ""}>${mkt(id).name}</option>`).join("")}</select>
    <div class="row"><span class="hint">Maximum price</span><span class="val">${fmtP(u, Kr)}</span></div>
    <input type="range" id="wg-k" min="0.05" max="0.8" step="0.05" value="${WG.k}" aria-label="Maximum price">
    <div><span class="wbig">${money(p.monthly, u.ccy)}</span> <span class="hint">a month · 6 months · ${fmtQ(u, u.usage)}/mo</span></div>
    <button class="btn accent block">Protect my business</button><div class="pw">Powered by Arête</div>`;
}
document.addEventListener("input", e => { if (e.target.id === "wg-k") { WG.k = Number(e.target.value); renderWidget(); $("wg-k").focus(); } });
document.addEventListener("change", e => { if (e.target.id === "wg-m") { WG.id = e.target.value; renderWidget(); } });

function initPlatform() {
  $("b-mkt").innerHTML = CATS.map(([k, nm]) => `<optgroup label="${nm}">${U[k].map(u => `<option value="${u.id}" ${u.id === "gasoil" || u.id === "diesel" ? "selected" : ""}>${u.name}</option>`).join("")}</optgroup>`).join("");
  $("b-run").addEventListener("click", runBasis);
  $("b-ex").addEventListener("click", () => { $("b-data").value = basisExample(); $("b-mkt").value = "diesel"; $("b-vol").value = 250000; runBasis(); });
  renderEps();
  $("eps").addEventListener("click", e => { const b = e.target.closest("[data-ep]"); if (b) { EPi = Number(b.dataset.ep); renderEps(); } });
  $("req-send").addEventListener("click", sendReq);
  $("ctabs").addEventListener("click", e => { const b = e.target.closest("[data-l]"); if (!b) return; LANG = b.dataset.l; $("ctabs").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); renderSnippet(); });
  renderWidget();
  $("embed-code").textContent = `<script src="https://embed.arete.example/v1/widget.js"\n  data-partner="northbank"\n  data-markets="diesel,ttf,copper,arabica,jet"\n  data-theme="auto"\n  async><\/script>`;
  renderDesk();
}

setDefaults(); renderTicker(); renderProducts(); renderAcct(); render(); renderMarkets(); buildStory(); initPlatform(); showView(location.hash.slice(1), true); initPeak(); peakProgress();
