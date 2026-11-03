// Budget lock: a thin UI over the shared pricing package.
const BUDGET = { quote: null, range: null };

function budgetMarket() { return ALL.find(u => u.id === $("budget-market").value); }
function budgetDefaults(resetPrice = true) {
  const u = budgetMarket();
  $("budget-unit").textContent = `${u.ccy} per ${u.unit}`;
  $("budget-volume-unit").textContent = u.units;
  $("budget-price").step = u.step;
  $("budget-price").min = u.model === "normal" ? "" : "0";
  $("budget-volume").step = u.qstep;
  if (resetPrice) {
    $("budget-price").value = Number(fwd(u, MONTHS[0]).toFixed(u.dp));
    $("budget-volume").value = u.usage;
  }
}

function calculateBudget(event) {
  if (event) event.preventDefault();
  const u = budgetMarket(), K1 = Number($("budget-price").value), q = Number($("budget-volume").value);
  const months = Number($("budget-months").value);
  const error = $("budget-error");
  error.textContent = "";
  if (!Number.isFinite(K1) || (u.model !== "normal" && K1 <= 0)) {
    error.textContent = "Enter a valid budgeted price."; $("budget-price").focus(); return;
  }
  if (!Number.isFinite(q) || q <= 0) {
    error.textContent = "Enter a monthly volume greater than zero."; $("budget-volume").focus(); return;
  }
  $("budget-results").setAttribute("aria-busy", "true");
  const base = { u, dir: "up", q, ms: MONTHS.slice(0, months), K1, K2: null, shock: 0 };
  const Q = { ...base, p: price(base) };
  BUDGET.quote = Q;
  BUDGET.range = billRange({ ...Q, premium: Q.p.total });
  renderBudget();
  $("budget-results").setAttribute("aria-busy", "false");
}

function renderBudget() {
  const Q = BUDGET.quote, range = BUDGET.range;
  if (!Q || !range) return;
  const { u, p } = Q, c = u.ccy;
  $("budget-empty").hidden = true;
  $("budget-output").hidden = false;
  $("budget-result-kicker").textContent = `${Q.ms.length} MONTH${Q.ms.length > 1 ? "S" : ""} · ${u.src.toUpperCase()}`;
  $("budget-result-title").textContent = u.name;
  $("budget-badge").textContent = "PAID PRICE CEILING";
  $("budget-cost-label").textContent = "UPFRONT PREMIUM";
  $("budget-cost").textContent = money(p.total, c);
  $("budget-cost-note").textContent = `${money(p.monthly, c)} monthly average · pay once upfront`;
  $("budget-chance").textContent = `${Math.round(p.chance * 100)}%`;
  $("budget-limit").textContent = fmtS(u, Q.K1);
  $("budget-cover").textContent = `${fmtQ(u, Q.q)} a month`;
  $("budget-sample-count").textContent = `${range.samples.toLocaleString("en-GB")} SIMULATIONS`;

  const rows = [["Without protection", range.unprotected], ["With protection", range.protected]];
  const values = rows.flatMap(([, r]) => [r.p10, r.p50, r.p90]);
  const lo = Math.min(...values), hi = Math.max(...values), pad = Math.max((hi - lo) * .06, 1);
  const x = v => (v - lo + pad) / (hi - lo + 2 * pad) * 100;
  $("budget-chart").innerHTML = rows.map(([label, r]) => {
    const left = x(r.p10), width = Math.max(.2, x(r.p90) - left);
    return `<div class="budget-chart-row"><span class="budget-chart-label">${label}</span><div class="budget-chart-track" aria-hidden="true"><span class="budget-chart-range" style="left:${left}%;width:${width}%"></span><span class="budget-chart-median" style="left:${x(r.p50)}%"></span></div><div class="budget-chart-values"><span>${moneyC(r.p10, c)}</span><span>Median ${moneyC(r.p50, c)}</span><span>${moneyC(r.p90, c)}</span></div></div>`;
  }).join("");
  $("budget-chart-summary").textContent = `In 80% of modelled outcomes, the bill without protection is ${moneyC(range.unprotected.p10, c)}–${moneyC(range.unprotected.p90, c)}. With protection it is ${moneyC(range.protected.p10, c)}–${moneyC(range.protected.p90, c)}.`;
  $("budget-method").textContent = `Black-76 monthly average-price calls with a volatility spread and ticket fee. The full premium is due upfront. The chart uses ${range.samples.toLocaleString("en-GB")} seeded simulations from the same forward curve and volatility term structure. Months are sampled independently; this is illustrative and excludes taxes, supplier basis and currency conversion.`;
}

function openBudgetQuote() {
  const Q = BUDGET.quote;
  if (!Q) return;
  state.cat = Object.keys(U).find(k => U[k].some(u => u.id === Q.u.id));
  state.id = Q.u.id; state.dir = "up";
  state.limit = false; state.usage = Q.q; state.pct = 100; state.s = 0; state.e = Q.ms.length - 1; state.shock = 0;
  setDefaults();
  state.k1 = Math.min(ticks(Q.u), Math.max(0, Math.round((Q.K1 - Q.u.lo) / Q.u.step)));
  renderProducts(); render(); go("price");
}

function initBudgetLock() {
  if (!$("budget-form")) return;
  VIEWS.splice(2, 0, "budget");
  $("budget-market").innerHTML = CATS.map(([key, name]) => `<optgroup label="${name}">${U[key].map(u => `<option value="${u.id}" ${u.id === "diesel" ? "selected" : ""}>${u.name}</option>`).join("")}</optgroup>`).join("");
  budgetDefaults();
  $("budget-market").addEventListener("change", () => { budgetDefaults(); if (BUDGET.quote) calculateBudget(); });
  $("budget-form").addEventListener("submit", calculateBudget);
  $("budget-months").addEventListener("change", () => { if (BUDGET.quote) calculateBudget(); });
  $("budget-open-quote").addEventListener("click", openBudgetQuote);
  $("budget-recalculate").addEventListener("click", () => { $("budget-price").focus(); $("budget-form").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" }); });
  if (location.hash === "#budget") showView("budget", true);
}

initBudgetLock();

