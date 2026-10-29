const { ALL, price, solveCollar } = require('../../../packages/pricing/browser.js');
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  const { cases, months } = JSON.parse(input);
  global.MONTHS = months;
  const results = cases.map(c => {
    const u = ALL.find(item => item.id === c.market_id);
    const base = { u, dir:c.dir, q:c.q, ms:months.slice(c.start,c.start+c.months), K1:c.K1, K2:c.K2, Kx:null, shock:0 };
    // fwd uses the module's current month for seasonal normalisation. Patch it by
    // comparing on the actual current module months instead of supplied dates.
    const current = require('../../../packages/pricing/browser.js').MONTHS;
    base.ms = current.slice(c.start,c.start+c.months);
    if (c.structure === 'zero_cost_collar') {
      const solved = solveCollar(base,100,()=>0);
      return solved ? solved.p : null;
    }
    return price(base);
  });
  process.stdout.write(JSON.stringify(results));
});
