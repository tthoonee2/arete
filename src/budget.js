// Budget lock UI. Uses the shared pricing package and the existing quote flow.
const BUDGET = { quote: null, range: null };

function budgetEls() {
  return {
    market: document.getElementById("budget-market"),
    price: document.getElementById("budget-price"),
    volume: document.getElementById("budget-volume"),
    months: document.getElementById("budget-months"),
    error: document.getElementById("budget-error"),
  };
}
function budgetMoney(x, ccy) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: ccy === "€" ? "EUR" : ccy === "£" ? "GBP" : "USD", maximumFractionDigits: 0 }).format(x);
}
function budgetFillMarkets() {
  const e = budgetEls();
  e.market.innerHTML = CATS.map(([cat, label]) => `<optgroup label="${label}">${U[cat].map(u => `<option value="${u.id}">${u.name}</option>`).join("")}</optgroup>`).join("");
  e.market.value = "brent";
  budgetMarketDefaults();
}
function budgetMarketDefaults() {
  const e = budgetEls(), u = ALL.find(x => x.id === e.market.value);
  if (!u) return;
  e.price.min = u.lo; e.price.max = u.hi; e.price.step = u.step;
  e.price.value = fwd(u, MONTHS[0]).toFixed(u.dp);
  e.volume.value = u.usage; e.volume.step = u.qstep;
  document.getElementById("budget-price-unit").textContent = `${u.ccy} / ${u.unit}`;
  document.getElementById("budget-volume-unit").textContent = u.units;
  BUDGET.quote = null;
  document.getElementById("budget-open-quote").disabled = true;
  document.getElementById("budget-print").disabled = true;
}
function budgetCalculate() {
  const e = budgetEls(), u = ALL.find(x => x.id === e.market.value);
  const K1 = Number(e.price.value), q = Number(e.volume.value), months = Number(e.months.value);
  const structure = document.querySelector('input[name="structure"]:checked').value;
  const fail = message => { e.error.textContent = message; e.error.hidden = false; e.error.focus?.(); };
  e.error.hidden = true;
  if (!u || !Number.isFinite(K1) || K1 < u.lo || K1 > u.hi) return fail(`Enter a price between ${u.lo} and ${u.hi} ${u.ccy} per ${u.unit}.`);
  if (!Number.isFinite(q) || q <= 0 || q > u.usage * 100) return fail(`Enter a monthly volume between 1 and ${(u.usage * 100).toLocaleString("en-GB")} ${u.units}.`);
  if (![3, 6, 12].includes(months)) return fail("Choose 3, 6 or 12 months of protection.");
  const base = { u, dir: "up", q, ms: MONTHS.slice(0, months), K1, K2: null, Kx: null, shock: 0 };
  let Q = { ...base, p: price(base) };
  if (structure === "zero_cost") {
    const c = solveCollar(base, ticks(u), i => pxOf(u, i));
    if (!c) return fail("A zero-cost collar is not available at this price. Raise the protected price or use price protection.");
    Q = { ...base, Kx: c.Kx, p: c.p };
  }
  BUDGET.quote = Q;
  BUDGET.range = billRange({ ...Q, premium: Q.p.total });
  const cost = document.getElementById("budget-cost");
  cost.textContent = Math.abs(Q.p.total) < 1e-6 ? `${u.ccy}0` : budgetMoney(Q.p.total, u.ccy);
  document.getElementById("budget-cost-label").textContent = structure === "zero_cost" ? "Upfront premium (including fees)" : "Illustrative protection cost";
  document.getElementById("budget-cost-monthly").textContent = `${budgetMoney(Q.p.monthly, u.ccy)} per month on average · ${months} months`;
  document.getElementById("budget-chance").textContent = `${Math.round(Q.p.chance * 100)}%`;
  document.getElementById("budget-limit").textContent = `${u.ccy}${K1.toFixed(u.dp)} / ${u.unit}`;
  document.getElementById("budget-coverage").textContent = `${(q * months).toLocaleString("en-GB")} ${u.units}`;
  document.getElementById("budget-structure-label").textContent = structure === "zero_cost" ? "Zero-cost collar" : "Price protection";
  budgetChart(BUDGET.range, u.ccy);
  document.getElementById("budget-open-quote").disabled = false;
  document.getElementById("budget-print").disabled = false;
}
function budgetChart(range, ccy) {
  const chart = document.getElementById("budget-chart");
  const lo = Math.min(range.unprotected.p10, range.protected.p10) * 0.97;
  const hi = Math.max(range.unprotected.p90, range.protected.p90) * 1.03;
  const pos = x => Math.max(0, Math.min(100, (x - lo) / Math.max(hi - lo, 1) * 100));
  const row = (key, label, r) => `<div class="bill-row"><span>${label}</span><div class="bill-track"><i class="bill-band bill-${key}" style="left:${pos(r.p10)}%;width:${Math.max(1, pos(r.p90) - pos(r.p10))}%"><b style="left:${pos(r.p50) - pos(r.p10)}%"></b></i></div><strong>${budgetMoney(r.p50, ccy)}</strong></div>`;
  chart.innerHTML = row("unprotected", "Without", range.unprotected) + row("protected", "With", range.protected);
  chart.setAttribute("aria-label", `Without protection: median ${budgetMoney(range.unprotected.p50, ccy)}, 10th to 90th percentile ${budgetMoney(range.unprotected.p10, ccy)} to ${budgetMoney(range.unprotected.p90, ccy)}. With protection: median ${budgetMoney(range.protected.p50, ccy)}, range ${budgetMoney(range.protected.p10, ccy)} to ${budgetMoney(range.protected.p90, ccy)}.`);
}
function budgetOpenQuote() {
  const Q = BUDGET.quote;
  if (!Q) return;
  state.id = Q.u.id; state.dir = "up"; state.mode = Q.Kx != null ? "collar" : "band";
  state.limit = false; state.usage = Q.q; state.pct = 100; state.s = 0; state.e = Q.ms.length - 1;
  setDefaults();
  state.k1 = Math.min(ticks(Q.u), Math.max(0, Math.round((Q.K1 - Q.u.lo) / Q.u.step)));
  renderProducts(); render(); go("price");
}
function initBudget() {
  if (VIEWS && !VIEWS.includes("budget")) VIEWS.push("budget");
  budgetFillMarkets();
  const e = budgetEls();
  e.market.addEventListener("change", budgetMarketDefaults);
  document.getElementById("budget-calculate").addEventListener("click", budgetCalculate);
  document.getElementById("budget-open-quote").addEventListener("click", budgetOpenQuote);
  document.getElementById("budget-print").addEventListener("click", () => window.print());
}
initBudget();
