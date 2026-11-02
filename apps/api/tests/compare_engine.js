const fs = require("fs");
const pricing = require("../../../packages/pricing/browser.js");
const cases = JSON.parse(fs.readFileSync(0, "utf8"));
const results = cases.map(c => {
  const u = pricing.ALL.find(market => market.id === c.market);
  const p = pricing.price({ u, dir: c.dir, q: c.q, ms: [c.mo], K1: c.K1, K2: c.K2, shock: c.shock });
  return { mid: p.mid, spread: p.spread, fee: p.fee, total: p.total, monthly: p.monthly, chance: p.chance, vol1: p.vol1, per: p.per.map(row => ({ F: row.F, cost: row.cost })) };
});
process.stdout.write(JSON.stringify(results));
