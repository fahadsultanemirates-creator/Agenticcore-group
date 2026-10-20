const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class Element{
 constructor(){this.children=[];this.attributes={};this.dataset={};this.checked=false;this.hidden=false}
 append(...items){this.children.push(...items)}replaceChildren(...items){this.children=[];this.append(...items)}setAttribute(k,v){this.attributes[k]=v}focus(){this.focused=true}scrollIntoView(){}dispatchEvent(){this.changed=true}
}
const ids=Object.fromEntries(['sample-messages','sample-output','play-example','example-panel','open-sample','choose-launch-report','trial-picker'].map(id=>['#'+id,new Element()]));
const report=new Element();const tabs=['presentation','launch','invoice','start'].map(id=>{const tab=new Element();tab.dataset.example=id;return tab});
let pending=null,replaced=null,hashHandler;const location={hash:'',replace:url=>replaced=url};
const context={document:{querySelector:s=>s.includes('input[value=')?report:ids[s],querySelectorAll:()=>tabs,createElement:()=>new Element(),addEventListener(){}},window:{addEventListener:(type,handler)=>hashHandler=handler},location,Event:class{},matchMedia:()=>({matches:false}),setTimeout:fn=>{pending=fn;return 1},clearTimeout:()=>pending=null};
vm.runInNewContext(fs.readFileSync('dist/home.js','utf8'),context);
assert.equal(ids['#sample-messages'].children.length,3);
tabs[1].onclick();assert.equal(ids['#open-sample'].href,'samples/launch-brief.html');
tabs[1].onkeydown({key:'ArrowRight',preventDefault(){}});assert.equal(tabs[2].attributes['aria-selected'],'true');assert.equal(tabs[2].focused,true);
ids['#play-example'].onclick();assert.equal(ids['#sample-messages'].children.length,1);assert.ok(pending);
tabs[3].onclick();assert.equal(pending,null);assert.equal(ids['#sample-messages'].children.length,3);
context.matchMedia=()=>({matches:true});ids['#play-example'].onclick();assert.equal(pending,null);assert.equal(ids['#sample-messages'].children.length,3);
ids['#choose-launch-report'].onclick();assert.equal(ids['#trial-picker'].open,true);assert.equal(report.checked,true);assert.equal(report.changed,true);
location.hash='#plans';hashHandler();assert.equal(replaced,'services.html#plans');
const trial=require('../dist/trial-model.js');
for(let mask=0;mask<128;mask++){const ids=trial.services.filter((_,i)=>mask&(1<<i)).map(s=>s.id);if(ids.length>=1&&ids.length<=2){const brief=trial.brief(ids,'Example','First launch');assert.equal(brief.trial.serviceIds.length,ids.length);assert.match(brief.text,/Seven days from the start date confirmed/)}else assert.throws(()=>trial.selection(ids))}
assert.throws(()=>trial.selection(['launch_report','launch_report']));assert.throws(()=>trial.selection(['not-a-service']));
console.log('Homepage checks passed: demo tabs/keyboard/pause/reduced motion, report selection, old-link routing and 128 trial selections.');
