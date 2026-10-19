const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(x => x[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique');
for (const [, anchor] of html.matchAll(/href="#([^"]+)"/g)) {
  assert.ok(ids.includes(anchor), `Missing anchor: ${anchor}`);
}
for (const [, asset] of html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css|png))"/g)) {
  if (!asset.startsWith('http')) assert.ok(fs.existsSync(path.join(dist, asset)), `Missing asset: ${asset}`);
}
for (const file of fs.readdirSync(dist).filter(x => x.endsWith('.js'))) {
  const check = spawnSync(process.execPath, ['--check', path.join(dist, file)], {encoding:'utf8'});
  assert.equal(check.status, 0, `${file}: ${check.stderr}`);
}
const model = require(path.join(dist, 'office-model.js'));
assert.equal(model.calculate(['admin'], 'essential').total, 100);
assert.equal(model.calculate(['marketing'], 'essential').weekly, 50);
assert.equal(model.calculate(model.departments.map(d=>d.id), 'extended').total, 3000);
assert.equal(model.calculate(['admin','admin'], 'essential').total, 100);
let cases=0;
for (let mask=0;mask<128;mask++) for (const level of model.levels) {
  const selected = model.departments.filter((d,i) => mask & (1<<i)).map(d=>d.id);
  const result = model.calculate(selected, level.id);
  assert.equal(result.weekly*4, result.total);
  assert.equal(result.selected.length, selected.length);
  assert.equal(result.allowances.length, selected.length);
  assert.ok(result.total>=0 && result.total<=3000);
  cases++;
}
assert.throws(()=>model.calculate(['admin'],'unknown'));
assert.ok(html.includes('name="serviceRoute"'), 'Both service routes must be selectable');
const app=fs.readFileSync(path.join(dist,'app.js'),'utf8');
assert.ok(app.includes('window.ownedOfficeSelection:window.officeSelection'), 'Brief must use the selected route');
assert.ok(!app.includes('fetch('), 'Assessment must remain local until a submission backend is implemented');
console.log(`Site checks passed: ${cases} office configurations, payment totals, assets, anchors, JS syntax and brief routing.`);
