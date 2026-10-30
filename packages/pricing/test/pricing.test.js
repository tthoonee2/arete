const test = require('node:test');
const assert = require('node:assert/strict');
const { U, ALL, MONTHS, black, optVal, price, solveCollar, settle, billRange } = require('../browser.js');

const base = (u = U.oil[0]) => ({ u, dir: 'up', q: 1000, ms: MONTHS.slice(0, 3), K1: u.F, K2: null, Kx: null, shock: 0 });

test('put-call parity holds across lognormal and normal markets', () => {
  for (const u of [U.oil[0], U.spreads[0]]) {
    const mo = MONTHS[0], F = u.F, K = u.F * 1.05;
    const call = optVal(u, mo, F, K, 'c'), put = optVal(u, mo, F, K, 'p');
    const df = Math.exp(-0.04 * mo.t2);
    assert.ok(Math.abs(call - put - df * (F - K)) < 0.03);
  }
});

test('Black-76 matches an independent at-the-money golden value', () => {
  // 100 * (2*N(sqrt(1)/2)-1) * exp(-0.04) = 7.965567445...
  assert.ok(Math.abs(black(100, 100, .04, 1, 'c') - 7.965567445) < 1e-6);
});

test('call prices decrease with strike and increase with tenor', () => {
  const u = U.oil[0], mo = MONTHS[0], F = u.F;
  assert.ok(optVal(u, mo, F, 60, 'c') > optVal(u, mo, F, 70, 'c'));
  assert.ok(optVal(u, MONTHS[11], F, 66, 'c') > optVal(u, mo, F, 66, 'c'));
});

test('option values respect intrinsic and discounted forward bounds', () => {
  for (const u of ALL.filter(x => x.model !== 'normal')) {
    const mo = MONTHS[0], F = u.F, K = u.F, df = Math.exp(-0.04 * mo.t2);
    const call = optVal(u, mo, F, K, 'c');
    assert.ok(call >= df * Math.max(F - K, 0));
    assert.ok(call <= df * F);
  }
});

test('continuous collar solver reaches zero premium for both model families', () => {
  for (const u of [U.oil[0], U.spreads[0]]) {
    const b = base(u); b.K1 = u.F;
    const result = solveCollar(b, 100, () => 0);
    assert.ok(result);
    assert.ok(Math.abs(result.p.total) < 1e-6);
  }
});

test('settlement and seeded bill ranges are deterministic and protective', () => {
  assert.equal(settle('up', 70, null, null, 90), 20);
  assert.equal(settle('up', 70, 90, null, 100), 20);
  assert.equal(settle('up', 70, null, 50, 40), -10);
  const b = base(); const p = price(b);
  const a = billRange({ ...b, premium: p.total }, 1000), c = billRange({ ...b, premium: p.total }, 1000);
  assert.deepEqual(a, c);
  assert.ok(a.protected.p90 < a.unprotected.p90);
  assert.ok(a.protected.p10 < a.unprotected.p10);
});
