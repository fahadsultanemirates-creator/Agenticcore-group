const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function setup(){
 const callbacks={},frames=new Map();let next=0,observer,reducedChange;
 class Element{constructor(text=''){this.textContent=text;this.dataset={};this.style={setProperty(){}};this.attributes={};this.classList={toggle(){}}}setAttribute(k,v){this.attributes[k]=v}querySelector(){return null}getBoundingClientRect(){return {height:780}}focus(){this.focused=true}}
 const play=new Element(),replay=new Element(),tabs=['1Start','2Team','3Result','4Next'].map(text=>{const tab=new Element(text);tab.fill={style:{}};tab.querySelector=()=>tab.fill;return tab});
 const root=new Element();root.dataset={len:'28',panel:'7.6',demo:'managed'};root.querySelectorAll=s=>s==='.tab'?tabs:[];root.querySelector=s=>s==='[data-c=play]'?play:s==='[data-c=replay]'?replay:null;
 const motion={matches:false,addEventListener:(type,fn)=>reducedChange=fn};const parent={postMessage(){}};
 const document={hidden:false,querySelector:()=>root,addEventListener:(type,fn)=>callbacks['doc:'+type]=fn};
 const window={IntersectionObserver:true,addEventListener:(type,fn)=>callbacks[type]=fn};
 const context={document,window,parent,matchMedia:s=>s.includes('reduced')?motion:{matches:false},IntersectionObserver:class{constructor(fn){observer=fn}observe(){}},requestAnimationFrame:fn=>{const id=++next;frames.set(id,fn);return id},cancelAnimationFrame:id=>frames.delete(id)};
 vm.runInNewContext(fs.readFileSync('dist/office-demos/player.js','utf8'),context);
 return {play,replay,tabs,root,document,parent,callbacks,frames,motion,visible:v=>observer([{isIntersecting:v}]),reduced:v=>{motion.matches=v;reducedChange()},paint:now=>{const [id,fn]=frames.entries().next().value;frames.delete(id);fn(now)}};
}
const s=setup();assert.equal(s.frames.size,0,'No offscreen animation');
s.visible(true);assert.equal(s.frames.size,1);s.paint(0);s.paint(100);assert.equal(s.frames.size,1);
s.play.onclick();assert.equal(s.frames.size,0);assert.equal(s.play.textContent,'▶ Play');
s.play.onclick();assert.equal(s.frames.size,1);s.visible(false);assert.equal(s.frames.size,0);
s.visible(true);s.document.hidden=true;s.callbacks['doc:visibilitychange']();assert.equal(s.frames.size,0);
s.document.hidden=false;s.callbacks['doc:visibilitychange']();assert.equal(s.frames.size,1);
s.callbacks.message({source:{},data:{type:'office-demo-visibility',visible:false}});assert.equal(s.frames.size,1,'Ignore another window');
s.callbacks.message({source:s.parent,data:{type:'office-demo-visibility',visible:false}});assert.equal(s.frames.size,0);
s.callbacks.message({source:s.parent,data:{type:'office-demo-visibility',visible:true}});assert.equal(s.frames.size,1);
s.reduced(true);assert.equal(s.frames.size,0);assert.equal(s.play.disabled,true);assert.equal(s.play.textContent,'Motion off');
s.tabs[1].onkeydown({key:'End',preventDefault(){}});assert.equal(s.tabs[3].focused,true);
for(const name of ['managed','owned']){
 const html=fs.readFileSync('dist/office-demos/'+name+'.html','utf8');assert.ok(!/<video|<iframe|fetch\(|localStorage|sessionStorage/.test(html));
 for(const [,src]of html.matchAll(/src="([^\"]+)"/g))assert.ok(fs.existsSync(path.join('dist/office-demos',src)),'Missing demo asset '+src);
 const script=require('node:child_process').spawnSync(process.execPath,['--check','dist/office-demos/player.js']);assert.equal(script.status,0);
}
console.log('Office demo checks passed: offscreen/hidden/pause cancellation, parent-message validation, reduced motion, keyboard stages and local assets.');
