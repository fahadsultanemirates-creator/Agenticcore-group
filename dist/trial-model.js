(function(root){
'use strict';
const services=[
 {id:'captions',department:'Marketing',name:'Three social captions',scope:'Three captions, up to 100 words each, for one approved offer and one channel. Text drafts only; no publishing.'},
 {id:'script',department:'Creative',name:'One short video script',scope:'One English script for a video up to 30 seconds, using your approved business facts. Script only; no video rendering or voiceover.'},
 {id:'document',department:'Admin',name:'One one-page business document',scope:'Format or rewrite one supplied document, up to 500 source words. No legal drafting or original research.'},
 {id:'faq',department:'Customer desk',name:'Five customer FAQ replies',scope:'Five reusable replies based on your supplied business information. No live customer messaging or channel connection.'},
 {id:'tracker',department:'Finance support',name:'One blank expense tracker',scope:'A simple blank income-and-expense spreadsheet template. No transaction processing, tax work or financial advice.'},
 {id:'review',department:'Technology',name:'A three-point website review',scope:'Three practical content or usability observations for one public page you provide. No code changes, account access or security audit.'}
];
const terms='Seven days from the start date confirmed after scope review. Choose up to two deliverables from different departments; one consolidated correction round on the original brief. One launch trial per business, checked during review, subject to team capacity. No card, payment or automatic paid renewal. No publishing, account connections, paid media, video production, custom builds or ongoing daily service. Unused items expire at the agreed trial end. Trial requests do not activate a paid package or unlock Forge.';
function selection(ids){if(!Array.isArray(ids)||ids.length<1||ids.length>2||new Set(ids).size!==ids.length||ids.some(id=>!services.some(s=>s.id===id)))throw Error('Choose one or two trial deliverables.');const items=ids.map(id=>services.find(s=>s.id===id));if(new Set(items.map(s=>s.department)).size!==items.length)throw Error('Choose different departments.');return items}
function brief(ids,business,goal){const items=selection(ids);return {route:'managed',kind:'launch_trial_request',title:'Seven-day launch trial request',trial:{version:1,days:7,serviceIds:items.map(s=>s.id)},text:'SEVEN-DAY LAUNCH TRIAL REQUEST\n\nBusiness: '+String(business).trim().slice(0,120)+'\nFirst result needed: '+String(goal).trim().slice(0,1000)+'\n\nSelected deliverables:\n'+items.map(s=>'- '+s.department+' / '+s.name+'\n  '+s.scope).join('\n\n')+'\n\nTrial terms:\n'+terms+'\n\nRequested only. The team must confirm eligibility, scope, capacity and start date before work begins.'}}
const api={services,terms,selection,brief};root.TrialModel=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
