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

function polevl(x, coef) { return coef.reduce((acc, c) => acc * x + c, 0); }
function p1evl(x, coef) { return coef.slice(0, -1).reduce((acc, c) => acc * x + c, 1) * x + coef[coef.length - 1]; }
// Cephes erfc: double-precision rational approximations, also used by the API.
function erfc(x) {
  if (x < 0) return 2 - erfc(-x);
  if (x < 1) return 1 - (x * polevl(x * x, [9.60497373987051638749, 90.0260197203842689217, 2232.00534594684319226, 7003.32514112805075473, 55592.3013010394962768]) / p1evl(x * x, [33.5617141647503099647, 521.357949780152679795, 4594.32382970980127987, 22629.0000613890934246, 49267.3942608635921086]));
  if (x > 8) return 0;
  const P = x < 8 ? [2.46196981473530512524e-10, .564189564831068821977, 7.46321056442269912687, 48.6371970985681366614, 196.520832956077098242, 526.445194995477358631, 934.52852717195760754, 1027.55188689515710272, 557.535335369399327526] : [.564189583547755073984, 1.27536670759978104416, 5.01905042251180477414, 6.16021097993053585195, 7.4097426995044893916, 2.9788666537210024067];
  const Q = x < 8 ? [13.2281951154737992588, 86.7072140885989742329, 354.937778887819891062, 975.708501743205489753, 1823.90916687909736289, 2246.33760818710981792, 1656.66309194161350182, 557.535340817727675546] : [2.2605286322011727659, 9.39603524938001434673, 12.0489539808096656605, 17.0814450747565897222, 9.60896809063285878198, 3.3690764510008151605];
  return Math.exp(-x * x) * polevl(x, P) / p1evl(x, Q);
}
function N(x) { return .5 * erfc(-x / Math.SQRT2); }
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
// Zero-cost collar: solve the sold strike continuously for zero net premium.
function solveCollar(base, ticks, toPx) {
  // Solve the sold strike continuously. The upfront premium is monotonic between
  // the outer strike and the protected strike, so bisection avoids grid residuals.
  const outer = base.dir === "up" ? base.u.lo : base.u.hi;
  const at = Kx => price({ ...base, Kx });
  let a = outer, b = base.K1, pa = at(a), pb = at(b);
  if (pa.total < 0 || pb.total > 0) return null;
  for (let i = 0; i < 90; i++) {
    const mid = (a + b) / 2, pm = at(mid);
    if (pm.total > 0) { a = mid; pa = pm; } else { b = mid; pb = pm; }
  }
  const Kx = (a + b) / 2;
  return { Kx, p: at(Kx) };
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

// Annual bill distribution for Budget lock. Seeded sampling makes the
// same quote always produce the same 80% range.
function billRange(s, samples = 4000) {
  const { u, q, ms } = s, up = s.dir === "up";
  let seed = 2166136261;
  const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const normal = () => Math.sqrt(-2 * Math.log(Math.max(rnd(), 1e-12))) * Math.cos(2 * Math.PI * rnd());
  const unprotected = [], protectedBill = [], count = Math.max(1000, samples);
  for (let j = 0; j < count; j++) {
    let raw = 0, hedged = s.premium || 0;
    ms.forEach(mo => {
      const F = fwd(u, mo) * (1 + (s.shock || 0)), T = (mo.t1 + mo.t2) / 2;
      const sig = volAt(u, F, s.K1, T), v = sig * sig * (mo.t1 + (mo.t2 - mo.t1) / 3);
      const z = normal(), x = u.model === "normal" ? F + Math.sqrt(v) * z : F * Math.exp(Math.sqrt(v) * z - v / 2);
      const spend = x * q;
      raw += spend;
      hedged += spend - settle(s.dir, s.K1, s.K2, s.Kx, x) * q;
    });
    unprotected.push(raw); protectedBill.push(hedged);
  }
  const summarise = a => { a.sort((x, y) => x - y); const at = p => a[Math.min(a.length - 1, Math.floor(p * (a.length - 1)))]; return { p10: at(.1), p50: at(.5), p90: at(.9) }; };
  return { unprotected: summarise(unprotected), protected: summarise(protectedBill), samples: count, direction: up ? "buy" : "sell" };
}

if (typeof module !== "undefined" && module.exports) module.exports = {
  TICKET, QUOTE_SECONDS, R, CCY, CATS, U, ALL, MONTHS, monthList,
  N, fwd, atmVol, volAt, black, optVal, probAbove, price, solveCollar, settle, billRange, sampleHistory
};
