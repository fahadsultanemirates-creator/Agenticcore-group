(function(){
'use strict';
const frame=document.querySelector('#office-demo-frame'),tabs=Array.from(document.querySelectorAll('[data-office-demo]'));
let current='managed',visible=false;
function visibility(){frame.contentWindow?.postMessage({type:'office-demo-visibility',visible:visible&&!document.hidden},'*')}
function select(id){if(!['managed','owned'].includes(id))return;current=id;tabs.forEach(tab=>{const active=tab.dataset.officeDemo===id;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1});document.querySelector('#office-demo-panel').setAttribute('aria-labelledby','office-demo-tab-'+id);frame.title=id==='managed'?'Illustrative managed-office animation with Maya':'Illustrative company-owned framework animation with Maya and Atlas';frame.style.height='820px';frame.src='office-demos/'+id+'.html'}
tabs.forEach((tab,index)=>{tab.onclick=()=>select(tab.dataset.officeDemo);tab.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const target=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;select(tabs[target].dataset.officeDemo);tabs[target].focus()}});
window.addEventListener('message',event=>{const data=event.data;if(event.source!==frame.contentWindow||!data||data.type!=='office-demo-height'||data.demo!==current||!Number.isFinite(data.height)||data.height<200||data.height>4000)return;frame.style.height=Math.ceil(data.height)+'px'});
frame.addEventListener('load',visibility);document.addEventListener('visibilitychange',visibility);
if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;visibility()},{threshold:.1}).observe(frame);else visible=true;
})();
