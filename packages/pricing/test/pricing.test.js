const test = require("node:test");
const assert = require("node:assert/strict");
const { U, ALL, black, fwd, optVal, price, settle, billRange } = require("../browser.js");

const brent = U.oil.find(u => u.id === "brent");
const month = (t1 = .2, t2 = .3) => ({ cal: 0, label: "Test", t1, t2 });

test("put-call parity holds across strikes, vols and discount rates", () => {
  for (const F of [40, 75, 120]) for (const K of [55, 90, 140]) for (const v of [.01, .09, .25]) {
    const df = .97, call = black(F, K, v, df, "c"), put = black(F, K, v, df, "p");
    assert.ok(Math.abs(call - put - df * (F - K)) < 1e-9);
  }
});

test("Black-76 golden value matches an independent reference", () => {
  // 100 * (2 * N(0.1) - 1), with variance 0.04 and no discounting.
  assert.ok(Math.abs(black(100, 100, .04, 1, "c") - 7.965567445) < 1e-6);
});

test("option values are monotonic in strike and tenor", () => {
  const mo = month(), F = fwd(brent, mo);
  const calls = [60, 70, 80, 90].map(K => optVal(brent, mo, F, K, "c"));
  const puts = [60, 70, 80, 90].map(K => optVal(brent, mo, F, K, "p"));
  for (let i = 1; i < calls.length; i++) {
    assert.ok(calls[i] < calls[i - 1]);
    assert.ok(puts[i] > puts[i - 1]);
  }
  const short = optVal(brent, month(.1, .2), F, F, "c");
  const long = optVal(brent, month(.7, .8), F, F, "c");
  assert.ok(long > short);
});

test("options respect intrinsic and upper bounds", () => {
  for (const F of [30, 80, 200]) for (const K of [20, 70, 240]) {
    const df = .96, call = black(F, K, .16, df, "c"), put = black(F, K, .16, df, "p");
    assert.ok(call >= df * Math.max(F - K, 0) - 1e-9);
    assert.ok(call <= df * F + 1e-9);
    assert.ok(put >= df * Math.max(K - F, 0) - 1e-9);
    assert.ok(put <= df * K + 1e-9);
  }
});

test("all protections charge upfront and never create a customer payable", () => {
  for (const u of ALL) {
    const mo = month(), F = fwd(u, mo);
    for (const dir of ["up", "down"]) for (const capped of [false, true]) {
      const up = dir === "up", sign = up ? 1 : -1;
      const K1 = u.model === "normal" ? F + sign * .5 * u.vol0 : F * Math.exp(sign * .25 * u.vol0);
      const K2 = capped ? (u.model === "normal" ? K1 + sign * u.vol0 : K1 * Math.exp(sign * .4 * u.vol0)) : null;
      const p = price({ u, dir, q: 100, ms: [mo], K1, K2, shock: 0 });
      assert.ok(p.total > 0, `${u.id} ${dir} must have a positive upfront premium`);
      for (const average of [u.lo, F, u.hi]) assert.ok(settle(dir, K1, K2, average) >= 0, `${u.id} ${dir} created a customer payable`);
    }
  }
});

test("settlement and bill range use the same non-negative protection payoff", () => {
  assert.equal(settle("up", 80, null, 95), 15);
  assert.equal(settle("up", 80, 90, 95), 10);
  assert.equal(settle("up", 80, null, 55), 0);
  assert.equal(settle("down", 80, null, 95), 0);
  const mo = month(), F = fwd(brent, mo), base = { u: brent, dir: "up", q: 1000, ms: [mo, month(.3, .4)], K1: F * 1.1, K2: null, shock: 0 };
  const p = price(base), a = billRange({ ...base, premium: p.total }, 1000), b = billRange({ ...base, premium: p.total }, 1000);
  assert.deepEqual(a, b);
  assert.ok(a.unprotected.p10 <= a.unprotected.p50 && a.unprotected.p50 <= a.unprotected.p90);
  assert.ok(a.protected.p90 < a.unprotected.p90);
});
