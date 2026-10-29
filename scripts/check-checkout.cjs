const assert=require('node:assert/strict'),fs=require('node:fs');
const {quote}=require('../dist/checkout-model.js'),model=require('../dist/office-model.js'),packages=require('../dist/owned-office-model.js');
let cases=0;
for(let mask=1;mask<128;mask++)for(const level of model.levels)for(const term of ['cycle','annual'])for(const method of ['usdt','ac'])for(const schedule of ['full','installments']){
 const departments=model.departments.filter((_,i)=>mask&(1<<i)).map(d=>d.id),base=model.calculate(departments,level.id).total*100;
 const q=quote({route:'managed',departments,level:level.id,term},method,schedule,model,packages);
 assert.equal(q.subtotal,term==='annual'?base*13*.8:base);assert.equal(q.discount,method==='ac'?q.subtotal/10:0);assert.equal(q.total,q.subtotal-q.discount);assert.equal(q.due*(schedule==='full'?1:4),q.total);assert.ok(Number.isInteger(q.due));cases++;
}
for(const p of packages){const q=quote({route:'owned',packageId:p.id},'ac','installments',model,packages);assert.equal(q.total,p.price*90);assert.equal(q.due,p.price*90/4)}
for(const c of [{route:'managed',departments:[],level:'essential'},{route:'managed',departments:['marketing','marketing'],level:'essential'},{route:'managed',departments:['fake'],level:'essential'},{route:'owned',packageId:'fake'}])assert.throws(()=>quote(c,'usdt','full',model,packages));
const api=fs.readFileSync('dist/workspace-api.js','utf8');assert.ok(api.includes('async createOrder'));assert.ok(api.includes('transaction_hash:hash.toLowerCase()'));const sql=fs.readFileSync('backend/checkout-schema.sql','utf8');assert.ok(sql.includes('enable row level security'));assert.ok(sql.includes("new.status:='needs_scope'"));assert.ok(!sql.toLowerCase().includes('security definer'));assert.ok(sql.includes("o.status='awaiting_payment'"));
console.log('Checkout checks passed: '+cases+' managed price/schedule/discount combinations, framework totals, invalid selections and protected persistence.');
