const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const servicesHtml = fs.readFileSync(path.join(dist, 'services.html'), 'utf8');
for(const name of ['index.html','services.html','workspace.html','office-demos/managed.html','office-demos/owned.html',...fs.readdirSync(path.join(dist,'samples')).map(n=>'samples/'+n)]) {
 const page=fs.readFileSync(path.join(dist,name),'utf8');
 const ids=[...page.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(new Set(ids).size,ids.length,`Duplicate IDs: ${name}`);
 for(const [,url] of page.matchAll(/(?:src|href)="([^"]+)"/g)) {
  if(/^(https?:|data:|mailto:|tel:)/.test(url)||url==='#')continue;
  const [pathname,anchor]=url.split('#');
  const target=pathname?path.resolve(url.startsWith('/')?dist:path.dirname(path.join(dist,name)),pathname.replace(/^\//,'')||'index.html'):path.join(dist,name);
  const file=pathname==='/'?path.join(dist,'index.html'):target;
  assert.ok(fs.existsSync(file),`Missing target ${url} in ${name}`);
  if(anchor){const content=file===path.join(dist,name)?page:fs.readFileSync(file,'utf8');assert.ok(content.includes('id="'+anchor+'"'),`Missing anchor ${url} in ${name}`)}
 }
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
assert.ok(servicesHtml.includes('name="serviceRoute"'), 'Both service routes must be selectable');
const app=fs.readFileSync(path.join(dist,'app.js'),'utf8');
assert.ok(app.includes('window.ownedOfficeSelection:window.officeSelection'), 'Brief must use the selected route');
assert.ok(!app.includes('fetch('), 'Assessment must remain local until a submission backend is implemented');
console.log(`Site checks passed: ${cases} office configurations, payment totals, assets, anchors, JS syntax and brief routing.`);
const briefModel = require(path.join(dist, 'brief-model.js'));
const emptyBrief = briefModel.describe({});
assert.ok(emptyBrief.includes('Clarify the business, audience and market.'));
assert.ok(emptyBrief.includes('Choose the first tasks and define their outputs.'));
assert.ok(emptyBrief.includes('Review every external action first'));
const preparedBrief = briefModel.describe({
 businessContext:'Local bakery',firstTasks:'Prepare launch posts',materials:'Logo and approved menu',
 approval:'recurring',firstDeadline:'2026-11-01',timeZone:'Asia/Dubai',summaryTime:'21:00'
});
assert.ok(!preparedBrief.includes('Clarify the business, audience and market.'));
assert.ok(preparedBrief.includes('2026-11-01 (not yet accepted)'));
assert.ok(preparedBrief.includes('no recurring external actions are authorized'));
assert.ok(preparedBrief.includes('Summary time: 21:00 in the stated time zone'));
assert.ok(preparedBrief.includes('Time zone: Asia/Dubai'));
console.log('Onboarding checks passed: missing-input guidance, populated context, requested deadlines and approval boundaries.');
// Annual comparison uses 13 existing cycle allowances, with one extra day included.
for(let mask=1;mask<128;mask++)for(const level of model.levels){const ids=model.departments.filter((_,i)=>mask&(1<<i)).map(d=>d.id);const cycle=model.calculate(ids,level.id);const annual=model.annual(cycle.total);assert.equal(annual.cycles,13);assert.equal(annual.days,365);assert.equal(annual.comparison,cycle.total*13);assert.equal(annual.total,annual.comparison*.8);assert.equal(annual.quarterly*4,annual.total);assert.equal(annual.total+annual.saving,annual.comparison)}
assert.deepEqual(model.annual(100),{days:365,cycles:13,comparison:1300,total:1040,saving:260,quarterly:260});
assert.throws(()=>model.annual(-1));assert.throws(()=>model.annual(NaN));
assert.ok(servicesHtml.includes('id="trial-form"'));assert.ok(servicesHtml.includes('src="trial.js"'));assert.ok(servicesHtml.includes('name="office-term"'));assert.ok(servicesHtml.includes('id="start-from-zero"'));
console.log('Services checks passed: 381 annual estimates, quarterly totals, trial chooser and startup route.');
