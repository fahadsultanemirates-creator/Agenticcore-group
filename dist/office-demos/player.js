(function(){
'use strict';
const root=document.querySelector('.acd'),length=Number(root.dataset.len),stageLength=length/4,panelAt=Number(root.dataset.panel),start=3.5;
const all=selector=>Array.from(root.querySelectorAll(selector));
const elements=all('[data-at]'),fills=all('[data-fill]'),ticks=all('[data-tick]'),slides=all('[data-slide]'),highlights=all('[data-on]'),tabs=all('.tab'),types=all('[data-type]');
const composer=root.querySelector('.comp .ph'),currentLabel=root.querySelector('.curlab'),play=root.querySelector('[data-c=play]'),replay=root.querySelector('[data-c=replay]');
const labels=tabs.map(tab=>tab.textContent.trim().replace(/^([1-4])(?=\D)/,'$1 / ')),motion=matchMedia('(prefers-reduced-motion: reduce)');
let reduced=motion.matches,playing=!reduced,visible=false,hostVisible=true,time=start,last=null,frame=null,previousPaint=null;
const clamp=value=>Math.max(0,Math.min(1,value)),ease=value=>1-Math.pow(1-value,3);
function render(){
 const t=time;root.classList.toggle('static',reduced);root.dataset.panelOpen=String(reduced||t>=panelAt);
 elements.forEach(el=>{const at=Number(el.dataset.at),until=el.dataset.until?Number(el.dataset.until):Infinity,shown=reduced?el.dataset.st!=='0':t>=at&&t<until;el.style.display=shown?'':'none';if(shown){const k=reduced?1:ease(clamp((t-at)/.45));el.style.opacity=k;el.style.transform='translateY('+(10*(1-k))+'px)'}});
 fills.forEach(el=>{const [a,b]=el.dataset.fill.split(',').map(Number);el.style.width=(reduced?100:clamp((t-a)/(b-a))*100)+'%'});
 ticks.forEach(el=>{const done=reduced||t>=Number(el.dataset.tick);el.classList.toggle('done',done);const label=el.querySelector('[data-lab]');if(label)label.textContent=label.dataset.lab.split('|')[done?1:0]});
 highlights.forEach(el=>{const [a,b]=el.dataset.on.split(',').map(Number);el.classList.toggle('on',t>=a&&t<b)});
 const mobile=matchMedia('(max-width:700px)').matches;
 slides.forEach(el=>{const k=mobile&&!reduced?ease(clamp((t-Number(el.dataset.slide))/.6)):0;el.style.transform='translateX(-'+k*100+'%)'});
 root.style.setProperty('--pk',reduced?1:ease(clamp((t-panelAt)/.6)));
 let text='';types.forEach(el=>{const [a,b]=el.dataset.type.split(',').map(Number);if(t>=a&&t<b+.25)text=el.dataset.text.slice(0,Math.round(clamp((t-a)/(b-a))*el.dataset.text.length))});
 if(composer){composer.className='ph'+(text?'':' empty');composer.textContent=text||'Message Maya…'}
 const stage=Math.min(3,Math.floor(t/stageLength));tabs.forEach((tab,index)=>{tab.classList.toggle('act',index===stage);tab.setAttribute('aria-selected',String(index===stage));tab.setAttribute('aria-label',labels[index]);tab.tabIndex=index===stage?0:-1;tab.querySelector('.fill').style.width=(reduced?100:index<stage?100:index===stage?clamp((t-index*stageLength)/stageLength)*100:0)+'%'});
 if(currentLabel)currentLabel.textContent=labels[stage];
}
function running(){return playing&&visible&&hostVisible&&!document.hidden&&!reduced}
function controls(){play.textContent=reduced?'Motion off':playing?'❚❚ Pause':'▶ Play';play.disabled=reduced;play.setAttribute('aria-pressed',String(!playing));replay.disabled=reduced;root.dataset.running=String(running())}
function cancel(){if(frame!==null)cancelAnimationFrame(frame);frame=null;last=null;previousPaint=null}
function tick(now){frame=null;if(!running()){controls();return}if(last!==null)time=start+((time-start+(now-last)/1000)%(length-start));last=now;if(previousPaint===null||now-previousPaint>=1000/24){render();previousPaint=now}frame=requestAnimationFrame(tick)}
function sync(){controls();if(running()){if(frame===null)frame=requestAnimationFrame(tick)}else cancel()}
function seek(value){time=Math.max(start,Math.min(length-.01,value));last=null;previousPaint=null;render();sync()}
play.onclick=()=>{if(reduced)return;playing=!playing;sync()};replay.onclick=()=>{if(reduced)return;playing=true;seek(start)};
tabs.forEach((tab,index)=>{tab.onclick=()=>seek(index*stageLength+.5);tab.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const target=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;seek(target*stageLength+.5);tabs[target].focus()}});
document.addEventListener('visibilitychange',sync);
if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync()},{threshold:.1}).observe(root);else visible=true;
window.addEventListener('message',event=>{if(event.source!==parent||!event.data||event.data.type!=='office-demo-visibility'||typeof event.data.visible!=='boolean')return;hostVisible=event.data.visible;reported=0;reportHeight();sync()});
window.addEventListener('resize',()=>{render();reportHeight()});
function changed(){reduced=motion.matches;if(reduced)playing=false;render();reportHeight();sync()}if(motion.addEventListener)motion.addEventListener('change',changed);
let reported=0;function reportHeight(){const height=Math.ceil(root.getBoundingClientRect().height);if(height!==reported){reported=height;parent.postMessage({type:'office-demo-height',demo:root.dataset.demo,height},'*')}}
if('ResizeObserver' in window)new ResizeObserver(reportHeight).observe(root);
window.addEventListener('load',reportHeight);render();sync();reportHeight();
})();
