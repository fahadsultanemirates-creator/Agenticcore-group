(function(root){
'use strict';
const team=[
 {id:'forge',name:'Forge',role:'Office guide',intro:'I explain how your digital office fits together. Start with a managed office, or commission an office you own.',departments:[]},
 {id:'maya',name:'Maya',role:'Your office coordinator',intro:'Start here for your everyday office questions. I can help you choose departments, prepare a request and find recorded project updates.',departments:[]},
 {id:'atlas',name:'Atlas',role:'Technology',intro:'Let’s define your website care or automation needs. Small existing-system changes fit the managed technology department; new frameworks need a scoped office build.',departments:['technology']},
 {id:'nova',name:'Nova',role:'Creative studio',intro:'Tell me which branded visuals, documents or scripts you need, and what brand materials you have.',departments:['creative']},
 {id:'leo',name:'Leo',role:'Marketing',intro:'Tell me your channels, audience and approved offers. Marketing capacity counts each post on each channel as one placement.',departments:['marketing']},
 {id:'iris',name:'Iris',role:'Operations',intro:'I help organize routine administration and customer enquiries. Tell me the task, required inputs and preferred deadline.',departments:['admin','customer']},
 {id:'ledger',name:'Ledger',role:'Finance support',intro:'I explain package estimates and bookkeeping preparation. Share a general description of the records you need organized; keep financial and customer details out of this planning chat.',departments:['finance']},
 {id:'sage',name:'Sage',role:'Research',intro:'What question or meeting are you preparing for? A focused research brief starts with one clear topic and a deadline.',departments:['research']},
 {id:'orion',name:'Orion',role:'Quality review',intro:'I explain delivery checks, revisions and acceptance. Recorded deliverables appear in your Deliverables section; this guide does not certify work as reviewed.',departments:[]},
 {id:'amara',name:'Amara',role:'Office setup',intro:'Let’s shape your office. Tell me your business, the first results you need and whether you want managed support or your own framework.',departments:[]}
];
const keywords={admin:/\b(admin|document|pdf|letter|invoice template|reminder)\b/i,creative:/\b(design|creative|image|flyer|video|script|brand|logo)\b/i,marketing:/\b(marketing|social|posts?|publish|instagram|facebook|campaign)\b/i,customer:/\b(customer|enquir(?:y|ies)|inquir(?:y|ies)|reception|support desk)\b/i,finance:/\b(bookkeep\w*|financ\w*|invoice|expense|sales records)\b/i,research:/\b(research|meeting|competitor|market study|briefing)\b/i,technology:/\b(website|technical|automation|integration|maintenance|workflow|framework)\b/i};
function recommend(text){return Object.keys(keywords).filter(id=>keywords[id].test(String(text)))}
const money=value=>'$'+value.toLocaleString('en-US',{maximumFractionDigits:2});
function snapshot(config,model,packages){
 if(!['managed','owned'].includes(config.route))throw Error('Choose an office route.');
 const base={kind:'office_configuration',version:2,officeName:String(config.officeName||'').trim().slice(0,120),characterName:String(config.characterName||'').trim().slice(0,80),characterStyle:String(config.characterStyle||'').slice(0,80),goals:String(config.goals||'').trim().slice(0,4000),currency:'USD',pricingVersion:'proposal-v1'};
 if(config.route==='managed'){
  const result=model.calculate(config.departments||[],config.level);
  if(!result.selected.length)throw Error('Choose at least one department.');
  return {...base,route:'managed',departments:result.selected.map(d=>d.id),level:result.level.id,total:result.total,installment:result.weekly,paymentBasis:'Four weekly payments per 28-day cycle',allowances:result.allowances};
 }
 const pack=packages.find(p=>p.id===config.packageId);if(!pack)throw Error('Choose an office build.');
 return {...base,route:'owned',packageId:pack.id,packageName:pack.name,total:pack.price,installment:pack.price/4,paymentBasis:'Four 25% project milestones',scope:pack.scope,delivery:pack.delivery};
}
function describe(s,model){
 const lines=[s.route==='managed'?'MANAGED OFFICE PROPOSAL':'COMPANY-OWNED OFFICE PROPOSAL','Office: '+(s.officeName||'To be confirmed')];
 if(s.route==='managed'){
  lines.push('Work level: '+s.level,'Proposed total: '+money(s.total)+' / 28-day cycle','Weekly payment: 4 × '+money(s.installment));
  s.departments.forEach((id,i)=>{const d=model.departments.find(d=>d.id===id);lines.push('\n'+d.name+': '+s.allowances[i],'You receive: '+d.output,'One unit: '+d.oneRequest,'Inputs: '+d.inputs,'Revisions: '+d.revision,'Outside scope: '+d.outside)});
  lines.push('\nManaged delivery tools included within agreed scope. Paid advertising spend is separate. Weekly payments do not reset the cycle allowance. Changes require an agreed scope and price at the next weekly boundary.');
 }else lines.push('Starting build: '+s.packageName,'Proposed total: '+money(s.total),'Four milestone payments: '+money(s.installment)+' each',s.scope,s.delivery,'Character: '+(s.characterName||'To be chosen'),'Character style: '+(s.characterStyle||'To be chosen'),'Ongoing API, hosting, domain and required third-party costs continue. Optional maintenance is separate; handover rights and support are agreed in the contract.');
 lines.push('\nFirst results: '+(s.goals||'To be confirmed'),'Awaiting scope confirmation. This is a request for review, not an active office, contract or payment.');return lines.join('\n');
}
function reply(text,character,records,model){
 const ids=recommend(text);
 if(/\b(status|progress|update|projects?)\b/i.test(text)&&!ids.length){const requests=records.requests||[],projects=records.projects||[];return {text:'Your workspace currently lists '+requests.length+' request(s) and '+projects.length+' project(s). Open Requests or Projects for the recorded details. A saved office proposal is awaiting review; it does not activate service.',ids:[]}}
 if(/\b(price|cost|payment|budget|package)\b/i.test(text)&&!ids.length)return {text:'Managed offices start at $100 per 28-day cycle and use four weekly payments. Company-owned builds have starting scopes at $1,500, $3,000, $5,000 and $10,000, with four milestone payments. Use the builder to see an estimate for your exact selection. All figures are proposed until scope is confirmed.',ids:[]};
 if(ids.length)return {text:'These departments may fit what you described: '+ids.map(id=>model.departments.find(d=>d.id===id).name).join(', ')+'. Review the suggestion in the office builder before applying it. Your current choices stay in place until you choose to replace them.',ids};
 if(/\b(create|build|office|start|setup)\b/i.test(text))return {text:'Choose managed support for recurring work, or a company-owned office build. Open the builder below to choose your route, departments or build scope, and first tasks. You can review everything before saving.',ids:[]};
 return {text:character.intro+' This guided assistant can explain departments, prices and recorded workspace sections. For your own requirements, choose “Use this as my brief” and review the details in the builder. Live AI conversation and task execution are not connected yet.',ids:[]};
}
const api={team,recommend,snapshot,describe,reply,money};root.OfficeAssistantModel=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
